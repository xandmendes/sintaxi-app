import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Login } from './pages/Login'
import { Cadastro } from './pages/Cadastro'
import { CompletarPerfil } from './pages/CompletarPerfil'
import { SejaMotorista } from './pages/SejaMotorista'
import { PassageiroApp } from './pages/passageiro/PassageiroApp'
import { MotoristaApp } from './pages/motorista/MotoristaApp'
import { AdminApp } from './pages/admin/AdminApp'
import { Spinner } from './components/ui'
import { supabaseConfigured } from './lib/supabase'

function Home() {
  const { session, profile, loading, refreshProfile } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-slate-500">Preparando sua conta...</p>
        <button className="text-sm font-medium text-brand-700 underline" onClick={() => refreshProfile()}>
          Está demorando? Toque para tentar de novo
        </button>
      </div>
    )
  }

  if (profile.tipo === 'passageiro' && !profile.municipio_id) {
    return <CompletarPerfil />
  }

  if (profile.tipo === 'admin') return <AdminApp />
  return profile.tipo === 'motorista' ? <MotoristaApp /> : <PassageiroApp />
}

function ConfigWarning() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-bold text-accent-700">Configuração pendente</h1>
        <p className="mt-2 text-sm text-slate-600">
          Este app ainda não está conectado a um banco de dados Supabase. Crie um arquivo <code>.env</code> com{' '}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> — veja o README para o passo a passo.
        </p>
      </div>
    </div>
  )
}

function App() {
  if (!supabaseConfigured) return <ConfigWarning />

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/seja-motorista" element={<SejaMotorista />} />
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
