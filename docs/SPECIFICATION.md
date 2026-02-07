# Media Server

## 硬體

* NAS: Synology DS420+
* Desktop: Windows, GPU: Nvidia 2080Ti
* Router: ASUS RT-AX56U, Firmware: ASUS Merlin 3004.388.6_2
* UPS: APC Back-UPS NS 650M1

## 網頁功能

* 支援 Email OTP 登入功能，已登入的使用者才能觀看內容
* 支援切換安全模式，意即只顯示 mode::SFW 標籤之內容
* 非安全模式需上鎖，意即要切換至非安全模式需要再次 OTP 驗證或是 WebAuthn
* [延伸功能] 支援 WebAuthn

### 多媒體瀏覽器

* 所有內容都要支援多重標籤，標籤的格式包含但不限於:
    * author::手塚治虫
    * director::Ang Lee
    * language:繁體中文
    * origin::PixivFanbox
    * mode::SFWork, mode::SFHome

* 要支援透過標籤來搜尋，排序，分類
* 要支援修改，增刪所有內容的標籤

#### 影片

* 支援用方向鍵快轉/倒退：左右鍵跳 10 秒，上下鍵跳 60 秒
* 預設單檔循環，支援快捷鍵 `l` 進行 AB-loop
* 支援 cmd+上下方向鍵 切換同標籤的下一則影片
* 支援 `加到最愛` 功能，加到最愛的效果後述
* 所有影片大約 3000 部左右
 
#### 圖片

* 檔案可能為單張圖片或是多張的連續漫畫
* 要能簡易的透過方向鍵瀏覽同標籤的下一張圖片，或者同一部漫畫的下一頁
* 要支援 AI 翻譯功能，一鍵將正在觀看的漫畫圖片翻譯後存成另一個檔案
* 翻譯之檔案將複製所有標籤再加上語言標籤和 AI 翻譯專屬標籤
* 翻譯機能參考 https://github.com/zyddnys/manga-image-translator 建立翻譯伺服器
* 翻譯伺服器要能透過 .env 切換 AI 模型
* 所有圖片約有 30000 張以上

#### 文章

* 要能針對單行設定跳轉書籤，書籤要方便使用
* 原檔可能為簡體中文，要支援一鍵轉換為繁體中文後存成另一檔案
* 轉換時可以透過 AI 翻譯補全用字，如合理的選擇 `發/髮`，`乾/幹/干`
* 轉換之檔案將複製所有標籤再加上語言標籤和 AI 翻譯專屬標籤
* 轉換伺服器要能透過 .env 切換 AI 模型
* 文章約有 500 篇以上

### ComfyUI 介面

* 安全模式下不能看到非安全模式的 workflow，圖片等
* 要能透過網頁上傳模型，Lora 等

### Grafana 資源監控面板

* 可以觀看 Desktop 的資源使用情況，如 CPU 溫度，GPU 負載紀錄等，幫我選擇合適的 dashboard
* 可以觀看 UPS 的狀態，具體參考 https://grafana.com/grafana/dashboards/20846-nut-ups-telegraf/

## 技術選型

* 所有伺服器都要支援 https
* 極大化的使用 docker-compose 來建所有伺服器，以達成 Infra as Code 實作
* 跑在 NAS 上的伺服器要合理的使用 ramdisk 來保護硬碟

### 前端架構

* 框架使用 React-Router v7 的 data mode，並且 build 成純 client side render 網頁
* 使用 ant.design 套件來切版，極大化減少需要撰寫的 CSS 程式碼
* 使用 Redux-Toolkit 來進行狀態管理
* 使用 GraphQL 來跟後端溝通

### 多媒體及使用者權限後端架構

* 設定資料，如 NUT Server Prot，Media folder name，等需要存在 .env 中
* 建立 .env.default 來丟上 GitHub
* 使用 Postgres 為主要資料庫
* 使用 GraphQL 為主要 api 介面，合理的使用 redis 快取
* 使用 node.js 為主要開發語言
* 伺服器和 DB 跑在 NAS 上的 docker 中，要善用 ramdisk 來保護硬碟
* 影片 (VOD) 要支援 AES-128 加密的 hls 串流，並且要透過登入的 cookie 來取得解密的 key
* 透過 ffmpeg 來支援 faststart，ABR，GOP 2 secs，並且使用合理的 bitrate，預設解析度 1080p
* 影片 `加到最愛` 時，將其轉碼進兵切片存於 NAS 中，未加入最愛之影片則只儲存近期觀看的 64 部之切片

### ComfyUI 伺服器

* 伺服器跑在 Desktop 上，並且極大化的使用 docker-compose 來建立
* 要能夠方便的更新 ComfyUI 版本
* 模型存在 Desktop 的 D 槽中
* 產出的圖片，影片要能在多媒體瀏覽器中觀看，並且自動加上合適的標籤

### Grafana 伺服器

* 伺服器跑在 NAS 上，並且極大化的使用 docker-compose 來建立
* 系統為 telegraf, influxdb, grafana
* 伺服器和 DB 跑在 NAS 上的 docker 中，要善用 ramdisk 來保護硬碟