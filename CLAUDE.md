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

#### 非最愛影片（即時轉碼）
- **策略**：用戶點擊播放時，立即啟動 FFmpeg 邊轉碼邊播放
- **首幀時間**：2-4 秒（第一個 segment 轉碼完成）
- **快取位置**：Ramdisk（LRU 策略清理）
- **流程**：
  ```
  用戶點擊播放 → 檢查 Ramdisk 快取
                 ├─ 有快取 → 直接播放
                 └─ 沒快取 → 啟動 FFmpeg → 邊轉邊播
  ```

#### FFmpeg 即時轉碼參數
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  -hls_time 4 \              # segment 長度 4 秒
  -hls_list_size 0 \         # 保留所有 segments
  -hls_flags split_by_time \ # 按時間切割
  -start_number 0 \
  /ramdisk/video_id/output.m3u8
```

**關鍵參數**：
- `-preset fast`：平衡速度與品質（DS420+ 可達 1x 速度）
- `-hls_time 4`：4 秒 segment（首幀 2-4 秒）
- 即寫即播：每完成一個 segment，hls.js 立即載入

#### 效能預估（DS420+）
| 轉碼場景 | 速度 | 播放體驗 |
|----------|------|----------|
| 1080p → 720p | 0.8-1.5x | 流暢（平均 1x） |
| 720p → 480p | 1.5-2x | 非常流暢 |
| 4K → 1080p | 0.3-0.8x | 可能卡頓 |

#### 實作注意事項
1. **轉碼佇列**：使用 Bull Queue 管理，限制同時轉碼 1-2 個
2. **進度顯示**：前端顯示已轉碼進度（綠色）vs 未轉碼（灰色）
3. **快轉處理**：暫時不允許快轉到未轉碼部分，或優先轉該段
4. **錯誤處理**：轉碼失敗時降低解析度重試
5. **LRU 清理**：播放結束後保留於 Ramdisk，空間不足時清理

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

### 開發流程
1. 第一階段：區網內使用 Caddy + HTTP
2. 功能穩定後可選擇性上公網
3. 區網 → 公網升級時只需加 Cloudflare Tunnel
