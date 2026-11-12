// 菜單品項「開賣日／截止日」判斷。純函式，不依賴 node 或瀏覽器 API，api/ 與前端共用。
export type AvailabilityState = 'active' | 'upcoming' | 'ended';

export interface AvailabilityWindow {
  available_from?: string | null;
  available_until?: string | null;
}

// 空字串、null、無法解析的值一律視為「沒有設定」。
const parseWindowMs = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

export function getAvailabilityState(row: AvailabilityWindow, nowMs: number): AvailabilityState {
  const fromMs = parseWindowMs(row.available_from);
  if (fromMs !== null && nowMs < fromMs) return 'upcoming';
  const untilMs = parseWindowMs(row.available_until);
  if (untilMs !== null && nowMs > untilMs) return 'ended';
  return 'active';
}

// 任一端點有設定，就視為季節（限期）品項。
export function isSeasonalWindow(row: AvailabilityWindow): boolean {
  return parseWindowMs(row.available_from) !== null || parseWindowMs(row.available_until) !== null;
}
