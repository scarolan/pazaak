# Pazaak

A web-based recreation of the card game Pazaak from Star Wars: Knights of the Old Republic.

<img width="657" height="790" alt="image" src="https://github.com/user-attachments/assets/656bd282-9563-4401-9719-7f2591633663" />


## How to Play

**Objective:** Get as close to 20 as possible without going over. First player to win 3 rounds wins the match.

### Gameplay

1. Each turn, a card (1-10) is automatically drawn from the main deck
2. You can optionally play one card from your side deck to adjust your total
3. Choose to **End Turn** (pass to opponent) or **Stand** (lock in your score)
4. If you hit exactly 20, you automatically stand - that's a **Pazaak!**
5. If you go over 20, you **bust** and lose the round

### Side Deck Cards

- **Plus (+):** Adds to your total
- **Minus (-):** Subtracts from your total
- **Plus/Minus (+/-):** You choose to add or subtract

## Features

- Single-player vs AI opponent
- KOTOR-themed dark UI with gold accents
- Side deck builder - customize your 4-card side deck
- Sound effects using Web Audio API
- Statistics tracking (wins, losses, streak)
- Auto-stand at 20 (Pazaak!)
- Responsive design

## Running Locally

The game uses ES6 modules, so it needs to be served from a web server:

```bash
cd pazaak
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Tech Stack

- Vanilla JavaScript (ES6 modules)
- HTML5 / CSS3
- Web Audio API for sound effects
- localStorage for saving preferences and stats

## License

MIT License - see [LICENSE](LICENSE) for details.

## Disclaimer

This is a fan project. Star Wars and Knights of the Old Republic are trademarks of Lucasfilm Ltd. and/or its affiliates.
