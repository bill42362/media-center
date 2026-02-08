# 資料庫設計文件

## 概述

本文件說明 Media Center 的資料庫架構設計，包含資料表關聯、索引策略和效能考量。

**技術選型**：PostgreSQL + Prisma ORM

**設計原則**：
- 正規化到第三正規式（3NF）
- 多對多關係使用中介表
- 使用 UUID 作為主鍵（安全性 + 分散式友善）
- 關鍵查詢欄位建立索引
- 軟刪除敏感資料（保留審計記錄）

---

## 資料表總覽

### 第一階段（核心功能）

| 資料表 | 用途 | 關聯 |
|--------|------|------|
| `users` | 使用者帳號 | → sessions, favorites, watch_progress, watch_history |
| `sessions` | 登入 session | users ← |
| `otps` | OTP 驗證碼 | 獨立（短期資料） |
| `media` | 媒體檔案 | → media_tags, favorites, watch_progress, watch_history, transcode_jobs |
| `tags` | 標籤 | → media_tags |
| `media_tags` | 媒體-標籤關聯 | media ←, tags ← |
| `favorites` | 最愛列表 | users ←, media ← |
| `watch_progress` | 觀看進度（斷點續播） | users ←, media ← |
| `watch_history` | 觀看紀錄（歷史分析） | users ←, media ← |
| `transcode_jobs` | 轉碼任務 | media ← |
| `transcode_cache` | Ramdisk 快取記錄 | media ← |

### 第五階段（ComfyUI 整合）

| 資料表 | 用途 | 關聯 |
|--------|------|------|
| `comfyui_workflows` | ComfyUI 工作流 | users ← |
| `comfyui_outputs` | ComfyUI 輸出記錄 | users ←, media ← |

---

## 核心資料表設計

### 1. users（使用者）

**用途**：儲存使用者帳號和權限資訊

**關鍵欄位**：
- `id` (UUID, PK)
- `email` (String, Unique) - 登入識別
- `display_name` (String?) - 顯示名稱
- `role` (Enum: ADMIN | USER) - 角色（自動分配）
- `safe_mode_only` (Boolean) - 一般使用者永遠為 true
- `favorites_limit` (Int?) - 最愛數量限制（null = 無限制）
- `created_at`, `updated_at`

**索引**：
- `email` (Unique) - 登入查詢

**設計考量**：
- Email 作為唯一識別（配合白名單機制）
- 角色自動分配（首次登入時根據 .env 判斷）
- 一般使用者的 `safe_mode_only` 永遠為 true（後端強制）

---

### 2. sessions（登入 Session）

**用途**：管理使用者登入狀態和安全模式

**關鍵欄位**：
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `token` (String, Unique) - Session token (JWT 或 random string)
- `safe_mode` (Boolean) - 當前是否為安全模式
- `expires_at` (DateTime) - 過期時間
- `created_at`

**索引**：
- `token` (Unique) - Session 驗證
- `user_id` - 查詢使用者的所有 session
- `expires_at` - 清理過期 session

**設計考量**：
- Session 包含安全模式狀態（使用者可切換）
- 定期清理過期 session（cronjob）
- 支援同一使用者多裝置登入

---

### 3. otps（OTP 驗證碼）

**用途**：短期儲存 OTP 驗證碼

**關鍵欄位**：
- `id` (UUID, PK)
- `email` (String) - 接收者 Email
- `code` (String) - 6 位數驗證碼
- `purpose` (Enum: LOGIN | UNLOCK_SAFE_MODE) - 用途
- `verified` (Boolean) - 是否已驗證
- `expires_at` (DateTime) - 過期時間（10 分鐘）
- `created_at`

**索引**：
- `email` + `code` - 驗證查詢
- `expires_at` - 清理過期 OTP

**設計考量**：
- 短期資料，驗證後可立即刪除或標記為已驗證
- 定期清理過期 OTP（cronjob）
- 防止暴力破解：單一 Email 限制生成頻率（透過 Redis）

---

### 4. media（媒體檔案）

**用途**：儲存所有媒體檔案的 metadata

**關鍵欄位**：
- `id` (UUID, PK)
- `type` (Enum: VIDEO | IMAGE | ARTICLE)
- `title` (String) - 標題（從檔名提取或手動設定）
- `file_path` (String, Unique) - 原始檔案路徑
- `file_size` (BigInt) - 檔案大小（bytes）
- `mime_type` (String) - MIME type
- `hash` (String?) - 檔案 hash（用於去重）
- **影片專屬**：
  - `duration` (Int?) - 長度（秒）
  - `width`, `height` (Int?) - 解析度
  - `fps` (Float?) - 幀率
  - `bitrate` (Int?) - 碼率
- **圖片專屬**：
  - `width`, `height` (Int?) - 解析度
  - `is_manga` (Boolean) - 是否為漫畫（連續編號）
- `thumbnail_path` (String?) - 縮圖路徑
- **統計**：
  - `view_count` (Int, Default: 0) - 觀看次數
  - `last_viewed_at` (DateTime?) - 最後觀看時間
- `uploaded_by` (UUID?, FK → users) - 上傳者（手動上傳才有）
- `created_at`, `updated_at`

**索引**：
- `file_path` (Unique) - 避免重複掃描
- `type` - 按類型篩選
- `hash` - 去重檢查
- `title` (Full-text) - 標題搜尋
- `view_count`, `last_viewed_at` - 熱門排序

**設計考量**：
- 單一表儲存所有媒體類型（使用 type 區分）
- 使用可選欄位處理不同類型的專屬屬性
- `file_path` 為 Unique，防止重複掃描同一檔案
- `hash` 用於偵測重複內容（不同路徑但相同檔案）

---

### 5. tags（標籤）

**用途**：儲存所有標籤（namespace::value 格式）

**關鍵欄位**：
- `id` (UUID, PK)
- `namespace` (String) - 命名空間（如 author, director, mode）
- `value` (String) - 標籤值（如 手塚治虫, Ang Lee, SFW）
- `color` (String?) - 顯示顏色（可選）
- `created_at`

**索引**：
- `namespace` + `value` (Unique) - 避免重複標籤
- `namespace` - 按命名空間查詢

**設計考量**：
- 標籤獨立於媒體，多對多關聯
- Unique 約束確保同一標籤只有一筆記錄
- 標籤不可刪除（只能標記為 deprecated 或移除關聯）

---

### 6. media_tags（媒體-標籤關聯）

**用途**：多對多關聯表

**關鍵欄位**：
- `media_id` (UUID, FK → media)
- `tag_id` (UUID, FK → tags)
- `assigned_by` (UUID?, FK → users) - 誰加上的標籤
- `assigned_at` (DateTime) - 加上時間

**索引**：
- `media_id` + `tag_id` (Unique, PK) - 避免重複關聯
- `media_id` - 查詢媒體的所有標籤
- `tag_id` - 查詢標籤的所有媒體

**設計考量**：
- 複合主鍵 (media_id, tag_id)
- 記錄誰加上的標籤（審計用途）
- 刪除媒體時 CASCADE 刪除關聯

---

### 7. favorites（最愛）

**用途**：使用者的最愛列表（多對多）

**關鍵欄位**：
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `media_id` (UUID, FK → media)
- `created_at` (DateTime) - 加入時間

**索引**：
- `user_id` + `media_id` (Unique) - 避免重複最愛
- `user_id` - 查詢使用者的最愛列表
- `media_id` - 查詢媒體被多少人最愛

**設計考量**：
- 每個使用者有獨立的最愛列表
- 一般使用者需檢查數量限制（應用層處理）
- 加入最愛時觸發完整轉碼（應用層邏輯）

---

### 8. watch_progress（觀看進度）

**用途**：記錄使用者的影片觀看進度（斷點續播）

**關鍵欄位**：
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `media_id` (UUID, FK → media, type = VIDEO)
- `progress_seconds` (Int) - 觀看到第幾秒
- `duration_seconds` (Int) - 影片總長度（快照）
- `completed` (Boolean) - 是否看完（progress >= 95%）
- `updated_at` (DateTime) - 最後更新時間

**索引**：
- `user_id` + `media_id` (Unique) - 一個使用者對一部影片只有一筆記錄
- `user_id` + `completed` - 查詢未看完的影片
- `updated_at` - 依最近觀看排序

**設計考量**：
- 每次播放更新 `progress_seconds` 和 `updated_at`
- `completed` 自動判斷（progress >= 95% duration）
- 可用於「繼續觀看」功能

---

### 9. watch_history（觀看紀錄）

**用途**：記錄每次觀看的歷史（用於分析和查詢）

**關鍵欄位**：
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `media_id` (UUID, FK → media, type = VIDEO)
- **觀看時間**：
  - `started_at` (DateTime) - 開始觀看時間
  - `ended_at` (DateTime?) - 結束觀看時間
- **觀看時長**：
  - `watched_duration` (Int, Default: 0) - 實際觀看時長（秒）
  - `start_position` (Int, Default: 0) - 從第幾秒開始播
  - `end_position` (Int?) - 播到第幾秒
- `completed` (Boolean, Default: false) - 是否看完
- **來源資訊**（可選）：
  - `source` (String?) - 來源平台（'web', 'mobile'）
  - `ip_address` (String?) - IP 位址
  - `user_agent` (Text?) - User Agent
- `created_at` (DateTime)

**索引**：
- `user_id` + `started_at DESC` - 查詢使用者的觀看歷程
- `media_id` + `started_at DESC` - 查詢影片的觀看記錄
- `user_id` + `media_id` + `started_at DESC` - 特定使用者對特定影片的觀看記錄

**設計考量**：
- 每次播放開始時創建一筆新記錄（不覆蓋）
- 與 `watch_progress` 分離：
  - `watch_progress` - 狀態表（最新進度，用於斷點續播）
  - `watch_history` - 歷史表（所有觀看記錄，用於分析）
- 播放結束時更新 `ended_at` 和最終統計數據
- `watched_duration` 可能小於 `ended_at - started_at`（使用者暫停、快轉）
- 可用於分析：
  - 觀看習慣（哪個時段最常看）
  - 熱門影片排行
  - 使用者觀看歷程追溯
- 定期清理：建議保留 1 年，舊資料可封存或刪除

**與 watch_progress 的協作**：
```
播放開始 → 創建 watch_history 記錄
         → 查詢 watch_progress 取得斷點位置

播放中   → 定期更新 watch_history (watched_duration, end_position)

播放結束 → 更新 watch_history (ended_at, completed)
         → 更新/創建 watch_progress（用於下次斷點續播）
```

---

### 10. transcode_jobs（轉碼任務）

**用途**：記錄轉碼任務狀態

**關鍵欄位**：
- `id` (UUID, PK)
- `media_id` (UUID, FK → media)
- `resolution` (Enum: 720p | 1080p) - 目標解析度
- `priority` (Enum: HIGH | LOW) - 優先級
- `status` (Enum: PENDING | PROCESSING | COMPLETED | FAILED)
- `output_path` (String?) - 輸出路徑（HLS playlist）
- `storage_type` (Enum: RAMDISK | PERMANENT) - 儲存位置
- `progress_percent` (Int, Default: 0) - 轉碼進度
- `error_message` (String?) - 錯誤訊息
- `started_at` (DateTime?) - 開始時間
- `completed_at` (DateTime?) - 完成時間
- `created_at`, `updated_at`

**索引**：
- `media_id` + `resolution` - 查詢特定媒體的轉碼狀態
- `status` + `priority` - Bull Queue 取得待處理任務
- `storage_type` - 區分 Ramdisk 和永久儲存

**設計考量**：
- 同一媒體可有多筆記錄（720p 和 1080p）
- `priority` 區分高優先級（720p）和低優先級（1080p）
- 完成後保留記錄（不刪除，用於審計和除錯）

---

### 11. transcode_cache（轉碼快取記錄）

**用途**：管理 Ramdisk 快取（LRU 策略）

**關鍵欄位**：
- `id` (UUID, PK)
- `media_id` (UUID, FK → media)
- `resolution` (Enum: 720p | 1080p)
- `cache_path` (String) - Ramdisk 路徑
- `size_bytes` (BigInt) - 檔案大小
- `last_accessed_at` (DateTime) - 最後存取時間（用於 LRU）
- `created_at`

**索引**：
- `media_id` + `resolution` (Unique) - 一部影片一個解析度只有一筆快取
- `last_accessed_at` - LRU 排序

**設計考量**：
- 記錄 Ramdisk 中的快取檔案
- `last_accessed_at` 用於 LRU 演算法（清理最久未用的）
- Ramdisk 空間不足時，查詢此表找出最舊的快取刪除
- 每次播放更新 `last_accessed_at`

---

## 資料表關聯圖

```
┌─────────┐
│  users  │──┐
└─────────┘  │
     │       │
     ├───────┼───────────┐
     │       │           │
     ▼       ▼           ▼
┌──────────┐ ┌──────────────┐ ┌─────────┐
│ sessions │ │   favorites  │ │  watch  │
└──────────┘ └──────────────┘ │progress │
                    │          └─────────┘
                    │               │
                    ▼               │
              ┌─────────┐           │
              │  media  │◄──────────┤
              └─────────┘           │
                    │               │
         ┌──────────┼──────────┐    │
         │          │          │    │
         ▼          ▼          ▼    ▼
  ┌────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐
  │ media_tags │ │ transcode    │ │ transcode    │ │  watch  │
  └────────────┘ │    jobs      │ │   cache      │ │ history │
         │       └──────────────┘ └──────────────┘ └─────────┘
         ▼                                               ▲
    ┌──────┐                                             │
    │ tags │                                             │
    └──────┘                                             │
                                                         │
                                              users ─────┘
```

---

## 索引策略

### 高頻查詢索引

1. **使用者登入**：
   - `users.email` (Unique)
   - `sessions.token` (Unique)

2. **媒體列表與搜尋**：
   - `media.type` - 按類型篩選
   - `media.title` (Full-text) - 標題搜尋
   - `media_tags.media_id` + `media_tags.tag_id` - 標籤篩選

3. **安全模式篩選**：
   - 組合查詢：`media` JOIN `media_tags` WHERE `tag.namespace = 'mode' AND tag.value = 'SFW'`
   - 考慮建立 materialized view 或快取

4. **最愛與觀看進度**：
   - `favorites.user_id`
   - `watch_progress.user_id` + `watch_progress.completed`

5. **觀看紀錄查詢**：
   - `watch_history.user_id` + `watch_history.started_at` - 使用者觀看歷程
   - `watch_history.media_id` + `watch_history.started_at` - 影片觀看記錄

6. **轉碼佇列**：
   - `transcode_jobs.status` + `transcode_jobs.priority`

7. **LRU 快取**：
   - `transcode_cache.last_accessed_at` - 按時間排序

### 複合索引建議

```sql
-- 安全模式媒體查詢（管理員切換時）
CREATE INDEX idx_media_tags_mode ON media_tags(tag_id)
WHERE tag_id IN (SELECT id FROM tags WHERE namespace = 'mode');

-- 使用者最愛列表
CREATE INDEX idx_favorites_user_created ON favorites(user_id, created_at DESC);

-- 轉碼任務佇列
CREATE INDEX idx_jobs_queue ON transcode_jobs(status, priority DESC, created_at);
```

---

## 效能考量

### 1. 安全模式切換
- **問題**：管理員切換安全模式時，需要重新查詢所有媒體
- **解決**：
  - 前端快取媒體列表（Redux store）
  - 只在切換時重新查詢
  - 考慮使用 GraphQL subscription 或 Server-Sent Events

### 2. 標籤搜尋效能
- **問題**：多標籤組合查詢可能很慢
- **解決**：
  - `media_tags` 表建立雙向索引
  - 使用 PostgreSQL 的 GIN 索引（陣列欄位）
  - 考慮使用 Elasticsearch（未來擴展）

### 3. Ramdisk 快取管理
- **問題**：頻繁查詢 `last_accessed_at` 更新可能造成寫入瓶頸
- **解決**：
  - 使用 Redis 記錄存取時間，定期批次更新資料庫
  - 或使用 PostgreSQL 的 `ON CONFLICT DO UPDATE`

### 4. 轉碼任務併發
- **問題**：多個 worker 可能同時抓取同一任務
- **解決**：
  - 使用 Bull Queue（Redis-based）管理任務
  - 或使用 PostgreSQL 的 `FOR UPDATE SKIP LOCKED`

---

## 資料清理策略

### 定期清理（Cronjob）

1. **過期 Session**：
   ```sql
   DELETE FROM sessions WHERE expires_at < NOW();
   ```
   頻率：每小時

2. **過期 OTP**：
   ```sql
   DELETE FROM otps WHERE expires_at < NOW();
   ```
   頻率：每 10 分鐘

3. **舊的觀看進度**（可選）：
   ```sql
   DELETE FROM watch_progress
   WHERE completed = true AND updated_at < NOW() - INTERVAL '90 days';
   ```
   頻率：每天

4. **失敗的轉碼任務**（可選）：
   ```sql
   DELETE FROM transcode_jobs
   WHERE status = 'FAILED' AND created_at < NOW() - INTERVAL '7 days';
   ```
   頻率：每週

---

## 備份策略

1. **每日全量備份**：
   - 使用 `pg_dump` 備份整個資料庫
   - 保留最近 7 天

2. **重要表額外備份**：
   - `users`, `media`, `tags`, `media_tags` - 保留 30 天
   - 其他表遺失可重建（如 transcode_jobs）

3. **Point-in-Time Recovery (PITR)**：
   - 啟用 WAL archiving
   - 保留最近 7 天的 WAL

---

## 遷移策略

使用 Prisma Migrate 管理 schema 變更：

```bash
# 開發環境
npx prisma migrate dev --name add_feature_x

# 正式環境
npx prisma migrate deploy
```

**重要原則**：
- 永遠先在開發環境測試遷移
- 大型遷移前先備份
- 破壞性變更需要提前計畫（如修改 PK）

---

## 第五階段擴展（ComfyUI）

### 11. comfyui_workflows（ComfyUI 工作流）

**用途**：儲存使用者的 ComfyUI 工作流

**關鍵欄位**：
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `instance` (Enum: ADMIN | USER) - 屬於哪個實例
- `name` (String) - 工作流名稱
- `workflow_json` (JSONB) - 工作流定義
- `is_public` (Boolean) - 是否公開（僅管理員可設定）
- `created_at`, `updated_at`

**索引**：
- `user_id` + `instance`
- `is_public` (如果實作分享功能)

### 12. comfyui_outputs（ComfyUI 輸出記錄）

**用途**：記錄 ComfyUI 產出的圖片/影片

**關鍵欄位**：
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `instance` (Enum: ADMIN | USER)
- `workflow_id` (UUID?, FK → comfyui_workflows)
- `media_id` (UUID, FK → media) - 產出後自動建立 media 記錄
- `prompt` (Text?) - 使用的 prompt
- `created_at`

**索引**：
- `user_id`
- `media_id`

---

## 附錄：完整 Schema 檔案

完整的 Prisma Schema 請參考：`backend/prisma/schema.prisma`

（實作時建立）
