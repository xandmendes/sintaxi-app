import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { contarMensagensNaoLidas, listarNotificacoes } from '../../lib/data'
import { Layout } from '../../components/Layout'
import { NotificacoesTab } from '../../components/NotificacoesTab'
import { Spinner } from '../../components/ui'
import { HorariosTab } from './HorariosTab'
import { ReservasMotoristaTab } from './ReservasMotoristaTab'
import { ListaEsperaMotoristaTab } from './ListaEsperaMotoristaTab'

type Tab = 'horarios' | 'reservas' | 'espera' | 'avisos'

export function MotoristaApp() {
  const { profile, motorista } = useAuth()
  const [tab, setTab] = useState<Tab>('reservas')
  const [naoLidas, setNaoLidas] = useState(0)

  useEffect(() => {
    if (!profile) return
    Promise.all([listarNotificacoes(profile.id), contarMensagensNaoLidas(profile.id)]).then(
      ([notifs, mensagens]) => setNaoLidas(notifs.filter((n) => !n.lida).length + mensagens),
    )
  }, [profile, tab])

  if (!profile) return <Spinner />

  if (!motorista) {
    return (
      <Layout tabs={[]} activeTab="" onTabChange={() => {}}>
        <p className="text-center text-slate-500">
          Seu cadastro de motorista ainda não foi concluído. Entre em contato com o suporte.
        </p>
      </Layout>
    )
  }

  return (
    <Layout
      tabs={[
        { key: 'reservas', label: 'Reservas' },
        { key: 'horarios', label: 'Meus horários' },
        { key: 'espera', label: 'Lista de espera' },
        { key: 'avisos', label: 'Avisos', badge: naoLidas },
      ]}
      activeTab={tab}
      onTabChange={(t) => setTab(t as Tab)}
    >
      {tab === 'reservas' && <ReservasMotoristaTab />}
      {tab === 'horarios' && <HorariosTab />}
      {tab === 'espera' && <ListaEsperaMotoristaTab />}
      {tab === 'avisos' && <NotificacoesTab onLidas={() => setNaoLidas(0)} />}
    </Layout>
  )
}
