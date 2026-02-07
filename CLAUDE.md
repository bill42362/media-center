# Claude Code 開發指南

## 專案概述

本專案為私人媒體中心系統，用於管理和播放影片、圖片、文章等多媒體內容。

## 關鍵技術決策

### 網域與 SSL
- **網域**：`media.bill42362.net`（AWS Route53 管理）
- **SSL 管理**：Let's Encrypt（Caddy 自動處理）
- **原因**：AWS Certificate Manager 僅能用於 AWS 服務，無法匯出給自建 NAS 使用

### 反向代理：Caddy
- **選擇**：Caddy（而非 nginx 或 APISIX）
- **原因**：
  - 自動處理 Let's Encrypt 申請和續期（零設定）
  - 配置極簡（Caddyfile 幾行搞定）
  - 內建 HTTP/2, HTTP/3 支援
  - 適合個人專案，APISIX 對此需求是 overkill

### 影片播放器：hls.js
- **選擇**：hls.js（而非 video.js）
- **原因**：
  - 輕量（~200KB vs ~500KB+）
  - 專注於 HLS，效能更好
  - 社群更活躍（video-dev）
  - 完全控制，易於客製化
- **首幀優化**：
  - ❌ 不使用 LL-HLS（僅用於直播降低延遲）
  - ✅ 使用 2-4 秒 segment duration（而非 6 秒）
  - ✅ FFmpeg faststart + GOP 對齊
  - ✅ 預期首幀顯示：2-3 秒

### 轉碼策略
- **最愛影片**：完整轉碼並永久儲存於 `/volume1/transcoded/`
- **非最愛影片**：按需轉碼，存於 ramdisk `/ramdisk/cache/`，LRU 策略保留 64 部
- **ABR 版本**：1080p (5Mbps) + 720p (3Mbps)
- **Segment Duration**：2-4 秒（優化首幀顯示速度）

### 環境設定
- **NAS**：Synology DS420+，路徑 `/volume1/media/`（按類型分類）
- **Ramdisk**：4GB（Redis + 非最愛影片快取）
- **Desktop**：Windows + RTX 2080Ti（同一區網）
- **網路**：Router Port Forwarding 80, 443 → NAS

### 開發優先級
1. **第一階段**：基礎架構 + 影片播放
   - Email OTP 登入（WebAuthn 延後）
   - 影片上傳、播放、標籤管理
   - 最愛功能
2. **第二階段**：WebAuthn + 圖片功能
3. **第三階段**：文章功能
4. **第四階段**：ComfyUI 整合
5. **第五階段**：Grafana 監控

## 程式碼風格
- TypeScript 嚴格模式
- ESLint + Prettier
- 功能模組化，避免過度抽象
- 優先使用現有 library，避免重造輪子

## 部署注意事項
- Router 需設定 port forwarding (80, 443)
- NAS 需先建立 4GB ramdisk
- Gmail 需產生應用程式密碼（用於 OTP）
- 首次部署需執行媒體檔案掃描腳本
