# 告警英文發音拆解

Grafana／監控告警用語的發音練習網站。純靜態網站，不需要後端，可以免費部署到 GitLab Pages 或 Cloudflare Pages。

## 功能

- **發音拆解**：每個字拆成音節，標出每組字母對應的音（IPA 與 KK）、重音、不發音字母，附繁體中文說明。
- **播放**：整個字（正常／慢速）、逐音節播放、點字母聽例字。使用瀏覽器內建語音。
- **念念看**：用麥克風念，瀏覽器辨識是否念對。念對會自動記為「普通」。句子會標出沒聽到的字。
- **錄音對照**：錄下自己的聲音，和範例輪流聽。錄音只留在瀏覽器，不會上傳。
- **間隔複習**：每次複習選「不熟／普通／很熟」，下次分別在 1／約 1.6 倍／約 2.5 倍間隔後出現（最長 180 天）。今天複習過的亮綠燈，隔天自動重置。
- **★ 需留意**：每天都會出現。**封存**：不再列入複習。
- **聽音選字測驗**、**易混淆音對比**（θ/s、v/b、ɪ/i、æ/ɛ、n/ŋ、l/r、ʌ/ɑ、ʃ/s）。
- **單字與句子**都支援。

> 念念看需要 Chrome、Edge 或 Safari，而且要用 HTTPS 網址開啟（GitLab Pages、Cloudflare Pages 都是）。
> 進度存在瀏覽器的 localStorage。換電腦或換瀏覽器前，請在「設定與備份」匯出進度，到新的地方再匯入。

## 本機執行

```bash
npm run dev          # 開啟 http://localhost:3000
# 或
cd public && python -m http.server 8000
```

不能直接雙擊 `index.html`，因為頁面要用網路請求讀取 `words.json`。

## 新增單字或句子

### 從網站新增（每日自動更新）

1. 在「新增單字／陌生單字備忘錄」輸入單字或句子，馬上就能聽發音（有真人錄音時優先播放）、看音標與機器翻譯。
2. 按「送到每日更新」，會開啟一個預先填好的 GitHub issue（標籤 `new-word`），按「Create」送出。網站上這些字會標成「待更新」。
3. 每天台灣時間 19:00，`.github/workflows/daily-words.yml` 會：
   - 讀取你本人開的、仍開著的 `new-word` issue
   - 用 Claude Code 依照下面的寫法把每個字完整拆解，加進 `words.json`，並通過檢查
   - 在 Windows runner 產生音檔、跑測試、commit
   - 在 issue 留言列出已加入的字並關閉 issue，然後部署網站
4. 字進了詞庫，網站上的「待更新」就會自動變成「已在詞庫 →」。

**第一次要設定的金鑰**（只需做一次）：在自己電腦執行

```bash
claude setup-token                                  # 產生 Claude Code 長效 token（用你的 Claude 訂閱額度）
gh secret set CLAUDE_CODE_OAUTH_TOKEN -R pro5251/pronounce-trainer   # 貼上剛剛的 token
```

想立刻跑一次、不等排程：`gh workflow run daily-words.yml -R pro5251/pronounce-trainer`，或到 GitHub 的 Actions → Daily new words → Run workflow。

注意：
- 只處理 repo 擁有者自己開的 issue，別人開的不會被讀取。
- 沒有待處理的 issue 時，排程大約 10 秒就結束，不會呼叫 Claude。
- GitHub 的排程可能延遲幾分鐘到一小時；公開 repo 連續 60 天沒有任何 commit，排程會被自動停用，到 Actions 頁面重新啟用即可。
- 想改時間：修改 `daily-words.yml` 的 `cron`（UTC 時間，台灣時間減 8 小時）。

### 手動新增

編輯 `public/words.json`，在 `items` 裡加一筆：

```json
{
  "w": "dashboard",
  "zh": "儀表板",
  "note": "（可省略）一句發音提醒",
  "tokens": ["ˈd:d a:æ sh:ʃ | ˌb:b oa:ɔ r:r d:d"]
}
```

`tokens` 的寫法：

| 規則 | 範例 |
|---|---|
| 一個英文字一個字串，依序排列（標點不用寫） | `"is above"` → `["ˈi:ɪ s:z", "a:ə \| ˈb:b o:ʌ v:v e:"]` |
| 音節用 `\|` 分開 | `t:t e:ə \| ˈg:ɡ r:r a:eɪ` |
| 每段是 `字母:音標`，所有字母都要依序出現 | `th:θ`、`tion` 寫成 `t:ʃ io:ə n:n` |
| 不發音的字母冒號後留空 | `e:` |
| 主重音 `ˈ`、次重音 `ˌ` 放在音節開頭 | `ˈp:p ea:i t:t` |

可以用的音標：`i ɪ ɛ æ ɑ ʌ ə ɚ ɝ u ʊ ɔ eɪ oʊ aɪ aʊ ɔɪ p b t d k ɡ f v θ ð s z ʃ ʒ tʃ dʒ m n ŋ l r w h j`

選填欄位：
- `accept`：語音辨識常聽成的其他寫法，例如產品名 `"accept": ["ops genie"]`。
- `kind`：`"word"` 或 `"sentence"`。不填的話，四個字以上或以標點結尾會自動當成句子。

寫完先產生音檔、檢查，再推上去：

```bash
npm run audio   # 依 IPA 產生每個音節與單音的音檔到 public/audio（需要 Windows）
npm run check   # 檢查每個字母都有對到、音標都認得、沒有重複
npm test        # 單元測試（含 words.json 與音檔是否齊全）
```

音節和單音的聲音是用 Windows 內建語音引擎（Zira）直接依照 IPA 合成的，所以每個音都照標註發音，不靠猜拼字。檔名由 IPA 內容決定，改了音標就會產生新檔，舊檔自動刪除。整個字和例字仍然用瀏覽器語音，比較自然。

也可以直接請 Claude Code 幫你加：「幫我在 words.json 加 dashboard、silence、mute timing」。

## 部署

以下方式都免費，擇一使用即可。

### GitHub Pages（目前使用中）

Repo：https://github.com/pro5251/pronounce-trainer
網站：https://pro5251.github.io/pronounce-trainer/

推送到 `main` 後，`.github/workflows/pages.yml` 會先跑檢查和測試，通過才部署。PR 只跑測試，不部署。公開 repo 的 Actions 不計分鐘數。

### A. GitLab Pages

1. 在 GitLab 建一個專案，把這個資料夾推上去：
   ```bash
   git init -b main
   git add .gitignore .gitlab-ci.yml README.md package.json public scripts tests
   git commit -m "Pronunciation trainer"
   git remote add origin git@gitlab.com:<你的帳號>/pronounce-trainer.git
   git push -u origin main
   ```
2. `.gitlab-ci.yml` 會先跑檢查和測試，通過才發佈 `public/`。
3. 網址在專案側邊欄 **Deploy → Pages**，通常是 `https://<你的帳號>.gitlab.io/pronounce-trainer/`。
4. 私有專案也可以用 Pages。在 **Settings → General → Visibility → Pages** 可以設定只有專案成員能看。

GitLab.com 免費方案每月有 400 分鐘 CI，這個 pipeline 每次約 1 分鐘。

### B. Cloudflare Pages

1. Cloudflare 後台 → **Workers & Pages → Create → Pages → Connect to Git**，選 GitHub 或 GitLab，再選這個 repo。
2. 設定：
   - Framework preset：`None`
   - Build command：`node scripts/validate-words.mjs && node --test`
   - Build output directory：`public`
3. 儲存後，每次推送到 main 都會自動部署。網址是 `https://<專案名>.pages.dev`。

不想連 Git 的話，也可以手動上傳：`npx wrangler pages deploy public --project-name pronounce-trainer`（需要先 `npx wrangler login`）。

免費方案每月 500 次建置，流量不限。

## 檔案結構

```
public/
  index.html        頁面
  app.css           樣式
  words.json        單字與句子資料
  _headers          Cloudflare 用：words.json 不快取
  js/core.js        純邏輯：音標、拆解、間隔複習、語音比對（網頁和測試共用）
  js/app.js         畫面與互動
scripts/validate-words.mjs   words.json 檢查
tests/core.test.js           單元測試
.github/workflows/pages.yml  GitHub Pages 測試與部署
.github/workflows/daily-words.yml  每日排程：new-word issue → Claude 拆解 → 音檔 → 部署
.github/prompts/add-words.md 每日排程給 Claude 的指示
scripts/gen-audio.mjs        依 IPA 產生音檔（Windows）
scripts/diff-words.mjs       列出 words.json 新增了哪些字
.gitlab-ci.yml               GitLab Pages 部署（改用 GitLab 時才需要）
```
