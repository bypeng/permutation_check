// --- 系統密碼設定 ---
const ADMIN_PASSWORD = 'NEVERTELLOTHERS'; // 大關主後台密碼
const SECRET_PASSWORD = '87654321';       // 正式有密碼版本的通關密碼
const DUMMY_PASSWORD = '12345678';        // 無密碼版本的防呆自動驗證密碼

// --- Line API 設定 ---
// 請將你的 Channel Access Token 填入下方引號內
const LINE_CHANNEL_ACCESS_TOKEN = '(去 Messenging API 撈 Channel access token)';
const LINE_REGISTER_KEYWORD = '/取得groupID'; // 可自行修改為你測試成功的密語
// 【安全防護】請將剛剛在後台複製的 Your user ID 填入下方
const LINE_ADMIN_BYPENG_ID = '(百片 的 User ID)';
const LINE_ADMIN_RCOT_ID = '(紅椰 的 User ID)';
const LINE_ADMIN_JING_ID = '(文鈞 的 User ID)';

// 轉播系統使用的 Google Sheets 設定
// TODO: 請建立一個新的 Google 試算表，並將其 ID 填入下方
const LIVE_SPREADSHEET_ID = '(去雲端硬碟抓 Google Sheets 的 Spreadsheet ID)'; 
const LIVE_SHEET_NAME = 'LiveStatus';

// 取得是否為無密碼模式 (具備明確的初始化防呆)
function getIsPasswordFree() {
  const props = PropertiesService.getScriptProperties();
  let val = props.getProperty('isPasswordFree');
  if (val === null) {
    props.setProperty('isPasswordFree', 'false'); // 第一次執行出廠時，強制寫入「有密碼模式」
    val = 'false';
  }
  return val === 'true'; 
}

// 取得是否啟用 LINE 主動推播 (具備明確的初始化防呆)
function getIsLineNotifyEnabled() {
  const props = PropertiesService.getScriptProperties();
  let val = props.getProperty('isLineNotifyEnabled');
  if (val === null) {
    props.setProperty('isLineNotifyEnabled', 'false'); // 第一次執行出廠時，強制寫入「關閉推播」
    val = 'false';
  }
  return val === 'true';
}

// GAS 網頁應用程式的進入點
function doGet(e) {
  // 取得系統設定
  const isPasswordFree = getIsPasswordFree();

  // 1. 後台管理路由 (?p=admin)
  if (e && e.parameter && e.parameter.p === 'admin') {
    return HtmlService.createHtmlOutputFromFile('backend_setting')
        .setTitle('Final Mission 大關主後台')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  // 2. 轉播台路由 (?p=live)
  // 透過 URL 參數 p 來決定要載入哪個頁面 (例如網址加上 ?p=live)
  if (e && e.parameter && e.parameter.p === 'live') {
    const file = isPasswordFree ? 'live_dashboard_wo_passwd' : 'live_dashboard';
    return HtmlService.createHtmlOutputFromFile(file)
        .setTitle('Final Mission 進度直播')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }
  
  // 3. 預設載入關主的驗收頁面路由
  const file = isPasswordFree ? 'permutation_check_wo_passwd' : 'permutation_check';
  return HtmlService.createHtmlOutputFromFile(file)
      .setTitle('Final Mission 驗收系統')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

// 供前端呼叫的密碼驗證函式
function verifyPassword(inputPassword) {
  const isPasswordFree = getIsPasswordFree();
  return (isPasswordFree && inputPassword === DUMMY_PASSWORD) || (!isPasswordFree && inputPassword === SECRET_PASSWORD);
}

// 供前端呼叫的進階驗證函式：密碼正確才回傳機密資料
function authenticateAndGetData(inputPassword) {
  if (verifyPassword(inputPassword)) {
    const props = PropertiesService.getScriptProperties();
    let activePlayers = PLAYER_DATA;
    
    // 根據晉級名單進行過濾
    const advancedTeamsStr = props.getProperty('advancedTeams');
    if (advancedTeamsStr) {
      try {
        const advancedTeams = JSON.parse(advancedTeamsStr); // e.g., [1, 3, 4]
        // 只保留 ID 存在於勾選名單中的隊伍
        activePlayers = PLAYER_DATA.filter(p => advancedTeams.includes(p.id.toString()) || advancedTeams.includes(p.id));
      } catch(e) {}
    }

    return {
      success: true,
      data: {
        correctPoems: POEM_CORRECT_DATA,
        confusePoems: POEM_CONFUSE_DATA,
        players: activePlayers,
        isLineNotifyEnabled: getIsLineNotifyEnabled() // 將 LINE 推播開關狀態一起傳給前台
      }
    };
  }
  return { success: false };
}

// --- 後台管理 API ---

// 取得目前系統設定
function getSystemSettings(inputPassword) {
  if (inputPassword !== ADMIN_PASSWORD) return { success: false, error: '密碼錯誤' };
  const props = PropertiesService.getScriptProperties();
  
  // 若尚未設定過晉級名單，預設全部勾選 (避免一開始什麼都沒有)
  let advancedTeams = PLAYER_DATA.map(p => p.id);
  if (props.getProperty('advancedTeams')) {
    try { advancedTeams = JSON.parse(props.getProperty('advancedTeams')); } catch(e) {}
  }

  return {
    success: true,
    data: {
      isPasswordFree: getIsPasswordFree(),
      isLineNotifyEnabled: getIsLineNotifyEnabled(),
      advancedTeams: advancedTeams,
      allPlayers: PLAYER_DATA // 傳送原始完整名單，供後台渲染核取方塊使用
    }
  };
}

// 儲存系統設定
function saveSystemSettings(inputPassword, settings) {
  if (inputPassword !== ADMIN_PASSWORD) return { success: false, error: '密碼錯誤' };
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('isPasswordFree', settings.isPasswordFree ? 'true' : 'false');
    props.setProperty('isLineNotifyEnabled', settings.isLineNotifyEnabled ? 'true' : 'false');
    props.setProperty('advancedTeams', JSON.stringify(settings.advancedTeams || []));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// 供前端呼叫的轉播狀態同步函式
function syncLiveStatus(payload) {
  // payload 預期格式: { teamId: "1", currentSequence: [...], lisLength: 5, totalCount: 10, isAttempt: true/false }
  
  // 使用 LockService 防止多人同時寫入造成資料覆蓋或衝突
  const lock = LockService.getScriptLock();
  // 最多等待 3 秒，若拿不到鎖則回傳失敗請前端稍後再試
  if (!lock.tryLock(3000)) {
    return { success: false, error: '系統忙碌中，請稍後重試。' };
  }

  try {
    const ss = SpreadsheetApp.openById(LIVE_SPREADSHEET_ID);
    let sheet = ss.getSheetByName(LIVE_SHEET_NAME);

    // 若工作表不存在則自動建立
    if (!sheet) {
      sheet = ss.insertSheet(LIVE_SHEET_NAME);
    }

    // 檢查工作表是否為空 (沒有標題列)，若為空則自動寫入標題列並凍結
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['隊號(系統內用)', '隊伍名稱', '最後更新時間', '木條數量', '最長遞增序列長度', '驗收次數', '木條編號序列JSON']);
      sheet.setFrozenRows(1); // 凍結第一列標題
    }

    const data = sheet.getDataRange().getValues();
    const teamId = payload.teamId.toString();
    const now = new Date();

    // 利用現有的 PLAYER_DATA 抓取隊伍名稱，減輕前端傳輸負擔
    const teamInfo = PLAYER_DATA.find(p => p.id.toString() === teamId);
    const teamName = teamInfo ? `${teamInfo.p1name} ${teamInfo.p2name} (${teamInfo.relationship})` : '未知隊伍';
    const sequenceStr = JSON.stringify(payload.currentSequence || []);

    // 尋找該隊伍是否已經有紀錄 (i=1 略過標題列)
    let rowIndex = -1;
    let attemptCount = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === teamId) {
        rowIndex = i + 1; // GAS 的 Row 是從 1 開始算
        attemptCount = parseInt(data[i][5]) || 0; // 讀取目前的驗收次數 (F欄, index 5)
        break;
      }
    }

    let newAttemptCount = attemptCount;
    // 只有當前端明確傳送 isAttempt = true (按下驗收按鈕) 且排滿 40 片時，才算一次正式的驗收，次數加一
    if (payload.isAttempt && payload.totalCount === 40) {
      newAttemptCount += 1;
    }

    if (rowIndex !== -1) {
      // 更新現有隊伍資料 (B欄到G欄)
      sheet.getRange(rowIndex, 2, 1, 6).setValues([[teamName, now, payload.totalCount || 0, payload.lisLength || 0, newAttemptCount, sequenceStr]]);
    } else {
      // 若無紀錄則新增一列
      sheet.appendRow([teamId, teamName, now, payload.totalCount || 0, payload.lisLength || 0, newAttemptCount, sequenceStr]);
    }

    // --- 檢查是否排滿 40 片且為正式驗收，並觸發推播 ---
    // 只有在「正式驗收」、「排滿 40 片」且「後台開關為啟用」三個條件都滿足時，才觸發推播
    if (payload.isAttempt && payload.totalCount === 40) {
      if (getIsLineNotifyEnabled()) {
        sendLinePushNotification(teamId, teamName, payload.lisLength, newAttemptCount);
      }
    }
    
    // 寫入成功後，主動清除讀取快取，讓儀表板能立刻抓到最新進度
    CacheService.getScriptCache().remove('LIVE_STATUS_CACHE');
    
    return { success: true, timestamp: now.getTime(), isLineNotifyEnabled: getIsLineNotifyEnabled() };
  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// 負責發送「驗收結果」的推播訊息
function sendLinePushNotification(teamId, teamName, lisLength, attemptCount) {
  const props = PropertiesService.getScriptProperties();
  const groupId = props.getProperty('LINE_GROUP_ID');
  
  // 1. 如果尚未綁定群組，則不執行推播
  if (!groupId) return;
  
  const isSuccess = lisLength === 40;
  
  // 2. 智慧防連發機制：除了紀錄時間，也記錄上次的「驗收狀態」
  const cooldownKey = 'NOTIFY_COOLDOWN_' + teamId;
  const lastNotifyData = props.getProperty(cooldownKey);
  let lastNotifyTime = 0;
  let lastNotifyWasSuccess = null;
  
  if (lastNotifyData) {
    const parts = lastNotifyData.split('_');
    lastNotifyTime = parseInt(parts[0]);
    lastNotifyWasSuccess = parts[1] === 'true';
  }
  
  const now = new Date().getTime();
  const NOTIFY_COOLDOWN_SECONDS = 5; // 冷卻時間縮短為 5 秒
  
  // 若狀態不變 (例如連兩次失敗) 且在 5 秒內，才判定為前端誤觸；若狀態改變 (如失敗變成功)，則直接放行
  if (isSuccess === lastNotifyWasSuccess && (now - lastNotifyTime < NOTIFY_COOLDOWN_SECONDS * 1000)) {
    return; 
  }
  
  // 3. 組合推播訊息
  const resultText = isSuccess ? '驗收成功！' : '驗收失敗。';
  const icon = isSuccess ? '🎉' : '⚠️';
  const messageText = `${icon} [第 ${attemptCount} 次驗收] ${icon}\n隊伍「${teamName}」\n最長序列為 ${lisLength} 片，${resultText}`;
  
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    'to': groupId,
    'messages': [{'type': 'text', 'text': messageText}]
  };
  const options = {
    'method': 'post',
    'muteHttpExceptions': true, // 避免 Line API 發生錯誤時導致主程式當機
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    'payload': JSON.stringify(payload)
  };
  
  // 發送請求，並在成功後更新冷卻時間戳與狀態
  UrlFetchApp.fetch(url, options);
  props.setProperty(cooldownKey, now.toString() + '_' + isSuccess);
}

// 供前端儀表板呼叫的讀取 API，具備 CacheService 快取機制防護
function getLiveStatus() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'LIVE_STATUS_CACHE';
  const cachedData = cache.get(cacheKey);

  // 1. 若快取內有資料，直接回傳 (保護 Quota，應付 60 人併發)
  if (cachedData) {
    return { success: true, data: JSON.parse(cachedData), cached: true };
  }

  // 2. 若無快取，從 Google Sheets 撈取
  try {
    const ss = SpreadsheetApp.openById(LIVE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(LIVE_SHEET_NAME);
    
    if (!sheet) {
      return { success: true, data: [], cached: false };
    }

    const data = sheet.getDataRange().getValues();
    const result = [];

    // 略過第一列標題，從 i = 1 開始
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // 略過空行
      
      result.push({
        challengeOrder: i, // 明確記錄挑戰順位 (也就是 n-1)
        teamId: row[0].toString(),
        teamName: row[1],
        lastUpdated: row[2], // 日期時間
        totalCount: row[3],
        lisLength: row[4],
        attemptCount: row[5],
        currentSequence: JSON.parse(row[6] || '[]')
      });
    }

    // 3. 將結果寫入快取，設定存活時間為 5 秒
    cache.put(cacheKey, JSON.stringify(result), 5);

    return { success: true, data: result, cached: false };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// --- Line Webhook 接收器 (用於自動綁定群組) ---
function doPost(e) {
  if (typeof e === 'undefined' || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput("Error: No data");
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const events = data.events;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // 確保是群組內的文字訊息
      if (event.type === 'message' && event.message.type === 'text' && event.source.type === 'group') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;
        const groupId = event.source.groupId;
        const userId = event.source.userId; // 抓取發言人的 User ID

        // 如果收到的訊息等於我們設定的密語
        if (userMessage === LINE_REGISTER_KEYWORD) {
          // 【安全防護】判斷發言人是哪位大關主
          let adminName = '';
          if (userId === LINE_ADMIN_BYPENG_ID) {
            adminName = '百片';
          } else if (userId === LINE_ADMIN_RCOT_ID) {
            adminName = '紅椰';
          } else if (userId === LINE_ADMIN_JING_ID) {
            adminName = '文鈞';
          }

          // 如果都不符合，回傳錯誤訊息並印出 ID
          if (adminName === '') {
            //replyToLine(replyToken, '❌ 權限驗證失敗！\n系統辨識到你的 User ID 為：\n' + userId + '\n\n請確認是否與 Code.gs 中的大關主 User ID 一致。');
            replyToLine(replyToken, '❌ 權限驗證失敗！\n系統辨識到你的 User ID 不是大關主名單一員。');
            continue;
          }

          // 將 Group ID 存入系統環境變數中
          const props = PropertiesService.getScriptProperties();
          props.setProperty('LINE_GROUP_ID', groupId);
          
          // 回覆成功訊息給群組
          const replyText = `✅ ${adminName} 已經綁定群組成功！\n已將此群組設為 Final Mission 進度通報專線。`;
          replyToLine(replyToken, replyText);
        }
      }
    }
  } catch (err) {
    // 錯誤防護，避免影響 GAS 執行
    console.error(err);
  }

  // 必須回傳 200 OK 給 Line
  return ContentService.createTextOutput("OK");
}

// 負責發送回覆訊息給 Line
function replyToLine(replyToken, text) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = {
    'replyToken': replyToken,
    'messages': [{'type': 'text', 'text': text}]
  };
  const options = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    'payload': JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}

// --- 除錯專用：測試授權與 Token 是否正確 ---
function testLineToken() {
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    'to': LINE_ADMIN_BYPENG_ID, // 除錯發送測試訊息，預設發給百片
    'messages': [{'type': 'text', 'text': '✅ 系統發送測試：Token 與授權皆正常！'}]
  };
  const options = {
    'method': 'post',
    'muteHttpExceptions': true, // 即使有錯誤也不會中斷程式，方便印出錯誤訊息
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    'payload': JSON.stringify(payload)
  };
  const response = UrlFetchApp.fetch(url, options);
  console.log('LINE API 回應：', response.getContentText());
}

// 將原本的 JSON 資料直接宣告在後端，避免透過獨立檔案外流
const POEM_CORRECT_DATA = [
  {"id": 1, "weight": 1, "showid": 17, "firstText": "出發總要有個方向", "secondText": "而方向在雪白的機翼上", "fullText": "出發總要有個方向 而方向在雪白的機翼上"},
  {"id": 2, "weight": 2, "showid": 9, "firstText": "他們在洞穴之間來回", "secondText": "避開 踩中 再繼續前進", "fullText": "他們在洞穴之間來回 避開 踩中 再繼續前進"},
  {"id": 3, "weight": 3, "showid": 19, "firstText": "布偶被舉起", "secondText": "故事被訴說", "fullText": "布偶被舉起 故事被訴說"},
  {"id": 4, "weight": 4, "showid": 35, "firstText": "塵封已久的機庫被打開", "secondText": "放滿了衛生紙跟白米", "fullText": "塵封已久的機庫被打開 放滿了衛生紙跟白米"},
  {"id": 5, "weight": 5, "showid": 25, "firstText": "有人欣喜地打包帶走", "secondText": "有人卻怒目看著人們通過", "fullText": "有人欣喜地打包帶走 有人卻怒目看著人們通過"},
  {"id": 6, "weight": 6, "showid": 20, "firstText": "平日訴說的日常煩惱", "secondText": "在這竟成了神秘的配方", "fullText": "平日訴說的日常煩惱 在這竟成了神秘的配方"},
  {"id": 7, "weight": 7, "showid": 18, "firstText": "巨大的虎口張開", "secondText": "眼前出現了莫測的岔路", "fullText": "巨大的虎口張開 眼前出現了莫測的岔路"},
  {"id": 8, "weight": 8, "showid": 26, "firstText": "有人動刀留下刻印", "secondText": "有人擦去汗水後繼續動工", "fullText": "有人動刀留下刻印 有人擦去汗水後繼續動工"},
  {"id": 9, "weight": 9, "showid": 34, "firstText": "無名的沙漏被扭轉", "secondText": "時間無情地流逝", "fullText": "無名的沙漏被扭轉 時間無情地流逝"},
  {"id": 10, "weight": 10, "showid": 32, "firstText": "從天而降的一尾鹹魚", "secondText": "慵懶地翻著身子", "fullText": "從天而降的一尾鹹魚 慵懶地翻著身子"},
  {"id": 11, "weight": 11, "showid": 14, "firstText": "他們訴說著友誼永存", "secondText": "但卻有人沒能留下", "fullText": "他們訴說著友誼永存 但卻有人沒能留下"},
  {"id": 12, "weight": 12, "showid": 4, "firstText": "化作了一個個籮筐", "secondText": "飛過了屋簷", "fullText": "化作了一個個籮筐 飛過了屋簷"},
  {"id": 13, "weight": 13, "showid": 30, "firstText": "烈日下他們攻城掠地", "secondText": "鬃毛與武器沾染汗水", "fullText": "烈日下他們攻城掠地 鬃毛與武器沾染汗水"},
  {"id": 14, "weight": 14, "showid": 38, "firstText": "隨後他們高歌離席", "secondText": "前往泉水的源頭", "fullText": "隨後他們高歌離席 前往泉水的源頭"},
  {"id": 15, "weight": 15, "showid": 13, "firstText": "他們深陷漉糊仔糜膏", "secondText": "竭盡九牛二虎之力逃脫", "fullText": "他們深陷漉糊仔糜膏 竭盡九牛二虎之力逃脫"},
  {"id": 16, "weight": 16, "showid": 28, "firstText": "有人選擇外帶", "secondText": "有人選擇清除", "fullText": "有人選擇外帶 有人選擇清除"},
  {"id": 17, "weight": 17, "showid": 15, "firstText": "他們試圖跨越鴻溝", "secondText": "但卻有人無法上岸", "fullText": "他們試圖跨越鴻溝 但卻有人無法上岸"},
  {"id": 18, "weight": 18, "showid": 40, "firstText": "籠具在他們手中成形", "secondText": "試圖馴服流動的水", "fullText": "籠具在他們手中成形 試圖馴服流動的水"},
  {"id": 19, "weight": 19, "showid": 31, "firstText": "破衣老人喝酒吃肉", "secondText": "三牲的骨頭堆滿前路", "fullText": "破衣老人喝酒吃肉 三牲的骨頭堆滿前路"},
  {"id": 20, "weight": 20, "showid": 27, "firstText": "有人將其上色", "secondText": "有人將其拼合", "fullText": "有人將其上色 有人將其拼合"},
  {"id": 21, "weight": 21, "showid": 22, "firstText": "在穿越屏障之後", "secondText": "他們抓起了一把砂石紀念", "fullText": "在穿越屏障之後 他們抓起了一把砂石紀念"},
  {"id": 22, "weight": 22, "showid": 11, "firstText": "他們來到一家小店受領甘泉", "secondText": "但卻有人在此乾枯", "fullText": "他們來到一家小店受領甘泉 但卻有人在此乾枯"},
  {"id": 23, "weight": 23, "showid": 6, "firstText": "月台上出現了他的背影", "secondText": "撿的不是橘子而是太陽餅", "fullText": "月台上出現了他的背影 撿的不是橘子而是太陽餅"},
  {"id": 24, "weight": 24, "showid": 39, "firstText": "寶藏在水中閃閃發亮", "secondText": "但時間是司機說了算", "fullText": "寶藏在水中閃閃發亮 但時間是司機說了算"},
  {"id": 25, "weight": 25, "showid": 7, "firstText": "他們只能嘟著嘴說著", "secondText": "沒想到小丑竟是我自己", "fullText": "他們只能嘟著嘴說著 沒想到小丑竟是我自己"},
  {"id": 26, "weight": 26, "showid": 16, "firstText": "他們融入其中", "secondText": "踩著這個國度的舞步", "fullText": "他們融入其中 踩著這個國度的舞步"},
  {"id": 27, "weight": 27, "showid": 8, "firstText": "他們在夜色中蒙面抵達", "secondText": "但卻有人卸不下面具", "fullText": "他們在夜色中蒙面抵達 但卻有人卸不下面具"},
  {"id": 28, "weight": 28, "showid": 5, "firstText": "日出之時他們身處農村", "secondText": "在碰撞聲中決定勝負", "fullText": "日出之時他們身處農村 在碰撞聲中決定勝負"},
  {"id": 29, "weight": 29, "showid": 21, "firstText": "田間木影斜", "secondText": "花香甘風吹", "fullText": "田間木影斜 花香甘風吹"},
  {"id": 30, "weight": 30, "showid": 23, "firstText": "有人在森林中尋找貝瑪", "secondText": "有人卻發現他比戈登還辣", "fullText": "有人在森林中尋找貝瑪 有人卻發現他比戈登還辣"},
  {"id": 31, "weight": 31, "showid": 33, "firstText": "野生的摩斯拉使出暴風", "secondText": "迫使他們繞道而行", "fullText": "野生的摩斯拉使出暴風 迫使他們繞道而行"},
  {"id": 32, "weight": 32, "showid": 37, "firstText": "積木砌成了一座要塞", "secondText": "給了他們前進的動力", "fullText": "積木砌成了一座要塞 給了他們前進的動力"},
  {"id": 33, "weight": 33, "showid": 1, "firstText": "一加二 二拄去 三欠一", "secondText": "耆老發出了難解的低喃", "fullText": "一加二 二拄去 三欠一 耆老發出了難解的低喃"},
  {"id": 34, "weight": 34, "showid": 10, "firstText": "他們走進了一陣香氣", "secondText": "但卻有人夢想破滅", "fullText": "他們走進了一陣香氣 但卻有人夢想破滅"},
  {"id": 35, "weight": 35, "showid": 36, "firstText": "寫著逝者之名的日晷", "secondText": "提醒他們永保平安的重要", "fullText": "寫著逝者之名的日晷 提醒他們永保平安的重要"},
  {"id": 36, "weight": 36, "showid": 24, "firstText": "有人東張西望地", "secondText": "步入隱藏的空間", "fullText": "有人東張西望地 步入隱藏的空間"},
  {"id": 37, "weight": 37, "showid": 3, "firstText": "也有人鑽進巷弄中", "secondText": "對著生物咒罵不止", "fullText": "也有人鑽進巷弄中 對著生物咒罵不止"},
  {"id": 38, "weight": 37, "showid": 2, "firstText": "又有人期望", "secondText": "在包裝下尋得真理", "fullText": "又有人期望 在包裝下尋得真理"},
  {"id": 39, "weight": 39, "showid": 29, "firstText": "故事總要有個結局", "secondText": "但必須要為十六樓折腰", "fullText": "故事總要有個結局 但必須要為十六樓折腰"},
  {"id": 40, "weight": 40, "showid": 12, "firstText": "他們來到一道牆前", "secondText": "把一路走來的順序放回原位", "fullText": "他們來到一道牆前 把一路走來的順序放回原位"}
];

const POEM_CONFUSE_DATA = [

];

const PLAYER_DATA = [
  {"id": 1, "p1name": "Cecil", "p2name": "Josh", "relationship": "已婚夫夫"},
  {"id": 2, "p1name": "小馬", "p2name": "浩翔", "relationship": "默契菸友"},
  {"id": 3, "p1name": "玉米", "p2name": "Anita", "relationship": "活力姨姪"},
  {"id": 4, "p1name": "芝芝", "p2name": "小胖", "relationship": "悠哉俠侶"},
  {"id": 5, "p1name": "Joey", "p2name": "Venus", "relationship": "港台妻妻"},
  {"id": 6, "p1name": "猴子", "p2name": "小尾巴", "relationship": "國中同學"},
  {"id": 7, "p1name": "Eddie", "p2name": "甄甄", "relationship": "新婚夫妻"},
  {"id": 8, "p1name": "亮亮", "p2name": "阿醉", "relationship": "大可夫夫"},
  {"id": 9, "p1name": "Boo", "p2name": "鬆餅", "relationship": "忘年之交"},
  {"id": 10, "p1name": "豆豆", "p2name": "伶伶", "relationship": "I人隊友"}
];
