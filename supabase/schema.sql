-- ============================================================================
-- SINTAXI App — Schema do banco (Supabase / PostgreSQL)
-- Sistema de agendamento de viagens e encomendas para linhas de táxi/van
-- intermunicipais de Alagoas (município <-> Maceió)
-- ============================================================================
-- Como usar: crie um projeto em https://supabase.com, abra o "SQL Editor"
-- e cole/execute este arquivo inteiro de uma vez.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- MUNICÍPIOS
-- ----------------------------------------------------------------------------
create table public.municipios (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  uf text not null default 'AL'
);

comment on table public.municipios is 'Municípios atendidos pelas linhas (destino fixo é sempre Maceió)';

-- ----------------------------------------------------------------------------
-- PROFILES (estende auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('motorista', 'passageiro', 'admin')),
  nome text not null,
  telefone text,
  -- Município "de casa" do usuário. Para o passageiro, é usado como filtro
  -- padrão ao abrir o app (ele pode trocar depois na tela principal).
  municipio_id uuid references public.municipios(id),
  created_at timestamptz not null default now()
);

comment on column public.profiles.municipio_id is 'Município padrão exibido para o passageiro ao entrar no app; pode ser alterado a qualquer momento na busca';

-- Cria o profile automaticamente quando um usuário se cadastra no Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- IMPORTANTE (segurança): todo cadastro público (e-mail/senha ou Google) vira
  -- SEMPRE 'passageiro' aqui — nunca confiamos no campo 'tipo' que vem do
  -- metadata enviado pelo próprio cliente, senão qualquer pessoa poderia se
  -- auto-promover a 'motorista' ou 'admin' na hora do cadastro. Virar
  -- motorista só acontece pelo painel do admin (que faz um UPDATE depois,
  -- usando uma sessão que já é admin); virar admin só pelo script de bootstrap
  -- (supabase/create-admin.sql), rodado manualmente no SQL Editor.
  --
  -- Cadastro normal (email/senha) manda 'nome' no metadata; login social (Google)
  -- manda 'full_name'/'name' — cobrimos os dois casos. município/telefone ficam
  -- em branco no login social e são preenchidos depois na tela "Completar perfil".
  insert into public.profiles (id, tipo, nome, telefone, municipio_id)
  values (
    new.id,
    'passageiro',
    coalesce(
      new.raw_user_meta_data->>'nome',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'telefone',
    nullif(new.raw_user_meta_data->>'municipio_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- DONOS DE LINHA/PRAÇA
-- ----------------------------------------------------------------------------
-- O "dono da linha" (ou "dono da praça") é quem detém a concessão do ponto de
-- táxi daquele município. Ele pode dirigir pessoalmente (nesse caso é o mesmo
-- nome/telefone do motorista) ou ter um ou mais motoristas contratados
-- dirigindo por ele.
create table public.donos_linha (
  id uuid primary key default gen_random_uuid(),
  municipio_id uuid not null references public.municipios(id),
  nome text not null,
  telefone text,
  criado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.donos_linha is 'Concessionário/dono do ponto de táxi de um município; cadastrado só pelo admin';

-- ----------------------------------------------------------------------------
-- MOTORISTAS (dados adicionais de quem é tipo='motorista')
-- ----------------------------------------------------------------------------
-- Cadastro de motorista é feito exclusivamente pelo admin (painel /admin).
create table public.motoristas (
  id uuid primary key references public.profiles(id) on delete cascade,
  dono_linha_id uuid not null references public.donos_linha(id),
  municipio_id uuid not null references public.municipios(id),
  veiculo_modelo text,
  veiculo_placa text,
  capacidade_passageiros int not null check (capacidade_passageiros > 0),
  foto_rosto_url text,
  foto_veiculo_url text,
  ativo boolean not null default true,
  criado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.motoristas is 'Cada motorista pertence à linha (SINTAXI) de um único município e a um dono de linha';

-- ----------------------------------------------------------------------------
-- HORÁRIOS (agenda recorrente de cada motorista)
-- ----------------------------------------------------------------------------
-- dias_semana: 0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado
create table public.horarios (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references public.motoristas(id) on delete cascade,
  dias_semana smallint[] not null,
  hora_ida time not null,   -- saída do município rumo a Maceió
  hora_volta time not null, -- saída de Maceió de volta ao município
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint dias_semana_validos check (
    dias_semana <@ array[0,1,2,3,4,5,6]::smallint[] and array_length(dias_semana, 1) > 0
  )
);

comment on table public.horarios is 'Ex: Júnior seg-sex 5h ida / 8h volta, seg-sex 10h ida / 13h volta, sáb 5h ida / 13h volta';

-- ----------------------------------------------------------------------------
-- RESERVAS (viagem de passageiro OU encomenda)
-- ----------------------------------------------------------------------------
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('viagem', 'encomenda')),
  passageiro_id uuid not null references public.profiles(id) on delete cascade,
  horario_id uuid not null references public.horarios(id) on delete cascade,
  data date not null,
  direcao text not null check (direcao in ('ida', 'volta')),

  -- usado quando tipo = 'viagem'
  quantidade_passageiros int not null default 1 check (quantidade_passageiros > 0),

  -- usado quando tipo = 'encomenda'
  descricao_encomenda text,
  local_retirada text,
  local_entrega text,
  nome_contato text,
  telefone_contato text,

  status text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
  created_at timestamptz not null default now()
);

create index idx_reservas_horario_data on public.reservas (horario_id, data, direcao) where status = 'confirmada';
create index idx_reservas_passageiro on public.reservas (passageiro_id);

comment on table public.reservas is 'Uma reserva de assento (viagem) ou de despacho (encomenda) numa data/direção específica de um horário';

-- View auxiliar: vagas ocupadas por horário/data/direção (só considera 'viagem').
-- Roda com o privilégio do dono da view (padrão do Postgres/Supabase), então
-- retorna a CONTAGEM agregada para qualquer usuário autenticado mesmo que a
-- RLS de "reservas" esconda os detalhes individuais de reserva de outras pessoas.
create or replace view public.vagas_ocupadas as
select
  horario_id,
  data,
  direcao,
  coalesce(sum(quantidade_passageiros), 0) as ocupadas
from public.reservas
where tipo = 'viagem' and status = 'confirmada'
group by horario_id, data, direcao;

grant select on public.vagas_ocupadas to authenticated;

-- ----------------------------------------------------------------------------
-- MENSAGENS (chat dentro do app entre passageiro e motorista de uma reserva)
-- ----------------------------------------------------------------------------
create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  remetente_id uuid not null references public.profiles(id) on delete cascade,
  destinatario_id uuid not null references public.profiles(id) on delete cascade,
  conteudo text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_mensagens_reserva on public.mensagens (reserva_id, created_at);
create index idx_mensagens_destinatario on public.mensagens (destinatario_id, lida);

comment on table public.mensagens is 'Chat dentro do app entre o passageiro e o motorista de uma reserva específica (viagem ou encomenda)';

-- ----------------------------------------------------------------------------
-- DISPONIBILIDADES (lista de espera do passageiro quando não há vaga)
-- ----------------------------------------------------------------------------
create table public.disponibilidades (
  id uuid primary key default gen_random_uuid(),
  passageiro_id uuid not null references public.profiles(id) on delete cascade,
  municipio_id uuid not null references public.municipios(id),
  direcao text not null check (direcao in ('ida', 'volta')),
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  status text not null default 'aguardando'
    check (status in ('aguardando', 'notificado', 'confirmado', 'expirado', 'cancelado')),
  -- preenchidos quando um motorista sinaliza uma vaga para este passageiro
  horario_id uuid references public.horarios(id),
  motorista_id uuid references public.motoristas(id),
  created_at timestamptz not null default now(),
  constraint janela_valida check (hora_fim > hora_inicio)
);

comment on table public.disponibilidades is 'Passageiro sem vaga registra uma janela de horário; motorista com vaga livre pode notificá-lo';

-- ----------------------------------------------------------------------------
-- NOTIFICAÇÕES
-- ----------------------------------------------------------------------------
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null,
  mensagem text not null,
  lida boolean not null default false,
  disponibilidade_id uuid references public.disponibilidades(id) on delete cascade,
  reserva_id uuid references public.reservas(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_notificacoes_destinatario on public.notificacoes (destinatario_id, lida);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Função auxiliar: "o usuário logado é admin?" — usada em várias policies.
-- security definer evita recursão ao consultar a própria tabela profiles
-- de dentro de uma policy da tabela profiles.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and tipo = 'admin');
$$;

alter table public.municipios enable row level security;
alter table public.profiles enable row level security;
alter table public.donos_linha enable row level security;
alter table public.motoristas enable row level security;
alter table public.horarios enable row level security;
alter table public.reservas enable row level security;
alter table public.mensagens enable row level security;
alter table public.disponibilidades enable row level security;
alter table public.notificacoes enable row level security;

-- municipios: leitura pública para autenticados
create policy "municipios: leitura publica" on public.municipios
  for select to authenticated using (true);

-- profiles: qualquer autenticado pode ver nomes (necessário p/ exibir motorista/passageiro);
-- cada um edita o próprio registro, e o admin pode editar qualquer um (usado para
-- promover um cadastro recém-criado a 'motorista' depois de inserir a linha em motoristas)
create policy "profiles: leitura publica" on public.profiles
  for select to authenticated using (true);
create policy "profiles: dono ou admin atualiza" on public.profiles
  for update to authenticated using (auth.uid() = id or public.is_admin());

-- donos_linha: leitura pública, só o admin cadastra/gerencia
create policy "donos_linha: leitura publica" on public.donos_linha
  for select to authenticated using (true);
create policy "donos_linha: admin insere" on public.donos_linha
  for insert to authenticated with check (public.is_admin());
create policy "donos_linha: admin atualiza" on public.donos_linha
  for update to authenticated using (public.is_admin());
create policy "donos_linha: admin remove" on public.donos_linha
  for delete to authenticated using (public.is_admin());

-- motoristas: leitura pública (passageiro precisa navegar); só o ADMIN cadastra
-- (o cadastro de motorista não é auto-serviço — veja a página "Seja motorista",
-- que só direciona o interessado a falar com o admin pelo WhatsApp); o próprio
-- motorista pode atualizar depois seus dados (ex: trocar de veículo)
create policy "motoristas: leitura publica" on public.motoristas
  for select to authenticated using (true);
create policy "motoristas: admin insere" on public.motoristas
  for insert to authenticated with check (public.is_admin());
create policy "motoristas: dono ou admin atualiza" on public.motoristas
  for update to authenticated using (auth.uid() = id or public.is_admin());
create policy "motoristas: admin remove" on public.motoristas
  for delete to authenticated using (public.is_admin());

-- horarios: leitura pública, o motorista dono ou o admin gerenciam
create policy "horarios: leitura publica" on public.horarios
  for select to authenticated using (true);
create policy "horarios: dono ou admin insere" on public.horarios
  for insert to authenticated with check (motorista_id = auth.uid() or public.is_admin());
create policy "horarios: dono ou admin atualiza" on public.horarios
  for update to authenticated using (motorista_id = auth.uid() or public.is_admin());
create policy "horarios: dono ou admin remove" on public.horarios
  for delete to authenticated using (motorista_id = auth.uid() or public.is_admin());

-- reservas: passageiro dono vê e cria as suas; motorista dono do horário também vê as dele
create policy "reservas: select proprio ou do motorista" on public.reservas
  for select to authenticated using (
    passageiro_id = auth.uid()
    or horario_id in (select id from public.horarios where motorista_id = auth.uid())
  );
create policy "reservas: passageiro insere" on public.reservas
  for insert to authenticated with check (passageiro_id = auth.uid());
create policy "reservas: passageiro cancela a propria" on public.reservas
  for update to authenticated using (
    passageiro_id = auth.uid()
    or horario_id in (select id from public.horarios where motorista_id = auth.uid())
  );

-- mensagens: só remetente/destinatário leem; só quem participa da reserva (o passageiro
-- dono ou o motorista dono do horário) pode enviar mensagem nela
create policy "mensagens: participantes leem" on public.mensagens
  for select to authenticated using (remetente_id = auth.uid() or destinatario_id = auth.uid());
create policy "mensagens: participante da reserva envia" on public.mensagens
  for insert to authenticated with check (
    remetente_id = auth.uid()
    and reserva_id in (
      select r.id from public.reservas r
      join public.horarios h on h.id = r.horario_id
      where r.passageiro_id = auth.uid() or h.motorista_id = auth.uid()
    )
  );
create policy "mensagens: destinatario marca como lida" on public.mensagens
  for update to authenticated using (destinatario_id = auth.uid());

-- habilita Realtime (mensagens aparecem na hora, sem precisar recarregar a tela)
alter publication supabase_realtime add table public.mensagens;

-- disponibilidades: passageiro dono vê/gerencia as suas; motorista da linha do município vê e pode notificar
create policy "disponibilidades: select proprio ou motorista da linha" on public.disponibilidades
  for select to authenticated using (
    passageiro_id = auth.uid()
    or municipio_id in (select municipio_id from public.motoristas where id = auth.uid())
  );
create policy "disponibilidades: passageiro insere" on public.disponibilidades
  for insert to authenticated with check (passageiro_id = auth.uid());
create policy "disponibilidades: passageiro ou motorista atualiza" on public.disponibilidades
  for update to authenticated using (
    passageiro_id = auth.uid()
    or municipio_id in (select municipio_id from public.motoristas where id = auth.uid())
  );

-- notificacoes: só o destinatário lê/edita; qualquer autenticado pode inserir
-- (o app cria notificação para "o outro lado" do fluxo: motorista notifica passageiro, etc.)
create policy "notificacoes: destinatario le" on public.notificacoes
  for select to authenticated using (destinatario_id = auth.uid());
create policy "notificacoes: qualquer autenticado insere" on public.notificacoes
  for insert to authenticated with check (true);
create policy "notificacoes: destinatario marca como lida" on public.notificacoes
  for update to authenticated using (destinatario_id = auth.uid());

-- ============================================================================
-- STORAGE: fotos de motoristas (rosto e veículo)
-- ============================================================================
-- Bucket público (qualquer um com o link vê a foto — necessário pro passageiro
-- ver o motorista/carro dentro do app), mas só o admin pode enviar/trocar/apagar.
insert into storage.buckets (id, name, public)
values ('motoristas-fotos', 'motoristas-fotos', true)
on conflict (id) do nothing;

create policy "fotos motoristas: leitura publica"
  on storage.objects for select
  using (bucket_id = 'motoristas-fotos');

create policy "fotos motoristas: admin envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'motoristas-fotos' and public.is_admin());

create policy "fotos motoristas: admin atualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'motoristas-fotos' and public.is_admin());

create policy "fotos motoristas: admin remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'motoristas-fotos' and public.is_admin());

-- ============================================================================
-- SEED: municípios de Alagoas (fonte: guiamais / IBGE)
-- ============================================================================
insert into public.municipios (nome) values
('Água Branca'),('Anadia'),('Arapiraca'),('Atalaia'),('Barra de Santo Antônio'),
('Barra de São Miguel'),('Batalha'),('Belém'),('Belo Monte'),('Boca da Mata'),
('Branquinha'),('Cacimbinhas'),('Cajueiro'),('Campestre'),('Campo Alegre'),
('Campo Grande'),('Canapi'),('Capela'),('Carneiros'),('Chã Preta'),
('Coité do Nóia'),('Colônia Leopoldina'),('Coqueiro Seco'),('Coruripe'),('Craíbas'),
('Delmiro Gouveia'),('Dois Riachos'),('Estrela de Alagoas'),('Feira Grande'),('Feliz Deserto'),
('Flexeiras'),('Girau do Ponciano'),('Ibateguara'),('Igaci'),('Igreja Nova'),
('Inhapi'),('Jacaré dos Homens'),('Jacuípe'),('Japaratinga'),('Jaramataia'),
('Joaquim Gomes'),('Jundiá'),('Junqueiro'),('Lagoa da Canoa'),('Limoeiro de Anadia'),
('Maceió'),('Major Isidoro'),('Mar Vermelho'),('Maragogi'),('Maravilha'),
('Marechal Deodoro'),('Maribondo'),('Mata Grande'),('Matriz de Camaragibe'),('Messias'),
('Minador do Negrão'),('Monteirópolis'),('Murici'),('Novo Lino'),('Olho D''Água Grande'),
('Olho D''Água das Flores'),('Olho D''Água do Casado'),('Olivença'),('Ouro Branco'),('Palestina'),
('Palmeira dos Índios'),('Pão de Açúcar'),('Pariconha'),('Paripueira'),('Passo de Camaragibe'),
('Paulo Jacinto'),('Penedo'),('Piaçabuçu'),('Pilar'),('Pindoba'),
('Piranhas'),('Poço das Trincheiras'),('Porto Calvo'),('Porto de Pedras'),('Porto Real do Colégio'),
('Quebrangulo'),('Rio Largo'),('Roteiro'),('Santa Luzia do Norte'),('Santana do Ipanema'),
('Santana do Mundaú'),('São Brás'),('São José da Laje'),('São José da Tapera'),('São Luís do Quitunde'),
('São Miguel dos Campos'),('São Miguel dos Milagres'),('São Sebastião'),('Satuba'),('Senador Rui Palmeira'),
('Tanque D''Arca'),('Taquarana'),('Teotônio Vilela'),('Traipu'),('União dos Palmares'),
('Viçosa'),('Jequiá da Praia')
on conflict (nome) do nothing;

-- Nota: esta lista tem 101 dos 102 municípios oficiais de Alagoas (fonte pública
-- consultada pode ter uma pequena divergência). Se faltar algum na sua região,
-- adicione direto pela tabela "municipios" no Supabase Studio.
