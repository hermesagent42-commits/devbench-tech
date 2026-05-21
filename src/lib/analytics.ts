import { supabase } from './supabase';
export async function trackPageView(path: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return; // silent no-op if not configured
  try {
    await supabase.from('page_views').insert({
      path,
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      referrer: typeof window !== 'undefined' ? document.referrer : '',
      timestamp: new Date().toISOString(),
    });
  } catch { /* fail silently */ }
}
