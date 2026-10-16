import { CONFIG } from '../config/site';

// 頁面全域樣式（含 CONFIG.BRAND_COLORS 插值，所以是 TS 模組而不是 .css）。內容與原本 App 內的 <style> 逐字相同。
export const APP_STYLES = `
        :root {
          /* Existing Colors */
          --c-cream: ${CONFIG.BRAND_COLORS.creamWhite};
          --c-black: ${CONFIG.BRAND_COLORS.emotionBlack};
          --c-yellow: ${CONFIG.BRAND_COLORS.moss};
          --c-yellow-deep: ${CONFIG.BRAND_COLORS.forestGold};
          --c-blue: ${CONFIG.BRAND_COLORS.forestMid};
          --c-gray: ${CONFIG.BRAND_COLORS.grayText};
          --c-line: ${CONFIG.BRAND_COLORS.grayLine};
          
          /* Glassmorphism Variables */
          --glass-white-light: rgba(255, 255, 255, 0.6);
          --glass-white-medium: rgba(255, 255, 255, 0.8);
          --glass-white-strong: rgba(255, 255, 255, 0.95);
          
          /* Shadows */
          --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
          --shadow-glass-hover: 0 12px 40px 0 rgba(0, 0, 0, 0.12);
          --shadow-glow-blue: 0 0 20px rgba(48, 79, 47, 0.3);
          --shadow-glow-yellow: 0 0 20px rgba(215, 198, 120, 0.4);
          /* 舊「蓋章」硬陰影已改柔和陰影（2026-10-14）：變數名保留，避免動到引用處 */
          --shadow-stamp: 0 6px 16px rgba(31, 47, 31, 0.18);
          --shadow-stamp-strong: 0 8px 22px rgba(31, 47, 31, 0.28);

          /* Easing */
          --ease-ui: cubic-bezier(0.4, 0, 0.2, 1);
          --ease-playful: cubic-bezier(0.175, 0.885, 0.32, 1.275);

          /* LINE brand green (two shades in use — kept distinct, zero visual change) */
          --c-line-brand: #06C755;
          --c-line-brand-alt: #00B900;
        }
        
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        html {
          scroll-behavior: smooth;
        }

        :focus-visible {
          outline: 2px solid var(--c-blue);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
          html {
            scroll-behavior: auto;
          }
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
        .font-mono { font-family: "JetBrains Mono", ui-monospace, Menlo, monospace; letter-spacing: 0.05em; text-transform: uppercase; }
        .text-blue { color: var(--c-blue); }
        .text-yellow { color: var(--c-yellow); }
        
        /* Components - Glassmorphism */
        .btn-entry {
          background: var(--glass-white-medium);
          backdrop-filter: blur(16px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: var(--shadow-glass),
                      inset 0 1px 0 rgba(255, 255, 255, 0.6);
          text-align: left;
          transition: all 0.4s var(--ease-ui);
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
                      0 0 0 1px rgba(88, 115, 55, 0.24),
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
          background: ${CONFIG.BRAND_COLORS.forestDeep};
          color: ${CONFIG.BRAND_COLORS.creamWhite};
          padding: 16px; border-radius: 40px; font-weight: bold;
          min-height: 50px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          position: relative; overflow: hidden;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .btn-primary:hover {
          background: ${CONFIG.BRAND_COLORS.forestMid};
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
          transition: all 0.3s var(--ease-ui);
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
          background: var(--c-yellow-deep);
          border-color: rgba(0, 0, 0, 0.2);
          color: var(--c-black);
          box-shadow: 0 6px 16px rgba(31, 47, 31, 0.18);
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
        .btn-checkout-loading {
          position: relative;
          color: transparent !important;
          pointer-events: none;
          cursor: wait;
        }
        .btn-checkout-loading::after {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          top: 50%;
          left: 50%;
          margin: -10px 0 0 -10px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
          top: calc(var(--ku-rail-height) + 20px);
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
            top: calc(var(--ku-rail-height) + 15px);
            right: 15px;
            width: 60px;
          }
        }
      `;
