
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

// --- CONFIGURATION (可在此處編輯) ---
const CONFIG = {
  STORE_NAME_CN: "月島甜點店",
  STORE_NAME_EN: "MOON MOON",
  TAGLINE: "每一季一個主題。你路過，也算參展。",
  CURRENT_SEASON: "Season 04: The Silence of Island (島嶼靜默)",
  BRAND_COLORS: {
    creamWhite: '#F8F8F8',
    emotionBlack: '#000000',
    moonYellow: '#D8E038',
    islandBlue: '#2A9D8F', // Cyan-Green
    grayText: '#666666',
    grayLine: '#E0E0E0',
  },
  LINKS: {
    preorder_pickup_url: "https://ezpretty.cc/CoQyB?openExternalBrowser=1",
    delivery_url: "https://lin.ee/MndRHE2",
    line_url: "https://lin.ee/MndRHE2",
    mbti_lab_url: "https://kiwimu-mbti.vercel.app",
    spotify_url: "https://open.spotify.com/playlist/moonmoon",
    wallpaper_url: "https://drive.google.com/drive/folders/moonmoon-wallpaper",
    line_theme_url: "https://store.line.me/themeshop/product/moonmoon",
    kiwimu_ig_url: "https://www.instagram.com/moon_moon_dessert/",
    instagram_moonmoon_url: "https://www.instagram.com/moon_moon_dessert/",
    address_text: "台南市安南區本原街一段97巷168號",
    hours_text: "Wed - Sun / 13:00 - 19:00",
    liff_id: "2008848603-ANGQX0GN",
  }
};

// --- DATA: 狀態與任務 ---
const STATE_DATA: Record<string, { title: string; advice: string; item: string; mission: string }> = {
  calm: {
    title: "需要平靜 / CALM",
    advice: "世界太吵的時候，允許自己關上門。靜默不是空無一物，而是為了聽見自己。",
    item: "海鹽奶蓋鐵觀音 / 經典原味司康",
    mission: "找個角落坐下，直到喝完這杯茶前，不看手機。"
  },
  anxious: {
    title: "有點焦慮 / ANXIOUS",
    advice: "焦慮是海浪，會來也會走。你不需要現在就解決所有問題。",
    item: "熱可可舒芙蕾 / 焦糖布丁",
    mission: "深呼吸三次，拍一張天空的照片傳給自己。"
  },
  hopeful: {
    title: "充滿希望 / HOPEFUL",
    advice: "保持這份光亮，並試著把它分享給下一個遇見的人。",
    item: "檸檬糖霜磅蛋糕 / 氣泡咖啡",
    mission: "將這份甜點分享給朋友，或記錄下現在的想法。"
  },
  thinking: {
    title: "在思考中 / THINKING",
    advice: "答案通常不在想破頭的瞬間出現，而是在放空的時候浮現。",
    item: "手沖單品 (淺焙) / 抹茶千層",
    mission: "在紙巾或筆記本上寫下目前卡住你的一個關鍵字。"
  },
  create: {
    title: "想要創作 / CREATIVE",
    advice: "靈感是調皮的精靈。別抓它，用甜點誘捕它。",
    item: "季節限定水果塔 / 冰滴咖啡",
    mission: "用 5 分鐘隨意塗鴉，不需要畫得像任何東西。"
  }
};

// --- TRACKING STUB ---
const track = (event: string, payload: any = {}) => {
  console.log(`[Track] ${event}`, payload);
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, payload);
  }
};

// --- DATA: MENU & RANDOMIZER ---

// Removed static import: import MENU_CATEGORIES from './menu.json';

// Simplified lists for random recommender (flattened from above)
const DESSERT_LIST = [
  "經典提拉米蘇", "小山園抹茶米蘇", "日本柚子蘋果乳酪米蘇", "原味巴斯克", "檸檬巴斯克", "鹹蛋黃巴斯克",
  "莓果巧克力戚風", "烤焦糖布丁戚風", "伯爵綠葡萄戚風", "北海道十勝低糖原味千層", "法芙娜巧克力布朗尼千層",
  "特濃抹茶千層", "伯爵茶千層", "檸檬日本柚子千層", "卡士達十勝草莓千層", "布丁"
];

const DRINK_LIST = [
  "美式咖啡", "經典拿鐵", "日本柚子美式", "薄荷茶", "焙茶拿鐵",
  "烤布丁拿鐵", "博士茶", "抹茶拿鐵", "花草茶", "西西里美式", "蕎麥茶"
];

const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// --- COMPONENTS ---

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<{ name: string, spec: string, price: string, count: number }[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [recommendation, setRecommendation] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);
  const [headerImage, setHeaderImage] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showStory, setShowStory] = useState(false); // Easter Egg Modal
  const [showProfile, setShowProfile] = useState(false); // Profile Modal
  const [liffReady, setLiffReady] = useState(false);
  const [isLiff, setIsLiff] = useState(false);

  // --- CHECKOUT STATES ---
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [orderNote, setOrderNote] = useState('');
  // New "Smart Form" Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Helper: Calculate Total Price
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      // Remove non-numeric chars (e.g. "nt$ 150" -> "150")
      const priceVal = parseInt(item.price.replace(/[^\d]/g, ''), 10) || 0;
      return total + (priceVal * item.count);
    }, 0);
  };

  // --- GA4 & UTM TRACKING HELPERS ---
  const getGAClientId = (): string | null => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      let clientId: string | null = null;
      try {
        (window as any).gtag('get', 'G-YOUR_MEASUREMENT_ID', 'client_id', (id: string) => {
          clientId = id;
        });
      } catch (e) {
        console.error('Failed to get GA Client ID:', e);
      }
      return clientId;
    }
    return null;
  };

  const getUTMParams = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return {
        utm_source: urlParams.get('utm_source') || null,
        utm_medium: urlParams.get('utm_medium') || null,
        utm_campaign: urlParams.get('utm_campaign') || null,
        utm_content: urlParams.get('utm_content') || null,
        utm_term: urlParams.get('utm_term') || null,
        referrer: document.referrer || null
      };
    }
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      referrer: null
    };
  };

  // --- SUPABASE MENU & USER DATA ---
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [profile, setProfile] = useState<{ nickname: string, mbti_type: string } | null>(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoadingMenu(true);
        // 1. Fetch Categories
        const { data: categories, error: catError } = await supabase
          .from('menu_categories')
          .select('*')
          .order('sort_order');

        if (catError) throw catError;

        // 2. Fetch Items (V2: Join with variants)
        const { data: items, error: itemError } = await supabase
          .from('menu_items')
          .select(`
            *,
            menu_variants (
              spec,
              price,
              sort_order
            )
          `)
          .eq('is_available', true)
          .order('sort_order');

        if (itemError) throw itemError;

        // 3. Combine
        if (categories && items) {
          const combined = categories.map(cat => ({
            id: cat.id,
            title: cat.title,
            subtitle: cat.subtitle,
            hidePrice: cat.id === 'drinks',
            items: items.filter(item => item.category_id === cat.id).map(item => {
              // Sort variants by sort_order
              const sortedVariants = item.menu_variants
                ? item.menu_variants.sort((a: any, b: any) => a.sort_order - b.sort_order)
                : (typeof item.prices === 'string' ? JSON.parse(item.prices) : item.prices);

              return {
                name: item.name,
                image: item.image,
                description: item.description, // New Description Field
                prices: sortedVariants || []
              };
            })
          }));
          setMenuCategories(combined);
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        setLoadingMenu(false);
      }
    }

    fetchMenu();
  }, []);

  // Random Header Image
  useEffect(() => {
    const images = [
      'https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744158/Enter-05_nrt403.webp',
      'https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-04_mfdlsz.webp',
      'https://res.cloudinary.com/dvizdsv4m/image/upload/v1768736617/mbti_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F_1_zpt5jq.webp'
    ];
    setHeaderImage(images[Math.floor(Math.random() * images.length)]);
  }, []);

  // LIFF Initialization
  useEffect(() => {
    const liff = (window as any).liff;
    if (liff && CONFIG.LINKS.liff_id !== "YOUR_LIFF_ID") {
      liff.init({ liffId: CONFIG.LINKS.liff_id })
        .then(() => {
          console.log('LIFF Initialized');
          setLiffReady(true);
          setIsLiff(liff.isInClient());
        })
        .catch((err: any) => {
          console.error('LIFF Init failed', err);
        });
    }
  }, []);

  // AUTO-OPEN MENU via HASH
  useEffect(() => {
    if (window.location.hash === '#menu') {
      setShowMenu(true);
    }
  }, []);

  // Collapsible state: Set containing IDs of collapsed categories.  
  // Empty set = all expanded (default).
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // --- CART FUNCTIONS ---
  // MODIFIED UX: Toggle behavior (Click once to add, click again to remove)
  const toggleCartItem = (itemName: string, spec: string, price: string) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.name === itemName && i.spec === spec);

      if (existingIndex >= 0) {
        // If exists, remove it (Toggle Off)
        const newCart = [...prev];
        newCart.splice(existingIndex, 1);
        return newCart;
      } else {
        // If not exists, add it (Toggle On)
        return [...prev, { name: itemName, spec, price, count: 1 }];
      }
    });
  };

  // Renamed for clarity, though used as 'addToCart' in existing props
  const addToCart = toggleCartItem;

  const removeFromCart = (itemName: string, spec: string) => {
    setCart(prev => prev.filter(i => !(i.name === itemName && i.spec === spec)));
  };

  const clearCart = () => setCart([]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    // Pre-fill Name if available
    if (profile?.nickname) setCustomerName(profile.nickname);
    else if (user?.email) setCustomerName(user.email.split('@')[0]);

    setShowCheckoutConfirm(true);
  };

  const confirmAndSend = async () => {
    // 1. Validation
    if (!customerName || customerName.length < 2) {
      alert('請填寫完整姓名 (至少 2 個字)');
      return;
    }
    const phoneRegex = /^09\d{8}$/;
    if (!customerPhone || !phoneRegex.test(customerPhone)) {
      alert('請填寫有效的手機號碼 (09開頭共10碼)');
      return;
    }
    if (!pickupDate) {
      alert('請選擇取貨日期');
      return;
    }

    // 2. Generate Order ID (Simple Timestamp-Random)
    const now = new Date();
    const datePart = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderId = `ORD${datePart}${randPart}`; // e.g., ORD0127042

    const totalAmount = calculateTotal();
    const gaClientId = getGAClientId();
    const utmParams = getUTMParams();

    try {
      // 3. Save to Supabase
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
          utm_campaign: utmParams.utm_campaign
        })
        .select()
        .single();

      if (orderError) {
        console.error('訂單儲存錯誤:', orderError);
        alert('訂單建立失敗，請稍後再試');
        return;
      }

      // 4. Save order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        item_name: item.name,
        item_spec: item.spec,
        unit_price: parseInt(item.price.replace(/[^\d]/g, ''), 10),
        quantity: item.count,
        subtotal: parseInt(item.price.replace(/[^\d]/g, ''), 10) * item.count
      }));
      await supabase.from('shop_order_items').insert(orderItems);

      // 5. GA4 event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'purchase', {
          transaction_id: orderId,
          value: totalAmount,
          currency: 'TWD',
          items: cart.map(item => ({
            item_name: item.name,
            item_variant: item.spec,
            price: parseInt(item.price.replace(/[^\d]/g, ''), 10),
            quantity: item.count
          }))
        });
      }

      // 6. Build LINE message
      let msg = `【月島甜點匯款回報】\n`;
      msg += `訂單編號：${orderId}\n`;
      msg += `訂購人：${customerName} (${customerPhone})\n`;
      msg += `總金額：$${totalAmount}\n`;
      msg += `取貨日期：${pickupDate}\n`;
      msg += `轉帳後五碼：_________\n`;
      msg += `\n----------------\n訂購內容：\n`;
      cart.forEach(item => {
        msg += `● ${item.name} | ${item.spec} x ${item.count}\n`;
      });
      if (orderNote) msg += `備註：${orderNote}`;

      // 7. Redirect to LINE
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
      alert(`✅ 訂單 ${orderId} 已建立！\n請在 LINE 傳送訊息並完成轉帳。`);

    } catch (error) {
      console.error('結帳錯誤:', error);
      alert('發生錯誤，請稍後再試');
    }


  };

  // --- AUTH ---
  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname, mbti_type')
          .eq('id', userId)
          .single();
        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage('Sending magic link...');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setLoginMessage('Error: ' + error.message);
    } else {
      setLoginMessage('Check your email for the login link!');
      // Optional: Auto close modal after delay or keep it open to show success
    }
  };

  const handleOAuthLogin = async (provider: 'line' | 'google') => {
    setLoginMessage(`Redirecting to ${provider}...`);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) setLoginMessage('Error: ' + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert('Logged out!');
  };

  useEffect(() => {
    document.title = `${CONFIG.STORE_NAME_EN} | Island Landing`;
  }, []);

  const handleStateSelect = (stateKey: string) => {
    // Toggle: if clicking the same state, close it
    if (selectedState === stateKey) {
      setShowResult(false);
      setSelectedState(null);
      return;
    }

    setSelectedState(stateKey);
    setShowResult(false); // Reset animation
    track('select_state', { state: stateKey });

    // Generate random recommendation
    const randomDrink = getRandomItem(DRINK_LIST);
    const randomDessert = getRandomItem(DESSERT_LIST);
    setRecommendation(`${randomDrink} / ${randomDessert}`);

    // Tiny delay for visual feedback
    setTimeout(() => {
      setShowResult(true);
      track('view_mission_card', { state: stateKey });
    }, 100);
  };

  const handleDownloadCard = () => {
    if (!selectedState) return;
    track('generate_mission_card', { state: selectedState });

    const data = STATE_DATA[selectedState];
    const width = 400;
    const height = 600;

    // 1. Create SVG String
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="${CONFIG.BRAND_COLORS.creamWhite}"/>
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="white" stroke="black" stroke-width="2" stroke-dasharray="5,5"/>
        <rect x="0" y="0" width="${width}" height="10" fill="${CONFIG.BRAND_COLORS.moonYellow}"/>
        <text x="40" y="60" font-family="monospace" font-size="14" fill="#666">MOON MOON MISSION CARD</text>
        <text x="40" y="120" font-family="sans-serif" font-weight="bold" font-size="16" fill="#000">STATE:</text>
        <text x="40" y="150" font-family="sans-serif" font-size="24" fill="${CONFIG.BRAND_COLORS.emotionBlack}">${data.title}</text>
        <line x1="40" y1="180" x2="360" y2="180" stroke="#ddd" stroke-width="1"/>
        <text x="40" y="220" font-family="sans-serif" font-weight="bold" font-size="16" fill="#000">PRESCRIPTION:</text>
        <text x="40" y="250" font-family="sans-serif" font-size="18" fill="#000">${recommendation}</text>
        <rect x="40" y="300" width="320" height="120" fill="#eee"/>
        <text x="60" y="330" font-family="sans-serif" font-weight="bold" font-size="14" fill="#000">YOUR MISSION:</text>
         <foreignObject x="60" y="340" width="280" height="80">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif; font-size:16px; color:#333; line-height: 1.4;">
                ${data.mission}
            </div>
        </foreignObject>
        <text x="40" y="550" font-family="monospace" font-size="12" fill="#999">VALID FOR 24 HOURS</text>
      </svg>
    `;

    // 2. Convert to PNG via Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Create a Blob URL from the SVG
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = CONFIG.BRAND_COLORS.creamWhite;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);

        // Export as PNG
        const pngUrl = canvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `MoonMission_${selectedState}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  };

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return (
    <>
      <style>{`
        :root {
          /* Existing Colors */
          --c-cream: ${CONFIG.BRAND_COLORS.creamWhite};
          --c-black: ${CONFIG.BRAND_COLORS.emotionBlack};
          --c-yellow: ${CONFIG.BRAND_COLORS.moonYellow};
          --c-blue: ${CONFIG.BRAND_COLORS.islandBlue};
          --c-gray: ${CONFIG.BRAND_COLORS.grayText};
          --c-line: ${CONFIG.BRAND_COLORS.grayLine};
          
          /* Glassmorphism Variables */
          --glass-white-light: rgba(255, 255, 255, 0.6);
          --glass-white-medium: rgba(255, 255, 255, 0.8);
          --glass-white-strong: rgba(255, 255, 255, 0.95);
          
          /* Shadows */
          --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
          --shadow-glass-hover: 0 12px 40px 0 rgba(0, 0, 0, 0.12);
          --shadow-glow-blue: 0 0 20px rgba(88, 120, 240, 0.3);
          --shadow-glow-yellow: 0 0 20px rgba(216, 224, 56, 0.4);
        }
        
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        body {
          background: var(--c-cream);
          color: var(--c-black);
          font-family: "Noto Sans TC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          position: relative;
        }

        
        a { 
          text-decoration: none; 
          color: inherit; 
          transition: all 0.3s ease; 
        }
        a:hover { opacity: 0.8; transform: translateY(-1px); }
        
        button { 
          cursor: pointer; 
          border: none; 
          outline: none; 
          background: none; 
          font-family: inherit;
          transition: all 0.3s ease;
        }
        
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 0 20px; 
          position: relative; 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column;
          z-index: 1;
        }
        
        /* Tablet */
        @media (min-width: 768px) {
          .container {
            max-width: 720px;
            padding: 0 40px;
          }
        }
        
        /* Desktop */
        @media (min-width: 1024px) {
          .container {
            max-width: 800px;
            padding: 0 60px;
          }
        }
        
        .section-padding { padding: 60px 0; }
        
        @media (min-width: 768px) {
          .section-padding { padding: 80px 0; }
        }
        
        .border-y { border-top: 1px solid var(--c-black); border-bottom: 1px solid var(--c-black); }
        .border-t { border-top: 1px solid var(--c-black); }
        
        /* Typography */
        .font-mono { font-family: "Menlo", "Monaco", "Courier New", monospace; letter-spacing: 0.05em; text-transform: uppercase; }
        .text-blue { color: var(--c-blue); }
        .text-yellow { color: var(--c-yellow); }
        
        /* Components - Glassmorphism */
        .btn-entry {
          background: var(--glass-white-medium);
          backdrop-filter: blur(16px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: var(--shadow-glass),
                      inset 0 1px 0 rgba(255, 255, 255, 0.6);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 12px; 
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; padding: 20px; margin-bottom: 12px;
          min-height: 60px;
        }
        .btn-entry:active { transform: scale(0.98); }
        .btn-entry:hover { 
          background: var(--glass-white-strong);
          backdrop-filter: blur(20px) saturate(200%);
          box-shadow: var(--shadow-glass-hover),
                      0 0 0 1px rgba(88, 120, 240, 0.2),
                      inset 0 1px 0 rgba(255, 255, 255, 0.8);
          transform: translateY(-4px);
        }
        
        @media (min-width: 768px) {
          .btn-entry {
            padding: 24px;
          }
        }
        
        .btn-primary {
          display: block; width: 100%; text-align: center;
          background: linear-gradient(135deg, var(--c-blue) 0%, #6a88f5 100%);
          color: white;
          padding: 16px; border-radius: 40px; font-weight: bold;
          min-height: 50px;
          box-shadow: 0 8px 24px rgba(88, 120, 240, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative; overflow: hidden;
        }
        .btn-primary::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 60%);
          transform: scale(0); transition: transform 0.6s;
        }
        .btn-primary:hover::before { transform: scale(1); }
        .btn-primary:hover {
          background: #4a68d8;
          box-shadow: var(--shadow-glow-blue), 0 12px 32px rgba(88, 120, 240, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .btn-small {
          display: block; width: 100%; text-align: center;
          border: 1px solid var(--c-black); 
          background: rgba(255, 255, 255, 0.8);
          padding: 12px; font-size: 0.9rem;
          min-height: 44px;
          backdrop-filter: blur(5px);
        }
        .btn-small:hover {
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* Timeline */
        .timeline { 
          padding-left: 0; 
          margin-left: 0;
          background: transparent;
          backdrop-filter: none;
          border-radius: 0;
          padding: 0;
          border: none;
          box-shadow: none;
        }
        .timeline-item { position: relative; margin-bottom: 30px; border-left: none; padding-left: 0; }
        .timeline-item::before {
          content: '•'; position: absolute; left: -15px; top: 0px;
          font-size: 1.5rem; line-height: 1; color: var(--c-black);
          display: none; /* Removed dot style to align flush left as requested */
        }
        /* Custom bullet for flush alignment */
        .timeline-item h4::before {
          content: '●'; 
          font-size: 0.6em; 
          vertical-align: middle; 
          margin-right: 10px;
          display: inline-block;
        }

        /* Checkin Grid */
        .checkin-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
          margin-top: 20px; 
        }
        
        @media (min-width: 768px) {
          .checkin-grid {
            gap: 16px;
          }
        }
        
        .state-btn {
          padding: 24px 12px; 
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.5));
          backdrop-filter: blur(12px) saturate(150%);
          box-shadow: var(--shadow-glass);
          text-align: center; 
          font-size: 0.95rem; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .state-btn::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s;
        }
        .state-btn:hover::before { left: 100%; }
        .state-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .state-btn.selected {
          background: linear-gradient(135deg, rgba(88, 120, 240, 0.8), rgba(88, 120, 240, 0.6));
          border-color: rgba(255, 255, 255, 0.5);
          color: white;
          box-shadow: var(--shadow-glow-blue), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        @media (min-width: 768px) {
          .state-btn {
            padding: 28px 16px;
            font-size: 1rem;
          }
        }

        /* Result Card */
        .result-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: var(--shadow-glass), inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 0 1px rgba(88, 120, 240, 0.1);
          border-radius: 20px;
          padding: 24px;
          margin-top: 30px; 
          animation: fadeIn 0.5s ease forwards; 
          opacity: 0;
          position: relative;
          overflow: hidden;
        }
        .result-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--c-blue), var(--c-yellow), transparent);
        }
        
        @media (min-width: 768px) {
          .result-card {
            padding: 32px;
          }
        }
        
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .link-list { 
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(16px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: var(--shadow-glass);
          padding: 0 20px;
          border-radius: 12px;
        }
        .link-list li { 
          border-bottom: 1px solid var(--c-line); 
          padding: 18px 0; 
          display: flex; 
          justify-content: space-between;
          align-items: center;
          min-height: 60px;
        }
        .link-list li:last-child { border-bottom: none; }
        
        @media (min-width: 768px) {
          .link-list li {
            padding: 20px 0;
          }
        }

        /* Menu Modal */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex; justify-content: center; align-items: center;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }
        .modal-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          width: 100%; max-width: 600px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          position: relative;
          display: flex; flex-direction: column;
        }
        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          display: flex; justify-content: space-between; align-items: center;
          position: sticky; top: 0; background: rgba(255,255,255,0.95); z-index: 10;
        }
        .modal-body { padding: 24px; }
        .menu-grid {
          display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 30px;
        }
        @media (min-width: 640px) {
          .menu-grid { grid-template-columns: 1fr 1fr; }
        }
        .menu-item {
          padding: 16px;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 12px;
          transition: all 0.2s;
        }
        .menu-item:hover { background: white; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .close-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(0,0,0,0.05);
          display: flex; justify-content: center; align-items: center;
          font-size: 1.2rem;
        }
        .close-btn:hover { background: rgba(0,0,0,0.1); }
        
        .header-bird {
          position: absolute; 
          top: -10px; /* Moved to top */
          right: -30px; 
          width: 260px; /* Enlarged */
          animation: float 6s ease-in-out infinite; 
          z-index: 10; 
          transition: transform 0.3s ease;
          pointer-events: none; /* Let clicks pass through unless on image */
        }
        .header-bird img {
          pointer-events: auto; /* Enable clicks on the bird itself */
        }
        .header-bird.modal-open {
          animation: none; 
          opacity: 0.2; /* Fade out when modal open */
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .header-bird {
            top: 0px;
            right: -40px; 
            width: 200px; /* Larger on mobile too */
          }
        }
      `}</style>

      <div className="container">
        {/* A. HERO */}
        <header style={{ paddingTop: '80px', paddingBottom: '40px', position: 'relative' }}>
          {/* Easter Egg Trigger: Click bird to open story */}
          <div
            className={`header-bird ${showStory ? 'modal-open' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              track('click_easter_egg');
              setShowStory(true);
            }}
            style={{ cursor: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewport=\'0 0 100 100\' style=\'fill:black;font-size:24px;\'><text y=\'50%\'>?</text></svg>") 16 0, pointer' }}
            title="Kiwimu?"
          >
            <img src={headerImage || "https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744158/Enter-05_nrt403.webp"} alt="Moon Island Character" style={{ width: '100%', height: 'auto' }} />
          </div>

          <div className="font-mono" style={{
            marginBottom: '10px',
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 10 /* Higher than bird */
          }}>
            <span>WELCOME TO MOON ISLAND</span>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setShowProfile(true)}
                  style={{
                    fontSize: '0.7rem',
                    color: CONFIG.BRAND_COLORS.grayText,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                >
                  {profile?.nickname || user.email?.split('@')[0]}
                  {profile?.mbti_type && (
                    <span style={{
                      padding: '2px 8px',
                      background: CONFIG.BRAND_COLORS.moonYellow,
                      borderRadius: '10px',
                      color: 'black',
                      fontSize: '0.65rem',
                      fontWeight: 'bold'
                    }}>
                      {profile.mbti_type}
                    </span>
                  )}
                </button>
                <button onClick={handleLogout} style={{ borderBottom: '1px solid black', fontSize: '0.7rem' }}>LOGOUT</button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                style={{
                  border: '1px solid black',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  background: CONFIG.BRAND_COLORS.moonYellow,
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 black'
                }}
              >
                領取島民狀態 STATUS
              </button>
            )}
          </div>

          {/* Logo Integration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <img src="/assets/logo-chinese.png" alt="Moon Moon Dessert" style={{ maxWidth: '280px', height: 'auto', filter: 'brightness(0)' }} />
            <h1 style={{ fontSize: '2rem', lineHeight: '1.2', fontWeight: 700, margin: 0, opacity: 0.8 }}>
              Island Landing
            </h1>
          </div>

          <p style={{ color: CONFIG.BRAND_COLORS.grayText, marginBottom: '40px' }}>{CONFIG.TAGLINE}</p>

          <a href="https://moonmoon-dessert-passport.vercel.app" target="_blank" rel="noreferrer" className="btn-entry" onClick={() => track('click_hero_checkin')}>
            <div>
              <span className="font-mono text-blue" style={{ fontSize: '0.8rem' }}>01 // INTERACT</span><br />
              <strong>我想登島互動 (Check-in)</strong>
            </div>
            <span>↗</span>
          </a>
          <a href={CONFIG.LINKS.preorder_pickup_url} target="_blank" rel="noreferrer" className="btn-entry" onClick={() => track('click_hero_pickup')}>
            <div>
              <span className="font-mono" style={{ fontSize: '0.8rem' }}>02 // PICKUP</span><br />
              <strong>我想帶走甜點 (預訂取貨)</strong>
            </div>
            <span>→</span>
          </a>
          <a href={CONFIG.LINKS.delivery_url} target="_blank" rel="noreferrer" className="btn-entry" onClick={() => track('click_hero_delivery')}>
            <div>
              <span className="font-mono" style={{ fontSize: '0.8rem' }}>03 // DELIVERY</span><br />
              <strong>我想遠端靠岸 (冷凍宅配)</strong>
            </div>
            <span>↗</span>
          </a>

          <div style={{ marginTop: '20px', padding: '15px', background: CONFIG.BRAND_COLORS.moonYellow, border: '1px solid black', fontSize: '0.9rem' }}>
            <span className="font-mono" style={{ display: 'block', marginBottom: '5px' }}>CURRENT EXHIBITION</span>
            <strong>{CONFIG.CURRENT_SEASON}</strong>
          </div>
        </header>

        {/* B. MAP */}
        <section className="section-padding border-y" style={{ background: 'white', position: 'relative', overflow: 'hidden' }}>
          <h2 className="font-mono" style={{ marginBottom: '20px' }}>VISITOR GUIDE MAP</h2>
          <div className="timeline">
            <div className="timeline-item">
              <h4>路過 / Drift in</h4>
              <p style={{ fontSize: '0.85rem', color: CONFIG.BRAND_COLORS.grayText }}>無意間的相遇，是登島的開始。</p>
            </div>
            <div className="timeline-item">
              <h4>停留 / Observe</h4>
              <p style={{ fontSize: '0.85rem', color: CONFIG.BRAND_COLORS.grayText }}>觀察本季主題，找到與你的共鳴。</p>
            </div>
            <div className="timeline-item">
              <h4 className="text-blue">Check-in / Status</h4>
              <p style={{ fontSize: '0.85rem', color: CONFIG.BRAND_COLORS.grayText }}>領取你的狀態展籤與甜點處方。</p>
            </div>
            <div className="timeline-item">
              <h4>兌換 / Exchange</h4>
              <p style={{ fontSize: '0.85rem', color: CONFIG.BRAND_COLORS.grayText }}>帶著任務卡回店，或遠端品嚐。</p>
            </div>
          </div>
        </section>

        {/* C. PEAK EXPERIENCE & D. CHECK-IN (Combined with Background) */}
        <div style={{
          backgroundImage: 'url(https://res.cloudinary.com/dvizdsv4m/image/upload/v1769239698/Please_make_the_2k_202601241151_ios8rt.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '24px',
          padding: '40px 20px',
          margin: '40px 0',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Overlay for readability */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 1
          }}></div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2 className="font-mono" style={{ color: 'white', marginBottom: '20px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>PEAK EXPERIENCE</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button
                className={`state-btn ${selectedState === 'calm' ? 'selected' : ''}`}
                onClick={() => handleStateSelect('calm')}
              >
                CALM<br />平靜
              </button>
              <div className="checkin-grid">
                <button className={`state-btn ${selectedState === 'anxious' ? 'selected' : ''}`} onClick={() => handleStateSelect('anxious')}>
                  ANXIOUS<br />焦慮
                </button>
                <button className={`state-btn ${selectedState === 'hopeful' ? 'selected' : ''}`} onClick={() => handleStateSelect('hopeful')}>
                  HOPEFUL<br />希望
                </button>
                <button className={`state-btn ${selectedState === 'thinking' ? 'selected' : ''}`} onClick={() => handleStateSelect('thinking')}>
                  THINKING<br />思考
                </button>
                <button className={`state-btn ${selectedState === 'create' ? 'selected' : ''}`} onClick={() => handleStateSelect('create')}>
                  CREATIVE<br />創作
                </button>
              </div>
            </div>
          </div>

          {showResult && selectedState && (
            <div id="result-card" className="result-card" style={{ zIndex: 2, color: 'black' }}>
              <div className="font-mono" style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>MISSION CARD ISSUED</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{STATE_DATA[selectedState].title}</h3>
              <p style={{ fontSize: '0.95rem', marginBottom: '20px', fontStyle: 'italic' }}>
                "{STATE_DATA[selectedState].advice}"
              </p>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>PRESCRIPTION (處方):</strong>
                <span style={{ fontSize: '1.1rem' }}>{recommendation}</span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>YOUR MISSION (任務):</strong>
                <p>{STATE_DATA[selectedState].mission}</p>
              </div>
              <button className="btn-primary" onClick={handleDownloadCard}>
                DOWNLOAD CARD (下載展籤)
              </button>
            </div>
          )}
        </div>

        {/* E. SOFT BUY (MENU ENTRY) */}
        <section className="section-padding border-t" style={{ background: '#fcfcfc' }}>
          <h2 className="font-mono" style={{ marginBottom: '20px', textAlign: 'center' }}>ARCHIVE / COLLECTION</h2>

          <button style={{
            width: '100%',
            padding: '40px 30px',
            border: 'none',
            borderRadius: '16px',
            background: CONFIG.BRAND_COLORS.emotionBlack,
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.background = '#1a1a1a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = CONFIG.BRAND_COLORS.emotionBlack;
            }}
            onClick={() => {
              setShowMenu(true);
              track('open_menu');
            }}
          >
            <div className="font-mono" style={{ fontSize: '0.8rem', opacity: 0.6, letterSpacing: '0.2em' }}>EXPLORE THE FLAVORS</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.1em' }}>
              ISLAND MENU
              <span style={{ color: CONFIG.BRAND_COLORS.moonYellow, marginLeft: '10px' }}>↗</span>
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, maxWidth: '300px', fontWeight: 400, margin: '0 0 10px 0' }}>
              探索本季甜點處方與過往收藏項目
            </p>
            <div style={{
              background: CONFIG.BRAND_COLORS.moonYellow,
              color: 'black',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              OPEN COLLECTION
            </div>
          </button>

          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ marginBottom: '20px' }}>
              這不只是一次選擇，而是一場狀態的確認。<br />
              選一個關鍵字，交換一份<span style={{ borderBottom: `2px solid ${CONFIG.BRAND_COLORS.moonYellow}`, paddingBottom: '2px' }}>甜點處方箋</span>。
            </p>
          </div>

          {/* NEW: CURATED CONTENT */}
          <div style={{ marginTop: '80px' }}>
            <h2 className="font-mono" style={{ marginBottom: '30px' }}>CURATED EXHIBITION</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              {/* 1. Spotify Embed */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', background: 'white' }}>
                <iframe
                  src="https://open.spotify.com/embed/playlist/4GvSWtZD5YiJdIu7M8e9Ei?utm_source=generator&theme=0"
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  style={{ border: 'none' }}
                ></iframe>
              </div>

              {/* 2. Downloadables Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Wallpaper */}
                <a href={CONFIG.LINKS.wallpaper_url} target="_blank" rel="noreferrer" className="btn-entry" style={{ minHeight: '80px' }}>
                  <div>
                    <span className="font-mono text-yellow" style={{ fontSize: '0.8rem' }}>DOWNLOAD</span><br />
                    <strong>WALLPAPER (桌布)</strong>
                  </div>
                  <span>↓</span>
                </a>

                {/* Theme */}
                <a href={CONFIG.LINKS.line_theme_url} target="_blank" rel="noreferrer" className="btn-entry" style={{ minHeight: '80px' }}>
                  <div>
                    <span className="font-mono text-blue" style={{ fontSize: '0.8rem' }}>LINE STORE</span><br />
                    <strong>OFFICIAL THEME (主題)</strong>
                  </div>
                  <span>↗</span>
                </a>

                {/* Coming Soon */}
                <div style={{
                  background: '#f0f0f0',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  minHeight: '80px',
                  color: '#999',
                  border: '1px dashed #ccc'
                }}>
                  <strong className="font-mono">PROJECT LOADING... (準備中)</strong>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* F. FOOTER */}
        <footer style={{ padding: '60px 0', borderTop: '1px solid black', fontSize: '0.9rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
            <div>
              <h5 className="font-mono" style={{ marginBottom: '15px' }}>ISLAND INFO</h5>
              <p style={{ marginBottom: '10px' }}>
                {/* Google Maps Link */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.LINKS.address_text)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  {CONFIG.LINKS.address_text} ↗
                </a>
              </p>
              <p>
                {CONFIG.LINKS.hours_text}<br />
                <span style={{ fontSize: '0.8rem', color: '#888' }}>(依 Google Maps 與公告為主)</span>
              </p>
            </div>
            <div>
              <h5 className="font-mono" style={{ marginBottom: '15px' }}>CONTACT</h5>
              <ul style={{ listStyle: 'none' }}>
                <li style={{ marginBottom: '12px' }}>
                  <a href={CONFIG.LINKS.instagram_moonmoon_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Instagram</span>
                    <span style={{ fontSize: '0.8em' }}>↗</span>
                  </a>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <a href={CONFIG.LINKS.line_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>LINE Official</span>
                    <span style={{ fontSize: '0.8em' }}>↗</span>
                  </a>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <a href={CONFIG.LINKS.spotify_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Spotify Playlist</span>
                    <span style={{ fontSize: '0.8em' }}>↗</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: '#999', fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} {CONFIG.STORE_NAME_EN}. All Rights Reserved.
          </p>
        </footer>

        {/* --- MODALS --- */}

        {/* MENU MODAL */}
        {showMenu && (
          <div className="modal-overlay" onClick={() => setShowMenu(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', color: CONFIG.BRAND_COLORS.grayText }}>SEASON 04</div>
                  <h3 className="font-mono" style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.05em' }}>MENU</h3>
                </div>
                <button className="close-btn" onClick={() => setShowMenu(false)}>×</button>
              </div>

              <div className="modal-body">
                {/* Image Carousel Removed as requested */}

                {menuCategories.map((cat) => {
                  const isCollapsed = collapsedCategories.has(cat.id);
                  return (
                    <div key={cat.id} style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                      <div
                        onClick={() => toggleCategory(cat.id)}
                        style={{
                          marginBottom: '15px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start'
                        }}
                      >
                        <div>
                          <h4 style={{ fontSize: '1.1rem', margin: 0, borderBottom: `2px solid ${CONFIG.BRAND_COLORS.moonYellow}`, display: 'inline-block', paddingBottom: '4px' }}>
                            {cat.title}
                          </h4>
                          <div className="font-mono" style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>
                            {cat.subtitle}
                          </div>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 300, transform: isCollapsed ? 'rotate(0deg)' : 'rotate(45deg)', transition: 'transform 0.3s', lineHeight: 1 }}>
                          +
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="menu-grid" style={{ animation: 'fadeIn 0.3s' }}>
                          {cat.items.map((item, idx) => (
                            <div key={idx} className="menu-item" onClick={() => {
                              if (cat.id !== 'drinks') {
                                setExpandedItem(expandedItem === item.name ? null : item.name);
                              }
                            }} style={{ cursor: cat.id !== 'drinks' ? 'pointer' : 'default' }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: item.prices.some(p => cart.find(c => c.name === item.name && c.spec === p.spec)) ? CONFIG.BRAND_COLORS.islandBlue : '#ddd',
                                    marginRight: '10px'
                                  }}></div>
                                </div>
                              </div>

                              {/* Click to expand image */}
                              {expandedItem === item.name && cat.id !== 'drinks' && (
                                <div style={{
                                  width: '100%',
                                  height: '200px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  marginBottom: '12px',
                                  animation: 'fadeIn 0.3s'
                                }}>
                                  <img src={item.image || "placeholder.jpg"} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              )}

                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{item.name}</h4>

                                {/* New Description Field */}
                                {item.description && (
                                  <p style={{
                                    fontSize: '0.85rem',
                                    color: '#888',
                                    marginBottom: '8px',
                                    lineHeight: '1.4',
                                    whiteSpace: 'pre-line'
                                  }}>
                                    {item.description}
                                  </p>
                                )}

                                {!cat.hidePrice && (
                                  <div style={{ paddingLeft: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {item.prices.map((p, pIdx) => {
                                      const inCart = cart.find(c => c.name === item.name && c.spec === p.spec);
                                      return (
                                        <button
                                          key={pIdx}
                                          className="font-mono"
                                          onClick={(e) => {
                                            e.stopPropagation(); // Prevent toggling item image
                                            addToCart(item.name, p.spec, p.price);
                                          }}
                                          style={{
                                            fontSize: '0.8rem',
                                            color: inCart ? 'white' : '#666',
                                            background: inCart ? CONFIG.BRAND_COLORS.islandBlue : 'rgba(0,0,0,0.03)',
                                            padding: '4px 10px',
                                            borderRadius: '4px',
                                            border: '1px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontWeight: inCart ? 'bold' : 'normal'
                                          }}>
                                          {p.spec}: {p.price} {inCart ? '✓' : '+'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}


              </div>
            </div>
          </div>
        )
        }
        {showStory && (
          <div className="modal-overlay" onClick={() => setShowStory(false)} style={{ zIndex: 3000, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(4px)' }}>
            {/* Story Modal - Glassmorphism Style */}
            <div
              className="result-card"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '400px',
                border: '1px solid rgba(255,255,255,0.8)',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.5)',
                color: CONFIG.BRAND_COLORS.emotionBlack,
                marginTop: '0' // Align centered in modal-overlay
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '50%', margin: '0 auto 20px', overflow: 'hidden', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <img src={headerImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="font-mono" style={{ fontSize: '1.2rem', color: CONFIG.BRAND_COLORS.moonYellow, marginBottom: '5px', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>WHO IS KIWIMU?</h3>
                <p style={{ fontSize: '0.8rem', color: '#888' }}>(The Origin Story)</p>
              </div>

              <div style={{ lineHeight: '1.8', fontSize: '0.95rem', fontFamily: 'serif', padding: '0 10px', color: '#444' }}>
                <p style={{ marginBottom: '20px' }}>
                  Kiwimu 是從<span style={{ color: CONFIG.BRAND_COLORS.moonYellow, fontWeight: 'bold' }}>鮮奶油</span>裡誕生的生物。
                </p>
                <p style={{ marginBottom: '20px' }}>
                  牠不是誰的答案，也不是完美模板——牠更像一面溫柔的鏡子。
                </p>
                <p style={{ marginBottom: '20px' }}>
                  當你焦慮、委屈、逞強，或覺得自己不夠好時，牠會先融化，像一團柔軟的白，把你的情緒接住；
                </p>
                <p>
                  等你願意整理，它又會重新打發成形，變回可以前進的你。
                </p>
              </div>

              <button
                onClick={() => setShowStory(false)}
                style={{
                  marginTop: '40px',
                  width: '100%',
                  padding: '15px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '30px',
                  background: 'rgba(255,255,255,0.5)',
                  color: '#666',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'white'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
              >
                CLOSE DIARY
              </button>
            </div>
          </div>
        )}

        {/* CHECKOUT CONFIRMATION MODAL */}
        {showCheckoutConfirm && (
          <div className="modal-overlay" onClick={() => setShowCheckoutConfirm(false)} style={{ zIndex: 3000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', zIndex: 3001 }}>
              <div className="modal-header" style={{ background: CONFIG.BRAND_COLORS.moonYellow }}>
                <h3 className="font-mono" style={{ margin: 0 }}>訂購確認 Check Order</h3>
                <button className="close-btn" onClick={() => setShowCheckoutConfirm(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '20px', maxHeight: '30vh', overflowY: 'auto' }}>
                  {cart.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>{item.spec}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>x{item.count}</div>
                        <div style={{ fontSize: '0.9rem' }}>{item.price}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderTop: '2px solid black', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '20px' }}>
                  <span>TOTAL</span>
                  <span>${calculateTotal()}</span>
                </div>

                <p style={{ background: '#f8f8f8', padding: '10px', fontSize: '0.85rem', color: '#555', borderRadius: '8px', marginBottom: '20px' }}>
                  💡 請確認以下資訊正確，我們會用此資訊與您對帳。
                </p>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>訂購人姓名 Name <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="請輸入真實姓名"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>手機號碼 Phone <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="tel"
                    placeholder="09xxxxxxxx"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>預計取貨日期 Pickup Date <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>*請選擇您要來店取貨的日期 (營業時間: 週三-週日 13:00-19:00)</p>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>備註 Note (選填)</label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="例如：需要蠟燭、大概幾點到..."
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', minHeight: '80px' }}
                  />
                </div>

                <button
                  onClick={confirmAndSend}
                  className="btn-primary"
                  style={{ background: 'black', color: CONFIG.BRAND_COLORS.moonYellow }}
                >
                  確認並傳送至 LINE ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOGIN MODAL */}
        {showLogin && (
          <div className="modal-overlay" onClick={() => setShowLogin(false)} style={{ zIndex: 2000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '0', zIndex: 2001 }}>
              <div className="modal-header">
                <h3 className="font-mono">登島手續：領取島民狀態</h3>
                <button className="close-btn" onClick={() => setShowLogin(false)}>×</button>
              </div>
              <div className="modal-body" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '25px', padding: '0 10px' }}>
                  <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                    <strong>「成為月島島民，記錄你的數位足跡。」</strong><br />
                    登入後可同步您的 MBTI 測驗結果，<br />
                    解鎖專屬甜點處方，並獲取島嶼導覽優先權。
                  </p>
                </div>
                <button
                  onClick={() => handleOAuthLogin('google')}
                  style={{
                    background: 'white',
                    color: '#444',
                    padding: '16px',
                    borderRadius: '40px',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    border: '1px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  使用 Google 帳號領取
                </button>

                <div style={{ position: 'relative', marginBottom: '30px' }}>
                  <hr style={{ border: 'none', borderTop: '1px solid #eee' }} />
                  <span style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'white',
                    padding: '0 10px',
                    fontSize: '0.8rem',
                    color: '#999'
                  }}>或使用 Email 登入</span>
                </div>

                <form onSubmit={handleLogin}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      marginBottom: '15px',
                      fontSize: '1rem'
                    }}
                  />
                  <button type="submit" className="btn-primary" disabled={!!loginMessage} style={{ background: '#333' }}>
                    {loginMessage || '寄送魔術連結'}
                  </button>
                  {loginMessage && (
                    <p style={{ marginTop: '15px', fontSize: '0.8rem', color: loginMessage.includes('Error') ? 'red' : 'green' }}>
                      {loginMessage}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE MODAL */}
        {showProfile && user && (
          <div className="modal-overlay" onClick={() => setShowProfile(false)} style={{ zIndex: 2000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '0', zIndex: 2001 }}>
              <div className="modal-header">
                <h3 className="font-mono">🌙 島民檔案 RESIDENT PROFILE</h3>
                <button className="close-btn" onClick={() => setShowProfile(false)}>×</button>
              </div>
              <div className="modal-body">
                {/* Basic Info */}
                <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: CONFIG.BRAND_COLORS.moonYellow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    fontSize: '2rem'
                  }}>
                    {profile?.nickname?.[0] || user.email?.[0].toUpperCase()}
                  </div>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: '5px' }}>
                    {profile?.nickname || user.email?.split('@')[0]}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>{user.email}</p>
                  {profile?.mbti_type && (
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 16px',
                      background: CONFIG.BRAND_COLORS.emotionBlack,
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      MBTI: {profile.mbti_type}
                    </div>
                  )}
                </div>

                {/* Sync Status */}
                <div style={{
                  background: '#f8f8f8',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '25px'
                }}>
                  <h4 className="font-mono" style={{ fontSize: '0.85rem', marginBottom: '15px', opacity: 0.7 }}>
                    資料同步狀態
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>✓</span>
                      <span style={{ fontSize: '0.9rem' }}>
                        {profile?.mbti_type ? 'MBTI 測驗結果已同步' : '尚未同步 MBTI 結果'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>✓</span>
                      <span style={{ fontSize: '0.9rem' }}>島民身份已啟用</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{
                  background: '#fffdf0',
                  border: '1px solid #ffd93d',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '25px',
                  fontSize: '0.85rem',
                  lineHeight: '1.6'
                }}>
                  💡 <strong>跨站同步說明</strong><br />
                  在月島的所有網站（MBTI Lab、甜點店）都使用同一個帳號。<br />
                  無論您在哪裡更新資料，其他網站都會自動同步。
                </div>

                {/* Cross-site Links */}
                <div style={{ textAlign: 'center' }}>
                  <a
                    href={CONFIG.LINKS.mbti_lab_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-block',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '24px',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    前往 MBTI Lab 查看測驗歷史 →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* FLOATING CART BAR */}
        {cart.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '500px',
            background: CONFIG.BRAND_COLORS.moonYellow,
            borderRadius: '50px',
            padding: '15px 25px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1500,
            animation: 'fadeIn 0.3s'
          }}>
            <div style={{ fontWeight: 'bold' }}>
              已選 {cart.reduce((a, c) => a + c.count, 0)} 項甜點
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={clearCart} style={{ fontSize: '0.8rem', textDecoration: 'underline' }}>清空</button>
              <button onClick={handleCheckout} style={{
                background: 'black',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '30px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                傳送預訂 ➜
              </button>
            </div>
          </div>
        )}

      </div >
    </>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
