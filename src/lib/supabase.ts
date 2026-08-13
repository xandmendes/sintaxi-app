import { createClient } from '@supabase/supabase-js'

// Observação: não tipamos o client com um `Database` genérico gerado à mão —
// a checagem estrutural que o supabase-js 2.x exige para esse genérico é bem
// rígida (precisa bater exatamente com o formato do `supabase gen types`) e
// preferimos manter nossas próprias interfaces em `src/types/database.ts`
// tipando o retorno de cada função em `src/lib/data.ts`, em vez de arriscar
// tudo virar `never` silenciosamente por um pequeno desalinho de formato.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[SINTAXI] Supabase não configurado. Crie um arquivo .env com VITE_SUPABASE_URL e ' +
      'VITE_SUPABASE_ANON_KEY (veja o README).',
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
)
