#!/bin/bash

##############################################
# 月島甜點店 - 圖片批次處理腳本
# 功能：調整尺寸、轉換格式、壓縮品質
##############################################

echo "🎨 月島圖片批次處理工具"
echo "==============================\n"

# === 設定 ===
# 網頁用建議：638 + 品質 78，單檔約 200–500KB；若要較大圖可改 800、85
SOURCE_DIR="$HOME/Desktop/原始照片"
OUTPUT_DIR="$HOME/moon-island-upload/products/desserts"
SIZE="638x638"
QUALITY=78
FORMAT="webp"

# === 檢查來源資料夾 ===
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ 找不到來源資料夾: $SOURCE_DIR"
  echo "請將您的照片放在 ~/Desktop/原始照片/ 資料夾中"
  echo "或修改腳本中的 SOURCE_DIR 變數"
  exit 1
fi

# === 建立輸出資料夾 ===
mkdir -p "$OUTPUT_DIR"

# === 檢查 ImageMagick ===
if ! command -v magick &> /dev/null; then
  echo "⚠️  未安裝 ImageMagick"
  echo "正在使用 macOS 內建的 sips 工具（不支援 WebP）"
  echo "建議安裝 ImageMagick: brew install imagemagick\n"
  USE_SIPS=true
else
  echo "✅ 使用 ImageMagick 處理\n"
  USE_SIPS=false
fi

# === 處理函數 ===
process_with_imagemagick() {
  local input="$1"
  local filename=$(basename "$input")
  local name="${filename%.*}"
  local output="$OUTPUT_DIR/${name}.${FORMAT}"
  
  echo "📸 處理: $filename"
  
  # 調整尺寸（裁切成正方形）+ 轉 WebP + 壓縮
  magick convert "$input" \
    -resize "${SIZE}^" \
    -gravity center \
    -extent "$SIZE" \
    -quality "$QUALITY" \
    "$output"
  
  if [ $? -eq 0 ]; then
    local original_size=$(du -h "$input" | cut -f1)
    local new_size=$(du -h "$output" | cut -f1)
    echo "   ✅ $filename ($original_size) → ${name}.${FORMAT} ($new_size)"
  else
    echo "   ❌ 處理失敗: $filename"
  fi
}

process_with_sips() {
  local input="$1"
  local filename=$(basename "$input")
  local name="${filename%.*}"
  local output="$OUTPUT_DIR/${name}.jpg"
  
  echo "📸 處理: $filename"
  
  # 先複製到輸出資料夾
  cp "$input" "$output"
  
  # 調整尺寸（sips 只能等比例縮放）
  sips -z 800 800 "$output" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    local original_size=$(du -h "$input" | cut -f1)
    local new_size=$(du -h "$output" | cut -f1)
    echo "   ✅ $filename ($original_size) → ${name}.jpg ($new_size)"
  else
    echo "   ❌ 處理失敗: $filename"
  fi
}

# === 主處理流程 ===
count=0
for img in "$SOURCE_DIR"/*.{jpg,jpeg,png,JPG,JPEG,PNG} 2>/dev/null; do
  # 跳過不存在的檔案
  [ -e "$img" ] || continue
  
  if [ "$USE_SIPS" = true ]; then
    process_with_sips "$img"
  else
    process_with_imagemagick "$img"
  fi
  
  ((count++))
done

# === 完成報告 ===
echo "\n=============================="
echo "🎉 處理完成！"
echo "   處理檔案數: $count 張"
echo "   輸出位置: $OUTPUT_DIR"
echo "==============================\n"

echo "📋 下一步："
echo "1. 檢查處理後的圖片品質"
echo "2. 重新命名為對應的英文檔名（參考 product_naming_guide.md）"
echo "3. 執行上傳腳本: node upload-to-supabase.js"
