/**
 * eventTracker.ts — Supabase user_events 寫入工具
 * fire-and-forget，失敗只 log，不影響主流程
 */
import { supabase } from './supabase';

export function trackUserEvent(
  eventType: string,
  metadata: Record<string, unknown> = {}
): void {
  if (!supabase) return;
  supabase
    .rpc('insert_user_event', {
      p_event_type: eventType,
      p_site: 'map',
      p_metadata: metadata,
    })
    .then(({ error }) => {
      if (error) console.warn('[eventTracker] insert failed:', error.message);
    });
}
