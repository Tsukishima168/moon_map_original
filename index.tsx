
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
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
    preorder_pickup_url: "https://shop.kiwimu.com",
    delivery_url: "https://shop.kiwimu.com",
    booking_url: "https://shop.kiwimu.com",
    passport_url: "https://passport.kiwimu.com",
    line_url: "https://lin.ee/MndRHE2",
    mbti_lab_url: "https://kiwimu.com",
    spotify_url: "https://open.spotify.com/playlist/moonmoon",
    wallpaper_url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902254/2026_01_abhw1m.jpg",
    easter_egg_reward_url: "#wallpaper-section",
    line_theme_url: "https://line.me/S/shop/theme/detail?id=6dafbfa5-b3db-4ac5-8616-a6c1dd46f1e9&lang=zh-Hant&ref=lsh_themeDetail",
    kiwimu_ig_url: "https://www.instagram.com/moon_moon_dessert/",
    instagram_moonmoon_url: "https://www.instagram.com/moon_moon_dessert/",
    address_text: "台南市安南區本原街一段97巷168號",
    hours_text: "Tue - Sun / 13:00 - 19:00",
    liff_id: "2008848603-ANGQX0GN",
    line_pay_qr_code: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1769531708/IMG_1967_k0ila8.png",
  }
};

// Wallpaper assets (Cloudinary)
const WALLPAPERS = [
  { label: "2026.01", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902254/2026_01_abhw1m.jpg" },
  { label: "2026.02", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902255/2026_02_qfvg9i.jpg" },
  { label: "Spring", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902362/New_year_ueuhsw.jpg" },
  { label: "Fortune", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902361/New_year-2_i9e9js.jpg" },
  { label: "2026.03", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902255/2026_03_tduocw.jpg" }
];

// In-store badge (GPS) config
const STORE_BADGE_REWARD_ID = 'store_visit_2026_q1';
const STORE_BADGE_CODE_KEY = 'moonmoon_store_visit_code';
const STORE_LOCATION = { lat: 23.0473181, lng: 120.1987003 }; // 月島甜點店座標
const STORE_RADIUS_METERS = 100; // 100 公尺範圍

// -- Fortune Slip (心情展籤) System --
const FORTUNES = [
  { level: '大吉', text: '新的一年，願你的煩惱像我的工作一樣少。' },
  { level: '中吉', text: '變胖沒關係，那是你對甜點尊重的重量。' },
  { level: '小吉', text: '把錢變成喜歡的形狀，例如千層蛋糕。' },
  { level: '吉', text: '今天的運氣，適合再來一顆布丁。' },
  { level: '大吉', text: '願你的財運，像台南的糖度一樣高。' },
  { level: '中吉', text: '工作可以低糖，但生活要全糖。' },
  { level: '吉', text: '老闆說，轉到這張的人，今年會變漂亮。' },
  { level: '小吉', text: '休息是為了走更長的路，吃甜點是為了不想走路。' },
  { level: '大吉', text: '恭喜，你今年的桃花運會跟鮮奶油一樣順滑。' },
  { level: '隱藏版', text: 'Kiwimu 覺得你今天長得很好看。' },
];
const FORTUNE_DATE_KEY = 'moonmoon_fortune_date';
const FORTUNE_RESULT_KEY = 'moonmoon_fortune_result';
function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getTodayFortune(): { level: string; text: string } | null {
  try {
    if (localStorage.getItem(FORTUNE_DATE_KEY) === getTodayKey()) {
      const s = localStorage.getItem(FORTUNE_RESULT_KEY);
      if (s) return JSON.parse(s);
    }
  } catch { /* */ }
  return null;
}
function drawAndSaveFortune(): { level: string; text: string } {
  const existing = getTodayFortune();
  if (existing) return existing;
  const drawn = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
  localStorage.setItem(FORTUNE_DATE_KEY, getTodayKey());
  localStorage.setItem(FORTUNE_RESULT_KEY, JSON.stringify(drawn));
  return drawn;
}

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

/** 粗略計算兩點距離（公尺） - Haversine */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const R = 6371000; // 地球半徑 (m)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    personality: "建築師 · 睿智巴斯貓",
    recommendedItems: ["抹茶提拉米蘇", "經典原味巴斯克", "經典十勝低糖千層"],
    reason: "你追求完美與深度，這些甜點層次豐富卻不過分張揚。"
  },
  INTP: {
    personality: "邏輯學家 · 睿智巴斯貓",
    recommendedItems: ["日本柚子米蘇", "烤布丁提拉米蘇", "蜜香紅茶巴斯克"],
    reason: "你喜歡探索新組合，這些創新口味會激發你的好奇心。"
  },
  ENTJ: {
    personality: "指揮官 · 睿智巴斯貓",
    recommendedItems: ["經典提拉米蘇鐵盒(600ml)", "奶酒提拉米蘇", "經典提拉米蘇"],
    reason: "你喜歡經典且有影響力的選擇，這些甜點強勁而直接。"
  },
  ENTP: {
    personality: "辯論家 · 睿智巴斯貓",
    recommendedItems: ["日本柚子米蘇", "奶酒提拉米蘇", "抹茶提拉米蘇鐵盒(600ml)"],
    reason: "你熱愛挑戰常規，這些創新口味符合你的冒險精神。"
  },
  INFJ: {
    personality: "提倡者 · 夢幻蛋鬼",
    recommendedItems: ["抹茶提拉米蘇", "蜜香紅茶巴斯克", "烤布丁(附焦糖液)"],
    reason: "你重視內在與意義，這些甜點含蓄而深刻。"
  },
  INFP: {
    personality: "調停者 · 夢夢幻蛋鬼",
    recommendedItems: ["烤布丁(附焦糖液)", "日本柚子米蘇", "蜜香紅茶巴斯克"],
    reason: "你的溫柔需要同樣溫暖的甜點來呼應。"
  },
  ENFJ: {
    personality: "主人公 · 夢幻蛋鬼",
    recommendedItems: ["經典提拉米蘇鐵盒(600ml)", "日本柚子米蘇", "經典原味巴斯克"],
    reason: "你熱愛分享與連結，這些甜點適合與人共享。"
  },
  ENFP: {
    personality: "競選者 · 活力奇異鳥",
    recommendedItems: ["日本柚子米蘇", "經典十勝低糖千層", "奶酒提拉米蘇"],
    reason: "你的自由精神需要同樣有趣的甜點來搭配。"
  },
  ISTJ: {
    personality: "物流師 · 活力奇異鳥",
    recommendedItems: ["經典提拉米蘇", "經典原味巴斯克", "烤布丁(附焦糖液)"],
    reason: "你信賴經典，這些傳統甜點經得起時間考驗。"
  },
  ISFJ: {
    personality: "守衛者 · 活力奇異鳥",
    recommendedItems: ["烤布丁(附焦糖液)", "蜜香紅茶巴斯克", "經典提拉米蘇"],
    reason: "你的細心值得同樣用心製作的甜點。"
  },
  ESTJ: {
    personality: "總經理 · 活力奇異鳥",
    recommendedItems: ["經典提拉米蘇鐵盒(600ml)", "經典提拉米蘇", "經典原味巴斯克"],
    reason: "你重視效率與品質，這些經典款值得信賴。"
  },
  ESFJ: {
    personality: "執政官 · 活力奇異鳥",
    recommendedItems: ["經典提拉米蘇鐵盒(600ml)", "經典原味巴斯克", "烤布丁提拉米蘇"],
    reason: "你善於照顧他人，這些甜點適合與朋友分享。"
  },
  ISTP: {
    personality: "鑑賞家 · 睿智巴斯貓",
    recommendedItems: ["奶酒提拉米蘇", "日本柚子米蘇", "經典十勝低糖千層"],
    reason: "你喜歡探索新事物，這些口味會帶來驚喜。"
  },
  ISFP: {
    personality: "探險家 · 夢幻蛋鬼",
    recommendedItems: ["抹茶提拉米蘇", "日本柚子米蘇", "蜜香紅茶巴斯克"],
    reason: "你的藝術靈魂需要同樣美麗的甜點。"
  },
  ESTP: {
    personality: "企業家 · 睿智巴斯貓",
    recommendedItems: ["奶酒提拉米蘇", "經典提拉米蘇鐵盒(600ml)", "日本柚子米蘇"],
    reason: "你的能量需要同樣強勁的甜點來匹配。"
  },
  ESFP: {
    personality: "表演者 · 活力奇異鳥",
    recommendedItems: ["日本柚子米蘇", "經典提拉米蘇鐵盒(600ml)", "奶酒提拉米蘇"],
    reason: "你的熱情需要同樣歡樂的甜點來慶祝。"
  }
};

// --- UTILITIES ---
/** Check if user is on a mobile device */
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
  const [showStory, setShowStory] = useState(false); // Original Easter Egg Modal (deprecated)
  const [showProfile, setShowProfile] = useState(false); // Profile Modal
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [storeBadgeStatus, setStoreBadgeStatus] = useState<'idle' | 'checking' | 'granted' | 'denied' | 'error'>('idle');
  const [storeDistance, setStoreDistance] = useState<number | null>(null);

  // Helper for LINE browser detection
  const isLineBrowser = typeof window !== 'undefined' && /Line/i.test(navigator.userAgent);

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
    additionalParams: { from: 'map' },
  });
  const passportUrl = buildUtmUrl(CONFIG.LINKS.passport_url, {
    medium: 'hero-checkin',
    campaign: '2026-q1-integration',
    content: 'checkin',
    additionalParams: { from: 'map' },
  });
  const bookingMenuUrl = buildUtmUrl(CONFIG.LINKS.booking_url, {
    medium: 'menu-section',
    campaign: '2026-q1-integration',
    content: 'order_cta',
    additionalParams: { from: 'map' },
  });
  const mbtiRecommendationUrl = buildUtmUrl(CONFIG.LINKS.mbti_lab_url, {
    medium: 'recommendation',
    campaign: '2026-q1-integration',
    content: 'personalized',
    additionalParams: { from: 'map' },
  });
  const mbtiMissionUrl = buildUtmUrl(CONFIG.LINKS.mbti_lab_url, {
    medium: 'mission_card',
    campaign: '2026-q1-integration',
    content: 'cross_site',
    additionalParams: { from: 'map' },
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

  // Reward claim saving state
  const [rewardClaimStatus, setRewardClaimStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Save found eggs to localStorage
  const markEggAsFound = async (eggId: number) => {
    if (!foundEggs.includes(eggId)) {
      const newFound = [...foundEggs, eggId];
      setFoundEggs(newFound);
      localStorage.setItem('moonmoon_found_eggs', JSON.stringify(newFound));

      // Check if this was the 8th egg (completed all)
      if (newFound.length === 8) {
        // Check if code already exists
        const existingCode = localStorage.getItem('moonmoon_egg_master_code');
        if (!existingCode) {
          // Generate Reward Claim Code
          const claimCode = `egg_master_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          setRewardClaimStatus('saving');

          try {
            const { error } = await supabase.from('reward_claims').insert({
              code: claimCode,
              reward_id: 'egg_master_2026_q1',
              source: 'moon_map'
            });

            if (error) {
              console.error('Failed to create reward claim:', error);
              setRewardClaimStatus('error');
            } else {
              localStorage.setItem('moonmoon_egg_master_code', claimCode);
              setRewardClaimStatus('saved');
            }
          } catch (e) {
            console.error('Network error saving reward claim:', e);
            setRewardClaimStatus('error');
            // Still save locally as fallback
            localStorage.setItem('moonmoon_egg_master_code', claimCode);
          }
        } else {
          setRewardClaimStatus('saved');
        }

        // Auto scroll to wallpaper section immediately
        setTimeout(() => {
          document.getElementById('wallpaper-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 500);
      }
    }
  };

  // LINE Direct Message Helper
  const handleLineDirectMessage = (message: string) => {
    // 這裡會直接把文字帶到 LINE 輸入框，讓顧客「打開就可以按送出」
    const encodedMsg = encodeURIComponent(message);
    const lineUrl = `https://line.me/R/oaMessage/@931cxefd/?text=${encodedMsg}`;

    if (isMobileDevice()) {
      // 手機：直接跳轉到 LINE 官方帳號聊天視窗（已帶入訊息）
      window.location.href = lineUrl;
    } else {
      // 桌機：開新分頁一樣帶入訊息，顧客只要按送出即可
      window.open(lineUrl, '_blank');
    }
  };

  // Existing unlock effect
  const [showAllCompleteModal, setShowAllCompleteModal] = useState(false); // Added this state variable
  useEffect(() => {
    if (foundEggs.length === 8 && !showAllCompleteModal) {
      setTimeout(() => {
        // Only show if not already shown in this session (simple check)
        setShowAllCompleteModal(true);
        track('easter_egg_complete', { count: 8 });
      }, 1000);
    }
  }, [foundEggs, showAllCompleteModal]); // Added showAllCompleteModal to dependency array

  // Add unlock_all query param for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('unlock_all') === 'true') {
        const cheatEggs = [1, 2, 3, 4, 5, 6, 7, 8];
        setFoundEggs(cheatEggs);
        localStorage.setItem('moonmoon_found_eggs', JSON.stringify(cheatEggs));
      }
    }
  }, []);

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
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [orderNote, setOrderNote] = useState('');
  // New "Smart Form" Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Desktop Order Success Modal
  const [showDesktopOrderSuccess, setShowDesktopOrderSuccess] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  // Valentine Golden Egg
  const [showValentineModal, setShowValentineModal] = useState(false);
  // VIP Island Modal
  const [showVipModal, setShowVipModal] = useState(false);
  const [showHiddenMenu, setShowHiddenMenu] = useState(false);

  // --- DYNAMIC BLOCKED DATES ---
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  useEffect(() => {
    async function fetchBlockedDates() {
      try {
        const { data, error } = await supabase
          .from('business_settings')
          .select('setting_value')
          .eq('setting_key', 'daily_capacity')
          .single();

        if (error) throw error;

        if (data && data.setting_value && data.setting_value.special_dates) {
          const specialDates = data.setting_value.special_dates;
          // Filter out dates where capacity is 0
          const blocked = Object.keys(specialDates).filter(date => specialDates[date] === 0);
          setBlockedDates(blocked);

          if (import.meta.env.DEV) {
            console.log('[Date-Lock] Dynamically loaded blocked dates:', blocked);
          }
        }
      } catch (e) {
        console.error('Failed to fetch blocked dates', e);
      }
    }

    // Fetch on mount
    fetchBlockedDates();
  }, []);

  // Lunar New Year Eggs
  const [showRedEnvelopeModal, setShowRedEnvelopeModal] = useState(false);
  const [showGoldCoinModal, setShowGoldCoinModal] = useState(false);

  // Fortune Slip Modal
  const [showFortuneModal, setShowFortuneModal] = useState(false);
  const [currentFortune, setCurrentFortune] = useState<{ level: string; text: string } | null>(null);

  // 計算最小可選日期（三天前才能預訂）
  const getMinPickupDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() + 3);
    return today;
  };

  // 決定哪些日期不可選 (灰底)
  const filterDate = (date: Date) => {
    // 擋掉週一 (0 = 週日, 1 = 週一)
    if (date.getDay() === 1) return false;

    // 將日曆渲染的日期轉換為 YYYY-MM-DD 格式，用來比對資料庫設定
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // 擋掉滿單或特休日期 (動態從資料庫讀取)
    if (blockedDates.includes(dateString)) {
      return false; // 滿單/店休
    }

    return true; // 開放
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
    if (typeof window !== 'undefined') {
      // Try reading from GA cookie directly (synchronous)
      try {
        const cookies = document.cookie.split(';');
        const gaCookie = cookies.find(c => c.trim().startsWith('_ga='));
        if (gaCookie) {
          const parts = gaCookie.trim().split('.');
          if (parts.length >= 4) {
            return `${parts[2]}.${parts[3]}`;
          }
        }
      } catch (e) {
        // Silently fail
      }
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

      // GA4 menu_view event
      if ((window as any).gtag) {
        (window as any).gtag('event', 'menu_view', {
          site_id: 'moon_map',
          page_path: '/menu',
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
          mbti: new URLSearchParams(window.location.search).get('mbti') || undefined,
        });
      }

      return () => { document.title = prev; };
    }
  }, []);

  // Store UTM params on page load (before user navigates)
  useEffect(() => {
    const params = getUTMParams();
    setStoredUTMParams(params);
    // UTM params stored for checkout tracking
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

        // UI Feedback: Toast
        setCartToast(`已加入：${itemName}`);
        setTimeout(() => setCartToast(null), 2500);

        return [...prev, { name: itemName, spec, price, count: 1 }];
      }
    });
  };

  // --- STORE BADGE: GPS 100m unlock ---
  const handleStoreBadge = async () => {
    if (storeBadgeStatus === 'checking') return;
    setStoreBadgeStatus('checking');
    setStoreDistance(null);

    if (!('geolocation' in navigator)) {
      alert('此裝置不支援定位，無法解鎖到店徽章');
      setStoreBadgeStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const dist = distanceMeters(latitude, longitude, STORE_LOCATION.lat, STORE_LOCATION.lng);
      setStoreDistance(dist);

      if (dist <= STORE_RADIUS_METERS) {
        // 已在範圍內，若已領取過則直接導向
        let code = localStorage.getItem(STORE_BADGE_CODE_KEY);
        if (!code) {
          code = `store_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          setRewardClaimStatus('saving');
          try {
            const { error } = await supabase.from('reward_claims').insert({
              code,
              reward_id: STORE_BADGE_REWARD_ID,
              source: 'moon_map'
            });
            if (error) throw error;
            localStorage.setItem(STORE_BADGE_CODE_KEY, code);
            setRewardClaimStatus('saved');
          } catch (e) {
            console.error('Failed to create store badge claim:', e);
            setRewardClaimStatus('error');
            alert('兌換碼建立失敗，請稍後重試');
            setStoreBadgeStatus('error');
            return;
          }
        }

        setStoreBadgeStatus('granted');
        track('stamp_unlock', { site_id: 'moon_map', stamp_id: STORE_BADGE_REWARD_ID, method: 'gps' });

        // 直接導向護照，帶上 claim_code
        const url = `${CONFIG.LINKS.passport_url}?claim_code=${code}&reward=${STORE_BADGE_REWARD_ID}&utm_source=moon_map&utm_medium=reward&utm_campaign=store_badge`;
        window.open(url, '_blank', 'noopener');
      } else {
        setStoreBadgeStatus('denied');
        alert(`尚未在店內範圍內（目前距離約 ${(dist / 1).toFixed(0)} 公尺），請靠近門市再試一次！`);
      }
    }, (err) => {
      console.error('Geolocation error', err);
      setStoreBadgeStatus('error');
      alert('無法取得定位，請確認已允許位置權限');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
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
    if (submitting) return;
    setSubmitting(true);

    // 1. Validation
    if (!customerName || customerName.length < 2) {
      alert('請填寫完整姓名 (至少 2 個字)');
      setSubmitting(false);
      return;
    }
    const phoneRegex = /^09\d{8}$/;
    if (!customerPhone || !phoneRegex.test(customerPhone)) {
      alert('請填寫有效的手機號碼 (09開頭共10碼)');
      setSubmitting(false);
      return;
    }
    if (!pickupDate) {
      alert('請選擇取貨日期');
      setSubmitting(false);
      return;
    }

    // 將 Date object 轉成字串格式 'YYYY-MM-DD' 以備進 DB 和傳送通知
    const pickupDateStr = `${pickupDate.getFullYear()}-${String(pickupDate.getMonth() + 1).padStart(2, '0')}-${String(pickupDate.getDate()).padStart(2, '0')}`;

    try {
      // 2. Generate Order ID (Simple Timestamp-Random)
      const now = new Date();
      const datePart = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const randPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderId = `ORD${datePart}${randPart}`;

      const totalAmount = calculateTotal();
      const gaClientId = getGAClientId();
      const utmParams = storedUTMParams || getUTMParams();

      // 3. Save to Supabase
      const { data: order, error: orderError } = await supabase
        .from('shop_orders')
        .insert({
          order_number: orderId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: user?.email || null,
          total_amount: totalAmount,
          pickup_date: pickupDateStr,
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

      // 6. Discord 通知（非同步，不影響使用者流程）
      if (typeof window !== 'undefined') {
        try {
          fetch('/api/notify-discord-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              totalAmount,
              pickupDate,
              customerName,
              customerPhone,
              orderNote,
              items: cart,
              source: 'moon_map_menu',
            }),
          }).catch((err) => {
            console.error('[DISCORD][ORDER] Failed to notify (client):', err);
          });
        } catch (err) {
          console.error('[DISCORD][ORDER] Failed to notify (unexpected):', err);
        }
      }

      // 7. Build LINE message
      let msg = `【月島甜點訂單確認】\n`;
      msg += `訂單編號：${orderId}\n`;
      msg += `訂購人：${customerName} (${customerPhone})\n`;
      msg += `手機號碼：${customerPhone}\n`;
      msg += `總金額：$${totalAmount}\n`;
      msg += `取貨日期：${pickupDateStr}\n`;
      if (orderNote) msg += `備註：${orderNote}\n`;
      msg += `\n訂購內容：\n`;
      cart.forEach(item => {
        msg += `● ${item.name} | ${item.spec} x ${item.count}\n`;
      });
      msg += `\n\n付款方式：\n`;
      msg += `LINE Bank (824) 連線商業銀行\n`;
      msg += `帳號：111007479473\n`;
      msg += `備註欄請填寫：${orderId}\n`;
      msg += `\n付款完成後請回傳「後五碼」\n`;
      msg += `   （轉帳通知中的後五碼數字）`;

      // 8. Redirect
      const encodedMsg = encodeURIComponent(msg);
      const lineUrl = `https://line.me/R/oaMessage/@931cxefd/?text=${encodedMsg}`;

      setShowCheckoutConfirm(false);
      clearCart();

      if (isMobileDevice()) {
        window.location.href = lineUrl;
      } else {
        setOrderMessage(msg);
        setShowDesktopOrderSuccess(true);
      }
    } catch (error) {
      console.error('結帳錯誤:', error);
      alert('發生錯誤，請稍後再試');
    } finally {
      setSubmitting(false);
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
    alert('已成功登出島民身份 👋');
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

    // 隨機展籤優惠（皆為「續杯半價」，但語氣不同）
    const commonVariants = [
      // Variant 1：屁股黏住篇
      {
        header: '屁股黏住了 COUPON',
        line1: '既然都坐這麼久了，不如再來一杯。',
        line2: '分享到 IG 限動＋標記 @moon_moon_dessert',
        footer: '出示此卡＋同日同款飲料・即可享續杯半價',
      },
      // Variant 2：咖啡因成癮篇
      {
        header: '續命專用 50% OFF',
        line1: '看你一臉需要咖啡因的樣子。',
        line2: '請先發 IG 限動並標記 @moon_moon_dessert',
        footer: 'VALID TODAY・SAME DRINK・SHOW STORY FOR REFILL 50% OFF',
      },
      // Variant 3：單純口渴篇
      {
        header: '再來一杯 HALF PRICE',
        line1: '第一杯是享受，第二杯是為了不想動。',
        line2: 'Kiwimu 要求：限動標記 @moon_moon_dessert 才能啟動續杯半價',
        footer: '限當日使用・限同品項・出示限動與此卡・Kiwimu 認證',
      },
    ];

    // 隱藏版 Variant 4：稀有出現（約 5% 機率）
    const rareVariant = {
      header: '老闆沒看見 SPECIAL',
      line1: '噓。雖然我很懶，但偷偷給你一個折扣。',
      line2: '記得先發 IG 限動＋標記 @moon_moon_dessert 再低調出示此卡。',
      footer: 'SECRET COUPON・TODAY ONLY・REFILL 50% OFF',
    };

    let coupon;
    const roll = Math.random();
    if (roll < 0.05) {
      coupon = rareVariant;
    } else {
      coupon = commonVariants[Math.floor(Math.random() * commonVariants.length)];
    }

    const width = 400;
    const height = 600;

    // 1. Create SVG String with recommended products
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="${CONFIG.BRAND_COLORS.creamWhite}"/>
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="white" stroke="black" stroke-width="2" stroke-dasharray="8,8"/>
        <rect x="0" y="0" width="${width}" height="10" fill="${CONFIG.BRAND_COLORS.moonYellow}"/>
        
        <text x="40" y="60" font-family="'Inter', sans-serif" font-size="12" font-weight="600" letter-spacing="2" fill="#888">MOON MOON MISSION CARD</text>
        
        <text x="40" y="100" font-family="'Inter', sans-serif" font-weight="bold" font-size="14" fill="#aaa">CURRENT STATE:</text>
        <text x="40" y="135" font-family="serif" font-size="28" font-weight="bold" letter-spacing="1" fill="${CONFIG.BRAND_COLORS.emotionBlack}">${data.title}</text>
        
        <line x1="40" y1="160" x2="360" y2="160" stroke="#000" stroke-width="0.5"/>
        
        <text x="40" y="195" font-family="'Inter', sans-serif" font-weight="bold" font-size="14" fill="#000">為你推薦 RECOMMENDED:</text>
        <text x="40" y="225" font-family="serif" font-size="15" font-style="italic" fill="#333">• ${recommendedItemsForCard[0]}</text>
        <text x="40" y="255" font-family="serif" font-size="15" font-style="italic" fill="#333">• ${recommendedItemsForCard[1]}</text>
        <text x="40" y="285" font-family="serif" font-size="15" font-style="italic" fill="#333">• ${recommendedItemsForCard[2]}</text>
        
        <line x1="40" y1="315" x2="360" y2="315" stroke="#000" stroke-width="0.5"/>
        
        <rect x="40" y="335" width="320" height="90" fill="#fcfcfc" stroke="#eee" stroke-width="1" rx="8"/>
        <text x="60" y="360" font-family="'Inter', sans-serif" font-weight="800" font-size="12" fill="#aaa">OUR MISSION FOR YOU:</text>
        <text x="60" y="388" font-family="serif" font-size="14" line-height="1.6" fill="#444">
          <tspan x="60" dy="0">${data.mission.substring(0, 22)}</tspan>
          <tspan x="60" dy="20">${data.mission.substring(22, 44)}</tspan>
          <tspan x="60" dy="20">${data.mission.substring(44)}</tspan>
        </text>
        
        <rect x="40" y="445" width="320" height="95" fill="${CONFIG.BRAND_COLORS.moonYellow}" stroke="black" stroke-width="2" rx="4"/>
        <text x="200" y="472" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="18" fill="#000">${coupon.header}</text>
        <text x="200" y="497" text-anchor="middle" font-family="serif" font-size="13" font-weight="bold" fill="#000">${coupon.line1}</text>
        <text x="200" y="517" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10" font-weight="bold" fill="#000" opacity="0.9">${coupon.line2}</text>
        
        <text x="200" y="575" text-anchor="middle" font-family="monospace" font-size="9" fill="#bbb">${coupon.footer}</text>
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

  // --- MBTI PERSONALIZATION STATE ---
  const [mbtiType, setMbtiType] = useState<string | null>(null);

  // Parse MBTI from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mbti = params.get('mbti');
      if (mbti) {
        setMbtiType(mbti);
      }
    }
  }, []);

  // Auto-expand categories containing recommended items
  useEffect(() => {
    if (mbtiType && menuCategories.length > 0) {
      const typeKey = mbtiType.split('-')[0]; // e.g., "INTJ-A" -> "INTJ"
      const mapping = MBTI_DESSERT_MAPPING[typeKey];

      if (mapping && mapping.recommendedItems) {
        const recItems = mapping.recommendedItems;
        const catsToExpand = new Set<string>();

        // Find which categories have these items
        menuCategories.forEach(cat => {
          const hasRec = cat.items.some((item: any) => recItems.includes(item.name));
          if (hasRec) {
            catsToExpand.add(cat.id);
          }
        });

        // Update collapsedCategories: remove IDs that should be expanded
        setCollapsedCategories(prev => {
          const next = new Set(prev);
          catsToExpand.forEach(id => next.delete(id));
          return next;
        });
      }
    }
  }, [mbtiType, menuCategories]);

  // 甜點目錄區塊（modal 與 /menu 僅目錄頁共用）
  const menuBodyContent = (
    <div>
      {/* Personalized Welcome Banner */}
      {mbtiType && MBTI_DESSERT_MAPPING[mbtiType.split('-')[0]] && (
        <div style={{
          background: `linear-gradient(135deg, ${CONFIG.BRAND_COLORS.creamWhite} 0%, #fff 100%)`,
          border: `2px solid ${CONFIG.BRAND_COLORS.moonYellow}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
          boxShadow: '0 4px 15px rgba(216, 224, 56, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div className="font-mono" style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}>
              SOUL DESSERT MATCH
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: CONFIG.BRAND_COLORS.emotionBlack }}>
              Hi, {MBTI_DESSERT_MAPPING[mbtiType.split('-')[0]].personality} ({mbtiType}) 的朋友！
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.6' }}>
              這是為你準備的<strong>靈魂甜點清單</strong>。<br />
              {MBTI_DESSERT_MAPPING[mbtiType.split('-')[0]].reason}
            </p>
          </div>
          <div style={{
            position: 'absolute',
            right: '-10px',
            bottom: '-10px',
            fontSize: '5rem',
            opacity: 0.1,
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            ✨
          </div>
        </div>
      )}

      {menuCategories.map((cat) => {
        const isCollapsed = collapsedCategories.has(cat.id);

        // Check if category has recommended items to show indicator
        const typeKey = mbtiType ? mbtiType.split('-')[0] : null;
        const recItems = typeKey ? MBTI_DESSERT_MAPPING[typeKey]?.recommendedItems : [];
        const hasRecommendation = recItems?.some(rec => cat.items.some((item: any) => item.name === rec));

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
                  {hasRecommendation && isCollapsed && (
                    <span style={{
                      marginLeft: '10px',
                      background: CONFIG.BRAND_COLORS.moonYellow,
                      color: 'black',
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      verticalAlign: 'middle',
                      opacity: 0.8
                    }}>
                      推薦在內
                    </span>
                  )}
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
                {cat.items.map((item, idx) => {
                  // Check if this specific item is recommended
                  const isRecommended = recItems?.includes(item.name);

                  return (
                    <div key={idx} className="menu-item" style={{
                      position: 'relative',
                      border: isRecommended ? `2px solid ${CONFIG.BRAND_COLORS.moonYellow}` : 'none',
                      borderRadius: '8px',
                      padding: isRecommended ? '10px' : '0',
                      margin: isRecommended ? '-12px -12px 10px -12px' : '0', // Negative margin to compensate padding without breaking layout
                      background: isRecommended ? 'rgba(255,255,255,0.8)' : 'transparent',
                      boxShadow: isRecommended ? '0 4px 15px rgba(0,0,0,0.05)' : 'none'
                    }}>
                      {isRecommended && (
                        <div style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '10px',
                          background: CONFIG.BRAND_COLORS.emotionBlack,
                          color: CONFIG.BRAND_COLORS.moonYellow,
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          zIndex: 10,
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}>
                          你的靈魂甜點
                        </div>
                      )}

                      {item.image && (
                        <div style={{
                          width: '100%',
                          height: '200px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          marginBottom: '12px',
                          cursor: 'default'
                        }}
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
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

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
          filter: drop-shadow(0 0 8px rgba(216, 224, 56, 0.9)) !important;
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
              alert(`🎉 你已集滿 8 顆彩蛋！ 恭喜！`);
              document.getElementById('wallpaper-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
              top: '60px',
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
            boxShadow: '4px 4px 0 rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            <span className="font-mono" style={{ display: 'block', marginBottom: '8px', fontSize: '0.7rem', letterSpacing: '0.1em' }}>CURRENT EXHIBITION / 2026 Q1</span>
            <strong style={{ fontSize: '1.1rem' }}>{CONFIG.CURRENT_SEASON}</strong>

            {/* Gold Coin Egg (Hidden in Yellow Background) */}
            {/* REMOVED: Moved to 'Fortune' (New_year-2.jpg) wallpaper based on user feedback */}
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
              <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '4px', fontWeight: 'normal' }}>*將開啟護照外部網頁</div>
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
            track('click_hero_store_badge');
            handleStoreBadge();
          }}>
            <div>
              <span className="font-mono text-yellow" style={{ fontSize: '1rem' }}>04 // VISIT</span><br />
              <strong>到店解鎖徽章 (100m 內)</strong>
              <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '4px', fontWeight: 'normal' }}>
                需開啟定位；成功會跳轉護照
              </div>
              {storeBadgeStatus === 'checking' && (
                <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '6px' }}>檢查定位中...</div>
              )}
              {storeDistance !== null && storeBadgeStatus !== 'granted' && (
                <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '6px' }}>距離約 {storeDistance.toFixed(0)} m</div>
              )}
            </div>
            <span>📍</span>
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
            setShowDiscoverModal(true);
          }}>
            <div>
              <span className="font-mono" style={{ fontSize: '1rem' }}>05 // DISCOVER</span><br />
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
              <div id="result-card" className="result-card" style={{ zIndex: 2, color: 'black', background: 'transparent', padding: 0 }}>
                {/* 主內容區：改為 btn-entry 風格但取消 Hover / 點擊互動功能 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F8F8F8',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '20px',
                  position: 'relative',
                  textAlign: 'left'
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '0.85rem',
                      letterSpacing: '0.1em',
                      color: '#666',
                      marginBottom: '10px'
                    }}>MISSION CARD ISSUED</p>

                    <h3 style={{
                      fontSize: '1.4rem',
                      fontWeight: '800',
                      margin: '0 0 12px 0',
                      lineHeight: '1.2',
                    }}>{STATE_DATA[selectedState].title}</h3>

                    <p style={{
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      color: '#444',
                      fontStyle: 'italic',
                      marginBottom: '16px',
                      padding: '0 8px',
                      borderLeft: '3px solid #E0E0E0'
                    }}>
                      "{STATE_DATA[selectedState].advice}"
                    </p>

                    <div style={{
                      background: '#fff',
                      padding: '16px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      marginBottom: '16px'
                    }}>
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

                      <ul style={{
                        margin: 0,
                        paddingLeft: '20px',
                        lineHeight: '1.8',
                        color: '#222'
                      }}>
                        {recommendedItems.map((item, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                        ))}
                      </ul>

                      {!mbtiData && mbtiRecommendationUrl && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #eee',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}>
                          <a
                            href={mbtiRecommendationUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => track('click_mbti_cta', { source: 'recommendation_cta', state: selectedState })}
                            style={{
                              display: 'block',
                              backgroundColor: CONFIG.BRAND_COLORS.moonYellow,
                              color: '#000',
                              padding: '12px',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            完成 MBTI 測驗，獲得更精準推薦
                          </a>
                        </div>
                      )}
                    </div>


                    {/* 抽籤按鈕 */}
                    <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => {
                      const f = drawAndSaveFortune();
                      setCurrentFortune(f);
                      setShowFortuneModal(true);
                      track('fortune_drawn', { level: f.level, state: selectedState });

                      // Trigger Webhook
                      if (typeof window !== 'undefined') {
                        try {
                          fetch('/api/notify-discord-activity', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              activityType: 'draw_fortune',
                              level: f.level,
                              state: STATE_DATA[selectedState].title,
                            }),
                          }).catch((err) => {
                            console.error('[ACTIVITY] Failed to notify (client):', err);
                          });
                        } catch (err) {
                          console.error('[ACTIVITY] Failed to notify (unexpected):', err);
                        }
                      }
                    }}>
                      抽展籤 DRAW FORTUNE SLIP
                    </button>
                  </div>
                </div>
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
          <h2 className="font-mono" style={{ marginBottom: '20px', textAlign: 'center' }}>ISLAND MENU / VIP ISLANDS</h2>

          {/* HIDDEN MENU SECTION (Daily Secret) */}
          {(() => {
            const hiddenCat = menuCategories.find(c => c.id === 'hidden');
            if (!hiddenCat || hiddenCat.items.length === 0) return null;

            return (
              <div style={{ maxWidth: '600px', margin: '0 auto 40px auto' }}>
                {!showHiddenMenu ? (
                  <div
                    className="hidden-seal-container"
                    onClick={() => {
                      setShowHiddenMenu(true);
                      track('reveal_hidden_menu');
                    }}
                    style={{
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '40px 20px',
                      textAlign: 'center',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      backgroundImage: 'radial-gradient(#f0f0f0 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}
                  >
                    <div className="wax-seal"></div>
                    <div className="font-mono" style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px', letterSpacing: '0.2em' }}>
                      TOP SECRET
                    </div>
                    <h3 style={{ fontSize: '1.2rem', margin: 0, opacity: 0.6 }}>本日隱藏限定 / Daily Secret</h3>
                    <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '15px' }}>
                      島主的私房信籤，揭開今日驚喜
                    </p>
                  </div>
                ) : (
                  <div className={`hidden-content ${showHiddenMenu ? 'revealed' : ''}`}>
                    <div style={{
                      background: '#fff9e6',
                      border: '2px solid #f0e0b0',
                      borderRadius: '16px',
                      padding: '30px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        fontSize: '0.7rem',
                        color: '#b0a070',
                        fontWeight: 'bold',
                        border: '1px solid #b0a070',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        SECRET SERIES
                      </div>
                      <h3 className="font-mono" style={{ textAlign: 'center', marginBottom: '25px', color: '#8b6b23' }}>
                        ✧ 本日隱藏限定 ✧
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        {hiddenCat.items.map((item: any, idx: number) => (
                          <div key={idx} style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
                            {item.image && <img src={item.image} alt={item.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px', border: '2px solid #fff' }} />}
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#333' }}>{item.name}</div>
                            {item.description && <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>{item.description}</div>}
                            <div style={{ marginTop: '8px', color: '#8b6b23', fontWeight: 'bold' }}>
                              {item.prices && item.prices.length > 0 ? `$${item.prices[0].price}` : '時價'}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowHiddenMenu(false)}
                        style={{
                          display: 'block',
                          margin: '25px auto 0 auto',
                          background: 'none',
                          border: 'none',
                          color: '#b0a070',
                          fontSize: '0.8rem',
                          textDecoration: 'underline',
                          cursor: 'pointer'
                        }}
                      >
                        收起信籤
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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

          <button
            onClick={() => setShowVipModal(true)}
            className="btn-entry"
            style={{ marginTop: '16px', cursor: 'pointer' }}
          >
            <div>
              <span className="font-mono" style={{ fontSize: '1rem' }}>VIP ISLAND</span><br />
              <strong>島民的VIP島嶼</strong>
            </div>
            <span>🏝️</span>
          </button>


          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ marginBottom: '20px' }}>
              這不只是一次選擇，而是一場狀態的確認。<br />
              選一個關鍵字，交換一份<span style={{ borderBottom: `2px solid ${CONFIG.BRAND_COLORS.moonYellow}`, paddingBottom: '2px' }}>甜點處方箋</span>。
            </p>
          </div>
          {/* END OF SECTIONS */}
        </section>
      </div>

      {/* NEW: CURATED CONTENT */}
      <div style={{ marginTop: '80px', padding: '0 20px' }}>
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
                  <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px', lineHeight: 1.5 }}>
                    小提醒：桌布裡藏著一些小細節，多多放大觀察，說不定會發現限定小彩蛋喔！
                  </div>
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
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#333',
                        marginBottom: '6px',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>{wp.label}</span>
                        <span>⬇</span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <img src={wp.url} alt={wp.label} style={{ width: '100%', height: 'auto', borderRadius: '6px', aspectRatio: '9/16', objectFit: 'cover' }} />

                        {/* Red Envelope Egg (Hidden in Spring Wallpaper) */}
                        {wp.label === 'Spring' && (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowRedEnvelopeModal(true);
                              track('lny_egg_clicked', { source: 'wallpaper_red_envelope' });
                            }}
                            style={{
                              position: 'absolute',
                              bottom: '25%',
                              left: '20%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              fontSize: '20px',
                              lineHeight: '24px',
                              textAlign: 'center',
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                              transition: 'transform 0.2s, filter 0.2s',
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.3)';
                              e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(255,0,0,0.5))';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
                            }}
                          >
                            🧧
                          </div>
                        )}

                        {/* Gold Coin Egg (Hidden in Fortune/Yellow Wallpaper) */}
                        {wp.label === 'Fortune' && (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowGoldCoinModal(true);
                              track('lny_egg_clicked', { source: 'wallpaper_gold_coin' });
                            }}
                            style={{
                              position: 'absolute',
                              top: '25%',
                              right: '20%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              fontSize: '20px',
                              lineHeight: '24px',
                              textAlign: 'center',
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                              transition: 'transform 0.2s, filter 0.2s',
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.3)';
                              e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(255,215,0,0.8))';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
                            }}
                          >
                            💰
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {isEasterEggComplete && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                    🎉 恭喜通關！還有兩份特別獎勵...
                  </p>

                  {/* Reward Claim Code Display */}
                  {(() => {
                    const code = localStorage.getItem('moonmoon_egg_master_code');
                    if (rewardClaimStatus === 'saving') {
                      return (
                        <p style={{ fontSize: '0.85rem', color: '#999' }}>正在產生兌換碼...</p>
                      );
                    }
                    if (rewardClaimStatus === 'error' && !code) {
                      return (
                        <p style={{ fontSize: '0.85rem', color: '#c00' }}>兌換碼產生失敗，請重新整理頁面或聯繫客服。</p>
                      );
                    }
                    if (code) {
                      return (
                        <div style={{
                          background: '#f9f9f9',
                          border: '1px solid #eee',
                          borderRadius: '12px',
                          padding: '15px',
                          marginBottom: '15px'
                        }}>
                          <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>
                            你的兌換碼（截圖保存）
                          </p>
                          <div
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(code).then(() => {
                                  alert('已複製兌換碼！');
                                }).catch(() => {
                                  alert('複製好像失敗了，請長按選取文字手動複製或截圖保存喔！');
                                });
                              } else {
                                alert('目前裝置不支援一鍵複製，請長按選取文字手動複製或截圖保存喔！');
                              }
                            }}
                            style={{
                              background: '#000',
                              color: CONFIG.BRAND_COLORS.moonYellow,
                              padding: '12px',
                              borderRadius: '8px',
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                              letterSpacing: '1px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              wordBreak: 'break-all'
                            }}
                          >
                            {code}
                            <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '4px' }}>
                              TAP TO COPY
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Passport Badge Button */}
                  <a
                    href={`${CONFIG.LINKS.passport_url}?claim_code=${localStorage.getItem('moonmoon_egg_master_code') || ''}&reward=egg_master_2026_q1&utm_source=moon_map&utm_medium=reward&utm_campaign=egg_master`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background: CONFIG.BRAND_COLORS.moonYellow,
                      color: CONFIG.BRAND_COLORS.emotionBlack,
                      border: '2px solid #000',
                      padding: '10px 20px',
                      borderRadius: '999px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
                      width: '100%',
                      maxWidth: '300px',
                      textDecoration: 'none',
                      textAlign: 'center'
                    }}
                  >
                    🏅 前往護照領取限定徽章
                  </a>
                </div>
              )}
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
              borderRadius: '16px',
              padding: '30px 20px',
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(4px)',
              border: '2px dashed rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '120px',
              color: '#999',
              position: 'relative',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.02)',
              userSelect: 'none'
            }}>
              <div style={{
                fontSize: '1.8rem',
                marginBottom: '10px',
                opacity: 0.4,
                filter: 'grayscale(1)'
              }}>🚧</div>
              <strong className="font-mono" style={{ fontSize: '0.9rem', letterSpacing: '0.15em', marginBottom: '6px', color: '#888' }}>
                COMING SOON
              </strong>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#aaa' }}>
                PROJECT LOADING... (準備中)
              </div>

              {/* Easter Egg #8 - 秘密計畫 */}
              <img
                src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744157/Enter-02_t83hem.webp"
                alt=""
                className={`easter-egg-icon ${foundEggs.includes(8) ? 'found' : ''}`}
                onClick={() => openEasterEgg(8)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  bottom: '12px',
                  width: '24px',
                  height: '24px',
                  opacity: 0.1,
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  filter: 'grayscale(1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1.3) rotate(15deg)';
                  e.currentTarget.style.filter = 'grayscale(0) drop-shadow(0 4px 8px rgba(0,0,0,0.2))';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.opacity = '0.1';
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.filter = 'grayscale(1)';
                }}
                title="?"
              />
            </div>

          </div>
        </div>
        {/* Container closing div removed */}
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                    <span>Instagram</span>
                  </a>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <a href={CONFIG.LINKS.line_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 10.304c0-5.231-5.383-9.504-12-9.504-6.617 0-12 4.273-12 9.504 0 4.691 4.272 8.611 10.05 9.358.391.084.922.258 1.057.592.121.298.079.766.038 1.068l-.164 1.006c-.049.303-.239 1.187 1.029.648 1.268-.539 6.848-4.032 9.339-6.903l.01-.01c1.479-1.637 2.641-3.619 2.641-5.859zm-16.142 4.671h-2.131c-.347 0-.631-.284-.631-.631v-4.437c0-.347.284-.631.631-.631h2.131c.347 0 .631.284.631.631s-.284.631-.631.631h-1.5v.942h1.5c.347 0 .631.284.631.631s-.284.631-.631.631h-1.5v.942h1.5c.347 0 .631.284.631.631s-.284.631-.631.631zm3.837 0h-2.131c-.347 0-.631-.284-.631-.631v-4.437c0-.347.284-.631.631-.631.347 0 .631.284.631.631v3.806h1.5c.347 0 .631.284.631.631s-.284.631-.631.631zm2.345 0c-.347 0-.631-.284-.631-.631v-4.437c0-.347.284-.631.631-.631s.631.284.631.631v4.437c0 .347-.284.631-.631.631zm5.222 0h-2.131c-.347 0-.631-.284-.631-.631v-4.437c0-.347.284-.631.631-.631h2.131c.347 0 .631.284.631.631s-.284.631-.631.631h-1.5v.942h1.5c.347 0 .631.284.631.631s-.284.631-.631.631h-1.5v.942h1.5c.347 0 .631.284.631.631s-.284.631-.631.631h-1.5v.942h1.5c.347 0 .631.284.631.631s-.284.631-.631.631z" /></svg>
                    <span>LINE Official</span>
                  </a>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <a href={CONFIG.LINKS.spotify_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.59 17.357c-.214.307-.605.404-.919.228-2.553-1.423-5.714-1.748-9.457-.932-.34.07-.675-.145-.745-.485-.07-.339.145-.675.485-.745 4.091-.89 7.643-.51 10.509 1.096.31.205.41.605.227.938zm1.488-3.262c-.269.414-.81.543-1.224.274-2.885-1.774-7.295-2.288-10.71-1.252-.469.14-1.02-.128-1.16-.597-.14-.469.128-1.019.597-1.159 3.844-1.164 8.79-.571 12.115 1.503.414.27 1.54.811 1.382 1.331-.158.52-.81 1.224.274z" /></svg>
                    <span>Spotify Playlist</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: '#999', fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} {CONFIG.STORE_NAME_EN}. All Rights Reserved.
          </p>
        </footer >
      </div >

      {/* --- MODALS --- */}

      {/* DISCOVER PROGRESS MODAL (M1) */}
      {showDiscoverModal && (
        <div className="modal-overlay" onClick={() => setShowDiscoverModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>
            <div className="modal-header" style={{ border: 'none', paddingBottom: 0 }}>
              <div className="font-mono" style={{ fontSize: '0.8rem', color: '#888' }}>PROGRESS</div>
              <button className="close-btn" onClick={() => setShowDiscoverModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '10px 30px 40px 30px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🥚</div>
              <h3 className="font-mono" style={{ fontSize: '1.2rem', marginBottom: '15px' }}>找尋彩蛋 ({foundEggs.length}/8)</h3>
              <div style={{ height: '8px', width: '100%', background: '#eee', borderRadius: '4px', marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(foundEggs.length / 8) * 100}%`, background: CONFIG.BRAND_COLORS.moonYellow, transition: 'width 0.8s ease-out' }} />
              </div>
              <p style={{ lineHeight: '1.8', color: '#555', fontSize: '0.9rem' }}>
                目前收集到 {foundEggs.length} / 8 個彩蛋！<br />
                仔細觀察頁面中那些看似不起眼的小圖標...<br />
                他們藏著 Kiwimu 的秘密 ✨
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CART FEEDBACK TOAST (M7) */}
      {cartToast && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          fontSize: '0.9rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          {cartToast}
        </div>
      )}

      {/* MENU MODAL */}
      {
        showMenu && (
          <div className="modal-overlay" onClick={() => setShowMenu(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', color: CONFIG.BRAND_COLORS.grayText }}>SEASON 01</div>
                  <h3 className="font-mono" style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.05em' }}>MENU</h3>
                </div>
                <button className="close-btn" onClick={() => setShowMenu(false)}>×</button>
              </div>

              <div className="modal-body">
                {loadingMenu ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>⏳</div>
                    載入甜點目錄中...
                  </div>
                ) : (
                  menuBodyContent
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Easter Egg Modal - NEW */}
      {
        showEasterEgg && currentEasterEgg !== null && (
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
        )
      }


      {/* OLD Story Modal - Keep for header bird */}
      {
        showStory && (
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
        )
      }

      {/* CHECKOUT CONFIRMATION MODAL */}
      {
        showCheckoutConfirm && (
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
                  <DatePicker
                    selected={pickupDate}
                    onChange={(date: Date | null) => setPickupDate(date)}
                    minDate={getMinPickupDate()}
                    filterDate={filterDate}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="請點擊選擇日期"
                    className="custom-datepicker"
                    required
                  />
                  <style>{`
                    .custom-datepicker {
                      width: 100%;
                      padding: 12px;
                      border-radius: 8px;
                      border: 1px solid #ddd;
                      font-size: 1rem;
                      box-sizing: border-box;
                    }
                    /* Add style overrides for datepicker to make disabled dates look greyed out */
                    .react-datepicker-wrapper {
                      width: 100%;
                    }
                    .react-datepicker__day--disabled {
                      color: #ccc !important;
                      background-color: #f9f9f9 !important;
                      text-decoration: line-through;
                    }
                  `}</style>
                  <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>
                    *請選擇您要來店取貨的日期<br />
                    最快取貨日期：三天後 | 灰色為滿單或公休日<br />
                    營業時間：週二至週日 13:00-19:00
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
        )
      }

      {/* DESKTOP ORDER SUCCESS MODAL */}
      {
        showDesktopOrderSuccess && (
          <div className="modal-overlay" onClick={() => setShowDesktopOrderSuccess(false)} style={{ zIndex: 3000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', zIndex: 3001 }}>
              <div className="modal-header" style={{ background: CONFIG.BRAND_COLORS.moonYellow }}>
                <h3 className="font-mono" style={{ margin: 0 }}>✅ 訂單已建立 Order Confirmed</h3>
                <button className="close-btn" onClick={() => setShowDesktopOrderSuccess(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px' }}>
                    🎉 訂單已成功送出！
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                    請完成以下步驟以確認訂單：
                  </p>
                </div>

                <div style={{ background: '#f8f8f8', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
                    📋 步驟 1：複製訂單訊息
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(orderMessage).then(() => {
                        alert('✅ 已複製訂單訊息到剪貼簿！');
                      }).catch(() => {
                        alert('❌ 複製失敗，請手動複製下方訊息');
                      });
                    }}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      background: 'black',
                      color: CONFIG.BRAND_COLORS.moonYellow,
                      marginBottom: '15px'
                    }}
                  >
                    📋 複製訊息到剪貼簿
                  </button>

                  <div style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    border: '1px solid #ddd'
                  }}>
                    {orderMessage}
                  </div>
                </div>

                <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '2px solid #ffc107' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '10px', color: '#856404' }}>
                    📱 步驟 2：傳送到 LINE 官方帳號
                  </div>
                  <a
                    href={CONFIG.LINKS.line_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{
                      width: '100%',
                      display: 'block',
                      textAlign: 'center',
                      background: '#06C755',
                      color: 'white',
                      textDecoration: 'none',
                      padding: '12px'
                    }}
                  >
                    💬 開啟月島甜點 LINE@
                  </a>
                  <p style={{ fontSize: '0.75rem', color: '#856404', marginTop: '10px', marginBottom: 0, textAlign: 'center' }}>
                    點擊上方按鈕後，將剪貼簿的訊息貼上並傳送
                  </p>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#999' }}>
                  完成付款後，我們會盡快與您確認訂單！
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* VALENTINE GOLDEN EGG MODAL */}
      {
        showValentineModal && (
          <div className="modal-overlay" onClick={() => setShowValentineModal(false)} style={{ zIndex: 3000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', zIndex: 3001 }}>
              <div
                className="modal-header"
                style={{
                  background: '#fff',
                  color: '#000',
                  borderBottom: '1px solid #eee'
                }}
              >
                <h3 className="font-mono" style={{ margin: 0, fontSize: '1rem', letterSpacing: '2px' }}>HIDDEN EGG NO.9</h3>
                <button className="close-btn" onClick={() => setShowValentineModal(false)} style={{ color: '#000' }}>×</button>
              </div>

              <div className="modal-body" style={{ padding: '30px 20px' }}>
                {/* Success Message */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '15px' }}>💛</div>
                  <p style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px', color: '#000', letterSpacing: '1px' }}>
                    妳發現了隱藏彩蛋
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#999', fontFamily: 'monospace' }}>
                    The Golden Valentine Egg
                  </p>
                </div>

                {/* Kiwimu's Confession */}
                <div style={{
                  background: '#fff',
                  padding: '25px',
                  borderRadius: '0',
                  marginBottom: '30px',
                  border: '1px solid #000',
                  position: 'relative'
                }}>
                  {/* Decorative corner */}
                  <div style={{ position: 'absolute', top: '-5px', left: '-5px', width: '10px', height: '10px', background: '#000' }}></div>
                  <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '10px', height: '10px', background: '#000' }}></div>

                  <div style={{ fontSize: '0.85rem', lineHeight: '2', color: '#333', textAlign: 'center' }}>
                    <p style={{ marginBottom: '15px' }}>
                      我本來是一坨普通的鮮奶油<br />
                      直到那天，甜點師打發我的時候<br />
                      我看見了妳
                    </p>
                    <p style={{ marginBottom: '15px' }}>
                      我的心跳變成了 100 下/分鐘<br />
                      我的質地變得更蓬鬆了<br />
                      我整個人都升溫了 3 度
                    </p>
                    <p style={{ marginBottom: '15px' }}>
                      科學無法解釋這種現象<br />
                      甜點師說這叫做『質變』
                    </p>
                    <p style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#000', letterSpacing: '1px', marginTop: '20px' }}>
                      我想，這就是愛吧
                    </p>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '20px', color: '#999', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    — Kiwimu
                  </div>
                </div>

                {/* Redemption Code */}
                <div style={{
                  marginBottom: '10px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '15px', textAlign: 'center', letterSpacing: '1px' }}>
                    傳送通關密語到 LINE@ 兌換布丁
                  </div>

                  {/* Code Display */}
                  <div
                    onClick={() => {
                      navigator.clipboard.writeText('KIWIMU KISS');
                      alert('已複製通關密語！');
                    }}
                    style={{
                      background: '#000',
                      padding: '15px',
                      textAlign: 'center',
                      marginBottom: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      SECRET CODE
                    </div>
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      color: '#fff',
                      letterSpacing: '2px'
                    }}>
                      KIWIMU KISS
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#444', marginTop: '5px' }}>
                      (TAP TO COPY)
                    </div>
                  </div>

                  {/* LINE Button */}
                  <a
                    href={CONFIG.LINKS.line_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{
                      width: '100%',
                      display: 'block',
                      textAlign: 'center',
                      background: '#fff',
                      color: '#000',
                      textDecoration: 'none',
                      padding: '12px',
                      border: '1px solid #000',
                      fontSize: '0.85rem',
                      letterSpacing: '1px'
                    }}
                  >
                    前往 LINE@ 兌換
                  </a>
                  {/* Checkout Button */}
                  <button
                    onClick={confirmAndSend}
                    disabled={submitting}
                    className="checkout-btn"
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '8px',
                      background: CONFIG.BRAND_COLORS.moonYellow,
                      color: 'black',
                      fontWeight: 'bold',
                      border: 'none',
                      fontSize: '1.1rem',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      marginTop: '10px'
                    }}
                  >
                    {submitting ? '提交中...' : (isLineBrowser ? 'LINE Pay 結帳' : '確認訂單並提交')}
                  </button>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.6rem', color: '#ccc', marginTop: '20px' }}>
                  LIMITED QUANTITY
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* VIP ISLAND MODAL */}
      {
        showVipModal && (
          <div className="modal-overlay" onClick={() => setShowVipModal(false)} style={{ zIndex: 3000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', zIndex: 3001 }}>
              <div
                className="modal-header"
                style={{
                  background: '#fff',
                  color: '#000',
                  borderBottom: 'none',
                  paddingBottom: '0'
                }}
              >
                <button className="close-btn" onClick={() => setShowVipModal(false)} style={{ color: '#000', fontSize: '1.5rem' }}>×</button>
              </div>

              <div className="modal-body" style={{ padding: '30px 30px 60px 30px', textAlign: 'center' }}>

                <div style={{
                  fontSize: '0.95rem',
                  lineHeight: '2.2',
                  color: '#333',
                  fontFamily: 'serif',
                  letterSpacing: '1px',
                  fontStyle: 'italic'
                }}>
                  <p style={{ marginBottom: '20px' }}>
                    「在這個島上，<br />
                    每一片甜點都是為你而生。」
                  </p>
                  <p style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#000',
                    marginTop: '20px',
                    fontStyle: 'normal'
                  }}>
                    — Kiwimu
                  </p>
                  <p style={{
                    fontSize: '0.8rem',
                    color: '#999',
                    marginTop: '40px',
                    letterSpacing: '2px',
                    fontFamily: 'monospace',
                    fontStyle: 'normal'
                  }}>
                    COMING SOON...
                  </p>
                </div>
              </div>
            </div>
          </div >
        )
      }



      {/* FORTUNE SLIP MODAL */}
      {
        showFortuneModal && currentFortune && (
          <div className="modal-overlay" onClick={() => setShowFortuneModal(false)} style={{ zIndex: 3000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', zIndex: 3001 }}>
              <div
                className="modal-header"
                style={{
                  background: '#000',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 20px'
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.1em' }}>🎴 心情展籤</span>
                <button className="close-btn" onClick={() => setShowFortuneModal(false)} style={{ color: '#fff', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>

              <div className="modal-body" style={{ padding: '30px', textAlign: 'center' }}>
                {/* Fortune Level Badge */}
                <div style={{ marginBottom: '20px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 20px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                    border: '2px solid',
                    ...(currentFortune.level === '隱藏版'
                      ? { background: CONFIG.BRAND_COLORS.moonYellow, color: '#000', borderColor: '#000' }
                      : currentFortune.level === '大吉'
                        ? { background: '#FEF2F2', color: '#991B1B', borderColor: '#FCA5A5' }
                        : currentFortune.level === '中吉'
                          ? { background: '#FFF7ED', color: '#C2410C', borderColor: '#FDBA74' }
                          : { background: '#F9FAFB', color: '#4B5563', borderColor: '#D1D5DB' })
                  }}>
                    {currentFortune.level}
                  </span>
                </div>

                {/* Fortune Text */}
                <p style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  lineHeight: '1.8',
                  color: '#000',
                  fontFamily: '"Noto Serif TC", serif',
                  marginBottom: '15px',
                  padding: '0 10px'
                }}>
                  「{currentFortune.text}」
                </p>

                <p style={{ fontSize: '0.7rem', color: '#aaa', letterSpacing: '0.15em' }}>✨ 來自 Kiwimu 的祝福 ✨</p>

                {/* IG Promo Message */}
                <div style={{
                  background: '#EEF2F5',
                  padding: '16px',
                  borderRadius: '12px',
                  margin: '16px 0',
                  textAlign: 'left'
                }}>
                  <p style={{ fontSize: '0.9rem', color: '#222', lineHeight: '1.6', margin: 0, fontWeight: 600 }}>
                    🎁 第一步：下載並截圖此展籤<br />
                    📷 第二步：發布限時動態並標記 <strong style={{ color: '#60A5FA' }}>@moon_moon_dessert</strong><br />
                    即可獲得「第二杯飲品半價優惠」！
                  </p>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '2px dashed #eee', margin: '20px 0' }} />

                {/* Download Card CTA */}
                <button
                  onClick={() => {
                    handleDownloadCard();
                    setShowFortuneModal(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#fff',
                    border: '2px solid #000',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '4px 4px 0 #000',
                    transition: 'transform 0.1s',
                    color: '#000'
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'translate(4px, 4px)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'translate(0, 0)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translate(0, 0)'}
                >
                  下載展籤與任務卡 DOWNLOAD
                </button>

                <p style={{ fontSize: '0.7rem', color: '#bbb', marginTop: '12px' }}>每日一籤 · 明天再來試試運氣</p>
              </div>
            </div>
          </div>
        )
      }

      {/* RED ENVELOPE MODAL */}
      {
        showRedEnvelopeModal && (
          <div className="modal-overlay" onClick={() => setShowRedEnvelopeModal(false)} style={{ zIndex: 3000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', zIndex: 3001 }}>
              <div
                className="modal-header"
                style={{
                  background: '#D93025', // Red
                  color: '#fff',
                  borderBottom: '1px solid #eee'
                }}
              >
                <h3 className="font-mono" style={{ margin: 0, fontSize: '1rem', letterSpacing: '2px' }}>LUNAR NEW YEAR SPECIAL</h3>
                <button className="close-btn" onClick={() => setShowRedEnvelopeModal(false)} style={{ color: '#fff', background: 'rgba(0,0,0,0.2)' }}>×</button>
              </div>

              <div className="modal-body" style={{ padding: '30px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🧧</div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#D93025' }}>新年快樂！Happy New Year!</h3>
                <p style={{
                  fontSize: '1rem',
                  lineHeight: '1.8',
                  color: '#444',
                  whiteSpace: 'pre-line',
                  marginBottom: '25px',
                  fontStyle: 'italic'
                }}>
                  "這包不是壓歲錢，是壓驚錢。<br />
                  過去一年你辛苦了，真的。<br />
                  新的一年，願你的焦慮像鮮奶油一樣融化，<br />
                  願你的福氣像海綿蛋糕一樣蓬鬆！"
                  <br /><br />
                  — Kiwimu (遞)
                </p>

                <button
                  className="btn-primary"
                  style={{
                    display: 'block',
                    width: '100%',
                    background: '#D93025',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(217, 48, 37, 0.4)',
                    border: 'none',
                    padding: '12px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    handleLineDirectMessage('新年快樂');
                    track('lny_action_click', { type: 'red_envelope' });
                  }}
                >
                  前往 LINE 領取 (輸入: 新年快樂) ➔
                </button>
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '15px' }}>
                  點擊按鈕加入 LINE@，輸入關鍵字「<span style={{ color: '#D93025', fontWeight: 'bold' }}>新年快樂</span>」即可抽獎！
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* GOLD COIN MODAL */}
      {
        showGoldCoinModal && (
          <div className="modal-overlay" onClick={() => setShowGoldCoinModal(false)} style={{ zIndex: 3000 }}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', zIndex: 3001 }}>
              <div
                className="modal-header"
                style={{
                  background: '#FFD700', // Gold
                  color: '#000',
                  borderBottom: '1px solid #eee'
                }}
              >
                <h3 className="font-mono" style={{ margin: 0, fontSize: '1rem', letterSpacing: '2px' }}>WEALTH & FORTUNE</h3>
                <button className="close-btn" onClick={() => setShowGoldCoinModal(false)} style={{ color: '#000', background: 'rgba(255,255,255,0.4)' }}>×</button>
              </div>

              <div className="modal-body" style={{ padding: '30px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>💰</div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#B8860B' }}>今年財源滾滾來！</h3>
                <p style={{
                  fontSize: '1rem',
                  lineHeight: '1.8',
                  color: '#444',
                  whiteSpace: 'pre-line',
                  marginBottom: '25px',
                  fontStyle: 'italic'
                }}>
                  "錢不是萬能的，但沒有錢買甜點是萬萬不能的。<br />
                  這枚金幣送給你，<br />
                  祝你新的一年，荷包跟我的肚子一樣，<br />
                  越來越圓，越來越滿！"
                  <br /><br />
                  — Kiwimu (拍肚皮)
                </p>

                <button
                  className="btn-primary"
                  style={{
                    display: 'block',
                    width: '100%',
                    background: '#FFD700',
                    color: '#000',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                    border: 'none',
                    padding: '12px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    handleLineDirectMessage('golden pudding');
                    track('lny_action_click', { type: 'gold_coin' });
                  }}
                >
                  前往 LINE 領取 (輸入: golden pudding) ➔
                </button>
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '15px' }}>
                  點擊按鈕加入 LINE@，輸入關鍵字「<span style={{ color: '#B8860B', fontWeight: 'bold' }}>golden pudding</span>」<br />獲得布丁買一送一券！
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* LOGIN MODAL */}
      {
        showLogin && (
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
        )
      }

      {/* PROFILE MODAL */}
      {
        showProfile && user && (
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
        )
      }


      {/* FLOATING CART BAR */}
      {
        cart.length > 0 && (
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
        )
      }

      <style>{`
        .hidden-seal-container {
          cursor: pointer;
          position: relative;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          margin-bottom: 30px;
        }
        .hidden-seal-container:hover {
          transform: translateY(-5px);
        }
        .wax-seal {
          width: 60px;
          height: 60px;
          background: #8b0000;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3), inset 0 0 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.6s ease;
          border: 2px solid #5d0000;
        }
        .wax-seal::after {
          content: 'M';
          color: rgba(255,255,255,0.4);
          font-family: serif;
          font-size: 24px;
          font-weight: bold;
        }
        .wax-seal.broken {
          transform: translate(-50%, -50%) scale(1.5);
          opacity: 0;
          pointer-events: none;
        }
        .hidden-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.8s ease-in-out;
        }
        .hidden-content.revealed {
          max-height: 2000px;
        }
        @keyframes seal-shake {
          0% { transform: translate(-50%, -50%) rotate(0); }
          25% { transform: translate(-52%, -50%) rotate(-5deg); }
          75% { transform: translate(-48%, -50%) rotate(5deg); }
          100% { transform: translate(-50%, -50%) rotate(0); }
        }
        .hidden-seal-container:hover .wax-seal {
          animation: seal-shake 0.3s infinite;
        }
      `}</style>
    </>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
