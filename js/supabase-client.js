// ============================================================================
//  Tilisarao Libre - conexion con Supabase
//  Pega aqui tus datos de: Supabase > Settings > API
//  (Project URL y anon public key). La anon key es PUBLICA y segura:
//  el acceso real lo controlan las políticas RLS de sql/schema.sql
// ============================================================================

export const SUPABASE_URL = 'PEGA_TU_PROJECT_URL';        // https://xxxxxxxx.supabase.co
export const SUPABASE_ANON_KEY = 'PEGA_TU_ANON_KEY';      // eyJhbGciOi...

export const isConfigured =
  SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 40;

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const sb = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export function checkConfig() {
  if (isConfigured) return true;
  console.warn('[Tilisarao] Supabase sin configurar: edita js/supabase-client.js');
  return false;
}
