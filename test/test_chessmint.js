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

console.log("\nALL CHECKS PASSED SUCCESSFULLY!");
