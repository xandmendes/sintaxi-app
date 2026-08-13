import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { cancelarReserva, listarMinhasReservas, type ReservaDetalhada } from '../../lib/data'
import { formatarDataCurta, formatarHora } from '../../lib/format'
import { Badge, Button, Card, EmptyState, Spinner, WhatsAppLink } from '../../components/ui'
import { Chat } from '../../components/Chat'

export function ReservasTab() {
  const { profile } = useAuth()
  const [reservas, setReservas] = useState<ReservaDetalhada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [chatAberto, setChatAberto] = useState<string | null>(null)

  const carregar = async () => {
    if (!profile) return
    setCarregando(true)
    try {
      setReservas(await listarMinhasReservas(profile.id))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const cancelar = async (id: string) => {
    await cancelarReserva(id)
    carregar()
  }

  if (carregando) return <Spinner />
  if (reservas.length === 0)
    return <EmptyState title="Você ainda não tem reservas" description="Vá até a aba Buscar para agendar uma viagem ou encomenda." />

  return (
    <div className="space-y-3">
      {reservas.map(({ reserva, contexto }) => {
        const hora = reserva.direcao === 'ida' ? contexto?.horario?.hora_ida : contexto?.horario?.hora_volta
        return (
          <Card key={reserva.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge color={reserva.tipo === 'viagem' ? 'brand' : 'accent'}>
                    {reserva.tipo === 'viagem' ? 'Viagem' : 'Encomenda'}
                  </Badge>
                  {reserva.status === 'cancelada' && <Badge color="gray">Cancelada</Badge>}
                </div>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatarDataCurta(reserva.data)} · {hora ? formatarHora(hora) : '--:--'}
                </p>
                <p className="text-sm text-slate-500">
                  {contexto?.municipio?.nome ?? '—'} {reserva.direcao === 'ida' ? '→ Maceió' : '← Maceió'}
                </p>
                <p className="text-sm text-slate-500">Motorista: {contexto?.motoristaProfile?.nome ?? '—'}</p>
                {reserva.tipo === 'viagem' && (
                  <p className="text-sm text-slate-500">{reserva.quantidade_passageiros} passageiro(s)</p>
                )}
                {reserva.tipo === 'encomenda' && (
                  <div className="mt-1 text-sm text-slate-500">
                    <p>{reserva.descricao_encomenda}</p>
                    <p>
                      De: {reserva.local_retirada} → Para: {reserva.local_entrega}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {reserva.status === 'confirmada' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {contexto?.motoristaProfile && (
                  <Button
                    variant="secondary"
                    onClick={() => setChatAberto(chatAberto === reserva.id ? null : reserva.id)}
                  >
                    {chatAberto === reserva.id ? 'Fechar conversa' : 'Conversar'}
                  </Button>
                )}
                {contexto?.motoristaProfile?.telefone && (
                  <WhatsAppLink
                    telefone={contexto.motoristaProfile.telefone}
                    mensagem={`Olá ${contexto.motoristaProfile.nome}, sou passageiro da sua ${reserva.tipo === 'viagem' ? 'viagem' : 'encomenda'} de ${formatarDataCurta(reserva.data)}.`}
                  >
                    WhatsApp
                  </WhatsAppLink>
                )}
                <Button variant="danger" onClick={() => cancelar(reserva.id)}>
                  Cancelar
                </Button>
              </div>
            )}

            {chatAberto === reserva.id && profile && contexto?.motoristaProfile && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Chat
                  reservaId={reserva.id}
                  meuId={profile.id}
                  outroId={contexto.motoristaProfile.id}
                  outroNome={contexto.motoristaProfile.nome}
                />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
