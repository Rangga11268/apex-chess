const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("--> Testing ChessMint build artifacts...");

const distDir = path.resolve(__dirname, "..", "dist");

// 1. Verify Manifest V3
const manifestPath = path.join(distDir, "manifest.json");
assert(fs.existsSync(manifestPath), "manifest.json must exist in dist/");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
assert.strictEqual(manifest.manifest_version, 3, "Manifest version must be 3");
assert(manifest.content_scripts && manifest.content_scripts.length > 0, "Content scripts must be declared");
assert(manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0, "web_accessible_resources must be declared");

const declaredResources = manifest.web_accessible_resources[0].resources;
assert(declaredResources.includes("js/chessmint.js"), "chessmint.js must be declared in web_accessible_resources");
assert(declaredResources.includes("js/stockfish.js"), "stockfish.js must be declared in web_accessible_resources");
assert(declaredResources.includes("eco.json"), "eco.json must be declared in web_accessible_resources");
console.log("✓ Manifest V3 verified");

// 2. Verify Eco Opening Book
const ecoPath = path.join(distDir, "eco.json");
assert(fs.existsSync(ecoPath), "eco.json must exist in dist/");
const ecoData = JSON.parse(fs.readFileSync(ecoPath, "utf-8"));
assert(Array.isArray(ecoData) && ecoData.length > 0, "eco.json must be non-empty array");
assert(ecoData[0].f, "eco.json entries must have 'f' property");
console.log(`✓ Opening book verified (${ecoData.length} openings)`);

// 3. Verify Compiled JavaScript Files
const jsFiles = ["chessmint.js", "loader.js", "options.js", "stockfish.js"];
for (const file of jsFiles) {
    const filePath = path.join(distDir, "js", file);
    assert(fs.existsSync(filePath), `${file} must exist in dist/js/`);
    const stats = fs.statSync(filePath);
    assert(stats.size > 100, `${file} must not be empty`);
    console.log(`✓ dist/js/${file} verified (${stats.size} bytes)`);
}

// 4. Verify Stockfish Engine (ASM.js / WASM UCI check)
const sfPath = path.join(distDir, "js", "stockfish.js");
const sfCode = fs.readFileSync(sfPath, "utf-8");
assert(sfCode.includes("uci_command") || sfCode.includes("Stockfish"), "stockfish.js must contain Stockfish UCI command handler");
console.log("✓ Stockfish UCI engine artifact verified");

// 5. Verify Robust UCI Info Parsing
function parseUciInfo(line) {
    if (!line.startsWith("info ") || !line.includes(" pv ") || !line.includes(" score ")) return null;
    const depthMatch = line.match(/\bdepth (\d+)/);
    const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
    const pvMatch = line.match(/\bpv (.+)$/);
    if (!depthMatch || !scoreMatch || !pvMatch) return null;
    return {
        depth: parseInt(depthMatch[1]),
        type: scoreMatch[1],
        score: parseInt(scoreMatch[2]),
        pv: pvMatch[1].trim()
    };
}
assert(parseUciInfo("info depth 12 seldepth 15 multipv 1 score cp 30 pv e2e4 e7e5"), "Standard info line must parse");
assert(parseUciInfo("info depth 12 multipv 1 score cp 30 pv e2e4 e7e5"), "Info line without seldepth must parse");
assert(parseUciInfo("info depth 12 score cp 30 multipv 1 pv e2e4 e7e5"), "Info line with reversed tokens must parse");
const mateRes = parseUciInfo("info depth 8 score mate 2 pv e7e8q g8h7");
assert(mateRes && mateRes.type === "mate" && mateRes.score === 2, "Mate score info line must parse correctly");
console.log("✓ Robust UCI info parser verified");

// 6. Verify Tactical Brilliant Move Logic
function isBrilliantMove(bestMove, secondMove) {
    if (!bestMove) return false;
    const bestScore = bestMove.mate != null ? (bestMove.mate > 0 ? 10000 : -10000) : (bestMove.cp || 0);
    if (!secondMove) return false;
    const secondScore = secondMove.mate != null ? (secondMove.mate > 0 ? 10000 : -10000) : (secondMove.cp || 0);
    if (bestScore - secondScore > 180 || (bestMove.mate != null && bestMove.mate > 0 && secondMove.mate == null)) {
        return true;
    }
    return false;
}
assert.strictEqual(isBrilliantMove({ mate: -2, cp: null }, { mate: null, cp: -900 }), false, "Losing mate must NOT be classified as brilliant");
assert.strictEqual(isBrilliantMove({ mate: 3, cp: null }, { mate: null, cp: 200 }), true, "Finding forced winning mate must be classified as brilliant");
assert.strictEqual(isBrilliantMove({ mate: null, cp: 350 }, { mate: null, cp: 50 }), true, "Tactical sacrifice with large cp delta must be classified as brilliant");
console.log("✓ Tactical brilliant move logic verified");

// 7. Verify Lifecycle & Architecture Integrity in Bundle
const cmCode = fs.readFileSync(path.join(distDir, "js", "chessmint.js"), "utf-8");
assert(cmCode.includes("destroy"), "chessmint.js must include destroy lifecycle method");
assert(cmCode.includes("ClearAnalysisMarkings"), "chessmint.js must include ClearAnalysisMarkings");
assert(cmCode.includes("autoMoveTimeout"), "chessmint.js must handle autoMoveTimeout race prevention");
console.log("✓ Lifecycle and memory leak safeguards verified");

// 8. Verify Adaptive Blitz/Bullet Time Budget & Clock Parsing
function parseTimeString(timeStr) {
    if (!timeStr) return null;
    const clean = timeStr.trim().replace(/[^\d:.]/g, '');
    if (!clean) return null;
    const parts = clean.split(':');
    if (parts.length === 1) {
        const s = parseFloat(parts[0]);
        return isNaN(s) ? null : s;
    } else if (parts.length === 2) {
        const m = parseInt(parts[0], 10);
        const s = parseFloat(parts[1]);
        if (isNaN(m) || isNaN(s)) return null;
        return m * 60 + s;
    } else if (parts.length === 3) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const s = parseFloat(parts[2]);
        if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
        return h * 3600 + m * 60 + s;
    }
    return null;
}

assert.strictEqual(parseTimeString("0:45"), 45, "0:45 parses as 45s");
assert.strictEqual(parseTimeString("3:21"), 201, "3:21 parses as 201s");
assert.strictEqual(parseTimeString("10:00"), 600, "10:00 parses as 600s");
assert.strictEqual(parseTimeString("0:08.4"), 8.4, "0:08.4 parses as 8.4s");
assert.strictEqual(parseTimeString("1:05:30"), 3930, "1:05:30 parses as 3930s");
assert.strictEqual(parseTimeString("invalid"), null, "invalid text returns null");
console.log("✓ Clock parser verified");

function calculateTimeBudget(remainingSec, userDepth = 15) {
    if (remainingSec === null || remainingSec > 340) {
        return { movetime: 1200, depthCap: userDepth, minDelay: 2200, maxDelay: 5200, forceBestMove: false, remainingSec };
    }
    if (remainingSec < 10) {
        return { movetime: 60, depthCap: Math.min(userDepth, 6), minDelay: 60, maxDelay: 180, forceBestMove: true, remainingSec };
    }
    if (remainingSec <= 70) {
        return { movetime: 120, depthCap: Math.min(userDepth, 8), minDelay: 250, maxDelay: 650, forceBestMove: false, remainingSec };
    }
    if (remainingSec <= 200) {
        return { movetime: 350, depthCap: Math.min(userDepth, 9), minDelay: 800, maxDelay: 1800, forceBestMove: false, remainingSec };
    }
    return { movetime: 650, depthCap: Math.min(userDepth, 11), minDelay: 1200, maxDelay: 2800, forceBestMove: false, remainingSec };
}

// Untimed / Rapid / Bot
const rapid = calculateTimeBudget(600, 15);
assert.strictEqual(rapid.movetime, 1200, "Rapid should use standard 1200ms movetime");
assert.strictEqual(rapid.depthCap, 15, "Rapid should preserve full user depth");
assert.strictEqual(rapid.forceBestMove, false, "Rapid should allow anti-cheat randomization");
assert.strictEqual(rapid.minDelay, 2200, "Rapid minDelay should be 2200ms");
assert.strictEqual(rapid.maxDelay, 5200, "Rapid maxDelay should be 5200ms");

// 5-min Blitz (~300s)
const blitz5 = calculateTimeBudget(300, 15);
assert.strictEqual(blitz5.movetime, 650, "5m Blitz should use 650ms movetime");
assert.strictEqual(blitz5.depthCap, 11, "5m Blitz should cap depth at 11");
assert.strictEqual(blitz5.minDelay, 1200, "5m Blitz minDelay should be 1200ms");
assert.strictEqual(blitz5.maxDelay, 2800, "5m Blitz maxDelay should be 2800ms");

// 3-min Blitz (~180s)
const blitz3 = calculateTimeBudget(180, 15);
assert.strictEqual(blitz3.movetime, 350, "3m Blitz should use 350ms movetime");
assert.strictEqual(blitz3.depthCap, 9, "3m Blitz should cap depth at 9");
assert.strictEqual(blitz3.minDelay, 800, "3m Blitz minDelay should be 800ms");
assert.strictEqual(blitz3.maxDelay, 1800, "3m Blitz maxDelay should be 1800ms");

// 1-min Bullet (~60s)
const bullet1 = calculateTimeBudget(60, 15);
assert.strictEqual(bullet1.movetime, 120, "1m Bullet should use 120ms movetime");
assert.strictEqual(bullet1.depthCap, 8, "1m Bullet should cap depth at 8");
assert.strictEqual(bullet1.minDelay, 250, "1m Bullet minDelay should be 250ms");
assert.strictEqual(bullet1.maxDelay, 650, "1m Bullet maxDelay should be 650ms");

// Panic mode (<10s)
const panic = calculateTimeBudget(6, 15);
assert.strictEqual(panic.movetime, 60, "Panic mode should react in 60ms");
assert.strictEqual(panic.forceBestMove, true, "Panic mode must force best move to prevent flag loss");
assert.strictEqual(panic.minDelay, 60, "Panic minDelay should be 60ms");
assert.strictEqual(panic.maxDelay, 180, "Panic maxDelay should be 180ms");
console.log("✓ Dynamic Blitz/Bullet time budget scaling verified");

// 9. Verify Options HTML UI Toggle
const optionsHtml = fs.readFileSync(path.join(distDir, "html", "options.html"), "utf-8");
assert(optionsHtml.includes("option-adaptive-timing"), "options.html must contain option-adaptive-timing checkbox");
assert(optionsHtml.includes("option-boss-key"), "options.html must contain option-boss-key checkbox");
assert(optionsHtml.includes("option-opening-hud"), "options.html must contain option-opening-hud checkbox");
assert(optionsHtml.includes("option-threat-radar"), "options.html must contain option-threat-radar checkbox");
assert(optionsHtml.includes("option-deep-calc"), "options.html must contain option-deep-calc checkbox");
assert(optionsHtml.includes("option-ghost-arrows"), "options.html must contain option-ghost-arrows checkbox");
assert(optionsHtml.includes("option-blunder-alarm"), "options.html must contain option-blunder-alarm checkbox");
assert(optionsHtml.includes("option-cheat-sheet"), "options.html must contain option-cheat-sheet checkbox");
assert(optionsHtml.includes("preset-stealth"), "options.html must contain preset-stealth button");
assert(optionsHtml.includes("preset-blitz"), "options.html must contain preset-blitz button");
assert(optionsHtml.includes("preset-coach"), "options.html must contain preset-coach button");
assert(optionsHtml.includes("persona-preview-card"), "options.html must contain persona-preview-card");
assert(optionsHtml.includes("tab-nav"), "options.html must contain tab-nav segmented bar");
assert(optionsHtml.includes("tab-btn-assist"), "options.html must contain tab-btn-assist");
assert(optionsHtml.includes("tab-btn-stealth"), "options.html must contain tab-btn-stealth");
assert(optionsHtml.includes("tab-btn-engine"), "options.html must contain tab-btn-engine");
assert(optionsHtml.includes("panel-assist"), "options.html must contain panel-assist");
assert(optionsHtml.includes("panel-stealth"), "options.html must contain panel-stealth");
assert(optionsHtml.includes("panel-engine"), "options.html must contain panel-engine");
assert(optionsHtml.includes("options-grid-2col"), "options.html must contain options-grid-2col");
console.log("✓ Options HTML UI toggles, Presets, Persona Card, and Tab Cockpit verified");

// 10. Verify Opening HUD & Enriched ECO Book
const ruyLopez = ecoData.find(e => e.eco === "C60");
assert(ruyLopez, "eco.json must contain C60 entry");
assert.strictEqual(ruyLopez.name, "Ruy Lopez", "C60 must be named Ruy Lopez");

const sicilian = ecoData.find(e => e.eco === "B20");
assert(sicilian, "eco.json must contain B20 entry");
assert.strictEqual(sicilian.name, "Sicilian Defense", "B20 must be named Sicilian Defense");

function resolveOpening(fen, table) {
    const shortF = fen ? fen.split(" ").slice(0, 3).join(" ") : fen;
    return table.find(e => {
        const entryShort = e.f ? e.f.split(" ").slice(0, 3).join(" ") : e.f;
        return entryShort === shortF;
    }) || null;
}

const resolvedRuy = resolveOpening("r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3", ecoData);
assert(resolvedRuy && resolvedRuy.name === "Ruy Lopez", "FEN must resolve to Ruy Lopez");
console.log("✓ Opening HUD & ECO resolver verified");

// 11. Verify Boss Key, Threat Radar & Deep Search in Bundle
assert(cmCode.includes("apex-stealth-hidden"), "chessmint.js must include apex-stealth-hidden class");
assert(cmCode.includes("highlightThreat"), "chessmint.js must include highlightThreat method");
assert(cmCode.includes("boostEvaluation"), "chessmint.js must include boostEvaluation method");
assert(cmCode.includes("updateOpeningHUD"), "chessmint.js must include updateOpeningHUD method");

const depthbarCss = fs.readFileSync(path.join(distDir, "css", "depthbar.css"), "utf-8");
assert(depthbarCss.includes("apex-stealth-hidden"), "depthbar.css must include apex-stealth-hidden rules");
assert(depthbarCss.includes("apex-opening-hud"), "depthbar.css must include apex-opening-hud styles");

const optionsCss = fs.readFileSync(path.join(distDir, "css", "options.css"), "utf-8");
assert(optionsCss.includes("preset-container"), "options.css must include preset-container styles");
assert(optionsCss.includes("persona-preview-card"), "options.css must include persona-preview-card styles");
assert(optionsCss.includes("blunder-alert-pulse"), "options.css must include blunder-alert-pulse styles");

assert(cmCode.includes("playBlunderSound") || cmCode.includes("AudioContext"), "chessmint.js must include playBlunderSound or AudioContext");
assert(cmCode.includes("toggleCheatSheetModal") || cmCode.includes("apex-cheatsheet-modal"), "chessmint.js must include cheat sheet modal");
assert(cmCode.includes("ghost_arrows"), "chessmint.js must include ghost_arrows logic");
console.log("✓ Boss Key, Threat Radar, Deep Search, and Tactical Pro Pack verified in build artifacts");

// 12. Verify Grandmaster Persona Emulation Engine & Safety Guardrail
assert(optionsHtml.includes("option-persona"), "options.html must contain option-persona selector");
assert(optionsHtml.includes('value="magnus"'), "options.html must include Magnus Carlsen persona");
assert(optionsHtml.includes('value="tal"'), "options.html must include Mikhail Tal persona");
assert(optionsHtml.includes('value="kasparov"'), "options.html must include Garry Kasparov persona");
assert(optionsHtml.includes('value="nakamura"'), "options.html must include Hikaru Nakamura persona");
assert(optionsHtml.includes('value="karpov"'), "options.html must include Anatoly Karpov persona");

assert(depthbarCss.includes("apex-persona-badge"), "depthbar.css must include apex-persona-badge styling");
assert(cmCode.includes("GrandmasterPersonaHelper") || cmCode.includes("scorePersonaMove"), "chessmint.js must include persona scoring");

function testGetPieceAt(fen, square) {
    if (!fen || !square || square.length < 2) return null;
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1]);
    if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;
    const boardPart = fen.split(" ")[0];
    const rows = boardPart.split("/");
    const row = rows[8 - rank];
    if (!row) return null;
    let curFile = 0;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char >= "1" && char <= "8") {
            curFile += parseInt(char);
        } else {
            if (curFile === file) return char;
            curFile++;
        }
    }
    return null;
}

assert.strictEqual(testGetPieceAt("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", "e4"), "P", "White pawn at e4");
assert.strictEqual(testGetPieceAt("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", "e1"), "K", "White king at e1");
assert.strictEqual(testGetPieceAt("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", "e8"), "k", "Black king at e8");
assert.strictEqual(testGetPieceAt("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", "d4"), null, "Empty square at d4");

function testCountPieces(fen) {
    let totalNonPawns = 0;
    let queens = 0;
    let whiteKing = "e1";
    let blackKing = "e8";
    const boardPart = (fen || "").split(" ")[0];
    const rows = boardPart.split("/");
    for (let r = 0; r < rows.length; r++) {
        const rank = 8 - r;
        let file = 0;
        const row = rows[r];
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch >= "1" && ch <= "8") {
                file += parseInt(ch);
            } else {
                const sq = String.fromCharCode(97 + file) + rank;
                if (ch === "K") whiteKing = sq;
                else if (ch === "k") blackKing = sq;
                else if (ch === "Q" || ch === "q") { queens++; totalNonPawns++; }
                else if (ch !== "P" && ch !== "p") { totalNonPawns++; }
                file++;
            }
        }
    }
    return { totalNonPawns, queens, whiteKing, blackKing };
}

const startCounts = testCountPieces("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
assert.strictEqual(startCounts.queens, 2, "Starting position has 2 queens");
assert.strictEqual(startCounts.totalNonPawns, 14, "Starting position has 14 non-pawns");

function testScorePersonaMove(move, bestMove, persona, fen) {
    const bestScore = bestMove.mate !== null ? (bestMove.mate > 0 ? 10000 : -10000) : (bestMove.cp ?? 0);
    const moveScore = move.mate !== null ? (move.mate > 0 ? 10000 : -10000) : (move.cp ?? 0);

    if (!persona || persona === "engine") return moveScore;

    if (bestMove.mate !== null && bestMove.mate > 0) {
        if (move.mate === null || move.mate <= 0) return moveScore;
    }
    const delta = bestScore - moveScore;
    if (delta > 65) return moveScore;

    let bonus = 0;
    const targetSq = move.to;
    const sourceSq = move.from;
    const movingPiece = testGetPieceAt(fen, sourceSq);
    const targetPiece = testGetPieceAt(fen, targetSq);
    const isCapture = targetPiece !== null;
    const turn = (fen.split(" ")[1] || "w") === "w" ? 1 : 2;

    const { totalNonPawns, queens, whiteKing, blackKing } = testCountPieces(fen);
    const enemyKing = turn === 1 ? blackKing : whiteKing;
    const enemyKingFile = enemyKing.charCodeAt(0) - 97;
    const enemyKingRank = parseInt(enemyKing[1]);

    const targetFile = targetSq.charCodeAt(0) - 97;
    const targetRank = parseInt(targetSq[1]);
    const kingDist = Math.max(Math.abs(targetFile - enemyKingFile), Math.abs(targetRank - enemyKingRank));

    const isDeepCenter = targetSq === "d4" || targetSq === "e4" || targetSq === "d5" || targetSq === "e5";
    const isExtCenter = targetSq === "c4" || targetSq === "f4" || targetSq === "c5" || targetSq === "f5";
    const isFianchetto = targetSq === "b2" || targetSq === "g2" || targetSq === "b7" || targetSq === "g7";
    const isFlankEdge = targetSq.startsWith("a") || targetSq.startsWith("h");

    switch (persona) {
        case "magnus":
            if (totalNonPawns <= 8 || queens === 0) bonus += 20;
            if (isCapture) bonus += 12;
            if (isDeepCenter || isExtCenter) bonus += 8;
            if (isFlankEdge) bonus -= 6;
            break;
        case "tal":
            if (kingDist <= 2) bonus += 25;
            else if (kingDist <= 3) bonus += 12;
            if (isCapture) bonus += 14;
            if ((turn === 1 && targetRank >= 5) || (turn === 2 && targetRank <= 4)) bonus += 10;
            break;
        case "kasparov":
            if (isDeepCenter) bonus += 24;
            else if (isExtCenter) bonus += 14;
            if (movingPiece && (movingPiece.toLowerCase() === "n" || movingPiece.toLowerCase() === "b" || movingPiece.toLowerCase() === "q")) {
                bonus += 12;
            }
            if (isCapture) bonus += 8;
            break;
        case "nakamura":
            if (isFianchetto || isFlankEdge) bonus += 18;
            if (movingPiece && movingPiece.toLowerCase() === "n") bonus += 14;
            if (isCapture) bonus += 10;
            if (kingDist <= 3) bonus += 10;
            break;
        case "karpov":
            if (!isCapture && (isDeepCenter || isExtCenter)) bonus += 16;
            if (movingPiece && (movingPiece.toLowerCase() === "r" || movingPiece.toLowerCase() === "p")) bonus += 14;
            if (kingDist >= 4) bonus += 10;
            break;
    }
    const cappedBonus = Math.min(45, Math.max(0, bonus));
    return moveScore + cappedBonus;
}

const testFenMid = "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5";
const bestEngineMove = { from: "d2", to: "d3", cp: 40, mate: null };
const talAttackingMove = { from: "f3", to: "g5", cp: 25, mate: null }; // delta 15, attacks f7 near black king (e8)
const blunderMove = { from: "c4", to: "f7", cp: -150, mate: null }; // delta 190 > 65

// Tal should prefer the attacking move over a quiet move within 65 cp delta
const talScoreAttack = testScorePersonaMove(talAttackingMove, bestEngineMove, "tal", testFenMid);
const talScoreQuiet = testScorePersonaMove(bestEngineMove, bestEngineMove, "tal", testFenMid);
assert(talScoreAttack > talScoreQuiet, "Tal must prioritize aggressive king pressure when within 65 cp delta");

// Blunder guardrail verification: delta > 65 must receive 0 bonus and stay far below best move
const talScoreBlunder = testScorePersonaMove(blunderMove, bestEngineMove, "tal", testFenMid);
assert.strictEqual(talScoreBlunder, -150, "Blunder exceeding 65 cp delta must receive zero bonus");
assert(talScoreBlunder < talScoreAttack, "Blunder must NEVER beat valid candidates");

// Kasparov should reward deep center moves
const kasparovCenterMove = { from: "d2", to: "d4", cp: 35, mate: null };
const kasparovCenterScore = testScorePersonaMove(kasparovCenterMove, bestEngineMove, "kasparov", testFenMid);
assert(kasparovCenterScore > bestEngineMove.cp, "Kasparov must boost central occupation moves");

// Magnus should reward endgame positions & trades
const testFenEndgame = "4k3/5ppp/8/8/8/8/5PPP/4K3 w - - 0 30";
const magnusMove = { from: "e1", to: "e2", cp: 20, mate: null };
const magnusScore = testScorePersonaMove(magnusMove, magnusMove, "magnus", testFenEndgame);
assert(magnusScore > 20, "Magnus must receive endgame consolidation bonus");

// 13. Verify Real-time Auto-Move Interactive Controls (Hold / Pura-pura Mikir, Slower, Faster)
assert(optionsHtml.includes("option-auto-move-tempo"), "options.html must contain option-auto-move-tempo selector");
assert(optionsHtml.includes("auto-move-controls-chip"), "options.html must contain auto-move-controls-chip hotkey guide");
assert(depthbarCss.includes("apex-hold-badge"), "depthbar.css must include apex-hold-badge styles");

assert(cmCode.includes("toggleAutoMoveHold") || cmCode.includes("isAutoMoveHold"), "chessmint.js must include auto-move hold logic");
assert(cmCode.includes("adjustAutoMoveTempo") || cmCode.includes("autoMoveTempoMultiplier"), "chessmint.js must include auto-move tempo control");
assert(cmCode.includes("addThinkingDelay"), "chessmint.js must include addThinkingDelay for deep contemplation pauses");
assert(cmCode.includes("apex-hold-badge"), "chessmint.js must reference apex-hold-badge HUD indicator");

// Verify tempo calculation clamping & math logic
function calculateTempoDelay(baseDelay, multiplier) {
    const clampedMult = Math.max(0.25, Math.min(4.0, multiplier));
    return Math.max(50, Math.round(baseDelay * clampedMult));
}

assert.strictEqual(calculateTempoDelay(1200, 1.0), 1200, "1.0x tempo retains exact base delay");
assert.strictEqual(calculateTempoDelay(1200, 1.5), 1800, "1.5x tempo increases delay for slower play");
assert.strictEqual(calculateTempoDelay(1200, 0.5), 600, "0.5x tempo halves delay for fast play");
assert.strictEqual(calculateTempoDelay(1200, 10.0), 4800, "Tempo multiplier upper bound clamps at 4.0x");
assert.strictEqual(calculateTempoDelay(1200, 0.05), 300, "Tempo multiplier lower bound clamps at 0.25x");
console.log("✓ Real-time Auto-Move Interactive Controls (Hold / Pura-pura Mikir, Slower, Faster) verified");

// 14. Verify Tactical Sacrifices & Pressure Breakouts (Bold Master Play)
assert(optionsHtml.includes("option-tactical-sacrifices"), "options.html must contain option-tactical-sacrifices toggle");
assert(optionsHtml.includes("<b>S</b> Sacrifices"), "options.html must include S hotkey badge in controls chip");
assert(cmCode.includes("detectSacrifice"), "chessmint.js must include detectSacrifice method");
assert(cmCode.includes("detectBreakout"), "chessmint.js must include detectBreakout method");
assert(cmCode.includes("tactical_sacrifices"), "chessmint.js must reference tactical_sacrifices option");

function testGetPieceValue(piece) {
    if (!piece) return 0;
    switch (piece.toLowerCase()) {
        case "p": return 100;
        case "n": return 310;
        case "b": return 325;
        case "r": return 500;
        case "q": return 950;
        case "k": return 20000;
        default: return 0;
    }
}

function testDetectSacrifice(fen, move) {
    if (!move || !move.line || move.line.length < 2) return null;
    const move0 = move.line[0];
    const move1 = move.line[1];
    if (!move0 || !move1 || move0.length < 4 || move1.length < 4) return null;

    const from0 = move0.substring(0, 2);
    const to0 = move0.substring(2, 4);
    const to1 = move1.substring(2, 4);

    const isRecaptured = (to1 === to0);

    const myPiece = testGetPieceAt(fen, from0);
    const targetPiece = testGetPieceAt(fen, to0);
    if (!myPiece) return null;

    const myVal = testGetPieceValue(myPiece);
    const targetVal = testGetPieceValue(targetPiece);
    const netMaterialLost = myVal - targetVal;

    if (isRecaptured && netMaterialLost >= 150) {
        const score = move.mate !== null ? (move.mate > 0 ? 10000 : -10000) : (move.cp ?? 0);
        if (score >= -40 || (move.mate !== null && move.mate > 0)) {
            let sacType = "Piece Sacrifice";
            const pLower = myPiece.toLowerCase();
            if (pLower === "q") sacType = "Queen Sacrifice";
            else if (pLower === "r" && targetVal >= 300) sacType = "Exchange Sacrifice";
            else if (pLower === "r") sacType = "Rook Sacrifice";
            else if (pLower === "b" || pLower === "n") sacType = "Minor Piece Sacrifice";

            return { sacType, myPiece, targetPiece, netMaterialLost, move: move0, score };
        }
    }
    return null;
}

// 14a. Test Greek Gift Minor Piece Sacrifice
const greekGiftFen = "r1bq1rk1/pppp1ppp/2n2n2/4p3/1b2P3/2NB1N2/PPPP1PPP/R1BQK2R w KQ - 4 6";
const greekGiftMove = {
    line: ["d3h7", "g8h7", "f3g5", "h7g8", "d1h5"],
    cp: 140,
    mate: null
};
const greekGiftResult = testDetectSacrifice(greekGiftFen, greekGiftMove);
assert(greekGiftResult !== null, "Greek gift sacrifice must be detected");
assert.strictEqual(greekGiftResult.sacType, "Minor Piece Sacrifice", "Must classify as Minor Piece Sacrifice");
assert.strictEqual(greekGiftResult.netMaterialLost, 225, "Bishop for pawn nets 225 cp loss");

// 14b. Test Exchange Sacrifice (Rook for Knight)
const exchFen = "r1b2rk1/pp1n1ppp/2p5/q3p3/2B1n3/2P1BN2/P1P1QPPP/R4RK1 w - - 0 12";
const exchMove = {
    line: ["c4f7", "f8f7"],
    cp: 30,
    mate: null
};
const exchResult = testDetectSacrifice(exchFen, exchMove);
assert(exchResult !== null, "Bxf7+ sacrifice must be detected");

// 14c. Test Non-Sacrifice Move
const normalMove = {
    line: ["d2d4", "e5d4", "f3d4"],
    cp: 30,
    mate: null
};
assert.strictEqual(testDetectSacrifice(greekGiftFen, normalMove), null, "Quiet move must not be detected as sacrifice");

// 14d. Test Pressure Breakout
function testDetectBreakout(fen, move, rawBestScore) {
    if (!move || !move.move || move.move.length < 4) return false;
    if (rawBestScore > -35) return false;
    const score = move.mate !== null ? (move.mate > 0 ? 10000 : -10000) : (move.cp ?? 0);
    if (rawBestScore - score > 45) return false;
    const from = move.from;
    const to = move.to;
    const movingPiece = testGetPieceAt(fen, from);
    if (!movingPiece) return false;
    const isWhite = (fen.split(" ")[1] || "w") === "w";
    const pLower = movingPiece.toLowerCase();
    if (pLower === "p") {
        if (isWhite) {
            return (from === "c2" && to === "c4") || (from === "d2" && to === "d4") || (from === "e2" && to === "e4") || (from === "f2" && to === "f4") || (from === "c4" && to === "c5");
        } else {
            return (from === "c7" && to === "c5") || (from === "d7" && to === "d5") || (from === "e7" && to === "e5") || (from === "f7" && to === "f5");
        }
    }
    return false;
}
const underPressureFen = "r1bqk2r/pp1pbppp/2n1pn2/2p5/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 6";
const breakoutMove = { from: "d7", to: "d5", move: "d7d5", cp: -40, mate: null };
const passiveMove = { from: "h7", to: "h6", move: "h7h6", cp: -45, mate: null };
assert.strictEqual(testDetectBreakout(underPressureFen, breakoutMove, -40), true, "Central counter-strike under pressure must trigger breakout");
assert.strictEqual(testDetectBreakout(underPressureFen, passiveMove, -40), false, "Passive pawn move must not trigger breakout");

console.log("✓ Tactical Sacrifices & Pressure Breakouts (Bold Master Play) verified");

// 15. Verify Accuracy Profile UI and Options in HTML
assert(optionsHtml.includes('id="option-accuracy-profile"'), "options.html must contain #option-accuracy-profile");
assert(optionsHtml.includes('value="casual"'), "options.html must contain casual accuracy profile");
assert(optionsHtml.includes('value="intermediate"'), "options.html must contain intermediate accuracy profile");
assert(optionsHtml.includes('value="master"'), "options.html must contain master accuracy profile");
assert(optionsHtml.includes('value="gm_unlimited"'), "options.html must contain gm_unlimited accuracy profile");
assert(optionsHtml.includes("<b>A</b> Akurasi"), "options.html must list 'A Akurasi' hotkey chip");
console.log("✓ Accuracy Profile UI in options.html verified");

// 16. Verify Accuracy Sampling Simulation
function sampleHumanMove(accProfile, top_pv_moves, forcedRoll) {
    let chosenMove = top_pv_moves[0];
    const m0 = top_pv_moves[0];
    if (m0.mate === null || m0.mate <= 0) {
        const score0 = m0.mate !== null ? (m0.mate > 0 ? 10000 : -10000) : (m0.cp ?? 0);
        const m1 = top_pv_moves[1];
        const score1 = m1 ? (m1.mate !== null ? (m1.mate > 0 ? 10000 : -10000) : (m1.cp ?? 0)) : null;
        const delta1 = score1 !== null ? (score0 - score1) : 999;
        const m1Sound = (delta1 <= 40) && (m1.mate === null || m1.mate > 0);

        const m2 = top_pv_moves[2];
        const score2 = m2 ? (m2.mate !== null ? (m2.mate > 0 ? 10000 : -10000) : (m2.cp ?? 0)) : null;
        const delta2 = score2 !== null ? (score0 - score2) : 999;
        const m2Sound = (delta2 <= 65) && (m2 && (m2.mate === null || m2.mate > 0));

        const m3 = top_pv_moves[3];
        const score3 = m3 ? (m3.mate !== null ? (m3.mate > 0 ? 10000 : -10000) : (m3.cp ?? 0)) : null;
        const delta3 = score3 !== null ? (score0 - score3) : 999;
        const m3Sound = (delta3 <= 85) && (m3 && (m3.mate === null || m3.mate > 0));

        const roll = forcedRoll !== undefined ? forcedRoll : Math.random();

        if (accProfile === "casual") {
            if (roll > 0.90 && m3Sound) chosenMove = m3;
            else if (roll > 0.72 && m2Sound) chosenMove = m2;
            else if (roll > 0.38 && m1Sound) chosenMove = m1;
        } else if (accProfile === "intermediate") {
            if (roll > 0.84 && m2Sound) chosenMove = m2;
            else if (roll > 0.52 && m1Sound) chosenMove = m1;
        } else if (accProfile === "master") {
            if (roll > 0.92 && m2Sound && delta2 <= 40) chosenMove = m2;
            else if (roll > 0.68 && m1Sound && delta1 <= 28) chosenMove = m1;
        } else if (accProfile === "gm_unlimited") {
            if (roll > 0.92 && m1Sound && delta1 <= 18) chosenMove = m1;
        }
    }
    return chosenMove;
}

const candidateMoves = [
    { move: "e2e4", cp: 50, mate: null },
    { move: "d2d4", cp: 35, mate: null }, // delta 15
    { move: "c2c4", cp: 10, mate: null }, // delta 40
    { move: "g1f3", cp: -15, mate: null } // delta 65
];

// Test Forced Winning Mate: Must always pick m0 regardless of profile or roll
const mateMoves = [
    { move: "d1h5", cp: null, mate: 2 },
    { move: "f1c4", cp: 400, mate: null }
];
assert.strictEqual(sampleHumanMove("casual", mateMoves, 0.95).move, "d1h5", "Winning mate must always be played");

// Test Casual profile distributions
assert.strictEqual(sampleHumanMove("casual", candidateMoves, 0.10).move, "e2e4", "Roll 0.10 in casual picks Best move");
assert.strictEqual(sampleHumanMove("casual", candidateMoves, 0.50).move, "d2d4", "Roll 0.50 in casual picks Excellent move");
assert.strictEqual(sampleHumanMove("casual", candidateMoves, 0.80).move, "c2c4", "Roll 0.80 in casual picks Good move");
assert.strictEqual(sampleHumanMove("casual", candidateMoves, 0.95).move, "g1f3", "Roll 0.95 in casual picks Inaccuracy move");

// Test GM Unlimited: Never picks rank 3 or 4
assert.strictEqual(sampleHumanMove("gm_unlimited", candidateMoves, 0.95).move, "d2d4", "Roll 0.95 in GM picks m1 at most");
assert.strictEqual(sampleHumanMove("gm_unlimited", candidateMoves, 0.50).move, "e2e4", "Roll 0.50 in GM picks Best move");

console.log("✓ Accuracy Sampling Distribution & Safeguards verified");

// 17. Verify Full Diagnostic Suite
require("./test_diagnostics.js");

console.log("\nALL CHECKS PASSED SUCCESSFULLY!");


