// 月島甜點店座標與到店距離判定，供前端 (index.tsx) 與 api/rewards/claim.ts 共用。
// 數值與公式沿用既有實作，未做任何調整。

export const STORE_LOCATION = { lat: 23.0473181, lng: 120.1987003 }; // 月島甜點店座標
export const STORE_RADIUS_METERS = 100; // 100 公尺範圍

/** 粗略計算兩點距離（公尺） - Haversine */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球半徑 (m)
  const toRad = (d: number) => d * Math.PI / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lng2 - lng1);

  const a = Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
