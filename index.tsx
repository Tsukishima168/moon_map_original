
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

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
    islandBlue: '#5878F0',
    grayText: '#666666',
    grayLine: '#E0E0E0',
  },
  LINKS: {
    preorder_pickup_url: "https://lin.ee/MndRHE2",
    delivery_url: "https://lin.ee/MndRHE2",
    line_url: "https://lin.ee/MndRHE2",
    mbti_lab_url: "https://kiwimu-mbti.vercel.app",
    spotify_url: "https://open.spotify.com/playlist/moonmoon",
    wallpaper_url: "https://drive.google.com/drive/folders/moonmoon-wallpaper",
    line_theme_url: "https://store.line.me/themeshop/product/moonmoon",
    kiwimu_ig_url: "https://www.instagram.com/moon_moon_dessert/",
    instagram_moonmoon_url: "https://www.instagram.com/moon_moon_dessert/",
    address_text: "台北市大安區月島路 101 號",
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
};

// --- COMPONENTS ---

const App = () => {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    document.title = `${CONFIG.STORE_NAME_EN} | Island Landing`;
  }, []);

  const handleStateSelect = (stateKey: string) => {
    setSelectedState(stateKey);
    setShowResult(false); // Reset animation
    track('select_state', { state: stateKey });

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
        <text x="40" y="150" font-family="sans-serif" font-size="24" fill="${CONFIG.BRAND_COLORS.islandBlue}">${data.title}</text>
        <line x1="40" y1="180" x2="360" y2="180" stroke="#ddd" stroke-width="1"/>
        <text x="40" y="220" font-family="sans-serif" font-weight="bold" font-size="16" fill="#000">PRESCRIPTION:</text>
        <text x="40" y="250" font-family="sans-serif" font-size="18" fill="#000">${data.item}</text>
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
          padding-left: 20px; 
          margin-left: 10px;
          background: var(--glass-white-light);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: var(--shadow-glass);
        }
        .timeline-item { position: relative; margin-bottom: 30px; padding-left: 20px; border-left: 1px solid var(--c-black); }
        .timeline-item::before {
          content: ''; position: absolute; left: -25px; top: 8px;
          width: 9px; height: 9px; background: var(--c-black); border-radius: 50%;
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
      `}</style>

      <div className="container">
        {/* A. HERO */}
        <header style={{ paddingTop: '80px', paddingBottom: '40px', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '-20px',
            width: '180px',
            animation: 'float 6s ease-in-out infinite',
            zIndex: -1
          }}>
            <img src="/assets/character-enter.webp" alt="Moon Island Character" style={{ width: '100%', height: 'auto' }} />
          </div>

          <div className="font-mono" style={{ marginBottom: '10px', fontSize: '0.8rem' }}>WELCOME TO MOON ISLAND</div>
          <h1 style={{ fontSize: '2.5rem', lineHeight: '1.1', marginBottom: '10px', fontWeight: 700 }}>
            {CONFIG.STORE_NAME_EN}<br />Island Landing
          </h1>
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

        {/* C. PEAK EXPERIENCE */}
        <section className="section-padding" style={{ paddingBottom: '20px' }}>
          <h2 className="font-mono">INTERACTIVE ZONE</h2>
          <p style={{ fontSize: '1.1rem', marginTop: '10px' }}>
            這不只是一次購買，而是一場狀態的確認。<br />
            選一個關鍵字，交換一份<span style={{ boxShadow: `inset 0 -0.5em 0 ${CONFIG.BRAND_COLORS.moonYellow}` }}>甜點處方箋</span>。
          </p>
        </section>

        {/* D. CHECK-IN */}
        <section id="checkin" style={{ paddingBottom: '60px' }}>
          <div className="border-t" style={{ paddingTop: '30px' }}>
            <h3>今日登島狀態？</h3>
            <div className="checkin-grid">
              {Object.entries(STATE_DATA).map(([key, data], index) => (
                <button
                  key={key}
                  className={`state-btn ${selectedState === key ? 'selected' : ''}`}
                  style={index === 4 ? { gridColumn: 'span 2' } : {}}
                  onClick={() => handleStateSelect(key)}
                >
                  {data.title.split('/')[0].trim()}
                </button>
              ))}
            </div>

            {showResult && selectedState && (
              <div className="result-card">
                <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px', fontSize: '0.8rem' }}>
                  <span>DATE: {dateStr}</span>
                  <span>MOON PASS</span>
                </div>

                <div className="font-mono" style={{ color: CONFIG.BRAND_COLORS.grayText, fontSize: '0.8rem' }}>STATE:</div>
                <h3 className="text-blue" style={{ fontSize: '1.4rem', marginBottom: '15px' }}>{STATE_DATA[selectedState].title}</h3>

                <p style={{ fontStyle: 'italic', borderLeft: `3px solid ${CONFIG.BRAND_COLORS.moonYellow}`, paddingLeft: '12px', marginBottom: '20px', color: '#444' }}>
                  {STATE_DATA[selectedState].advice}
                </p>

                <div className="font-mono" style={{ color: CONFIG.BRAND_COLORS.grayText, fontSize: '0.8rem' }}>RECOMMENDATION</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px' }}>{STATE_DATA[selectedState].item}</div>

                <div style={{ background: CONFIG.BRAND_COLORS.creamWhite, padding: '15px', fontSize: '0.9rem', marginBottom: '20px' }}>
                  <strong>今日任務：</strong> {STATE_DATA[selectedState].mission}
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <a href={`${CONFIG.LINKS.mbti_lab_url}?source=guide&state=${selectedState}`} target="_blank" rel="noreferrer" className="btn-primary">
                    開始 3 分鐘測驗
                  </a>
                  <a href={CONFIG.LINKS.line_url} target="_blank" rel="noreferrer" className="btn-small">
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

        {/* E. SOFT BUY */}
        <section className="section-padding border-t">
          <h2 className="font-mono" style={{ marginBottom: '20px' }}>ACQUIRE / TAKE HOME</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <a href={CONFIG.LINKS.preorder_pickup_url} target="_blank" rel="noreferrer" className="btn-entry">
              <div>
                <strong>到店預訂取貨</strong>
                <div className="font-mono" style={{ fontSize: '0.8rem', color: CONFIG.BRAND_COLORS.grayText }}>Reserve & Pickup. 最快途徑。</div>
              </div>
              <span>→</span>
            </a>
            <a href={CONFIG.LINKS.delivery_url} target="_blank" rel="noreferrer" className="btn-entry">
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
              <a href={CONFIG.LINKS.wallpaper_url} target="_blank" rel="noreferrer" className="font-mono">DOWNLOAD ↓</a>
            </li>
            <li>
              <span>MoonMoon Radio (歌單)</span>
              <a href={CONFIG.LINKS.spotify_url} target="_blank" rel="noreferrer" className="font-mono">LISTEN ↗</a>
            </li>
            <li>
              <span>本季 LINE 主題</span>
              <a href={CONFIG.LINKS.line_theme_url} target="_blank" rel="noreferrer" className="font-mono">VIEW ↗</a>
            </li>
          </ul>
        </section>

        {/* G. KIWIMU */}
        <section className="section-padding" style={{ background: CONFIG.BRAND_COLORS.emotionBlack, color: 'white', marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px', textAlign: 'center' }}>
          <h2 className="font-mono text-yellow" style={{ marginBottom: '10px' }}>KIWIMU LAB</h2>
          <p style={{ opacity: 0.8, marginBottom: '30px' }}>
            KIWIMU 是月島的互動角色宇宙。<br />
            這裡收藏了所有登島者的情緒檔案。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <a href={CONFIG.LINKS.kiwimu_ig_url} target="_blank" rel="noreferrer" style={{ borderBottom: '1px solid white', paddingBottom: '2px' }}>參觀角色展間</a>
            <a href={CONFIG.LINKS.mbti_lab_url} target="_blank" rel="noreferrer" style={{ borderBottom: '1px solid white', paddingBottom: '2px' }}>進入 MBTI Lab</a>
          </div>
        </section>

        {/* H. FOOTER */}
        <footer style={{ padding: '60px 0', textAlign: 'center', fontSize: '0.8rem', color: CONFIG.BRAND_COLORS.grayText }}>
          <div style={{ marginBottom: '20px', fontWeight: 'bold', color: 'black' }}>
            <a href={CONFIG.LINKS.instagram_moonmoon_url} style={{ margin: '0 10px' }}>INSTAGRAM</a>
            <a href={CONFIG.LINKS.line_url} style={{ margin: '0 10px' }}>LINE</a>
          </div>
          <p style={{ marginBottom: '5px' }}>{CONFIG.LINKS.address_text}</p>
          <p className="font-mono">{CONFIG.LINKS.hours_text}</p>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
            <p style={{ fontSize: '1rem', color: '#999', marginBottom: '10px' }}>你路過，也算參展。</p>
            <p className="font-mono" style={{ fontSize: '0.7rem', color: '#ccc' }}>© {CONFIG.STORE_NAME_EN}</p>
          </div>
        </footer>
      </div>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
