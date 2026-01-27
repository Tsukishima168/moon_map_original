-- 月島甜點店 - 產品描述批次更新腳本
-- 這將為每個產品加入簡短、優雅的描述文案

-- ===========================================
-- 🍰 提拉米蘇系列 (Tiramisu)
-- ===========================================

UPDATE menu_items 
SET description = '濃郁咖啡酒香與綿密馬斯卡彭乳酪的完美平衡，層層交織的義式經典。' 
WHERE name = '經典提拉米蘇';

UPDATE menu_items 
SET description = '焦糖脆片與摩卡咖啡的雙重奏鳴，帶來意想不到的層次驚喜。' 
WHERE name = '烤焦糖布丁摩卡米蘇';

UPDATE menu_items 
SET description = '嚴選日本小山園抹茶，苦甜交融，呈現和洋融合的細膩風味。' 
WHERE name = '小山園抹茶米蘇';

UPDATE menu_items 
SET description = '清新柚子香氣搭配蘋果果酸，輕盈爽口的夏日版提拉米蘇。' 
WHERE name = '日本柚子蘋果乳酪米蘇';

UPDATE menu_items 
SET description = '新鮮莓果的酸甜完美中和咖啡的苦韻，視覺與味覺的雙重饗宴。' 
WHERE name = '莓果提拉米蘇';

UPDATE menu_items 
SET description = '加入 Baileys 奶酒增添醇厚酒香，成熟大人味的溫柔甜蜜。' 
WHERE name = '奶酒提拉米蘇';

-- ===========================================
-- 🧀 巴斯克系列 (Basque)
-- ===========================================

UPDATE menu_items 
SET description = '外酥內軟的焦糖外殼，包裹著半熟乳酪的濃郁綿密，簡單卻深刻。' 
WHERE name = '原味巴斯克';

UPDATE menu_items 
SET description = '清爽檸檬香氣平衡乳酪濃郁，每一口都是夏日微風般的輕盈。' 
WHERE name = '檸檬巴斯克';

UPDATE menu_items 
SET description = '鹹香蛋黃與甜美乳酪的東西碰撞，獨特鹹甜滋味令人難忘。' 
WHERE name = '鹹蛋黃巴斯克';

-- ===========================================
-- ☁️ 戚風蛋糕系列 (Chiffon)
-- ===========================================

UPDATE menu_items 
SET description = '比利時巧克力與新鮮莓果的浪漫邂逅，輕盈卻充滿層次。' 
WHERE name = '莓果巧克力戚風蛋糕';

UPDATE menu_items 
SET description = '焦糖布丁與雲朵般蛋糕體的溫柔相遇，甜蜜中帶著微微焦香。' 
WHERE name = '烤焦糖布丁戚風蛋糕';

UPDATE menu_items 
SET description = '伯爵茶的優雅茶香融入青葡萄的清新，品味英式午茶的浪漫。' 
WHERE name = '伯爵綠葡萄戚風蛋糕';

UPDATE menu_items 
SET description = '濃郁巧克力與甜美草莓的經典組合，每一層都是幸福的味道。' 
WHERE name = '巧克力草莓莓果戚風蛋糕';

UPDATE menu_items 
SET description = '北海道十勝鮮奶油與季節草莓，呈現極致綿密的奢華口感。' 
WHERE name = '十勝草莓莓果戚風蛋糕';

-- ===========================================
-- 🥞 千層蛋糕系列 (Mille Crepe)
-- ===========================================

UPDATE menu_items 
SET description = '嚴選北海道十勝鮮奶油，低糖配方突顯乳香，品嚐最純粹的美好。' 
WHERE name = '北海道十勝低糖原味千層';

UPDATE menu_items 
SET description = '法國法芙娜巧克力的醇厚，搭配布朗尼碎片，巧克力控的天堂。' 
WHERE name = '法芙娜巧克力布朗尼千層';

UPDATE menu_items 
SET description = '濃郁抹茶層層堆疊，苦中帶甘，展現日式甜點的細膩哲學。' 
WHERE name = '特濃抹茶千層';

UPDATE menu_items 
SET description = '伯爵茶的佛手柑香氣在每一層綻放，優雅而不甜膩。' 
WHERE name = '伯爵茶千層';

UPDATE menu_items 
SET description = '雙柑橘的清新酸甜，為千層蛋糕注入陽光般的活力。' 
WHERE name = '檸檬日本柚子千層';

UPDATE menu_items 
SET description = '蜜香紅茶與鮮奶油的溫柔融合，如午後的一杯手調拿鐵。' 
WHERE name = '蜜香紅茶拿鐵千層';

UPDATE menu_items 
SET description = '日本焙茶的炭火焙香，帶來沉穩內斂的和風韻味。' 
WHERE name = '焙茶拿鐵千層';

UPDATE menu_items 
SET description = '綿密卡士達醬與北海道鮮奶油的雙重奢華，點綴季節草莓。' 
WHERE name = '卡士達十勝草莓千層';

UPDATE menu_items 
SET description = '繽紛水果與低糖鮮奶油的清爽組合，如漫步森林般的自然甜美。' 
WHERE name = '十勝低糖水果森林千層';

UPDATE menu_items 
SET description = '原味千層搭配新鮮莓果，簡單卻完美的經典配方。' 
WHERE name = '十勝低糖原味莓果草莓千層';

UPDATE menu_items 
SET description = '巧克力的濃郁與莓果的酸甜，創造味蕾的多層次饗宴。' 
WHERE name = '巧克力莓果草莓千層';

UPDATE menu_items 
SET description = '三重果香的交織，酸甜平衡，清爽宜人的春日滋味。' 
WHERE name = '檸檬日本柚子草莓千層';

-- ===========================================
-- 🍮 單點 (Others)
-- ===========================================

UPDATE menu_items 
SET description = '經典法式烤布丁，焦糖脆片與滑嫩蛋奶的完美對話，簡單卻雋永。' 
WHERE name = '布丁';

-- ===========================================
-- ☕ 飲品系列 (Drinks)
-- ===========================================

UPDATE menu_items 
SET description = '精選咖啡豆，呈現純粹的咖啡本味，適合品嚐原始風味的你。' 
WHERE name = '美式咖啡';

UPDATE menu_items 
SET description = '濃縮咖啡與綿密奶泡的經典比例，溫暖而熟悉的日常陪伴。' 
WHERE name = '經典拿鐵';

UPDATE menu_items 
SET description = '清新柚子香氣與咖啡的創新碰撞，夏日限定的清爽驚喜。' 
WHERE name = '日本柚子美式';

UPDATE menu_items 
SET description = '清涼薄荷葉沖泡，舒緩身心的草本香氣，讓思緒沉靜下來。' 
WHERE name = '薄荷茶';

UPDATE menu_items 
SET description = '日本焙茶的炭火香氣融入鮮奶，溫潤而不甜膩的和風奶茶。' 
WHERE name = '焙茶拿鐵';

UPDATE menu_items 
SET description = '焦糖布丁風味融入拿鐵，甜蜜卻不膩口的創意飲品。' 
WHERE name = '烤布丁拿鐵';

UPDATE menu_items 
SET description = '南非國寶茶，無咖啡因的溫潤口感，適合任何時刻的放鬆飲品。' 
WHERE name = '博士茶';

UPDATE menu_items 
SET description = '濃郁抹茶與鮮奶的完美調和，品味日式茶道的優雅。' 
WHERE name = '抹茶拿鐵';

UPDATE menu_items 
SET description = '精選花草調配，每一口都是大自然的療癒芬芳。' 
WHERE name = '花草茶';

UPDATE menu_items 
SET description = '西西里檸檬與咖啡的地中海風情，酸甜交織的夏日暢飲。' 
WHERE name = '西西里美式';

UPDATE menu_items 
SET description = '日本蕎麥的香醇韻味，溫潤回甘，適合搭配甜點的無咖啡因選擇。' 
WHERE name = '蕎麥茶';
