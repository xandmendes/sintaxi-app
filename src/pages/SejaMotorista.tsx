import { Link } from 'react-router-dom'
import { ADMIN_WHATSAPP } from '../lib/config'
import { linkWhatsApp } from '../lib/format'
import { Button, Card } from '../components/ui'

export function SejaMotorista() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-accent-600" />
        <h1 className="text-2xl font-bold text-brand-800">Quer rodar com a gente?</h1>
        <p className="mt-2 text-sm text-slate-600">
          O cadastro de motorista não é feito pelo app — fale direto com a administração pelo WhatsApp para
          combinar sua entrada na linha.
        </p>

        <Card className="mt-6">
          <a
            href={linkWhatsApp(ADMIN_WHATSAPP, 'Olá! Tenho interesse em ser motorista no SINTAXI.')}
            target="_blank"
            rel="noreferrer"
          >
            <Button className="w-full">Chamar no WhatsApp</Button>
          </a>
        </Card>

        <p className="mt-6 text-sm text-slate-500">
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
