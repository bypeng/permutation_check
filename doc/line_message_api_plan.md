# 專案追加計畫：Line Messaging API (Push Message) 通報系統整合

## 1. 開發背景
- **原計畫變更**：因 Line Notify 服務已於 2025/03/31 正式終止，改採 Messaging API 方案。
- **目標**：當關主端驗收木片數達 40 片時，主動推播驗收紀錄至「工作人員 Timestamp 紀錄群組」。

## 2. Line 平台設定需求 (Line Developers Console)
- **建立頻道 (Channel)**：於 Line Developers 建立一個「Messaging API」頻道。
- **取得存取權杖**：發行並紀錄 `Channel access token (long-lived)`。
- **取得目標群組 ID**：
    - 將機器人加入目標群組。
    - 暫時開啟 Webhook 接收 `groupId`，或透過一次性 `doPost(e)` 紀錄群組 ID。
    - 取得後固定 `TO_ID` 變數。

## 3. 後端邏輯調整 (Code.gs)
- **實作 `sendLinePushMessage(message)`**：
    - 使用 `UrlFetchApp` 呼叫 `https://api.line.me/v2/bot/message/push`。
    - Header 需帶入 `Authorization: Bearer [TOKEN]`。
- **觸發邏輯優化**：
    - **位置**：置於 `syncLiveStatus` 函式中 `lock.releaseLock()` 解除鎖定後的區塊。
    - **條件**：僅當 `payload.totalCount === 40` 時觸發。
    - **效能**：確保 Line API 的連線延遲不影響 Google Sheets 的寫入鎖定排隊。

## 4. 驗收網頁與前台調整 (permutation_check_v5.html)
- **防抖 (Debounce) 強化**：
    - 維持現有的 `triggerLiveSync` 防抖機制。
    - 當按下「驗收」按鈕時，API 執行期間暫時停用 (`disabled`) 按鈕，防止重複呼叫。
- **數量驗證**：在前端傳輸前，先確認排列區方塊數為 40 片。

## 5. 流量與安全評估
- **免費配額**：目前 Line Messaging API 的免費主動推送額度（Push Message）足以應付 4 組隊伍的決賽驗收頻率。
- **安全性**：Channel Access Token 與 Group ID 嚴禁寫入 HTML，統一存放於 `Code.gs` 或 `PropertiesService` 中。