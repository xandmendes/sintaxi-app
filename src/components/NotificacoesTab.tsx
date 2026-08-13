import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listarNotificacoes, marcarNotificacaoLida } from '../lib/data'
import type { Notificacao } from '../types/database'
import { Card, EmptyState, Spinner } from './ui'

function tempoRelativo(dataISO: string) {
  const diffMs = Date.now() - new Date(dataISO).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `há ${horas}h`
  return `há ${Math.floor(horas / 24)}d`
}

export function NotificacoesTab({ onLidas }: { onLidas?: () => void }) {
  const { profile } = useAuth()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!profile) return
    listarNotificacoes(profile.id)
      .then(async (lista) => {
        setNotificacoes(lista)
        const naoLidas = lista.filter((n) => !n.lida)
        await Promise.all(naoLidas.map((n) => marcarNotificacaoLida(n.id)))
        if (naoLidas.length > 0) onLidas?.()
      })
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  if (carregando) return <Spinner />
  if (notificacoes.length === 0) return <EmptyState title="Nenhum aviso por aqui" />

  return (
    <div className="space-y-2">
      {notificacoes.map((n) => (
        <Card key={n.id} className={n.lida ? '' : 'border-brand-300 bg-brand-50'}>
          <p className="text-sm text-slate-700">{n.mensagem}</p>
          <p className="mt-1 text-xs text-slate-400">{tempoRelativo(n.created_at)}</p>
        </Card>
      ))}
    </div>
  )
}
