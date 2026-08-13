import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  cadastrarMotoristaComoAdmin,
  criarDonoLinha,
  listarDonosLinha,
  listarMunicipios,
  uploadFotoMotorista,
  atualizarFotosMotorista,
} from '../../lib/data'
import type { DonoLinha, Municipio } from '../../types/database'
import { Button, Card, Input, Label, Select } from '../../components/ui'

function gerarSenhaTemporaria() {
  return Math.random().toString(36).slice(-8)
}

export function CadastrarMotoristaForm({ onCriado }: { onCriado: () => void }) {
  const { profile } = useAuth()
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [donos, setDonos] = useState<DonoLinha[]>([])
  const [municipioId, setMunicipioId] = useState('')

  const [donoModo, setDonoModo] = useState<'existente' | 'novo' | 'proprio'>('proprio')
  const [donoSelecionadoId, setDonoSelecionadoId] = useState('')
  const [donoNome, setDonoNome] = useState('')
  const [donoTelefone, setDonoTelefone] = useState('')

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState(gerarSenhaTemporaria())

  const [veiculoModelo, setVeiculoModelo] = useState('')
  const [veiculoPlaca, setVeiculoPlaca] = useState('')
  const [capacidade, setCapacidade] = useState('4')

  const [fotoRosto, setFotoRosto] = useState<File | null>(null)
  const [fotoVeiculo, setFotoVeiculo] = useState<File | null>(null)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<{ email: string; senha: string } | null>(null)

  useEffect(() => {
    Promise.all([listarMunicipios(), listarDonosLinha()]).then(([m, d]) => {
      setMunicipios(m)
      setDonos(d)
      const laje = m.find((x) => x.nome === 'São José da Laje')
      setMunicipioId(laje?.id ?? m[0]?.id ?? '')
    })
  }, [])

  const donosDoMunicipio = donos.filter((d) => d.municipio_id === municipioId)

  const salvar = async () => {
    if (!profile) return
    setErro(null)

    if (donoModo === 'existente' && !donoSelecionadoId) {
      setErro('Selecione o dono da linha.')
      return
    }
    if ((donoModo === 'novo' || donoModo === 'proprio') && !(donoModo === 'proprio' ? nome : donoNome)) {
      setErro('Informe o nome do dono da linha.')
      return
    }

    setSalvando(true)
    try {
      let donoLinhaId = donoSelecionadoId
      if (donoModo === 'novo') {
        const dono = await criarDonoLinha({ municipioId, nome: donoNome, telefone: donoTelefone, criadoPor: profile.id })
        donoLinhaId = dono.id
      } else if (donoModo === 'proprio') {
        const dono = await criarDonoLinha({ municipioId, nome, telefone, criadoPor: profile.id })
        donoLinhaId = dono.id
      }

      const { motoristaId } = await cadastrarMotoristaComoAdmin({
        email,
        senha,
        nome,
        telefone,
        municipioId,
        donoLinhaId,
        veiculoModelo,
        veiculoPlaca,
        capacidadePassageiros: Number(capacidade),
        adminId: profile.id,
      })

      const patch: { foto_rosto_url?: string; foto_veiculo_url?: string } = {}
      if (fotoRosto) patch.foto_rosto_url = await uploadFotoMotorista(motoristaId, 'rosto', fotoRosto)
      if (fotoVeiculo) patch.foto_veiculo_url = await uploadFotoMotorista(motoristaId, 'veiculo', fotoVeiculo)
      if (Object.keys(patch).length > 0) await atualizarFotosMotorista(motoristaId, patch)

      setSucesso({ email, senha })
      onCriado()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível cadastrar o motorista.')
    } finally {
      setSalvando(false)
    }
  }

  if (sucesso) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <p className="font-semibold text-emerald-800">Motorista cadastrado!</p>
        <p className="mt-1 text-sm text-emerald-700">
          Repasse esse acesso a ele (pelo WhatsApp, por exemplo) — ele pode trocar a senha depois de entrar:
        </p>
        <p className="mt-2 rounded bg-white p-2 font-mono text-sm text-slate-700">
          {sucesso.email} · {sucesso.senha}
        </p>
        <Button
          className="mt-3"
          onClick={() => {
            setSucesso(null)
            setNome('')
            setTelefone('')
            setEmail('')
            setSenha(gerarSenhaTemporaria())
            setVeiculoModelo('')
            setVeiculoPlaca('')
            setFotoRosto(null)
            setFotoVeiculo(null)
          }}
        >
          Cadastrar outro motorista
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <Label>Município da linha</Label>
          <Select
            value={municipioId}
            onChange={(e) => {
              setMunicipioId(e.target.value)
              setDonoSelecionadoId('')
            }}
          >
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Dono da linha/praça</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDonoModo('proprio')}
              className={`rounded-lg border px-2 py-2 text-xs font-medium ${donoModo === 'proprio' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'}`}
            >
              É o próprio motorista
            </button>
            <button
              type="button"
              onClick={() => setDonoModo('existente')}
              className={`rounded-lg border px-2 py-2 text-xs font-medium ${donoModo === 'existente' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'}`}
            >
              Já cadastrado
            </button>
            <button
              type="button"
              onClick={() => setDonoModo('novo')}
              className={`rounded-lg border px-2 py-2 text-xs font-medium ${donoModo === 'novo' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'}`}
            >
              Novo dono
            </button>
          </div>

          {donoModo === 'existente' && (
            <Select className="mt-2" value={donoSelecionadoId} onChange={(e) => setDonoSelecionadoId(e.target.value)}>
              <option value="">Selecione...</option>
              {donosDoMunicipio.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          )}

          {donoModo === 'novo' && (
            <div className="mt-2 space-y-2">
              <Input placeholder="Nome do dono" value={donoNome} onChange={(e) => setDonoNome(e.target.value)} />
              <Input placeholder="Telefone do dono" value={donoTelefone} onChange={(e) => setDonoTelefone(e.target.value)} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <Label>Nome do motorista</Label>
          <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label>Telefone / WhatsApp</Label>
          <Input required value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Foto do rosto</Label>
            <input type="file" accept="image/*" onChange={(e) => setFotoRosto(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>
          <div>
            <Label>Foto do veículo</Label>
            <input type="file" accept="image/*" onChange={(e) => setFotoVeiculo(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Modelo do veículo</Label>
            <Input value={veiculoModelo} onChange={(e) => setVeiculoModelo(e.target.value)} placeholder="Ex: Fiat Doblô" />
          </div>
          <div>
            <Label>Placa</Label>
            <Input value={veiculoPlaca} onChange={(e) => setVeiculoPlaca(e.target.value)} placeholder="ABC-1D23" />
          </div>
        </div>
        <div>
          <Label>Capacidade de passageiros</Label>
          <Input type="number" min={1} required value={capacidade} onChange={(e) => setCapacidade(e.target.value)} />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <Label>Login do motorista (e-mail)</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Senha inicial (repasse ao motorista)</Label>
          <Input required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>

        {erro && <p className="text-sm text-accent-600">{erro}</p>}

        <Button onClick={salvar} disabled={salvando} className="w-full">
          {salvando ? 'Cadastrando...' : 'Cadastrar motorista'}
        </Button>
      </div>
    </Card>
  )
}
