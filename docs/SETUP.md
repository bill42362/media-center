# Media Center 部署指南

## 專案狀態

### ✅ 已完成

#### 基礎架構
- [x] 專案目錄結構
- [x] Docker Compose 配置（正式 + 開發環境）
- [x] Caddy 反向代理設定
- [x] 環境變數範本 (`.env.default`)

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
  - [x] 登入頁面（Email）
  - [x] OTP 驗證頁面
  - [x] 首頁
  - [x] 影片列表頁（骨架）
  - [x] 影片播放頁（骨架）
- [x] Layout 組件（Sidebar + Header）

### ⏳ 進行中

- [ ] Prisma 資料庫遷移（需執行）
- [ ] GraphQL Resolvers（Media, Tag, Favorites）
- [ ] 前端 GraphQL Mutations/Queries 整合
- [ ] 影片上傳與掃描功能
- [ ] 影片播放器（hls.js）
- [ ] 轉碼服務（FFmpeg + Bull Queue）

---

## 環境需求

### 開發環境
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

### NAS 部署環境
- Synology DSM 7.x
- Docker 支援
- 至少 10GB RAM（含 Ramdisk）
- Ramdisk 設定（6GB）

---

## 快速開始

### 1. 複製環境變數範本

```bash
cp .env.default .env
```

### 2. 修改 `.env` 檔案

**必須修改的變數**：
```bash
# Admin Email（您的管理員帳號）
ADMIN_EMAIL=your-email@gmail.com

# 允許的使用者 Email（逗號分隔）
ALLOWED_EMAILS=friend@gmail.com,family@gmail.com

# JWT Secret（請使用隨機字串）
JWT_SECRET=your-random-secret-key-change-me

# PostgreSQL 密碼
POSTGRES_PASSWORD=your-strong-password

# Gmail SMTP 設定（用於發送 OTP）
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password  # Gmail 應用程式密碼

# 媒體來源路徑（依實際路徑調整）
VIDEO_SOURCES=/volume1/media/videos,/volume1/downloads/movies
IMAGE_SOURCES=/volume1/media/images
ARTICLE_SOURCES=/volume1/media/articles
```

**如何取得 Gmail 應用程式密碼**：
1. 登入 Google 帳號
2. 前往「安全性」→「兩步驟驗證」（需先啟用）
3. 搜尋「應用程式密碼」
4. 選擇「其他」並輸入「Media Center」
5. 複製生成的 16 位密碼到 `SMTP_PASS`

### 3. 初始化專案

```bash
# 進入後端目錄，安裝依賴
cd backend
npm install

# 生成 Prisma Client
npx prisma generate

# 進入前端目錄，安裝依賴
cd ../frontend
npm install
```

### 4. 啟動開發環境

#### 方法一：使用 Docker Compose（推薦）

```bash
# 返回專案根目錄
cd ..

# 啟動所有服務（PostgreSQL + Redis + Backend + Frontend）
docker compose -f docker-compose.dev.yml up -d

# 查看日誌
docker compose -f docker-compose.dev.yml logs -f
```

#### 方法二：本機開發（需先啟動 PostgreSQL + Redis）

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

### 5. 初始化資料庫

```bash
# 執行 Prisma 遷移
cd backend
npx prisma migrate dev --name init

# （可選）開啟 Prisma Studio 檢視資料
npx prisma studio
```

### 6. 訪問應用

- **前端**：http://localhost:5173
- **後端 GraphQL**：http://localhost:3000/graphql
- **Prisma Studio**：http://localhost:5555

---

## 部署到 NAS（正式環境）

### 1. 設定 Ramdisk（僅需執行一次）

SSH 登入 NAS：
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
sudo cat > /usr/local/etc/rc.d/ramdisk.sh <<'EOF'
#!/bin/bash
mkdir -p /ramdisk
mount -t tmpfs -o size=6G tmpfs /ramdisk
mkdir -p /ramdisk/cache /ramdisk/redis /ramdisk/temp
chmod 777 /ramdisk/cache /ramdisk/temp
EOF

sudo chmod +x /usr/local/etc/rc.d/ramdisk.sh
```

驗證：
```bash
df -h | grep ramdisk
```

### 2. 上傳專案到 NAS

```bash
# 從本機上傳到 NAS（替換為您的路徑）
rsync -avz --exclude 'node_modules' \
  ./ admin@192.168.50.100:/volume1/docker/media-center/
```

### 3. 在 NAS 上啟動服務

SSH 登入 NAS，進入專案目錄：
```bash
cd /volume1/docker/media-center
```

建置並啟動：
```bash
# 建置 Docker images
docker compose build

# 啟動所有服務
docker compose up -d

# 執行資料庫遷移
docker compose exec backend npm run migrate

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f backend
```

### 4. 訪問應用

- **Media Center**：http://192.168.50.100:8080

---

## 常見問題

### Q1：如何新增允許的使用者？

編輯 `.env` 的 `ALLOWED_EMAILS`，加入新的 Email：
```bash
ALLOWED_EMAILS=user1@example.com,user2@example.com,newuser@example.com
```

重啟後端服務：
```bash
# Docker 環境
docker compose restart backend

# 本機環境
# 重新啟動 npm run dev
```

### Q2：收不到 OTP Email 怎麼辦？

1. 確認 Gmail 應用程式密碼正確
2. 確認 Gmail 帳號已啟用「兩步驟驗證」
3. 檢查後端日誌：
   ```bash
   docker compose logs backend | grep SMTP
   ```
4. 測試 SMTP 連線：
   ```bash
   docker compose exec backend node -e "
     const nodemailer = require('nodemailer');
     const transporter = nodemailer.createTransport({
       host: '${SMTP_HOST}',
       port: ${SMTP_PORT},
       auth: { user: '${SMTP_USER}', pass: '${SMTP_PASS}' }
     });
     transporter.verify().then(console.log).catch(console.error);
   "
   ```

### Q3：Prisma 遷移失敗怎麼辦？

重置資料庫（⚠️ 會刪除所有資料）：
```bash
docker compose exec backend npx prisma migrate reset
```

### Q4：前端無法連接後端？

1. 確認後端已啟動：`docker compose ps`
2. 確認 CORS 設定：檢查 `.env` 中的 `CORS_ORIGINS`
3. 檢查前端環境變數：確認 `VITE_API_URL` 指向正確的後端 URL

---

## 開發注意事項

### 修改 Prisma Schema 後

```bash
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
docker compose down

# 停止並刪除資料卷（⚠️ 會刪除資料庫資料）
docker compose down -v

# 清理 Docker images
docker compose down --rmi all
```

---

## 下一步

1. **完成 GraphQL Resolvers**：實作 Media, Tag, Favorites 的查詢和操作
2. **前端整合 GraphQL**：在 Login/OTP 頁面呼叫實際的 API
3. **媒體掃描功能**：實作掃描 NAS 上的影片檔案
4. **影片播放器**：整合 hls.js 播放器
5. **轉碼服務**：實作 FFmpeg + Bull Queue 轉碼系統
6. **標籤管理**：實作標籤的建立、編輯、刪除功能

---

## 相關文件

- [API 文件](./API.md) - GraphQL API 完整定義
- [資料庫設計](./DATABASE.md) - 資料庫 Schema 與索引策略
- [規格說明](./SPECIFICATION.md) - 專案功能與技術規格
- [開發指南](../CLAUDE.md) - 技術決策與開發原則
