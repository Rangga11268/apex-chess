# ♟️ Apex Chess — Real-Time Stockfish Chess Engine & Assistant for Chess.com

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Stockfish Engine](https://img.shields.io/badge/Engine-Stockfish%2010%2B-00F5FF.svg)](https://stockfishchess.org/)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-7A22FF.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Rangga11268/apex-chess/pulls)

**Apex Chess** is a modern, tactical, high-performance Chrome extension that provides **real-time Stockfish chess engine evaluation**, accurate move suggestions, opening theory recognition, and live analysis on **[Chess.com](https://www.chess.com)**.

Built with an **embedded offline Stockfish UCI engine Web Worker**, Apex Chess requires no external API keys or remote servers. It runs directly inside your browser with maximum speed, humanized timing, and side-locked analysis.

<p align="center">
    <img width="650" src="img/banner-hd.png" alt="Apex Chess HD Banner">
</p>

---

## 🔍 Key Search Keywords & Topics
`chess engine` · `chess.com bot` · `stockfish chrome extension` · `chess evaluation bar` · `chess helper` · `chess move calculator` · `chess analysis assistant` · `chesscom stealth engine` · `chess opening book`

---

## ✨ Features

- ⚡ **Instant Stockfish Evaluation**: Computes moves in ~1.2s using capped `movetime` and configurable depth ceilings (depth 10–25).
- 🎯 **Side-Lock Turn Filtering**: Hints and best-move arrows only appear on **your own turn** (`getPlayingAs() === getTurn()`). No distracting arrows during opponent turns.
- 🛡️ **Anti-Detection Stealth (Humanized Play)**:
  - **Dynamic Timing Jitter**: Randomized human-like thinking delay between **800ms – 2200ms**.
  - **Rank-2 Move Randomization**: Automatically plays the 2nd-best engine move ~25% of the time to avoid suspicious 99% CAPS engine correlation.
- 📊 **Real-Time Evaluation Bar**: Live centipawn (`+1.45`) and forced mate (`M3`) score with dynamic white/black perspective flipping.
- 📘 **Built-In ECO Opening Book**: Recognizes 27+ classic opening lines instantly (`eco.json`) without consuming CPU cycles.
- 🌐 **Bilingual Interface**: 1-click toggle between **Bahasa Indonesia (ID)** and **English (EN)**.
- 🧩 **100% Offline & Private**: Uses offline WASM/ASM.js Stockfish blob workers—zero telemetry, zero external network requests.
- ♟️ **Modern Chess.com Support**: Seamlessly hooks into both `<wc-chess-board>` and `<chess-board>` web components with automated MutationObserver fallback.

---

## 🚀 Installation Guide

### Step 1: Clone Repository
```bash
git clone https://github.com/Rangga11268/apex-chess.git
cd apex-chess
```

### Step 2: Install Dependencies & Build
```bash
npm install
npm run build
```

*(You can verify all artifacts by running `npm test`)*

### Step 3: Load Extension into Browser (Chrome / Brave / Edge / Opera)
1. Open your browser and navigate to:
   - Chrome: `chrome://extensions/`
   - Brave: `brave://extensions/`
   - Edge: `edge://extensions/`
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** (Muat yang belum dibongkar).
4. Select the **`dist`** directory inside the `apex-chess` project folder (`d:\Ngoding\ChessMint\dist`).
5. Open [Chess.com](https://www.chess.com) and start any game or analysis board!

---

## ⚙️ Configuration & Options

Click the **Apex Chess** icon in the browser toolbar to open the control panel:

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Engine Depth** | `12` | Calculation depth limit (1–25) |
| **CPU Threads** | `2` | Web Worker hardware concurrency |
| **Show Move Hints** | `Enabled` | Color-coded best move arrows (Only on your turn) |
| **Move Quality Analysis** | `Enabled` | Shows move badges (*Brilliant, Best Move, Inaccuracy, Blunder*) |
| **Evaluation Advantage Bar** | `Enabled` | Displays real-time advantage bar next to the board |
| **Depth Progress Bar** | `Enabled` | Visual engine thinking status bar |
| **Auto Move (Stealth Jitter)**| `Disabled` | Automatic play with 800ms–2200ms delay & 25% rank-2 move pick |
| **Language** | `ID / EN` | Instantly switch between Indonesian and English |

---

## 🛠️ Tech Stack & Architecture

- **Engine Core**: Stockfish 10.0.2 UCI Engine compiled to Web Worker via Blob URL.
- **Languages**: TypeScript, HTML5, CSS3.
- **Bundler**: Webpack 5.
- **Target Platform**: Manifest V3 (MV3) Google Chrome & Chromium browsers.
- **DOM Integration**: Chess.com custom element prototype hooking + MutationObserver.

---

## 🧪 Verification & Tests

Run the built-in diagnostic test suite:
```bash
npm test
```
Ensures:
- Manifest V3 specification compliance.
- ECO Opening table validity.
- Stockfish UCI engine artifact readiness.
- JS bundle integrity and size benchmarks.

---

## ⚠️ Disclaimer & Fair Play Notice

This software is developed strictly for **educational, analysis, study, and offline bot-training purposes**. Using chess engines in rated competitive games against human players is strictly against the [Chess.com Fair Play Policy](https://support.chess.com/article/648-what-are-the-fair-play-policies). Please play responsibly and respect the chess community.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
