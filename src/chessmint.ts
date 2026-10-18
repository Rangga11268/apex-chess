var master: ChessMint | null = null;
var Config: any = (window as any).Config || undefined;
var context: any = undefined;
var ecoTable: Map<string, any> | null = null;

var apexHUDToastTimeout: any = null;
function showApexHUDToast(text: string, duration = 2400)
{
    try
    {
        let toast = document.querySelector(".apex-deep-toast") as HTMLElement;
        if (!toast)
        {
            toast = document.createElement("div");
            toast.className = "apex-deep-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = text;
        toast.style.opacity = "1";

        if (apexHUDToastTimeout) clearTimeout(apexHUDToastTimeout);
        apexHUDToastTimeout = setTimeout(() =>
        {
            if (toast) toast.style.opacity = "0";
        }, duration);
    }
    catch (_) {}
}

function notify(content: string, icon = "circle-info")
{
    try
    {
        let handledByNative = false;
        const toaster = (window as any).toaster;

        if (typeof toaster?.add === "function")
        {
            const notiId = "chessmint-settings-notification";

            if (Array.isArray(toaster.notifications))
            {
                const existingIndex = toaster.notifications.findIndex((n: any) => n && n.id === notiId);
                if (existingIndex !== -1)
                {
                    return;
                }
            }

            toaster.add({
                id: notiId,
                duration: 2500,
                icon: icon,
                content: content,
                text: content,
                message: content,
                title: content,
                description: content,
                body: content,
                html: `<span>${content}</span>`,
            });
            handledByNative = true;

            setTimeout(() =>
            {
                try
                {
                    const toastCards = document.querySelectorAll(
                        ".toaster-container > *, [class*='toaster-notification'], [class*='toaster-item'], [class*='cc-toaster-item'], [class*='toast-message']"
                    );
                    let foundVisibleText = false;
                    toastCards.forEach((card) =>
                    {
                        const rawText = card.textContent?.replace(/[\s×✕]/g, "") || "";
                        if (rawText.length > 0)
                        {
                            foundVisibleText = true;
                        }
                        else
                        {
                            let msgEl = card.querySelector(".apex-toast-injected") as HTMLElement;
                            if (!msgEl)
                            {
                                msgEl = document.createElement("div");
                                msgEl.className = "apex-toast-injected";
                                card.insertBefore(msgEl, card.firstChild);
                            }
                            msgEl.textContent = content;
                            msgEl.style.color = "#ffffff";
                            msgEl.style.fontSize = "13px";
                            msgEl.style.fontWeight = "600";
                            msgEl.style.padding = "6px 12px";
                            msgEl.style.display = "block";
                            msgEl.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                            foundVisibleText = true;
                        }
                    });

                    if (!foundVisibleText && toastCards.length === 0)
                    {
                        showApexHUDToast(content);
                    }
                }
                catch (_)
                {
                    showApexHUDToast(content);
                }
            }, 60);
        }

        if (!handledByNative)
        {
            showApexHUDToast(content);
            console.log(`[Apex Chess] ${content}`);
        }
    }
    catch (e)
    {
        showApexHUDToast(content);
        console.log(`[Apex Chess] ${content}`);
    }
}

function normalizeColor(val: any): number | null
{
    if (val === 1 || val === "1" || val === "white" || val === "w") return 1;
    if (val === 2 || val === "2" || val === "black" || val === "b") return 2;
    return null;
}

class TopMove
{
    readonly from: string;
    readonly to: string;
    readonly line: string[];
    readonly move: string;
    readonly depth: number;
    readonly promotion: string | null;
    readonly cp: number | null;
    readonly mate: number | null;

    constructor(line: string, depth: number, cp: number | null, mate: number | null)
    {
        this.line = line.split(" ");
        this.move = this.line[0];
        this.promotion = this.move.length > 4 ? this.move.substring(4, 5) : null;
        this.from = this.move.substring(0, 2);
        this.to = this.move.substring(2, 4);
        this.cp = cp;
        this.mate = mate;
        this.depth = depth;
    }
}

export class GrandmasterPersonaHelper
{
    static readonly PERSONAS: Record<TGrandmasterPersona, {
        id: TGrandmasterPersona;
        name: string;
        badge: string;
        tagline: { id: string; en: string };
    }> = {
        engine: {
            id: "engine",
            name: "Stockfish Pure",
            badge: "Stockfish",
            tagline: { id: "Kalkulasi engine murni tanpa bias", en: "Pure unbiased engine calculation" }
        },
        magnus: {
            id: "magnus",
            name: "Magnus Carlsen",
            badge: "GM Carlsen",
            tagline: { id: "Squeeze endgame & posisi bebas risiko", en: "Endgame squeeze & low-risk control" }
        },
        tal: {
            id: "tal",
            name: "Mikhail Tal",
            badge: "GM Tal",
            tagline: { id: "Serangan taktis, inisiatif & pengorbanan", en: "Tactical assault & sacrificial attack" }
        },
        kasparov: {
            id: "kasparov",
            name: "Garry Kasparov",
            badge: "GM Kasparov",
            tagline: { id: "Dominasi pusat & inisiatif dinamis", en: "Central dominance & dynamic initiative" }
        },
        nakamura: {
            id: "nakamura",
            name: "Hikaru Nakamura",
            badge: "GM Nakamura",
            tagline: { id: "Taktik kilat, jebakan tajam & swindle", en: "Speed tactics, sharp traps & swindles" }
        },
        karpov: {
            id: "karpov",
            name: "Anatoly Karpov",
            badge: "GM Karpov",
            tagline: { id: "Profilaksis & cekikan posisional", en: "Prophylaxis & positional squeeze" }
        }
    };

    static getPieceAt(fen: string, square: string): string | null
    {
        if (!fen || !square || square.length < 2) return null;
        const file = square.charCodeAt(0) - 97; // 0..7 for a..h
        const rank = parseInt(square[1]);       // 1..8
        if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;

        const boardPart = fen.split(" ")[0];
        const rows = boardPart.split("/");
        const row = rows[8 - rank];
        if (!row) return null;

        let curFile = 0;
        for (let i = 0; i < row.length; i++)
        {
            const char = row[i];
            if (char >= "1" && char <= "8")
            {
                curFile += parseInt(char);
            }
            else
            {
                if (curFile === file) return char;
                curFile++;
            }
        }
        return null;
    }

    static countPieces(fen: string): { totalNonPawns: number; queens: number; whiteKing: string; blackKing: string }
    {
        let totalNonPawns = 0;
        let queens = 0;
        let whiteKing = "e1";
        let blackKing = "e8";

        const boardPart = (fen || "").split(" ")[0];
        const rows = boardPart.split("/");
        for (let r = 0; r < rows.length; r++)
        {
            const rank = 8 - r;
            let file = 0;
            const row = rows[r];
            for (let i = 0; i < row.length; i++)
            {
                const ch = row[i];
                if (ch >= "1" && ch <= "8")
                {
                    file += parseInt(ch);
                }
                else
                {
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

    static getPieceValue(piece: string | null): number
    {
        if (!piece) return 0;
        switch (piece.toLowerCase())
        {
            case "p": return 100;
            case "n": return 310;
            case "b": return 325;
            case "r": return 500;
            case "q": return 950;
            case "k": return 20000;
            default: return 0;
        }
    }

    static detectSacrifice(fen: string, move: TopMove): {
        sacType: string;
        myPiece: string;
        targetPiece: string | null;
        netMaterialLost: number;
        move: string;
        score: number;
    } | null
    {
        if (!move || !move.line || move.line.length < 2) return null;
        const move0 = move.line[0];
        const move1 = move.line[1];
        if (!move0 || !move1 || move0.length < 4 || move1.length < 4) return null;

        const from0 = move0.substring(0, 2);
        const to0 = move0.substring(2, 4);
        const to1 = move1.substring(2, 4);

        const isRecaptured = (to1 === to0);

        const myPiece = this.getPieceAt(fen, from0);
        const targetPiece = this.getPieceAt(fen, to0);
        if (!myPiece) return null;

        const myVal = this.getPieceValue(myPiece);
        const targetVal = this.getPieceValue(targetPiece);
        const netMaterialLost = myVal - targetVal;

        if (isRecaptured && netMaterialLost >= 150)
        {
            const score = move.mate !== null ? (move.mate > 0 ? 10000 : -10000) : (move.cp ?? 0);
            if (score >= -40 || (move.mate !== null && move.mate > 0))
            {
                let sacType = "Piece Sacrifice";
                const pLower = myPiece.toLowerCase();
                if (pLower === "q") sacType = "Queen Sacrifice";
                else if (pLower === "r" && targetVal >= 300) sacType = "Exchange Sacrifice";
                else if (pLower === "r") sacType = "Rook Sacrifice";
                else if (pLower === "b" || pLower === "n") sacType = "Minor Piece Sacrifice";

                return {
                    sacType,
                    myPiece,
                    targetPiece,
                    netMaterialLost,
                    move: move0,
                    score
                };
            }
        }
        return null;
    }

    static detectBreakout(fen: string, move: TopMove, rawBestScore: number): boolean
    {
        if (!move || !move.move || move.move.length < 4) return false;
        if (rawBestScore > -35) return false;

        const score = move.mate !== null ? (move.mate > 0 ? 10000 : -10000) : (move.cp ?? 0);
        if (rawBestScore - score > 45) return false;

        const from = move.from;
        const to = move.to;
        const movingPiece = this.getPieceAt(fen, from);
        if (!movingPiece) return false;

        const isWhite = (fen.split(" ")[1] || "w") === "w";
        const pLower = movingPiece.toLowerCase();

        if (pLower === "p")
        {
            if (isWhite)
            {
                if ((from === "c2" && to === "c4") || (from === "c3" && to === "c4") ||
                    (from === "d2" && to === "d4") || (from === "d3" && to === "d4") ||
                    (from === "e2" && to === "e4") || (from === "e3" && to === "e4") ||
                    (from === "f2" && to === "f4") || (from === "f3" && to === "f4") ||
                    (from === "c4" && to === "c5") || (from === "d4" && to === "d5") ||
                    (from === "e4" && to === "e5") || (from === "f4" && to === "f5"))
                {
                    return true;
                }
            }
            else
            {
                if ((from === "c7" && to === "c5") || (from === "c6" && to === "c5") ||
                    (from === "d7" && to === "d5") || (from === "d6" && to === "d5") ||
                    (from === "e7" && to === "e5") || (from === "e6" && to === "e5") ||
                    (from === "f7" && to === "f5") || (from === "f6" && to === "f5"))
                {
                    return true;
                }
            }
        }
        else if (pLower === "n" || pLower === "b")
        {
            const isCentralSquare = to === "d4" || to === "e4" || to === "d5" || to === "e5" ||
                                    to === "c4" || to === "f4" || to === "c5" || to === "f5";
            if (isCentralSquare) return true;
        }

        return false;
    }

    /**
     * Evaluates a candidate move against a selected persona.
     * Enforces the hard anti-blunder guardrail: maximum delta cp is 65.
     */
    static scorePersonaMove(
        move: TopMove,
        bestMove: TopMove,
        persona: TGrandmasterPersona,
        fen: string,
        tacticalSacrifices: boolean = true
    ): number
    {
        const bestScore = bestMove.mate !== null ? (bestMove.mate > 0 ? 10000 : -10000) : (bestMove.cp ?? 0);
        const moveScore = move.mate !== null ? (move.mate > 0 ? 10000 : -10000) : (move.cp ?? 0);

        // Blunder guardrail: do not elevate moves if delta exceeds 65 cp
        // or if bestMove is forced mate and candidate is not
        if (bestMove.mate !== null && bestMove.mate > 0)
        {
            if (move.mate === null || move.mate <= 0) return moveScore;
        }
        const delta = bestScore - moveScore;
        if (delta > 65) return moveScore;

        let bonus = 0;

        // Tactical sacrifice bonus (Tal, Kasparov, or Bold Sacrifices enabled)
        const sacInfo = this.detectSacrifice(fen, move);
        if (sacInfo)
        {
            if (persona === "tal") bonus += 35;
            else if (persona === "kasparov" || persona === "nakamura") bonus += 25;
            else if (tacticalSacrifices) bonus += 28;
        }

        // Pressure breakout bonus (active counter-strike under pressure)
        if (this.detectBreakout(fen, move, bestScore))
        {
            bonus += 22;
        }

        if (!persona || persona === "engine")
        {
            const cappedBonusEngine = Math.min(45, Math.max(0, bonus));
            return moveScore + cappedBonusEngine;
        }

        const targetSq = move.to;
        const sourceSq = move.from;
        const movingPiece = this.getPieceAt(fen, sourceSq);
        const targetPiece = this.getPieceAt(fen, targetSq);
        const isCapture = targetPiece !== null;
        const turn = (fen.split(" ")[1] || "w") === "w" ? 1 : 2;

        const { totalNonPawns, queens, whiteKing, blackKing } = this.countPieces(fen);
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

        switch (persona)
        {
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
                if (movingPiece && (movingPiece.toLowerCase() === "n" || movingPiece.toLowerCase() === "b" || movingPiece.toLowerCase() === "q"))
                {
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
}

class GameController
{
    controller: ChessboardGame;
    chessboard: HTMLElement;
    options: GameOptions;
    private depthBar: HTMLElement | null;
    private evalBar: HTMLElement | null;
    private evalBarFill: HTMLElement | null;
    private evalScore: HTMLElement | null;
    private evalScoreAbbreviated: HTMLElement | null;
    private currentMarkings: Marking[];
    lastAnalysisMarkings: string[];
    private isStealthHidden: boolean;
    private openingHUD: HTMLElement | null;
    private deepToastTimeout: any;
    private threatMarkings: string[];
    private lastEvalScore: number | null = null;
    private cheatSheetModal: HTMLElement | null = null;
    private master: ChessMint;
    private keydownListener: ((e: KeyboardEvent) => void) | null = null;
    isDestroyed: boolean = false;

    constructor(master: ChessMint, chessboard: HTMLElement)
    {
        this.master = master;
        this.chessboard = chessboard;
        this.controller = (chessboard as any).game as ChessboardGame;
        this.options = (typeof this.controller.getOptions === "function") ? this.controller.getOptions() : {} as any;

        this.depthBar = null;
        this.evalBar = null;
        this.evalBarFill = null;
        this.evalScore = null;
        this.evalScoreAbbreviated = null;
        this.currentMarkings = [];
        this.lastAnalysisMarkings = [];
        this.isStealthHidden = false;
        this.openingHUD = null;
        this.deepToastTimeout = null;
        this.threatMarkings = [];

        this.setupHotkeys();

        // Hook to update engine on every move
        if (typeof this.controller.on === "function")
        {
            this.controller.on('Move', (event: IGameEvent) =>
            {
                this.UpdateEngine(false);
            });

            // Check if a new game has started
            this.controller.on('ModeChanged', (event: IGameEvent) =>
            {
                if (event.data === "playing" || event.data === "analyzing")
                {
                    setTimeout(() => { this.ResetGame(); }, 150);
                }
            });

            // Flip the evaluation bar when board perspective flips
            this.controller.on('UpdateOptions', (event: IGameEvent) =>
            {
                try
                {
                    this.options = this.controller.getOptions() || this.options;
                    if (event?.data?.flipped !== undefined && this.evalBar != null)
                    {
                        if (event.data.flipped) this.evalBar.classList.add("evaluation-bar-flipped");
                        else this.evalBar.classList.remove("evaluation-bar-flipped");
                    }
                }
                catch (e) {}
            });
        }

        this.CreateAnalysisTools();
        setTimeout(() => { this.ResetGame(); }, 150);
    }

    UpdateExtensionOptions()
    {
        let options = this.master.options;
        if (options.evaluation_bar && this.evalBar == null) this.CreateAnalysisTools();
        else if (!options.evaluation_bar && this.evalBar != null)
        {
            this.evalBar.remove();
            this.evalBar = null;
        }

        if (options.depth_bar && this.depthBar == null) this.CreateAnalysisTools();
        else if (!options.depth_bar && this.depthBar != null)
        {
            this.depthBar.parentElement?.remove();
            this.depthBar = null;
        }

        if (options.opening_hud && this.openingHUD == null) this.CreateAnalysisTools();
        else if (!options.opening_hud && this.openingHUD != null)
        {
            this.openingHUD.remove();
            this.openingHUD = null;
        }

        if (!options.show_hints)
        {
            this.RemoveCurrentMarkings();
        }

        if (!options.threat_radar)
        {
            this.clearThreatMarkings();
        }

        if (!options.move_analysis && this.controller.markings)
        {
            let lastMove = typeof this.controller.getLastMove === "function" ? this.controller.getLastMove() : undefined;
            if (lastMove && typeof this.controller.markings.removeOne === "function")
            {
                this.controller.markings.removeOne(`effect|${lastMove.to}`);
            }
        }

        this.updatePersonaHUD();
    }

    private CreateAnalysisTools()
    {
        let interval1 = setInterval(() =>
        {
            let layoutChessboard = this.chessboard.parentElement;
            if (layoutChessboard == null) return;

            let layoutMain = layoutChessboard.parentElement;
            if (layoutMain == null) return;

            clearInterval(interval1);

            if (this.master.options.depth_bar && this.depthBar == null)
            {
                let depthBar = document.createElement("div");
                depthBar.classList.add("depthBarLayout");
                depthBar.innerHTML = `<div class="depthBar"><span class="depthBarProgress"></span></div>`;

                layoutMain.insertBefore(depthBar, layoutChessboard.nextSibling);
                this.depthBar = depthBar.querySelector(".depthBarProgress") as HTMLElement;
            }

            if (this.master.options.evaluation_bar && this.evalBar == null)
            {
                let evalBar = document.createElement("div");
                evalBar.style.flex = "1 1 auto";
                evalBar.innerHTML = `
                <div class="evaluation-bar-bar">
                    <span class="evaluation-bar-scoreAbbreviated evaluation-bar-dark">0.0</span>
                    <span class="evaluation-bar-score evaluation-bar-dark">+0.00</span>
                    <div class="evaluation-bar-fill">
                    <div class="evaluation-bar-color evaluation-bar-black"></div>
                    <div class="evaluation-bar-color evaluation-bar-draw"></div>
                    <div class="evaluation-bar-color evaluation-bar-white" style="transform: translate3d(0px, 50%, 0px);"></div>
                    </div>
                </div>`;

                let layoutEvaluation = layoutChessboard.querySelector("#board-layout-evaluation, .board-layout-evaluation") ||
                                       layoutMain.querySelector("#board-layout-evaluation, .board-layout-evaluation");

                if (layoutEvaluation == null)
                {
                    layoutEvaluation = document.createElement("div");
                    layoutEvaluation.classList.add("board-layout-evaluation");
                    layoutChessboard.insertBefore(layoutEvaluation, layoutChessboard.firstElementChild);
                }

                layoutEvaluation.innerHTML = "";
                layoutEvaluation.appendChild(evalBar);

                this.evalBar = layoutEvaluation.querySelector(".evaluation-bar-bar");
                this.evalBarFill = layoutEvaluation.querySelector(".evaluation-bar-white");
                this.evalScore = layoutEvaluation.querySelector(".evaluation-bar-score");
                this.evalScoreAbbreviated = layoutEvaluation.querySelector(".evaluation-bar-scoreAbbreviated");

                const isFlipped = Boolean(this.options?.flipped) || this.options?.isWhiteOnBottom === false;
                if (isFlipped)
                {
                    this.evalBar?.classList.add("evaluation-bar-flipped");
                }
            }

            if (this.master.options.opening_hud !== false && this.openingHUD == null)
            {
                let hud = document.createElement("div");
                hud.id = "apex-opening-hud";
                hud.className = "apex-opening-hud apex-hud-hidden";
                hud.innerHTML = `<span class="apex-persona-badge apex-badge-hidden"></span><span class="apex-eco-code">ECO</span><span class="apex-eco-name">Opening</span>`;
                layoutMain.insertBefore(hud, layoutChessboard);
                this.openingHUD = hud;
                this.updatePersonaHUD();
            }
        }, 20);
    }

    private getFenSafe(): string
    {
        if (typeof this.controller.getFEN === "function") return this.controller.getFEN();
        if (typeof (this.controller as any).getFen === "function") return (this.controller as any).getFen();
        return "";
    }

    getRemainingTimeSeconds(): number | null
    {
        try
        {
            const normPlayingAs = normalizeColor(typeof this.controller.getPlayingAs === "function" ? this.controller.getPlayingAs() : null);
            const colorKey = normPlayingAs === 2 ? "black" : (normPlayingAs === 1 ? "white" : null);

            // 1. Controller Clock API inspection
            let clocks: any = null;
            if (typeof (this.controller as any).getClocks === "function")
            {
                clocks = (this.controller as any).getClocks();
            }
            else if (typeof (this.controller as any).timeController?.getClocks === "function")
            {
                clocks = (this.controller as any).timeController.getClocks();
            }

            if (clocks && (colorKey || normPlayingAs))
            {
                const val = colorKey ? clocks[colorKey] : clocks[normPlayingAs!];
                const ms = typeof val === "number" ? val : (typeof val?.time === "number" ? val.time : null);
                if (ms !== null && !isNaN(ms))
                {
                    return Math.max(0, ms / 1000);
                }
            }

            // 2. DOM Monospace Clock Fallback
            // On Chess.com, the player on this device sits on the bottom layout
            const clockEl = document.querySelector(
                ".clock-player-bottom .clock-time-monospace, .clock-bottom .clock-time-monospace, .player-bottom .clock-time-monospace, .clock-player-bottom [class*='time'], .clock-bottom"
            );
            if (clockEl && clockEl.textContent)
            {
                const parsed = GameController.parseTimeString(clockEl.textContent);
                if (parsed !== null) return parsed;
            }
        }
        catch (e) {}

        return null;
    }

    static parseTimeString(timeStr: string): number | null
    {
        if (!timeStr) return null;
        const clean = timeStr.trim().replace(/[^\d:.]/g, '');
        if (!clean) return null;
        const parts = clean.split(':');
        if (parts.length === 1)
        {
            const s = parseFloat(parts[0]);
            return isNaN(s) ? null : s;
        }
        else if (parts.length === 2)
        {
            const m = parseInt(parts[0], 10);
            const s = parseFloat(parts[1]);
            if (isNaN(m) || isNaN(s)) return null;
            return m * 60 + s;
        }
        else if (parts.length === 3)
        {
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const s = parseFloat(parts[2]);
            if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
            return h * 3600 + m * 60 + s;
        }
        return null;
    }

    private setupHotkeys()
    {
        this.keydownListener = (e: KeyboardEvent) =>
        {
            if (this.isDestroyed) return;
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

            if (e.key.toLowerCase() === "h" && this.master.options.boss_key_enabled !== false)
            {
                this.toggleStealthMode();
            }
            else if (e.code === "Space" && this.master.options.deep_calc_enabled !== false)
            {
                e.preventDefault();
                this.triggerDeepCalculation();
            }
            else if (e.key.toLowerCase() === "p")
            {
                e.preventDefault();
                this.master.engine?.toggleAutoMoveHold();
            }
            else if (e.key.toLowerCase() === "t")
            {
                e.preventDefault();
                this.master.engine?.addThinkingDelay(3000);
            }
            else if (e.key === "[" || (e.shiftKey && e.code === "BracketLeft"))
            {
                e.preventDefault();
                this.master.engine?.adjustAutoMoveTempo(1.35, "slower");
            }
            else if (e.key === "]" || (e.shiftKey && e.code === "BracketRight"))
            {
                e.preventDefault();
                this.master.engine?.adjustAutoMoveTempo(0.75, "faster");
            }
            else if (e.key === "\\" || e.key === "0")
            {
                e.preventDefault();
                this.master.engine?.adjustAutoMoveTempo(1.0, "reset");
            }
            else if (e.key.toLowerCase() === "s")
            {
                e.preventDefault();
                this.master.options.tactical_sacrifices = !(this.master.options.tactical_sacrifices !== false);
                const isEnabled = this.master.options.tactical_sacrifices;
                const isId = this.master.options.language === "id";
                const msg = isEnabled ?
                    (isId ? "💥 Pengorbanan Berani: AKTIF (Mode GM Taktis & Breakout)" : "💥 Bold Sacrifices: ON (GM Tactical & Breakout Mode)") :
                    (isId ? "🛡️ Pengorbanan Berani: NONAKTIF (Mode Standar Engine)" : "🛡️ Bold Sacrifices: OFF (Standard Engine Mode)");
                showApexHUDToast(msg, 2400);
                if (typeof chrome !== "undefined" && chrome.storage?.sync)
                {
                    chrome.storage.sync.set({ tactical_sacrifices: isEnabled });
                }
            }
            else if ((e.key === "?" || (e.shiftKey && e.code === "Slash")) && this.master.options.cheat_sheet_enabled !== false)
            {
                e.preventDefault();
                this.toggleCheatSheetModal();
            }
            else if (e.key === "Escape" && this.cheatSheetModal)
            {
                this.toggleCheatSheetModal(false);
            }
        };
        window.addEventListener("keydown", this.keydownListener);
    }

    private playBlunderSound(favorable: boolean)
    {
        try
        {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            const startFreq = favorable ? 587.33 : 330;
            const endFreq = favorable ? 880 : 220;
            osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.12);

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        }
        catch (_) {}
    }

    toggleCheatSheetModal(force?: boolean)
    {
        const shouldShow = force !== undefined ? force : !this.cheatSheetModal;
        if (!shouldShow)
        {
            if (this.cheatSheetModal)
            {
                this.cheatSheetModal.remove();
                this.cheatSheetModal = null;
            }
            return;
        }

        if (this.cheatSheetModal) return;

        const modal = document.createElement("div");
        modal.className = "apex-cheatsheet-modal";
        modal.innerHTML = `
            <div class="apex-cheatsheet-content">
                <div class="apex-cheatsheet-header">
                    <span class="apex-cheatsheet-title">⚡ APEX CHESS // SHORTCUTS</span>
                    <button type="button" class="apex-cheatsheet-close">&times;</button>
                </div>
                <div class="apex-cheatsheet-body">
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">H</span>
                        <span class="apex-key-desc">Boss Key (Sembunyikan / Tampilkan HUD seketika)</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">Space</span>
                        <span class="apex-key-desc">Deep Calculation (Kalkulasi Mendalam Depth 22)</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">S</span>
                        <span class="apex-key-desc">Pengorbanan Berani (Toggle GM Sacrifices & Breakouts)</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">P</span>
                        <span class="apex-key-desc">Hold / Pura-pura Mikir (Tahan / Lanjut Auto-Move)</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">[</span>
                        <span class="apex-key-desc">Play Slower (Perlambat Tempo Auto-Move)</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">]</span>
                        <span class="apex-key-desc">Play Faster (Percepat Tempo Auto-Move)</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">T</span>
                        <span class="apex-key-desc">Pura-pura Mikir (+3s jeda tambahan)</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">\\</span>
                        <span class="apex-key-desc">Reset Tempo ke 1.0x Normal</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">?</span>
                        <span class="apex-key-desc">Toggle Shortcut Cheat Sheet</span>
                    </div>
                    <div class="apex-cheatsheet-row">
                        <span class="apex-key-pill">Esc</span>
                        <span class="apex-key-desc">Tutup Menu Ini</span>
                    </div>
                </div>
            </div>
        `;

        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100vw";
        modal.style.height = "100vh";
        modal.style.background = "rgba(4, 7, 13, 0.75)";
        modal.style.backdropFilter = "blur(4px)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = "999999";
        modal.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

        const content = modal.querySelector(".apex-cheatsheet-content") as HTMLElement;
        if (content)
        {
            content.style.background = "#0d131f";
            content.style.border = "1px solid rgba(56, 189, 248, 0.3)";
            content.style.borderRadius = "8px";
            content.style.padding = "16px 20px";
            content.style.maxWidth = "360px";
            content.style.width = "90%";
            content.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.8)";
            content.style.color = "#f8fafc";
        }

        const header = modal.querySelector(".apex-cheatsheet-header") as HTMLElement;
        if (header)
        {
            header.style.display = "flex";
            header.style.justifyContent = "space-between";
            header.style.alignItems = "center";
            header.style.borderBottom = "1px solid rgba(255, 255, 255, 0.08)";
            header.style.paddingBottom = "10px";
            header.style.marginBottom = "14px";
        }

        const title = modal.querySelector(".apex-cheatsheet-title") as HTMLElement;
        if (title)
        {
            title.style.fontSize = "12px";
            title.style.fontWeight = "800";
            title.style.letterSpacing = "0.06em";
            title.style.color = "#38bdf8";
        }

        const closeBtn = modal.querySelector(".apex-cheatsheet-close") as HTMLElement;
        if (closeBtn)
        {
            closeBtn.style.background = "transparent";
            closeBtn.style.border = "none";
            closeBtn.style.color = "#94a3b8";
            closeBtn.style.fontSize = "20px";
            closeBtn.style.cursor = "pointer";
            closeBtn.style.lineHeight = "1";
            closeBtn.onclick = () => this.toggleCheatSheetModal(false);
        }

        modal.querySelectorAll(".apex-cheatsheet-row").forEach(r =>
        {
            const row = r as HTMLElement;
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "12px";
            row.style.marginBottom = "10px";
        });

        modal.querySelectorAll(".apex-key-pill").forEach(k =>
        {
            const pill = k as HTMLElement;
            pill.style.background = "#1e293b";
            pill.style.border = "1px solid rgba(255, 255, 255, 0.15)";
            pill.style.color = "#00e5ff";
            pill.style.fontWeight = "700";
            pill.style.fontSize = "11px";
            pill.style.padding = "4px 8px";
            pill.style.borderRadius = "4px";
            pill.style.minWidth = "36px";
            pill.style.textAlign = "center";
        });

        modal.querySelectorAll(".apex-key-desc").forEach(d =>
        {
            const desc = d as HTMLElement;
            desc.style.fontSize = "12px";
            desc.style.color = "#cbd5e1";
            desc.style.lineHeight = "1.3";
        });

        modal.addEventListener("click", (e) =>
        {
            if (e.target === modal)
            {
                this.toggleCheatSheetModal(false);
            }
        });

        document.body.appendChild(modal);
        this.cheatSheetModal = modal;
    }

    toggleStealthMode(force?: boolean)
    {
        this.isStealthHidden = force !== undefined ? force : !this.isStealthHidden;
        if (this.isStealthHidden)
        {
            document.body.classList.add("apex-stealth-hidden");
            this.RemoveCurrentMarkings();
            this.ClearAnalysisMarkings();
            this.clearThreatMarkings();
        }
        else
        {
            document.body.classList.remove("apex-stealth-hidden");
            this.master.engine.UpdatePosition(this.getFenSafe(), false);
        }
    }

    triggerDeepCalculation()
    {
        if (this.isStealthHidden) return;
        showApexHUDToast("Deep Calc: Depth 22");
        this.master.engine.boostEvaluation(22, 4000);
    }

    private showDeepToast(text: string)
    {
        showApexHUDToast(text);
    }

    updatePersonaHUD()
    {
        if (!this.openingHUD) return;
        const persona = this.master.options.persona || "engine";
        const badgeEl = this.openingHUD.querySelector(".apex-persona-badge") as HTMLElement;
        const codeEl = this.openingHUD.querySelector(".apex-eco-code") as HTMLElement;
        const nameEl = this.openingHUD.querySelector(".apex-eco-name") as HTMLElement;

        if (persona !== "engine" && GrandmasterPersonaHelper.PERSONAS[persona])
        {
            const p = GrandmasterPersonaHelper.PERSONAS[persona];
            const isId = this.master.options.language === "id";
            if (badgeEl)
            {
                badgeEl.textContent = p.badge;
                badgeEl.classList.remove("apex-badge-hidden");
            }
            if (codeEl && (!codeEl.textContent || codeEl.textContent === "ECO")) codeEl.textContent = "PERSONA";
            if (nameEl && (!nameEl.textContent || nameEl.textContent === "Opening"))
            {
                nameEl.textContent = isId ? p.tagline.id : p.tagline.en;
            }
            this.openingHUD.classList.remove("apex-hud-hidden");
        }
        else
        {
            if (badgeEl) badgeEl.classList.add("apex-badge-hidden");
            if (codeEl && codeEl.textContent === "PERSONA")
            {
                this.openingHUD.classList.add("apex-hud-hidden");
            }
        }
    }

    updateOpeningHUD(info: EcoOpeningInfo)
    {
        if (!this.openingHUD || this.master.options.opening_hud === false) return;
        const persona = this.master.options.persona || "engine";
        const badgeEl = this.openingHUD.querySelector(".apex-persona-badge") as HTMLElement;
        const codeEl = this.openingHUD.querySelector(".apex-eco-code") as HTMLElement;
        const nameEl = this.openingHUD.querySelector(".apex-eco-name") as HTMLElement;

        if (badgeEl)
        {
            if (persona !== "engine" && GrandmasterPersonaHelper.PERSONAS[persona])
            {
                badgeEl.textContent = GrandmasterPersonaHelper.PERSONAS[persona].badge;
                badgeEl.classList.remove("apex-badge-hidden");
            }
            else
            {
                badgeEl.classList.add("apex-badge-hidden");
            }
        }

        if (info && info.name)
        {
            if (codeEl) codeEl.textContent = info.eco || "ECO";
            if (nameEl) nameEl.textContent = info.name;
            this.openingHUD.classList.remove("apex-hud-hidden");
        }
    }

    hideOpeningHUD()
    {
        if (this.openingHUD)
        {
            const persona = this.master.options.persona || "engine";
            if (persona !== "engine" && GrandmasterPersonaHelper.PERSONAS[persona])
            {
                const p = GrandmasterPersonaHelper.PERSONAS[persona];
                const isId = this.master.options.language === "id";
                const badgeEl = this.openingHUD.querySelector(".apex-persona-badge") as HTMLElement;
                const codeEl = this.openingHUD.querySelector(".apex-eco-code") as HTMLElement;
                const nameEl = this.openingHUD.querySelector(".apex-eco-name") as HTMLElement;
                if (badgeEl)
                {
                    badgeEl.textContent = p.badge;
                    badgeEl.classList.remove("apex-badge-hidden");
                }
                if (codeEl) codeEl.textContent = "PERSONA";
                if (nameEl) nameEl.textContent = isId ? p.tagline.id : p.tagline.en;
                this.openingHUD.classList.remove("apex-hud-hidden");
                return;
            }
            this.openingHUD.classList.add("apex-hud-hidden");
        }
    }

    private checkOpeningHUD(fen: string)
    {
        if (this.master.options.opening_hud === false || !this.openingHUD) return;
        if (!ecoTable)
        {
            this.updatePersonaHUD();
            return;
        }
        const shortFen = fen.split(" ").slice(0, 3).join(" ");
        const entry = ecoTable.get(shortFen);
        if (entry && entry.name)
        {
            this.updateOpeningHUD(entry);
        }
        else
        {
            this.hideOpeningHUD();
        }
    }

    clearThreatMarkings()
    {
        if (this.controller?.markings?.removeOne)
        {
            this.threatMarkings.forEach((key) =>
            {
                try { this.controller.markings.removeOne(key); } catch (e) {}
            });
        }
        this.threatMarkings = [];
    }

    highlightThreat(targetSquare: string)
    {
        if (this.isStealthHidden || this.master.options.threat_radar === false) return;
        if (!targetSquare || typeof this.controller?.markings?.addOne !== "function") return;

        this.clearThreatMarkings();
        try
        {
            this.controller.markings.addOne({
                data: {
                    color: "#ef4444",
                    opacity: 0.65,
                    square: targetSquare,
                },
                node: true,
                persistent: true,
                type: "highlight",
            });
            this.threatMarkings.push(`highlight|${targetSquare}`);
        }
        catch (e) {}
    }

    private UpdateEngine(isNewGame: boolean)
    {
        let fen = this.getFenSafe();
        if (fen)
        {
            this.clearThreatMarkings();
            this.checkOpeningHUD(fen);
            this.master.engine.UpdatePosition(fen, isNewGame);
            this.SetCurrentDepth(0);
        }
    }

    private ResetGame()
    {
        if (this.isDestroyed) return;
        this.RemoveCurrentMarkings();
        this.ClearAnalysisMarkings();
        this.clearThreatMarkings();
        this.UpdateEngine(true);
    }

    private RemoveCurrentMarkings()
    {
        if (this.controller?.markings?.removeOne)
        {
            this.currentMarkings.forEach((marking) =>
            {
                let key = marking.type + "|";
                if (marking.data.square != null) key += marking.data.square;
                else if (marking.data.from != null && marking.data.to != null) key += `${marking.data.from}${marking.data.to}`;

                try {
                    this.controller.markings.removeOne(key);
                } catch (e) {}
            });
        }
        this.currentMarkings = [];
    }

    ClearAnalysisMarkings()
    {
        if (this.controller?.markings?.removeOne)
        {
            this.lastAnalysisMarkings.forEach((key) =>
            {
                try {
                    this.controller.markings.removeOne(key);
                } catch (e) {}
            });
        }
        this.lastAnalysisMarkings = [];
    }

    destroy()
    {
        this.isDestroyed = true;
        if (this.keydownListener)
        {
            window.removeEventListener("keydown", this.keydownListener);
            this.keydownListener = null;
        }
        this.RemoveCurrentMarkings();
        this.ClearAnalysisMarkings();
        this.clearThreatMarkings();
        if (this.evalBar)
        {
            this.evalBar.parentElement?.remove();
            this.evalBar = null;
        }
        if (this.depthBar)
        {
            this.depthBar.parentElement?.parentElement?.remove();
            this.depthBar = null;
        }
        if (this.openingHUD)
        {
            this.openingHUD.remove();
            this.openingHUD = null;
        }
        if (this.deepToastTimeout)
        {
            clearTimeout(this.deepToastTimeout);
            this.deepToastTimeout = null;
        }
        if (this.cheatSheetModal)
        {
            this.cheatSheetModal.remove();
            this.cheatSheetModal = null;
        }
    }

    HintMoves(topMoves: TopMove[], lastTopMoves: TopMove[], isBestMove: boolean)
    {
        let options = this.master.options;
        if (topMoves.length === 0) return;
        let bestMove = topMoves[0];

        // Only show hints when it's this player's turn
        const playingAs = normalizeColor(typeof this.controller.getPlayingAs === "function" ? this.controller.getPlayingAs() : null);
        const currentTurn = normalizeColor(typeof this.controller.getTurn === "function" ? this.controller.getTurn() : null);
        if (playingAs !== null && currentTurn !== null && currentTurn !== playingAs)
        {
            this.RemoveCurrentMarkings();
            // Still update eval bar on opponent's turn, just no arrows
            if (options.evaluation_bar)
            {
                let score = (bestMove.mate != null ? bestMove.mate : bestMove.cp) as number;
                if (currentTurn === 2) score *= -1;
                this.SetEvaluation(score, bestMove.mate != null);
            }

            // Opponent Threat Radar: highlight opponent's primary attacking target
            if (options.threat_radar !== false && bestMove)
            {
                this.highlightThreat(bestMove.to);
            }
            return;
        }

        // On our turn, clear opponent threat radar highlights
        this.clearThreatMarkings();

        if (options.show_hints && this.controller?.markings)
        {
            this.RemoveCurrentMarkings();

            const hintMode = options.hint_mode || "classified";

            // Determine if the best move qualifies as a tactical "Brilliant" sacrifice/find
            let isBrilliant = false;
            if (bestMove && (bestMove.cp != null || bestMove.mate != null))
            {
                // Check if moving to an opponent square under threat or material sacrifice
                const bestScore = bestMove.mate != null ? (bestMove.mate > 0 ? 10000 : -10000) : (bestMove.cp || 0);
                if (topMoves.length > 1)
                {
                    const second = topMoves[1];
                    const secondScore = second.mate != null ? (second.mate > 0 ? 10000 : -10000) : (second.cp || 0);
                    // If best move is overwhelmingly better than 2nd best (> 180 cp gap or finding forced mate)
                    if (bestScore - secondScore > 180 || (bestMove.mate != null && bestMove.mate > 0 && second.mate == null))
                    {
                        isBrilliant = true;
                    }
                }
            }

            // Official Chess.com style vibrant palette
            const movePalette = {
                brilliant: "#1baca6", // Teal cyan (Brilliant sacrifice !!)
                great:     "#5c8bb0", // Electric Blue (Great Find !)
                best:      "#9eba5a", // Chess.com Star Green (Best Move ★)
                excellent: "#96bc4b", // Olive Green (Excellent)
                stealth:   "#00d4ff", // Neon Cyan (Safe Anti-Cheat Stealth)
                good:      "#88a878", // Sage Green (Good)
                inaccuracy:"#f0c15c", // Gold Yellow (Inaccuracy ?)
                mistake:   "#e6912c", // Orange (Mistake ??)
                blunder:   "#fa412d", // Vivid Crimson Red (Blunder ??)
            };

            const bestScore = bestMove.mate != null ? (bestMove.mate > 0 ? 10000 : -10000) : (bestMove.cp || 0);
            const usedBadgeSquares = new Set<string>();
            const currentFen = this.getFenSafe();

            topMoves.forEach((move, idx) =>
            {
                if (isBestMove && move.depth != bestMove.depth) return;

                let arrowColor = movePalette.best;
                let opacity = 0.95;
                let moveTypeBadge: TEffectType | null = null;

                const currentScore = move.mate != null ? (move.mate > 0 ? 10000 : -10000) : (move.cp || 0);
                const scoreDiff = bestScore - currentScore;

                // 1. Multi-candidate check: Detect genuine tactical piece sacrifice or pressure breakout
                const sacInfo = currentFen ? GrandmasterPersonaHelper.detectSacrifice(currentFen, move) : null;
                const isBreakout = currentFen ? GrandmasterPersonaHelper.detectBreakout(currentFen, move, bestScore) : false;

                if (sacInfo && (scoreDiff <= 65 || (move.mate !== null && move.mate > 0)))
                {
                    // Grandmaster Tactical Sacrifice (Brilliant !!)
                    arrowColor = movePalette.brilliant;
                    moveTypeBadge = "Brilliant";
                    opacity = 0.95;
                }
                else if (isBreakout && scoreDiff <= 40)
                {
                    // Grandmaster Breakout / Counter-strike under pressure (Sharp ⚡)
                    arrowColor = "#8b5cf6";
                    moveTypeBadge = "Sharp";
                    opacity = 0.90;
                }
                else if (hintMode === "stealth")
                {
                    // Stealth mode: Highlight the safest humanized move (Rank 2 if close enough, else Rank 1)
                    if (idx === 1 && scoreDiff <= 80)
                    {
                        arrowColor = movePalette.stealth;
                        opacity = 0.95;
                    }
                    else if (idx === 0)
                    {
                        arrowColor = movePalette.best;
                        opacity = 0.75;
                    }
                    else
                    {
                        arrowColor = movePalette.good;
                        opacity = 0.45;
                    }
                    if (idx === 0)
                    {
                        moveTypeBadge = "BestMove";
                    }
                }
                else if (hintMode === "classified")
                {
                    // Classify each move across the spectrum: Brilliant -> Best -> Good -> Blunder
                    if (idx === 0)
                    {
                        if (isBrilliant)
                        {
                            arrowColor = movePalette.brilliant;
                            moveTypeBadge = "Brilliant";
                        }
                        else
                        {
                            arrowColor = movePalette.best;
                            moveTypeBadge = (move.mate != null && move.mate > 0) ? "WinnerWhite" : "BestMove";
                        }
                    }
                    else if (scoreDiff <= 30)
                    {
                        arrowColor = movePalette.excellent;
                        moveTypeBadge = "Excellent";
                        opacity = 0.85;
                    }
                    else if (scoreDiff <= 90)
                    {
                        arrowColor = movePalette.good;
                        moveTypeBadge = "Good";
                        opacity = 0.75;
                    }
                    else if (scoreDiff <= 180)
                    {
                        arrowColor = movePalette.inaccuracy;
                        moveTypeBadge = "Inaccuracy";
                        opacity = 0.70;
                    }
                    else if (scoreDiff <= 300)
                    {
                        arrowColor = movePalette.mistake;
                        moveTypeBadge = "Mistake";
                        opacity = 0.65;
                    }
                    else
                    {
                        arrowColor = movePalette.blunder;
                        moveTypeBadge = "Blunder";
                        opacity = 0.60;
                    }
                }
                else
                {
                    // Classic "best" mode
                    arrowColor = (idx === 0) ? (isBrilliant ? movePalette.brilliant : movePalette.best) : movePalette.great;
                    if (idx === 0)
                    {
                        moveTypeBadge = isBrilliant ? "Brilliant" : "BestMove";
                    }
                }

                if (options.ghost_arrows)
                {
                    opacity = Math.min(0.35, opacity * 0.45);
                }

                // Add visual arrow
                this.currentMarkings.push({
                    data: {
                        from: move.from,
                        color: arrowColor,
                        opacity: opacity,
                        to: move.to,
                    },
                    node: true,
                    persistent: false,
                    type: "arrow",
                });

                // Add badge on target square (one badge per square)
                if (options.move_analysis && moveTypeBadge != null && !usedBadgeSquares.has(move.to))
                {
                    usedBadgeSquares.add(move.to);
                    this.currentMarkings.push({
                        data: {
                            square: move.to,
                            type: moveTypeBadge,
                        },
                        node: true,
                        persistent: false,
                        type: "effect",
                    });
                }
            });

            this.currentMarkings.reverse();
            if (typeof this.controller.markings.addMany === "function")
            {
                this.controller.markings.addMany(this.currentMarkings);
            }
        }

        if (options.depth_bar)
        {
            let depthPercent =
                (isBestMove ? bestMove.depth : bestMove.depth - 1)
                / this.master.engine.depth * 100;

            this.SetCurrentDepth(depthPercent);
        }

        if (options.evaluation_bar)
        {
            let score = (bestMove.mate != null ? bestMove.mate : bestMove.cp) as number;
            let currentTurn = typeof this.controller.getTurn === "function" ? this.controller.getTurn() : 1;
            if (currentTurn == 2) score *= -1;

            this.SetEvaluation(score, bestMove.mate != null);
        }
    }

    SetCurrentDepth(percent: number)
    {
        if (this.depthBar == null) return;
        let style = this.depthBar.style;

        if (percent <= 0)
        {
            this.depthBar.classList.add("disable-transition");
            style.width = `0%`;
            this.depthBar.classList.remove("disable-transition");
        }
        else
        {
            if (percent > 100) percent = 100;
            style.width = `${percent}%`;
        }
    }

    SetEvaluation(score: number, isMate: boolean)
    {
        if (this.evalBar == null || this.evalBarFill == null || this.evalScore == null || this.evalScoreAbbreviated == null) return;

        var percent: number, textScore: string, textScoreAbb: string;

        if (!isMate)
        {
            let eval_max = 500;
            let eval_min = -500;
            let smallScore = score / 100;

            percent = 90 - (((score - eval_min) / (eval_max - eval_min)) * (95 - 5)) + 5;
            if (percent < 5) percent = 5;
            else if (percent > 95) percent = 95;

            textScore = (score >= 0 ? "+" : "") + smallScore.toFixed(2);
            textScoreAbb = Math.abs(smallScore).toFixed(1);
        }
        else
        {
            percent = score < 0 ? 100 : 0;
            textScore = "M" + Math.abs(score).toString();
            textScoreAbb = textScore;
        }

        this.evalBarFill.style.transform = `translate3d(0px, ${percent}%, 0px)`;
        this.evalScore.innerText = textScore;
        this.evalScoreAbbreviated.innerText = textScoreAbb;
        let classSideAdd = (score >= 0) ? "evaluation-bar-dark" : "evaluation-bar-light";
        let classSideRemove = (score >= 0) ? "evaluation-bar-light" : "evaluation-bar-dark";

        this.evalScore.classList.remove(classSideRemove);
        this.evalScoreAbbreviated.classList.remove(classSideRemove);

        this.evalScore.classList.add(classSideAdd);
        this.evalScoreAbbreviated.classList.add(classSideAdd);

        // Blunder sound & visual aura alert
        if (this.master.options.blunder_alarm && this.lastEvalScore !== null && !isMate)
        {
            const playingAs = normalizeColor(typeof this.controller.getPlayingAs === "function" ?
                this.controller.getPlayingAs() : null);
            const delta = playingAs === 2 ? (this.lastEvalScore - score) : (score - this.lastEvalScore);
            if (Math.abs(delta) >= 150)
            {
                this.playBlunderSound(delta > 0);
                if (this.evalBarFill)
                {
                    this.evalBarFill.classList.remove("blunder-alert-pulse");
                    void this.evalBarFill.offsetWidth;
                    this.evalBarFill.classList.add("blunder-alert-pulse");
                }
            }
        }
        this.lastEvalScore = score;
    }
}

class StockfishEngine
{
    private stockfish: Worker | null = null;
    private messageQueue: string[] = [];
    private loaded: boolean;
    private ready: boolean;
    private isEvaluating: boolean;
    private isRequestedStop: boolean;
    private isInTheory: boolean;
    private master: ChessMint;
    private readyCallbacks: { (): void; }[];
    private goDoneCallbacks: { (): void; }[];

    private topMoves: TopMove[];
    private lastTopMoves: TopMove[];
    private lastMoveScore: TEffectType | null;
    private autoMoveTimeout: any = null;
    public isAutoMoveHold: boolean = false;
    public autoMoveTempoMultiplier: number = 1.0;
    private pendingAutoMove: { moveData: any; currentFen: string; chosenMove: any } | null = null;
    private autoMoveHoldBadge: HTMLElement | null = null;
    private activeDelayMs: number = 0;

    private options: { [opt: string]: string | number | boolean; };

    depth: number;
    threads: number;

    constructor(master: ChessMint)
    {
        this.master = master;
        this.loaded = false;
        this.ready = false;
        this.isEvaluating = false;
        this.isRequestedStop = false;
        this.readyCallbacks = [];
        this.goDoneCallbacks = [];
        this.topMoves = [];
        this.lastTopMoves = [];
        this.isInTheory = false;
        this.lastMoveScore = null;
        this.autoMoveTimeout = null;
        this.autoMoveTempoMultiplier = this.master.options.auto_move_tempo || 1.0;

        this.threads = this.master.options.threads || 2;
        this.depth = this.master.options.depth || 15;

        this.options = {
            "Hash": 256,
            "MultiPV": 4,
            "Ponder": true,
        };

        this.initEngineWorker();
    }

    private initEngineWorker()
    {
        let stockfishJsURL = "";
        let stockfishPathConfig = (window as any).Config?.threadedEnginePaths?.stockfish;

        if (this.master.options.use_nnue && stockfishPathConfig?.multiThreaded)
        {
            try
            {
                new SharedArrayBuffer(1024);
                stockfishJsURL = `${stockfishPathConfig.multiThreaded.loader}#${stockfishPathConfig.multiThreaded.engine}`;
                this.options["Threads"] = this.threads;
                this.options["Use NNUE"] = true;
                this.options["EvalFile"] = stockfishPathConfig.multiThreaded.nnue;
            }
            catch (e)
            {
                if (stockfishPathConfig?.singleThreaded)
                {
                    stockfishJsURL = `${stockfishPathConfig.singleThreaded.loader}#${stockfishPathConfig.singleThreaded.engine}`;
                }
            }
        }

        if (!stockfishJsURL)
        {
            stockfishJsURL = this.master.options.stockfishUrl ||
                (document.currentScript as HTMLScriptElement)?.dataset?.stockfishUrl || "";
        }

        if (stockfishJsURL && (stockfishJsURL.startsWith("chrome-extension://") || stockfishJsURL.startsWith("moz-extension://")))
        {
            // Webpages cannot directly load chrome-extension:// in new Worker, fetch script and make Blob URL
            fetch(stockfishJsURL)
                .then(res => res.text())
                .then(code =>
                {
                    const blob = new Blob([code], { type: "application/javascript" });
                    const blobUrl = URL.createObjectURL(blob);
                    this.stockfish = new Worker(blobUrl);
                    this.setupWorker();
                })
                .catch(err =>
                {
                    console.warn("ChessMint: Could not load extension stockfish, trying CDN fallback...", err);
                    this.initFallbackWorker();
                });
        }
        else if (stockfishJsURL)
        {
            try
            {
                this.stockfish = new Worker(stockfishJsURL);
                this.setupWorker();
            }
            catch (err)
            {
                fetch(stockfishJsURL)
                    .then(res => res.text())
                    .then(code =>
                    {
                        const blob = new Blob([code], { type: "application/javascript" });
                        this.stockfish = new Worker(URL.createObjectURL(blob));
                        this.setupWorker();
                    })
                    .catch(() => this.initFallbackWorker());
            }
        }
        else
        {
            this.initFallbackWorker();
        }
    }

    private initFallbackWorker()
    {
        const cdnUrl = "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js";
        fetch(cdnUrl)
            .then(res => res.text())
            .then(code =>
            {
                const blob = new Blob([code], { type: "application/javascript" });
                this.stockfish = new Worker(URL.createObjectURL(blob));
                this.setupWorker();
            })
            .catch(err =>
            {
                console.error("[Apex Chess] Stockfish fallback worker failed:", err);
                notify("Apex: Failed to load Stockfish engine", "error");
            });
    }

    private setupWorker()
    {
        if (!this.stockfish) return;
        this.stockfish.onmessage = (e) => { this.ProcessMessage(e); };
        this.stockfish.onerror = (e) => { console.error("Stockfish worker error:", e); };

        while (this.messageQueue.length > 0)
        {
            const cmd = this.messageQueue.shift();
            if (cmd) this.stockfish.postMessage(cmd);
        }

        this.send("uci");
        this.onReady(() =>
        {
            this.UpdateOptions();
            this.send("ucinewgame");
        });
    }

    send(cmd: string): void
    {
        if (this.stockfish)
        {
            this.stockfish.postMessage(cmd);
        }
        else
        {
            this.messageQueue.push(cmd);
        }
    }

    static calculateTimeBudget(remainingSec: number | null, userDepth: number = 12): EngineTimeBudget
    {
        // 1. Untimed / Rapid / Classical (> 340s or clock not active/null, e.g. 10m)
        if (remainingSec === null || remainingSec > 340)
        {
            return {
                movetime: 1200,
                depthCap: userDepth,
                minDelay: 2200,
                maxDelay: 5200,
                forceBestMove: false,
                remainingSec,
            };
        }

        // 2. Critical Time Trouble Panic (< 10 seconds remaining)
        if (remainingSec < 10)
        {
            return {
                movetime: 60,
                depthCap: Math.min(userDepth, 6),
                minDelay: 60,
                maxDelay: 180,
                forceBestMove: true,
                remainingSec,
            };
        }

        // 3. 1-Minute Bullet / Hyperbullet (<= 70 seconds)
        if (remainingSec <= 70)
        {
            return {
                movetime: 120,
                depthCap: Math.min(userDepth, 8),
                minDelay: 250,
                maxDelay: 650,
                forceBestMove: false,
                remainingSec,
            };
        }

        // 4. 3-Minute Blitz (<= 200 seconds)
        if (remainingSec <= 200)
        {
            return {
                movetime: 350,
                depthCap: Math.min(userDepth, 9),
                minDelay: 800,
                maxDelay: 1800,
                forceBestMove: false,
                remainingSec,
            };
        }

        // 5. 5-Minute Blitz (<= 340 seconds)
        return {
            movetime: 650,
            depthCap: Math.min(userDepth, 11),
            minDelay: 1200,
            maxDelay: 2800,
            forceBestMove: false,
            remainingSec,
        };
    }

    getTimeBudget(): EngineTimeBudget
    {
        const userDepth = this.depth || 12;
        if (this.master?.options?.adaptive_timing === false)
        {
            return {
                movetime: 1200,
                depthCap: userDepth,
                minDelay: 2200,
                maxDelay: 5200,
                forceBestMove: false,
                remainingSec: null,
            };
        }

        const remainingSec = this.master?.game?.getRemainingTimeSeconds?.() ?? null;
        return StockfishEngine.calculateTimeBudget(remainingSec, userDepth);
    }

    go(): void
    {
        this.onReady(() =>
        {
            this.stopEvaluation(() =>
            {
                this.isEvaluating = true;
                const budget = this.getTimeBudget();
                const targetDepth = Math.min(this.depth, budget.depthCap);
                this.send(`go movetime ${budget.movetime} depth ${targetDepth}`);
            });
        });
    }

    boostEvaluation(targetDepth: number = 22, movetime: number = 4000): void
    {
        this.onReady(() =>
        {
            this.stopEvaluation(() =>
            {
                this.isEvaluating = true;
                this.send(`go movetime ${movetime} depth ${targetDepth}`);
            });
        });
    }

    onReady(callback: { (): void; })
    {
        if (this.ready) callback();
        else
        {
            this.readyCallbacks.push(callback);
            this.send("isready");
        }
    }

    destroy()
    {
        if (this.autoMoveTimeout)
        {
            clearTimeout(this.autoMoveTimeout);
            this.autoMoveTimeout = null;
        }
        if (this.autoMoveHoldBadge)
        {
            this.autoMoveHoldBadge.remove();
            this.autoMoveHoldBadge = null;
        }
        this.pendingAutoMove = null;
        this.isAutoMoveHold = false;

        if (this.stockfish)
        {
            try
            {
                this.stockfish.terminate();
            }
            catch (e) {}
            this.stockfish = null;
        }
        this.readyCallbacks = [];
        this.goDoneCallbacks = [];
        this.messageQueue = [];
        this.isEvaluating = false;
        this.ready = false;
        this.loaded = false;
    }

    stopEvaluation(callback: { (): void; })
    {
        if (this.autoMoveTimeout)
        {
            clearTimeout(this.autoMoveTimeout);
            this.autoMoveTimeout = null;
        }

        if (this.isEvaluating)
        {
            this.goDoneCallbacks = [callback];
            this.isRequestedStop = true;
            this.send("stop");
        }
        else
        {
            callback();
        }
    }

    UpdatePosition(FENs: string | null = null, isNewGame: boolean = true)
    {
        if (this.autoMoveTimeout)
        {
            clearTimeout(this.autoMoveTimeout);
            this.autoMoveTimeout = null;
        }

        this.onReady(() =>
        {
            this.stopEvaluation(() =>
            {
                this.MoveAndGo(FENs, isNewGame);
            });
        });
    }

    UpdateExtensionOptions()
    {
        this.depth = this.master.options.depth || 12;
        if (this.master.options.threads && this.master.options.threads !== this.threads)
        {
            this.threads = this.master.options.threads;
            this.send(`setoption name Threads value ${this.threads}`);
        }
        if (this.master.options.auto_move_tempo)
        {
            this.autoMoveTempoMultiplier = this.master.options.auto_move_tempo;
        }
        if (this.topMoves.length > 0)
            this.onTopMoves(null, !this.isEvaluating);
    }

    public executeMoveIfValid(moveData: any, expectedFen?: string)
    {
        try
        {
            if (!this.master?.game?.controller) return;
            const nowPlayingAs = normalizeColor(typeof this.master.game.controller.getPlayingAs === "function" ?
                this.master.game.controller.getPlayingAs() : null);
            const nowTurn = normalizeColor(typeof this.master.game.controller.getTurn === "function" ?
                this.master.game.controller.getTurn() : null);
            const nowFen = typeof (this.master.game as any).getFenSafe === "function" ?
                (this.master.game as any).getFenSafe() :
                ((typeof this.master.game.controller.getFEN === "function") ? this.master.game.controller.getFEN() : "");

            if (nowPlayingAs === nowTurn && (!expectedFen || nowFen === expectedFen))
            {
                if (typeof this.master.game.controller.move === "function")
                {
                    this.master.game.controller.move(moveData);
                }
            }
        }
        catch (err)
        {
            console.error("ChessMint: Error executing move:", err);
        }
    }

    public toggleAutoMoveHold(force?: boolean)
    {
        this.isAutoMoveHold = force !== undefined ? force : !this.isAutoMoveHold;

        if (this.isAutoMoveHold)
        {
            if (this.autoMoveTimeout)
            {
                clearTimeout(this.autoMoveTimeout);
                this.autoMoveTimeout = null;
            }
            this.updateHoldBadge(this.pendingAutoMove?.chosenMove);
            showApexHUDToast("⏸️ AUTO-MOVE DI-HOLD (Pura-pura mikir...) [Tekan 'P' atau Klik untuk melangkah]", 3200);
        }
        else
        {
            this.updateHoldBadge();
            showApexHUDToast("▶️ RESUME AUTO-MOVE: Melangkah sekarang!", 2000);
            if (this.pendingAutoMove)
            {
                const { moveData, currentFen } = this.pendingAutoMove;
                this.pendingAutoMove = null;
                setTimeout(() => {
                    this.executeMoveIfValid(moveData, currentFen);
                }, 280);
            }
        }
    }

    public addThinkingDelay(extraMs = 3000)
    {
        if (this.autoMoveTimeout && this.pendingAutoMove)
        {
            clearTimeout(this.autoMoveTimeout);
            this.activeDelayMs += extraMs;
            const remainingDelay = Math.max(400, this.activeDelayMs);
            showApexHUDToast(`🧠 Pura-pura Mikir: +${extraMs / 1000}s (Total jeda ~${(remainingDelay / 1000).toFixed(1)}s)`, 2400);

            const { moveData, currentFen } = this.pendingAutoMove;
            this.autoMoveTimeout = setTimeout(() => {
                this.autoMoveTimeout = null;
                this.pendingAutoMove = null;
                this.executeMoveIfValid(moveData, currentFen);
            }, remainingDelay);
        }
        else
        {
            showApexHUDToast(`🧠 Pura-pura Mikir: Siap +${extraMs / 1000}s ekstra pada giliran berikutnya`, 2200);
        }
    }

    public adjustAutoMoveTempo(factor: number, label: string)
    {
        if (factor === 1)
        {
            this.autoMoveTempoMultiplier = 1.0;
            showApexHUDToast(`🎯 Tempo Reset: 1.0x (Normal Adaptif)`, 2200);
            return;
        }

        this.autoMoveTempoMultiplier = Math.max(0.25, Math.min(4.0, Number((this.autoMoveTempoMultiplier * factor).toFixed(2))));
        const desc = this.autoMoveTempoMultiplier > 1.0 ? "Lebih Santai / Slower" : (this.autoMoveTempoMultiplier < 1.0 ? "Lebih Cepat / Faster" : "Normal");
        const icon = factor > 1 ? "🐢" : "⚡";

        showApexHUDToast(`${icon} Tempo Auto-Move: ${this.autoMoveTempoMultiplier}x (${desc})`, 2200);

        if (this.autoMoveTimeout && this.pendingAutoMove && !this.isAutoMoveHold)
        {
            clearTimeout(this.autoMoveTimeout);
            const newDelay = Math.max(120, Math.round(this.activeDelayMs * factor));
            this.activeDelayMs = newDelay;
            const { moveData, currentFen } = this.pendingAutoMove;
            this.autoMoveTimeout = setTimeout(() => {
                this.autoMoveTimeout = null;
                this.pendingAutoMove = null;
                this.executeMoveIfValid(moveData, currentFen);
            }, newDelay);
        }
    }

    public updateHoldBadge(move?: any)
    {
        try
        {
            if (!this.isAutoMoveHold)
            {
                if (this.autoMoveHoldBadge)
                {
                    this.autoMoveHoldBadge.remove();
                    this.autoMoveHoldBadge = null;
                }
                return;
            }

            if (!this.autoMoveHoldBadge)
            {
                this.autoMoveHoldBadge = document.createElement("div");
                this.autoMoveHoldBadge.className = "apex-hold-badge";
                this.autoMoveHoldBadge.onclick = () => this.toggleAutoMoveHold(false);
                document.body.appendChild(this.autoMoveHoldBadge);
            }

            const moveHint = move ? ` (${move.from}→${move.to})` : "";
            this.autoMoveHoldBadge.innerHTML = `
                <span style="font-size: 14px;">⏸️</span>
                <span><b>AUTO-MOVE DI-HOLD</b>${moveHint} — Pura-pura mikir...</span>
                <span style="background: rgba(245, 158, 11, 0.25); border: 1px solid rgba(245, 158, 11, 0.5); padding: 2px 7px; border-radius: 12px; font-size: 11px; margin-left: 4px;">Tekan 'P' atau Klik untuk Jalan</span>
            `;
        }
        catch (_) {}
    }

    private UpdateOptions(options: { [opt: string]: string | number | boolean; } | null = null)
    {
        if (options === null) options = this.options;

        Object.keys(options).forEach((key) =>
        {
            this.send(`setoption name ${key} value ${options![key]}`);
        });
    }

    private ProcessMessage(event: MessageEvent<any>)
    {
        this.ready = false;
        let line: string = (event && typeof event === "object") ? event.data : event;
        if (typeof line !== "string") return;

        if (line === 'uciok')
        {
            this.loaded = true;
            this.master.onEngineLoaded();
        }
        else if (line === 'readyok')
        {
            this.ready = true;
            if (this.readyCallbacks.length > 0)
            {
                let copy = this.readyCallbacks;
                this.readyCallbacks = [];
                copy.forEach(function (callback) { callback(); });
            }
        }
        else if (this.isEvaluating && line.includes('Load eval file success'))
        {
            this.isEvaluating = false;
            this.isRequestedStop = false;
            if (this.goDoneCallbacks.length > 0)
            {
                let copy = this.goDoneCallbacks;
                this.goDoneCallbacks = [];
                copy.forEach(function (callback) { callback(); });
            }
        }
        else
        {
            if (line.startsWith("info ") && line.includes(" pv ") && line.includes(" score "))
            {
                if (!this.isRequestedStop)
                {
                    const depthMatch = line.match(/\bdepth (\d+)/);
                    const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
                    const pvMatch = line.match(/\bpv (.+)$/);

                    if (depthMatch && scoreMatch && pvMatch)
                    {
                        let cp = (scoreMatch[1] === "cp") ? parseInt(scoreMatch[2]) : null;
                        let mate = (scoreMatch[1] === "mate") ? parseInt(scoreMatch[2]) : null;
                        let move = new TopMove(pvMatch[1].trim(), parseInt(depthMatch[1]), cp, mate);

                        this.onTopMoves(move, false);
                    }
                }
            }
            else if (line.startsWith("bestmove"))
            {
                let match = line.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)?/);
                this.isEvaluating = false;
                if (this.goDoneCallbacks.length > 0)
                {
                    let copy = this.goDoneCallbacks;
                    this.goDoneCallbacks = [];
                    copy.forEach(function (callback) { callback(); });
                }

                if (!this.isRequestedStop && match && match[1] !== undefined)
                {
                    const index = this.topMoves.findIndex(object => object.move === match![1]);
                    if (index >= 0)
                    {
                        this.onTopMoves(this.topMoves[index], true);
                    }
                }

                this.isRequestedStop = false;
            }
        }
    }

    private MoveAndGo(FENs: string | null = null, isNewGame: boolean = true)
    {
        let go = () =>
        {
            this.lastTopMoves = isNewGame ? [] : this.topMoves;
            this.lastMoveScore = null;
            this.topMoves = [];

            if (isNewGame) this.isInTheory = ecoTable != null;

            if (this.isInTheory && ecoTable != null)
            {
                let fen = "";
                if (typeof this.master.game.controller.getFEN === "function") fen = this.master.game.controller.getFEN();
                else if (typeof (this.master.game.controller as any).getFen === "function") fen = (this.master.game.controller as any).getFen();
                let shortFen = fen.split(" ").slice(0, 3).join(" ");
                if (!ecoTable.has(shortFen)) this.isInTheory = false;
            }

            if (FENs != null) this.send(`position fen ${FENs}`);
            this.go();
        };

        this.onReady(() =>
        {
            if (isNewGame)
            {
                this.send("ucinewgame");
                this.onReady(go);
            }
            else
            {
                go();
            }
        });
    }

    AnalyzeLastMove(): void
    {
        this.lastMoveScore = null;

        let lastMove = typeof this.master.game.controller.getLastMove === "function" ?
            this.master.game.controller.getLastMove() : undefined;
        if (lastMove === undefined) return;

        if (this.isInTheory)
        {
            this.lastMoveScore = "Book";
        }
        else if (this.lastTopMoves.length > 0)
        {
            let lastBestMove = this.lastTopMoves[0];

            if (lastBestMove.from === lastMove.from && lastBestMove.to === lastMove.to)
            {
                this.lastMoveScore = "BestMove";
            }
            else if (this.topMoves.length > 0)
            {
                let bestMove = this.topMoves[0];

                if (lastBestMove.mate != null)
                {
                    if (bestMove.mate == null)
                    {
                        this.lastMoveScore = lastBestMove.mate > 0 ? "MissedWin" : "Brilliant";
                    }
                    else
                    {
                        this.lastMoveScore = lastBestMove.mate > 0 ? "Excellent" : "Good";
                    }
                }
                else if (bestMove.mate != null)
                {
                    this.lastMoveScore = bestMove.mate < 0 ? "Brilliant" : "Blunder";
                }
                else if (bestMove.cp != null && lastBestMove.cp != null)
                {
                    let evalDiff = -(bestMove.cp + lastBestMove.cp);

                    if (evalDiff > 100) this.lastMoveScore = "Brilliant";
                    else if (evalDiff > 0) this.lastMoveScore = "GreatFind";
                    else if (evalDiff > -10) this.lastMoveScore = "BestMove";
                    else if (evalDiff > -25) this.lastMoveScore = "Excellent";
                    else if (evalDiff > -50) this.lastMoveScore = "Good";
                    else if (evalDiff > -100) this.lastMoveScore = "Inaccuracy";
                    else if (evalDiff > -250) this.lastMoveScore = "Mistake";
                    else this.lastMoveScore = "Blunder";
                }
            }
        }

        if (this.lastMoveScore != null && this.master.game.controller?.markings)
        {
            this.master.game.ClearAnalysisMarkings();

            const highlightColors: { [id: string]: string; } = {
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

            let hlColor = highlightColors[this.lastMoveScore];
            if (hlColor != null && typeof this.master.game.controller.markings.addOne === "function")
            {
                this.master.game.controller.markings.addOne({
                    data: {
                        opacity: 0.5,
                        color: hlColor,
                        square: lastMove.to,
                    },
                    node: true,
                    persistent: true,
                    type: "highlight",
                });
                this.master.game.lastAnalysisMarkings.push(`highlight|${lastMove.to}`);
            }

            if (typeof this.master.game.controller.markings.addOne === "function")
            {
                this.master.game.controller.markings.addOne({
                    data: {
                        square: lastMove.to,
                        type: this.lastMoveScore,
                    },
                    node: true,
                    persistent: true,
                    type: "effect",
                });
                this.master.game.lastAnalysisMarkings.push(`effect|${lastMove.to}`);
            }
        }
    }

    private onTopMoves(move: TopMove | null = null, isBestMove: boolean = false)
    {
        if (move != null)
        {
            const index = this.topMoves.findIndex(object => object.move === move.move);

            if (isBestMove)
            {
                const hasPersonaOrSac = Boolean((this.master.options.persona && this.master.options.persona !== "engine") || this.master.options.tactical_sacrifices !== false);
                if (!hasPersonaOrSac)
                {
                    if (this.topMoves.length > 0 && this.topMoves[0].move != move.move)
                    {
                        if (index >= 0) this.topMoves.splice(index, 1);
                        this.topMoves.unshift(move);
                    }
                }
            }
            else
            {
                if (index === -1)
                {
                    this.topMoves.push(move);
                    this.SortTopMoves();
                }
                else if (move.depth >= this.topMoves[index].depth)
                {
                    this.topMoves[index] = move;
                    this.SortTopMoves();
                }
            }
        }

        let multiPV = (this.options["MultiPV"] as number) || 4;
        let top_pv_moves = this.topMoves.slice(0, multiPV);
        this.master.game.HintMoves(top_pv_moves, this.lastTopMoves, isBestMove);
        if (this.master.options.move_analysis) this.AnalyzeLastMove();

        // Auto move with randomized human-like delay + occasional 2nd-best pick to avoid detection
        if (this.master.options.auto_move && isBestMove && this.master.game.controller)
        {
            if (this.autoMoveTimeout)
            {
                clearTimeout(this.autoMoveTimeout);
                this.autoMoveTimeout = null;
            }

            const playingAs = normalizeColor(typeof this.master.game.controller.getPlayingAs === "function" ?
                this.master.game.controller.getPlayingAs() : null);
            const currentTurn = normalizeColor(typeof this.master.game.controller.getTurn === "function" ?
                this.master.game.controller.getTurn() : null);

            if (playingAs !== null && currentTurn !== null && playingAs === currentTurn && top_pv_moves.length > 0)
            {
                const currentFen = typeof (this.master.game as any).getFenSafe === "function" ?
                    (this.master.game as any).getFenSafe() :
                    ((typeof this.master.game.controller.getFEN === "function") ? this.master.game.controller.getFEN() : "");

                const budget = this.getTimeBudget();
                const usePersona = Boolean(this.master.options.persona && this.master.options.persona !== "engine");
                let chosenMove = top_pv_moves[0];
                let chosenSacInfo: any = null;
                let chosenBreakoutCandidate: TopMove | null = null;

                // 1. Tactical Sacrifices & Breakouts (Bold Master Play)
                const allowTacticalSacrifices = this.master.options.tactical_sacrifices !== false;
                if (allowTacticalSacrifices && currentFen && top_pv_moves.length > 0)
                {
                    const m0 = top_pv_moves[0];
                    const score0 = m0.mate !== null ? (m0.mate > 0 ? 10000 : -10000) : (m0.cp ?? 0);

                    for (const cand of top_pv_moves)
                    {
                        const candScore = cand.mate !== null ? (cand.mate > 0 ? 10000 : -10000) : (cand.cp ?? 0);
                        const delta = score0 - candScore;

                        // Check if candidate is a sound tactical sacrifice
                        if (delta <= 50 || (cand.mate !== null && cand.mate > 0) || (candScore >= 80 && delta <= 70))
                        {
                            const detectedSac = GrandmasterPersonaHelper.detectSacrifice(currentFen, cand);
                            if (detectedSac)
                            {
                                chosenSacInfo = detectedSac;
                                chosenMove = cand;
                                break;
                            }
                        }

                        // Check if candidate is a pressure breakout counter-strike
                        if (!chosenBreakoutCandidate && delta <= 40 && score0 <= -35)
                        {
                            if (GrandmasterPersonaHelper.detectBreakout(currentFen, cand, score0))
                            {
                                chosenBreakoutCandidate = cand;
                            }
                        }
                    }

                    if (!chosenSacInfo && chosenBreakoutCandidate && (usePersona || Math.random() < 0.75))
                    {
                        chosenMove = chosenBreakoutCandidate;
                    }
                }

                // If no sacrifice or breakout was selected, apply standard anti-cheat calibration
                if (!chosenSacInfo && (!chosenBreakoutCandidate || chosenMove !== chosenBreakoutCandidate) && !usePersona && !budget.forceBestMove && top_pv_moves.length > 1)
                {
                    const m0 = top_pv_moves[0];
                    const score0 = m0.mate !== null ? (m0.mate > 0 ? 10000 : -10000) : (m0.cp ?? 0);

                    // If m0 is a winning forced mate, always play it
                    if (m0.mate === null || m0.mate <= 0)
                    {
                        const m1 = top_pv_moves[1];
                        const score1 = m1.mate !== null ? (m1.mate > 0 ? 10000 : -10000) : (m1.cp ?? 0);
                        const delta1 = score0 - score1;
                        const m1Sound = delta1 <= 32 && (m1.mate === null || m1.mate > 0);

                        const m2 = top_pv_moves[2];
                        const score2 = m2 ? (m2.mate !== null ? (m2.mate > 0 ? 10000 : -10000) : (m2.cp ?? 0)) : null;
                        const delta2 = score2 !== null ? (score0 - score2) : 999;
                        const m2Sound = delta2 <= 48 && (m2 && (m2.mate === null || m2.mate > 0));

                        // Realistic human Master distribution: ~55% Best Move, ~32% Excellent (#2), ~13% Good (#3)
                        const roll = Math.random();
                        if (roll > 0.87 && m2Sound)
                        {
                            chosenMove = m2;
                        }
                        else if (roll > 0.55 && m1Sound)
                        {
                            chosenMove = m1;
                        }
                    }
                }

                let legalMoves = typeof this.master.game.controller.getLegalMoves === "function" ?
                    this.master.game.controller.getLegalMoves() : [];
                const index = legalMoves.findIndex(m =>
                    m.from === chosenMove.from &&
                    m.to == chosenMove.to &&
                    (!chosenMove.promotion || !m.promotion || m.promotion.toLowerCase() === chosenMove.promotion.toLowerCase())
                );

                // Fallback to best move if chosen isn't legal
                const finalIndex = index !== -1 ? index :
                    legalMoves.findIndex(m =>
                        m.from === top_pv_moves[0].from &&
                        m.to == top_pv_moves[0].to &&
                        (!top_pv_moves[0].promotion || !m.promotion || m.promotion.toLowerCase() === top_pv_moves[0].promotion.toLowerCase())
                    );
                const finalMove = index !== -1 ? chosenMove : top_pv_moves[0];

                if (finalIndex !== -1)
                {
                    let moveData = { ...legalMoves[finalIndex] };
                    moveData.userGenerated = true;

                    if (finalMove.promotion != null)
                        moveData.promotion = finalMove.promotion;

                    // Tactical toast notification when playing bold sacrifice or breakout
                    if (chosenSacInfo)
                    {
                        const isId = this.master.options.language === "id";
                        const toastMsg = isId ?
                            `💥 GM Move: ${chosenSacInfo.sacType} (${chosenSacInfo.move}) — Pengorbanan berani untuk serangan!` :
                            `💥 GM Move: ${chosenSacInfo.sacType} (${chosenSacInfo.move}) — Tactical sacrifice for decisive attack!`;
                        showApexHUDToast(toastMsg, 3200);
                    }
                    else if (chosenBreakoutCandidate && chosenMove === chosenBreakoutCandidate)
                    {
                        const isId = this.master.options.language === "id";
                        const toastMsg = isId ?
                            `⚡ GM Breakout: Serangan balik (${chosenBreakoutCandidate.move}) keluar dari tekanan!` :
                            `⚡ GM Breakout: Counter-strike (${chosenBreakoutCandidate.move}) breaking pressure!`;
                        showApexHUDToast(toastMsg, 2800);
                    }

                    // 1. Detect if this move is an immediate recapture on opponent's destination square
                    const lastOpponentMove = typeof (this.master.game.controller as any)?.getLastMove === "function" ?
                        (this.master.game.controller as any).getLastMove() : null;
                    const isRecapture = Boolean(lastOpponentMove && finalMove.to === lastOpponentMove.to);

                    // 2. Human contemplation pause: every few moves (approx 25% of turns) on non-recaptures, human pauses to think deeply
                    const shouldContemplate = !budget.forceBestMove && !isRecapture && (Math.random() < 0.25);

                    let delay = 0;
                    if (this.master.options.auto_move_delay)
                    {
                        delay = this.master.options.auto_move_delay;
                    }
                    else if (isRecapture && !budget.forceBestMove)
                    {
                        // Fast instinctive recapture: 40-70% of base minDelay
                        delay = Math.floor(budget.minDelay * 0.45 + Math.random() * (budget.minDelay * 0.35));
                    }
                    else
                    {
                        const delayRange = Math.max(10, budget.maxDelay - budget.minDelay);
                        delay = Math.floor(Math.random() * delayRange) + budget.minDelay;
                        if (shouldContemplate)
                        {
                            // Add thoughtful pause proportional to time control
                            // 10m: +2000 to 4500ms | 5m: +1000 to 2200ms | 3m: +500 to 1200ms
                            const pauseBoost = (budget.remainingSec && budget.remainingSec <= 200) ?
                                Math.floor(Math.random() * 700 + 500) :
                                ((budget.remainingSec && budget.remainingSec <= 340) ?
                                    Math.floor(Math.random() * 1200 + 1000) :
                                    Math.floor(Math.random() * 2500 + 2000));
                            delay += pauseBoost;
                        }
                    }

                    // Apply real-time user tempo multiplier
                    delay = Math.max(50, Math.round(delay * this.autoMoveTempoMultiplier));
                    this.activeDelayMs = delay;
                    this.pendingAutoMove = { moveData, currentFen, chosenMove: finalMove };

                    if (this.isAutoMoveHold)
                    {
                        this.updateHoldBadge(finalMove);
                        return;
                    }

                    this.autoMoveTimeout = setTimeout(() =>
                    {
                        this.autoMoveTimeout = null;
                        this.pendingAutoMove = null;
                        this.executeMoveIfValid(moveData, currentFen);
                    }, delay);
                }
            }
        }
    }

    private SortTopMoves()
    {
        this.topMoves.sort(function (a, b)
        {
            if (b.mate === null)
            {
                if (a.mate !== null)
                {
                    return a.mate < 0 ? 1 : -1;
                }

                if (a.depth === b.depth)
                {
                    if (a.cp === b.cp) return 0;
                    return (a.cp as number) > (b.cp as number) ? -1 : 1;
                }

                return a.depth > b.depth ? -1 : 1;
            }
            else
            {
                if (a.mate !== null)
                {
                    if ((a.mate < 0 && b.mate < 0) || (a.mate > 0 && b.mate > 0))
                    {
                        return a.mate < b.mate ? 1 : -1;
                    }
                    return a.mate > b.mate ? -1 : 1;
                }

                return b.mate < 0 ? 1 : -1;
            }
        });

        const persona = this.master.options.persona;
        const allowTacticalSacrifices = this.master.options.tactical_sacrifices !== false;
        if (((persona && persona !== "engine") || allowTacticalSacrifices) && this.topMoves.length > 1)
        {
            const bestMove = this.topMoves[0];
            const fen = typeof (this.master.game as any).getFenSafe === "function" ?
                (this.master.game as any).getFenSafe() :
                ((typeof this.master.game.controller?.getFEN === "function") ? this.master.game.controller.getFEN() :
                ((typeof (this.master.game.controller as any)?.getFen === "function") ? (this.master.game.controller as any).getFen() : ""));

            const rawBestScore = bestMove.mate !== null ? (bestMove.mate > 0 ? 10000 : -10000) : (bestMove.cp ?? 0);

            this.topMoves.sort((a, b) =>
            {
                const rawScoreA = a.mate !== null ? (a.mate > 0 ? 10000 : -10000) : (a.cp ?? 0);
                const rawScoreB = b.mate !== null ? (b.mate > 0 ? 10000 : -10000) : (b.cp ?? 0);

                const deltaA = rawBestScore - rawScoreA;
                const deltaB = rawBestScore - rawScoreB;

                const validA = deltaA <= 65 && (bestMove.mate === null || (a.mate !== null && a.mate > 0));
                const validB = deltaB <= 65 && (bestMove.mate === null || (b.mate !== null && b.mate > 0));

                if (validA && validB)
                {
                    const scoreA = GrandmasterPersonaHelper.scorePersonaMove(a, bestMove, persona || "engine", fen, allowTacticalSacrifices);
                    const scoreB = GrandmasterPersonaHelper.scorePersonaMove(b, bestMove, persona || "engine", fen, allowTacticalSacrifices);
                    return scoreB - scoreA;
                }

                if (validA && !validB) return -1;
                if (!validA && validB) return 1;

                return rawScoreB - rawScoreA;
            });
        }
    }
}

class ChessMint
{
    engine: StockfishEngine;
    game: GameController;
    options: ExtensionOptions;
    private optionsListener: ((event: Event) => void) | null = null;

    constructor(chessboard: HTMLElement, options: ExtensionOptions)
    {
        this.options = options;
        this.game = new GameController(this, chessboard);
        this.engine = new StockfishEngine(this);

        this.optionsListener = (event: Event) =>
        {
            this.options = (event as any).detail;
            this.game.UpdateExtensionOptions();
            this.engine.UpdateExtensionOptions();
            const isId = this.options.language === "id";
            notify(isId ? "Pengaturan berhasil disimpan!" : "Settings updated!", "circle-gearwheel");
        };

        window.addEventListener("ChessMintUpdateOptions", this.optionsListener, false);
    }

    destroy()
    {
        if (this.optionsListener)
        {
            window.removeEventListener("ChessMintUpdateOptions", this.optionsListener, false);
            this.optionsListener = null;
        }
        if (this.engine)
        {
            this.engine.destroy();
        }
        if (this.game)
        {
            this.game.destroy();
        }
    }

    onEngineLoaded()
    {
        const isId = this.options.language === "id";
        notify(isId ? "Engine Catur siap digunakan!" : "Chess Engine is ready!", "circle-info");
    }
}

var ChromeRequest = (function ()
{
    var requestId = 0;

    function getData(data?: any): Promise<ExtensionOptions>
    {
        var id = requestId++;

        return new Promise(function (resolve)
        {
            var resolved = false;
            var listener = function (evt: any)
            {
                if (evt.detail && evt.detail.requestId == id)
                {
                    resolved = true;
                    window.removeEventListener("ChessMintSendOptions", listener);
                    resolve(evt.detail.data);
                }
            };

            window.addEventListener("ChessMintSendOptions", listener);

            var payload = { data: data, id: id };
            window.dispatchEvent(new CustomEvent("ChessMintGetOptions", { detail: payload }));

            // Guaranteed fallback timeout so it never hangs
            setTimeout(() =>
            {
                if (!resolved)
                {
                    resolved = true;
                    window.removeEventListener("ChessMintSendOptions", listener);
                    const defaultOptions: ExtensionOptions = {
                        depth: 12,
                        threads: 2,
                        show_hints: true,
                        hint_mode: "classified",
                        move_analysis: true,
                        depth_bar: true,
                        evaluation_bar: true,
                        use_nnue: false,
                        auto_move: false,
                        adaptive_timing: true,
                        boss_key_enabled: true,
                        opening_hud: true,
                        threat_radar: true,
                        deep_calc_enabled: true,
                        persona: "engine",
                        language: "id",
                        tactical_sacrifices: true,
                        stockfishUrl: (document.currentScript as HTMLScriptElement)?.dataset?.stockfishUrl,
                        ecoUrl: (document.currentScript as HTMLScriptElement)?.dataset?.ecoUrl,
                    };
                    resolve(defaultOptions);
                }
            }, 500);
        });
    }

    return { getData: getData };
})();

function InitChessMint(chessboard: HTMLElement)
{
    ChromeRequest.getData().then(function (options)
    {
        const ecoUrl = (window as any).Config?.pathToEcoJson || options.ecoUrl ||
            (document.currentScript as HTMLScriptElement)?.dataset?.ecoUrl || "";

        if (ecoUrl)
        {
            fetch(ecoUrl).then(async function (response)
            {
                try
                {
                    let table = await response.json();
                    if (Array.isArray(table))
                    {
                        ecoTable = new Map(table.map((data: any) => {
                            const shortF = data.f ? data.f.split(" ").slice(0, 3).join(" ") : data.f;
                            return [shortF, data];
                        }));
                    }
                }
                catch (e) {}
            }).catch(() => {});
        }

        try
        {
            if (master)
            {
                try { master.destroy(); } catch (e) {}
                master = null;
            }
            master = new ChessMint(chessboard, options);
            console.log("[Apex Chess] Initialized successfully on chessboard:", chessboard);
        }
        catch (e)
        {
            console.error("[Apex Chess] Failed to load Chess Master:", e);
        }
    });
}

function bindChessBoard(board: HTMLElement)
{
    if (!board) return;
    if (master && master.game && master.game.chessboard === board) return;

    let attempts = 0;
    const interval = setInterval(() =>
    {
        attempts++;
        const game = (board as any).game;
        if (game && (typeof game.getFEN === "function" || typeof game.getFen === "function"))
        {
            clearInterval(interval);
            InitChessMint(board);
        }
        else if (attempts > 60)
        {
            clearInterval(interval);
        }
    }, 100);
}

// 1. Hook custom elements definitions for both wc-chess-board and chess-board
function hookCustomElement(tagName: string)
{
    if (typeof customElements !== "undefined" && typeof customElements.whenDefined === "function")
    {
        customElements.whenDefined(tagName).then(function (ctor: CustomElementConstructor)
        {
            if (ctor && ctor.prototype && !ctor.prototype._chessmintHooked)
            {
                ctor.prototype._chessmintHooked = true;
                const originalCreateGame = ctor.prototype.createGame;
                if (typeof originalCreateGame === "function")
                {
                    ctor.prototype.createGame = function (...args: any[])
                    {
                        let result = originalCreateGame.apply(this, args);
                        bindChessBoard(this);
                        return result;
                    };
                }
            }
        }).catch(() => {});
    }
}

hookCustomElement("wc-chess-board");
hookCustomElement("chess-board");

// 2. Scan existing DOM immediately
const existingBoard = document.querySelector("wc-chess-board, chess-board") as HTMLElement;
if (existingBoard)
{
    bindChessBoard(existingBoard);
}

// 3. MutationObserver for dynamic page navigation and SPA game mounts
const boardObserver = new MutationObserver((mutations) =>
{
    for (const mutation of mutations)
    {
        for (let i = 0; i < mutation.addedNodes.length; i++)
        {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE)
            {
                const el = node as HTMLElement;
                const tag = el.tagName?.toLowerCase();
                if (tag === "wc-chess-board" || tag === "chess-board")
                {
                    bindChessBoard(el);
                }
                else if (typeof el.querySelector === "function")
                {
                    const nested = el.querySelector("wc-chess-board, chess-board") as HTMLElement;
                    if (nested)
                    {
                        bindChessBoard(nested);
                    }
                }
            }
        }
    }
});

boardObserver.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
});
