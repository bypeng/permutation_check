# PTT TAR Final Mission - Permutation Check System

這是一個為 PTT TAR（實境解謎遊戲）的最終關卡設計的即時驗收與戰況轉播系統。它基於 Google Apps Script (GAS) 建立，並整合了 Google Sheets 作為資料庫以及 Line Bot 作為即時通知工具。

## 系統特色

- **即時驗收**：關主可以在網頁介面上輸入隊伍的木條排列順序，系統會自動計算 LIS (最長遞增子序列) 長度並判斷是否成功。
- **戰況直播**：提供一個公開的轉播頁面，所有觀眾可以即時看到各隊伍的最新進度、嘗試次數與排名。
- **歷史重播**：活動結束後，可以透過重播頁面回顧整個比賽過程。
- **後台管理**：大關主可以透過專屬後台，設定比賽模式（有密碼/無密碼）、開關 Line 推播、管理晉級隊伍名單。
- **Line Bot 整合**：關主驗收時，系統會自動將結果推播到指定的 Line 群組，方便所有工作人員掌握賽況。

---

## 檔案結構說明

```
├── Code.gs                   # 核心後端邏輯，所有 API 與 Line Webhook 的進入點
├── backend_setting.html      # 大關主後台頁面
├── live_dashboard.html         # 戰況直播台頁面 (有密碼版)
├── live_dashboard_wo_passwd.html # 戰況直播台頁面 (無密碼版)
├── permutation_check.html      # 關主驗收頁面 (有密碼版)
├── permutation_check_wo_passwd.html # 關主驗收頁面 (無密碼版)
├── replay_check.html         # 歷史重播頁面
├── generate_poems.py         # [資料生成] 用於從原始資料產生詩句 JSON 的腳本
├── generate_players.py       # [資料生成] 用於從原始資料產生參賽者 JSON 的腳本
└── build_gs_file.py          # [建構腳本] 將詩句與參賽者資料自動注入 Code.gs 範本中
```

---

## 系統設定與部署流程

請依照以下步驟完成系統的設定與部署。

### 零、前置準備

1.  一個 Google 帳號。
2.  一個 Line Developer 帳號。
3.  本地端已安裝 Python 環境 (用於執行資料生成腳本)。

### 步驟一：資料準備與建構

1.  **準備資料來源**：根據 `generate_poems.py` 和 `generate_players.py` 的需求，準備好詩句與參賽者的原始資料檔 (例如 CSV 或 Excel)。
2.  **生成資料**：執行這兩個 Python 腳本，產生 `poems.json` 和 `players.json`。
3.  **建立 `Code.gs` 範本**：將現有的 `Code.gs` 複製一份並命名為 `Code.gs.template`。接著，將 `POEM_CORRECT_DATA`、`POEM_CONFUSE_DATA` 和 `PLAYER_DATA` 三個陣列的內容清空，或用一個特殊的標記取代，例如：
    ```javascript
    const POEM_CORRECT_DATA = __POEM_CORRECT_DATA__;
    const POEM_CONFUSE_DATA = __POEM_CONFUSE_DATA__;
    const PLAYER_DATA = __PLAYER_DATA__;
    ```
4.  **自動建構**：執行 `build_gs_file.py` 腳本。此腳本會讀取 `poems.json` 和 `players.json`，然後將其內容填入 `Code.gs.template` 中，最終生成一份可以直接使用的 `Code.gs` 檔案。

    > **[!] 設計提示**：`build_gs_file.py` 的核心是讀取範本與 JSON 檔案，然後進行字串取代。一個健壯的腳本應包含：
    > 1.  **檔案讀取**：使用 `try...except` 處理 `FileNotFoundError`。
    > 2.  **JSON 解析**：處理 `json.JSONDecodeError`，以防 JSON 格式錯誤。
    > 3.  **字元編碼**：讀寫檔案時明確指定 `encoding='utf-8'`，並在 `json.dumps` 中使用 `ensure_ascii=False`，確保中文不會變成亂碼。
    > 4.  **字串取代**：將 `Code.gs.template` 中的 `'__PLACEHOLDER__'` 字串，取代為 `json.dumps` 產生的內容。

### 步驟二：Google Apps Script 專案設定

1.  前往 Google Apps Script，建立一個新專案。
2.  將上一步驟中生成的 `Code.gs` 內容，以及所有 `.html` 檔案的內容，分別複製貼上到 GAS 編輯器中對應的檔案裡。

### 步驟三：Google Sheets 設定

1.  前往 Google Sheets，建立一份**全新的空白試算表**。
2.  複製這份試算表的 ID (網址中 `/d/` 和 `/edit` 之間的那長串亂碼)。
3.  將此 ID 貼到 `Code.gs` 的 `LIVE_SPREADSHEET_ID` 常數中。
    > **注意**：你不需要手動建立 `LiveStatus` 或 `SubmitRecord` 工作表，當關主第一次送出驗收時，系統會自動建立它們。

### 步驟四：Line Developer Console 設定

1.  前往 Line Developer Console。
2.  建立一個新的 `Provider` (或使用現有的)。
3.  建立一個新的 `Channel`，類型選擇 **Messaging API**。
4.  在 Channel 的 "Messaging API" 分頁中，找到並發行一個 **Channel access token (long-lived)**。
5.  將此 Token 複製並貼到 `Code.gs` 的 `LINE_CHANNEL_ACCESS_TOKEN` 常數中。

### 步驟五：密碼設定與首次部署

1.  在 `Code.gs` 中，設定你的 `ADMIN_PASSWORD` (後台密碼) 和 `SECRET_PASSWORD` (關卡密碼)。
2.  在 GAS 編輯器右上角，點擊「**部署**」>「**新增部署作業**」。
3.  類型選擇「**網頁應用程式**」。
4.  在「誰可以存取」的選項中，選擇「**任何人**」。
5.  點擊「**部署**」。此時 GAS 會要求你授權指令碼存取你的 Google 帳號資料 (如試算表)，請務必同意所有權限。
6.  部署成功後，**複製「網頁應用程式」的網址**，這個網址非常重要。

### 步驟六：Line Bot 設定與大關主綁定

1.  回到 Line Developer Console，在你的 Channel 的 "Messaging API" 分頁中，找到 `Webhook URL`，點擊 "Edit"。
2.  將上一步複製的 GAS 網頁應用程式網址貼上，並點擊 "Update"。
3.  啟用 `Use webhook`。
4.  建立一個 Line 群組，僅包含所有大關主（百片、紅椰、文鈞等）。
5.  將你的 Line Bot 邀請至此群組。
6.  請每位大關主在群組中發言 `/取得我的UserID`。Bot 會回覆每個人的 User ID。
7.  將收集到的 User ID 填入 `Code.gs` 的 `ADMIN_DATA` 陣列中。
8.  **重新部署**：回到 GAS 編輯器，點擊「**部署**」>「**管理部署作業**」，選擇目前的部署版本，點擊鉛筆圖示編輯，版本選擇「**新版本**」，然後再次點擊「**部署**」。

### 步驟七：綁定群組並上線！

1.  由任一位已加入 `ADMIN_DATA` 的大關主，在**步驟六所建立的 Line 群組**中發言 `/取得GroupID然後綁定`。
2.  Bot 若回覆「✅ ...已經綁定群組成功！」，代表系統已與此群組連動。
3.  大功告成！現在你可以開始使用各個系統介面了。

---

## 系統介面入口

假設你的網頁應用程式網址為 `https://script.google.com/macros/s/XXXX/exec`

- **關主驗收頁面**: `https://.../exec?p=check`
- **戰況直播台**: `https://.../exec?p=live`
- **大關主後台**: `https://.../exec?p=admin`
- **歷史重播頁面**: `https://.../exec` (無參數)

---

## 開發者工具

- **測試 Line 推播**：在 GAS 編輯器中，可以直接執行 `testLineToken` 函式。它會向 `ADMIN_DATA` 陣列中的第一位大關主發送一則測試訊息，可用於快速驗證 Token 和權限是否設定正確。