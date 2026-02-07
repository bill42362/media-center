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
- **最愛影片**：完整轉碼並永久儲存於 `/volume1/transcoded/`
- **非最愛影片**：按需轉碼，存於 Ramdisk，LRU 策略
- **ABR 版本**：1080p (5Mbps) + 720p (3Mbps)
- **Segment Duration**：2-4 秒（優化首幀）

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
- **路徑**：`/volume1/media/`（按類型分類）

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

2. **第二階段**：WebAuthn + 圖片功能

3. **第三階段**：文章功能

4. **第四階段**：ComfyUI 整合

5. **第五階段**：Grafana 監控

6. **第六階段**：公網訪問（可選）
   - Cloudflare Tunnel 設定
   - Caddy 啟用 HTTPS
   - DNS 設定

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
- 首幀顯示：< 3 秒
- 同時串流：3-5 個
- Ramdisk：6GB，需監控記憶體使用

### 備份
- 資料庫：每日自動備份
- 媒體檔案：重要內容手動備份
- 設定檔：Git 版本控制

### 開發流程
1. 第一階段：區網內使用 Caddy + HTTP
2. 功能穩定後可選擇性上公網
3. 區網 → 公網升級時只需加 Cloudflare Tunnel
