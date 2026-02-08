# Claude Code 開發指南

## 專案概述

私人媒體中心系統，管理和播放影片、圖片、文章，整合 AI 翻譯和 ComfyUI 創作工具。

---

## 關鍵技術決策

### 網路架構：區網優先
**策略**：先在區網內開發和測試，未來再考慮公網訪問

**訪問方式**：
```
筆電 → http://192.168.50.100:8080 (Caddy) → 路由到各服務
       ├─ / → Media Center (port 3000)
       ├─ /comfyui → ComfyUI (未來)
       └─ /grafana → Grafana (未來)
```

**原因**：
- 專注於核心功能開發
- 區網內使用 HTTP（不需要 HTTPS）
- 統一入口，未來擴展容易
- 未來上公網時只需加入 Cloudflare Tunnel，架構不變

---

### 反向代理：Caddy
**選擇**：Caddy（而非 nginx）

**原因**：
- 配置極簡（適合個人專案）
- 統一管理多個服務的入口
- 未來與 Cloudflare Tunnel 整合容易
- 內建 HTTP/2, HTTP/3
- 區網內可用 HTTP，公網時自動升級 HTTPS

---

### 影片播放器：hls.js
**選擇**：hls.js（而非 video.js）

**原因**：
- 輕量（~200KB vs ~500KB+）
- 專注於 HLS，效能更好
- 社群更活躍
- 完全控制，易於客製化

**首幀優化**：
- 不使用 LL-HLS（僅用於直播）
- 使用 2-4 秒 segment duration
- FFmpeg faststart + GOP 對齊
- 預期首幀：2-3 秒

---

### 轉碼與儲存策略

#### 最愛影片
- 完整轉碼並永久儲存於 `/volume1/transcoded/`
- 支援 ABR：1080p (5Mbps) + 720p (3Mbps)
- 一次性轉碼，後續直接串流

#### 非最愛影片（分階段轉碼）
**策略**：用戶點擊播放時，採用兩階段轉碼提升使用者體驗

**第一階段（高優先級）**：
- 立即轉碼 720p 版本
- 首幀時間：1-2 秒
- 轉碼速度：1.5-2x（DS420+ 實測）
- 用戶可以開始觀看

**第二階段（背景低優先級）**：
- 720p 轉碼完成後，自動啟動 1080p 轉碼
- 不影響當前播放
- 使用 Bull Queue 低優先級任務
- 完成後覆蓋 720p 版本，下次播放為 1080p

**快取位置**：Ramdisk（LRU 策略清理）

**流程圖**：
```
用戶點擊播放
  ↓
檢查 Ramdisk 快取
  ├─ 有 1080p → 直接播放 1080p
  ├─ 有 720p → 直接播放 720p（背景檢查是否需要補 1080p）
  └─ 沒快取 →
      ↓
      高優先級：轉 720p（1-2 秒後開始播放）
      ↓
      低優先級：背景轉 1080p（不阻塞播放）
```

#### 效能預估（DS420+）
| 轉碼場景 | 速度 | 首幀時間 | 用戶體驗 |
|----------|------|----------|----------|
| 1080p → 720p | 1.5-2x | 1-2 秒 | ⭐⭐⭐⭐⭐ 極快 |
| 1080p → 1080p | 0.8-1.2x | - | 背景執行，不影響 |
| 4K → 720p | 1-1.5x | 2-3 秒 | ⭐⭐⭐⭐ 快 |
| 4K → 1080p | 0.3-0.8x | - | 背景執行 |

#### 關鍵設計考量

**轉碼佇列策略**：
- Bull Queue 管理兩個獨立佇列（高優先級 720p + 低優先級 1080p）
- 同時最多 2 個任務（避免 CPU 過載）

**使用者體驗**：
- 前端顯示當前解析度和背景轉碼狀態
- 1080p 完成後可提示用戶切換

**降級與容錯**：
- 720p 失敗時降級到 480p
- 1080p 失敗時保留 720p

**快取管理**：
- LRU 策略保留最近 64 部
- 空間不足時優先刪除 1080p

**最愛影片處理**：
- 加入最愛時從 Ramdisk 移動到永久儲存
- 補轉成完整 ABR 版本

---

### 媒體來源管理
**策略**：支援多個資料夾作為媒體來源，透過 .env 動態配置

**架構設計**：
```yaml
# Docker 層：mount 整個 /volume1 (read-only)
volumes:
  - /volume1:/app/nas:ro
  - /volume1/transcoded:/app/transcoded  # 轉碼輸出（可寫）

# 應用層：讀取 .env 中的資料夾列表
MEDIA_SOURCES=/volume1/media/videos,/volume1/downloads/movies,/volume1/family/photos
```

**為什麼這樣設計**：
- Docker 配置簡單穩定（不需頻繁修改）
- .env 修改後只需**重啟 server**（不需重啟 container）
- 支援無限數量資料夾
- read-only mount 防止誤刪

**應用層職責**：
- 啟動時掃描 `MEDIA_SOURCES` 列出的資料夾
- 建立檔案索引到資料庫（記錄完整路徑）
- 支援手動觸發重新掃描
- 定時自動掃描新檔案（可選）
- 排除特定模式（如 `@eaDir`, `node_modules`）

---

### 多使用者權限管理
**策略**：支援 2-3 個使用者，透過 Email 白名單 + 角色分級

**使用者配置**：
```bash
# .env
ADMIN_EMAIL=you@gmail.com
ALLOWED_EMAILS=friend@gmail.com,family@gmail.com
USER_FAVORITES_LIMIT=100
```

**權限分級**：

| 功能 | 管理員 | 一般使用者 |
|------|--------|-----------|
| 安全模式切換 | ✅ | ❌（永遠 SFW） |
| 上傳影片/圖片 | ✅ | ❌ |
| 編輯標籤 | ✅ | ❌ |
| 瀏覽內容 | ✅ 全部 | ✅ 僅 SFW |
| 最愛列表 | ✅ 無限制 | ✅ 限制數量 |
| 觀看進度 | ✅ | ✅ |
| 播放影片 | ✅ | ✅ |

**資料庫影響**：
- `users` 表：加入 `role` 欄位（'admin' 或 'user'）
- `favorites` 表：改為多對多（支援個人最愛列表）
- `watch_progress` 表：記錄個人觀看進度
- `sessions` 表：記錄使用者的安全模式狀態

**為什麼這樣設計**：
- 簡單實用：適合家人/朋友共用
- Email 白名單：不需要註冊介面
- 角色自動分配：首次登入時根據 Email 決定
- 保護內容：一般使用者無法看到 NSFW 內容
- 防止濫用：限制最愛數量、禁止上傳

---

### ComfyUI 雙實例架構

**策略**：建立兩個獨立的 ComfyUI 實例，分別給管理員和一般使用者使用

#### 為什麼這樣設計

**模型完全共享**：
- 所有模型、Lora、ControlNet 等都存放在 `/volume1/comfyui/models/`
- 兩個實例都以唯讀方式掛載
- 管理員上傳模型後，兩個實例都能使用
- 節省硬碟空間（模型檔案通常數 GB）

**工作流與輸出分離**：
- 每個使用者有自己的工作流資料夾
- 一般使用者看不到管理員的 NSFW 工作流
- 輸出圖片分開儲存，避免混淆
- 符合安全模式的設計理念

**互斥執行機制**：
- RTX 2080Ti 顯存 11GB，無法同時跑兩個複雜任務
- 使用 Bull Queue 管理 GPU 任務
- 任一實例執行任務時，另一實例的任務自動排隊
- 前端顯示「GPU 忙碌中，已加入佇列」

**管理員雙權限**：
- 管理員登入時可看到兩個進入點：
  - 「我的 ComfyUI」（/comfyui/admin）
  - 「使用者 ComfyUI」（/comfyui/user）
- 管理員可檢視一般使用者的工作流和輸出
- 一般使用者只能看到 /comfyui/user

#### 技術實現方式

**GPU 互斥控制**：
- 透過 Redis 分散式鎖管理 GPU 使用權
- Bull Queue 處理任務排隊（管理員優先級較高）

**儲存策略**：
- ComfyUI 輸出直接寫入 HDD（不使用 Ramdisk）
- 自動同步到媒體庫並加上標籤

---

## 環境設定

### NAS
- **型號**：Synology DS420+
- **IP**：192.168.50.100（區網固定 IP）
- **Caddy Port**：8080（統一入口）
- **Media Center Port**：3000（內部）
- **記憶體**：10GB 總計
  - Ramdisk: 6GB (60%)
  - 系統 + Docker: 4GB (40%)
- **媒體來源**：多資料夾（透過 .env 配置）
  - 範例：`/volume1/media/`, `/volume1/downloads/`, `/volume1/family/`

### Ramdisk 分配（6GB）
- Redis: 500MB
- 影片快取: 4GB（約 40-80 部）
- InfluxDB WAL: 1GB
- 臨時檔案: 500MB

### Desktop
- **環境**：Windows + RTX 2080Ti + WSL2 + Docker
- **用途**：ComfyUI、AI 翻譯（GPU 加速）

### Router
- **型號**：ASUS RT-AX56U（Merlin 韌體）
- **功能**：內建 Let's Encrypt（供 router 管理介面使用，非 Media Center）

---

## 開發優先級

1. **第一階段**：核心功能（區網測試）
   - Caddy 反向代理設定（HTTP）
   - Email OTP 登入
   - 影片上傳、播放、標籤管理
   - 最愛功能
   - 轉碼服務（FFmpeg + Bull Queue）

2. **第二階段**：Grafana 監控
   - 全部署在 NAS（24/7 可用性 + 統一管理）
   - 記憶體優化（InfluxDB 256MB + Grafana 128MB）
   - NAS 資源監控（使用現成 Synology Dashboard）
   - Desktop 資源監控（Telegraf 推送，GPU/CPU/RAM）
   - UPS 監控整合（NUT）
   - 資料降採樣設定（30天/1年/5年）

3. **第三階段**：WebAuthn + 圖片功能

4. **第四階段**：文章功能

5. **第五階段**：ComfyUI 整合

6. **第六階段**：公網訪問（可選）
   - Cloudflare Tunnel 設定
   - Caddy 啟用 HTTPS
   - DNS 設定

---

## 開發環境設定

### 筆電開發環境（前端工程師友善）

**架構**：
```
筆電 (docker-compose.dev.yml)
├─ frontend (Vite dev server, port 5173)
│  └─ Hot reload, mount source code
├─ backend (nodemon, port 3000)
│  └─ Hot reload, mount source code
└─ 連接 NAS 服務（區網）
   ├─ PostgreSQL (192.168.50.100:5432)
   ├─ Redis (192.168.50.100:6379)
   └─ 媒體檔案 (SMB/NFS mount, read-only)
```

**啟動方式**：
```bash
# 使用開發環境 Compose 檔案
docker-compose -f docker-compose.dev.yml up

# 前端：http://localhost:5173 (Vite HMR)
# 後端：http://localhost:3000 (nodemon auto-reload)
# GraphQL：http://localhost:3000/graphql
```

**環境變數**：
- 使用 `.env.development` (不進 git)
- `DATABASE_URL=postgresql://user:pass@192.168.50.100:5432/media_center`
- `REDIS_URL=redis://192.168.50.100:6379`

**NAS 前置設定**：
- PostgreSQL 允許區網連接（修改 `pg_hba.conf`）
- Redis 允許區網連接（修改 `redis.conf`）
- 媒體檔案透過 SMB/NFS 掛載到筆電（read-only）

**優點**：
- ✅ 前端修改立即生效（Vite HMR）
- ✅ 後端修改自動重啟（nodemon）
- ✅ 使用真實資料（共用線上 DB）
- ✅ 不需要在筆電跑資料庫
- ✅ 輕量、快速啟動

---

## 重要提醒

### 安全性
- **區網階段**：
  - HTTP 訪問（`http://192.168.50.100:8080`）
  - Email OTP 認證
  - HLS 加密：AES-128
  - 不開放 Router Port
- **未來公網階段**：
  - Cloudflare Tunnel（零信任架構）
  - Caddy 自動啟用 HTTPS
  - 架構無需大改

### 效能
- **首幀顯示**：
  - 最愛影片（已轉碼）：< 1 秒
  - 非最愛影片（即時轉碼）：2-4 秒
- **同時串流**：3-5 個（含轉碼任務）
- **轉碼速度**：1080p → 720p 約 1x 實時速度
- **Ramdisk**：6GB，需監控記憶體使用

### 備份
- 資料庫：每日自動備份
- 媒體檔案：重要內容手動備份
- 設定檔：Git 版本控制

### 部署流程
1. **開發階段**：筆電使用 `docker-compose.dev.yml`
2. **測試階段**：NAS 區網內使用 Caddy + HTTP
3. **上線階段**：可選擇性加入 Cloudflare Tunnel
