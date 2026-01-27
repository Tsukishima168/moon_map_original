## 前端程式碼更新指南

由於自動更新失敗，請手動更新 `index.tsx` 中的 `confirmAndSend` 函數。

### 找到這個函數（約在第 321 行）

```typescript
const confirmAndSend = () => {
```

### 替換整個函數為以下內容：

```typescript
const confirmAndSend = async () => {
  // 1. Validation
  if (!customerName || customerName.length < 2) {
    alert('請填寫完整姓名 (至少 2 個字)');
    return;
  }
  const phoneRegex = /^09\\d{8}$/;
  if (!customerPhone || !phoneRegex.test(customerPhone)) {
    alert('請填寫有效的手機號碼 (09開頭共10碼)');
    return;
  }
  if (!pickupDate) {
    alert('請選擇取貨日期');
    return;
  }

  // 2. Generate Order ID
  const now = new Date();
  const datePart = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const orderId = `ORD${datePart}${randPart}`;
  const totalAmount = calculateTotal();

  // 3. Get tracking data
  const gaClientId = getGAClientId();
  const utmParams = getUTMParams();

  try {
    // 4. Save to Supabase (shop_orders)
    const { data: order, error: orderError } = await supabase
      .from('shop_orders')
      .insert({
        order_number: orderId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: user?.email || null,
        total_amount: totalAmount,
        pickup_date: pickupDate,
        order_note: orderNote || null,
        user_id: user?.id || null,
        payment_status: 'pending',
        source: 'website',
        ga_client_id: gaClientId,
        referrer: utmParams.referrer,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_content: utmParams.utm_content,
        utm_term: utmParams.utm_term
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order error:', orderError);
      alert('訂單建立失敗，請稍後再試');
      return;
    }

    // 5. Save order items (shop_order_items)
    const orderItems = cart.map(item => ({
      order_id: order.id,
      item_name: item.name,
      item_spec: item.spec,
      unit_price: parseInt(item.price.replace(/[^\\d]/g, ''), 10),
      quantity: item.count,
      subtotal: parseInt(item.price.replace(/[^\\d]/g, ''), 10) * item.count
    }));

    await supabase.from('shop_order_items').insert(orderItems);

    // 6. GA4 purchase event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'purchase', {
        transaction_id: orderId,
        value: totalAmount,
        currency: 'TWD',
        items: cart.map(item => ({
          item_name: item.name,
          item_variant: item.spec,
          price: parseInt(item.price.replace(/[^\\d]/g, ''), 10),
          quantity: item.count
        }))
      });
    }

    // 7. Build LINE message
    let msg = `【月島甜點匯款回報】\\n`;
    msg += `訂單編號：${orderId}\\n`;
    msg += `訂購人：${customerName} (${customerPhone})\\n`;
    msg += `總金額：$${totalAmount}\\n`;
    msg += `取貨日期：${pickupDate}\\n`;
    msg += `轉帳後五碼：_________\\n`;
    msg += `\\n----------------\\n訂購內容：\\n`;
    cart.forEach(item => {
      msg += `● ${item.name} | ${item.spec} x ${item.count}\\n`;
    });
    if (orderNote) msg += `備註：${orderNote}`;

    // 8. Redirect to LINE
    const encodedMsg = encodeURIComponent(msg);
    const lineUrl = `https://line.me/R/oaMessage/@931cxefd/?text=${encodedMsg}`;
    const liff = (window as any).liff;

    if (liffReady && isLiff) {
      window.location.href = lineUrl;
    } else {
      window.open(lineUrl, '_blank');
    }

    setShowCheckoutConfirm(false);
    clearCart();
    alert(`✅ 訂單 ${orderId} 已建立！\\n請在 LINE 傳送訊息並完成轉帳。`);

  } catch (error) {
    console.error('Checkout error:', error);
    alert('發生錯誤，請稍後再試');
  }
};
```

### 關鍵修改點：
1. 函數改為 `async`
2. 使用 `shop_orders` 和 `shop_order_items` 表名
3. 加入完整的 GA4 和 UTM 追蹤
4. 加入錯誤處理

完成後就可以部署了！
