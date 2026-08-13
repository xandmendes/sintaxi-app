import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listarReservasDoMotorista, type ReservaComPassageiro } from '../../lib/data'
import { formatarDataCurta, formatarHora } from '../../lib/format'
import { Badge, Button, Card, EmptyState, Spinner, WhatsAppLink } from '../../components/ui'
import { Chat } from '../../components/Chat'

export function ReservasMotoristaTab() {
  const { motorista } = useAuth()
  const [reservas, setReservas] = useState<ReservaComPassageiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [chatAberto, setChatAberto] = useState<string | null>(null)

  useEffect(() => {
    if (!motorista) return
    listarReservasDoMotorista(motorista.id)
      .then(setReservas)
      .finally(() => setCarregando(false))
  }, [motorista?.id])

  if (carregando) return <Spinner />
  if (!motorista) return null
  if (reservas.length === 0)
    return <EmptyState title="Nenhuma reserva por enquanto" description="As viagens e encomendas agendadas pelos passageiros aparecem aqui." />

  const agrupadas = reservas.reduce<Record<string, ReservaComPassageiro[]>>((acc, r) => {
    acc[r.reserva.data] = acc[r.reserva.data] ?? []
    acc[r.reserva.data].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {Object.entries(agrupadas).map(([data, itens]) => (
        <div key={data}>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">{formatarDataCurta(data)}</h3>
          <div className="space-y-2">
            {itens.map(({ reserva, passageiro, horario }) => {
              const hora = reserva.direcao === 'ida' ? horario?.hora_ida : horario?.hora_volta
              return (
                <Card key={reserva.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge color={reserva.tipo === 'viagem' ? 'brand' : 'accent'}>
                          {reserva.tipo === 'viagem' ? 'Viagem' : 'Encomenda'}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-800">
                          {hora ? formatarHora(hora) : '--:--'} · {reserva.direcao === 'ida' ? 'Ida' : 'Volta'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {passageiro?.nome} {passageiro?.telefone ? `· ${passageiro.telefone}` : ''}
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

                  {passageiro && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setChatAberto(chatAberto === reserva.id ? null : reserva.id)}
                      >
                        {chatAberto === reserva.id ? 'Fechar conversa' : 'Conversar'}
                      </Button>
                      {passageiro.telefone && (
                        <WhatsAppLink
                          telefone={passageiro.telefone}
                          mensagem={`Olá ${passageiro.nome}, aqui é o motorista sobre a sua ${reserva.tipo === 'viagem' ? 'viagem' : 'encomenda'} de ${formatarDataCurta(reserva.data)}.`}
                        >
                          WhatsApp
                        </WhatsAppLink>
                      )}
                    </div>
                  )}

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
