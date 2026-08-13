import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  buscarHorariosDisponiveis,
  criarDisponibilidade,
  criarReservaEncomenda,
  criarReservaViagem,
  type HorarioComVagas,
} from '../../lib/data'
import { formatarHora, hojeISO } from '../../lib/format'
import type { Direcao, Municipio, TipoReserva } from '../../types/database'
import { Badge, Button, Card, EmptyState, Input, Label, Select, Spinner } from '../../components/ui'

export function BuscarTab({
  municipios,
  municipioId,
  onMunicipioChange,
}: {
  municipios: Municipio[]
  municipioId: string
  onMunicipioChange: (id: string) => void
}) {
  const { profile } = useAuth()
  const [direcao, setDirecao] = useState<Direcao>('ida')
  const [data, setData] = useState(hojeISO())
  const [tipo, setTipo] = useState<TipoReserva>('viagem')
  const [horarios, setHorarios] = useState<HorarioComVagas[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [horarioAberto, setHorarioAberto] = useState<string | null>(null)
  const [mostrarListaEspera, setMostrarListaEspera] = useState(false)

  const municipio = municipios.find((m) => m.id === municipioId)

  const carregar = async () => {
    if (!municipioId) return
    setCarregando(true)
    setErro(null)
    try {
      const resultado = await buscarHorariosDisponiveis(municipioId, direcao, data)
      setHorarios(resultado)
    } catch {
      setErro('Não foi possível carregar os horários agora.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    setHorarioAberto(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipioId, direcao, data])

  const temVagas = horarios.some((h) => h.vagasLivres > 0)

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Município</Label>
            <Select value={municipioId} onChange={(e) => onMunicipioChange(e.target.value)}>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={data} min={hojeISO()} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <div className="mt-3">
          <Label>Direção</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirecao('ida')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                direcao === 'ida' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'
              }`}
            >
              {municipio?.nome ?? '...'} → Maceió
            </button>
            <button
              onClick={() => setDirecao('volta')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                direcao === 'volta' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'
              }`}
            >
              Maceió → {municipio?.nome ?? '...'}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <Label>O que você quer agendar?</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTipo('viagem')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                tipo === 'viagem' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'
              }`}
            >
              Viagem
            </button>
            <button
              onClick={() => setTipo('encomenda')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                tipo === 'encomenda' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'
              }`}
            >
              Encomenda
            </button>
          </div>
        </div>
      </Card>

      {carregando && <Spinner />}
      {erro && <p className="text-sm text-accent-600">{erro}</p>}

      {!carregando && !erro && horarios.length === 0 && (
        <EmptyState
          title="Nenhum motorista roda essa linha nesse dia"
          description="Tente outra data ou verifique se o município está correto."
        />
      )}

      {!carregando &&
        horarios.map((h) => (
          <HorarioCard
            key={h.horario.id}
            item={h}
            direcao={direcao}
            tipo={tipo}
            data={data}
            aberto={horarioAberto === h.horario.id}
            onToggle={() => setHorarioAberto(horarioAberto === h.horario.id ? null : h.horario.id)}
            onConcluido={() => {
              setHorarioAberto(null)
              carregar()
            }}
          />
        ))}

      {!carregando && horarios.length > 0 && !temVagas && (
        <Card className="border-accent-200 bg-accent-50">
          <p className="text-sm text-accent-700">
            Nenhum motorista tem vaga livre para essa data/direção agora.
          </p>
          <Button className="mt-2" variant="danger" onClick={() => setMostrarListaEspera(true)}>
            Avisar quando abrir uma vaga
          </Button>
        </Card>
      )}

      {!carregando && (mostrarListaEspera || horarios.length === 0) && municipioId && profile && tipo === 'viagem' && (
        <ListaEsperaForm
          municipioId={municipioId}
          direcao={direcao}
          data={data}
          passageiroId={profile.id}
          onCriado={() => setMostrarListaEspera(false)}
        />
      )}
    </div>
  )
}

function HorarioCard({
  item,
  direcao,
  tipo,
  data,
  aberto,
  onToggle,
  onConcluido,
}: {
  item: HorarioComVagas
  direcao: Direcao
  tipo: TipoReserva
  data: string
  aberto: boolean
  onToggle: () => void
  onConcluido: () => void
}) {
  const hora = direcao === 'ida' ? item.horario.hora_ida : item.horario.hora_volta
  const semVaga = item.vagasLivres <= 0 && tipo === 'viagem'

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-slate-900">{formatarHora(hora)}</p>
          <p className="text-sm text-slate-500">
            {item.motoristaProfile?.nome} · {item.motorista.veiculo_modelo || 'Veículo não informado'}
          </p>
        </div>
        <Badge color={semVaga ? 'accent' : 'green'}>
          {semVaga ? 'Sem vagas' : `${item.vagasLivres} vaga${item.vagasLivres === 1 ? '' : 's'}`}
        </Badge>
      </div>

      <div className="mt-3">
        <Button variant={aberto ? 'secondary' : 'primary'} disabled={semVaga} onClick={onToggle}>
          {semVaga ? 'Sem vagas' : aberto ? 'Fechar' : tipo === 'viagem' ? 'Agendar viagem' : 'Agendar encomenda'}
        </Button>
      </div>

      {aberto && !semVaga && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {tipo === 'viagem' ? (
            <FormularioViagem
              horarioId={item.horario.id}
              direcao={direcao}
              data={data}
              vagasLivres={item.vagasLivres}
              onConcluido={onConcluido}
            />
          ) : (
            <FormularioEncomenda horarioId={item.horario.id} direcao={direcao} data={data} onConcluido={onConcluido} />
          )}
        </div>
      )}
    </Card>
  )
}

function FormularioViagem({
  horarioId,
  direcao,
  data,
  vagasLivres,
  onConcluido,
}: {
  horarioId: string
  direcao: Direcao
  data: string
  vagasLivres: number
  onConcluido: () => void
}) {
  const { profile } = useAuth()
  const [quantidade, setQuantidade] = useState('1')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const confirmar = async () => {
    if (!profile) return
    setSalvando(true)
    setErro(null)
    try {
      await criarReservaViagem({
        passageiroId: profile.id,
        horarioId,
        data,
        direcao,
        quantidadePassageiros: Number(quantidade),
      })
      onConcluido()
    } catch {
      setErro('Não foi possível concluir o agendamento. Talvez as vagas tenham acabado.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Quantidade de passageiros</Label>
        <Input
          type="number"
          min={1}
          max={vagasLivres}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </div>
      {erro && <p className="text-sm text-accent-600">{erro}</p>}
      <Button onClick={confirmar} disabled={salvando}>
        {salvando ? 'Confirmando...' : 'Confirmar viagem'}
      </Button>
    </div>
  )
}

function FormularioEncomenda({
  horarioId,
  direcao,
  data,
  onConcluido,
}: {
  horarioId: string
  direcao: Direcao
  data: string
  onConcluido: () => void
}) {
  const { profile } = useAuth()
  const [descricao, setDescricao] = useState('')
  const [localRetirada, setLocalRetirada] = useState('')
  const [localEntrega, setLocalEntrega] = useState('')
  const [nomeContato, setNomeContato] = useState('')
  const [telefoneContato, setTelefoneContato] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const confirmar = async () => {
    if (!profile) return
    setSalvando(true)
    setErro(null)
    try {
      await criarReservaEncomenda({
        passageiroId: profile.id,
        horarioId,
        data,
        direcao,
        descricao,
        localRetirada,
        localEntrega,
        nomeContato,
        telefoneContato,
      })
      onConcluido()
    } catch {
      setErro('Não foi possível concluir o agendamento da encomenda.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>O que é a encomenda?</Label>
        <Input required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: caixa de documentos" />
      </div>
      <div>
        <Label>Local de retirada</Label>
        <Input required value={localRetirada} onChange={(e) => setLocalRetirada(e.target.value)} />
      </div>
      <div>
        <Label>Local de entrega</Label>
        <Input required value={localEntrega} onChange={(e) => setLocalEntrega(e.target.value)} />
      </div>
      <div>
        <Label>Nome de quem vai receber</Label>
        <Input required value={nomeContato} onChange={(e) => setNomeContato(e.target.value)} />
      </div>
      <div>
        <Label>Telefone de contato</Label>
        <Input required value={telefoneContato} onChange={(e) => setTelefoneContato(e.target.value)} />
      </div>
      {erro && <p className="text-sm text-accent-600">{erro}</p>}
      <Button onClick={confirmar} disabled={salvando || !descricao || !localRetirada || !localEntrega}>
        {salvando ? 'Confirmando...' : 'Confirmar encomenda'}
      </Button>
    </div>
  )
}

function ListaEsperaForm({
  municipioId,
  direcao,
  data,
  passageiroId,
  onCriado,
}: {
  municipioId: string
  direcao: Direcao
  data: string
  passageiroId: string
  onCriado: () => void
}) {
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim] = useState('12:00')
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const confirmar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      await criarDisponibilidade({ passageiroId, municipioId, direcao, data, horaInicio, horaFim })
      setSucesso(true)
      onCriado()
    } catch {
      setErro('Não foi possível registrar sua disponibilidade.')
    } finally {
      setSalvando(false)
    }
  }

  if (sucesso) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <p className="text-sm text-emerald-700">
          Você entrou na lista de espera. Assim que um motorista tiver vaga nesse período, você será avisado na aba
          Avisos.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <p className="mb-3 text-sm font-medium text-slate-700">Estou disponível para viajar entre:</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>A partir de</Label>
          <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
        </div>
        <div>
          <Label>Até</Label>
          <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
        </div>
      </div>
      {erro && <p className="mt-2 text-sm text-accent-600">{erro}</p>}
      <Button className="mt-3" onClick={confirmar} disabled={salvando}>
        {salvando ? 'Salvando...' : 'Entrar na lista de espera'}
      </Button>
    </Card>
  )
}
