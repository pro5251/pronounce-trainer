# 從圖片收集單字 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 上傳手機截圖，用瀏覽器內 OCR 找出不在詞庫和備忘錄中的英文字，讓使用者勾選後加入備忘錄。

**Architecture:** 抽字邏輯是 `core.js` 的純函式，有單元測試。`app.js` 在使用者點按鈕時才動態載入 Tesseract.js，辨識結果交給抽字邏輯，再用 `inLibrary()` 和備忘錄過濾，最後顯示勾選清單。

**Tech Stack:** 原生 ES modules、`tesseract.js@5.1.1`（jsDelivr）、`node --test`

**Spec:** `docs/superpowers/specs/2026-11-24-image-word-capture-design.md`

## Global Constraints
- 不加建置步驟和 npm 相依套件；Tesseract 只從 `https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js` 動態載入。
- 圖片不上傳到任何地方（Tesseract 只下載 worker、core 和 eng 語言檔）。
- 預設全不勾；加入的字附備註「來自圖片」。

## Review Focus
- 大小寫重複（`Firing` 和 `firing`）→ 只留一個。
- 句尾標點、引號（`firing,`、`"alert"`）→ 去掉標點後保留字。
- 主機名稱、網址、`key=value` → 整串略過。
- 圖片裡沒有英文 → 顯示「沒有找到新的英文字」。
- 離線或 CDN 載入失敗 → 顯示錯誤，可以再選一次圖片。

---

### Task 1: `extractWords(text)`

**Files:** Modify `public/js/core.js`；Test `tests/core.test.js`

**Interfaces:** Produces `extractWords(text: string) => string[]`（依出現順序、以小寫去重；全大寫且長度 ≥ 2 的字保留原樣，其餘轉小寫）

- [x] 測試 `extractWords pulls clean words from OCR text`：
  - `extractWords('Alert firing, CPU 95% on host-01.prod.local\nFiring "threshold" don\'t read-only a x=1 https://x.io/a')` 等於 `['alert','firing','CPU','on',"don't",'read-only']`
  - `extractWords('')` 等於 `[]`
- [x] 跑測試，確認失敗
- [x] 實作：先依空白切開；整串含 `[./_=:@\\]` 或數字就略過；去掉頭尾非字母；剩下的必須符合 `/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/` 而且長度 ≥ 2；`’` 正規化成 `'`
- [x] 跑 `npm test`，確認通過

### Task 2: 圖片按鈕與勾選清單

**Files:** Modify `public/index.html`（memo-tools 加 file input 和按鈕，加 `<div id="ocrBox">`）、`public/js/app.js`、`public/app.css`、`README.md`（功能清單＋流程）

- [x] 用 label 包住 `<input type="file" accept="image/*" id="ocrFile" hidden>`，顯示「📷 從圖片找單字」
- [x] `app.js`：`runOcr(file)`：動態 import → `createWorker('eng', 1, { logger })` 顯示進度 → `recognize` → `terminate`；`extractWords` 後過濾 `inLibrary` 和已有備忘錄；`renderOcr(cands, hidden)` 顯示勾選方塊、全選、全不選、「加入備忘錄（n）」、關閉
- [x] 加入時依原順序 unshift，`note:'來自圖片'`，並對每個字呼叫 `lookupMemo`
- [x] 用瀏覽器實測：載入一張合成的英文圖片，確認出現候選字，勾選加入後出現在備忘錄
- [x] `npm run check && npm test`，commit，push，確認 Pages 部署成功
