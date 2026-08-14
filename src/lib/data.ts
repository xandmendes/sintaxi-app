export type TipoUsuario = 'motorista' | 'passageiro' | 'admin'
export type Direcao = 'ida' | 'volta'
export type TipoReserva = 'viagem' | 'encomenda'
export type StatusReserva = 'confirmada' | 'cancelada'
export type StatusDisponibilidade =
  | 'aguardando'
  | 'notificado'
  | 'confirmado'
  | 'expirado'
  | 'cancelado'

export interface Municipio {
  id: string
  nome: string
  uf: string
}

export interface Profile {
  id: string
  tipo: TipoUsuario
  nome: string
  telefone: string | null
  municipio_id: string | null
  created_at: string
}

export interface DonoLinha {
  id: string
  municipio_id: string
  nome: string
  telefone: string | null
  criado_por: string | null
  created_at: string
}

export interface Motorista {
  id: string
  dono_linha_id: string
  municipio_id: string
  veiculo_modelo: string | null
  veiculo_placa: string | null
  capacidade_passageiros: number
  foto_rosto_url: string | null
  foto_veiculo_url: string | null
  ativo: boolean
  criado_por: string | null
  created_at: string
}

export interface Horario {
  id: string
  motorista_id: string
  dias_semana: number[]
  hora_ida: string
  hora_volta: string
  ativo: boolean
  created_at: string
}

export interface Reserva {
  id: string
  tipo: TipoReserva
  // null quando é uma vaga que o próprio motorista marcou como ocupada (ex:
  // passageiro que ligou/chamou no WhatsApp em vez de usar o app) — veja
  // nome_manual/telefone_manual nesse caso.
  passageiro_id: string | null
  horario_id: string
  data: string
  direcao: Direcao
  quantidade_passageiros: number
  descricao_encomenda: string | null
  local_retirada: string | null
  local_entrega: string | null
  nome_contato: string | null
  telefone_contato: string | null
  // Preenchidos só quando passageiro_id é null (reserva lançada manualmente pelo motorista)
  nome_manual: string | null
  telefone_manual: string | null
  status: StatusReserva
  created_at: string
}

export interface Disponibilidade {
  id: string
  passageiro_id: string
  municipio_id: string
  direcao: Direcao
  data: string
  hora_inicio: string
  hora_fim: string
  status: StatusDisponibilidade
  horario_id: string | null
  motorista_id: string | null
  created_at: string
}

export interface Mensagem {
  id: string
  reserva_id: string
  remetente_id: string
  destinatario_id: string
  conteudo: string
  lida: boolean
  created_at: string
}

export interface Notificacao {
  id: string
  destinatario_id: string
  tipo: string
  mensagem: string
  lida: boolean
  disponibilidade_id: string | null
  reserva_id: string | null
  created_at: string
}

export interface VagasOcupadas {
  horario_id: string
  data: string
  direcao: Direcao
  ocupadas: number
}


export const DIAS_SEMANA_LABEL: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
}

export const DIAS_SEMANA_LABEL_LONGO: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}
