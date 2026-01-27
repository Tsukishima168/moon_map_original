-- 1. Create Categories Table
create table menu_categories (
  id text primary key, -- e.g. 'tiramisu'
  title text not null,
  subtitle text,
  sort_order integer default 0
);

-- 2. Create Items Table
create table menu_items (
  id uuid default gen_random_uuid() primary key,
  category_id text references menu_categories(id),
  name text not null,
  image text,
  prices jsonb default '[]', -- Stores array like [{"spec": "200ml", "price": "$160"}]
  description text,
  sort_order integer default 0,
  is_available boolean default true
);

-- 3. Enable RLS (Security) but allow public read
alter table menu_categories enable row level security;
alter table menu_items enable row level security;

create policy "Public can view categories" 
  on menu_categories for select using (true);
  
create policy "Public can view items" 
  on menu_items for select using (true);

-- 4. INSERT DATA (Categories)
insert into menu_categories (id, title, subtitle, sort_order) values
('tiramisu', '記憶的層疊 / Tiramisu', 'Layers of Memory', 1),
('basque', '島嶼的質地 / Basque', 'Texture of Island', 2),
('chiffon', '空氣的形狀 / Chiffon', 'Shape of Air', 3),
('mille_crepe', '時間的切片 / Mille Crepe', 'Slices of Time', 4),
('pudding', '單點 / Others', 'Small Treats', 5),
('drinks', '靜默的流動 / Drinks', 'Flow of Silence', 6);

-- 5. INSERT DATA (Items)
-- Tiramisu
insert into menu_items (category_id, name, image, prices, description) values
('tiramisu', '經典提拉米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/TIRAMISU_CLASSIC_puzwyg.webp', '[{"spec": "200ml", "price": "$160"}, {"spec": "鐵盒", "price": "$350"}]', '濃郁咖啡酒香與綿密馬斯卡彭乳酪的完美平衡，層層交織的義式經典。'),
('tiramisu', '烤焦糖布丁摩卡米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "200ml", "price": "$180"}, {"spec": "鐵盒", "price": "$499"}]', '焦糖脆片與摩卡咖啡的雙重奏鳴，帶來意想不到的層次驚喜。'),
('tiramisu', '小山園抹茶米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "200ml", "price": "$180"}, {"spec": "鐵盒", "price": "$549"}]', '嚴選日本小山園抹茶，苦甜交融，呈現和洋融合的細膩風味。'),
('tiramisu', '日本柚子蘋果乳酪米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "200ml", "price": "$190"}, {"spec": "鐵盒", "price": "$549"}]', '清新柚子香氣搭配蘋果果酸，輕盈爽口的夏日版提拉米蘇。'),
('tiramisu', '莓果提拉米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "200ml", "price": "$190"}, {"spec": "鐵盒", "price": "$549"}]', '新鮮莓果的酸甜完美中和咖啡的苦韻，視覺與味覺的雙重饗宴。'),
('tiramisu', '奶酒提拉米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/TIRAMISU_CLASSIC_puzwyg.webp', '[{"spec": "200ml", "price": "$190"}, {"spec": "鐵盒", "price": "$549"}]', '加入 Baileys 奶酒增添醇厚酒香，成熟大人味的溫柔甜蜜。');

-- Basque
insert into menu_items (category_id, name, image, prices, description) values
('basque', '原味巴斯克', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "四吋", "price": "$299"}, {"spec": "六吋", "price": "$899"}, {"spec": "八吋", "price": "$1,300"}]', '外酥內軟的焦糖外殼，包裹著半熟乳酪的濃郁綿密，簡單卻深刻。'),
('basque', '檸檬巴斯克', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "四吋", "price": "$299"}, {"spec": "六吋", "price": "$899"}, {"spec": "八吋", "price": "$1,400"}]', '清爽檸檬香氣平衡乳酪濃郁，每一口都是夏日微風般的輕盈。'),
('basque', '鹹蛋黃巴斯克', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "四吋", "price": "$349"}, {"spec": "六吋", "price": "$999"}, {"spec": "八吋", "price": "$1,400"}]', '鹹香蛋黃與甜美乳酪的東西碰撞，獨特鹹甜滋味令人難忘。');

-- Chiffon
insert into menu_items (category_id, name, image, prices, description) values
('chiffon', '莓果巧克力戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "四吋", "price": "$590"}, {"spec": "六吋", "price": "$1,050"}, {"spec": "八吋", "price": "$1,800"}]', '比利時巧克力與新鮮莓果的浪漫邂逅，輕盈卻充滿層次。'),
('chiffon', '烤焦糖布丁戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "四吋", "price": "$550"}, {"spec": "六吋", "price": "$1,050"}, {"spec": "八吋", "price": "$1,650"}]', '焦糖布丁與雲朵般蛋糕體的溫柔相遇，甜蜜中帶著微微焦香。'),
('chiffon', '伯爵綠葡萄戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "四吋", "price": "$650"}, {"spec": "六吋", "price": "$1,150"}, {"spec": "八吋", "price": "$1,980"}]', '伯爵茶的優雅茶香融入青葡萄的清新，品味英式午茶的浪漫。'),
('chiffon', '巧克力草莓莓果戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "四吋", "price": "$690"}, {"spec": "六吋", "price": "$1,350"}, {"spec": "八吋", "price": "$2,250"}]', '濃郁巧克力與甜美草莓的經典組合，每一層都是幸福的味道。'),
('chiffon', '十勝草莓莓果戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "四吋", "price": "$690"}, {"spec": "六吋", "price": "$1,350"}, {"spec": "八吋", "price": "$2,250"}]', '北海道十勝鮮奶油與季節草莓，呈現極致綿密的奢華口感。');

-- Mille Crepe
insert into menu_items (category_id, name, image, prices, description) values
('mille_crepe', '北海道十勝低糖原味千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "九吋", "price": "$1,990"}]', '嚴選北海道十勝鮮奶油，低糖配方突顯乳香，品嚐最純粹的美好。'),
('mille_crepe', '法芙娜巧克力布朗尼千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "九吋", "price": "$1,990"}]', '法國法芙娜巧克力的醇厚，搭配布朗尼碎片，巧克力控的天堂。'),
('mille_crepe', '特濃抹茶千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "九吋", "price": "$1,990"}]', '濃郁抹茶層層堆疊，苦中帶甘，展現日式甜點的細膩哲學。'),
('mille_crepe', '伯爵茶千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "九吋", "price": "$1,990"}]', '伯爵茶的佛手柑香氣在每一層綻放，優雅而不甜膩。'),
('mille_crepe', '檸檬日本柚子千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "九吋", "price": "$1,990"}]', '雙柑橘的清新酸甜，為千層蛋糕注入陽光般的活力。'),
('mille_crepe', '蜜香紅茶拿鐵千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "九吋", "price": "$1,990"}]', '蜜香紅茶與鮮奶油的溫柔融合，如午後的一杯手調拿鐵。'),
('mille_crepe', '焙茶拿鐵千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "九吋", "price": "$1,990"}]', '日本焙茶的炭火焙香，帶來沉穩內斂的和風韻味。'),
('mille_crepe', '卡士達十勝草莓千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "九吋", "price": "$2,500"}]', '綿密卡士達醬與北海道鮮奶油的雙重奢華，點綴季節草莓。'),
('mille_crepe', '十勝低糖水果森林千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "九吋", "price": "$2,500"}]', '繽紛水果與低糖鮮奶油的清爽組合，如漫步森林般的自然甜美。'),
('mille_crepe', '十勝低糖原味莓果草莓千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "九吋", "price": "$2,500"}]', '原味千層搭配新鮮莓果，簡單卻完美的經典配方。'),
('mille_crepe', '巧克力莓果草莓千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "九吋", "price": "$2,500"}]', '巧克力的濃郁與莓果的酸甜，創造味蕾的多層次饗宴。'),
('mille_crepe', '檸檬日本柚子草莓千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "九吋", "price": "$2,500"}]', '三重果香的交織，酸甜平衡，清爽宜人的春日滋味。');

-- Pudding
insert into menu_items (category_id, name, image, prices, description) values
('pudding', '布丁', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/TIRAMISU_CLASSIC_puzwyg.webp', '[{"spec": "單個", "price": "$120"}]', '經典法式烤布丁，焦糖脆片與滑嫩蛋奶的完美對話，簡單卻雋永。');

-- Drinks
insert into menu_items (category_id, name, prices, description) values
('drinks', '美式咖啡', '[]', '精選咖啡豆，呈現純粹的咖啡本味。'),
('drinks', '經典拿鐵', '[]', '濃縮咖啡與綿密奶泡的經典比例，溫暖而熟悉的日常陪伴。'),
('drinks', '日本柚子美式', '[]', '清新柚子香氣與咖啡的創新碰撞，清爽驚喜。'),
('drinks', '薄荷茶', '[]', '清涼薄荷葉沖泡，舒緩身心的草本香氣。'),
('drinks', '焙茶拿鐵', '[]', '日本焙茶的炭火香氣融入鮮奶，溫潤而不甜膩。'),
('drinks', '烤布丁拿鐵', '[]', '焦糖布丁風味融入拿鐵，甜蜜創意飲品。'),
('drinks', '博士茶', '[]', '南非國寶茶，無咖啡因的溫潤口感。'),
('drinks', '抹茶拿鐵', '[]', '濃郁抹茶與鮮奶的完美調和，品味日式優雅。'),
('drinks', '花草茶', '[]', '精選花草調配，每一口都是大自然的療癒芬芳。'),
('drinks', '西西里美式', '[]', '西西里檸檬與咖啡的浪漫，酸甜交織的夏日暢飲。'),
('drinks', '蕎麥茶', '[]', '日本蕎麥的香醇韻味，溫潤回甘。');
