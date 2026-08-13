import { useState } from 'react'
import { Layout } from '../../components/Layout'
import { CadastrarMotoristaForm } from './CadastrarMotoristaForm'
import { ListaMotoristasTab } from './ListaMotoristasTab'

type Tab = 'novo' | 'motoristas'

export function AdminApp() {
  const [tab, setTab] = useState<Tab>('motoristas')
  const [chave, setChave] = useState(0)

  return (
    <Layout
      tabs={[
        { key: 'motoristas', label: 'Motoristas' },
        { key: 'novo', label: 'Cadastrar motorista' },
      ]}
      activeTab={tab}
      onTabChange={(t) => setTab(t as Tab)}
    >
      {tab === 'motoristas' && <ListaMotoristasTab key={chave} />}
      {tab === 'novo' && (
        <CadastrarMotoristaForm
          onCriado={() => {
            setChave((c) => c + 1)
          }}
        />
      )}
    </Layout>
  )
}
