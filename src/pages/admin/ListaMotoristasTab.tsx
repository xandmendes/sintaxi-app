import { useEffect, useState } from 'react'
import { alternarMotoristaAtivo, listarTodosMotoristas, type MotoristaDetalhado } from '../../lib/data'
import { Badge, Button, Card, EmptyState, Spinner } from '../../components/ui'

export function ListaMotoristasTab() {
  const [motoristas, setMotoristas] = useState<MotoristaDetalhado[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = async () => {
    setCarregando(true)
    try {
      setMotoristas(await listarTodosMotoristas())
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const alternar = async (id: string, ativo: boolean) => {
    await alternarMotoristaAtivo(id, !ativo)
    carregar()
  }

  if (carregando) return <Spinner />
  if (motoristas.length === 0) return <EmptyState title="Nenhum motorista cadastrado ainda" />

  return (
    <div className="space-y-3">
      {motoristas.map(({ motorista, profile, donoLinha }) => (
        <Card key={motorista.id}>
          <div className="flex items-start gap-3">
            {motorista.foto_rosto_url && (
              <img src={motorista.foto_rosto_url} alt={profile?.nome} className="h-14 w-14 rounded-full object-cover" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{profile?.nome}</p>
                <Badge color={motorista.ativo ? 'green' : 'gray'}>{motorista.ativo ? 'Ativo' : 'Pausado'}</Badge>
              </div>
              <p className="text-sm text-slate-500">{profile?.telefone}</p>
              <p className="text-sm text-slate-500">
                {motorista.veiculo_modelo} {motorista.veiculo_placa ? `· ${motorista.veiculo_placa}` : ''} ·{' '}
                {motorista.capacidade_passageiros} lugares
              </p>
              <p className="text-sm text-slate-500">Dono da linha: {donoLinha?.nome}</p>
            </div>
            {motorista.foto_veiculo_url && (
              <img src={motorista.foto_veiculo_url} alt="Veículo" className="h-14 w-20 rounded-lg object-cover" />
            )}
          </div>
          <Button variant="secondary" className="mt-3" onClick={() => alternar(motorista.id, motorista.ativo)}>
            {motorista.ativo ? 'Pausar' : 'Reativar'}
          </Button>
        </Card>
      ))}
    </div>
  )
}
