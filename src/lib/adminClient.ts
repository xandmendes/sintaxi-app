import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Cria um cliente Supabase "descartável", com sessão isolada (não persiste em
 * localStorage e não mexe na sessão do admin logado na aba).
 *
 * Por quê: criar a conta de login de um novo motorista exige chamar
 * `auth.signUp`, que é uma operação pública (não precisa de chave de admin) —
 * mas se usássemos o client principal, isso trocaria a sessão ativa da aba
 * pela do motorista recém-criado, derrubando o admin. Este client separado
 * resolve isso sem precisar de service_role key (que nunca deve ir pro
 * navegador).
 */
export function criarClienteDescartavel() {
  return createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseAnonKey ?? 'placeholder-anon-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
