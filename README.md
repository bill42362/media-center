# Media Center

私人媒體中心系統，用於管理和播放影片、圖片、文章。支援多使用者、標籤分類、HLS 串流、轉碼快取、安全模式等功能。採用 React + GraphQL + PostgreSQL，部署在 Synology NAS 上，透過 Caddy 反向代理統一管理服務入口。

---

## 專案狀態

### ✅ 已完成

#### 基礎架構
- [x] 專案目錄結構
- [x] Docker Compose 配置（正式 + 開發環境）
- [x] Caddy 反向代理設定
- [x] 環境變數範本 (`.env.default`)
- [x] ESLint + Prettier 共用配置

#### 後端 (Node.js + TypeScript + GraphQL)
- [x] Package.json 與 TypeScript 設定
- [x] Prisma Schema（完整資料庫設計）
- [x] 環境變數驗證與配置
- [x] 資料庫連線（PostgreSQL + Prisma）
- [x] Redis 連線設定
- [x] Winston Logger 設定
- [x] 認證服務：
  - [x] OTP 生成與驗證
  - [x] Email 發送（SMTP）
  - [x] Session 管理（JWT + Database）
  - [x] User 管理（白名單、角色分配）
- [x] GraphQL Schema（完整 API 定義）
- [x] GraphQL Resolvers（Auth 認證）
- [x] Apollo Server + Express 整合

#### 前端 (React + TypeScript + Vite)
- [x] Package.json 與 TypeScript 設定
- [x] Vite 配置
- [x] Apollo Client 設定
- [x] Redux Store 設定（Auth Slice）
- [x] React Router 設定
- [x] 頁面骨架：
  - [x] 登入頁面（Email + autocomplete 優化）
  - [x] OTP 驗證頁面（autocomplete="one-time-code"）
  - [x] 首頁
  - [x] 影片列表頁（骨架）
  - [x] 影片播放頁（骨架）
- [x] Layout 組件（Sidebar + Header）
- [x] CSS Normalizer（modern-normalize）

### ⏳ 進行中

- [ ] Prisma 資料庫遷移（需執行）
- [ ] GraphQL Resolvers（Media, Tag, Favorites）
- [ ] 前端 GraphQL Mutations/Queries 整合
- [ ] 影片上傳與掃描功能
- [ ] 影片播放器（hls.js）
- [ ] 轉碼服務（FFmpeg + Bull Queue）

---

## 主要功能

### 第一階段（核心功能）
- ✅ **Email OTP 登入**：無需密碼，使用 Gmail SMTP 發送驗證碼
- 🔄 **影片串流播放**：HLS + AES-128 加密，支援 ABR（1080p/720p）
- 🔄 **智慧轉碼**：最愛影片永久儲存，非最愛影片快取於 Ramdisk（LRU 策略）
- 🔄 **標籤系統**：namespace::value 格式，支援多標籤查詢與自動補全
- 🔄 **最愛功能**：管理員無限制，一般使用者有數量限制
- 🔄 **斷點續播**：自動記錄觀看進度
- ✅ **安全模式**：管理員可切換 SFW/NSFW，一般使用者永遠 SFW

### 第二階段（監控）
- ⏳ **Grafana 監控**：NAS/Desktop 資源、UPS 狀態、轉碼任務

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
- **modern-normalize** (CSS reset)

### 後端
- **Node.js 24.x LTS + TypeScript**
- **Apollo Server** (GraphQL API)
- **PostgreSQL 15** (資料庫)
- **Redis 7** (快取與 Session)
- **Bull Queue** (轉碼任務佇列)
- **FFmpeg** (影片轉碼)
- **Caddy 2** (反向代理，統一入口)

### 部署
- **Docker Compose** (服務編排)
- **Synology NAS DS420+** (主伺服器)
- **Ramdisk 6GB** (Redis + 影片快取)

---

## 快速開始

### 環境需求

#### 開發環境
- **Node.js 24.x LTS** (必須)
- **npm 10.x+**
- **Docker & Docker Compose**

#### NAS 部署環境
- **Synology DSM 7.x**
- **Docker 支援**
- **至少 10GB RAM**（含 Ramdisk）
- **Ramdisk 設定**（6GB）
- **SSH 存取權限**

### 1. 複製專案並安裝依賴

```bash
# 克隆專案
git clone <repository-url>
cd media-center

# 安裝根目錄依賴（ESLint + Prettier 共用配置）
npm install

# 安裝後端依賴
cd backend
npm install
npx prisma generate

# 安裝前端依賴
cd ../frontend
npm install

cd ..
```

### 2. 設定環境變數

```bash
# 複製環境變數範本
cp .env.default .env
```

編輯 `.env` 並設定必要參數：

```bash
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database（開發環境可使用預設值）
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=media_center
POSTGRES_USER=media_user
POSTGRES_PASSWORD=your_strong_password_here

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT（必須修改為隨機字串，至少 32 字元）
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
JWT_EXPIRES_IN=7d

# Email (Gmail SMTP) - 必須設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_gmail_app_password  # 見下方說明

# Admin & Allowed Users（必須修改）
ADMIN_EMAIL=admin@example.com
ALLOWED_EMAILS=friend@example.com,family@example.com

# Media Sources（開發環境可暫時留空或使用測試路徑）
VIDEO_SOURCES=/volume1/media/videos,/volume1/downloads/movies
IMAGE_SOURCES=/volume1/media/images
ARTICLE_SOURCES=/volume1/media/articles

# Transcode & Cache Paths
TRANSCODED_PATH=/volume1/transcoded
CACHE_PATH=/ramdisk/cache
```

**如何取得 Gmail 應用程式密碼**：
1. 登入 Google 帳號
2. 前往「安全性」→「兩步驟驗證」（必須先啟用）
3. 搜尋「應用程式密碼」
4. 選擇「郵件」和「其他裝置」
5. 輸入名稱「Media Center」
6. 複製生成的 16 位密碼（格式：`xxxx xxxx xxxx xxxx`）
7. 貼到 `.env` 的 `SMTP_PASS`（移除空格）

### 3. 啟動開發環境

#### 方法一：使用 Docker Compose（推薦）

```bash
# 啟動所有服務（PostgreSQL + Redis + Backend + Frontend）
docker compose -f docker-compose.dev.yml up -d

# 查看日誌
docker compose -f docker-compose.dev.yml logs -f

# 初始化資料庫
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --name init
```

#### 方法二：本機開發

需要先啟動 PostgreSQL 和 Redis（使用 Docker 或本機安裝）。

**終端機 1 - 後端**：
```bash
cd backend
npm run dev  # 啟動 nodemon，支援熱重載
```

**終端機 2 - 前端**：
```bash
cd frontend
npm run dev  # 啟動 Vite dev server，支援 HMR
```

### 4. 訪問應用

- **前端**：http://localhost:5173
- **後端 GraphQL**：http://localhost:3000/graphql
- **Prisma Studio**（可選）：`cd backend && npx prisma studio`

### 5. 測試登入

1. 前往 http://localhost:5173
2. 輸入 `ADMIN_EMAIL` 設定的 Email
3. 檢查信箱收到的 6 位數 OTP
4. 輸入 OTP 完成登入

---

## 部署到 NAS（正式環境）

### 1. NAS 前置設定

#### 1.1 建立 Ramdisk（6GB）

透過 SSH 登入 NAS：

```bash
ssh admin@192.168.50.100
```

執行 Ramdisk 設定腳本：

```bash
# 建立 ramdisk 目錄
sudo mkdir -p /ramdisk

# 掛載 6GB ramdisk
sudo mount -t tmpfs -o size=6G tmpfs /ramdisk

# 建立子目錄
sudo mkdir -p /ramdisk/cache /ramdisk/redis /ramdisk/temp
sudo chmod 777 /ramdisk/cache /ramdisk/temp

# 設定開機自動掛載
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

#### 1.2 建立媒體目錄

```bash
# 建立轉碼輸出目錄
sudo mkdir -p /volume1/transcoded

# 建立媒體來源目錄（根據你的需求）
sudo mkdir -p /volume1/media/videos
sudo mkdir -p /volume1/media/images
sudo mkdir -p /volume1/media/articles
```

### 2. 上傳專案到 NAS

從本機上傳：

```bash
# 使用 rsync 上傳專案（排除 node_modules）
rsync -avz --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  ./ admin@192.168.50.100:/volume1/docker/media-center/
```

### 3. 在 NAS 上啟動服務

SSH 登入 NAS，進入專案目錄：

```bash
ssh admin@192.168.50.100
cd /volume1/docker/media-center
```

設定環境變數並啟動：

```bash
# 複製並編輯環境變數
cp .env.default .env
vi .env  # 或使用 nano .env

# 建置並啟動所有服務
docker compose build
docker compose up -d

# 執行資料庫遷移
docker compose exec backend npm run migrate

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f backend
```

### 4. 使用 Synology Container Manager

本專案完全相容 Synology NAS 內建的 **Container Manager** 應用程式。

#### GUI 方式（適合初學者）

1. **開啟 Container Manager** → 選擇「專案」
2. **建立新專案**：
   - 專案名稱：`media-center`
   - 路徑：`/volume1/docker/media-center`
   - 來源：選擇「使用現有路徑」
3. **啟動專案**：點擊「建置」→「啟動」

#### CLI 方式（推薦，功能完整）

```bash
# Synology 使用 Docker Compose v2 語法
docker compose up -d

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f backend

# 重啟特定服務
docker compose restart backend
```

### 5. 驗證部署

訪問以下 URL：

- **前端**：http://192.168.50.100:8080
- **GraphQL Playground**：http://192.168.50.100:8080/graphql
- **健康檢查**：http://192.168.50.100:8080/health

---

## 開發指南

### 程式碼風格

專案使用共用的 ESLint + Prettier 配置：

```bash
# 檢查程式碼風格
npm run lint

# 自動修正
npm run lint:fix

# 格式化程式碼
npm run format

# 檢查格式
npm run format:check
```

### 修改 Prisma Schema 後

```bash
cd backend

# 建立新的遷移
npx prisma migrate dev --name your_migration_name

# 重新生成 Prisma Client
npx prisma generate
```

### 修改環境變數後

```bash
# Docker 環境
docker compose restart backend

# 本機環境
# 重新啟動 npm run dev
```

### 清理開發環境

```bash
# 停止所有容器
docker compose -f docker-compose.dev.yml down

# 停止並刪除資料卷（⚠️ 會刪除資料庫資料）
docker compose -f docker-compose.dev.yml down -v

# 清理 Docker images
docker compose -f docker-compose.dev.yml down --rmi all
```

---

## 專案結構

```
media-center/
├── README.md                    # 本檔案
├── CLAUDE.md                    # 開發指南（技術決策）
├── package.json                 # 根目錄（共用的 linter 配置）
├── .eslintrc.js                 # ESLint 配置（前後端共用）
├── .prettierrc.js               # Prettier 配置（前後端共用）
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
│   ├── Dockerfile
│   └── package.json
│
├── backend/                     # Node.js 後端
│   ├── src/
│   ├── prisma/                  # 資料庫 Schema
│   ├── Dockerfile
│   └── package.json
│
├── transcoder/                  # 轉碼服務
│   ├── src/
│   ├── Dockerfile
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

## 常見問題

### Q1：如何新增使用者？

編輯 `.env` 的 `ALLOWED_EMAILS`，加入新的 Email：
```bash
ALLOWED_EMAILS=user1@example.com,user2@example.com,newuser@example.com
```

重啟後端服務：
```bash
docker compose restart backend
```

### Q2：收不到 OTP Email 怎麼辦？

1. 確認 Gmail 應用程式密碼正確
2. 確認 Gmail 帳號已啟用「兩步驟驗證」
3. 檢查後端日誌：
   ```bash
   docker compose logs backend | grep SMTP
   ```

### Q3：Ramdisk 重開機後消失怎麼辦？

確認 `/usr/local/etc/rc.d/ramdisk.sh` 已建立且有執行權限：
```bash
ls -l /usr/local/etc/rc.d/ramdisk.sh
# 應該顯示 -rwxr-xr-x
```

手動執行：
```bash
sudo /usr/local/etc/rc.d/ramdisk.sh
```

### Q4：如何清理 Ramdisk 快取？

```bash
# 查看快取使用情況
du -sh /ramdisk/cache

# 清理所有快取
rm -rf /ramdisk/cache/*
```

### Q5：Prisma 遷移失敗怎麼辦？

重置資料庫（⚠️ 會刪除所有資料）：
```bash
docker compose exec backend npx prisma migrate reset
```

### Q6：前端無法連接後端？

1. 確認後端已啟動：`docker compose ps`
2. 確認 CORS 設定：檢查 `.env` 中的 `CORS_ORIGINS`
3. 檢查前端環境變數：確認 `VITE_API_URL` 指向正確的後端 URL

---

## 文件導覽

- **[SPECIFICATION.md](docs/SPECIFICATION.md)** - 完整功能規格、系統需求、開發階段
- **[DATABASE.md](docs/DATABASE.md)** - 資料庫設計、ER diagram、索引策略
- **[API.md](docs/API.md)** - GraphQL API 定義、使用範例、權限說明
- **[CLAUDE.md](CLAUDE.md)** - 技術決策、架構設計、開發流程

---

## 下一步

### 高優先級
1. **前端整合 GraphQL**：在 Login/OTP 頁面呼叫實際的 API
2. **實作 Media Resolvers**：影片查詢、列表、搜尋功能
3. **影片播放器**：整合 hls.js 播放器
4. **媒體掃描功能**：實作掃描 NAS 上的影片檔案

### 中優先級
5. **轉碼服務**：實作 FFmpeg + Bull Queue 轉碼系統
6. **標籤管理**：實作標籤的建立、編輯、刪除功能
7. **最愛功能**：實作加入/移除最愛

### 低優先級
8. **觀看進度**：實作斷點續播
9. **安全模式切換**：前端 UI 實作
10. **Grafana 監控**：系統監控 Dashboard

---

## 授權

私人專案，僅供個人與家人使用。

---

## 致謝

- **Claude Sonnet 4.5** - 協助規劃與文件撰寫
- **Ant Design** - UI 元件庫
- **hls.js** - HLS 播放器
- **FFmpeg** - 影片轉碼引擎
- **Caddy** - 現代化反向代理
