import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui'

interface Tab {
  key: string
  label: string
  badge?: number
}

export function Layout({
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
  children: ReactNode
}) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-700">
        <div className="h-1 bg-accent-600" />
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-lg font-bold text-white">SINTAXI</p>
            <p className="text-xs text-brand-100">Viagens e encomendas para Maceió</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white sm:inline">{profile?.nome}</span>
            <Button variant="secondary" className="!bg-white/10 !border-white/30 !text-white hover:!bg-white/20" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`relative whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {!!tab.badge && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-xs font-semibold text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
