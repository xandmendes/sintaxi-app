import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listarListaEsperaDoMunicipio, listarMeusHorarios, notificarPassageiro } from '../../lib/data'
import type { DisponibilidadeDetalhada } from '../../lib/data'
import { diaDaSemana, formatarDataCurta, formatarHora } from '../../lib/format'
import type { Horario } from '../../types/database'
import { Badge, Button, Card, EmptyState, Select, Spinner } from '../../components/ui'

export function ListaEsperaMotoristaTab() {
  const { motorista, profile } = useAuth()
  const [itens, setItens] = useState<DisponibilidadeDetalhada[]>([])
  const [meusHorarios, setMeusHorarios] = useState<Horario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [notificando, setNotificando] = useState<string | null>(null)

  const carregar = async () => {
    if (!motorista) return
    setCarregando(true)
    try {
      const [espera, horarios] = await Promise.all([
        listarListaEsperaDoMunicipio(motorista.municipio_id),
        listarMeusHorarios(motorista.id),
      ])
      setItens(espera)
      setMeusHorarios(horarios.filter((h) => h.ativo))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorista?.id])

  if (!motorista || !profile) return null
  if (carregando) return <Spinner />

  const aguardando = itens.filter((i) => i.disponibilidade.status === 'aguardando')
  const jaNotificados = itens.filter(
    (i) => i.disponibilidade.status === 'notificado' && i.disponibilidade.motorista_id === motorista.id,
  )

  if (aguardando.length === 0 && jaNotificados.length === 0)
    return <EmptyState title="Ninguém na lista de espera" description="Passageiros sem vaga disponível aparecem aqui." />

  return (
    <div className="space-y-6">
      {aguardando.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Aguardando vaga</h3>
          <div className="space-y-3">
            {aguardando.map((item) => {
              const dia = diaDaSemana(item.disponibilidade.data)
              const compatíveis = meusHorarios.filter((h) => {
                if (!h.dias_semana.includes(dia)) return false
                const hora = item.disponibilidade.direcao === 'ida' ? h.hora_ida : h.hora_volta
                return hora >= item.disponibilidade.hora_inicio && hora <= item.disponibilidade.hora_fim
              })

              return (
                <Card key={item.disponibilidade.id}>
                  <p className="font-semibold text-slate-900">{item.passageiroProfile?.nome}</p>
                  <p className="text-sm text-slate-500">
                    {formatarDataCurta(item.disponibilidade.data)} · {formatarHora(item.disponibilidade.hora_inicio)}–
                    {formatarHora(item.disponibilidade.hora_fim)} ·{' '}
                    {item.disponibilidade.direcao === 'ida' ? `${item.municipio?.nome} → Maceió` : `Maceió → ${item.municipio?.nome}`}
                  </p>
                  {item.passageiroProfile?.telefone && (
                    <p className="text-sm text-slate-500">Tel: {item.passageiroProfile.telefone}</p>
                  )}

                  {compatíveis.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-400">Nenhum dos seus horários se encaixa nessa janela.</p>
                  ) : (
                    <NotificarForm
                      disponibilidadeId={item.disponibilidade.id}
                      passageiroId={item.disponibilidade.passageiro_id}
                      motoristaId={motorista.id}
                      opcoes={compatíveis}
                      direcao={item.disponibilidade.direcao}
                      processando={notificando === item.disponibilidade.id}
                      onNotificar={async (horarioId) => {
                        setNotificando(item.disponibilidade.id)
                        try {
                          await notificarPassageiro({
                            disponibilidadeId: item.disponibilidade.id,
                            passageiroId: item.disponibilidade.passageiro_id,
                            motoristaId: motorista.id,
                            horarioId,
                            mensagem: `${profile.nome} tem uma vaga para você em ${formatarDataCurta(item.disponibilidade.data)}. Abra a aba "Lista de espera" para confirmar.`,
                          })
                          carregar()
                        } finally {
                          setNotificando(null)
                        }
                      }}
                    />
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {jaNotificados.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Aguardando confirmação do passageiro</h3>
          <div className="space-y-3">
            {jaNotificados.map((item) => (
              <Card key={item.disponibilidade.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.passageiroProfile?.nome}</p>
                    <p className="text-sm text-slate-500">{formatarDataCurta(item.disponibilidade.data)}</p>
                  </div>
                  <Badge color="accent">Notificado</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificarForm({
  opcoes,
  direcao,
  processando,
  onNotificar,
}: {
  disponibilidadeId: string
  passageiroId: string
  motoristaId: string
  opcoes: Horario[]
  direcao: 'ida' | 'volta'
  processando: boolean
  onNotificar: (horarioId: string) => void
}) {
  const [horarioId, setHorarioId] = useState(opcoes[0]?.id ?? '')

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Select value={horarioId} onChange={(e) => setHorarioId(e.target.value)} className="max-w-[160px]">
        {opcoes.map((h) => (
          <option key={h.id} value={h.id}>
            {formatarHora(direcao === 'ida' ? h.hora_ida : h.hora_volta)}
          </option>
        ))}
      </Select>
      <Button disabled={processando} onClick={() => onNotificar(horarioId)}>
        {processando ? 'Notificando...' : 'Notificar vaga'}
      </Button>
    </div>
  )
}
