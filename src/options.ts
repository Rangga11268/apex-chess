var inputDepth: HTMLInputElement;
var inputThreads: HTMLInputElement;
var inputShowHints: HTMLInputElement;
var inputHintMode: HTMLSelectElement;
var inputMoveAnalysis: HTMLInputElement;
var inputDepthBar: HTMLInputElement;
var inputEvalBar: HTMLInputElement;
var inputAutoMove: HTMLInputElement;
var inputAdaptiveTiming: HTMLInputElement;
var inputBossKey: HTMLInputElement;
var inputOpeningHUD: HTMLInputElement;
var inputThreatRadar: HTMLInputElement;
var inputDeepCalc: HTMLInputElement;
var inputUseNNUE: HTMLInputElement;
var btnLangId: HTMLElement | null;
var btnLangEn: HTMLElement | null;

var currentLanguage: "id" | "en" = "id";

const DefaultExtensionOptions: ExtensionOptions = {
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
    language: "id",
};

interface TranslationItem {
    id: string;
    en: string;
}

const Translations: { [key: string]: TranslationItem } = {
    titleDepth: {
        id: "KEDALAMAN ENGINE",
        en: "ENGINE DEPTH"
    },
    titleThreads: {
        id: "THREAD CPU",
        en: "CPU THREADS"
    },
    labelShowHints: {
        id: "Tampilkan Petunjuk Langkah",
        en: "Show Move Hints"
    },
    tooltipShowHints: {
        id: "Tampilkan panah langkah khusus saat giliran Anda.",
        en: "Show move arrows only on your turn."
    },
    labelHintMode: {
        id: "Gaya Analisis Langkah:",
        en: "Move Analysis Style:"
    },
    optHintClassified: {
        id: "Spektrum Lengkap (Brilliant → Blunder)",
        en: "Full Spectrum (Brilliant → Blunder)"
    },
    optHintStealth: {
        id: "Anti-Deteksi (Langkah Humanis & Aman)",
        en: "Stealth Mode (Humanized & Safe)"
    },
    optHintBest: {
        id: "Langkah Terbaik Saja (Klasik)",
        en: "Top Move Only (Classic)"
    },
    tooltipHintMode: {
        id: "Pilih gaya rekomendasi: melihat spektrum langkah (Brilliant/Great/Inaccuracy/Blunder) atau saran langkah aman anti-deteksi.",
        en: "Choose hint style: see full spectrum (Brilliant/Great/Inaccuracy/Blunder) or stealth humanized recommendations."
    },
    labelMoveAnalysis: {
        id: "Analisis Kualitas Langkah",
        en: "Move Quality Analysis"
    },
    tooltipMoveAnalysis: {
        id: "Tampilkan badge kualitas: Brilliant, Best Move, Inaccuracy, dll.",
        en: "Show quality badges: Brilliant, Best Move, Inaccuracy, etc."
    },
    labelDepthBar: {
        id: "Bilah Progres Kalkulasi",
        en: "Depth Progress Bar"
    },
    tooltipDepthBar: {
        id: "Tampilkan status progress kalkulasi Stockfish.",
        en: "Show progress bar while engine is evaluating."
    },
    labelEvalBar: {
        id: "Bilah Evaluasi (Eval Bar)",
        en: "Evaluation Advantage Bar"
    },
    tooltipEvalBar: {
        id: "Tampilkan keuntungan posisi secara langsung di sisi papan.",
        en: "Show live real-time position advantage on the board."
    },
    labelUseNNUE: {
        id: "Gunakan Neural Network (NNUE)",
        en: "Use Neural Network (NNUE)"
    },
    tooltipUseNNUE: {
        id: "Evaluasi lebih akurat namun membutuhkan file network ~45MB.",
        en: "Higher accuracy evaluation, requires downloading ~45MB file."
    },
    labelAutoMove: {
        id: "Jalan Otomatis (Anti-Cheat Jitter)",
        en: "Auto Move (Anti-Cheat Jitter)"
    },
    tooltipAutoMove: {
        id: "Langkah otomatis dengan jeda alami manusia (800ms-2200ms) dan randomisasi langkah 2.",
        en: "Automatic moves with humanized delay (800ms-2200ms) and occasional rank-2 picks."
    },
    warningAutoMove: {
        id: "PERINGATAN: Gunakan hanya untuk latihan melawan bot catur.",
        en: "WARNING: Use only against chess bots for practice."
    },
    statusSave: {
        id: "Pengaturan tersimpan otomatis",
        en: "Settings saved automatically"
    },
    labelAdaptiveTiming: {
        id: "Waktu Adaptif (Bullet/Blitz Speed-Up)",
        en: "Adaptive Timing (Bullet/Blitz Speed-Up)"
    },
    tooltipAdaptiveTiming: {
        id: "Otomatis mempercepat reaksi engine & jalan otomatis saat bermain Bullet (1m) & Blitz (3m/5m), dan normalkan saat Rapid/Bot.",
        en: "Automatically speeds up engine thinking & auto-play for Bullet (1m) & Blitz (3m/5m), keeping normal timing for Rapid/Bots."
    },
    labelBossKey: {
        id: "Tombol Rahasia / Boss Key ('H')",
        en: "Stealth Boss Key ('H')"
    },
    tooltipBossKey: {
        id: "Tekan tombol H di keyboard untuk menyembunyikan atau memunculkan seluruh bantuan visual seketika (1ms).",
        en: "Press H key on your keyboard to instantly hide or reveal all visual overlays in 1ms."
    },
    labelOpeningHUD: {
        id: "HUD Nama Pembukaan (ECO Book)",
        en: "Opening Name HUD (ECO Book)"
    },
    tooltipOpeningHUD: {
        id: "Tampilkan nama pembukaan catur resmi dan kode ECO (misal Sicilian, Ruy Lopez) di atas papan catur.",
        en: "Display official opening names and ECO codes (e.g. Sicilian, Ruy Lopez) directly above the board."
    },
    labelThreatRadar: {
        id: "Radar Ancaman Lawan (Threat Radar)",
        en: "Opponent Threat Radar"
    },
    tooltipThreatRadar: {
        id: "Tandai kotak atau perwira Anda yang sedang diancam oleh taktik serangan terbaik lawan.",
        en: "Highlight vulnerable squares or pieces currently targeted by opponent counter-threats."
    },
    labelDeepCalc: {
        id: "Hitung Mendalam Cepat ('Spacebar')",
        en: "On-Demand Deep Calc ('Spacebar')"
    },
    tooltipDeepCalc: {
        id: "Tekan tombol Spasi di keyboard untuk memicu perhitungan Stockfish mendalam (depth 22) di posisi sulit.",
        en: "Press Spacebar on your keyboard to trigger a deep Stockfish search (depth 22) in complex positions."
    }
};

function ApplyLanguage(lang: "id" | "en")
{
    currentLanguage = lang;
    document.documentElement.lang = lang;

    if (btnLangId && btnLangEn)
    {
        if (lang === "id")
        {
            btnLangId.classList.add("active");
            btnLangEn.classList.remove("active");
        }
        else
        {
            btnLangEn.classList.add("active");
            btnLangId.classList.remove("active");
        }
    }

    document.querySelectorAll("[data-i18n]").forEach((el) =>
    {
        const key = el.getAttribute("data-i18n");
        if (key && Translations[key])
        {
            el.textContent = Translations[key][lang];
        }
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) =>
    {
        const key = el.getAttribute("data-i18n-title");
        if (key && Translations[key])
        {
            (el as HTMLElement).innerText = Translations[key][lang] + ":";
        }
    });
}

function RestoreOptions()
{
    chrome.storage.sync.get(DefaultExtensionOptions, function (opts)
    {
        let options = opts as ExtensionOptions;
        inputDepth.value = (options.depth || 12).toString();
        inputThreads.value = (options.threads || 2).toString();
        inputShowHints.checked = options.show_hints !== undefined ? options.show_hints : true;
        inputHintMode.value = options.hint_mode || "classified";
        inputMoveAnalysis.checked = options.move_analysis !== undefined ? options.move_analysis : true;
        inputDepthBar.checked = options.depth_bar !== undefined ? options.depth_bar : true;
        inputEvalBar.checked = options.evaluation_bar !== undefined ? options.evaluation_bar : true;
        inputUseNNUE.checked = options.use_nnue || false;
        inputAutoMove.checked = options.auto_move || false;
        inputAdaptiveTiming.checked = options.adaptive_timing !== undefined ? options.adaptive_timing : true;
        inputBossKey.checked = options.boss_key_enabled !== undefined ? options.boss_key_enabled : true;
        inputOpeningHUD.checked = options.opening_hud !== undefined ? options.opening_hud : true;
        inputThreatRadar.checked = options.threat_radar !== undefined ? options.threat_radar : true;
        inputDeepCalc.checked = options.deep_calc_enabled !== undefined ? options.deep_calc_enabled : true;

        currentLanguage = options.language === "en" ? "en" : "id";
        ApplyLanguage(currentLanguage);

        let event = new CustomEvent("input");
        (event as any).disableUpdate = true;
        inputDepth.dispatchEvent(event);
        inputThreads.dispatchEvent(event);
    });
}

function OnOptionsChange()
{
    let options: ExtensionOptions = {
        depth: parseInt(inputDepth.value),
        threads: parseInt(inputThreads.value),
        show_hints: inputShowHints.checked,
        hint_mode: (inputHintMode.value as any) || "classified",
        move_analysis: inputMoveAnalysis.checked,
        depth_bar: inputDepthBar.checked,
        evaluation_bar: inputEvalBar.checked,
        use_nnue: inputUseNNUE.checked,
        auto_move: inputAutoMove.checked,
        adaptive_timing: inputAdaptiveTiming.checked,
        boss_key_enabled: inputBossKey.checked,
        opening_hud: inputOpeningHUD.checked,
        threat_radar: inputThreatRadar.checked,
        deep_calc_enabled: inputDeepCalc.checked,
        language: currentLanguage,
    };

    chrome.storage.sync.set(options);

    // Only query chess.com tabs where the content script is active
    chrome.tabs.query({ url: "*://*.chess.com/*" }, function (tabs)
    {
        if (chrome.runtime.lastError || !tabs) return;

        tabs.forEach(function (tab)
        {
            if (tab.id !== undefined)
            {
                try
                {
                    const maybePromise = (chrome.tabs.sendMessage as any)(
                        tab.id,
                        { type: "UpdateOptions", data: options },
                        function ()
                        {
                            if (chrome.runtime.lastError)
                            {
                                // Tab might still be loading or navigated away
                            }
                        }
                    );

                    if (maybePromise && typeof maybePromise.catch === "function")
                    {
                        maybePromise.catch(function () {});
                    }
                }
                catch (e)
                {
                    // Ignore connection errors if tab was closed
                }
            }
        });
    });
}

function InitOptions()
{
    inputDepth = document.getElementById("option-depth") as HTMLInputElement;
    inputThreads = document.getElementById("option-threads") as HTMLInputElement;
    inputShowHints = document.getElementById("option-show-hints") as HTMLInputElement;
    inputHintMode = document.getElementById("option-hint-mode") as HTMLSelectElement;
    inputMoveAnalysis = document.getElementById("option-move-analysis") as HTMLInputElement;
    inputDepthBar = document.getElementById("option-depth-bar") as HTMLInputElement;
    inputEvalBar = document.getElementById("option-evaluation-bar") as HTMLInputElement;
    inputUseNNUE = document.getElementById("option-use-nnue") as HTMLInputElement;
    inputAutoMove = document.getElementById("option-auto-move") as HTMLInputElement;
    inputAdaptiveTiming = document.getElementById("option-adaptive-timing") as HTMLInputElement;
    inputBossKey = document.getElementById("option-boss-key") as HTMLInputElement;
    inputOpeningHUD = document.getElementById("option-opening-hud") as HTMLInputElement;
    inputThreatRadar = document.getElementById("option-threat-radar") as HTMLInputElement;
    inputDeepCalc = document.getElementById("option-deep-calc") as HTMLInputElement;

    btnLangId = document.getElementById("lang-btn-id");
    btnLangEn = document.getElementById("lang-btn-en");

    if (btnLangId)
    {
        btnLangId.addEventListener("click", () =>
        {
            ApplyLanguage("id");
            OnOptionsChange();
        });
    }

    if (btnLangEn)
    {
        btnLangEn.addEventListener("click", () =>
        {
            ApplyLanguage("en");
            OnOptionsChange();
        });
    }

    if (inputHintMode)
    {
        inputHintMode.addEventListener("change", () =>
        {
            OnOptionsChange();
        });
    }

    const sliderProps = {
        fill: "#00E5FF",
        background: "rgba(255, 255, 255, 0.08)",
    };

    document.querySelectorAll(".options-slider").forEach(function (slider)
    {
        const title = slider.querySelector(".title");
        const input = slider.querySelector("input");
        if (title == null || input == null) return;

        input.min = slider.getAttribute("data-min") as string;
        input.max = slider.getAttribute("data-max") as string;

        input.addEventListener("input", (event: Event) =>
        {
            const value = parseInt(input.value);
            const minValue = parseInt(input.min);
            const maxValue = parseInt(input.max);
            const percent = (value - minValue) / (maxValue - minValue) * 100;
            const bg = `linear-gradient(90deg, ${sliderProps.fill} ${percent}%, ${sliderProps.background} ${percent + 0.1}%)`;

            input.style.background = bg;
            title.setAttribute("data-value", input.value);

            if (!(event as any).disableUpdate)
                OnOptionsChange();
        });
    });

    document.querySelectorAll(".options-checkbox").forEach(function (checkbox)
    {
        checkbox.addEventListener("change", function ()
        {
            OnOptionsChange();
        });
    });

    RestoreOptions();
}

document.addEventListener('DOMContentLoaded', InitOptions);
