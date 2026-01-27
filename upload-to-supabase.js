/**
 * Supabase Storage 圖片上傳腳本
 * 
 * 使用方式：
 * 1. 安裝依賴: npm install @supabase/supabase-js
 * 2. 執行: node upload-to-supabase.js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// === 配置 Supabase ===
const SUPABASE_URL = 'https://xlqwfaailjyvsycjnzkz.supabase.co'
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE' // 從 Supabase Dashboard → Settings → API 取得

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// === 設定 ===
const BUCKET_NAME = 'moon-island-assets'
const UPLOAD_DIR = path.join(process.env.HOME, 'moon-island-upload')

// 上傳單一檔案
async function uploadFile(filePath, storagePath) {
    const fileName = path.basename(filePath)
    const fileBuffer = fs.readFileSync(filePath)
    const ext = path.extname(fileName).toLowerCase()

    // 根據副檔名設定 Content-Type
    const contentTypeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    }

    const contentType = contentTypeMap[ext] || 'application/octet-stream'

    console.log(`📤 Uploading: ${storagePath}/${fileName}`)

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(`${storagePath}/${fileName}`, fileBuffer, {
            contentType,
            upsert: true // 覆蓋同名檔案
        })

    if (error) {
        console.error(`❌ Failed: ${fileName}`, error.message)
        return false
    } else {
        console.log(`✅ Success: ${fileName}`)

        // 取得公開 URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(`${storagePath}/${fileName}`)

        console.log(`   URL: ${urlData.publicUrl}`)
        return true
    }
}

// 上傳整個資料夾
async function uploadFolder(localFolder, remoteFolder) {
    const files = fs.readdirSync(path.join(UPLOAD_DIR, localFolder))

    console.log(`\n📁 Uploading folder: ${localFolder}`)
    console.log(`   Files: ${files.length}`)

    for (const file of files) {
        if (file.startsWith('.')) continue // 跳過隱藏檔

        const filePath = path.join(UPLOAD_DIR, localFolder, file)
        if (fs.statSync(filePath).isFile()) {
            await uploadFile(filePath, remoteFolder)
        }
    }
}

// 主執行流程
async function main() {
    console.log('🚀 Starting Supabase Storage Upload...\n')

    // 檢查 Bucket 是否存在
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)

    if (!bucketExists) {
        console.log(`⚠️  Bucket "${BUCKET_NAME}" not found.`)
        console.log(`   Please create it in Supabase Dashboard → Storage`)
        console.log(`   Settings: Public = true`)
        return
    }

    console.log(`✅ Bucket "${BUCKET_NAME}" found\n`)

    // 上傳各資料夾
    await uploadFolder('backgrounds', 'backgrounds')
    await uploadFolder('menus', 'menus')
    await uploadFolder('characters', 'characters')

    console.log('\n🎉 Upload complete!')
    console.log('\n📋 Next steps:')
    console.log('1. 前往 Supabase Dashboard → Storage 確認圖片')
    console.log('2. 複製圖片 URL')
    console.log('3. 更新 index.tsx 中的圖片路徑')
}

main().catch(console.error)
