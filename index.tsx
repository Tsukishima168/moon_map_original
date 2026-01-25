
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
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [recommendation, setRecommendation] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);
  const [headerImage, setHeaderImage] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // --- SUPABASE MENU DATA ---
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

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

        // 2. Fetch Items
        const { data: items, error: itemError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('sort_order');

        if (itemError) throw itemError;

        // 3. Combine
        if (categories && items) {
          const combined = categories.map(cat => ({
            id: cat.id,
            title: cat.title,
            subtitle: cat.subtitle,
            hidePrice: cat.id === 'drinks', // Hardcoded logic for drinks, can be moved to DB later
            items: items.filter(item => item.category_id === cat.id).map(item => ({
              name: item.name,
              image: item.image,
              prices: item.prices // Supabase returns JSONB as object automatically
            }))
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
    // Create a simple SVG blob for download (No external libs needed)
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
        <rect width="100%" height="100%" fill="${CONFIG.BRAND_COLORS.creamWhite}"/>
        <rect x="20" y="20" width="360" height="560" fill="white" stroke="black" stroke-width="2" stroke-dasharray="5,5"/>
        <rect x="0" y="0" width="400" height="10" fill="${CONFIG.BRAND_COLORS.moonYellow}"/>
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

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MoonMission_${selectedState}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert("任務卡已生成！\n(手機請截圖保存，電腦已自動下載 SVG)");
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
          top: 20px; 
          right: -20px; 
          width: 180px;
          animation: float 6s ease-in-out infinite; 
          zIndex: -1;
        }
        @media (max-width: 768px) {
          .header-bird {
            top: 10px;
            right: -50px; /* Move further right on mobile to avoid overlapping text */
            width: 140px; /* Make smaller */
            opacity: 0.9;
          }
        }
      `}</style>

      <div className="container">
        {/* A. HERO */}
        <header style={{ paddingTop: '80px', paddingBottom: '40px', position: 'relative' }}>
          <div className="header-bird">
            <img src={headerImage || "https://res.cloudinary.com/dvizdsv4m/image/upload/v1768744158/Enter-05_nrt403.webp"} alt="Moon Island Character" style={{ width: '100%', height: 'auto' }} />
          </div>

          <div className="font-mono" style={{ marginBottom: '10px', fontSize: '0.8rem' }}>WELCOME TO MOON ISLAND</div>

          {/* Logo Integration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <img src="/assets/logo-chinese.png" alt="Moon Moon Dessert" style={{ maxWidth: '280px', height: 'auto', filter: 'brightness(0)' }} />
            <h1 style={{ fontSize: '2rem', lineHeight: '1.2', fontWeight: 700, margin: 0, opacity: 0.8 }}>
              Island Landing
            </h1>
          </div>

          <p style={{ color: CONFIG.BRAND_COLORS.grayText, marginBottom: '40px' }}>{CONFIG.TAGLINE}</p>

          <a href="#checkin" className="btn-entry" onClick={() => track('click_hero_checkin')}>
            <div>
              <span className="font-mono text-blue" style={{ fontSize: '0.8rem' }}>01 // INTERACT</span><br />
              <strong>我想登島互動 (Check-in)</strong>
            </div>
            <span>↓</span>
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
          overflow: 'hidden'
        }}>
          {/* Dark overlay to ensure text readability if needed, but user said "don't want transparency", likely meaning the image itself. 
              We'll add a slight gradient for text protection without obscuring the image too much. */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 0
          }}></div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <section style={{ marginBottom: '30px', textAlign: 'center' }}>
              <h2 className="font-mono" style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>INTERACTIVE ZONE</h2>
              <p style={{ fontSize: '1.1rem', marginTop: '10px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                這不只是一次選擇，而是一場狀態的確認。<br />
                選一個關鍵字，交換一份<span style={{ borderBottom: `2px solid ${CONFIG.BRAND_COLORS.moonYellow}`, paddingBottom: '2px' }}>甜點處方箋</span>。
              </p>
            </section>

            <section id="checkin">
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '30px' }}>
                <h3 style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)', marginBottom: '20px' }}>今日登島狀態？</h3>

                <div className="checkin-grid">
                  {Object.entries(STATE_DATA).map(([key, data], index) => (
                    <button
                      key={key}
                      className={`state-btn ${selectedState === key ? 'selected' : ''}`}
                      style={{
                        ...(index === 4 ? { gridColumn: 'span 2' } : {}),
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        color: 'white',
                        backdropFilter: 'blur(4px)'
                      }}
                      onClick={() => handleStateSelect(key)}
                    >
                      {data.title.split('/')[0].trim()}
                    </button>
                  ))}
                </div>

                {showResult && selectedState && (
                  <div className="result-card" style={{ background: 'rgba(255, 255, 255, 0.95)', color: CONFIG.BRAND_COLORS.emotionBlack }}>
                    <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px', fontSize: '0.8rem' }}>
                      <span>DATE: {dateStr}</span>
                      <span>MOON PASS</span>
                    </div>

                    <div className="font-mono" style={{ color: CONFIG.BRAND_COLORS.grayText, fontSize: '0.8rem' }}>STATE:</div>
                    <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: CONFIG.BRAND_COLORS.emotionBlack }}>{STATE_DATA[selectedState].title}</h3>

                    <p style={{ fontStyle: 'italic', borderLeft: `3px solid ${CONFIG.BRAND_COLORS.moonYellow}`, paddingLeft: '12px', marginBottom: '20px', color: '#444' }}>
                      {STATE_DATA[selectedState].advice}
                    </p>

                    <div className="font-mono" style={{ color: CONFIG.BRAND_COLORS.grayText, fontSize: '0.8rem' }}>RECOMMENDATION</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px' }}>{recommendation}</div>

                    <div style={{ background: CONFIG.BRAND_COLORS.creamWhite, padding: '15px', fontSize: '0.9rem', marginBottom: '20px' }}>
                      <strong>今日任務：</strong> {STATE_DATA[selectedState].mission}
                    </div>

                    <div style={{ display: 'grid', gap: '10px' }}>
                      <a href={`https://moonmoon-dessert-passport.vercel.app/?source=guide&state=${selectedState}`} target="_blank" rel="noreferrer" className="btn-primary" onClick={() => track('click_quiz_start', { state: selectedState })}>
                        開始 30 秒測驗
                      </a>
                      <a href={CONFIG.LINKS.line_url} target="_blank" rel="noreferrer" className="btn-small" onClick={() => track('click_join_line_mission', { state: selectedState })}>
                        加入 LINE 領取任務
                      </a>
                      <button onClick={handleDownloadCard} className="btn-small font-mono">
                        ↓ SAVE MISSION CARD
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* E. SOFT BUY */}
        <section className="section-padding border-t">
          <h2 className="font-mono" style={{ marginBottom: '20px' }}>ARCHIVE / COLLECTION</h2>

          <button style={{
            width: '100%',
            background: 'black',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: 'left'
          }} onClick={() => { setShowMenu(true); track('click_view_menu'); }}>
            <div>
              <strong style={{ fontSize: '1.2rem' }}>查看本季菜單</strong>
              <div className="font-mono" style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '5px' }}>MENU. 完整品項一覽。</div>
            </div>
            <span style={{ fontSize: '1.5rem' }}>↓</span>
          </button>

          <div style={{ display: 'grid', gap: '12px' }}>
            <a href={CONFIG.LINKS.preorder_pickup_url} target="_blank" rel="noreferrer" className="btn-entry" onClick={() => track('click_section_pickup')}>
              <div>
                <strong>到店預訂取貨</strong>
                <div className="font-mono" style={{ fontSize: '0.8rem', color: CONFIG.BRAND_COLORS.grayText }}>Reserve & Pickup. 最快途徑。</div>
              </div>
              <span>→</span>
            </a>
            <a href={CONFIG.LINKS.delivery_url} target="_blank" rel="noreferrer" className="btn-entry" onClick={() => track('click_section_delivery')}>
              <div>
                <strong>冷凍宅配到府</strong>
                <div className="font-mono" style={{ fontSize: '0.8rem', color: CONFIG.BRAND_COLORS.grayText }}>Delivery. 把島嶼打包送給你。</div>
              </div>
              <span>↗</span>
            </a>
          </div>
        </section>

        {/* F. WEAK LINKS */}
        <section className="section-padding">
          <h2 className="font-mono" style={{ marginBottom: '20px' }}>SOUVENIRS (FREE)</h2>
          <ul className="link-list">
            <li>
              <span>本季手機桌布</span>
              <a href={CONFIG.LINKS.wallpaper_url} target="_blank" rel="noreferrer" className="font-mono" onClick={() => track('click_download_wallpaper')}>DOWNLOAD ↓</a>
            </li>
            <li style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>MoonMoon Radio (歌單)</span>
              </div>
              <iframe
                data-testid="embed-iframe"
                style={{ borderRadius: '12px' }}
                src="https://open.spotify.com/embed/playlist/4GvSWtZD5YiJdIu7M8e9Ei?utm_source=generator&theme=0"
                width="100%"
                height="352"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            </li>
            <li>
              <span>本季 LINE 主題</span>
              <a href={CONFIG.LINKS.line_theme_url} target="_blank" rel="noreferrer" className="font-mono" onClick={() => track('click_view_line_theme')}>VIEW ↗</a>
            </li>
          </ul>
        </section>

        {/* G. KIWIMU */}
        <section className="section-padding" style={{ background: CONFIG.BRAND_COLORS.emotionBlack, color: 'white', marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px', textAlign: 'center' }}>
          {/* Kiwimu Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img src="/assets/logo-kiwimu.png" alt="KIWIMU LAB" style={{ maxWidth: '200px', height: 'auto', filter: 'invert(1)' }} />
          </div>

          <p style={{ opacity: 0.8, marginBottom: '30px' }}>
            KIWIMU 是月島的互動角色宇宙。<br />
            這裡收藏了所有登島者的情緒檔案。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <a href={CONFIG.LINKS.kiwimu_ig_url} target="_blank" rel="noreferrer" style={{ borderBottom: '1px solid white', paddingBottom: '2px' }} onClick={() => track('click_visit_showroom')}>參觀角色展間</a>
            <a href={CONFIG.LINKS.mbti_lab_url} target="_blank" rel="noreferrer" style={{ borderBottom: '1px solid white', paddingBottom: '2px' }} onClick={() => track('click_enter_mbti_lab')}>進入 MBTI Lab</a>
          </div>
        </section>

        {/* H. FOOTER */}
        <footer style={{ padding: '60px 0', textAlign: 'center', fontSize: '0.8rem', color: CONFIG.BRAND_COLORS.grayText }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '30px', alignItems: 'center' }}>
            <a href={CONFIG.LINKS.instagram_moonmoon_url} target="_blank" rel="noreferrer" onClick={() => track('click_footer_instagram')}>
              <img src="https://img.icons8.com/ios-filled/50/000000/instagram-new.png" alt="Instagram" style={{ width: '30px', height: '30px', opacity: 0.6 }} />
            </a>
            <a href={CONFIG.LINKS.mbti_lab_url} target="_blank" rel="noreferrer" onClick={() => track('click_footer_mbti')}>
              <img src="https://img.icons8.com/ios-filled/50/000000/brain.png" alt="MBTI Lab" style={{ width: '30px', height: '30px', opacity: 0.6 }} />
            </a>
            <a href={CONFIG.LINKS.line_url} target="_blank" rel="noreferrer" onClick={() => track('click_footer_line')}>
              <img src="https://img.icons8.com/ios-filled/50/000000/line-me.png" alt="LINE" style={{ width: '30px', height: '30px', opacity: 0.6 }} />
            </a>
          </div>
          <p style={{ marginBottom: '5px' }}>{CONFIG.LINKS.address_text}</p>
          <p className="font-mono">{CONFIG.LINKS.hours_text}</p>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
            <p style={{ fontSize: '1rem', color: '#999', marginBottom: '10px' }}>你路過，也算參展。</p>
            <p className="font-mono" style={{ fontSize: '0.7rem', color: '#ccc' }}>© {CONFIG.STORE_NAME_EN}</p>
          </div>
        </footer>


        {/* MENU MODAL */}
        {
          showMenu && (
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
                                      background: cat.id === 'drinks' ? CONFIG.BRAND_COLORS.islandBlue : CONFIG.BRAND_COLORS.moonYellow,
                                      borderRadius: '2px',
                                      marginRight: '12px',
                                      flexShrink: 0
                                    }}></div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{item.name}</div>
                                  </div>
                                  {cat.id !== 'drinks' && (
                                    <span style={{ fontSize: '0.8rem', color: '#ccc' }}>{expandedItem === item.name ? '▲' : '▼'}</span>
                                  )}
                                </div>

                                {/* Item Image Expansion */}
                                {expandedItem === item.name && (item as any).image && (
                                  <div style={{ marginBottom: '15px', borderRadius: '8px', overflow: 'hidden', animation: 'fadeIn 0.3s' }}>
                                    <img src={(item as any).image} alt={item.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
                                  </div>
                                )}

                                {!cat.hidePrice && (
                                  <div style={{ paddingLeft: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {item.prices.map((p, pIdx) => (
                                      <span key={pIdx} className="font-mono" style={{ fontSize: '0.8rem', color: '#666', background: 'rgba(0,0,0,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                                        {p.spec}: {p.price}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <a href={CONFIG.LINKS.line_url} target="_blank" rel="noreferrer" className="btn-primary" onClick={() => track('click_menu_reserve')}>
                      前往 LINE 預訂
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
