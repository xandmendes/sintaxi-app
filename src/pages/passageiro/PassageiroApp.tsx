import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { contarMensagensNaoLidas, listarMunicipios, listarNotificacoes } from '../../lib/data'
import type { Municipio } from '../../types/database'
import { Layout } from '../../components/Layout'
import { NotificacoesTab } from '../../components/NotificacoesTab'
import { Spinner } from '../../components/ui'
import { BuscarTab } from './BuscarTab'
import { ReservasTab } from './ReservasTab'
import { EsperaTab } from './EsperaTab'

type Tab = 'buscar' | 'reservas' | 'espera' | 'avisos'

export function PassageiroApp() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('buscar')
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [municipioId, setMunicipioId] = useState('')
  const [naoLidas, setNaoLidas] = useState(0)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    listarMunicipios()
      .then((lista) => {
        setMunicipios(lista)
        setMunicipioId(profile?.municipio_id ?? lista[0]?.id ?? '')
      })
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.municipio_id])

  useEffect(() => {
    if (!profile) return
    Promise.all([listarNotificacoes(profile.id), contarMensagensNaoLidas(profile.id)]).then(
      ([notifs, mensagens]) => setNaoLidas(notifs.filter((n) => !n.lida).length + mensagens),
    )
  }, [profile, tab])

  if (carregando || !profile) return <Spinner />

  return (
    <Layout
      tabs={[
        { key: 'buscar', label: 'Buscar' },
        { key: 'reservas', label: 'Minhas reservas' },
        { key: 'espera', label: 'Lista de espera' },
        { key: 'avisos', label: 'Avisos', badge: naoLidas },
      ]}
      activeTab={tab}
      onTabChange={(t) => setTab(t as Tab)}
    >
      {tab === 'buscar' && (
        <BuscarTab municipios={municipios} municipioId={municipioId} onMunicipioChange={setMunicipioId} />
      )}
      {tab === 'reservas' && <ReservasTab />}
      {tab === 'espera' && <EsperaTab />}
      {tab === 'avisos' && <NotificacoesTab onLidas={() => setNaoLidas(0)} />}
    </Layout>
  )
}
