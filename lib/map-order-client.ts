// 菜單頁送單後「下一步怎麼走」與訊息組裝（純函式，scripts/test-map-order-client.mjs 會直接測）。
//
// 2026-10-18 $0 漏洞修正：/api/map-order 改由伺服器依資料庫價格重算金額，
// 菜單頁這邊的規則：
// - 400（伺服器明確拒絕：找不到品項、0 元、飲品、數量不合…）→ 停在結帳視窗顯示原因，
//   不轉 LINE、不發 Discord、不送 GA4。
// - 5xx／網路失敗／其他非 2xx → 維持韌性照常轉 LINE，但金額標成「預估、待門市確認」，
//   Discord 也標示未確認；GA4 purchase 照舊不送（沒有寫進 DB 的訂單不算轉換）。
// - 2xx → LINE、Discord、GA4 一律用伺服器回傳的 total_price 與逐項價格。

export interface CheckoutCartLine {
  name: string;
  spec: string;
  price: string;
  count: number;
}

export interface OrderLine {
  name: string;
  spec: string;
  unitPrice: number;
  quantity: number;
}

export type MapOrderOutcome =
  | { kind: 'confirmed'; orderNumber: string; total: number; lines: OrderLine[]; priceUpdated: boolean }
  | { kind: 'rejected'; message: string }
  | { kind: 'unconfirmed'; orderNumber: string };

export type ForwardableOutcome = Exclude<MapOrderOutcome, { kind: 'rejected' }>;

// 400 的結帳視窗訊息一律以這句收尾：顧客停在視窗裡時，永遠看得到「問題持續就聯繫門市」的出路。
// 只是文字提示，不會自動開 LINE、也不發 Discord／GA4。
export const LINE_CONTACT_HINT = '若問題持續，請直接以 LINE 聯繫門市。';
export const ORDER_REJECTED_FALLBACK_MESSAGE = `這筆訂單目前無法線上送出，請重新整理菜單後再試。${LINE_CONTACT_HINT}`;
export const PRICE_UPDATED_NOTICE = '價格已依最新菜單更新，請以訂單訊息中的金額為準。';

const DEFAULT_SPEC_LABEL = '標準';
const MAX_ERROR_MESSAGE_LENGTH = 200;
// 伺服器的拒單訊息是寫給顧客看的中文；舊的英文技術訊息（Invalid ...）不直接丟給顧客。
const CUSTOMER_READABLE = /[㐀-鿿]/;

/** 與既有購物車算法一致："$1,990" → 1990。 */
export function parseCartUnitPrice(price: string): number {
  return parseInt(String(price).replace(/[^\d]/g, ''), 10) || 0;
}

export function cartToOrderLines(cart: CheckoutCartLine[]): OrderLine[] {
  return cart.map((item) => ({
    name: item.name,
    spec: item.spec,
    unitPrice: parseCartUnitPrice(item.price),
    quantity: item.count,
  }));
}

export function sumOrderLines(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const isPositiveFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** 讀伺服器回傳的 order.items（{ name, variant_name, price, quantity }）；格式不對回傳 null。 */
function readServerLines(items: unknown): OrderLine[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const lines: OrderLine[] = [];
  for (const raw of items) {
    const item = asRecord(raw);
    if (!item || typeof item.name !== 'string' || !item.name) return null;
    if (!isPositiveFinite(item.price)) return null;
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1) return null;
    lines.push({
      name: item.name,
      spec: typeof item.variant_name === 'string' && item.variant_name ? item.variant_name : DEFAULT_SPEC_LABEL,
      unitPrice: item.price,
      quantity: item.quantity,
    });
  }
  return lines;
}

/**
 * 依 /api/map-order 的回應決定下一步。status 為 null 代表網路失敗（fetch 丟錯）。
 */
export function resolveMapOrderOutcome(input: {
  status: number | null;
  body: unknown;
  proposedOrderId: string;
  cart: CheckoutCartLine[];
}): MapOrderOutcome {
  const { status, body, proposedOrderId, cart } = input;
  const record = asRecord(body);

  if (status === 400) {
    const error = typeof record?.error === 'string' ? record.error.trim() : '';
    const readable = error && error.length <= MAX_ERROR_MESSAGE_LENGTH && CUSTOMER_READABLE.test(error);
    // 伺服器訊息（中文、不帶句號）後面固定補上聯繫門市的提示；通用說明本身已包含這句。
    const message = readable ? `${error.replace(/[。.!！\s]+$/, '')}。${LINE_CONTACT_HINT}` : ORDER_REJECTED_FALLBACK_MESSAGE;
    return { kind: 'rejected', message };
  }

  // 401／404／429／5xx／網路失敗：不是顧客訂單內容的問題，維持照常轉 LINE 的韌性做法。
  if (status === null || status < 200 || status >= 300) {
    return { kind: 'unconfirmed', orderNumber: proposedOrderId };
  }

  const order = asRecord(record?.order);
  const orderNumber =
    typeof order?.order_number === 'string' && order.order_number ? order.order_number : proposedOrderId;
  const lines = readServerLines(order?.items);
  const total = order?.total_price;

  // 2xx 但回應裡沒有可信的伺服器金額（API 契約跑掉）：不拿前端金額冒充已確認。
  if (!lines || !isPositiveFinite(total) || sumOrderLines(lines) !== total) {
    return { kind: 'unconfirmed', orderNumber };
  }

  const clientLines = cartToOrderLines(cart);
  const priceUpdated =
    total !== sumOrderLines(clientLines) ||
    lines.length !== clientLines.length ||
    lines.some((line, index) => line.unitPrice !== clientLines[index]?.unitPrice);

  return { kind: 'confirmed', orderNumber, total, lines, priceUpdated };
}

export interface OrderContact {
  customerName: string;
  customerPhone: string;
  pickupDate: string;
  orderNote: string;
}

export function buildLineOrderMessage(
  outcome: ForwardableOutcome,
  contact: OrderContact,
  cart: CheckoutCartLine[]
): string {
  const { customerName, customerPhone, pickupDate, orderNote } = contact;
  const confirmed = outcome.kind === 'confirmed';

  let msg = `【月島甜點訂單確認】\n`;
  msg += `訂單編號：${outcome.orderNumber}\n`;
  msg += `訂購人：${customerName} (${customerPhone})\n`;
  msg += `手機號碼：${customerPhone}\n`;
  if (confirmed) {
    msg += `總金額：$${outcome.total}\n`;
    if (outcome.priceUpdated) msg += `（金額已依最新菜單更新）\n`;
  } else {
    msg += `預估金額：$${sumOrderLines(cartToOrderLines(cart))}（系統暫時無法確認，待門市確認）\n`;
  }
  msg += `取貨日期：${pickupDate}\n`;
  if (orderNote) msg += `備註：${orderNote}\n`;
  msg += `\n訂購內容：\n`;
  if (confirmed) {
    outcome.lines.forEach((line) => {
      msg += `● ${line.name} | ${line.spec} x ${line.quantity}（單價 $${line.unitPrice}）\n`;
    });
  } else {
    cart.forEach((item) => {
      msg += `● ${item.name} | ${item.spec} x ${item.count}\n`;
    });
  }
  msg += `\n\n付款方式：\n`;
  msg += `LINE Bank (824) 連線商業銀行\n`;
  msg += `帳號：111007479473\n`;
  msg += `備註欄請填寫：${customerName}\n`;
  msg += `（方便我們快速對單，謝謝！）\n`;
  if (!confirmed) msg += `※ 金額待門市確認，請等門市回覆金額後再轉帳。\n`;
  msg += `\n付款完成後請回傳「後五碼」\n`;
  msg += `   （轉帳通知中的後五碼數字）`;
  return msg;
}

export function buildDiscordOrderPayload(
  outcome: ForwardableOutcome,
  contact: OrderContact,
  cart: CheckoutCartLine[]
) {
  const confirmed = outcome.kind === 'confirmed';
  return {
    orderId: outcome.orderNumber,
    totalAmount: confirmed ? outcome.total : sumOrderLines(cartToOrderLines(cart)),
    amountConfirmed: confirmed,
    pickupDate: contact.pickupDate,
    customerName: contact.customerName,
    customerPhone: contact.customerPhone,
    orderNote: contact.orderNote,
    items: confirmed
      ? outcome.lines.map((line) => ({ name: line.name, spec: line.spec, count: line.quantity, price: line.unitPrice }))
      : cart.map((item) => ({ name: item.name, spec: item.spec, count: item.count })),
    source: 'moon_map_menu',
  };
}

export function buildGaPurchasePayload(outcome: Extract<MapOrderOutcome, { kind: 'confirmed' }>) {
  return {
    transaction_id: outcome.orderNumber,
    value: outcome.total,
    currency: 'TWD',
    items: outcome.lines.map((line) => ({
      item_name: line.name,
      item_variant: line.spec,
      price: line.unitPrice,
      quantity: line.quantity,
    })),
  };
}
