import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { alternarHorarioAtivo, criarHorario, listarMeusHorarios, removerHorario } from '../../lib/data'
import { DIAS_SEMANA_LABEL, type Horario } from '../../types/database'
import { formatarHora } from '../../lib/format'
import { Badge, Button, Card, EmptyState, Input, Label, Spinner } from '../../components/ui'

const DIAS = [0, 1, 2, 3, 4, 5, 6]

export function HorariosTab() {
  const { motorista } = useAuth()
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  const carregar = async () => {
    if (!motorista) return
    setCarregando(true)
    try {
      setHorarios(await listarMeusHorarios(motorista.id))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorista?.id])

  if (!motorista) return null

  return (
    <div className="space-y-4">
      <Card className="bg-brand-50">
        <p className="text-sm text-brand-800">
          Seu veículo comporta <strong>{motorista.capacidade_passageiros}</strong> passageiro(s)
          {motorista.veiculo_modelo ? ` · ${motorista.veiculo_modelo}` : ''}.
        </p>
      </Card>

      {carregando ? (
        <Spinner />
      ) : horarios.length === 0 && !mostrarForm ? (
        <EmptyState title="Você ainda não cadastrou horários" description="Cadastre os dias e horários que você roda a linha." />
      ) : (
        <div className="space-y-3">
          {horarios.map((h) => (
            <HorarioItem key={h.id} horario={h} onMudou={carregar} />
          ))}
        </div>
      )}

      {mostrarForm ? (
        <NovoHorarioForm
          motoristaId={motorista.id}
          onCriado={() => {
            setMostrarForm(false)
            carregar()
          }}
          onCancelar={() => setMostrarForm(false)}
        />
      ) : (
        <Button onClick={() => setMostrarForm(true)}>+ Novo horário</Button>
      )}
    </div>
  )
}

function HorarioItem({ horario, onMudou }: { horario: Horario; onMudou: () => void }) {
  const [processando, setProcessando] = useState(false)

  const alternar = async () => {
    setProcessando(true)
    try {
      await alternarHorarioAtivo(horario.id, !horario.ativo)
      onMudou()
    } finally {
      setProcessando(false)
    }
  }

  const remover = async () => {
    setProcessando(true)
    try {
      await removerHorario(horario.id)
      onMudou()
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex flex-wrap gap-1">
            {DIAS.map((d) => (
              <span
                key={d}
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                  horario.dias_semana.includes(d) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {DIAS_SEMANA_LABEL[d]}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-700">
            Ida {formatarHora(horario.hora_ida)} · Volta {formatarHora(horario.hora_volta)}
          </p>
        </div>
        <Badge color={horario.ativo ? 'green' : 'gray'}>{horario.ativo ? 'Ativo' : 'Pausado'}</Badge>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={alternar} disabled={processando}>
          {horario.ativo ? 'Pausar' : 'Reativar'}
        </Button>
        <Button variant="danger" onClick={remover} disabled={processando}>
          Remover
        </Button>
      </div>
    </Card>
  )
}

function NovoHorarioForm({
  motoristaId,
  onCriado,
  onCancelar,
}: {
  motoristaId: string
  onCriado: () => void
  onCancelar: () => void
}) {
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5])
  const [horaIda, setHoraIda] = useState('05:00')
  const [horaVolta, setHoraVolta] = useState('08:00')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const toggleDia = (d: number) => {
    setDiasSelecionados((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  const salvar = async () => {
    if (diasSelecionados.length === 0) {
      setErro('Selecione pelo menos um dia da semana.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await criarHorario({ motoristaId, diasSemana: diasSelecionados, horaIda, horaVolta })
      onCriado()
    } catch {
      setErro('Não foi possível salvar o horário.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <Label>Dias da semana</Label>
      <div className="mb-3 flex flex-wrap gap-2">
        {DIAS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggleDia(d)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              diasSelecionados.includes(d) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'
            }`}
          >
            {DIAS_SEMANA_LABEL[d]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Horário de ida (rumo a Maceió)</Label>
          <Input type="time" value={horaIda} onChange={(e) => setHoraIda(e.target.value)} />
        </div>
        <div>
          <Label>Horário de volta (de Maceió)</Label>
          <Input type="time" value={horaVolta} onChange={(e) => setHoraVolta(e.target.value)} />
        </div>
      </div>

      {erro && <p className="mt-2 text-sm text-accent-600">{erro}</p>}

      <div className="mt-4 flex gap-2">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar horário'}
        </Button>
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}
