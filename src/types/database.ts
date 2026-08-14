import { supabase } from './supabase'
import { criarClienteDescartavel } from './adminClient'
import { diaDaSemana } from './format'
import type {
  Direcao,
  Disponibilidade,
  DonoLinha,
  Horario,
  Mensagem,
  Motorista,
  Municipio,
  Notificacao,
  Profile,
  Reserva,
} from '../types/database'

export async function listarMunicipios(): Promise<Municipio[]> {
  const { data, error } = await supabase.from('municipios').select('*').order('nome')
  if (error) throw error
  return data ?? []
}

export interface HorarioComVagas {
  horario: Horario
  motorista: Motorista
  motoristaProfile: Profile
  vagasTotais: number
  vagasOcupadas: number
  vagasLivres: number
}

/**
 * Busca os horários (de todos os motoristas de um município) que rodam num dia da
 * semana específico, já com a contagem de vagas ocupadas/livres para aquela data e direção.
 */
export async function buscarHorariosDisponiveis(
  municipioId: string,
  direcao: Direcao,
  data: string,
): Promise<HorarioComVagas[]> {
  const diaSemana = diaDaSemana(data)

  const { data: motoristas, error: errMotoristas } = await supabase
    .from('motoristas')
    .select('*')
    .eq('municipio_id', municipioId)
    .eq('ativo', true)

  if (errMotoristas) throw errMotoristas
  if (!motoristas || motoristas.length === 0) return []

  const motoristaIds = motoristas.map((m) => m.id)

  const { data: horarios, error: errHorarios } = await supabase
    .from('horarios')
    .select('*')
    .in('motorista_id', motoristaIds)
    .eq('ativo', true)
    .contains('dias_semana', [diaSemana])

  if (errHorarios) throw errHorarios
  if (!horarios || horarios.length === 0) return []

  const horarioIds = horarios.map((h) => h.id)

  const [{ data: profiles, error: errProfiles }, { data: vagas, error: errVagas }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', motoristaIds),
    supabase
      .from('vagas_ocupadas')
      .select('*')
      .in('horario_id', horarioIds)
      .eq('data', data)
      .eq('direcao', direcao),
  ])

  if (errProfiles) throw errProfiles
  if (errVagas) throw errVagas

  const motoristasPorId = new Map(motoristas.map((m) => [m.id, m]))
  const profilesPorId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const ocupadasPorHorario = new Map((vagas ?? []).map((v) => [v.horario_id, v.ocupadas]))

  return horarios
    .map((horario) => {
      const motorista = motoristasPorId.get(horario.motorista_id)!
      const motoristaProfile = profilesPorId.get(horario.motorista_id)!
      const vagasOcupadas = ocupadasPorHorario.get(horario.id) ?? 0
      const vagasTotais = motorista.capacidade_passageiros
      return {
        horario,
        motorista,
        motoristaProfile,
        vagasTotais,
        vagasOcupadas,
        vagasLivres: Math.max(0, vagasTotais - vagasOcupadas),
      }
    })
    .sort((a, b) => {
      const horaA = direcao === 'ida' ? a.horario.hora_ida : a.horario.hora_volta
      const horaB = direcao === 'ida' ? b.horario.hora_ida : b.horario.hora_volta
      return horaA.localeCompare(horaB)
    })
}

export async function criarReservaViagem(params: {
  passageiroId: string
  horarioId: string
  data: string
  direcao: Direcao
  quantidadePassageiros: number
}) {
  const { error } = await supabase.from('reservas').insert({
    tipo: 'viagem',
    passageiro_id: params.passageiroId,
    horario_id: params.horarioId,
    data: params.data,
    direcao: params.direcao,
    quantidade_passageiros: params.quantidadePassageiros,
    status: 'confirmada',
  })
  if (error) throw error
}

// Vaga marcada como ocupada pelo próprio motorista — para quando o passageiro
// combina a viagem por telefone/WhatsApp em vez de usar o app. Não tem
// passageiro_id (ninguém logado), só um nome/telefone informados à mão.
export async function criarReservaManual(params: {
  horarioId: string
  data: string
  direcao: Direcao
  quantidadePassageiros: number
  nomeManual: string
  telefoneManual?: string
}) {
  const { error } = await supabase.from('reservas').insert({
    tipo: 'viagem',
    passageiro_id: null,
    horario_id: params.horarioId,
    data: params.data,
    direcao: params.direcao,
    quantidade_passageiros: params.quantidadePassageiros,
    nome_manual: params.nomeManual,
    telefone_manual: params.telefoneManual || null,
    status: 'confirmada',
  })
  if (error) throw error
}

export async function criarReservaEncomenda(params: {
  passageiroId: string
  horarioId: string
  data: string
  direcao: Direcao
  descricao: string
  localRetirada: string
  localEntrega: string
  nomeContato: string
  telefoneContato: string
}) {
  const { error } = await supabase.from('reservas').insert({
    tipo: 'encomenda',
    passageiro_id: params.passageiroId,
    horario_id: params.horarioId,
    data: params.data,
    direcao: params.direcao,
    quantidade_passageiros: 0,
    descricao_encomenda: params.descricao,
    local_retirada: params.localRetirada,
    local_entrega: params.localEntrega,
    nome_contato: params.nomeContato,
    telefone_contato: params.telefoneContato,
    status: 'confirmada',
  })
  if (error) throw error
}

export async function cancelarReserva(id: string) {
  const { error } = await supabase.from('reservas').update({ status: 'cancelada' }).eq('id', id)
  if (error) throw error
}

export async function criarDisponibilidade(params: {
  passageiroId: string
  municipioId: string
  direcao: Direcao
  data: string
  horaInicio: string
  horaFim: string
}) {
  const { error } = await supabase.from('disponibilidades').insert({
    passageiro_id: params.passageiroId,
    municipio_id: params.municipioId,
    direcao: params.direcao,
    data: params.data,
    hora_inicio: params.horaInicio,
    hora_fim: params.horaFim,
    status: 'aguardando',
  })
  if (error) throw error
}

export async function notificarPassageiro(params: {
  disponibilidadeId: string
  passageiroId: string
  motoristaId: string
  horarioId: string
  mensagem: string
}) {
  const { error: errDisp } = await supabase
    .from('disponibilidades')
    .update({ status: 'notificado', motorista_id: params.motoristaId, horario_id: params.horarioId })
    .eq('id', params.disponibilidadeId)
  if (errDisp) throw errDisp

  const { error: errNotif } = await supabase.from('notificacoes').insert({
    destinatario_id: params.passageiroId,
    tipo: 'vaga_disponivel',
    mensagem: params.mensagem,
    disponibilidade_id: params.disponibilidadeId,
  })
  if (errNotif) throw errNotif
}

export async function confirmarVagaDaDisponibilidade(params: {
  disponibilidadeId: string
  passageiroId: string
  horarioId: string
  motoristaId: string
  motoristaProfileId: string
  data: string
  direcao: Direcao
}) {
  const { error: errReserva } = await supabase.from('reservas').insert({
    tipo: 'viagem',
    passageiro_id: params.passageiroId,
    horario_id: params.horarioId,
    data: params.data,
    direcao: params.direcao,
    quantidade_passageiros: 1,
    status: 'confirmada',
  })
  if (errReserva) throw errReserva

  const { error: errDisp } = await supabase
    .from('disponibilidades')
    .update({ status: 'confirmado' })
    .eq('id', params.disponibilidadeId)
  if (errDisp) throw errDisp

  const { error: errNotif } = await supabase.from('notificacoes').insert({
    destinatario_id: params.motoristaProfileId,
    tipo: 'vaga_confirmada',
    mensagem: 'O passageiro confirmou a vaga que você ofereceu.',
  })
  if (errNotif) throw errNotif
}

export async function recusarNotificacao(disponibilidadeId: string) {
  const { error } = await supabase
    .from('disponibilidades')
    .update({ status: 'aguardando', motorista_id: null, horario_id: null })
    .eq('id', disponibilidadeId)
  if (error) throw error
}

export async function cancelarDisponibilidade(id: string) {
  const { error } = await supabase.from('disponibilidades').update({ status: 'cancelado' }).eq('id', id)
  if (error) throw error
}

export async function marcarNotificacaoLida(id: string) {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Consultas "detalhadas" — buscam as tabelas relacionadas em lote e juntam em
// JS, evitando depender de joins aninhados tipados do PostgREST.
// ---------------------------------------------------------------------------

export interface ContextoHorario {
  horario: Horario | null
  motorista: Motorista | null
  motoristaProfile: Profile | null
  municipio: Municipio | null
}

async function buscarContextoDosHorarios(horarioIds: string[]): Promise<Map<string, ContextoHorario>> {
  const mapa = new Map<string, ContextoHorario>()
  if (horarioIds.length === 0) return mapa

  const { data: horarios, error: errHorarios } = await supabase
    .from('horarios')
    .select('*')
    .in('id', Array.from(new Set(horarioIds)))
  if (errHorarios) throw errHorarios

  const motoristaIds = Array.from(new Set((horarios ?? []).map((h) => h.motorista_id)))

  const { data: motoristas, error: errMotoristas } =
    motoristaIds.length > 0
      ? await supabase.from('motoristas').select('*').in('id', motoristaIds)
      : { data: [] as Motorista[], error: null }
  if (errMotoristas) throw errMotoristas

  const { data: profiles, error: errProfiles } =
    motoristaIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', motoristaIds)
      : { data: [] as Profile[], error: null }
  if (errProfiles) throw errProfiles

  const municipioIds = Array.from(new Set((motoristas ?? []).map((m) => m.municipio_id)))
  const { data: municipios, error: errMunicipios } =
    municipioIds.length > 0
      ? await supabase.from('municipios').select('*').in('id', municipioIds)
      : { data: [] as Municipio[], error: null }
  if (errMunicipios) throw errMunicipios

  const motoristasPorId = new Map((motoristas ?? []).map((m) => [m.id, m]))
  const profilesPorId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const municipiosPorId = new Map((municipios ?? []).map((m) => [m.id, m]))

  for (const horario of horarios ?? []) {
    const motorista = motoristasPorId.get(horario.motorista_id) ?? null
    mapa.set(horario.id, {
      horario,
      motorista,
      motoristaProfile: profilesPorId.get(horario.motorista_id) ?? null,
      municipio: motorista ? municipiosPorId.get(motorista.municipio_id) ?? null : null,
    })
  }
  return mapa
}

export interface ReservaDetalhada {
  reserva: Reserva
  contexto: ContextoHorario | null
}

export async function listarMinhasReservas(passageiroId: string): Promise<ReservaDetalhada[]> {
  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('passageiro_id', passageiroId)
    .order('data', { ascending: false })
  if (error) throw error
  if (!reservas) return []

  const contextos = await buscarContextoDosHorarios(reservas.map((r) => r.horario_id))
  return reservas.map((reserva) => ({ reserva, contexto: contextos.get(reserva.horario_id) ?? null }))
}

export interface DisponibilidadeDetalhada {
  disponibilidade: Disponibilidade
  municipio: Municipio | null
  motoristaProfile: Profile | null
  horario: Horario | null
  passageiroProfile?: Profile | null
}

export async function listarMinhasDisponibilidades(passageiroId: string): Promise<DisponibilidadeDetalhada[]> {
  const { data: disponibilidades, error } = await supabase
    .from('disponibilidades')
    .select('*')
    .eq('passageiro_id', passageiroId)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!disponibilidades) return []

  const municipioIds = Array.from(new Set(disponibilidades.map((d) => d.municipio_id)))
  const motoristaIds = Array.from(
    new Set(disponibilidades.map((d) => d.motorista_id).filter((id): id is string => !!id)),
  )
  const horarioIds = Array.from(
    new Set(disponibilidades.map((d) => d.horario_id).filter((id): id is string => !!id)),
  )

  const [{ data: municipios }, { data: profiles }, { data: horarios }] = await Promise.all([
    municipioIds.length ? supabase.from('municipios').select('*').in('id', municipioIds) : Promise.resolve({ data: [] as Municipio[] }),
    motoristaIds.length ? supabase.from('profiles').select('*').in('id', motoristaIds) : Promise.resolve({ data: [] as Profile[] }),
    horarioIds.length ? supabase.from('horarios').select('*').in('id', horarioIds) : Promise.resolve({ data: [] as Horario[] }),
  ])

  const municipiosPorId = new Map((municipios ?? []).map((m) => [m.id, m]))
  const profilesPorId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const horariosPorId = new Map((horarios ?? []).map((h) => [h.id, h]))

  return disponibilidades.map((d) => ({
    disponibilidade: d,
    municipio: municipiosPorId.get(d.municipio_id) ?? null,
    motoristaProfile: d.motorista_id ? profilesPorId.get(d.motorista_id) ?? null : null,
    horario: d.horario_id ? horariosPorId.get(d.horario_id) ?? null : null,
  }))
}

// ---------------------------------------------------------------------------
// Área do motorista
// ---------------------------------------------------------------------------

export async function listarMeusHorarios(motoristaId: string): Promise<Horario[]> {
  const { data, error } = await supabase
    .from('horarios')
    .select('*')
    .eq('motorista_id', motoristaId)
    .order('hora_ida')
  if (error) throw error
  return data ?? []
}

export async function criarHorario(params: {
  motoristaId: string
  diasSemana: number[]
  horaIda: string
  horaVolta: string
}) {
  const { error } = await supabase.from('horarios').insert({
    motorista_id: params.motoristaId,
    dias_semana: params.diasSemana,
    hora_ida: params.horaIda,
    hora_volta: params.horaVolta,
    ativo: true,
  })
  if (error) throw error
}

export async function alternarHorarioAtivo(id: string, ativo: boolean) {
  const { error } = await supabase.from('horarios').update({ ativo }).eq('id', id)
  if (error) throw error
}

export async function removerHorario(id: string) {
  const { error } = await supabase.from('horarios').delete().eq('id', id)
  if (error) throw error
}

export interface ReservaComPassageiro {
  reserva: Reserva
  passageiro: Profile | null
  horario: Horario | null
}

export async function listarReservasDoMotorista(motoristaId: string): Promise<ReservaComPassageiro[]> {
  const { data: horarios, error: errHorarios } = await supabase
    .from('horarios')
    .select('*')
    .eq('motorista_id', motoristaId)
  if (errHorarios) throw errHorarios
  const horarioIds = (horarios ?? []).map((h) => h.id)
  if (horarioIds.length === 0) return []

  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('*')
    .in('horario_id', horarioIds)
    .eq('status', 'confirmada')
    .gte('data', hojeISOInterno())
    .order('data')
  if (error) throw error
  if (!reservas) return []

  const passageiroIds = Array.from(
    new Set(reservas.map((r) => r.passageiro_id).filter((id): id is string => !!id)),
  )
  const { data: profiles } =
    passageiroIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', passageiroIds)
      : { data: [] as Profile[] }
  const profilesPorId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const horariosPorId = new Map((horarios ?? []).map((h) => [h.id, h]))

  return reservas.map((reserva) => ({
    reserva,
    passageiro: (reserva.passageiro_id && profilesPorId.get(reserva.passageiro_id)) || null,
    horario: horariosPorId.get(reserva.horario_id) ?? null,
  }))
}

function hojeISOInterno() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export async function listarListaEsperaDoMunicipio(municipioId: string): Promise<DisponibilidadeDetalhada[]> {
  const { data: disponibilidades, error } = await supabase
    .from('disponibilidades')
    .select('*')
    .eq('municipio_id', municipioId)
    .in('status', ['aguardando', 'notificado'])
    .order('data')
  if (error) throw error
  if (!disponibilidades) return []

  const passageiroIds = Array.from(new Set(disponibilidades.map((d) => d.passageiro_id)))
  const motoristaIds = Array.from(
    new Set(disponibilidades.map((d) => d.motorista_id).filter((id): id is string => !!id)),
  )
  const horarioIds = Array.from(
    new Set(disponibilidades.map((d) => d.horario_id).filter((id): id is string => !!id)),
  )

  const [{ data: passageiros }, { data: motoristasProfiles }, { data: horarios }, { data: municipio }] =
    await Promise.all([
      passageiroIds.length ? supabase.from('profiles').select('*').in('id', passageiroIds) : Promise.resolve({ data: [] as Profile[] }),
      motoristaIds.length ? supabase.from('profiles').select('*').in('id', motoristaIds) : Promise.resolve({ data: [] as Profile[] }),
      horarioIds.length ? supabase.from('horarios').select('*').in('id', horarioIds) : Promise.resolve({ data: [] as Horario[] }),
      supabase.from('municipios').select('*').eq('id', municipioId).maybeSingle(),
    ])

  const passageirosPorId = new Map((passageiros ?? []).map((p) => [p.id, p]))
  const motoristasPorId = new Map((motoristasProfiles ?? []).map((p) => [p.id, p]))
  const horariosPorId = new Map((horarios ?? []).map((h) => [h.id, h]))

  return disponibilidades.map((d) => ({
    disponibilidade: d,
    municipio: municipio ?? null,
    motoristaProfile: d.motorista_id ? motoristasPorId.get(d.motorista_id) ?? null : null,
    horario: d.horario_id ? horariosPorId.get(d.horario_id) ?? null : null,
    passageiroProfile: passageirosPorId.get(d.passageiro_id) ?? null,
  }))
}

// ---------------------------------------------------------------------------
// Chat (mensagens dentro do app, por reserva)
// ---------------------------------------------------------------------------

export async function listarMensagens(reservaId: string): Promise<Mensagem[]> {
  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .eq('reserva_id', reservaId)
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function enviarMensagem(params: {
  reservaId: string
  remetenteId: string
  destinatarioId: string
  conteudo: string
}) {
  const { error } = await supabase.from('mensagens').insert({
    reserva_id: params.reservaId,
    remetente_id: params.remetenteId,
    destinatario_id: params.destinatarioId,
    conteudo: params.conteudo,
  })
  if (error) throw error
}

export async function marcarMensagensLidas(reservaId: string, destinatarioId: string) {
  const { error } = await supabase
    .from('mensagens')
    .update({ lida: true })
    .eq('reserva_id', reservaId)
    .eq('destinatario_id', destinatarioId)
    .eq('lida', false)
  if (error) throw error
}

export async function contarMensagensNaoLidas(destinatarioId: string): Promise<number> {
  const { count, error } = await supabase
    .from('mensagens')
    .select('id', { count: 'exact', head: true })
    .eq('destinatario_id', destinatarioId)
    .eq('lida', false)
  if (error) throw error
  return count ?? 0
}

export async function listarNotificacoes(destinatarioId: string): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('destinatario_id', destinatarioId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Área do admin
// ---------------------------------------------------------------------------

export async function listarDonosLinha(): Promise<DonoLinha[]> {
  const { data, error } = await supabase.from('donos_linha').select('*').order('nome')
  if (error) throw error
  return data ?? []
}

export async function criarDonoLinha(params: { municipioId: string; nome: string; telefone: string; criadoPor: string }) {
  const { data, error } = await supabase
    .from('donos_linha')
    .insert({
      municipio_id: params.municipioId,
      nome: params.nome,
      telefone: params.telefone,
      criado_por: params.criadoPor,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as DonoLinha
}

export async function uploadFotoMotorista(motoristaId: string, tipo: 'rosto' | 'veiculo', arquivo: File): Promise<string> {
  const extensao = arquivo.name.split('.').pop() ?? 'jpg'
  const caminho = `${motoristaId}/${tipo}.${extensao}`
  const { error } = await supabase.storage.from('motoristas-fotos').upload(caminho, arquivo, {
    upsert: true,
    contentType: arquivo.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from('motoristas-fotos').getPublicUrl(caminho)
  return data.publicUrl
}

export interface MotoristaDetalhado {
  motorista: Motorista
  profile: Profile | null
  donoLinha: DonoLinha | null
}

export async function listarTodosMotoristas(): Promise<MotoristaDetalhado[]> {
  const { data: motoristas, error } = await supabase.from('motoristas').select('*').order('created_at', { ascending: false })
  if (error) throw error
  if (!motoristas) return []

  const ids = motoristas.map((m) => m.id)
  const donoIds = Array.from(new Set(motoristas.map((m) => m.dono_linha_id)))

  const [{ data: profiles }, { data: donos }] = await Promise.all([
    ids.length ? supabase.from('profiles').select('*').in('id', ids) : Promise.resolve({ data: [] as Profile[] }),
    donoIds.length ? supabase.from('donos_linha').select('*').in('id', donoIds) : Promise.resolve({ data: [] as DonoLinha[] }),
  ])

  const profilesPorId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const donosPorId = new Map((donos ?? []).map((d) => [d.id, d]))

  return motoristas.map((motorista) => ({
    motorista,
    profile: profilesPorId.get(motorista.id) ?? null,
    donoLinha: donosPorId.get(motorista.dono_linha_id) ?? null,
  }))
}

/**
 * Fluxo completo de "admin cadastra um motorista":
 *  1. Cria a conta de login (auth) do motorista num client descartável, sem
 *     afetar a sessão do admin (veja lib/adminClient.ts).
 *  2. Com a sessão do PRÓPRIO ADMIN (que tem bypass nas policies), promove o
 *     profile recém-criado de 'passageiro' (padrão do trigger) para 'motorista'.
 *  3. Insere a linha em `motoristas` com veículo/fotos/dono da linha.
 */
export async function cadastrarMotoristaComoAdmin(params: {
  email: string
  senha: string
  nome: string
  telefone: string
  municipioId: string
  donoLinhaId: string
  veiculoModelo: string
  veiculoPlaca: string
  capacidadePassageiros: number
  adminId: string
}): Promise<{ motoristaId: string }> {
  const clienteTemp = criarClienteDescartavel()

  const { data: signUpData, error: signUpError } = await clienteTemp.auth.signUp({
    email: params.email,
    password: params.senha,
    options: {
      data: {
        nome: params.nome,
        telefone: params.telefone,
        municipio_id: params.municipioId,
      },
    },
  })
  if (signUpError) throw signUpError
  const novoId = signUpData.user?.id
  if (!novoId) throw new Error('Não foi possível criar a conta do motorista.')

  // dá um instante para o trigger on_auth_user_created inserir o profile
  await new Promise((resolve) => setTimeout(resolve, 400))

  const { error: erroPromover } = await supabase
    .from('profiles')
    .update({ tipo: 'motorista', municipio_id: params.municipioId, telefone: params.telefone })
    .eq('id', novoId)
  if (erroPromover) throw erroPromover

  const { error: erroMotorista } = await supabase.from('motoristas').insert({
    id: novoId,
    dono_linha_id: params.donoLinhaId,
    municipio_id: params.municipioId,
    veiculo_modelo: params.veiculoModelo,
    veiculo_placa: params.veiculoPlaca,
    capacidade_passageiros: params.capacidadePassageiros,
    ativo: true,
    criado_por: params.adminId,
  })
  if (erroMotorista) throw erroMotorista

  return { motoristaId: novoId }
}

export async function atualizarFotosMotorista(
  motoristaId: string,
  patch: { foto_rosto_url?: string; foto_veiculo_url?: string },
) {
  const { error } = await supabase.from('motoristas').update(patch).eq('id', motoristaId)
  if (error) throw error
}

export async function alternarMotoristaAtivo(id: string, ativo: boolean) {
  const { error } = await supabase.from('motoristas').update({ ativo }).eq('id', id)
  if (error) throw error
}
