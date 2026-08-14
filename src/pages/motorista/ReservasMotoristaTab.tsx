import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  cancelarReserva,
  criarReservaManual,
  listarMeusHorarios,
  listarReservasDoMotorista,
  type ReservaComPassageiro,
} from '../../lib/data'
import { formatarDataCurta, formatarHora, hojeISO } from '../../lib/format'
import { DIAS_SEMANA_LABEL, type Direcao, type Horario } from '../../types/database'
import { Badge, Button, Card, EmptyState, Input, Label, Select, Spinner, WhatsAppLink } from '../../components/ui'
import { Chat } from '../../components/Chat'

export function ReservasMotoristaTab() {
  const { motorista } = useAuth()
  const [reservas, setReservas] = useState<ReservaComPassageiro[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [chatAberto, setChatAberto] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const carregar = async () => {
    if (!motorista) return
    setCarregando(true)
    try {
      const [r, h] = await Promise.all([listarReservasDoMotorista(motorista.id), listarMeusHorarios(motorista.id)])
      setReservas(r)
      setHorarios(h)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorista?.id])

  const remover = async (id: string) => {
    await cancelarReserva(id)
    carregar()
  }

  if (carregando) return <Spinner />
  if (!motorista) return null

  const agrupadas = reservas.reduce<Record<string, ReservaComPassageiro[]>>((acc, r) => {
    acc[r.reserva.data] = acc[r.reserva.data] ?? []
    acc[r.reserva.data].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {reservas.length === 0 && !mostrarForm && (
        <EmptyState title="Nenhuma reserva por enquanto" description="As viagens e encomendas agendadas pelos passageiros aparecem aqui." />
      )}

      {mostrarForm ? (
        <NovaReservaManualForm
          horarios={horarios}
          onCriado={() => {
            setMostrarForm(false)
            carregar()
          }}
          onCancelar={() => setMostrarForm(false)}
        />
      ) : (
        <Button variant="secondary" onClick={() => setMostrarForm(true)} disabled={horarios.length === 0}>
          + Marcar vaga por telefone
        </Button>
      )}
      {horarios.length === 0 && !mostrarForm && (
        <p className="text-xs text-slate-500">Cadastre um horário em "Meus horários" antes de marcar vagas manualmente.</p>
      )}

      {Object.entries(agrupadas).map(([data, itens]) => (
        <div key={data}>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">{formatarDataCurta(data)}</h3>
          <div className="space-y-2">
            {itens.map(({ reserva, passageiro, horario }) => {
              const hora = reserva.direcao === 'ida' ? horario?.hora_ida : horario?.hora_volta
              const manual = !passageiro && reserva.tipo === 'viagem'
              const nomeExibido = passageiro?.nome ?? reserva.nome_manual
              const telefoneExibido = passageiro?.telefone ?? reserva.telefone_manual
              return (
                <Card key={reserva.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge color={reserva.tipo === 'viagem' ? 'brand' : 'accent'}>
                          {reserva.tipo === 'viagem' ? 'Viagem' : 'Encomenda'}
                        </Badge>
                        {manual && <Badge color="gray">Marcada por telefone</Badge>}
                        <span className="text-sm font-semibold text-slate-800">
                          {hora ? formatarHora(hora) : '--:--'} · {reserva.direcao === 'ida' ? 'Ida' : 'Volta'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {nomeExibido} {telefoneExibido ? `· ${telefoneExibido}` : ''}
                      </p>
                      {reserva.tipo === 'viagem' ? (
                        <p className="text-sm text-slate-500">{reserva.quantidade_passageiros} passageiro(s)</p>
                      ) : (
                        <div className="text-sm text-slate-500">
                          <p>{reserva.descricao_encomenda}</p>
                          <p>
                            De: {reserva.local_retirada} → Para: {reserva.local_entrega}
                          </p>
                          <p>
                            Contato: {reserva.nome_contato} · {reserva.telefone_contato}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {passageiro && (
                      <Button
                        variant="secondary"
                        onClick={() => setChatAberto(chatAberto === reserva.id ? null : reserva.id)}
                      >
                        {chatAberto === reserva.id ? 'Fechar conversa' : 'Conversar'}
                      </Button>
                    )}
                    {telefoneExibido && (
                      <WhatsAppLink
                        telefone={telefoneExibido}
                        mensagem={`Olá ${nomeExibido}, aqui é o motorista sobre a sua ${reserva.tipo === 'viagem' ? 'viagem' : 'encomenda'} de ${formatarDataCurta(reserva.data)}.`}
                      >
                        WhatsApp
                      </WhatsAppLink>
                    )}
                    {manual && (
                      <Button variant="danger" onClick={() => remover(reserva.id)}>
                        Remover
                      </Button>
                    )}
                  </div>

                  {chatAberto === reserva.id && passageiro && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <Chat reservaId={reserva.id} meuId={motorista.id} outroId={passageiro.id} outroNome={passageiro.nome} />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function NovaReservaManualForm({
  horarios,
  onCriado,
  onCancelar,
}: {
  horarios: Horario[]
  onCriado: () => void
  onCancelar: () => void
}) {
  const [horarioId, setHorarioId] = useState(horarios[0]?.id ?? '')
  const [direcao, setDirecao] = useState<Direcao>('ida')
  const [data, setData] = useState(hojeISO())
  const [quantidade, setQuantidade] = useState('1')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const horario = horarios.find((h) => h.id === horarioId)

  const salvar = async () => {
    if (!horarioId) {
      setErro('Selecione um horário.')
      return
    }
    if (!nome.trim()) {
      setErro('Informe o nome do passageiro.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await criarReservaManual({
        horarioId,
        data,
        direcao,
        quantidadePassageiros: Number(quantidade) || 1,
        nomeManual: nome.trim(),
        telefoneManual: telefone.trim() || undefined,
      })
      onCriado()
    } catch {
      setErro('Não foi possível marcar essa vaga.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <p className="mb-3 text-sm text-slate-600">
        Use isso quando alguém combinar a viagem com você por telefone ou WhatsApp — a vaga é descontada
        automaticamente do app, sem precisar que o passageiro tenha conta.
      </p>

      {horarios.length > 1 && (
        <div className="mb-3">
          <Label>Horário</Label>
          <Select value={horarioId} onChange={(e) => setHorarioId(e.target.value)}>
            {horarios.map((h) => (
              <option key={h.id} value={h.id}>
                Ida {formatarHora(h.hora_ida)} · Volta {formatarHora(h.hora_volta)} (
                {h.dias_semana.map((d) => DIAS_SEMANA_LABEL[d]).join(', ')})
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <Label>Data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <Label>Direção</Label>
          <Select value={direcao} onChange={(e) => setDirecao(e.target.value as Direcao)}>
            <option value="ida">Ida ({horario ? formatarHora(horario.hora_ida) : '--:--'})</option>
            <option value="volta">Volta ({horario ? formatarHora(horario.hora_volta) : '--:--'})</option>
          </Select>
        </div>
      </div>

      <div className="mb-3">
        <Label>Nome do passageiro</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria" />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <Label>Telefone (opcional)</Label>
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(82) 9xxxx-xxxx" />
        </div>
        <div>
          <Label>Quantidade de vagas</Label>
          <Input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
        </div>
      </div>

      {erro && <p className="mb-2 text-sm text-accent-600">{erro}</p>}

      <div className="flex gap-2">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Marcar vaga'}
        </Button>
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}
