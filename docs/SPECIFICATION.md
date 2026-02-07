# Media Center 系統規格書

## 目錄
1. [系統概述](#系統概述)
2. [硬體環境](#硬體環境)
3. [功能模組](#功能模組)
4. [技術架構](#技術架構)
5. [安全性與備份](#安全性與備份)
6. [效能要求](#效能要求)

---

## 系統概述

本系統為私人媒體中心，提供影片、圖片、文章的管理、瀏覽、播放功能，並整合 AI 翻譯、ComfyUI 創作工具、Grafana 監控等功能。

**核心特色**：
- 支援多重標籤系統，方便分類和搜尋
- 安全模式切換（SFW/NSFW 內容分離）
- 影片 HLS 加密串流，保護內容安全
- AI 輔助翻譯（圖片漫畫、文章簡繁轉換）
- 整合 ComfyUI 用於 AI 圖片創作

**內容規模**：
- 影片：約 3000 部
- 圖片：約 30000 張
- 文章：約 500 篇

---

## 硬體環境

### 主要設備
- **NAS**: Synology DS420+
  - 用途：主要伺服器、資料庫、媒體儲存
  - 路徑：`/volume1/media/`（按類型分類：videos/, images/, articles/）
- **Desktop**: Windows, GPU: Nvidia 2080Ti
  - 用途：ComfyUI 伺服器、AI 翻譯伺服器
  - 位置：與 NAS 同一區域網路
- **Router**: ASUS RT-AX56U, Firmware: ASUS Merlin 3004.388.6_2
  - 用途：Port Forwarding, 網路管理
- **UPS**: APC Back-UPS NS 650M1
  - 用途：停電保護，狀態監控

### 網域與 SSL
- **網域**：`media.bill42362.net`（AWS Route53 管理）
- **SSL**：Let's Encrypt（透過 Caddy 自動管理）
- **網路架構**：
  ```
  Internet → Router (Port 80, 443) → NAS (Caddy) → Backend Services
  ```

---

## 功能模組

### 3.1 認證與授權

#### Email OTP 登入
- 使用者輸入 Email，系統發送 6 位數 OTP
- OTP 有效期限：10 分鐘
- 使用 Gmail SMTP 發送郵件
- 登入後建立 Session (JWT + Cookie)
- 未登入使用者無法觀看任何內容

#### 安全模式
- **安全模式 (SFW)**：只顯示標籤為 `mode::SFW` 的內容
- **非安全模式**：顯示所有內容
- 切換至非安全模式需要：
  - 再次 Email OTP 驗證，或
  - WebAuthn 驗證（第二階段實作）
- 使用者可設定預設為安全模式

#### [延伸功能] WebAuthn
- 支援平台認證器（Touch ID, Face ID, Windows Hello）
- 用於快速解鎖非安全模式
- 第二階段實作

---

### 3.2 多媒體瀏覽器

#### 標籤系統
所有內容都支援多重標籤，標籤格式採用 `namespace::value` 結構：

**標籤範例**：
- `author::手塚治虫`
- `director::Ang Lee`
- `language::繁體中文`
- `origin::PixivFanbox`
- `mode::SFW`, `mode::NSFW`
- `category::動作`, `category::劇情`
- `ai-translated::true`（AI 翻譯內容）

**標籤功能**：
- 支援透過標籤搜尋、排序、分類
- 支援修改、新增、刪除所有內容的標籤
- 支援多標籤組合查詢（AND / OR）
- 標籤自動補全建議

---

#### 3.2.1 影片功能

**播放功能**：
- 使用 hls.js 播放 HLS 串流
- 支援 AES-128 加密保護
- 鍵盤快捷鍵：
  - 左右鍵：快轉/倒退 10 秒
  - 上下鍵：快轉/倒退 60 秒
  - `l` 鍵：AB-loop 功能
  - `cmd/ctrl + 上下鍵`：切換同標籤的上一部/下一部影片
- 預設單檔循環播放
- 記錄觀看進度（下次從斷點繼續）

**上傳功能**：
- 支援拖拽上傳或選擇檔案
- 支援的格式：mp4, mkv, avi, mov, webm
- 單檔大小上限：10GB
- 上傳時可設定標籤
- 上傳後自動觸發轉碼（加入佇列）
- 顯示上傳進度和轉碼狀態

**最愛功能**：
- 支援加入/移除最愛
- 加入最愛時：
  - 完整轉碼 1080p + 720p ABR 版本
  - 永久儲存於 `/volume1/transcoded/`
- 移除最愛時：
  - 保留已轉碼檔案（可設定是否刪除）
- 最愛列表獨立顯示

**轉碼策略**：
- 最愛影片：完整轉碼並永久保存
- 非最愛影片：按需轉碼，存於 ramdisk，LRU 快取最近 64 部
- 轉碼參數：
  - ABR：1080p (5Mbps) + 720p (3Mbps)
  - Segment Duration：2-4 秒（優化首幀顯示）
  - GOP：2 秒
  - FFmpeg Preset：medium

---

#### 3.2.2 圖片功能

**瀏覽功能**：
- 檔案類型：單張圖片 或 多張連續漫畫
- 鍵盤快捷鍵：
  - 左右鍵：上一張/下一張圖片（或漫畫的上一頁/下一頁）
  - `cmd/ctrl + 上下鍵`：切換同標籤的上一個/下一個作品
- 支援縮放、全螢幕檢視
- 漫畫模式支援連續捲動或分頁模式

**上傳功能**：
- 支援拖拽上傳或選擇檔案
- 支援的格式：jpg, png, gif, webp
- 單檔大小上限：20MB
- 批次上傳（一次選擇多張圖片）
- 上傳時可設定標籤
- 上傳時可指定是否為連續漫畫（同一作品）
- 自動生成縮圖

**AI 翻譯功能**：
- 一鍵將正在觀看的漫畫圖片翻譯為繁體中文
- 翻譯後存成新檔案（不覆蓋原檔）
- 複製所有原標籤，並加上：
  - `language::繁體中文`
  - `ai-translated::manga-image-translator`
- 翻譯伺服器參考：https://github.com/zyddnys/manga-image-translator
- 翻譯伺服器跑在 Desktop (2080Ti) 上
- 可透過 .env 切換 AI 模型

---

#### 3.2.3 文章功能

**閱讀功能**：
- 支援 Markdown 渲染
- 支援程式碼高亮
- 支援目錄導航
- 書籤功能：
  - 可針對單行設定跳轉書籤
  - 書籤列表快速跳轉
  - 書籤可命名和排序

**上傳與編輯功能**：
- **上傳**：
  - 支援上傳 .txt, .md 檔案
  - 單檔大小上限：5MB
  - 上傳時可設定標籤
- **編輯**：
  - 簡易的 Markdown 編輯器
  - 即時預覽
  - 支援插入圖片（從圖片庫選擇或上傳）
  - 支援儲存為新版本（保留編輯歷史）
  - 自動儲存草稿

**簡繁轉換功能**：
- 一鍵將簡體中文文章轉換為繁體中文
- 轉換時透過 AI 補全用字，合理選擇：
  - `發/髮`（頭髮 vs 發生）
  - `乾/幹/干`（乾燥 vs 幹活 vs 干涉）
  - `后/後`（皇后 vs 之後）
  - 等常見多音多義字
- 轉換後存成新檔案（不覆蓋原檔）
- 複製所有原標籤，並加上：
  - `language::繁體中文`
  - `ai-converted::true`
- 轉換伺服器可透過 .env 切換 AI 模型

---

### 3.3 ComfyUI 介面

**功能**：
- 安全模式下不顯示非安全模式的 workflow 和圖片
- 透過網頁上傳模型、Lora、ControlNet 等
- 上傳的模型儲存在 Desktop D 槽
- 產出的圖片和影片：
  - 自動同步到多媒體瀏覽器
  - 自動加上標籤：`origin::ComfyUI`, `ai-generated::true`
  - 可手動補充其他標籤

**架構**：
- ComfyUI 伺服器跑在 Desktop (Windows, 2080Ti)
- 透過 docker-compose 建立（或 WSL2）
- 支援方便的版本更新

---

### 3.4 Grafana 資源監控面板

**監控項目**：
1. **Desktop 資源監控**：
   - CPU 溫度、使用率
   - GPU 負載、溫度、記憶體使用
   - RAM、硬碟使用情況
   - 選擇適合的 Dashboard 範本

2. **UPS 狀態監控**：
   - 參考：https://grafana.com/grafana/dashboards/20846-nut-ups-telegraf/
   - 電池電量、負載
   - 輸入/輸出電壓
   - 預估可用時間

**架構**：
- 系統：Telegraf + InfluxDB + Grafana
- 伺服器跑在 NAS 上（docker-compose）
- 資料庫使用 ramdisk 保護硬碟

---

## 技術架構

### 通用原則
- 所有伺服器都支援 HTTPS
- 極大化使用 docker-compose 實作 Infra as Code
- 跑在 NAS 上的服務合理使用 ramdisk 保護硬碟

### 前端架構
- **框架**：React Router v7（data mode）
  - 建置為純 client side render (CSR) 網頁
- **UI 套件**：Ant Design 5.x
  - 極大化減少需要撰寫的 CSS 程式碼
- **狀態管理**：Redux Toolkit
- **影片播放器**：hls.js（輕量、專注 HLS）
- **API 通訊**：GraphQL (Apollo Client)
- **程式語言**：TypeScript

### 後端架構

#### 核心服務（NAS）
- **語言**：Node.js + TypeScript
- **框架**：Express + Apollo Server (GraphQL)
- **資料庫**：PostgreSQL
  - ORM：Prisma
  - 資料模型：User, Session, Media, Tag, Favorite
- **快取**：Redis
  - Session 管理
  - GraphQL query 快取
  - HLS 加密金鑰暫存
- **反向代理**：Caddy
  - 自動處理 Let's Encrypt SSL
  - 路由前端靜態檔案
  - 反向代理 GraphQL API 和 HLS 串流
- **環境變數**：
  - 所有設定（NUT Server Port, Media folder name 等）存於 `.env`
  - 建立 `.env.default` 範本上傳 GitHub

#### 影片轉碼服務（NAS）
- **工具**：FFmpeg
- **佇列管理**：Bull (Redis-based queue)
- **轉碼參數**：
  - Faststart：`-movflags +faststart`
  - ABR：1080p (5Mbps) + 720p (3Mbps)
  - GOP：2 秒（`-g 48` for 24fps）
  - Segment Duration：2-4 秒
- **HLS 加密**：
  - AES-128 加密
  - 解密金鑰透過登入 cookie 驗證取得
  - 金鑰儲存在 Redis，定期輪換

#### 儲存策略
- **原始媒體**：`/volume1/media/`（按類型分類）
- **最愛影片轉碼**：`/volume1/transcoded/`（永久保存）
- **非最愛影片快取**：`/ramdisk/cache/`（LRU, 最多 64 部）
- **Ramdisk 大小**：4GB
  - Redis：~500MB
  - 非最愛快取：~3.5GB
  - 臨時檔案：剩餘空間

### ComfyUI 伺服器（Desktop）
- 跑在 Desktop (Windows, 2080Ti)
- 透過 docker-compose 或 WSL2 建立
- 模型儲存在 D 槽
- 方便更新 ComfyUI 版本

### Grafana 伺服器（NAS）
- 系統：Telegraf + InfluxDB + Grafana
- 透過 docker-compose 建立
- 資料庫使用 ramdisk

---

## 安全性與備份

### 安全性措施
- **認證**：Email OTP + Session Cookie
- **授權**：JWT token 驗證
- **加密**：
  - HTTPS (Let's Encrypt)
  - HLS AES-128 加密
- **CORS**：限制允許的來源
- **Rate Limiting**：防止暴力破解 OTP
- **檔案上傳限制**：
  - 檔案類型白名單
  - 大小限制（影片 10GB, 圖片 20MB, 文章 5MB）
  - 病毒掃描（ClamAV，可選）

### 備份策略
- **資料庫**：
  - 每日自動備份 PostgreSQL
  - 保留最近 7 天備份
  - 備份儲存於 NAS 不同 volume
- **媒體檔案**：
  - 原始檔案視為主要來源（不自動備份）
  - 重要內容手動備份至外接硬碟
- **設定檔**：
  - Docker compose, .env.default 版本控制（Git）
  - 定期匯出 Grafana dashboard 設定

---

## 效能要求

### 影片播放
- **首幀顯示時間**：< 3 秒
- **串流品質**：支援 ABR 自動切換
- **同時觀看**：支援 3-5 個同時串流

### 轉碼效能
- **即時轉碼**：1 部影片同時轉碼，佇列處理
- **背景轉碼**：最愛影片加入佇列，非阻塞

### 資料庫查詢
- **列表查詢**：< 500ms（含標籤篩選）
- **搜尋查詢**：< 1s（全文搜尋）

### Ramdisk 使用
- **大小**：4GB
- **用途**：Redis + 非最愛影片快取
- **清理策略**：LRU，保留最近 64 部
- **重啟行為**：ramdisk 內容清空，Redis 從持久化恢復

---

## 開發路線圖

### 第一階段：基礎架構 + 影片功能
- [ ] 專案初始化（前後端、Docker、資料庫）
- [ ] Email OTP 登入
- [ ] 影片上傳功能
- [ ] 影片播放（hls.js + HLS + AES-128）
- [ ] 標籤系統與搜尋
- [ ] 最愛功能與轉碼策略
- [ ] Caddy 反向代理 + Let's Encrypt

### 第二階段：WebAuthn + 圖片功能
- [ ] WebAuthn 認證（解鎖非安全模式）
- [ ] 圖片上傳與瀏覽
- [ ] 漫畫模式
- [ ] AI 翻譯整合（manga-image-translator）

### 第三階段：文章功能
- [ ] 文章上傳與閱讀
- [ ] Markdown 編輯器
- [ ] 書籤系統
- [ ] 簡繁轉換 + AI 用字補全

### 第四階段：ComfyUI 整合
- [ ] ComfyUI 伺服器建置（Desktop）
- [ ] 模型上傳功能
- [ ] 產出內容同步到媒體庫

### 第五階段：Grafana 監控
- [ ] Telegraf + InfluxDB + Grafana 建置
- [ ] Desktop 資源監控
- [ ] UPS 監控整合
