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
var inputPersona: HTMLSelectElement;
var inputUseNNUE: HTMLInputElement;
var inputGhostArrows: HTMLInputElement;
var inputBlunderAlarm: HTMLInputElement;
var inputCheatSheet: HTMLInputElement;
var inputAutoMoveTempo: HTMLSelectElement;
var inputAccuracyProfile: HTMLSelectElement;
var inputTacticalSacrifices: HTMLInputElement;
var btnLangId: HTMLElement | null;
var btnLangEn: HTMLElement | null;
var btnPresetStealth: HTMLElement | null;
var btnPresetBlitz: HTMLElement | null;
var btnPresetCoach: HTMLElement | null;
var personaCardIcon: HTMLElement | null;
var personaCardName: HTMLElement | null;
var personaCardStyle: HTMLElement | null;
var personaCardMotto: HTMLElement | null;
var personaCardTraits: HTMLElement | null;

var tabBtnAssist: HTMLElement | null;
var tabBtnStealth: HTMLElement | null;
var tabBtnEngine: HTMLElement | null;
var panelAssist: HTMLElement | null;
var panelStealth: HTMLElement | null;
var panelEngine: HTMLElement | null;

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
    persona: "engine",
    language: "id",
    ghost_arrows: false,
    blunder_alarm: false,
    cheat_sheet_enabled: true,
    auto_move_tempo: 1.0,
    accuracy_profile: "casual",
    tactical_sacrifices: true,
};

interface PersonaProfile {
    icon: string;
    iconSvg: string;
    name: string;
    style: { id: string; en: string };
    motto: { id: string; en: string };
    traits: { id: string[]; en: string[] };
}

const PersonaProfiles: Record<TGrandmasterPersona, PersonaProfile> = {
    engine: {
        icon: "memory",
        iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
        name: "Stockfish Engine",
        style: {
            id: "Kalkulasi Taktis Murni",
            en: "Pure Tactical Calculation"
        },
        motto: {
            id: "\"Menghitung langkah matematis paling optimal tanpa emosi.\"",
            en: "\"Calculates the mathematically optimal line with zero emotion.\""
        },
        traits: {
            id: ["Kalkulasi: 99", "Endgame: 99", "Agresi: 50"],
            en: ["Calculation: 99", "Endgame: 99", "Aggression: 50"]
        }
    },
    magnus: {
        icon: "military_tech",
        iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18h14"/><path d="M4 8l4 6 4-6 4 6 4-6v10H4z"/></svg>',
        name: "Magnus Carlsen",
        style: {
            id: "Cekikan Posisi & Ketahanan Endgame",
            en: "Positional Squeeze & Endgame Master"
        },
        motto: {
            id: "\"Mengubah keunggulan kecil menjadi kemenangan tanpa ampun.\"",
            en: "\"Converting microscopic edges into merciless endgame victories.\""
        },
        traits: {
            id: ["Endgame: 99", "Presisi: 97", "Kesabaran: 98"],
            en: ["Endgame: 99", "Precision: 97", "Patience: 98"]
        }
    },
    tal: {
        icon: "local_fire_department",
        iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/></svg>',
        name: "Mikhail Tal",
        style: {
            id: "Serangan Taktis & Pengorbanan Berani",
            en: "Tactical Fireworks & Magic Sacrifices"
        },
        motto: {
            id: "\"Bawa lawan ke hutan gelap di mana 2+2=5.\"",
            en: "\"Take your opponent into a deep dark forest where 2+2=5.\""
        },
        traits: {
            id: ["Agresi: 99", "Taktik: 98", "Pengorbanan: 95"],
            en: ["Aggression: 99", "Tactics: 98", "Sacrifices: 95"]
        }
    },
    kasparov: {
        icon: "security",
        iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        name: "Garry Kasparov",
        style: {
            id: "Dominasi Pusat & Inisiatif Agresif",
            en: "Dynamic Initiative & Central Domination"
        },
        motto: {
            id: "\"Serangan tanpa henti dengan penguasaan pembukaan mematikan.\"",
            en: "\"Relentless dynamic pressure and venomous opening mastery.\""
        },
        traits: {
            id: ["Inisiatif: 99", "Pembukaan: 98", "Tekanan: 96"],
            en: ["Initiative: 99", "Openings: 98", "Pressure: 96"]
        }
    },
    nakamura: {
        icon: "flash_on",
        iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        name: "Hikaru Nakamura",
        style: {
            id: "Taktik Kilat & Jebakan Praktis",
            en: "Speed Demon & Sharp Tactical Traps"
        },
        motto: {
            id: "\"Menghukum kesalahan lawan dalam sepersekian detik.\"",
            en: "\"Punishing opposing inaccuracies in a fraction of a second.\""
        },
        traits: {
            id: ["Kecepatan: 99", "Jebakan: 97", "Fleksibilitas: 95"],
            en: ["Speed: 99", "Traps: 97", "Flexibility: 95"]
        }
    },
    karpov: {
        icon: "shield",
        iconSvg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h16M7 21V7h10v14M6 4h3v3H6zm5 0h2v3h-2zm4 0h3v3h-3z"/></svg>',
        name: "Anatoly Karpov",
        style: {
            id: "Profilaksis & Cekikan Posisional",
            en: "Iron Prophylaxis & Python Constriction"
        },
        motto: {
            id: "\"Membatasi setiap rencana lawan sebelum mereka memikirkannya.\"",
            en: "\"Preventing every enemy plan before it can even be conceived.\""
        },
        traits: {
            id: ["Profilaksis: 99", "Kontrol: 98", "Soliditas: 97"],
            en: ["Prophylaxis: 99", "Control: 98", "Solidity: 97"]
        }
    }
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
        id: "Petunjuk Langkah",
        en: "Move Hints"
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
        id: "Kualitas Langkah",
        en: "Move Quality"
    },
    tooltipMoveAnalysis: {
        id: "Tampilkan badge kualitas: Brilliant, Best Move, Inaccuracy, dll.",
        en: "Show quality badges: Brilliant, Best Move, Inaccuracy, etc."
    },
    labelDepthBar: {
        id: "Bilah Progres",
        en: "Depth Bar"
    },
    tooltipDepthBar: {
        id: "Tampilkan status progress kalkulasi Stockfish.",
        en: "Show progress bar while engine is evaluating."
    },
    labelEvalBar: {
        id: "Bilah Evaluasi",
        en: "Evaluation Bar"
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
        id: "Jalan Otomatis (Auto-Move Humanis)",
        en: "Auto Move (Humanized)"
    },
    tooltipAutoMove: {
        id: "Langkah otomatis dengan jeda alami manusia (800ms-2200ms) dan randomisasi langkah 2.",
        en: "Automatic moves with humanized delay (800ms-2200ms) and occasional rank-2 picks."
    },
    warningAutoMove: {
        id: "PERINGATAN: Gunakan hanya untuk latihan melawan bot catur.",
        en: "WARNING: Use only against chess bots for practice."
    },
    labelAutoMoveTempo: {
        id: "Tempo Awal Auto-Move:",
        en: "Auto-Move Initial Tempo:"
    },
    tooltipAutoMoveTempo: {
        id: "Kecepatan awal auto-move. Saat main dapat diatur langsung: '[' Play Slower, ']' Play Faster, 'P' Hold/Mikir, 'T' +3s.",
        en: "Initial tempo speed for auto-move. Can be adjusted on-the-fly: '[' Play Slower, ']' Play Faster, 'P' Hold/Think, 'T' +3s."
    },
    optTempoNormal: {
        id: "Normal Adaptif (1.0x Default)",
        en: "Adaptive Normal (1.0x Default)"
    },
    optTempoSlow: {
        id: "Santai / Humanis (1.5x Slower)",
        en: "Relaxed / Human (1.5x Slower)"
    },
    optTempoUltraSlow: {
        id: "Sangat Santai (2.0x Slower)",
        en: "Very Relaxed (2.0x Slower)"
    },
    optTempoFast: {
        id: "Cepat / Blitz (0.7x Faster)",
        en: "Fast / Blitz (0.7x Faster)"
    },
    optTempoBullet: {
        id: "Kilat / Bullet (0.5x Super Cepat)",
        en: "Bullet / Lightning (0.5x Super Fast)"
    },
    labelAccuracyProfile: {
        id: "Batas Akurasi Humanis:",
        en: "Human Accuracy Cap:"
    },
    tooltipAccuracyProfile: {
        id: "Batasi akurasi agar wajar seperti manusia biasa (72-78% Elo 1000-1400) dan tidak terdeteksi curang 90%+. Mode GM/Uncapped tetap tersedia jika ingin kekuatan penuh.",
        en: "Cap match accuracy to realistic human levels (72-78% for Elo 1000-1400) to prevent 90%+ cheat detection flags. GM/Uncapped mode is available for full engine strength."
    },
    optAccuracyCasual: {
        id: "Normal / Santai (~72% - 78% Akurasi, Elo 1000-1400) ★ Rekomendasi",
        en: "Casual / Normal (~72% - 78% Accuracy, Elo 1000-1400) ★ Recommended"
    },
    optAccuracyIntermediate: {
        id: "Club Player (~78% - 84% Akurasi, Elo 1500-1800)",
        en: "Club Player (~78% - 84% Accuracy, Elo 1500-1800)"
    },
    optAccuracyMaster: {
        id: "Master / Semi-Pro (~85% - 90% Akurasi, Elo 1900-2200)",
        en: "Master / Semi-Pro (~85% - 90% Accuracy, Elo 1900-2200)"
    },
    optAccuracyGM: {
        id: "GM / Bebas Batas (92%+ Akurasi Maksimal)",
        en: "GM / Uncapped (92%+ Maximum Accuracy)"
    },
    statusSave: {
        id: "Pengaturan tersimpan otomatis",
        en: "Settings saved automatically"
    },
    labelAdaptiveTiming: {
        id: "Waktu Adaptif",
        en: "Adaptive Timing"
    },
    tooltipAdaptiveTiming: {
        id: "Otomatis mempercepat reaksi engine & jalan otomatis saat bermain Bullet (1m) & Blitz (3m/5m), dan normalkan saat Rapid/Bot.",
        en: "Automatically speeds up engine thinking & auto-play for Bullet (1m) & Blitz (3m/5m), keeping normal timing for Rapid/Bots."
    },
    labelBossKey: {
        id: "Boss Key ('H')",
        en: "Boss Key ('H')"
    },
    tooltipBossKey: {
        id: "Tekan tombol H di keyboard untuk menyembunyikan atau memunculkan seluruh bantuan visual seketika (1ms).",
        en: "Press H key on your keyboard to instantly hide or reveal all visual overlays in 1ms."
    },
    labelOpeningHUD: {
        id: "HUD ECO Book",
        en: "Opening HUD"
    },
    tooltipOpeningHUD: {
        id: "Tampilkan nama pembukaan catur resmi dan kode ECO (misal Sicilian, Ruy Lopez) di atas papan catur.",
        en: "Display official opening names and ECO codes (e.g. Sicilian, Ruy Lopez) directly above the board."
    },
    labelThreatRadar: {
        id: "Radar Ancaman",
        en: "Threat Radar"
    },
    tooltipThreatRadar: {
        id: "Tandai kotak atau perwira Anda yang sedang diancam oleh taktik serangan terbaik lawan.",
        en: "Highlight vulnerable squares or pieces currently targeted by opponent counter-threats."
    },
    labelTacticalSacrifices: {
        id: "Pengorbanan Berani (GM Sacrifices)",
        en: "Bold Sacrifices (GM Tactics)"
    },
    tooltipTacticalSacrifices: {
        id: "Deteksi pengorbanan perwira ala GM Tal/Kasparov (Greek gift, exchange sac) & breakout saat tertekan agar permainan tidak monoton.",
        en: "Detect GM-style piece sacrifices (Greek gift, exchange sacs) & counter-attack breakouts under pressure to eliminate monotonous play."
    },
    labelDeepCalc: {
        id: "Deep Calc ('Space')",
        en: "Deep Calc ('Space')"
    },
    tooltipDeepCalc: {
        id: "Tekan tombol Spasi di keyboard untuk memicu perhitungan Stockfish mendalam (depth 22) di posisi sulit.",
        en: "Press Spacebar on your keyboard to trigger a deep Stockfish search (depth 22) in complex positions."
    },
    labelPersona: {
        id: "Gaya Master Catur Dunia:",
        en: "World Master Style:"
    },
    tooltipPersona: {
        id: "Pilih gaya bermain legenda catur dunia: Magnus (Endgame/Squeeze), Tal (Pengorbanan/Serangan), Kasparov (Inisiatif/Pusat), Hikaru (Catur Kilat/Taktik), atau Karpov (Profilaksis).",
        en: "Emulate iconic world champions: Magnus (Endgame/Squeeze), Tal (Sacrifices/Attack), Kasparov (Initiative/Center), Hikaru (Speed/Swindles), or Karpov (Prophylaxis)."
    },
    optPersonaEngine: {
        id: "Stockfish Murni (Engine Kalkulasi)",
        en: "Stockfish Pure (Engine Calculation)"
    },
    optPersonaMagnus: {
        id: "Magnus Carlsen (Endgame Squeeze & Kontrol)",
        en: "Magnus Carlsen (Endgame Squeeze & Control)"
    },
    optPersonaTal: {
        id: "Mikhail Tal (Serangan Taktis & Inisiatif)",
        en: "Mikhail Tal (Tactical Attack & Initiative)"
    },
    optPersonaKasparov: {
        id: "Garry Kasparov (Dominasi Pusat & Serangan)",
        en: "Garry Kasparov (Center Dominance & Initiative)"
    },
    optPersonaNakamura: {
        id: "Hikaru Nakamura (Taktik Kilat & Jebakan)",
        en: "Hikaru Nakamura (Speed Tactics & Sharp Traps)"
    },
    optPersonaKarpov: {
        id: "Anatoly Karpov (Profilaksis & Cekikan Posisional)",
        en: "Anatoly Karpov (Prophylaxis & Positional Squeeze)"
    },
    titlePresets: {
        id: "PRESET MODE CEPAT",
        en: "QUICK PRESETS"
    },
    presetStealth: {
        id: "Stealth",
        en: "Stealth"
    },
    presetBlitz: {
        id: "Blitz",
        en: "Blitz"
    },
    presetCoach: {
        id: "Coach",
        en: "Coach"
    },
    labelGhostArrows: {
        id: "Ghost Arrows",
        en: "Ghost Arrows"
    },
    tooltipGhostArrows: {
        id: "Panah visual lebih lembut dan tembus pandang (30% opacity) agar tidak menutupi petak papan catur.",
        en: "Render softer semi-transparent move arrows (30% opacity) to avoid blocking the board."
    },
    labelBlunderAlarm: {
        id: "Alarm Blunder",
        en: "Blunder Alert"
    },
    tooltipBlunderAlarm: {
        id: "Bunyi audio instan yang halus saat terjadi pergeseran posisi drastis atau blunder fatal lawan (>=150 cp).",
        en: "Play a subtle audio tick upon a major blunder or drastic positional shift (>=150 cp)."
    },
    labelCheatSheet: {
        id: "Shortcut HUD ('?')",
        en: "Shortcut HUD ('?')"
    },
    tooltipCheatSheet: {
        id: "Tekan tombol tanda tanya (?) di papan catur untuk melihat pop-up pintasan keyboard instan.",
        en: "Press the question mark (?) key on the chessboard to reveal instant keyboard shortcuts."
    },
    tabAssist: {
        id: "Asisten",
        en: "Assist"
    },
    tabStealth: {
        id: "Stealth & Auto",
        en: "Stealth & Auto"
    },
    tabEngine: {
        id: "Mesin",
        en: "Engine"
    }
};

function SwitchTab(tabName: "assist" | "stealth" | "engine")
{
    tabBtnAssist?.classList.toggle("active", tabName === "assist");
    tabBtnAssist?.setAttribute("aria-selected", (tabName === "assist").toString());
    panelAssist?.classList.toggle("active", tabName === "assist");

    tabBtnStealth?.classList.toggle("active", tabName === "stealth");
    tabBtnStealth?.setAttribute("aria-selected", (tabName === "stealth").toString());
    panelStealth?.classList.toggle("active", tabName === "stealth");

    tabBtnEngine?.classList.toggle("active", tabName === "engine");
    tabBtnEngine?.setAttribute("aria-selected", (tabName === "engine").toString());
    panelEngine?.classList.toggle("active", tabName === "engine");
}

function UpdatePersonaCard(personaKey: string)
{
    const profile = PersonaProfiles[personaKey as TGrandmasterPersona] || PersonaProfiles.engine;
    if (personaCardIcon) personaCardIcon.innerHTML = profile.iconSvg;
    if (personaCardName) personaCardName.textContent = profile.name;
    if (personaCardStyle) personaCardStyle.textContent = profile.style[currentLanguage];
    if (personaCardMotto) personaCardMotto.textContent = profile.motto[currentLanguage];
    if (personaCardTraits)
    {
        const traitsContainer = personaCardTraits;
        traitsContainer.innerHTML = "";
        const traits = profile.traits[currentLanguage];
        traits.forEach(trait =>
        {
            const badge = document.createElement("span");
            badge.className = "persona-trait-badge";
            badge.textContent = trait;
            traitsContainer.appendChild(badge);
        });
    }
}

function UpdatePresetButtons(options: Partial<ExtensionOptions>)
{
    const isStealth = options.hint_mode === "stealth" && !options.auto_move && options.ghost_arrows;
    const isBlitz = options.auto_move && options.adaptive_timing && options.deep_calc_enabled;
    const isCoach = options.opening_hud && options.threat_radar && options.move_analysis && options.evaluation_bar && options.blunder_alarm;

    btnPresetStealth?.classList.toggle("active", Boolean(isStealth));
    btnPresetBlitz?.classList.toggle("active", Boolean(isBlitz));
    btnPresetCoach?.classList.toggle("active", Boolean(isCoach));
}

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

    if (inputPersona)
    {
        UpdatePersonaCard(inputPersona.value);
    }
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
        if (inputPersona) inputPersona.value = options.persona || "engine";
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
        if (inputGhostArrows) inputGhostArrows.checked = Boolean(options.ghost_arrows);
        if (inputBlunderAlarm) inputBlunderAlarm.checked = Boolean(options.blunder_alarm);
        if (inputCheatSheet) inputCheatSheet.checked = options.cheat_sheet_enabled !== undefined ? options.cheat_sheet_enabled : true;
        if (inputAutoMoveTempo) inputAutoMoveTempo.value = (options.auto_move_tempo || 1.0).toString();
        if (inputAccuracyProfile) inputAccuracyProfile.value = options.accuracy_profile || "casual";
        if (inputTacticalSacrifices) inputTacticalSacrifices.checked = options.tactical_sacrifices !== undefined ? options.tactical_sacrifices : true;

        currentLanguage = options.language === "en" ? "en" : "id";
        ApplyLanguage(currentLanguage);

        UpdatePresetButtons(options);
        if (inputPersona) UpdatePersonaCard(inputPersona.value);

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
        persona: (inputPersona && (inputPersona.value as any)) || "engine",
        language: currentLanguage,
        ghost_arrows: inputGhostArrows ? inputGhostArrows.checked : false,
        blunder_alarm: inputBlunderAlarm ? inputBlunderAlarm.checked : false,
        cheat_sheet_enabled: inputCheatSheet ? inputCheatSheet.checked : true,
        auto_move_tempo: inputAutoMoveTempo ? parseFloat(inputAutoMoveTempo.value) : 1.0,
        accuracy_profile: (inputAccuracyProfile && (inputAccuracyProfile.value as any)) || "casual",
        tactical_sacrifices: inputTacticalSacrifices ? inputTacticalSacrifices.checked : true,
    };

    UpdatePresetButtons(options);
    if (inputPersona) UpdatePersonaCard(inputPersona.value);

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
    inputPersona = document.getElementById("option-persona") as HTMLSelectElement;
    inputGhostArrows = document.getElementById("option-ghost-arrows") as HTMLInputElement;
    inputBlunderAlarm = document.getElementById("option-blunder-alarm") as HTMLInputElement;
    inputCheatSheet = document.getElementById("option-cheat-sheet") as HTMLInputElement;
    inputAutoMoveTempo = document.getElementById("option-auto-move-tempo") as HTMLSelectElement;
    inputAccuracyProfile = document.getElementById("option-accuracy-profile") as HTMLSelectElement;
    inputTacticalSacrifices = document.getElementById("option-tactical-sacrifices") as HTMLInputElement;

    btnLangId = document.getElementById("lang-btn-id");
    btnLangEn = document.getElementById("lang-btn-en");
    btnPresetStealth = document.getElementById("preset-stealth");
    btnPresetBlitz = document.getElementById("preset-blitz");
    btnPresetCoach = document.getElementById("preset-coach");

    tabBtnAssist = document.getElementById("tab-btn-assist");
    tabBtnStealth = document.getElementById("tab-btn-stealth");
    tabBtnEngine = document.getElementById("tab-btn-engine");
    panelAssist = document.getElementById("panel-assist");
    panelStealth = document.getElementById("panel-stealth");
    panelEngine = document.getElementById("panel-engine");

    if (tabBtnAssist) tabBtnAssist.addEventListener("click", () => SwitchTab("assist"));
    if (tabBtnStealth) tabBtnStealth.addEventListener("click", () => SwitchTab("stealth"));
    if (tabBtnEngine) tabBtnEngine.addEventListener("click", () => SwitchTab("engine"));

    personaCardIcon = document.getElementById("persona-card-icon");
    personaCardName = document.getElementById("persona-card-name");
    personaCardStyle = document.getElementById("persona-card-style");
    personaCardMotto = document.getElementById("persona-card-motto");
    personaCardTraits = document.getElementById("persona-card-traits");

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

    // 1-Click Preset Handlers
    if (btnPresetStealth)
    {
        btnPresetStealth.addEventListener("click", () =>
        {
            if (inputShowHints) inputShowHints.checked = true;
            if (inputHintMode) inputHintMode.value = "stealth";
            if (inputAutoMove) inputAutoMove.checked = false;
            if (inputGhostArrows) inputGhostArrows.checked = true;
            if (inputThreatRadar) inputThreatRadar.checked = true;
            if (inputAdaptiveTiming) inputAdaptiveTiming.checked = true;
            SwitchTab("assist");
            OnOptionsChange();
        });
    }

    if (btnPresetBlitz)
    {
        btnPresetBlitz.addEventListener("click", () =>
        {
            if (inputShowHints) inputShowHints.checked = true;
            if (inputHintMode) inputHintMode.value = "classified";
            if (inputAutoMove) inputAutoMove.checked = true;
            if (inputAdaptiveTiming) inputAdaptiveTiming.checked = true;
            if (inputDeepCalc) inputDeepCalc.checked = true;
            if (inputBossKey) inputBossKey.checked = true;
            SwitchTab("stealth");
            OnOptionsChange();
        });
    }

    if (btnPresetCoach)
    {
        btnPresetCoach.addEventListener("click", () =>
        {
            if (inputShowHints) inputShowHints.checked = true;
            if (inputHintMode) inputHintMode.value = "classified";
            if (inputOpeningHUD) inputOpeningHUD.checked = true;
            if (inputThreatRadar) inputThreatRadar.checked = true;
            if (inputMoveAnalysis) inputMoveAnalysis.checked = true;
            if (inputEvalBar) inputEvalBar.checked = true;
            if (inputBlunderAlarm) inputBlunderAlarm.checked = true;
            SwitchTab("assist");
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

    if (inputPersona)
    {
        inputPersona.addEventListener("change", () =>
        {
            OnOptionsChange();
        });
    }

    if (inputAutoMoveTempo)
    {
        inputAutoMoveTempo.addEventListener("change", () =>
        {
            OnOptionsChange();
        });
    }

    if (inputAccuracyProfile)
    {
        inputAccuracyProfile.addEventListener("change", () =>
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
