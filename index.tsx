
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import { buildUtmUrl, trackEvent, trackOutboundClick, trackUtmLanding } from './lib/crossSiteTracking';

// --- CONFIGURATION (可在此處編輯) ---
const CONFIG = {
  STORE_NAME_CN: "月島甜點店",
  STORE_NAME_EN: "MOON MOON",
  TAGLINE: "每一季一個主題。你路過，也算參展。",
  CURRENT_SEASON: "Season 01: The Silence of Island (島嶼靜默)",
  BRAND_COLORS: {
    creamWhite: '#F8F8F8',
    emotionBlack: '#000000',
    moonYellow: '#D8E038',
    islandBlue: '#2A9D8F', // Cyan-Green
    grayText: '#666666',
    grayLine: '#E0E0E0',
  },
  LINKS: {
    preorder_pickup_url: "https://moon-dessert-booking.vercel.app",
    delivery_url: "https://moon-dessert-booking.vercel.app",
    booking_url: "https://moon-dessert-booking.vercel.app",
    passport_url: "https://moonmoon-dessert-passport.vercel.app",
    line_url: "https://lin.ee/MndRHE2",
    mbti_lab_url: "https://kiwimu-mbti.vercel.app",
    spotify_url: "https://open.spotify.com/playlist/moonmoon",
    wallpaper_url: "https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/Image_wallpaper/2026_01.jpg",
    easter_egg_reward_url: "#wallpaper-section",
    line_theme_url: "https://line.me/S/shop/theme/detail?id=6dafbfa5-b3db-4ac5-8616-a6c1dd46f1e9&lang=zh-Hant&ref=lsh_themeDetail",
    kiwimu_ig_url: "https://www.instagram.com/moon_moon_dessert/",
    instagram_moonmoon_url: "https://www.instagram.com/moon_moon_dessert/",
    address_text: "台南市安南區本原街一段97巷168號",
    hours_text: "Wed - Sun / 13:00 - 19:00",
    liff_id: "2008848603-ANGQX0GN",
    line_pay_qr_code: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1769531708/IMG_1967_k0ila8.png",
  }
};

// Wallpaper assets (Supabase)
const WALLPAPERS = [
  { label: "2026.01", url: "https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/Image_wallpaper/2026_01.jpg" },
  { label: "2026.02", url: "https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/Image_wallpaper/2026_02.jpg" },
  { label: "2026.03", url: "https://xlqwfaailjyvsycjnzkz.supabase.co/storage/v1/object/public/Image_wallpaper/2026_03.jpg" }
];

// --- SUPABASE STORAGE (圖床，與 Dessert-Booking 共用 menu-images bucket) ---
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL;
const MENU_IMAGES_BASE = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/menu-images` : '';

/** 解析菜單圖片 URL：支援完整 URL 或檔名/路徑，自動接上 Supabase Storage */
function getMenuImageUrl(img: string | null | undefined): string | null {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  const path = img.replace(/^\/?menu-images\/?/, '');
  return MENU_IMAGES_BASE ? `${MENU_IMAGES_BASE}/${path}` : img;
}

// --- DATA: 狀態與任務 ---
const STATE_DATA: Record<string, {
  title: string;
  advice: string;
  mission: string;
  recommendedItems: string[];
}> = {
  calm: {
    title: "需要平靜 / CALM",
    advice: "世界太吵的時候，允許自己關上門。靜默不是空無一物，而是為了聽見自己。",
    mission: "找個角落坐下，直到喝完這杯茶前，不看手機。",
    recommendedItems: ["烤布丁(附焦糖液)", "經典提拉米蘇", "經典原味巴斯克"]
  },
  anxious: {
    title: "有點焦慮 / ANXIOUS",
    advice: "焦慮是海浪，會來也會走。你不需要現在就解決所有問題。",
    mission: "深呼吸三次，拍一張天空的照片傳給自己。",
    recommendedItems: ["烤布丁(附焦糖液)", "烤布丁提拉米蘇", "蜜香紅茶巴斯克"]
  },
  hopeful: {
    title: "充滿希望 / HOPEFUL",
    advice: "保持這份光亮，並試著把它分享給下一個遇見的人。",
    mission: "將這份甜點分享給朋友，或記錄下現在的想法。",
    recommendedItems: ["日本柚子米蘇", "經典提拉米蘇鐵盒(600ml)", "經典十勝低糖千層"]
  },
  thinking: {
    title: "在思考中 / THINKING",
    advice: "答案通常不在想破頭的瞬間出現，而是在放空的時候浮現。",
    mission: "在紙巾或筆記本上寫下目前卡住你的一個關鍵字。",
    recommendedItems: ["抹茶提拉米蘇", "抹茶提拉米蘇鐵盒(600ml)", "經典原味巴斯克"]
  },
  create: {
    title: "想要創作 / CREATIVE",
    advice: "靈感是調皮的精靈。別抓它，用甜點誘捕它。",
    mission: "用 5 分鐘隨意塗鴉，不需要畫得像任何東西。",
    recommendedItems: ["奶酒提拉米蘇", "經典十勝低糖千層", "日本柚子米蘇"]
  }
};

// --- MBTI PERSONALIZED RECOMMENDATIONS ---
const MBTI_DESSERT_MAPPING: Record<string, { personality: string; recommendedItems: string[]; reason: string }> = {
  INTJ: {
    personality: "建築師",
    recommendedItems: ["抹茶提拉米蘇", "經典原味巴斯克", "經典十勝低糖千層"],
    reason: "你追求完美與深度，這些甜點層次豐富卻不過分張揚。"
  },
  INTP: {
    personality: "邏輯學家",
    recommendedItems: ["日本柚子米蘇", "烤布丁提拉米蘇", "蜜香紅茶巴斯克"],
    reason: "你喜歡探索新組合，這些創新口味會激發你的好奇心。"
  },
  ENTJ: {
    personality: "指揮官",
    recommendedItems: ["經典提拉米蘇鐵盒(600ml)", "奶酒提拉米蘇", "經典提拉米蘇"],
    reason: "你喜歡經典且有影響力的選擇，這些甜點強勁而直接。"
  },
  ENTP: {
    personality: "辯論家",
    recommendedItems: ["日本柚子米蘇", "奶酒提拉米蘇", "抹茶提拉米蘇鐵盒(600ml)"],
    reason: "你熱愛挑戰常規，這些創新口味符合你的冒險精神。"
  },
  INFJ: {
    personality: "提倡者",
    recommendedItems: ["抹茶提拉米蘇", "蜜香紅茶巴斯克", "烤布丁(附焦糖液)"],
    reason: "你重視內在與意義，這些甜點含蓄而深刻。"
  },
  INFP: {
    personality: "調停者",
    recommendedItems: ["烤布丁(附焦糖液)", "日本柚子米蘇", "蜜香紅茶巴斯克"],
    reason: "你的溫柔需要同樣溫暖的甜點來呼應。"
  },
  ENFJ: {
    personality: "主人公",
    recommendedItems: ["經典提拉米蘇鐵盒(600ml)", "日本柚子米蘇", "經典原味巴斯克"],
    reason: "你熱愛分享與連結，這些甜點適合與人共享。"
  },
  ENFP: {
    personality: "競選者",
    recommendedItems: ["日本柚子米蘇", "經典十勝低糖千層", "奶酒提拉米蘇"],
    reason: "你的自由精神需要同樣有趣的甜點來搭配。"
  },
  ISTJ: {
    personality: "物流師",
    recommendedItems: ["經典提拉米蘇", "經典原味巴斯克", "烤布丁(附焦糖液)"],
    reason: "你信賴經典，這些傳統甜點經得起時間考驗。"
  },
  ISFJ: {
    personality: "守衛者",
    recommendedItems: ["烤布丁(附焦糖液)", "蜜香紅茶巴斯克", "經典提拉米蘇"],
    reason: "你的細心值得同樣用心製作的甜點。"
  },
  ESTJ: {
    personality: "總經理",
    recommendedItems: ["經典提拉米蘇鐵盒(600ml)", "經典提拉米蘇", "經典原味巴斯克"],
    reason: "你重視效率與品質，這些經典款值得信賴。"
  },
  ESFJ: {
    personality: "執政官",
    recommendedItems: ["經典提拉米蘇鐵盒(600ml)", "經典原味巴斯克", "烤布丁提拉米蘇"],
    reason: "你善於照顧他人，這些甜點適合與朋友分享。"
  },
  ISTP: {
    personality: "鑑賞家",
    recommendedItems: ["奶酒提拉米蘇", "日本柚子米蘇", "經典十勝低糖千層"],
    reason: "你喜歡探索新事物，這些口味會帶來驚喜。"
  },
  ISFP: {
    personality: "探險家",
    recommendedItems: ["抹茶提拉米蘇", "日本柚子米蘇", "蜜香紅茶巴斯克"],
    reason: "你的藝術靈魂需要同樣美麗的甜點。"
  },
  ESTP: {
    personality: "企業家",
    recommendedItems: ["奶酒提拉米蘇", "經典提拉米蘇鐵盒(600ml)", "日本柚子米蘇"],
    reason: "你的能量需要同樣強勁的甜點來匹配。"
  },
  ESFP: {
    personality: "表演者",
    recommendedItems: ["日本柚子米蘇", "經典提拉米蘇鐵盒(600ml)", "奶酒提拉米蘇"],
    reason: "你的熱情需要同樣歡樂的甜點來慶祝。"
  }
};

// --- TRACKING (Cross-site) ---
const track = (event: string, payload: any = {}) => {
  trackEvent(event, payload);
  if (import.meta.env.DEV) {
    console.log(`[Track] ${event}`, payload);
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
  // 僅甜點目錄頁：/menu 路徑只顯示目錄（與 Dessert-Booking / LINE 共用連結）
  const [onlyMenuView] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/menu');
  const [headerImage, setHeaderImage] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showStory, setShowStory] = useState(false); // Original Easter Egg Modal (deprecated)
  const [showProfile, setShowProfile] = useState(false); // Profile Modal

  // Easter Egg System
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [currentEasterEgg, setCurrentEasterEgg] = useState<number | null>(null);
  const [foundEggs, setFoundEggs] = useState<number[]>([]);
  const isEasterEggComplete = foundEggs.length >= 8;
  const easterEggRewardUrl = CONFIG.LINKS.easter_egg_reward_url || CONFIG.LINKS.wallpaper_url;
  const mbtiLabUrl = buildUtmUrl(CONFIG.LINKS.mbti_lab_url, {
    medium: 'profile-card',
    campaign: '2026-q1-integration',
    content: 'profile_mbti_link',
    additionalParams: { from: 'moon-map' },
  });
  const passportUrl = buildUtmUrl(CONFIG.LINKS.passport_url, {
    medium: 'hero-checkin',
    campaign: '2026-q1-integration',
    content: 'checkin',
    additionalParams: { from: 'moon-map' },
  });
  const bookingMenuUrl = buildUtmUrl(CONFIG.LINKS.booking_url, {
    medium: 'menu-section',
    campaign: '2026-q1-integration',
    content: 'order_cta',
    additionalParams: { from: 'moon-map' },
  });
  const mbtiRecommendationUrl = buildUtmUrl(CONFIG.LINKS.mbti_lab_url, {
    medium: 'recommendation',
    campaign: '2026-q1-integration',
    content: 'personalized',
    additionalParams: { from: 'moon-map' },
  });
  const mbtiMissionUrl = buildUtmUrl(CONFIG.LINKS.mbti_lab_url, {
    medium: 'mission_card',
    campaign: '2026-q1-integration',
    content: 'cross_site',
    additionalParams: { from: 'moon-map' },
  });

  useEffect(() => {
    trackUtmLanding();
  }, []);

  // 彩蛋每月 renew：每月 1 號起用新月份 key，自動清空讓大家重新找
  const EGGS_RENEW_KEY = 'moonmoon_eggs_renew_month';
  useEffect(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const storedMonth = localStorage.getItem(EGGS_RENEW_KEY);
    if (storedMonth !== monthKey) {
      localStorage.removeItem('moonmoon_found_eggs');
      localStorage.setItem(EGGS_RENEW_KEY, monthKey);
      setFoundEggs([]);
      return;
    }
    const saved = localStorage.getItem('moonmoon_found_eggs');
    if (saved) {
      try {
        setFoundEggs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse found eggs:', e);
      }
    }
  }, []);

  // Save found eggs to localStorage
  const markEggAsFound = (eggId: number) => {
    if (!foundEggs.includes(eggId)) {
      const newFound = [...foundEggs, eggId];
      setFoundEggs(newFound);
      localStorage.setItem('moonmoon_found_eggs', JSON.stringify(newFound));
    }
  };

  // Easter Egg Data
  const EASTER_EGGS = [
    {
      id: 1,
      title: '意外的第 101 下',
      content: `Kiwimu 的誕生純屬意外。

甜點師本來只想打發 100 下，結果手滑多打了一下。

那一瞬間，鮮奶油突然覺得「我不當食材了！」，於是長出了腳，跳出了鋼盆。`
    },
    {
      id: 2,
      title: '名字的真相',
      content: `很多人問為什麼叫 Moon Moon。

其實那不是月亮，而是你嘴巴塞滿蛋糕時，
想說「好吃」卻發不清楚的聲音：
「Mmm... Moon... Moon...」`
    },
    {
      id: 3,
      title: '關於身材',
      content: `「我這不是胖，是蓬鬆。」
「我是由 90% 的空氣組成的，所以嚴格來說，我比你還輕。」`
    },
    {
      id: 4,
      title: '關於夏天',
      content: `「麻煩冷氣再開強一點。」
「那個靠近窗邊的客人，你的熱情讓我有點融化了。物理上的那種。」`
    },
    {
      id: 5,
      title: '特殊海域',
      content: `月島周圍的海水不是鹹的。
據說是伯爵茶口味的。
下次漲潮的時候，你可以偷偷沾一點試試看。`
    },
    {
      id: 6,
      title: '入島限制',
      content: `這座島有載重限制。
不是體重的重量，是心事的重量。
如果你心事太重，島會稍微下沉個 5 公分，直到你吃完甜點為止。`
    },
    {
      id: 7,
      title: '險些被吃掉',
      content: `上週有個客人點了巴斯克。
Kiwimu 剛好在旁邊睡午覺，被誤認為是一坨裝飾用的鮮奶油。
幸好在叉子落下的前一秒，他嚇醒飛走了，但屁股還是少了一角。`
    },
    {
      id: 8,
      title: '落枕危機',
      content: `Kiwimu 昨天睡姿不良。
導致那一區的鮮奶油變硬了（結塊）。
他現在頭轉不回來，走路只能一直往左邊偏。`
    }
  ];

  // Open Easter Egg
  const openEasterEgg = (eggId: number) => {
    setCurrentEasterEgg(eggId);
    setShowEasterEgg(true);
    markEggAsFound(eggId);
    track('easter_egg_found', { egg_id: eggId });
  };
  const [liffReady, setLiffReady] = useState(false);
  const [isLiff, setIsLiff] = useState(false);

  // --- CHECKOUT STATES ---
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [orderNote, setOrderNote] = useState('');
  // New "Smart Form" Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // 計算最小可選日期（兩天後）
  const getMinPickupDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 2); // 兩天後
    return today.toISOString().split('T')[0];
  };

  // 檢查日期是否為週一（公休日）
  const isMonday = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString + 'T00:00:00');
    return date.getDay() === 1; // 1 = 週一
  };

  // 處理日期變更，如果選到週一則提示並清空
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (isMonday(selectedDate)) {
      alert('抱歉，週一為公休日，請選擇其他日期。\n營業時間：週二-週日 13:00-19:00');
      setPickupDate('');
    } else {
      setPickupDate(selectedDate);
    }
  };

  // Store UTM params on page load (not on checkout)
  const [storedUTMParams, setStoredUTMParams] = useState<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    utm_term: string | null;
    referrer: string | null;
  } | null>(null);

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
        (window as any).gtag('get', 'G-TMRJ21C1GK', 'client_id', (id: string) => {
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
                image: getMenuImageUrl(item.image_url ?? item.image ?? item.image_path ?? item.imageUrl ?? null),
                description: item.description, // New Description Field
                prices: sortedVariants || []
              };
            })
          }));
          setMenuCategories(combined);
          // 預設：從 /menu 進來則全部展開（可直接點品項）；其餘頁面則收起
          const isOnlyMenuUrl = typeof window !== 'undefined' && window.location.pathname === '/menu';
          setCollapsedCategories(isOnlyMenuUrl ? new Set() : new Set(combined.map(cat => cat.id)));
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

  // AUTO-OPEN MENU: 僅 hash #menu 時開 modal；路徑 /menu 用 onlyMenuView 渲染僅目錄頁
  useEffect(() => {
    if (window.location.hash === '#menu') {
      setShowMenu(true);
    }
  }, []);

  // /menu 專用：分頁標題讓 LINE、Google 連結預覽顯示「甜點目錄」
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/menu') {
      const prev = document.title;
      document.title = '月島甜點 | 甜點目錄';
      return () => { document.title = prev; };
    }
  }, []);

  // Store UTM params on page load (before user navigates)
  useEffect(() => {
    const params = getUTMParams();
    setStoredUTMParams(params);
    console.log('Stored UTM params:', params);
  }, []);

  // Collapsible state: Set containing IDs of collapsed categories.  
  // Default: all collapsed (empty means show, so we initialize with all category IDs)
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

        // GA4: Track remove from cart
        track('remove_from_cart', {
          currency: 'TWD',
          value: parseInt(price.replace(/[^\d]/g, ''), 10),
          items: [{
            item_name: itemName,
            item_variant: spec,
            price: parseInt(price.replace(/[^\d]/g, ''), 10),
            quantity: 1
          }]
        });

        return newCart;
      } else {
        // If not exists, add it (Toggle On)

        // GA4: Track add to cart
        track('add_to_cart', {
          currency: 'TWD',
          value: parseInt(price.replace(/[^\d]/g, ''), 10),
          items: [{
            item_name: itemName,
            item_variant: spec,
            price: parseInt(price.replace(/[^\d]/g, ''), 10),
            quantity: 1
          }]
        });

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

    // GA4: Track begin checkout
    const totalAmount = cart.reduce((sum, item) => {
      return sum + parseInt(item.price.replace(/[^\d]/g, ''), 10) * item.count;
    }, 0);

    track('begin_checkout', {
      currency: 'TWD',
      value: totalAmount,
      items: cart.map(item => ({
        item_name: item.name,
        item_variant: item.spec,
        price: parseInt(item.price.replace(/[^\d]/g, ''), 10),
        quantity: item.count
      }))
    });

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

    // 驗證取貨日期（兩天後 + 不是週一）
    const minDate = getMinPickupDate();
    if (pickupDate < minDate) {
      alert('取貨日期至少需要兩天前預訂');
      return;
    }
    if (isMonday(pickupDate)) {
      alert('週一為公休日，請選擇其他日期');
      return;
    }

    // 2. Generate Order ID (Simple Timestamp-Random)
    const now = new Date();
    const datePart = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderId = `ORD${datePart}${randPart}`; // e.g., ORD0127042

    const totalAmount = calculateTotal();
    const gaClientId = getGAClientId();
    // Use stored UTM params (captured on page load) instead of reading at checkout
    const utmParams = storedUTMParams || getUTMParams();

    console.log('Order data being saved:', {
      order_note: orderNote,
      utm_source: utmParams.utm_source,
      utm_campaign: utmParams.utm_campaign,
      utm_medium: utmParams.utm_medium,
      referrer: utmParams.referrer
    });

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
          order_note: orderNote || null, // Explicitly save even if empty string
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

      // 6. Build LINE message with payment info
      let msg = `【月島甜點訂單確認】\n`;
      msg += `訂單編號：${orderId}\n`;
      msg += `訂購人：${customerName} (${customerPhone})\n`;
      msg += `總金額：$${totalAmount}\n`;
      msg += `取貨日期：${pickupDate}\n`;
      msg += `\n訂購內容：\n`;
      cart.forEach(item => {
        msg += `● ${item.name} | ${item.spec} x ${item.count}\n`;
      });
      if (orderNote) msg += `\n備註：${orderNote}`;
      msg += `\n\n付款方式：\n`;
      msg += `LINE Bank (824) 連線商業銀行\n`;
      msg += `帳號：111007479473\n`;
      msg += `備註欄請填寫：${orderId}\n`;
      msg += `\n付款完成後請回傳「後五碼」\n`;
      msg += `   （轉帳通知中的後五碼數字）`;

      // 7. Redirect to LINE
      const encodedMsg = encodeURIComponent(msg);
      const lineUrl = `https://line.me/R/oaMessage/@931cxefd/?text=${encodedMsg}`;
      const liff = (window as any).liff;

      // Close modal and clear cart
      setShowCheckoutConfirm(false);
      clearCart();

      // Redirect to LINE - 直接跳轉，不顯示 alert
      try {
        // 直接跳轉到 LINE，無論是否在 LINE app 內
        // 如果在 LINE app 內，會直接打開對話
        // 如果在瀏覽器內，會跳轉到 LINE 網頁版或提示下載 LINE app
        window.location.href = lineUrl;
      } catch (error) {
        console.error('LINE redirect error:', error);
        // 如果跳轉失敗，才顯示簡短提示並複製訊息到剪貼簿
        if (navigator.clipboard) {
          navigator.clipboard.writeText(msg).then(() => {
            alert(`訂單已建立！訂單編號：${orderId}\n\n已複製訂單訊息到剪貼簿，請開啟 LINE 並貼上傳送。`);
          }).catch(() => {
            alert(`訂單已建立！訂單編號：${orderId}\n\n請手動開啟 LINE 並傳送以下訊息：\n\n${msg}`);
          });
        } else {
          alert(`訂單已建立！訂單編號：${orderId}\n\n請手動開啟 LINE 並傳送以下訊息：\n\n${msg}`);
        }
      }



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

    // 不再使用隨機推薦，改為使用 STATE_DATA 中的固定推薦商品列表
    setRecommendation(''); // 不需要推薦字串，使用商品列表

    // Tiny delay for visual feedback
    setTimeout(() => {
      setShowResult(true);
      track('view_mission_card', { state: stateKey });
      const mbtiData = profile?.mbti_type && MBTI_DESSERT_MAPPING[profile.mbti_type];
      track('view_recommendations', {
        recommendation_type: mbtiData ? 'mbti' : 'mood',
        mbti_type: profile?.mbti_type || null,
        mood_state: stateKey
      });
    }, 100);
  };

  const handleDownloadCard = () => {
    if (!selectedState) return;
    track('generate_mission_card', { state: selectedState });

    const data = STATE_DATA[selectedState];
    const mbtiData = profile?.mbti_type && MBTI_DESSERT_MAPPING[profile.mbti_type];
    const recommendedItemsForCard = mbtiData ? mbtiData.recommendedItems : data.recommendedItems;

    const width = 400;
    const height = 600;

    // 1. Create SVG String with recommended products
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="${CONFIG.BRAND_COLORS.creamWhite}"/>
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="white" stroke="black" stroke-width="2" stroke-dasharray="5,5"/>
        <rect x="0" y="0" width="${width}" height="10" fill="${CONFIG.BRAND_COLORS.moonYellow}"/>
        <text x="40" y="60" font-family="Arial, sans-serif" font-size="14" fill="#666">MOON MOON MISSION CARD</text>
        <text x="40" y="100" font-family="Arial, sans-serif" font-weight="bold" font-size="16" fill="#000">STATE:</text>
        <text x="40" y="130" font-family="Arial, sans-serif" font-size="20" fill="${CONFIG.BRAND_COLORS.emotionBlack}">${data.title}</text>
        
        <line x1="40" y1="150" x2="360" y2="150" stroke="#ddd" stroke-width="1"/>
        
        <text x="40" y="180" font-family="Arial, sans-serif" font-weight="bold" font-size="14" fill="#000">為你推薦 RECOMMENDED:</text>
        <text x="40" y="205" font-family="Arial, sans-serif" font-size="13" fill="#333">• ${recommendedItemsForCard[0]}</text>
        <text x="40" y="230" font-family="Arial, sans-serif" font-size="13" fill="#333">• ${recommendedItemsForCard[1]}</text>
        <text x="40" y="255" font-family="Arial, sans-serif" font-size="13" fill="#333">• ${recommendedItemsForCard[2]}</text>
        
        <line x1="40" y1="280" x2="360" y2="280" stroke="#ddd" stroke-width="1"/>
        
        <rect x="40" y="295" width="320" height="100" fill="#f9f9f9" stroke="#ddd" stroke-width="1"/>
        <text x="60" y="320" font-family="Arial, sans-serif" font-weight="bold" font-size="14" fill="#000">YOUR MISSION:</text>
        <text x="60" y="345" font-family="Arial, sans-serif" font-size="12" fill="#333">${data.mission.substring(0, 40)}</text>
        <text x="60" y="370" font-family="Arial, sans-serif" font-size="12" fill="#333">${data.mission.substring(40)}</text>
        
        <rect x="40" y="420" width="320" height="100" fill="${CONFIG.BRAND_COLORS.moonYellow}" stroke="black" stroke-width="2"/>
        <text x="60" y="450" font-family="Arial, sans-serif" font-weight="bold" font-size="16" fill="#000">兌換券 COUPON</text>
        <text x="60" y="475" font-family="Arial, sans-serif" font-size="13" fill="#000">完成任務來店出示此卡</text>
        <text x="60" y="498" font-family="Arial, sans-serif" font-size="13" fill="#000">即可兌換「烤布丁一個」</text>
        
        <text x="40" y="560" font-family="monospace" font-size="11" fill="#999">VALID FOR 24 HOURS | moon-island.vercel.app</text>
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
      try {
        if (!ctx) {
          throw new Error('Canvas context not available');
        }

        ctx.fillStyle = CONFIG.BRAND_COLORS.creamWhite;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);

        // Export as PNG
        const pngUrl = canvas.toDataURL('image/png');

        // 檢測是否為手機
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          // 手機：開啟新視窗顯示圖片，讓用戶長按保存
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>任務卡 - 長按保存</title>
                <style>
                  body { 
                    margin: 0; 
                    padding: 20px; 
                    background: #f5f5f5; 
                    text-align: center;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  }
                  h2 { color: #333; margin: 20px 0; font-size: 20px; }
                  img { 
                    max-width: 100%; 
                    height: auto; 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    border-radius: 8px;
                    margin: 20px 0;
                  }
                  .tip {
                    background: ${CONFIG.BRAND_COLORS.moonYellow};
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-size: 16px;
                    line-height: 1.6;
                  }
                  .close-btn {
                    background: #333;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    margin-top: 20px;
                    cursor: pointer;
                  }
                </style>
              </head>
              <body>
                <h2>你的任務卡已生成</h2>
                <div class="tip">
                  <strong>保存方式：</strong><br/>
                  長按下方圖片 → 選擇「儲存影像」或「下載圖片」
                </div>
                <img src="${pngUrl}" alt="Mission Card" />
                <button class="close-btn" onclick="window.close()">關閉此頁面</button>
              </body>
              </html>
            `);
            newWindow.document.close();
          } else {
            // 如果彈窗被阻擋，使用替代方案
            alert('任務卡已生成。\n\n請允許彈出視窗，或直接截圖保存此畫面。\n\n小提示：在瀏覽器設定中允許彈出視窗，下次就能直接顯示圖片。');
          }
        } else {
          // 電腦：直接下載
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `月島任務卡_${data.title.split('/')[0].trim()}_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          alert('任務卡已下載到電腦。\n\n請查看下載資料夾。');
        }

        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Canvas rendering error:', error);
        URL.revokeObjectURL(url);
        alert('圖片生成失敗。請稍後再試，或直接截圖保存。');
      }
    };

    img.onerror = (error) => {
      console.error('Image loading error:', error);
      URL.revokeObjectURL(url);
      alert('圖片載入失敗。請檢查網路連線或稍後再試。');
    };

    img.src = url;
  };

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  // 甜點目錄區塊（modal 與 /menu 僅目錄頁共用）
  const menuBodyContent = menuCategories.map((cat) => {
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
              <div key={idx} className="menu-item">
                {item.image && (
                  <div style={{
                    width: '100%',
                    height: '200px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                    cursor: 'pointer'
                  }}
                    onClick={() => setExpandedItem(expandedItem === item.name ? null : item.name)}
                  >
                    <img
                      src={item.image || ''}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 'bold' }}>{item.name}</h4>
                  {item.description && (
                    <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.6', marginBottom: '12px', whiteSpace: 'pre-line' }}>
                      {item.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {cat.id === 'drinks' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert('飲品僅供店內飲用，不開放預訂。\n\n歡迎來店品嚐！\n營業時間：週三-週日 13:00-19:00');
                        }}
                        style={{
                          fontSize: '0.8rem',
                          color: '#999',
                          fontStyle: 'italic',
                          padding: '8px 12px',
                          background: 'rgba(0,0,0,0.03)',
                          border: '1px dashed #ccc',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#999'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = '#ccc'; }}
                      >
                        僅供店內飲用 / In-store Only
                      </button>
                    ) : (
                      item.prices && item.prices.length > 0 ? (
                        item.prices.map((p, pIdx) => {
                          const inCart = cart.find(c => c.name === item.name && c.spec === p.spec);
                          return (
                            <button
                              key={pIdx}
                              className="font-mono"
                              onClick={(e) => { e.stopPropagation(); addToCart(item.name, p.spec, p.price); }}
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
                              }}
                            >
                              {p.spec}: {p.price} {inCart ? '(已選)' : ''}
                            </button>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic', padding: '4px 0' }}>暫無規格</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  });

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
          background: var(--c-blue);
          color: white;
          padding: 16px; border-radius: 40px; font-weight: bold;
          min-height: 50px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          position: relative; overflow: hidden;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .btn-primary:hover {
          background: #238f82;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
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
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.85);
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
        .state-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .state-btn.selected {
          background: var(--c-yellow);
          border-color: rgba(0, 0, 0, 0.2);
          color: var(--c-black);
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2);
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
          box-shadow: var(--shadow-glass), inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 0 1px rgba(216, 224, 56, 0.15);
          border-radius: 20px;
          padding: 24px;
          margin-top: 30px;
          animation: fadeIn 0.5s ease forwards;
          opacity: 0;
          position: relative;
          overflow: hidden;
        }
        .result-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
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
          position: fixed;
          top: 20px;
          right: 20px;
          width: 80px;
          animation: float 6s ease-in-out infinite;
          z-index: 100;
          transition: transform 0.3s ease;
          cursor: pointer;
        }
        .header-bird img {
          pointer-events: auto;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
        }
        .header-bird:hover {
          transform: scale(1.1);
        }
        .header-bird.modal-open {
          animation: none;
          opacity: 0.2;
          pointer-events: none;
        }
                .easter-egg-icon {
          opacity: 0.22;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .easter-egg-icon.found {
          opacity: 1 !important;
          filter: drop-shadow(0 0 8px rgba(216, 224, 56, 0.9));
        }
@media (max-width: 768px) {
          .header-bird {
            top: 15px;
            right: 15px;
            width: 60px;
          }
        }
      `}</style>

      <div className="container">
        {/* 僅甜點目錄網址 /menu：全螢幕目錄，購物車與結帳 modal 仍在上層 */}
        {onlyMenuView && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: CONFIG.BRAND_COLORS.creamWhite,
            overflow: 'auto',
            padding: '20px',
            paddingBottom: '120px'
          }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>月島甜點 | 甜點目錄</h1>
              <a href="/" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>回首頁</a>
            </header>
            <div>
              {menuBodyContent}
            </div>
          </div>
        )}

        <div
          onClick={() => {
            track('click_easter_egg_progress_badge');
            if (isEasterEggComplete) {
              alert(`🎉 你已集滿 8 顆彩蛋！

點下方的「已解鎖限定桌布」
即可領取獎勵。`);
              return;
            }
            alert(`🥚 彩蛋收集進度

已發現: ${foundEggs.length}/8

提示：仔細觀察頁面中那些
看似不起眼的小圖標...

他們藏著 Kiwimu 的秘密 ✨`);
          }}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 2000,
            display: onlyMenuView ? 'none' : undefined,
            background: CONFIG.BRAND_COLORS.moonYellow,
            color: '#000',
            border: '2px solid #000',
            borderRadius: '999px',
            padding: '6px 12px',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.2)',
            cursor: 'pointer'
          }}
          title="彩蛋收集進度"
        >
          🥚 {foundEggs.length}/8
        </div>
        {isEasterEggComplete && !onlyMenuView && (
          <button
            onClick={() => {
              track('click_easter_egg_reward');
              document.getElementById('wallpaper-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              position: 'fixed',
              top: '52px',
              left: '16px',
              zIndex: 2000,
              background: '#000',
              color: '#fff',
              border: '2px solid #000',
              borderRadius: '999px',
              padding: '6px 12px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              boxShadow: '3px 3px 0 rgba(0,0,0,0.2)',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
            title="下載限定桌布"
          >
            🎁 已解鎖限定桌布
          </button>
        )}

        {/* A. HERO */}
        <header style={{ paddingTop: '80px', paddingBottom: '20px', position: 'relative' }}>
          {/* CURRENT EXHIBITION BANNER - Moved to Top */}
          <div style={{
            marginBottom: '30px',
            padding: '20px',
            background: CONFIG.BRAND_COLORS.moonYellow,
            border: '2px solid black',
            fontSize: '0.9rem',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.1)'
          }}>
            <span className="font-mono" style={{ display: 'block', marginBottom: '8px', fontSize: '0.7rem', letterSpacing: '0.1em' }}>CURRENT EXHIBITION / 2026 Q1</span>
            <strong style={{ fontSize: '1.1rem' }}>{CONFIG.CURRENT_SEASON}</strong>
          </div>

          <div
            className={`header-bird ${showEasterEgg ? 'modal-open' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              track('click_easter_egg');
              openEasterEgg(4);
            }}
            style={{ cursor: 'pointer' }}
            title="Kiwimu?"
          >
            <img src={headerImage || "https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744158/Enter-05_nrt403.webp"} alt="Kiwimu" style={{ width: '100%', height: 'auto' }} />
          </div>
          <div className="font-mono" style={{
            marginBottom: '10px',
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 10
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

          <p style={{ color: CONFIG.BRAND_COLORS.grayText, marginBottom: '40px', position: 'relative' }}>
            {CONFIG.TAGLINE}
            {/* Easter Egg #5 - 島主筆記 */}
            <img
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-03_juymmq.webp"
              alt=""
              className={`easter-egg-icon ${foundEggs.includes(5) ? 'found' : ''}`}
              onClick={() => openEasterEgg(5)}
              style={{
                display: 'inline-block',
                marginLeft: '8px',
                width: '18px',
                height: '18px',
                opacity: 0.25,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                verticalAlign: 'middle'
              }}
              onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.3) rotate(10deg)'; }}
              onMouseOut={(e) => { e.currentTarget.style.opacity = '0.25'; e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
            />
          </p>

          <a href={passportUrl} target="_blank" rel="noreferrer" className="btn-entry" onClick={() => track('click_hero_checkin')}>
            <div>
              <span className="font-mono text-blue" style={{ fontSize: '1rem' }}>01 // INTERACT</span><br />
              <strong>我想登島互動 (Check-in)</strong>
            </div>
            <span>↗</span>
          </a>
          <button className="btn-entry" onClick={() => {
            track('click_hero_pickup');
            document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>
            <div>
              <span className="font-mono" style={{ fontSize: '1rem' }}>02 // PICKUP</span><br />
              <strong>我想帶走甜點 (預訂取貨)</strong>
            </div>
            <span>↓</span>
          </button>
          <button className="btn-entry" onClick={() => {
            track('click_hero_music');
            document.getElementById('spotify-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}>
            <div>
              <span className="font-mono text-yellow" style={{ fontSize: '1rem' }}>03 // MUSIC</span><br />
              <strong>聽這一季音樂 (島嶼靜默)</strong>
            </div>
            <span>♫</span>
          </button>
          <button className="btn-entry" onClick={() => {
            track('click_hero_easter_egg_progress');
            alert(`🥚 彩蛋收集進度\n\n已發現: ${foundEggs.length}/8\n\n提示：仔細觀察頁面中那些\n看似不起眼的小圖標...\n\n他們藏著 Kiwimu 的秘密 ✨`);
          }}>
            <div>
              <span className="font-mono" style={{ fontSize: '1rem' }}>04 // DISCOVER</span><br />
              <strong>找尋彩蛋 ({foundEggs.length}/8)</strong>
            </div>
            <span>✨</span>
          </button>
        </header>

        {/* B. EXHIBITION STORY */}
        <section className="section-padding border-y" style={{ background: 'white', position: 'relative', overflow: 'hidden' }}>
          <h2 className="font-mono" style={{ marginBottom: '30px', textAlign: 'center' }}>ABOUT THIS EXHIBITION</h2>

          {/* Season Story */}
          <div style={{ marginBottom: '40px', padding: '30px', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee', position: 'relative' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', color: CONFIG.BRAND_COLORS.emotionBlack }}>Season 01: The Silence of Island</h3>
            <div style={{ lineHeight: '1.9', fontSize: '0.95rem', color: '#555' }}>
              <p style={{ marginBottom: '15px' }}>
                這一季，<strong>島嶼靜默</strong>。
              </p>
              <p style={{ marginBottom: '15px' }}>
                不是無聲，而是在喧囂之外，為你保留了一個可以停下來的空間。
              </p>
              <p style={{ marginBottom: '15px' }}>
                在這裡，你可以不必急著成為誰、不必急著回答什麼。只需要<span style={{ borderBottom: `2px solid ${CONFIG.BRAND_COLORS.moonYellow}` }}>感受此刻的自己</span>。
              </p>
              <p>
                每一份甜點都是一張「心情處方箋」，陪你確認當下的狀態，找到屬於你的療癒節奏。
              </p>
            </div>
            {/* Easter Egg #1 - 北海道誕生 */}
            <img
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-02_t83hem.webp"
              alt=""
              className={`easter-egg-icon ${foundEggs.includes(1) ? 'found' : ''}`}
              onClick={() => openEasterEgg(1)}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                width: '22px',
                height: '22px',
                opacity: 0.2,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseOut={(e) => { e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1)'; }}
            />
          </div>

          {/* Moon Moon Story */}
          <div style={{ padding: '25px', background: CONFIG.BRAND_COLORS.creamWhite, borderLeft: `4px solid ${CONFIG.BRAND_COLORS.moonYellow}`, position: 'relative' }}>
            <h3 className="font-mono" style={{ fontSize: '1.1rem', marginBottom: '15px' }}>MOON MOON 月島甜點店</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#666', marginBottom: '12px' }}>
              月島不只是一間甜點店，更是一個<strong>情緒展覽空間</strong>。
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#666' }}>
              我們相信，每一口甜點都是一個故事，每一次品嚐都是一場與自己的對話。<br />
              <em style={{ fontSize: '0.85rem', color: '#999' }}>「每一季一個主題。你路過，也算參展。」</em>
            </p>
            {/* Easter Egg #3 - 為什麼叫 Kiwimu */}
            <img
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-03_juymmq.webp"
              alt=""
              className={`easter-egg-icon ${foundEggs.includes(3) ? 'found' : ''}`}
              onClick={() => openEasterEgg(3)}
              style={{
                position: 'absolute',
                bottom: '15px',
                right: '15px',
                width: '20px',
                height: '20px',
                opacity: 0.25,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.opacity = '0.25'; e.currentTarget.style.transform = 'scale(1)'; }}
            />
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

          {showResult && selectedState && (() => {
            const mbtiData = profile?.mbti_type && MBTI_DESSERT_MAPPING[profile.mbti_type];
            const recommendedItems = mbtiData ? mbtiData.recommendedItems : STATE_DATA[selectedState].recommendedItems;
            return (
              <div id="result-card" className="result-card" style={{ zIndex: 2, color: 'black' }}>
                <div className="font-mono" style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>MISSION CARD ISSUED</div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{STATE_DATA[selectedState].title}</h3>
                <p style={{ fontSize: '0.95rem', marginBottom: '20px', fontStyle: 'italic' }}>
                  "{STATE_DATA[selectedState].advice}"
                </p>

                {/* 個人化推薦：MBTI 或心情 */}
                <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  {mbtiData ? (
                    <>
                      <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>
                        專屬於 {mbtiData.personality} ({profile?.mbti_type}) 的你
                      </strong>
                      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px', fontStyle: 'italic' }}>
                        {mbtiData.reason}
                      </p>
                    </>
                  ) : (
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>為你推薦 RECOMMENDED:</strong>
                  )}
                  {recommendedItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '8px', paddingLeft: '10px', fontSize: '0.95rem' }}>
                      • {item}
                    </div>
                  ))}
                  {!mbtiData && (
                    <a
                      href={mbtiRecommendationUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track('click_mbti_cta', { source: 'recommendation_cta', state: selectedState })}
                      style={{ fontSize: '0.8rem', color: CONFIG.BRAND_COLORS.emotionBlack, marginTop: '10px', display: 'block', fontWeight: 'bold', borderBottom: `2px solid ${CONFIG.BRAND_COLORS.moonYellow}` }}
                    >
                      完成 MBTI 測驗，獲得更精準推薦
                    </a>
                  )}
                </div>

                {/* MBTI 測驗引流 */}
                <a
                  href={mbtiMissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-small"
                  onClick={() => track('click_mbti_cta', { source: 'mission_card', state: selectedState })}
                  style={{
                    marginBottom: '20px',
                    background: CONFIG.BRAND_COLORS.moonYellow,
                    color: CONFIG.BRAND_COLORS.emotionBlack,
                    border: '2px solid #000',
                    textAlign: 'center',
                    display: 'block',
                    padding: '14px 20px',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 0 rgba(0,0,0,0.2)'
                  }}
                >
                  想更了解自己？探索你的 MBTI 甜點人格
                </a>

                {/* 任務 */}
                <div style={{ marginBottom: '24px' }}>
                  <strong style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: '#999',
                    marginBottom: '10px',
                    letterSpacing: '0.08em',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}>YOUR MISSION</strong>
                  <p style={{
                    fontSize: '0.95rem',
                    lineHeight: '1.65',
                    color: '#333',
                    margin: 0
                  }}>{STATE_DATA[selectedState].mission}</p>
                </div>



                {/* 下載按鈕 */}
                <button className="btn-primary" onClick={handleDownloadCard}>
                  下載展籤 DOWNLOAD CARD
                </button>
              </div>
            );
          })()}
          {/* Easter Egg #7 - 險些被吃掉 */}
          <img
            src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-03_juymmq.webp"
            alt=""
            className={`easter-egg-icon ${foundEggs.includes(7) ? 'found' : ''}`}
            onClick={() => openEasterEgg(7)}
            style={{
              position: 'absolute',
              bottom: '18px',
              right: '18px',
              width: '22px',
              height: '22px',
              opacity: 0.25,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              zIndex: 3
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2) rotate(8deg)'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '0.25'; e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
          />

        </div>

        {/* E. SOFT BUY (MENU ENTRY) */}
        <section id="menu-section" className="section-padding border-t" style={{ background: '#fcfcfc', scrollMarginTop: '20px', position: 'relative' }}>
          <h2 className="font-mono" style={{ marginBottom: '20px', textAlign: 'center' }}>ARCHIVE / COLLECTION</h2>

          {/* Easter Egg #6 - 秘密配方 */}
          <img
            src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-02_t83hem.webp"
            alt=""
            className={`easter-egg-icon ${foundEggs.includes(6) ? 'found' : ''}`}
            onClick={() => openEasterEgg(6)}
            style={{
              position: 'absolute',
              left: '20px',
              top: '20px',
              width: '24px',
              height: '24px',
              opacity: 0.2,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              zIndex: 10
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.25) rotate(-10deg)'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
          />

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
              track('view_item_list', {
                item_list_name: 'main_menu'
              });
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

          <a
            href={bookingMenuUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-entry"
            style={{ marginTop: '16px' }}
            onClick={() => track('click_menu_order')}
          >
            <div>
              <span className="font-mono text-yellow" style={{ fontSize: '0.8rem' }}>ORDER NOW</span><br />
              <strong>前往線上訂購 (Online Booking)</strong>
            </div>
            <span>↗</span>
          </a>

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
              <div id="spotify-section" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', background: 'white', scrollMarginTop: '80px', position: 'relative' }}>
                {/* Easter Egg #2 - 神秘好友 */}
                <img
                  src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-03_juymmq.webp"
                  alt=""
                  className={`easter-egg-icon ${foundEggs.includes(2) ? 'found' : ''}`}
                  onClick={() => openEasterEgg(2)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '8px',
                    width: '22px',
                    height: '22px',
                    opacity: 0.25,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    zIndex: 10
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.3)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.opacity = '0.25'; e.currentTarget.style.transform = 'scale(1)'; }}
                />
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

                {/* Wallpaper (multi) with lock state */}
                <div
                  id="wallpaper-section"
                  style={{
                    borderRadius: '12px',
                    padding: '18px 16px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    background: 'rgba(255,255,255,0.6)',
                    scrollMarginTop: '100px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <span className="font-mono text-yellow" style={{ fontSize: '0.75rem' }}>DOWNLOAD</span><br />
                      <strong>WALLPAPER (桌布)</strong>
                    </div>
                    {isEasterEggComplete ? (
                      <span style={{ opacity: 0.6 }}>🔓</span>
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>🔒</span>
                    )}
                  </div>

                  {!isEasterEggComplete && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '10px',
                      padding: '20px',
                      textAlign: 'center',
                      border: '2px dashed rgba(0, 0, 0, 0.1)',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
                        桌布已鎖定
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666', lineHeight: '1.6' }}>
                        找到全部 8 顆彩蛋即可解鎖<br />
                        <strong style={{ color: CONFIG.BRAND_COLORS.moonYellow, background: '#000', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '8px' }}>
                          目前進度：{foundEggs.length}/8
                        </strong>
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '10px',
                    filter: isEasterEggComplete ? 'none' : 'blur(8px) grayscale(1)',
                    pointerEvents: isEasterEggComplete ? 'auto' : 'none',
                    opacity: isEasterEggComplete ? 1 : 0.4,
                    transition: 'all 0.5s ease'
                  }}>
                    {WALLPAPERS.map((wp) => (
                      <a key={wp.label} href={wp.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '10px',
                          padding: '10px',
                          background: '#fff',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}>
                          <div style={{
                            width: '100%',
                            height: '70px',
                            borderRadius: '8px',
                            backgroundImage: `url(${wp.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            marginBottom: '8px'
                          }} />
                          <div className="font-mono" style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px' }}>{wp.label}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111' }}>DOWNLOAD</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

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
                  border: '1px dashed #ccc',
                  position: 'relative'
                }}>
                  <strong className="font-mono">PROJECT LOADING... (準備中)</strong>
                  <img
                    src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-02_t83hem.webp"
                    alt=""
                    className={`easter-egg-icon ${foundEggs.includes(8) ? 'found' : ''}`}
                    onClick={() => openEasterEgg(8)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      width: '20px',
                      height: '20px',
                      opacity: 0.25,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '0.25'; e.currentTarget.style.transform = 'scale(1)'; }}
                  />
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
                {menuBodyContent}
              </div>
            </div>
          </div>
        )}

        {/* Easter Egg Modal - NEW */}
        {showEasterEgg && currentEasterEgg !== null && (
          <div
            className="modal-overlay"
            onClick={() => setShowEasterEgg(false)}
            style={{ zIndex: 3500, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}
          >
            <div
              className="result-card"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '420px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(30px) saturate(200%)',
                border: `3px solid ${CONFIG.BRAND_COLORS.moonYellow}`,
                borderRadius: '20px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.6)',
                padding: '35px 30px',
                color: CONFIG.BRAND_COLORS.emotionBlack
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '15px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>🥚</div>
                <h3 style={{
                  fontSize: '1.3rem',
                  color: CONFIG.BRAND_COLORS.emotionBlack,
                  marginBottom: '8px',
                  fontWeight: 700
                }}>
                  {EASTER_EGGS[currentEasterEgg - 1]?.title}
                </h3>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#888',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em'
                }}>
                  EASTER EGG #{currentEasterEgg}/8
                </p>
              </div>

              <div style={{
                lineHeight: '1.9',
                fontSize: '0.95rem',
                color: '#333',
                whiteSpace: 'pre-line',
                marginBottom: '25px',
                padding: '20px',
                background: 'rgba(248, 248, 248, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.05)'
              }}>
                {EASTER_EGGS[currentEasterEgg - 1]?.content}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px 20px',
                background: `linear-gradient(135deg, ${CONFIG.BRAND_COLORS.moonYellow}20, ${CONFIG.BRAND_COLORS.islandBlue}10)`,
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  收集進度
                </span>
                <strong style={{ fontSize: '1.1rem', color: CONFIG.BRAND_COLORS.emotionBlack }}>
                  {foundEggs.length} / 8
                </strong>
              </div>

              <button
                onClick={() => setShowEasterEgg(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: CONFIG.BRAND_COLORS.emotionBlack,
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = CONFIG.BRAND_COLORS.emotionBlack;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
              >
                繼續探索 ✨
              </button>
            </div>
          </div>
        )}


        {/* OLD Story Modal - Keep for header bird */}
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
                  請確認以下資訊正確，我們會用此資訊與您對帳。
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
                    min={getMinPickupDate()}
                    value={pickupDate}
                    onChange={handleDateChange}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>
                    *請選擇您要來店取貨的日期<br />
                    最快取貨日期：兩天後 | 週一公休<br />
                    營業時間：週二-週日 13:00-19:00
                  </p>
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
                      <span style={{ fontSize: '0.9rem' }}>
                        {profile?.mbti_type ? 'MBTI 測驗結果已同步' : '尚未同步 MBTI 結果'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <strong>跨站同步說明</strong><br />
                  在月島的所有網站（MBTI Lab、甜點店）都使用同一個帳號。<br />
                  無論您在哪裡更新資料，其他網站都會自動同步。
                </div>

                {/* Cross-site Links */}
                <div style={{ textAlign: 'center' }}>
                  <a
                    href={mbtiLabUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-block',
                      background: CONFIG.BRAND_COLORS.moonYellow,
                      color: CONFIG.BRAND_COLORS.emotionBlack,
                      padding: '12px 24px',
                      borderRadius: '24px',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      border: '2px solid #000',
                      boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => trackOutboundClick(mbtiLabUrl, 'profile_mbti_link')}
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
            background: CONFIG.BRAND_COLORS.emotionBlack,
            color: 'white',
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
              <button onClick={clearCart} style={{ fontSize: '0.8rem', textDecoration: 'underline', color: 'inherit', background: 'none', border: 'none', cursor: 'pointer' }}>清空</button>
              <button onClick={handleCheckout} style={{
                background: 'white',
                color: CONFIG.BRAND_COLORS.emotionBlack,
                padding: '8px 20px',
                borderRadius: '30px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                傳送預訂
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
