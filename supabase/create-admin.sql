-- ============================================================================
-- Bootstrap do ADMIN (rode só UMA VEZ, depois de rodar o schema.sql)
-- ============================================================================
-- Como usar:
--   1. Cadastre-se normalmente pelo app (tela "Criar conta"), como passageiro,
--      usando o e-mail e a senha que você quer usar como admin.
--   2. Volte aqui no SQL Editor do Supabase, troque 'SEU_EMAIL_AQUI' abaixo
--      pelo e-mail que você usou, e rode só o UPDATE.
-- ============================================================================

update public.profiles
set tipo = 'admin'
where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI');

-- Confira se funcionou:
select id, nome, tipo from public.profiles where tipo = 'admin';
