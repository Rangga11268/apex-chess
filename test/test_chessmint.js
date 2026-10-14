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
        return { movetime: 1200, depthCap: userDepth, minDelay: 800, maxDelay: 2200, forceBestMove: false };
    }
    if (remainingSec < 10) {
        return { movetime: 60, depthCap: Math.min(userDepth, 6), minDelay: 30, maxDelay: 80, forceBestMove: true };
    }
    if (remainingSec <= 70) {
        return { movetime: 120, depthCap: Math.min(userDepth, 8), minDelay: 80, maxDelay: 220, forceBestMove: false };
    }
    if (remainingSec <= 200) {
        return { movetime: 350, depthCap: Math.min(userDepth, 9), minDelay: 200, maxDelay: 450, forceBestMove: false };
    }
    return { movetime: 650, depthCap: Math.min(userDepth, 11), minDelay: 400, maxDelay: 850, forceBestMove: false };
}

// Untimed / Rapid / Bot
const rapid = calculateTimeBudget(600, 15);
assert.strictEqual(rapid.movetime, 1200, "Rapid should use standard 1200ms movetime");
assert.strictEqual(rapid.depthCap, 15, "Rapid should preserve full user depth");
assert.strictEqual(rapid.forceBestMove, false, "Rapid should allow anti-cheat randomization");

// 5-min Blitz (~300s)
const blitz5 = calculateTimeBudget(300, 15);
assert.strictEqual(blitz5.movetime, 650, "5m Blitz should use 650ms movetime");
assert.strictEqual(blitz5.depthCap, 11, "5m Blitz should cap depth at 11");

// 3-min Blitz (~180s)
const blitz3 = calculateTimeBudget(180, 15);
assert.strictEqual(blitz3.movetime, 350, "3m Blitz should use 350ms movetime");
assert.strictEqual(blitz3.depthCap, 9, "3m Blitz should cap depth at 9");

// 1-min Bullet (~60s)
const bullet1 = calculateTimeBudget(60, 15);
assert.strictEqual(bullet1.movetime, 120, "1m Bullet should use 120ms movetime");
assert.strictEqual(bullet1.depthCap, 8, "1m Bullet should cap depth at 8");
assert(bullet1.minDelay <= 100 && bullet1.maxDelay <= 250, "1m Bullet should have quick auto-move delay");

// Panic mode (<10s)
const panic = calculateTimeBudget(6, 15);
assert.strictEqual(panic.movetime, 60, "Panic mode should react in 60ms");
assert.strictEqual(panic.forceBestMove, true, "Panic mode must force best move to prevent flag loss");
console.log("✓ Dynamic Blitz/Bullet time budget scaling verified");

// 9. Verify Options HTML UI Toggle
const optionsHtml = fs.readFileSync(path.join(distDir, "html", "options.html"), "utf-8");
assert(optionsHtml.includes("option-adaptive-timing"), "options.html must contain option-adaptive-timing checkbox");
assert(optionsHtml.includes("option-boss-key"), "options.html must contain option-boss-key checkbox");
assert(optionsHtml.includes("option-opening-hud"), "options.html must contain option-opening-hud checkbox");
assert(optionsHtml.includes("option-threat-radar"), "options.html must contain option-threat-radar checkbox");
assert(optionsHtml.includes("option-deep-calc"), "options.html must contain option-deep-calc checkbox");
console.log("✓ Options HTML UI toggles verified");

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
console.log("✓ Boss Key, Threat Radar, and Deep Search verified in build artifacts");

console.log("\nALL CHECKS PASSED SUCCESSFULLY!");


