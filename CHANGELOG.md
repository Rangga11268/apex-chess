# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-10-14

### Added
- **Boss Key / Stealth Hotkey (`H`)**: Instant toggle hiding/unhiding all engine visual overlays (eval bar, arrows, badges, HUD) in 1ms.
- **Opening HUD & ECO Book Toast**: Real-time display of opening names and ECO classifications (e.g. `[C60] Ruy Lopez`, `[B20] Sicilian Defense`) directly above the board layout using local `eco.json`.
- **Opponent Threat Radar**: Live tactical danger detection highlighting opponent attack destinations in crimson (`#ef4444`) while waiting for their turn.
- **On-Demand Deep Calculation (`Spacebar`)**: Instant search boost triggering depth 22 (4000ms budget) for complex tactical positions with progress badge indicator.

## [2.0.0] - 2026-10-14

### Added
- **Multi-Tier Move Spectrum**: Engine evaluates up to 4 concurrent lines (`MultiPV = 4`) and visualizes moves categorized from Brilliant (`#1BACA6`), Best Move (`#9EBA5A`), Good/Excellent (`#5C8BB0`), Inaccuracy/Mistake (`#E6912C`), to Blunder (`#FA412D`).
- **Board Markings & Badges**: Native board arrow rendering and destination square badges (star icon for Brilliant, checkmark badge for Best Move) adhering to Chess.com visual conventions.
- **Anti-Detection Stealth Assist**: Configurable mode introducing randomized human thinking latency (800ms to 2200ms) and secondary line selection (~25% distribution) to emulate natural human accuracy curves.
- **Adaptive Bullet & Blitz Speed-Up**: Dynamically scales Stockfish engine compute time and auto-move delay according to live clock constraints (Hyperbullet/1m Bullet at 120ms compute with 80-220ms delay, 3m Blitz at 350ms, 5m Blitz at 650ms, emergency panic overdrive at 60ms under 10 seconds, and normalized 1200ms evaluation for Rapid, Classical, and Bot practice).
- **Bilingual Interface (ID / EN)**: Live 1-click switcher between Bahasa Indonesia and English in the options popup with full dictionary synchronization.
- **Ultra-HD Vector-Grade Assets**: Re-rendered crisp iconography and master banner using 4x supersampling and Lanczos filtering (`logo-16`, `logo-48`, `logo-128`, `logo-512`, and `banner-hd.png`).

### Changed
- **Rebranding**: Transitioned identity from ChessMint to **Apex Chess** across manifest, engine wrappers, and documentation.
- **Antislop UI Overhaul**: Rebuilt extension control panel with a clean Slate/Cobalt palette (`#0b0e14`, `#111620`, `#2563eb`, `#38bdf8`), high-contrast accessible typography (WCAG AA compliant), and elimination of artificial neon gradients.
- **Documentation Overhaul**: Rewrote `README.md` to adhere to `/antislop` guidelines: removed buzzwords, removed heading emoji clutter, and eliminated em dashes (`—`).

### Fixed
- **Arrow Color Calibration**: Matched exact RGB/opacity parameters for Chess.com board canvas overlays.
- **Marking Cleanup**: Ensured `RemoveCurrentMarkings()` properly clears previous turn highlights and arrows to eliminate ghost overlays.
- **Turn Isolation**: Engine calculations and hint arrows now trigger strictly during the active player's turn (`getPlayingAs() === getTurn()`).
