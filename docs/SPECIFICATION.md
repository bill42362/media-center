# Media Center 系統規格書

## 目錄
1. [系統概述](#系統概述)
2. [硬體環境](#硬體環境)
3. [功能需求](#功能需求)
4. [技術選型](#技術選型)
5. [安全性要求](#安全性要求)
6. [效能要求](#效能要求)
7. [開發階段](#開發階段)

---

## 系統概述

本系統為私人媒體中心，提供影片、圖片、文章的管理、瀏覽、播放功能，並整合 AI 翻譯、ComfyUI 創作工具、Grafana 監控等功能。

### 核心特色
- 🏷️ 多重標籤系統（namespace::value 格式）
- 🔒 安全模式切換（SFW/NSFW 內容分離）
- 🎬 影片加密串流
- 🤖 AI 輔助翻譯（圖片漫畫、文章簡繁轉換）
- 🎨 整合 ComfyUI 用於 AI 圖片創作
- 📊 系統監控（Desktop 資源 + UPS 狀態）

### 內容規模
- **影片**：約 3000 部
- **圖片**：約 30000 張
- **文章**：約 500 篇

---

## 硬體環境

### 主要設備

| 設備 | 規格 | 用途 |
|------|------|------|
| **NAS** | Synology DS420+<br>RAM: 10GB | 主要伺服器、資料庫、媒體儲存 |
| **Desktop** | Windows<br>GPU: RTX 2080Ti<br>WSL2 + Docker | ComfyUI 伺服器、AI 翻譯伺服器 |
| **Router** | ASUS RT-AX56U<br>Firmware: Merlin 3004.388.6_2 | 網路管理 |
| **UPS** | APC Back-UPS NS 650M1 | 停電保護、狀態監控 |

### 網路架構
- **網域**：`media.bill42362.net`（AWS Route53 管理）
- **SSL**：Cloudflare Universal SSL
- **安全連線**：採用 Cloudflare Tunnel（零信任架構）
  - 不需要開放任何 Router Port
  - 隱藏 NAS 真實 IP
  - 免費 DDoS 防護

### 儲存規劃
- **媒體檔案**：`/volume1/media/`（按類型分類：videos/, images/, articles/）
- **轉碼結果**：
  - 最愛影片：永久儲存於 HDD
  - 非最愛影片：快取於 Ramdisk (6GB)
- **Ramdisk 用途**：
  - Session 和快取資料
  - 非最愛影片 HLS 切片（約可快取 40-80 部）
  - 資料庫寫入緩衝（Grafana 時間序列資料）

---

## 功能需求

### 1. 認證與授權

#### Email OTP 登入
- 使用者輸入 Email，系統發送 6 位數 OTP
- OTP 有效期限：10 分鐘
- 使用 Gmail SMTP 發送郵件
- 登入後建立 Session
- 未登入使用者無法觀看任何內容

#### 安全模式
- **安全模式 (SFW)**：只顯示 `mode::SFW` 標籤的內容
- **非安全模式**：顯示所有內容
- 切換至非安全模式需要再次 OTP 驗證或 WebAuthn

#### WebAuthn（第二階段）
- 支援平台認證器（Touch ID, Face ID, Windows Hello）
- 用於快速解鎖非安全模式

---

### 2. 標籤系統

所有內容都支援多重標籤，格式：`namespace::value`

**標籤範例**：
- `author::手塚治虫`
- `director::Ang Lee`
- `language::繁體中文`
- `origin::PixivFanbox`
- `mode::SFW`, `mode::NSFW`
- `category::動作`, `category::劇情`
- `ai-translated::true`（AI 翻譯內容）
- `ai-generated::true`（AI 生成內容）

**標籤功能**：
- 透過標籤搜尋、排序、分類
- 修改、新增、刪除標籤
- 多標籤組合查詢（AND / OR）
- 標籤自動補全建議

---

### 3. 影片功能

#### 播放功能
- 支援 HLS 串流播放
- AES-128 加密保護
- **鍵盤快捷鍵**：
  - 左右鍵：快轉/倒退 10 秒
  - 上下鍵：快轉/倒退 60 秒
  - `l` 鍵：AB-loop 功能
  - `cmd/ctrl + 上下鍵`：切換同標籤的上/下一部影片
- 預設單檔循環播放
- 記錄觀看進度（斷點續播）
- 首幀顯示目標：< 3 秒

#### 上傳功能
- 支援拖拽上傳或選擇檔案
- 支援格式：mp4, mkv, avi, mov, webm
- 單檔大小上限：10GB
- 上傳時可設定標籤
- 上傳後自動觸發轉碼（加入佇列）
- 顯示上傳進度和轉碼狀態

#### 最愛功能
- 加入最愛：
  - 完整轉碼多種解析度（ABR）
  - 永久儲存於 NAS
- 移除最愛：
  - 保留已轉碼檔案（可設定是否刪除）
- 最愛列表獨立顯示

#### 轉碼策略
- **最愛影片**：完整轉碼並永久保存
- **非最愛影片**：按需轉碼，快取於 Ramdisk，LRU 策略
- **解析度**：1080p + 720p（ABR 自動切換）
- **Segment Duration**：2-4 秒（優化首幀顯示）

---

### 4. 圖片功能

#### 瀏覽功能
- 支援單張圖片或多張連續漫畫
- **鍵盤快捷鍵**：
  - 左右鍵：上/下一張（或漫畫的上/下一頁）
  - `cmd/ctrl + 上下鍵`：切換同標籤的上/下一個作品
- 支援縮放、全螢幕檢視
- 漫畫模式支援連續捲動或分頁模式

#### 上傳功能
- 支援格式：jpg, png, gif, webp
- 單檔大小上限：20MB
- 批次上傳（一次多張）
- 上傳時可設定標籤
- 上傳時可指定是否為連續漫畫
- 自動生成縮圖

#### AI 翻譯功能（第二階段）
- 一鍵翻譯漫畫圖片為繁體中文
- 翻譯後存成新檔案（不覆蓋原檔）
- 複製原標籤並加上語言和 AI 翻譯標籤
- 翻譯伺服器跑在 Desktop (GPU 加速)
- 參考專案：manga-image-translator

---

### 5. 文章功能

#### 閱讀功能
- 支援 Markdown 渲染
- 支援程式碼高亮
- 支援目錄導航
- **書籤功能**：
  - 可針對單行設定跳轉書籤
  - 書籤列表快速跳轉
  - 書籤可命名和排序

#### 上傳與編輯功能
- **上傳**：
  - 支援 .txt, .md 檔案
  - 單檔大小上限：5MB
  - 上傳時可設定標籤
- **編輯**：
  - 簡易 Markdown 編輯器
  - 即時預覽
  - 支援插入圖片
  - 支援儲存為新版本（保留編輯歷史）
  - 自動儲存草稿

#### 簡繁轉換功能（第三階段）
- 一鍵將簡體中文轉換為繁體中文
- 透過 AI 補全用字（發/髮、乾/幹/干、后/後等）
- 轉換後存成新檔案
- 複製原標籤並加上語言和轉換標籤

---

### 6. ComfyUI 整合（第四階段）

- 安全模式下不顯示非安全模式的 workflow 和圖片
- 透過網頁上傳模型、Lora、ControlNet 等
- 上傳的模型儲存在 Desktop
- 產出的圖片和影片：
  - 自動同步到多媒體瀏覽器
  - 自動加上標籤：`origin::ComfyUI`, `ai-generated::true`
  - 可手動補充其他標籤
- 伺服器跑在 Desktop (GPU 加速)

---

### 7. Grafana 監控（第五階段）

#### 監控項目
1. **Desktop 資源監控**：
   - CPU 溫度、使用率
   - GPU 負載、溫度、記憶體使用
   - RAM、硬碟使用情況

2. **UPS 狀態監控**：
   - 電池電量、負載
   - 輸入/輸出電壓
   - 預估可用時間

#### 資料保留策略
- **原始資料**（10 秒採樣）：保留 30 天
- **10 分鐘聚合**：保留 1 年
- **1 小時聚合**：保留 5 年
- **預估儲存空間**：約 10GB

---

## 技術選型

### 前端技術
- **框架**：React Router v7（data mode, client-side render）
- **UI 套件**：Ant Design 5.x
- **狀態管理**：Redux Toolkit
- **影片播放器**：hls.js（輕量、專注 HLS）
- **API 通訊**：GraphQL (Apollo Client)
- **語言**：TypeScript

**選擇理由**：
- React Router v7 data mode：最新路由方案，CSR 適合私人應用
- Ant Design：減少 CSS 開發工作量
- hls.js：比 video.js 輕量 2.5 倍，專注 HLS 效能更好

---

### 後端技術

#### 核心服務（NAS）
- **語言**：Node.js + TypeScript
- **API**：GraphQL (Apollo Server)
- **資料庫**：PostgreSQL
- **快取**：Redis
- **反向代理**：Caddy
- **網路安全**：Cloudflare Tunnel

**選擇理由**：
- Caddy：配置極簡，與 Cloudflare Tunnel 完美整合
- Cloudflare Tunnel：零信任架構，不開放任何 port，最安全

#### 影片轉碼
- **工具**：FFmpeg
- **佇列管理**：Bull (Redis-based)
- **加密**：HLS AES-128

#### Desktop 服務（WSL2 + Docker）
- **ComfyUI**：GPU 加速
- **AI 翻譯**：manga-image-translator, GPU 加速

#### 監控系統（NAS）
- **架構**：Telegraf + InfluxDB + Grafana
- **優化**：WAL 寫入 Ramdisk，資料持久化到磁碟

---

## 安全性要求

### 網路層安全
- **Cloudflare Tunnel**：
  - 不開放任何 Router Port
  - 所有流量經過 Cloudflare CDN
  - 自動 DDoS 防護
  - 零信任架構

### 應用層安全
- **認證**：Email OTP + Session Cookie
- **授權**：JWT token 驗證
- **加密**：HTTPS + HLS AES-128
- **CORS**：限制允許的來源
- **Rate Limiting**：防止暴力破解和濫用
- **檔案上傳限制**：
  - 類型白名單（防止惡意檔案）
  - 大小限制（影片 10GB, 圖片 20MB, 文章 5MB）
  - 檔名過濾（防止路徑遍歷攻擊）

### 備份策略
- **資料庫**：每日自動備份，保留 7 天
- **媒體檔案**：原始檔案為主，重要內容手動備份至外接硬碟
- **設定檔**：版本控制（Git）

---

## 效能要求

### 影片播放
- **首幀顯示**：< 3 秒
- **串流品質**：支援 ABR 自動切換
- **同時觀看**：支援 3-5 個同時串流

### 資料查詢
- **列表查詢**：< 500ms（含標籤篩選）
- **搜尋查詢**：< 1s（全文搜尋）

### 轉碼效能
- **即時轉碼**：1 部影片同時轉碼，其他加入佇列
- **背景轉碼**：最愛影片自動轉碼，不影響使用者體驗

### 系統資源
- **Ramdisk**：6GB（NAS 總記憶體 10GB 的 60%）
  - Redis 快取：500MB
  - 影片快取：4GB（約 40-80 部）
  - 資料庫寫入緩衝：1GB
  - 臨時檔案：500MB
- **系統保留**：4GB（Synology DSM + Docker 容器）

---

## 開發階段

### 第一階段：基礎架構 + 影片功能（優先）

**環境準備**：
- NAS Ramdisk 設定（6GB）
- Cloudflare Tunnel 設定
- AWS Route53 DNS 設定
- Gmail App Password 生成

**核心功能**：
- Email OTP 登入
- Session 管理
- 安全模式切換
- 影片上傳
- 影片播放（HLS + AES-128）
- 轉碼服務（FFmpeg + 佇列）
- 最愛功能
- 標籤系統（CRUD + 搜尋）

**部署**：
- Caddy 反向代理
- Cloudflare Tunnel 啟動
- HTTPS 連線測試

---

### 第二階段：WebAuthn + 圖片功能

- WebAuthn 認證（解鎖非安全模式）
- 圖片上傳與瀏覽
- 漫畫模式（連續捲動/分頁）
- AI 翻譯整合（manga-image-translator）

---

### 第三階段：文章功能

- 文章上傳與閱讀
- Markdown 編輯器（即時預覽）
- 書籤系統
- 簡繁轉換 + AI 用字補全

---

### 第四階段：ComfyUI 整合

- ComfyUI 伺服器建置（Desktop WSL2）
- 模型上傳功能
- 產出內容同步到媒體庫

---

### 第五階段：Grafana 監控

- Telegraf + InfluxDB + Grafana 建置
- 資料降採樣設定（30天/1年/5年）
- Desktop 資源監控 Dashboard
- UPS 監控整合
- Dashboard 備份

---

## 附註

### 使用場景
- **個人使用**：簡化權限系統，無需複雜的多使用者管理
- **私人網路**：透過 Cloudflare Tunnel 安全訪問，無需 VPN

### 擴展性考量
- 影片數量可擴展到數萬部
- 標籤系統支援未來加入 AI 自動標籤
- 架構支援未來增加更多媒體類型
