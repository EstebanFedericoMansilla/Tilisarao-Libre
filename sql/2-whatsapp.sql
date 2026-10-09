-- ============================================================================
--  Tilisarao Libre - WhatsApp del vendedor
--  Pegar en: Supabase > SQL Editor > Run   (se puede correr mas de una vez)
-- ============================================================================

alter table public.products
  add column if not exists phone text not null default '';

comment on column public.products.phone is
  'WhatsApp del vendedor (solo digitos, con codigo de area. Ej: 2664123456)';

-- ---------------------------------------------------------------------------
--  Cargar tu propio WhatsApp en las publicaciones que ya existen:
--  (cambia 2664000000 por tu numero)
--
--  update public.products
--    set phone = '2664000000'
--    where phone = '' and nick = 'tilisarao';
-- ---------------------------------------------------------------------------
