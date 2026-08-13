import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { listarMunicipios } from '../lib/data'
import type { Municipio } from '../types/database'
import { Button, Card, Input, Label, Select } from '../components/ui'

/** Mostrada uma única vez para quem entrou via Google e ainda não tem município/telefone salvos. */
export function CompletarPerfil() {
  const { profile, refreshProfile } = useAuth()
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [municipioId, setMunicipioId] = useState('')
  const [telefone, setTelefone] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarMunicipios().then((lista) => {
      setMunicipios(lista)
      setMunicipioId(lista.find((m) => m.nome === 'São José da Laje')?.id ?? lista[0]?.id ?? '')
    })
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSalvando(true)
    setErro(null)
    const { error } = await supabase
      .from('profiles')
      .update({ municipio_id: municipioId, telefone })
      .eq('id', profile.id)
    setSalvando(false)
    if (error) {
      setErro('Não foi possível salvar. Tente novamente.')
      return
    }
    await refreshProfile()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-accent-600" />
          <h1 className="text-2xl font-bold text-brand-800">Só mais um passo</h1>
          <p className="text-sm text-slate-500">Precisamos do seu município e telefone para continuar.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>Telefone / WhatsApp</Label>
              <Input required value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(82) 9xxxx-xxxx" />
            </div>
            {erro && <p className="text-sm text-accent-600">{erro}</p>}
            <Button type="submit" className="w-full" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Continuar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
