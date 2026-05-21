'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const trackPageView = async () => {
      try {
        await supabase.from('page_views').insert({
          path: pathname,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        });
      } catch {
        // Silent failure — analytics are non-critical
      }
    };

    trackPageView();
  }, [pathname]);

  return null;
}
