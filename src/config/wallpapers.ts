// Cloudinary 縮圖：只改 <img src>（f_auto＝依瀏覽器給 avif／webp、q_auto＝自動品質、w_＝符合實際顯示寬度）。
// 下載連結 href 仍指向原圖，不受影響。
export const cloudinaryResize = (url: string, width: number) =>
  url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);

// Wallpaper assets (Cloudinary)
export const WALLPAPERS = [
  { label: "2026.01", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902254/2026_01_abhw1m.jpg" },
  { label: "2026.02", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902255/2026_02_qfvg9i.jpg" },
  { label: "Spring", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902362/New_year_ueuhsw.jpg" },
  { label: "Fortune", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902361/New_year-2_i9e9js.jpg" },
  { label: "2026.03", url: "https://res.cloudinary.com/dvizdsv4m/image/upload/v1771902255/2026_03_tduocw.jpg" }
];
