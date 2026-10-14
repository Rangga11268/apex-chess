const assert = require("assert");

console.log("--> Running Full Codebase Diagnostic Suite (Phase 1 & 2)...");

// Bug 1: Eval bar flip logic with undefined isWhiteOnBottom
function isEvalBarFlippedBuggy(options) {
    return (!options.isWhiteOnBottom || options.flipped);
}
function isEvalBarFlippedFixed(options) {
    return Boolean(options?.flipped) || options?.isWhiteOnBottom === false;
}

// Case: White on bottom, standard game, isWhiteOnBottom not explicitly defined
const standardOptions = { flipped: false };
assert.strictEqual(isEvalBarFlippedBuggy(standardOptions), true, "Buggy version incorrectly flips eval bar when isWhiteOnBottom is undefined");
assert.strictEqual(isEvalBarFlippedFixed(standardOptions), false, "Fixed version correctly keeps eval bar unflipped for White");

// Case: Explicitly playing Black
const blackOptions = { isWhiteOnBottom: false };
assert.strictEqual(isEvalBarFlippedFixed(blackOptions), true, "Fixed version flips when isWhiteOnBottom is false");

// Case: Explicit flipped: true
const flippedOptions = { flipped: true };
assert.strictEqual(isEvalBarFlippedFixed(flippedOptions), true, "Fixed version flips when flipped is true");
console.log("✓ Bug 1: Eval bar flipped logic test verified");

// Bug 2: Turn and playingAs normalization
function normalizeColor(val) {
    if (val === 1 || val === "1" || val === "white" || val === "w") return 1;
    if (val === 2 || val === "2" || val === "black" || val === "b") return 2;
    return null;
}

assert.strictEqual("white" === 1, false, "Buggy strict equality fails string vs number");
assert.strictEqual("1" === 1, false, "Buggy strict equality fails string number vs int");
assert.strictEqual(normalizeColor("white") === normalizeColor(1), true, "Fixed normalizer matches 'white' and 1");
assert.strictEqual(normalizeColor("1") === normalizeColor(1), true, "Fixed normalizer matches '1' and 1");
assert.strictEqual(normalizeColor("black") === normalizeColor(2), true, "Fixed normalizer matches 'black' and 2");
assert.strictEqual(normalizeColor("2") === normalizeColor(2), true, "Fixed normalizer matches '2' and 2");
assert.strictEqual(normalizeColor("white") === normalizeColor("black"), false, "Fixed normalizer distinguishes White and Black");
console.log("✓ Bug 2: Turn & playingAs color normalizer verified");

// Bug 3: Promotion matching in legal moves
const mockLegalMoves = [
    { from: "e7", to: "e8", promotion: "r" },
    { from: "e7", to: "e8", promotion: "q" },
    { from: "e7", to: "e8", promotion: "b" },
    { from: "e7", to: "e8", promotion: "n" },
];
const chosenPromotionMove = { from: "e7", to: "e8", promotion: "q" };

const buggyIndex = mockLegalMoves.findIndex(m => m.from === chosenPromotionMove.from && m.to === chosenPromotionMove.to);
assert.strictEqual(mockLegalMoves[buggyIndex].promotion, "r", "Buggy finder picked wrong underpromotion (Rook instead of Queen)!");

const fixedIndex = mockLegalMoves.findIndex(m =>
    m.from === chosenPromotionMove.from &&
    m.to === chosenPromotionMove.to &&
    (!chosenPromotionMove.promotion || !m.promotion || m.promotion.toLowerCase() === chosenPromotionMove.promotion.toLowerCase())
);
assert.strictEqual(mockLegalMoves[fixedIndex].promotion, "q", "Fixed finder accurately matched Queen promotion!");
console.log("✓ Bug 3: Legal move promotion disambiguation verified");

// Bug 4: Effect type highlight color mapping
const highlightColors = {
    "Brilliant": "#1baca6",
    "GreatFind": "#5c8bb0",
    "BestMove": "#9eba5a",
    "Excellent": "#96bc4b",
    "Good": "#96af8b",
    "Book": "#a88865",
    "Inaccuracy": "#f0c15c",
    "Mistake": "#e6912c",
    "Blunder": "#b33430",
    "MissedWin": "#dbac16",
};

assert.strictEqual(highlightColors["ResignWhite"], undefined, "ResignWhite is undefined in highlightColors!");
assert(highlightColors["Good"] !== undefined, "Good is valid in highlightColors");
console.log("✓ Bug 4: Effect type highlight color mapping verified");

// Bug 5: FEN resolver case-insensitivity
function getFenSafe(controller) {
    if (typeof controller.getFEN === "function") return controller.getFEN();
    if (typeof controller.getFen === "function") return controller.getFen();
    return "";
}

const mockControllerLower = { getFen: () => "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" };
const mockControllerUpper = { getFEN: () => "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" };

assert.strictEqual(getFenSafe(mockControllerLower).length > 0, true, "Handles lowercase getFen");
assert.strictEqual(getFenSafe(mockControllerUpper).length > 0, true, "Handles uppercase getFEN");
console.log("✓ Bug 5: Dual FEN accessor verified");

console.log("\n--> ALL DIAGNOSTIC TESTS PASSED! Ready to patch codebase.");
