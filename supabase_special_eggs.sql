-- 情人節金色彩蛋數據表
-- 用於追蹤特殊限定彩蛋的兌換狀況

CREATE TABLE IF NOT EXISTS special_eggs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  egg_id text UNIQUE NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  reward text NOT NULL,
  total_limit integer NOT NULL,
  claimed_count integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 插入情人節彩蛋
INSERT INTO special_eggs (egg_id, name, code, reward, total_limit)
VALUES ('valentine_2026', '情人節金色彩蛋', 'KIWIMU KISS', '布丁一顆', 50)
ON CONFLICT (egg_id) DO NOTHING;

-- 啟用 RLS
ALTER TABLE special_eggs ENABLE ROW LEVEL SECURITY;

-- 允許所有人查看
CREATE POLICY "Anyone can view special eggs"
  ON special_eggs FOR SELECT
  USING (true);

-- 允許所有人更新（用於扣減數量）
CREATE POLICY "Anyone can update claimed_count"
  ON special_eggs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_special_eggs_egg_id ON special_eggs(egg_id);
CREATE INDEX IF NOT EXISTS idx_special_eggs_active ON special_eggs(active);

-- 新增自動更新 updated_at 的 trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_special_eggs_updated_at BEFORE UPDATE
    ON special_eggs FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
