# Claude Code 開發指南

## 專案概述

私人媒體中心系統，管理和播放影片、圖片、文章，整合 AI 翻譯和 ComfyUI 創作工具。

---

## 關鍵技術決策

### 網路架構：Cloudflare Tunnel
**選擇**：Cloudflare Tunnel（而非直接開放 Router Port）

**原因**：
- 不需要開放任何 Router Port（最安全）
- 隱藏 NAS 真實 IP
- 免費 DDoS 防護
- Cloudflare 提供 SSL（不需要 Let's Encrypt）
- 零信任架構

---

### 反向代理：Caddy
**選擇**：Caddy（而非 nginx 或 APISIX）

**原因**：
- 配置極簡（適合個人專案）
- 與 Cloudflare Tunnel 完美整合
- 內建 HTTP/2, HTTP/3
- APISIX 對個人專案是 overkill

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
- **最愛影片**：完整轉碼並永久儲存於 `/volume1/transcoded/`
- **非最愛影片**：按需轉碼，存於 Ramdisk，LRU 策略
- **ABR 版本**：1080p (5Mbps) + 720p (3Mbps)
- **Segment Duration**：2-4 秒（優化首幀）

---

## 環境設定

### NAS
- **型號**：Synology DS420+
- **記憶體**：10GB 總計
  - Ramdisk: 6GB (60%)
  - 系統 + Docker: 4GB (40%)
- **路徑**：`/volume1/media/`（按類型分類）

### Ramdisk 分配（6GB）
- Redis: 500MB
- 影片快取: 4GB（約 40-80 部）
- InfluxDB WAL: 1GB
- 臨時檔案: 500MB

### Desktop
- **環境**：Windows + RTX 2080Ti + WSL2 + Docker
- **用途**：ComfyUI、AI 翻譯（GPU 加速）

---

## 開發優先級

1. **第一階段**：基礎架構 + 影片播放
   - Cloudflare Tunnel 設定
   - Email OTP 登入
   - 影片上傳、播放、標籤管理
   - 最愛功能

2. **第二階段**：WebAuthn + 圖片功能

3. **第三階段**：文章功能

4. **第四階段**：ComfyUI 整合

5. **第五階段**：Grafana 監控

---

## 重要提醒

### 安全性
- Cloudflare Tunnel：不開放任何 Router Port
- Email OTP：使用 Gmail SMTP
- HLS 加密：AES-128

### 效能
- 首幀顯示：< 3 秒
- 同時串流：3-5 個
- Ramdisk：6GB，需監控記憶體使用

### 備份
- 資料庫：每日自動備份
- 媒體檔案：重要內容手動備份
- 設定檔：Git 版本控制
