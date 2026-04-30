# 專案追加計畫：決賽直播進度系統與 GAS 同步優化

## 1. 核心開發目標
- **即時通報**：將「驗收網頁 (關主端)」的排列狀態即時同步至 Google Sheets。
- **進度直播**：建立「直播網頁 (工作人員端)」，供 60+ 位夥伴同步掌握各隊進度。
- **效能平衡**：確保多人同時讀取時，不會衝破 Google Apps Script (GAS) 的執行配額。

## 2. 驗收網頁調整規劃 (permutation_check_v4.html)
- **同步觸發點**：
    - 在 `verify-btn` (驗收按鈕) 按下時，執行 `google.script.run` 上傳資料。
    - 增加「防抖 (Debounce)」機制：在 `onEnd` (搬移結束) 後延遲 2 秒自動同步當前 `id` 序列。
- **傳輸資料結構**：
    - `teamName`: 目前組別名稱。
    - `currentSequence`: 目前排列區的 id 陣列 (如 `[40, 38, 5, ...]`)。
    - `lisLength`: 目前計算出的最長遞增子序列長度。
    - `totalCount`: 目前排入的木片總數。

## 3. 直播網頁設計規劃 (live_dashboard.html)
- **視覺呈現**：
    - **多隊並列**：橫向或縱向顯示 3-4 組的進度卡片。
    - **進度視覺化**：顯示各隊的「LIS 長度」與「總片數」對比（例如：28/40）。
    - **古風延續**：沿用直書與竹片風格，但改為唯讀模式（不可拖曳）。
- **效能優化 (對抗 60 人併發需求)**：
    - **CacheService 層**：在後端 GAS 實作 5-10 秒的快取，減少對 Sheets 的直接讀取。
    - **Smart Polling**：頁面非使用狀態 (Visibility Hidden) 時暫停自動更新。
    - **Random Offset**：各手機更新頻率加入隨機毫秒偏差，錯開請求高峰。

## 4. 後端 GAS 調整 (code.gs)
- **寫入函式 `syncToSheet(data)`**：
    - 根據 `teamName` 定位 Google Sheets 中的對應列，更新資料與 `timestamp`。
- **讀取函式 `getLiveStatus()`**：
    - 實作 `CacheService` 邏輯，優先回傳快取內容。
- **Line Notify 連動**：
    - 僅在 `lisLength` 達到特定門檻或「完全正確」時，才觸發 Line 通知。

## 5. 待討論細節
- **Sheets 存取權限**：確認 GAS Web App 的執行權限設定（建議設為 "Anyone"）。
- **資料清除機制**：是否需要「一鍵清空所有隊伍進度」的後台功能。
- **Live 網頁外型**：是否需要顯示各組最後更新的「時間差」（如：10秒前更新）。

## 6. 整合開發路徑 (Unified Project Structure)

- **檔案清單**：
  - `Code.gs`: 核心控制器，處理 `doGet(e)` 路由切換與 Sheets 讀寫。
  - `permutation_check_v4.html`: 關主專用，具備 LIS 演算與數據同步功能。
  - `live_dashboard.html`: 觀眾/工作人員專用，唯讀模式，自動更新進度。
  - `poem_correct.json` / `poem_confuse.json`: 靜態資料源。

- **URL 分流邏輯**：
  - 預設網址 -> 載入驗收界面 (活動前測試需密碼，正式活動時無須密碼 -- 參看 `permutation_check_v4_wo_passwd.html` )。
  - 網址 + `?p=live` -> 載入直播界面 (活動前測試需密碼，正式活動時無須密碼)。

- **同步機制**：
  - 利用 GAS 的 `PropertiesService` 或 `CacheService` 作為 Sheets 之前的緩衝層，確保 60 人同時讀取時的系統穩定。

