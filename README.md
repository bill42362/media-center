# Media Center

私人媒體中心系統，用於管理和播放影片、圖片、文章。支援多使用者、標籤分類、HLS 串流、轉碼快取、安全模式等功能。採用 React + GraphQL + PostgreSQL，部署在 Synology NAS 上，透過 Caddy 反向代理統一管理服務入口。

---

## 主要功能

### 第一階段（核心功能）
- ✅ **Email OTP 登入**：無需密碼，使用 Gmail SMTP 發送驗證碼
- ✅ **影片串流播放**：HLS + AES-128 加密，支援 ABR（1080p/720p）
- ✅ **智慧轉碼**：最愛影片永久儲存，非最愛影片快取於 Ramdisk（LRU 策略）
- ✅ **標籤系統**：namespace::value 格式，支援多標籤查詢與自動補全
- ✅ **最愛功能**：管理員無限制，一般使用者有數量限制
- ✅ **斷點續播**：自動記錄觀看進度
- ✅ **安全模式**：管理員可切換 SFW/NSFW，一般使用者永遠 SFW

### 第二階段（監控）
- 🔄 **Grafana 監控**：NAS/Desktop 資源、UPS 狀態、轉碼任務

### 未來階段
- ⏳ WebAuthn 快速解鎖
- ⏳ 圖片瀏覽與 AI 翻譯
- ⏳ 文章閱讀與簡繁轉換
- ⏳ ComfyUI 整合
- ⏳ Cloudflare Tunnel 公網訪問

---

## 技術棧

### 前端
- **React Router v7** (Data Mode + CSR)
- **Ant Design 5.x** (UI 元件)
- **Redux Toolkit** (狀態管理)
- **Apollo Client** (GraphQL)
- **hls.js** (HLS 播放器)
- **TypeScript**

### 後端
- **Node.js + TypeScript**
- **Apollo Server** (GraphQL API)
- **PostgreSQL** (資料庫)
- **Redis** (快取與 Session)
- **Bull Queue** (轉碼任務佇列)
- **FFmpeg** (影片轉碼)
- **Caddy** (統一入口、自動 HTTPS)

### 部署
- **Docker Compose** (服務編排)
- **Synology NAS DS420+** (主伺服器)
- **Ramdisk 6GB** (Redis + 影片快取)

---

## 快速開始

### 環境需求

- **NAS**：Synology DS420+ (或相容機型)
  - RAM：10GB (6GB Ramdisk + 4GB 系統)
  - Docker 與 Docker Compose
  - SSH 存取權限

- **Desktop**（可選，用於 ComfyUI 和 AI 翻譯）：
  - Windows + WSL2 + Docker
  - NVIDIA GPU (RTX 2080Ti 或以上)

---

## 部署指南

### 1. NAS 前置設定

#### 1.1 建立 Ramdisk（6GB）

透過 SSH 登入 NAS 並執行：

```bash
# 建立 Ramdisk
sudo mkdir -p /ramdisk
sudo mount -t tmpfs -o size=6G tmpfs /ramdisk

# 建立子目錄
sudo mkdir -p /ramdisk/cache
sudo mkdir -p /ramdisk/redis
sudo mkdir -p /ramdisk/temp

# 設定權限
sudo chmod 777 /ramdisk/cache /ramdisk/temp

# 加入開機自動掛載
sudo tee /usr/local/etc/rc.d/ramdisk.sh > /dev/null <<'EOF'
#!/bin/bash
mkdir -p /ramdisk
mount -t tmpfs -o size=6G tmpfs /ramdisk
mkdir -p /ramdisk/cache /ramdisk/redis /ramdisk/temp
chmod 777 /ramdisk/cache /ramdisk/temp
EOF

sudo chmod +x /usr/local/etc/rc.d/ramdisk.sh
```

驗證 Ramdisk：
```bash
df -h | grep ramdisk
# 應該顯示 6.0G 的 tmpfs
```

#### 1.2 設定 PostgreSQL 允許區網連接

編輯 `pg_hba.conf`（路徑依 Docker 設定而異）：

```bash
# 在 Docker 中執行
docker exec -it media-postgres sh

# 編輯設定檔
vi /var/lib/postgresql/data/pg_hba.conf

# 加入以下行（允許區網 192.168.50.0/24 連接）
host    all    all    192.168.50.0/24    scram-sha-256

# 重啟容器
docker restart media-postgres
```

#### 1.3 設定 Redis 允許區網連接

編輯 `redis.conf`：

```bash
# 在專案根目錄
vi docker/redis/redis.conf

# 修改設定
bind 0.0.0.0
requirepass your_redis_password

# 重啟容器
docker restart media-redis
```

---

### 2. 環境變數設定

複製環境變數範本：

```bash
cp .env.default .env
```

編輯 `.env` 並設定必要參數：

```bash
# Server
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://192.168.50.100:8080

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=media_center
POSTGRES_USER=media_user
POSTGRES_PASSWORD=your_strong_password_here

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# JWT
JWT_SECRET=your_jwt_secret_at_least_32_characters
JWT_EXPIRES_IN=7d

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_gmail_app_password

# Admin & Allowed Users
ADMIN_EMAIL=admin@example.com
ALLOWED_EMAILS=friend@example.com,family@example.com

# Media Sources (支援多個資料夾，逗號分隔)
VIDEO_SOURCES=/volume1/media/videos,/volume1/downloads/movies,/volume1/family/videos
IMAGE_SOURCES=/volume1/media/images,/volume1/downloads/images,/volume1/family/photos
ARTICLE_SOURCES=/volume1/media/articles,/volume1/documents

# Transcode & Cache Paths
TRANSCODED_PATH=/volume1/transcoded
CACHE_PATH=/ramdisk/cache
RAMDISK_SIZE=6G

# Transcoding
FFMPEG_THREADS=4
FAVORITE_AUTO_TRANSCODE=true
CACHE_MAX_VIDEOS=64
```

**環境變數說明**：

| 變數 | 說明 | 範例 |
|------|------|------|
| `POSTGRES_PASSWORD` | PostgreSQL 密碼（必須修改） | `strong_password_123` |
| `REDIS_PASSWORD` | Redis 密碼（必須修改） | `redis_pass_456` |
| `JWT_SECRET` | JWT 簽章金鑰（至少 32 字元） | `your_secret_key_here_32chars` |
| `SMTP_USER` | Gmail 帳號 | `your-email@gmail.com` |
| `SMTP_PASS` | Gmail 應用程式密碼 | `abcd efgh ijkl mnop` |
| `ADMIN_EMAIL` | 管理員 Email | `admin@example.com` |
| `ALLOWED_EMAILS` | 允許登入的使用者 Email（逗號分隔） | `user1@example.com,user2@example.com` |
| `VIDEO_SOURCES` | 影片來源資料夾（逗號分隔，支援多個） | `/volume1/media/videos,/volume1/downloads` |
| `IMAGE_SOURCES` | 圖片來源資料夾（逗號分隔，支援多個） | `/volume1/media/images,/volume1/family/photos` |
| `ARTICLE_SOURCES` | 文章來源資料夾（逗號分隔，支援多個） | `/volume1/media/articles` |
| `CACHE_MAX_VIDEOS` | Ramdisk 最多快取影片數量 | `64` |

**取得 Gmail 應用程式密碼**：
1. 登入 Google 帳號
2. 前往「安全性」→「兩步驟驗證」（必須啟用）
3. 選擇「應用程式密碼」
4. 選擇「郵件」和「其他裝置」
5. 複製生成的 16 位密碼（格式：`xxxx xxxx xxxx xxxx`）

---

### 3. 啟動服務

#### 3.1 建立必要目錄

```bash
# 建立轉碼輸出目錄
mkdir -p /volume1/transcoded

# 建立媒體來源目錄（根據你的 VIDEO_SOURCES 設定）
# 範例 1：單一來源
mkdir -p /volume1/media/videos
mkdir -p /volume1/media/images
mkdir -p /volume1/media/articles

# 範例 2：多個來源
mkdir -p /volume1/media/videos
mkdir -p /volume1/downloads/movies
mkdir -p /volume1/family/videos
mkdir -p /volume1/family/photos
```

**說明**：
- 系統會掃描 `VIDEO_SOURCES`、`IMAGE_SOURCES`、`ARTICLE_SOURCES` 中列出的所有資料夾
- 可以隨時在 `.env` 中新增資料夾，重啟服務後生效
- 建議將不同來源的媒體分開放置，方便管理

#### 3.2 使用 Synology Container Manager

本專案完全相容 Synology NAS 內建的 **Container Manager** 應用程式，你可以選擇使用 GUI 或 CLI 來管理服務。

**Docker Compose 版本說明**：
- Synology Container Manager 使用 Docker Compose v2
- 指令格式：`docker compose`（空格分隔，而非 `docker-compose` 連字號）
- 如果你習慣使用 `docker-compose` 指令，可以建立別名：
  ```bash
  alias docker-compose='docker compose'
  ```

##### 方法一：使用 Container Manager GUI（適合初學者）

1. **開啟 Container Manager**
   - 在 Synology DSM 中打開「Container Manager」應用程式
   - 左側選單選擇「專案」(Project)

2. **建立新專案**
   - 點擊「新增」→「從 Docker Compose 建立」
   - 專案名稱：`media-center`
   - 路徑：選擇專案根目錄（包含 `docker-compose.yml` 的資料夾）
   - 來源：選擇「上傳 docker-compose.yml」或「使用現有路徑」

3. **設定環境變數**
   - 在「環境」頁籤中設定環境變數（或使用 `.env` 檔案）
   - Container Manager 會自動讀取專案目錄中的 `.env` 檔案

4. **啟動專案**
   - 點擊「建置」等待映像建置完成
   - 建置完成後點擊「啟動」

5. **查看服務狀態**
   - 在「容器」頁面查看所有運行中的容器
   - 點擊容器名稱可查看日誌、資源使用情況

##### 方法二：使用 SSH + CLI（推薦，功能完整）

透過 SSH 登入 NAS 後執行：

```bash
# 進入專案目錄
cd /volume1/your-project-path/media-center

# 建置並啟動所有服務（Docker Compose v2 語法）
docker compose up -d

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f backend

# 重啟特定服務
docker compose restart backend

# 停止所有服務
docker compose down

# 停止並刪除資料卷（危險操作！）
docker compose down -v
```

**日常管理**：

| 操作 | GUI 方式 | CLI 方式 |
|------|---------|---------|
| 查看日誌 | 容器 → 點擊容器 → 日誌 | `docker compose logs -f [service]` |
| 重啟服務 | 容器 → 選擇容器 → 動作 → 重新啟動 | `docker compose restart [service]` |
| 更新服務 | 專案 → 選擇專案 → 建置 | `docker compose up -d --build` |
| 查看資源 | 容器 → 點擊容器 → 資源監控 | `docker stats` |
| 進入容器 | 容器 → 選擇容器 → 終端機 | `docker compose exec [service] sh` |

**建議使用情境**：
- ✅ **GUI**：查看日誌、監控資源使用、快速重啟服務
- ✅ **CLI**：初始部署、更新設定檔、執行資料庫遷移、複雜操作

#### 3.3 初始化資料庫

```bash
# 執行資料庫遷移
docker compose exec backend npm run migrate

# 掃描媒體檔案
docker compose exec backend npm run scan-media
```

---

### 4. 驗證部署

訪問以下 URL 驗證服務：

- **前端**：http://192.168.50.100:8080
- **GraphQL Playground**：http://192.168.50.100:8080/graphql
- **Caddy 健康檢查**：http://192.168.50.100:8080/health

測試登入：
1. 前往 http://192.168.50.100:8080
2. 輸入 `ADMIN_EMAIL` 設定的 Email
3. 檢查信箱收到的 6 位數 OTP
4. 輸入 OTP 完成登入

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
# 複製開發環境變數
cp .env.default .env.development

# 修改 DATABASE_URL 和 REDIS_URL 指向 NAS
# DATABASE_URL=postgresql://user:pass@192.168.50.100:5432/media_center
# REDIS_URL=redis://192.168.50.100:6379

# 啟動開發環境
docker-compose -f docker-compose.dev.yml up

# 前端：http://localhost:5173 (Vite HMR)
# 後端：http://localhost:3000 (nodemon auto-reload)
# GraphQL：http://localhost:3000/graphql
```

**優點**：
- ✅ 前端修改立即生效（Vite HMR）
- ✅ 後端修改自動重啟（nodemon）
- ✅ 使用真實資料（共用線上 DB）
- ✅ 不需要在筆電跑資料庫
- ✅ 輕量、快速啟動

---

## 專案結構

```
media-center/
├── README.md                    # 本檔案
├── CLAUDE.md                    # 開發指南（技術決策）
├── .env.default                 # 環境變數範本
├── docker-compose.yml           # 正式環境
├── docker-compose.dev.yml       # 開發環境
│
├── docs/
│   ├── SPECIFICATION.md         # 功能規格
│   ├── DATABASE.md              # 資料庫設計
│   └── API.md                   # GraphQL API 文件
│
├── frontend/                    # React 前端
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/                     # Node.js 後端
│   ├── src/
│   ├── prisma/                  # 資料庫 Schema
│   └── package.json
│
├── transcoder/                  # 轉碼服務
│   ├── src/
│   └── package.json
│
├── caddy/                       # Caddy 設定
│   └── Caddyfile
│
└── scripts/                     # 工具腳本
    ├── setup-ramdisk.sh
    ├── scan-media.ts
    └── backup-db.sh
```

---

## 文件導覽

- **[SPECIFICATION.md](docs/SPECIFICATION.md)** - 完整功能規格、系統需求、開發階段
- **[DATABASE.md](docs/DATABASE.md)** - 資料庫設計、ER diagram、索引策略
- **[API.md](docs/API.md)** - GraphQL API 定義、使用範例、權限說明
- **[CLAUDE.md](CLAUDE.md)** - 技術決策、架構設計、開發流程

---

## 常見問題

### Q1：如何新增使用者？

編輯 `.env` 的 `ALLOWED_EMAILS`，加入新的 Email：
```bash
ALLOWED_EMAILS=user1@example.com,user2@example.com,newuser@example.com
```

重啟服務：
```bash
docker compose restart backend
```

### Q2：Ramdisk 重開機後消失怎麼辦？

確認 `/usr/local/etc/rc.d/ramdisk.sh` 已建立且有執行權限：
```bash
ls -l /usr/local/etc/rc.d/ramdisk.sh
# 應該顯示 -rwxr-xr-x
```

手動執行：
```bash
sudo /usr/local/etc/rc.d/ramdisk.sh
```

### Q3：如何清理 Ramdisk 快取？

```bash
# 查看快取使用情況
du -sh /ramdisk/cache

# 清理所有快取
rm -rf /ramdisk/cache/*

# 或透過 API 清理（保留最近 N 部）
curl -X POST http://192.168.50.100:8080/api/cache/cleanup?keep=32
```

### Q4：轉碼速度太慢怎麼辦？

調整 `.env` 的 `FFMPEG_THREADS`（建議設為 CPU 核心數）：
```bash
FFMPEG_THREADS=4
```

或降低解析度（只轉 720p）：
```bash
ABR_ENABLED=false
DEFAULT_RESOLUTION=720p
```

### Q5：如何備份資料庫？

```bash
# 執行備份腳本
./scripts/backup-db.sh

# 備份檔案會儲存在 /volume1/backups/
ls -lh /volume1/backups/
```

恢復資料庫：
```bash
docker compose exec postgres psql -U media_user media_center < backup.sql
```

---

## 授權

私人專案，僅供個人與家人使用。

---

## 致謝

- **Claude Sonnet 4.5** - 協助規劃與文件撰寫
- **Ant Design** - UI 元件庫
- **hls.js** - HLS 播放器
- **FFmpeg** - 影片轉碼引擎
