import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { enviarMensagem, listarMensagens, marcarMensagensLidas } from '../lib/data'
import type { Mensagem } from '../types/database'
import { Button, Input, Spinner } from './ui'

function formatarHoraMensagem(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function Chat({
  reservaId,
  meuId,
  outroId,
  outroNome,
}: {
  reservaId: string
  meuId: string
  outroId: string
  outroNome?: string
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ativo = true
    listarMensagens(reservaId)
      .then((lista) => {
        if (!ativo) return
        setMensagens(lista)
        marcarMensagensLidas(reservaId, meuId)
      })
      .finally(() => ativo && setCarregando(false))

    const canal = supabase
      .channel(`mensagens:${reservaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `reserva_id=eq.${reservaId}` },
        (payload) => {
          const nova = payload.new as Mensagem
          setMensagens((prev) => (prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]))
          if (nova.destinatario_id === meuId) marcarMensagensLidas(reservaId, meuId)
        },
      )
      .subscribe()

    return () => {
      ativo = false
      supabase.removeChannel(canal)
    }
  }, [reservaId, meuId])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  const enviar = async () => {
    const conteudo = texto.trim()
    if (!conteudo) return
    setTexto('')
    setEnviando(true)
    try {
      await enviarMensagem({ reservaId, remetenteId: meuId, destinatarioId: outroId, conteudo })
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <Spinner />

  return (
    <div className="flex flex-col">
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
        {mensagens.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            Nenhuma mensagem ainda. Diga oi para {outroNome ?? 'a outra pessoa'}!
          </p>
        )}
        {mensagens.map((m) => {
          const minha = m.remetente_id === meuId
          return (
            <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-1.5 text-sm ${
                  minha ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <p>{m.conteudo}</p>
                <p className={`mt-0.5 text-[10px] ${minha ? 'text-brand-100' : 'text-slate-400'}`}>
                  {formatarHoraMensagem(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={fimRef} />
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem..."
          disabled={enviando}
        />
        <Button type="submit" disabled={enviando || !texto.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  )
}
