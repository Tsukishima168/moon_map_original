/**
 * 月島的播放清單。索引是「手上正在做的事」，不是星期幾也不是心情。
 * 全部為公開清單 —— embed 只有公開清單訪客才看得到。
 */
export const SPOTIFY_PLAYLISTS: ReadonlyArray<{ id: string; label: string; en: string; note: string }> = [
  { id: '1Cw8MbGrZgQHHJngRhzX0O', label: '窗邊甜點目錄', en: 'Dessert Menu by the Window', note: '綠色午後的窗邊。清透、慢、一點日系咖啡與奶油感。' },
  { id: '7ENCiOh49S6QRHWlP0IeE1', label: '開機暖身', en: 'Warm Up', note: '電量夠、但還沒開始。降低啟動阻力——溫、穩、往前，但不推你。' },
  { id: '23LfLPJ97eXTFZ1V4U8htD', label: '深度專注', en: 'Deep Focus', note: '寫程式、寫文案、看合約、算帳。全程零人聲。' },
  { id: '74tvil8NwqwgPV0ak41arx', label: '動手時段', en: 'Hands On', note: '做甜點、擺盤、設計、剪片、修圖。不用讀字的專注工作。' },
  { id: '6txkf5rU2KNcE3ERp9q96f', label: '重複勞動', en: 'Busywork', note: '包貨、盤點、建檔、整理。熟悉度就是功能。' },
  { id: '2rA0j1T8QRHlpZvDS0FyFF', label: '提振精神', en: 'Boost', note: '電量低於任務需求，但事情非開始不可。只有 20 首，是藥不是飯。' },
  { id: '4CE0Yv9VnPiQl35ZYxyfL5', label: '收工降溫', en: 'Wind Down', note: '開完會、收工、腦子關不掉。把喚起度拉回地面。' },
  { id: '2tIu5BSV5JzqufQvxfBDxi', label: '店裡外放', en: 'In Store', note: '有客人、有同事在場。店裡實際在放的就是這張。' },
];
