import { createClient } from '@supabase/supabase-js';

const isConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key);
};

export const isSupabaseConfigured = isConfigured;

const client = isConfigured()
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : createClient('https://placeholder.supabase.co', 'placeholder');

export const supabase = client;
