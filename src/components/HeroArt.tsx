// hero 的插畫區（只有 <picture>，沒有 props、state 或副作用）。取景規則見 styles/window-plan.css 與 docs/DESIGN-SYSTEM.md「Hero 取景」。
export const HeroArt = () => (
  <div className="season04-hero-art" aria-hidden="true">
    <picture>
      <source media="(max-width: 599px)" srcSet="/assets/season-04/wonder-mobile.avif" type="image/avif" />
      <source media="(max-width: 599px)" srcSet="/assets/season-04/wonder-mobile.webp" type="image/webp" />
      <source srcSet="/assets/season-04/wonder-desktop.avif" type="image/avif" />
      <img src="/assets/season-04/wonder-desktop.webp" alt="" decoding="async" fetchPriority="high" />
    </picture>
  </div>
);
