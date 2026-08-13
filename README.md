# SINTAXI — agendamento de viagens e encomendas

App web para as linhas de táxi/van intermunicipais de Alagoas (tipo SINTAXI):
cada município tem sua linha para Maceió, com motoristas cadastrados, horários
fixos de ida/volta, e passageiros agendando viagem ou encomenda.

Stack: React + Vite + TypeScript + Tailwind (frontend) e Supabase (Postgres +
Auth + Storage + Realtime) como backend compartilhado — motorista e
passageiro veem os mesmos dados em tempo real, de qualquer dispositivo.

## Como funciona (resumo)

- **Passageiro**: cadastro livre (e-mail ou Google), escolhe o município e
  agenda uma **viagem** (assento) ou **encomenda** (retirada/entrega) num dos
  horários com vaga. Se não tiver vaga, entra numa lista de espera com uma
  janela de horário; quando um motorista libera uma vaga, o passageiro é
  avisado e confirma.
- **Motorista**: cadastro feito **só pelo admin** (veja abaixo). Depois de
  logado, cadastra seus horários (dias da semana + hora de ida/volta), vê as
  reservas e a lista de espera do seu município, e conversa com o passageiro
  pelo chat do app ou por um atalho de WhatsApp.
- **Admin** (só você): cadastra motoristas (com dono da linha, veículo e
  fotos). Quem quiser ser motorista vê uma página pública (`/seja-motorista`)
  que só te chama no WhatsApp — não existe auto-cadastro de motorista.

## 1. Criar o backend (Supabase)

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (tem
   plano gratuito).
2. No painel do projeto, abra **SQL Editor** → cole todo o conteúdo de
   `supabase/schema.sql` → rode. Isso cria as tabelas, as regras de segurança
   (RLS) e já popula a lista de municípios de Alagoas.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public
   key**.

## 2. Configurar o app

```bash
cp .env.example .env
```

Edite `.env` com a URL e a chave que você copiou:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

Edite também `src/lib/config.ts` com o número de WhatsApp real que deve
aparecer na página "Seja motorista".

## 3. Login com Google (opcional, mas recomendado pro passageiro)

Em **Authentication → Sign In / Providers → Google** no Supabase:

1. Ative o provedor Google.
2. Crie um "OAuth Client ID" em
   [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
   (tipo "Web application").
3. Em "Authorized redirect URIs" no Google, cole a URL de callback que o
   Supabase mostra nessa tela (algo como
   `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
4. Cole o Client ID e o Client Secret de volta no Supabase e salve.

Se pular esse passo, o app funciona normalmente com e-mail/senha — só o botão
"Continuar com Google" não vai funcionar.

## 4. Criar sua conta de administrador

Você é o único admin. O cadastro de admin **não** existe na tela do app por
segurança — é feito manualmente, uma única vez:

1. Rode o app (`npm run dev`) e crie uma conta normal pela tela "Criar conta"
   (como passageiro mesmo), usando o e-mail e a senha que você quer usar como
   admin.
2. No SQL Editor do Supabase, abra `supabase/create-admin.sql`, troque
   `'SEU_EMAIL_AQUI'` pelo e-mail que você usou, e rode só o `update`.
3. Deslogue e entre de novo — você cai direto no painel do admin.

> Por padrão o Supabase exige confirmação de e-mail antes do primeiro login.
> Pra testar rápido sem configurar envio de e-mail, você pode desativar em
> **Authentication → Sign In / Providers → Email → "Confirm email"**
> (desative só durante os testes, ou configure um provedor de e-mail de
> verdade antes de lançar pra valer). Isso também afeta o cadastro de
> motoristas feito pelo admin.

## 5. Rodar localmente

```bash
npm install
npm run dev
```

## 6. Publicar (deploy)

O projeto é um site estático (Vite) — dá pra publicar de graça em
[Vercel](https://vercel.com) ou [Netlify](https://netlify.com): conecte o
repositório, configure as duas variáveis de ambiente do `.env` no painel do
serviço, e pronto. Lembre de adicionar a URL final do site em **Authentication
→ URL Configuration → Redirect URLs** no Supabase (necessário pro login com
Google funcionar em produção).

## Estrutura do banco

Veja `supabase/schema.sql` — está todo comentado. Resumo das tabelas:

- `municipios` — municípios de Alagoas (já populado)
- `profiles` — dados de todo usuário (passageiro, motorista ou admin)
- `donos_linha` — dono do ponto/linha de cada município (pode ser o próprio
  motorista)
- `motoristas` — veículo, fotos, capacidade; ligado a um dono de linha
- `horarios` — agenda recorrente de cada motorista (dias da semana + hora de
  ida/volta)
- `reservas` — viagem ou encomenda agendada pelo passageiro numa data
- `disponibilidades` — lista de espera do passageiro quando não há vaga
- `mensagens` — chat dentro do app entre passageiro e motorista de uma reserva
- `notificacoes` — avisos (vaga liberada, vaga confirmada, etc.)

A lista de municípios veio de fonte pública e tem 101 dos 102 municípios
oficiais de Alagoas — se faltar algum na sua região, adicione direto pela
tabela `municipios` no Supabase Studio.
