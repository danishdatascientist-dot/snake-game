# 🐍 SERPENT-X — The Ultimate Snake Game

> A feature-packed, cyberpunk-flavored Snake game built with pure HTML, CSS & JavaScript. No frameworks. No dependencies. Just vibes.

**[🎮 Play Live →](https://danish7861.github.io/snake-game/)**

---

## 🎮 What Is This?

A modern take on the classic Snake game — complete with a colorful real-snake design, AI autopilot, power-ups, special food types, obstacles, achievements, a leaderboard, and 5 visual themes. Built entirely in vanilla HTML/CSS/JS, runs straight from a browser with zero setup.

---

## ✨ Features

### 🐍 Snake Design
- Rainbow body — each segment cycles through 7 bright colors
- Real scale texture with dome highlights and crescent arcs
- Detailed head with elongated snout, nostril dots, and scale pattern
- Vertical-slit pupils like a real snake (amber iris, white sclera, specular shine)
- Forked flickering tongue that animates in and out
- Tapered tail segment

### 🍎 6 Food Types
| Food | Color | Points |
|------|-------|--------|
| 🟩 Normal | Green | +1 |
| 🟡 Golden | Yellow | +5 |
| 💎 Diamond | Cyan | +10 |
| 💀 Poison | Red | -3 |
| ⚡ Speed | Orange | +1 + speed boost |
| ❄️ Slow | Blue | +1 + slow effect |

### ⚡ 5 Power-Ups
- 🛡 **Shield** — absorbs one fatal collision
- 👻 **Ghost** — pass through walls for 10 seconds
- 🧲 **Magnet** — nearby food pulls toward the snake
- ✖2 **Double Points** — all food scores twice
- ⏸ **Freeze** — temporarily slows the game

### 🤖 AI Mode
Toggle AI autopilot anytime mid-game. Uses BFS pathfinding to hunt positive-value food while avoiding obstacles and itself. Great for watching or taking a break.

### 🎯 Difficulty Modes
| Mode | Speed |
|------|-------|
| Easy | 180ms |
| Medium | 130ms |
| Hard | 80ms |
| Insane | 45ms |

### 📈 Level System
- 20 levels with automatic progression (every 10 points)
- Speed increases per level on top of difficulty
- Obstacles scale with level (static walls + moving blocks from level 4+)

### 🏆 Achievements
10 unlockable achievements including: First Byte, Score 50, Score 100, Level 10, Golden Touch, Diamond Hands, Phantom, Macro Serpent, and more.

### 📊 Persistent Stats
All stored in `localStorage`:
- Top 10 leaderboard with date and difficulty
- Total games played, best score, best level, total food, average score

### 🎨 5 Themes
| Theme | Vibe |
|-------|------|
| 🌆 Cyberpunk | Deep blue, gold accents |
| 🍭 Candy | Pastel plum |
| 🌿 Jungle | Forest green |
| 🌊 Ocean | Navy aqua |
| 🌅 Sunset | Warm amber |

### 📱 Mobile-Friendly
- On-screen D-pad controls
- Full swipe gesture support
- Responsive layout down to small screens

---

## 🎮 Controls

| Input | Action |
|-------|--------|
| Arrow Keys | Move |
| WASD | Move |
| ESC / P | Pause |
| Swipe | Move (mobile) |

---

## 🚀 Run Locally

No install needed:

```bash
git clone https://github.com/danish7861/snake-game.git
cd snake-game
# open index.html in your browser
```

Or just double-click `index.html`.

---

## 🗂 Project Structure

```
snake-game/
├── index.html    # Game layout, screens, HUD
├── style.css     # All styling and themes
└── script.js     # Full game engine (~1,460 lines)
```

---

## 🛠 Built With

- Pure HTML5 Canvas (2 layered canvases — game + particles)
- Vanilla CSS (custom properties, keyframe animations, responsive)
- Vanilla JavaScript (no frameworks, no build step)
- Web Audio API for procedurally generated sound effects
- localStorage for persistence

---

## 🤖 Fun Fact

This game was built entirely using [Claude](https://claude.ai) — from the game engine to the snake design to the AI pathfinding. Zero manual coding. Just prompts and vibes.

---

## 📄 License

MIT — use it, fork it, remix it, ship it.

---

*Made with 🐍 and a lot of prompting*
