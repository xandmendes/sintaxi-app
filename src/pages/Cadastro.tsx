import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { listarMunicipios } from '../lib/data'
import type { Municipio } from '../types/database'
import { Button, Card, Input, Label, Select } from '../components/ui'
import { GoogleButton } from '../components/GoogleButton'

// Cadastro público é só para passageiros. Motoristas são cadastrados pelo
// admin (veja /seja-motorista para quem quiser se candidatar).
export function Cadastro() {
  const navigate = useNavigate()
  const [municipios, setMunicipios] = useState<Municipio[]>([])

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [municipioId, setMunicipioId] = useState('')

  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    listarMunicipios()
      .then((lista) => {
        setMunicipios(lista)
        const laje = lista.find((m) => m.nome === 'São José da Laje')
        setMunicipioId(laje?.id ?? lista[0]?.id ?? '')
      })
      .catch(() => setErro('Não foi possível carregar a lista de municípios. Verifique a configuração do Supabase.'))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setCarregando(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, telefone, municipio_id: municipioId },
      },
    })

    setCarregando(false)

    if (error) {
      setErro(error.message)
      return
    }

    if (!data.session) {
      setAviso('Cadastro criado! Verifique seu e-mail para confirmar a conta antes de entrar.')
      return
    }

    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-accent-600" />
          <h1 className="text-2xl font-bold text-brand-800">Criar conta de passageiro</h1>
        </div>

        <Card className="mb-4">
          <GoogleButton label="Cadastrar com Google" />
          <p className="mt-2 text-center text-xs text-slate-400">
            Só pedimos município e telefone depois, na primeira vez que você entrar.
          </p>
        </Card>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">ou cadastre com e-mail</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input required value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(82) 9xxxx-xxxx" />
            </div>
            <div>
              <Label>Seu município</Label>
              <Select required value={municipioId} onChange={(e) => setMunicipioId(e.target.value)}>
                {municipios.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                Esse será o município mostrado quando você abrir o app — dá para trocar depois.
              </p>
            </div>

            <div>
              <Label>E-mail</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>

            {erro && <p className="text-sm text-accent-600">{erro}</p>}
            {aviso && <p className="text-sm text-emerald-600">{aviso}</p>}

            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          É motorista?{' '}
          <Link to="/seja-motorista" className="font-medium text-brand-700 hover:underline">
            Fale com a gente
          </Link>
        </p>
      </div>
    </div>
  )
}
