# 2026-04-07 Menu Data Alignment

> 2026-04-18 更新：本文件保留為對齊盤點快照，但 runtime 已不是「純靜態 menu」。
> 當前真實行為是 `map/menu` 先讀同域 `/api/menu`，由它優先讀 Supabase canonical menu，失敗時才回退 `shop /api/menu/categories`，並在 server 端完成 display metadata merge；最後才回退 `public/menu.json`。
> `MBTI` 商品指向也已改由同域 `/api/mbti-dessert` 讀 Supabase `mbti_menu_links` + `menu_items`；本地常數只保留人格文案與 fallback 順序。
> 另已新增 opt-in 的 Supabase display config schema（`site_category_configs` / `site_item_configs`），但預設關閉，不影響目前上線站點。
> 以架構真相而言，請優先參考 `api/menu.ts`、`index.tsx` 與 `docs/2026-04-07-backend-data-flow-inventory.md`。

## 今日原則

- 不改動目前前端 runtime 行為。
- 先確認三邊資料來源與命名差異。
- 先以 `shop` 作為未來商品主源候選。
- `MBTI` 若 `shop` 尚未正式開放，維持導向 `map/menu`。

## 目前三邊資料來源

| 入口 | 現在讀什麼 | 資料來源 | 備註 |
| --- | --- | --- | --- |
| `map.kiwimu.com/menu` | canonical menu + fallback | Supabase `menu_categories` + `menu_items` + `menu_variants` -> `shop /api/menu/categories` -> `public/menu.json` | 商品主資料現在以 Supabase 為主；`public/menu.json` 仍承載 fallback 與展示層 metadata |
| `shop.kiwimu.com` | live 商品資料 | `menu_categories` + `menu_items` + `menu_variants` | 目前最接近商品主源 |
| `kiwimu.com` MBTI 結果甜點 | MBTI 配對內容 | Supabase `mbti_menu_links` + `menu_items`（經由 `map` 的 `/api/mbti-dessert` 消費） | 商品指向已回到 canonical DB；人格文案仍留在前端 |
| 月島會員同步 | 會員 MBTI | `profiles` | 共用的是會員資料，不是商品資料 |

## 今日結論

1. `map/menu` 商品主資料已優先改由 Supabase canonical tables 提供
2. `map/menu` runtime 仍保留 `shop /api/menu/categories` 與 `public/menu.json` fallback；目前不影響既有訂購流程
3. `MBTI` 商品指向已改走 `/api/mbti-dessert`，回到 Supabase `mbti_menu_links`
4. 目前仍未完全收斂的是 display metadata，不是商品主資料

## Map Static vs Shop Live

狀態定義：

- `exactish`：同一商品，只是命名格式不同
- `missing_in_shop`：`map` 有，但 `shop` live 目前沒有
- `approx_only`：只有近似，不是完全同名

| 類別 | map static 名稱 | shop live 名稱 | 狀態 | 備註 |
| --- | --- | --- | --- | --- |
| tiramisu | 經典提拉米蘇 | 經典｜提拉米蘇 | exactish | 名稱格式差異 |
| tiramisu | 烤焦糖布丁摩卡米蘇 | 烤焦糖布丁摩卡｜提拉米蘇 | exactish | 名稱格式差異 |
| tiramisu | 小山園抹茶米蘇 | 小山園抹茶｜提拉米蘇 | exactish | 名稱格式差異 |
| tiramisu | 日本柚子蘋果乳酪米蘇 | 日本柚子蘋果乳酪｜提拉米蘇 | exactish | 名稱格式差異 |
| tiramisu | 莓果提拉米蘇 |  | missing_in_shop | `shop` live 沒這筆 |
| tiramisu | 奶酒提拉米蘇 | 貝里詩奶酒｜提拉米蘇 | exactish | 商業命名改版 |
| basque | 原味巴斯克 | 北海道經典｜巴斯克乳酪 | exactish | 商業命名改版 |
| basque | 檸檬巴斯克 | 檸檬｜巴斯克乳酪 | exactish | 名稱格式差異 |
| basque | 鹹蛋黃巴斯克 | 鹹蛋黃｜巴斯克乳酪 | exactish | 名稱格式差異 |
| chiffon | 莓果巧克力戚風蛋糕 | 莓果巧克力｜戚風蛋糕 | exactish | 名稱格式差異 |
| chiffon | 烤焦糖布丁戚風蛋糕 | 烤焦糖布丁｜戚風蛋糕 | exactish | 名稱格式差異 |
| mille_crepe | 北海道十勝低糖原味千層 | 北海道十勝低糖原味｜千層蛋糕 | exactish | 名稱格式差異 |
| mille_crepe | 法芙娜巧克力布朗尼千層 | 巧克力布朗尼｜千層蛋糕 | exactish | 商業命名簡化 |
| mille_crepe | 特濃抹茶千層 | 特濃宇治抹茶｜千層蛋糕 | approx_only | 可能是同商品改名 |
| mille_crepe | 伯爵茶千層 | 格雷伯爵奶蓋｜千層蛋糕 | approx_only | 可能是同系列但不是完全同品 |
| mille_crepe | 檸檬日本柚子千層 | 檸檬日本柚子｜千層蛋糕 | exactish | 名稱格式差異 |
| mille_crepe | 蜜香紅茶拿鐵千層 | 蜜香紅茶拿鐵｜千層蛋糕 | exactish | 名稱格式差異 |
| mille_crepe | 焙茶拿鐵千層 | 特濃靜岡焙茶拿鐵｜千層蛋糕 | approx_only | 可能是同商品升級命名 |
| mille_crepe | 十勝低糖水果森林千層 | 十勝水果派對｜千層蛋糕 | approx_only | 可能是同商品改名 |
| pudding | 布丁 | 經典烤布丁｜乾濕分離 | approx_only | `shop` 命名更完整 |
| drinks | 美式咖啡 | 經典美式咖啡 | exactish | 名稱格式差異 |
| drinks | 經典拿鐵 | 特濃拿鐵 | approx_only | 可能不是完全同規格 |
| drinks | 日本柚子美式 | 日本柚子美式 | exactish | 完全一致 |
| drinks | 薄荷茶 | 甘草薄荷茶 | approx_only | 品項更完整 |
| drinks | 焙茶拿鐵 | 靜岡焙茶拿鐵 | approx_only | 品項更完整 |
| drinks | 烤布丁拿鐵 | 來一顆烤布丁拿鐵 | exactish | 行銷命名差異 |
| drinks | 博士茶 | 博士茶 | exactish | 完全一致 |
| drinks | 抹茶拿鐵 | 小山園抹茶拿鐵 | approx_only | 原料命名補強 |
| drinks | 花草茶 | 舒緩花草茶 | approx_only | 行銷命名差異 |
| drinks | 西西里美式 | 西西里咖啡 | approx_only | 需確認是否同商品 |
| drinks | 蕎麥茶 | 黃金蕎麥茶 | exactish | 行銷命名差異 |

## Shop Live 但 Map Static 尚未反映

### 戚風

| shop live 名稱 | 狀態 | 備註 |
| --- | --- | --- |
| 十勝草莓莓果｜戚風蛋糕 | OFF | 草莓季節品，`map` 已移除 |
| 草莓｜巧克力莓果｜戚風蛋糕 | OFF | 草莓季節品，`map` 已移除 |

### 千層

| shop live 名稱 | 狀態 | 備註 |
| --- | --- | --- |
| 北海道十勝莓果草莓｜千層蛋糕 | OFF | `map` 無對應現行品名 |
| 卡士達十勝草莓｜千層蛋糕 | OFF | `map` 已移除 |
| 巧克力莓果草莓｜千層蛋糕 | OFF | `map` 已移除 |
| 檸檬日本柚子草莓｜千層蛋糕 | OFF | `map` 已移除 |

## MBTI Soul Dessert vs Shop Canonical

狀態定義：

- `mapped`：可以直接或高信心對到 `shop`
- `missing_commerce_name`：MBTI 用名在 `shop` 沒有現成 canonical 商品名
- `seasonal_or_split`：`shop` 有近似，但屬季節品或拆成多個商品

| MBTI | MBTI 甜點名 | 最接近的 shop canonical 名 | 狀態 | 備註 |
| --- | --- | --- | --- | --- |
| INTJ | 北海道經典巴斯克 | 北海道經典｜巴斯克乳酪 | mapped | 高信心 |
| INTP | 檸檬柚子千層蛋糕 | 檸檬日本柚子｜千層蛋糕 | mapped | 高信心 |
| ENTJ | 奶酒提拉米蘇 | 貝里詩奶酒｜提拉米蘇 | mapped | 商業命名差異 |
| ENTP | 柚子蘋果提拉米蘇 | 日本柚子蘋果乳酪｜提拉米蘇 | mapped | 內容一致，命名不同 |
| INFJ | 茶香巴斯克 |  | missing_commerce_name | `shop` 目前沒有茶香 / 伯爵巴斯克 |
| INFP | 北海道十勝戚風蛋糕 |  | missing_commerce_name | `shop` 沒有原味戚風 canonical 品名 |
| ENFJ | 檸檬蘋果戚風蛋糕 |  | missing_commerce_name | `shop` 沒有這筆 |
| ENFP | 草莓莓果千層蛋糕 | 北海道十勝莓果草莓｜千層蛋糕 / 巧克力莓果草莓｜千層蛋糕 | seasonal_or_split | 一對多，且目前 OFF |
| ISTJ | 經典十勝原味千層 | 北海道十勝低糖原味｜千層蛋糕 | mapped | 高信心 |
| ISFJ | 經典烤布丁 | 經典烤布丁｜乾濕分離 | mapped | 商業命名差異 |
| ESTJ | 鹹蛋黃巴斯克 | 鹹蛋黃｜巴斯克乳酪 | mapped | 高信心 |
| ESFJ | 莓果戚風蛋糕 | 莓果巧克力｜戚風蛋糕 | approx_only | 不是完全同名 |
| ISTP | 經典提拉米蘇 | 經典｜提拉米蘇 | mapped | 高信心 |
| ISFP | 抹茶提拉米蘇 | 小山園抹茶｜提拉米蘇 | mapped | 高信心 |
| ESTP | 巧克力布朗尼千層 | 巧克力布朗尼｜千層蛋糕 | mapped | 高信心 |
| ESFP | 綜合水果戚風蛋糕 |  | missing_commerce_name | `shop` 沒有這筆 |

## 今日已確認的安全決策

### 1. `MBTI` 仍導向 `map/menu`

目前 `kiwimu.com` 的結果頁甜點 CTA 已經導向 `https://map.kiwimu.com/menu`，今天不需要再改動。

### 2. 未來共用入口

若明天開始真正整合，優先使用 `shop` 的外部 API：

- `GET /api/menu/categories`

理由：

- 它已經是給外站使用的 grouped contract
- 它已經處理 `is_available`
- 它已經套用草莓季節性隱藏規則
- 可避免 `map` / `MBTI` 直接耦合 raw DB schema

## 後續建議順序

1. 先決定 `shop` 是否正式成為唯一商品主源
2. 讓 upstream shared menu payload 直接帶出 `shop menu_item_id`，取代目前 map repo 的本地穩定 id 過渡層
3. 把 `map` 需要的 display metadata 收斂到 shared contract，減少對 `public/menu.json` 的依賴
4. 最後才清理舊命名、舊靜態檔與重複 mapping
