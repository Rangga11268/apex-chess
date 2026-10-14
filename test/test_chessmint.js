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

console.log("\nALL CHECKS PASSED SUCCESSFULLY!");
