var master: ChessMint | null = null;
var Config: any = (window as any).Config || undefined;
var context: any = undefined;
var ecoTable: Map<string, any> | null = null;

function notify(content: string, icon = "circle-info")
{
    try
    {
        if (typeof (window as any).toaster?.add === "function")
        {
            (window as any).toaster.add({
                id: "rea-notification-" + Date.now(),
                duration: 2500,
                icon: icon,
                content: content,
            });
        }
        else
        {
            console.log(`[REA] ${content}`);
        }
    }
    catch (e)
    {
        console.log(`[REA] ${content}`);
    }
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
    private master: ChessMint;

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

        if (!options.show_hints)
        {
            this.RemoveCurrentMarkings();
        }

        if (!options.move_analysis && this.controller.markings)
        {
            let lastMove = typeof this.controller.getLastMove === "function" ? this.controller.getLastMove() : undefined;
            if (lastMove && typeof this.controller.markings.removeOne === "function")
            {
                this.controller.markings.removeOne(`effect|${lastMove.to}`);
            }
        }
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

                if (this.options && !this.options.isWhiteOnBottom && this.options.flipped)
                {
                    this.evalBar?.classList.add("evaluation-bar-flipped");
                }
            }
        }, 20);
    }

    private getFenSafe(): string
    {
        if (typeof this.controller.getFEN === "function") return this.controller.getFEN();
        if (typeof (this.controller as any).getFen === "function") return (this.controller as any).getFen();
        return "";
    }

    private UpdateEngine(isNewGame: boolean)
    {
        let fen = this.getFenSafe();
        if (fen)
        {
            this.master.engine.UpdatePosition(fen, isNewGame);
            this.SetCurrentDepth(0);
        }
    }

    private ResetGame()
    {
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
                else key += `${marking.data.from}${marking.data.to}`;

                this.controller.markings.removeOne(key);
            });
        }
        this.currentMarkings = [];
    }

    HintMoves(topMoves: TopMove[], lastTopMoves: TopMove[], isBestMove: boolean)
    {
        let options = this.master.options;
        if (topMoves.length === 0) return;
        let bestMove = topMoves[0];

        // Only show hints when it's this player's turn
        const playingAs = typeof this.controller.getPlayingAs === "function" ? this.controller.getPlayingAs() : null;
        const currentTurn = typeof this.controller.getTurn === "function" ? this.controller.getTurn() : null;
        if (playingAs !== null && currentTurn !== null && currentTurn !== playingAs)
        {
            this.RemoveCurrentMarkings();
            // Still update eval bar on opponent's turn, just no arrows
            if (options.evaluation_bar)
            {
                let score = (bestMove.mate != null ? bestMove.mate : bestMove.cp) as number;
                if (currentTurn == 2) score *= -1;
                this.SetEvaluation(score, bestMove.mate != null);
            }
            return;
        }

        if (options.show_hints && this.controller?.markings)
        {
            this.RemoveCurrentMarkings();

            const defaultColor = this.options?.arrowColors?.default || "#2CA137";
            const altColor = this.options?.arrowColors?.alt || "#FF9800";

            topMoves.forEach((move, idx) =>
            {
                if (isBestMove && move.depth != bestMove.depth) return;

                let color = (idx == 0) ? defaultColor : altColor;

                this.currentMarkings.push({
                    data: {
                        from: move.from,
                        color: color,
                        opacity: 0.7,
                        to: move.to,
                    },
                    node: true,
                    persistent: true,
                    type: "arrow",
                });

                if (move.mate != null)
                {
                    this.currentMarkings.push({
                        data: {
                            square: move.to,
                            type: move.mate < 0 ? "ResignWhite" : "WinnerWhite",
                        },
                        node: true,
                        persistent: true,
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

    private options: { [opt: string]: string | number | boolean; };

    depth: number;
    readonly threads: number;

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

        this.threads = this.master.options.threads || 2;
        this.depth = this.master.options.depth || 15;

        this.options = {
            "Hash": 256,
            "MultiPV": 3,
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
                console.error("[REA] Stockfish fallback worker failed:", err);
                notify("REA: Failed to load Stockfish engine", "error");
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

    go(): void
    {
        this.onReady(() =>
        {
            this.stopEvaluation(() =>
            {
                this.isEvaluating = true;
                // movetime caps thinking at 1.2s; depth is a ceiling so it never overshoots the user's setting
                this.send(`go movetime 1200 depth ${this.depth}`);
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

    stopEvaluation(callback: { (): void; })
    {
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
        this.depth = this.master.options.depth;
        if (this.topMoves.length > 0)
            this.onTopMoves(null, !this.isEvaluating);
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
            let match = line.match(/^info .*\bdepth (\d+) .*\bseldepth (\d+) .*\bmultipv (\d+) .*\bscore (\w+) (-?\d+) .*\bpv (.+)/);

            if (match)
            {
                if (!this.isRequestedStop)
                {
                    let cp = (match[4] == "cp") ? parseInt(match[5]) : null;
                    let mate = (match[4] == "cp") ? null : parseInt(match[5]);
                    let move = new TopMove(match[6], parseInt(match[1]), cp, mate);

                    this.onTopMoves(move, false);
                }
            }
            else if (match = line.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)?/))
            {
                this.isEvaluating = false;
                if (this.goDoneCallbacks.length > 0)
                {
                    let copy = this.goDoneCallbacks;
                    this.goDoneCallbacks = [];
                    copy.forEach(function (callback) { callback(); });
                }

                if (!this.isRequestedStop && match[1] !== undefined)
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
                if (ecoTable.get(shortFen) !== true) this.isInTheory = false;
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
                        this.lastMoveScore = lastBestMove.mate > 0 ? "Excellent" : "ResignWhite";
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
                if (this.topMoves.length > 0 && this.topMoves[0].move != move.move)
                {
                    if (index >= 0) this.topMoves.splice(index, 1);
                    this.topMoves.unshift(move);
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

        let multiPV = (this.options["MultiPV"] as number) || 3;
        let top_pv_moves = this.topMoves.slice(0, multiPV);
        this.master.game.HintMoves(top_pv_moves, this.lastTopMoves, isBestMove);
        if (this.master.options.move_analysis) this.AnalyzeLastMove();

        // Auto move with randomized human-like delay + occasional 2nd-best pick to avoid detection
        if (this.master.options.auto_move && isBestMove && this.master.game.controller)
        {
            const playingAs = typeof this.master.game.controller.getPlayingAs === "function" ?
                this.master.game.controller.getPlayingAs() : null;
            const currentTurn = typeof this.master.game.controller.getTurn === "function" ?
                this.master.game.controller.getTurn() : null;

            if (playingAs !== null && currentTurn !== null && playingAs === currentTurn && top_pv_moves.length > 0)
            {
                // Anti-cheat: 25% chance to play 2nd-best move when available
                // ponytail: naive flat probability; upgrade to eval-delta weighting if needed
                const pickIndex = (Math.random() < 0.25 && top_pv_moves.length > 1) ? 1 : 0;
                let chosenMove = top_pv_moves[pickIndex];

                let legalMoves = typeof this.master.game.controller.getLegalMoves === "function" ?
                    this.master.game.controller.getLegalMoves() : [];
                const index = legalMoves.findIndex(m => m.from === chosenMove.from && m.to == chosenMove.to);

                // Fallback to best move if chosen isn't legal
                const finalIndex = index !== -1 ? index :
                    legalMoves.findIndex(m => m.from === top_pv_moves[0].from && m.to == top_pv_moves[0].to);
                const finalMove = index !== -1 ? chosenMove : top_pv_moves[0];

                if (finalIndex !== -1)
                {
                    let moveData = { ...legalMoves[finalIndex] };
                    moveData.userGenerated = true;

                    if (finalMove.promotion != null)
                        moveData.promotion = finalMove.promotion;

                    // Human-like delay: 800–2200ms, or user-configured fixed value
                    const delay = this.master.options.auto_move_delay ||
                        (Math.floor(Math.random() * 1400) + 800);
                    setTimeout(() =>
                    {
                        try
                        {
                            if (typeof this.master.game.controller.move === "function")
                            {
                                this.master.game.controller.move(moveData);
                            }
                        }
                        catch (err)
                        {
                            console.error("ChessMint: Error executing move:", err);
                        }
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
    }
}

class ChessMint
{
    engine: StockfishEngine;
    game: GameController;
    options: ExtensionOptions;

    constructor(chessboard: HTMLElement, options: ExtensionOptions)
    {
        this.options = options;
        this.game = new GameController(this, chessboard);
        this.engine = new StockfishEngine(this);

        window.addEventListener("ChessMintUpdateOptions", (event) =>
        {
            this.options = (event as any).detail;
            this.game.UpdateExtensionOptions();
            this.engine.UpdateExtensionOptions();
            const isId = this.options.language === "id";
            notify(isId ? "Pengaturan berhasil disimpan!" : "Settings updated!", "circle-gearwheel");
        }, false);
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
                        move_analysis: true,
                        depth_bar: true,
                        evaluation_bar: true,
                        use_nnue: false,
                        auto_move: false,
                        language: "id",
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
                        ecoTable = new Map(table.map((data: any) => [data.f, true]));
                    }
                }
                catch (e) {}
            }).catch(() => {});
        }

        try
        {
            master = new ChessMint(chessboard, options);
            console.log("[REA] Initialized successfully on chessboard:", chessboard);
        }
        catch (e)
        {
            console.error("[REA] Failed to load Chess Master:", e);
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
