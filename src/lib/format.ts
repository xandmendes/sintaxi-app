import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatarData(data: string) {
  return format(parseISO(data), "EEEE, dd/MM/yyyy", { locale: ptBR })
}

export function formatarDataCurta(data: string) {
  return format(parseISO(data), 'dd/MM/yyyy')
}

export function formatarHora(hora: string) {
  // hora vem do banco como "HH:MM:SS"
  return hora.slice(0, 5)
}

export function diaDaSemana(data: string): number {
  // 0 = domingo ... 6 = sábado, sem depender de timezone do navegador
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getDay()
}

export function linkWhatsApp(telefone: string, mensagem?: string): string {
  const digitos = telefone.replace(/\D/g, '')
  const comDDI = digitos.startsWith('55') ? digitos : `55${digitos}`
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''
  return `https://wa.me/${comDDI}${texto}`
}

export function hojeISO(): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
