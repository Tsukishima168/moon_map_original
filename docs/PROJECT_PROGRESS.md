# PROJECT_PROGRESS.md — map-kiwimu-com

> Auto-managed sync mirror. Manual notes area is preserved.

## 🔄 Sync Mirror (Auto-Managed)

<!-- SYNC:BEGIN -->
sync_id: moon_map_original
project_name: map-kiwimu-com
repo_path: /Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com
obsidian_card: /Users/penstudio/Library/Mobile Documents/iCloud~md~obsidian/Documents/Penso-OS/08_專案工坊/Subdomain_map.kiwimu.com/Moon_Map.md
progress_file: /Users/pensoair/Desktop/Web-Projects/sites/map-kiwimu-com/PROJECT_PROGRESS.md
source_of_truth: obsidian
last_synced: 2026-03-05T00:03:03+08:00
sync_status: synced
project_status: 🟢 已上線，持續優化
next_action: (no unchecked task found)
repo_branch: main
repo_last_commit: e204bea 2026-03-04 15:32:51 +0800 chore: Sync updates - 2026-03-04
repo_dirty_files: 4
<!-- SYNC:END -->

## 📝 Manual Notes (Do Not Auto-Overwrite)

- 2026-04-16: 文件已對齊目前 runtime。`map/menu` 現況是 shared menu (`/api/menu` -> `shop /api/menu/categories`) + `public/menu.json` fallback，不是純靜態菜單。
- 2026-04-16: `/api/menu` 已改成 server-side merge，前端不再自己抓 `menu.json` 做 live merge。
- 2026-04-16: MBTI / 心情推薦已改成 map repo 內的穩定 item id；上游 shared menu 仍未帶出真實 `menu_item_id`。
- 2026-04-18: `/api/menu` 已進一步改成 Supabase canonical menu first，`shop /api/menu/categories` 降為 server-side fallback；`public/menu.json` 仍保留為最後 fallback 與 display metadata source。
- 2026-04-18: 新增 `/api/mbti-dessert`，MBTI 推薦商品主指向已改讀 Supabase `mbti_menu_links` + `menu_items`；`map` checkout flow 維持不變，仍由 `/api/map-order` 入單。
- 2026-04-18: 已新增 opt-in Supabase display config 支援（`site_category_configs` / `site_item_configs`）與 seed script，但預設關閉，不影響目前上線主站與 SSO。
- 2026-04-16: 目前最合理的下一個工程重點是：
- 收斂 `map` display metadata，降低 `public/menu.json` 的展示層耦合。
- 推動 upstream shared menu payload 帶出真實 `menu_item_id`，移除本地穩定 id 過渡層。
- 跑一次 live menu -> checkout -> Supabase -> Discord -> GA4 的完整營運驗證。
