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
insert into menu_items (category_id, name, image, prices) values
('tiramisu', '經典提拉米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/TIRAMISU_CLASSIC_puzwyg.webp', '[{"spec": "200ml", "price": "$160"}, {"spec": "鐵盒", "price": "$350"}]'),
('tiramisu', '烤焦糖布丁摩卡米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "200ml", "price": "$180"}, {"spec": "鐵盒", "price": "$499"}]'),
('tiramisu', '小山園抹茶米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "200ml", "price": "$180"}, {"spec": "鐵盒", "price": "$549"}]'),
('tiramisu', '日本柚子蘋果乳酪米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "200ml", "price": "$190"}, {"spec": "鐵盒", "price": "$549"}]'),
('tiramisu', '莓果提拉米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "200ml", "price": "$190"}, {"spec": "鐵盒", "price": "$549"}]'),
('tiramisu', '奶酒提拉米蘇', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/TIRAMISU_CLASSIC_puzwyg.webp', '[{"spec": "200ml", "price": "$190"}, {"spec": "鐵盒", "price": "$549"}]');

-- Basque
insert into menu_items (category_id, name, image, prices) values
('basque', '原味巴斯克', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "四吋", "price": "$299"}, {"spec": "六吋", "price": "$899"}, {"spec": "八吋", "price": "$1,300"}]'),
('basque', '檸檬巴斯克', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "四吋", "price": "$299"}, {"spec": "六吋", "price": "$899"}, {"spec": "八吋", "price": "$1,400"}]'),
('basque', '鹹蛋黃巴斯克', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "四吋", "price": "$349"}, {"spec": "六吋", "price": "$999"}, {"spec": "八吋", "price": "$1,400"}]');

-- Chiffon
insert into menu_items (category_id, name, image, prices) values
('chiffon', '莓果巧克力戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "四吋", "price": "$590"}, {"spec": "六吋", "price": "$1,050"}, {"spec": "八吋", "price": "$1,800"}]'),
('chiffon', '烤焦糖布丁戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "四吋", "price": "$550"}, {"spec": "六吋", "price": "$1,050"}, {"spec": "八吋", "price": "$1,650"}]'),
('chiffon', '伯爵綠葡萄戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "四吋", "price": "$650"}, {"spec": "六吋", "price": "$1,150"}, {"spec": "八吋", "price": "$1,980"}]'),
('chiffon', '巧克力草莓莓果戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "四吋", "price": "$690"}, {"spec": "六吋", "price": "$1,350"}, {"spec": "八吋", "price": "$2,250"}]'),
('chiffon', '十勝草莓莓果戚風蛋糕', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "四吋", "price": "$690"}, {"spec": "六吋", "price": "$1,350"}, {"spec": "八吋", "price": "$2,250"}]');

-- Mille Crepe
insert into menu_items (category_id, name, image, prices) values
('mille_crepe', '北海道十勝低糖原味千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "九吋", "price": "$1,990"}]'),
('mille_crepe', '法芙娜巧克力布朗尼千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "九吋", "price": "$1,990"}]'),
('mille_crepe', '特濃抹茶千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "九吋", "price": "$1,990"}]'),
('mille_crepe', '伯爵茶千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "九吋", "price": "$1,990"}]'),
('mille_crepe', '檸檬日本柚子千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "九吋", "price": "$1,990"}]'),
('mille_crepe', '蜜香紅茶拿鐵千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "九吋", "price": "$1,990"}]'),
('mille_crepe', '焙茶拿鐵千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/MILLE_CREPE_CLASSIC_ofjcvq.webp', '[{"spec": "九吋", "price": "$1,990"}]'),
('mille_crepe', '卡士達十勝草莓千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "九吋", "price": "$2,500"}]'),
('mille_crepe', '十勝低糖水果森林千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "九吋", "price": "$2,500"}]'),
('mille_crepe', '十勝低糖原味莓果草莓千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866455/CHIFFON_HOKKAIDO_kff8rv.webp', '[{"spec": "九吋", "price": "$2,500"}]'),
('mille_crepe', '巧克力莓果草莓千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866453/CHIFFON_FRUIT_fswhqh.webp', '[{"spec": "九吋", "price": "$2,500"}]'),
('mille_crepe', '檸檬日本柚子草莓千層', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/CHIFFON_BERRY_wlmqgd.webp', '[{"spec": "九吋", "price": "$2,500"}]');

-- Pudding
insert into menu_items (category_id, name, image, prices) values
('pudding', '布丁', 'https://res.cloudinary.com/dvizdsv4m/image/upload/v1767866454/TIRAMISU_CLASSIC_puzwyg.webp', '[{"spec": "單個", "price": "$120"}]');

-- Drinks
insert into menu_items (category_id, name, prices) values
('drinks', '美式咖啡', '[]'),
('drinks', '經典拿鐵', '[]'),
('drinks', '日本柚子美式', '[]'),
('drinks', '薄荷茶', '[]'),
('drinks', '焙茶拿鐵', '[]'),
('drinks', '烤布丁拿鐵', '[]'),
('drinks', '博士茶', '[]'),
('drinks', '抹茶拿鐵', '[]'),
('drinks', '花草茶', '[]'),
('drinks', '西西里美式', '[]'),
('drinks', '蕎麥茶', '[]');
