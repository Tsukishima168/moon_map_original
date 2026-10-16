// /menu 頁首（插畫＋標題＋說明＋回首頁）。純靜態標記：沒有 props、state 或副作用。取景規則見 styles/window-plan.css。
export const MenuPageHeader = () => (
  <header className="season04-menu-header">
    <div className="season04-menu-art" aria-hidden="true">
      <picture>
        <source media="(max-width: 519px)" srcSet="/assets/season-04/pause-mobile.avif" type="image/avif" />
        <source media="(max-width: 519px)" srcSet="/assets/season-04/pause-mobile.webp" type="image/webp" />
        <source srcSet="/assets/season-04/pause-desktop.avif" type="image/avif" />
        <img src="/assets/season-04/pause-desktop.webp" alt="" decoding="async" fetchPriority="high" />
      </picture>
    </div>
    <div className="season04-menu-copy">
      <div>
        <span className="font-mono season04-menu-kicker">DESSERT MENU · SEASON 04</span>
        <h1>甜點目錄</h1>
        <p>把本季甜點整理成清楚好選的綠色系列。茶、奶油、果實與咖啡在窗影裡慢慢展開，挑一份今天想停下來的味道。</p>
      </div>
      <a href="/">回首頁</a>
    </div>
  </header>
);
