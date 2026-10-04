/**
 * attribution.ts — R4 第一接觸歸因 cookie `kw_attr`（五站共用契約）
 *
 * - 名稱 kw_attr；值 encodeURIComponent(JSON.stringify(obj))
 * - 只在 hostname 結尾是 kiwimu.com 時「寫入」；讀取則任何環境都可（cookie 不存在時安全回傳空物件）
 * - domain=.kiwimu.com; path=/; max-age=2592000 (30 天); SameSite=Lax; Secure
 * - < 1KB，不得含個資
 *
 * 寫入規則：
 *  - 任何站載入時，網址有 utm_source 且沒有 from → 若 cookie 內尚無 src（或 ts 超過 30 天）才寫入
 *    src/med/cmp/cnt/trm/land/ts（第一接觸，不覆蓋既有的第一接觸資料）。
 *  - 任何站載入時，網址有 from → 覆寫 from、from_ts。
 *  - mbti 欄位只由 kiwimu.com 測驗結果頁覆寫（本檔不在 map 站寫入 mbti，只讀）。
 *
 * 讀取（map 建單時使用 getOrderAttribution）：
 *  - orders.from_mbti_test = Boolean(mbti)
 *  - orders.mbti_type = mbti
 *  - orders.utm_source/utm_medium/utm_campaign/utm_content/utm_term = src/med/cmp/cnt/trm
 *  - cookie 壞掉或缺值時一律當作沒有，不能讓建單失敗（讀取全程 try/catch，最壞情況回傳空值）。
 *
 * v1.1 補：寫入端每個值上限 64 字；from 必須符合 ^[a-z0-9_]+$（格式不符就不寫入該欄位，
 * 不是整個 cookie 寫入失敗）。讀取端（getOrderAttribution）也做同樣的截斷，防禦舊版
 * cookie 或其他站尚未套用這條規則時寫入的超長值。
 */

const COOKIE_NAME = 'kw_attr';
const COOKIE_DOMAIN = '.kiwimu.com';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 天
const FIRST_TOUCH_STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const MAX_ATTR_VALUE_LENGTH = 64;

const MBTI_PATTERN = /^[EI][NS][TF][JP](-[AT])?$/;
const FROM_PATTERN = /^[a-z0-9_]+$/;

/** trim 後截到 64 字；非字串／空字串回傳 undefined（cookie 物件裡就不會留下這個 key）。 */
function capAttrValue(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, MAX_ATTR_VALUE_LENGTH);
  return trimmed || undefined;
}

export interface KwAttr {
  src?: string;
  med?: string;
  cmp?: string;
  cnt?: string;
  trm?: string;
  land?: string;
  ts?: number;
  mbti?: string;
  mbti_ts?: number;
  from?: string;
  from_ts?: number;
}

export interface OrderAttribution {
  from_mbti_test: boolean;
  mbti_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

function isProdKiwimuHost(hostname: string): boolean {
  return hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');
}

function readCookieRaw(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** 讀 kw_attr cookie；壞掉／不存在時一律回傳空物件，不丟例外。 */
export function readKwAttr(): KwAttr {
  const raw = readCookieRaw(COOKIE_NAME);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === 'object' ? (parsed as KwAttr) : {};
  } catch {
    return {};
  }
}

function writeKwAttr(attr: KwAttr): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!isProdKiwimuHost(window.location.hostname)) return;

  try {
    const value = encodeURIComponent(JSON.stringify(attr));
    const parts = [
      `${COOKIE_NAME}=${value}`,
      `domain=${COOKIE_DOMAIN}`,
      'path=/',
      `max-age=${COOKIE_MAX_AGE_SEC}`,
      'SameSite=Lax',
      'Secure',
    ];
    document.cookie = parts.join('; ');
  } catch {
    // cookie 寫入失敗（例如值過長、瀏覽器封鎖）— 靜默略過，不影響主流程
  }
}

/**
 * 頁面載入時呼叫一次：依 R4 規則同步 kw_attr cookie。
 * 只在 *.kiwimu.com 正式網域寫入；其他環境（localhost、預覽網址）不寫入。
 */
export function syncAttributionFromUrl(search?: string): void {
  if (typeof window === 'undefined') return;
  if (!isProdKiwimuHost(window.location.hostname)) return;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search ?? window.location.search);
  } catch {
    return;
  }

  const fromParam = params.get('from');
  const utmSource = params.get('utm_source');
  const now = Date.now();
  const current = readKwAttr();

  // 網址有 from → 覆寫 from / from_ts（優先權高於 utm_source 判斷）。
  // from 必須符合 ^[a-z0-9_]+$，格式不符就不寫入（避免髒資料進 cookie）。
  if (fromParam) {
    const cappedFrom = capAttrValue(fromParam);
    if (cappedFrom && FROM_PATTERN.test(cappedFrom)) {
      writeKwAttr({ ...current, from: cappedFrom, from_ts: now });
    }
    return;
  }

  // 網址有 utm_source 且沒有 from → 只在尚無第一接觸資料，或已超過 30 天時才寫入
  if (utmSource) {
    const isStale = !current.ts || now - current.ts > FIRST_TOUCH_STALE_MS;
    if (!current.src || isStale) {
      writeKwAttr({
        ...current,
        src: capAttrValue(utmSource),
        med: capAttrValue(params.get('utm_medium')),
        cmp: capAttrValue(params.get('utm_campaign')),
        cnt: capAttrValue(params.get('utm_content')),
        trm: capAttrValue(params.get('utm_term')),
        land: capAttrValue(window.location.hostname),
        ts: now,
      });
    }
  }
}

/** GA4 entry_from：cookie 來源的 from 只在 from_ts 距今 < 30 分鐘時採用。 */
export const ENTRY_FROM_WINDOW_MS = 30 * 60 * 1000;

/**
 * 解析 GA4 事件參數 `entry_from`（這一次著陸的站內入口）。唯讀，不寫 cookie。
 * 必須在網址被清理前、用「原始 query」呼叫（index.html 的 inline script 會先把 from 從
 * window.location.search 拔掉，所以呼叫端要傳 window.__MOON_MAP_INITIAL_SEARCH__）。
 *  1. 原始網址有 from → 用它（截 64 字後須符合 ^[a-z0-9_]+$；格式不符回傳 undefined，
 *     且不回退到 cookie —— 這次著陸本來就帶了 from=）。
 *  2. 否則用 kw_attr.from，但只有 from_ts 距今 < 30 分鐘才採用。
 *  3. 否則回傳 undefined（參數省略）。
 * 全程 try/catch，絕不丟例外。
 */
export function resolveEntryFrom(search?: string, now: number = Date.now()): string | undefined {
  try {
    const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
    const urlFrom = capAttrValue(new URLSearchParams(query).get('from'));
    if (urlFrom) return FROM_PATTERN.test(urlFrom) ? urlFrom : undefined;

    const { from, from_ts: fromTs } = readKwAttr();
    if (typeof fromTs !== 'number' || !Number.isFinite(fromTs)) return undefined;
    const age = now - fromTs;
    if (age < 0 || age >= ENTRY_FROM_WINDOW_MS) return undefined;
    const cookieFrom = capAttrValue(from);
    return cookieFrom && FROM_PATTERN.test(cookieFrom) ? cookieFrom : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 建單時呼叫：把 kw_attr cookie 轉成 orders 表要寫入的欄位。
 * 任何解析失敗都回傳「當作沒有」（null / false），絕不丟出例外，不得讓建單失敗。
 */
export function getOrderAttribution(): OrderAttribution {
  try {
    const attr = readKwAttr();
    const cappedMbti = capAttrValue(attr.mbti);
    const mbti = cappedMbti && MBTI_PATTERN.test(cappedMbti) ? cappedMbti : null;

    return {
      from_mbti_test: Boolean(mbti),
      mbti_type: mbti,
      utm_source: capAttrValue(attr.src) || null,
      utm_medium: capAttrValue(attr.med) || null,
      utm_campaign: capAttrValue(attr.cmp) || null,
      utm_content: capAttrValue(attr.cnt) || null,
      utm_term: capAttrValue(attr.trm) || null,
    };
  } catch {
    return {
      from_mbti_test: false,
      mbti_type: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    };
  }
}
