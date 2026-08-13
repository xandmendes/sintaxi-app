import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  cancelarDisponibilidade,
  confirmarVagaDaDisponibilidade,
  listarMinhasDisponibilidades,
  type DisponibilidadeDetalhada,
} from '../../lib/data'
import { formatarDataCurta, formatarHora } from '../../lib/format'
import { Badge, Button, Card, EmptyState, Spinner } from '../../components/ui'

const STATUS_LABEL: Record<string, { label: string; color: 'brand' | 'accent' | 'gray' | 'green' }> = {
  aguardando: { label: 'Aguardando vaga', color: 'gray' },
  notificado: { label: 'Vaga disponível!', color: 'accent' },
  confirmado: { label: 'Confirmada', color: 'green' },
  expirado: { label: 'Expirada', color: 'gray' },
  cancelado: { label: 'Cancelada', color: 'gray' },
}

export function EsperaTab() {
  const { profile } = useAuth()
  const [itens, setItens] = useState<DisponibilidadeDetalhada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)

  const carregar = async () => {
    if (!profile) return
    setCarregando(true)
    try {
      setItens(await listarMinhasDisponibilidades(profile.id))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const confirmar = async (item: DisponibilidadeDetalhada) => {
    if (!profile || !item.disponibilidade.horario_id || !item.disponibilidade.motorista_id || !item.motoristaProfile) return
    setProcessando(item.disponibilidade.id)
    try {
      await confirmarVagaDaDisponibilidade({
        disponibilidadeId: item.disponibilidade.id,
        passageiroId: profile.id,
        horarioId: item.disponibilidade.horario_id,
        motoristaId: item.disponibilidade.motorista_id,
        motoristaProfileId: item.motoristaProfile.id,
        data: item.disponibilidade.data,
        direcao: item.disponibilidade.direcao,
      })
      carregar()
    } finally {
      setProcessando(null)
    }
  }

  const cancelar = async (id: string) => {
    setProcessando(id)
    try {
      await cancelarDisponibilidade(id)
      carregar()
    } finally {
      setProcessando(null)
    }
  }

  if (carregando) return <Spinner />
  if (itens.length === 0)
    return (
      <EmptyState
        title="Nenhum pedido de vaga registrado"
        description="Quando não houver vaga disponível na aba Buscar, você pode entrar na lista de espera por lá."
      />
    )

  return (
    <div className="space-y-3">
      {itens.map((item) => {
        const status = STATUS_LABEL[item.disponibilidade.status]
        const hora = item.disponibilidade.direcao === 'ida' ? item.horario?.hora_ida : item.horario?.hora_volta
        return (
          <Card key={item.disponibilidade.id}>
            <div className="flex items-start justify-between">
              <div>
                <Badge color={status.color}>{status.label}</Badge>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatarDataCurta(item.disponibilidade.data)} · {formatarHora(item.disponibilidade.hora_inicio)}–
                  {formatarHora(item.disponibilidade.hora_fim)}
                </p>
                <p className="text-sm text-slate-500">
                  {item.municipio?.nome} {item.disponibilidade.direcao === 'ida' ? '→ Maceió' : '← Maceió'}
                </p>
                {item.disponibilidade.status === 'notificado' && (
                  <p className="mt-1 text-sm text-slate-600">
                    {item.motoristaProfile?.nome} tem uma vaga para você{hora ? ` às ${formatarHora(hora)}` : ''}.
                  </p>
                )}
              </div>
            </div>

            {item.disponibilidade.status === 'notificado' && (
              <Button className="mt-3" onClick={() => confirmar(item)} disabled={processando === item.disponibilidade.id}>
                Confirmar vaga
              </Button>
            )}
            {(item.disponibilidade.status === 'aguardando' || item.disponibilidade.status === 'notificado') && (
              <Button
                variant="secondary"
                className="ml-2 mt-3"
                onClick={() => cancelar(item.disponibilidade.id)}
                disabled={processando === item.disponibilidade.id}
              >
                Cancelar pedido
              </Button>
            )}
          </Card>
        )
      })}
    </div>
  )
}
