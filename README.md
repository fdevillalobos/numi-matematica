# Numi Matemática 💜

An app for Isabella to learn and practice math on the iPad Pro 12.9", with **Numi**, a little monster who loves numbers.

It's a web app made to be installed on the iPad (PWA): it opens full screen from the home screen, works offline and saves her progress on the device.

## What it has

- **4 worlds**: Sums 🏝️, Subtraction 🌳, Multiplication 🚀 and Division 🏰, with 28 levels that go from "sums up to 5" to "3-digit numbers", "all the times tables" and "2-digit × 1-digit".
- **Placement challenge**: at the start it asks questions that get harder and harder, and opens the levels she already knows.
- **Adaptive engine**: each level measures *mastery* (accuracy + speed). When she reaches 85% it opens the next level on its own; with speed she earns the 👑 crown. Times-table facts she misses come back more often (spaced repetition).
- **Three ways to answer**: number keypad, bubble multiple choice, and **writing with the Apple Pencil** (an on-device digit recognizer that learns her handwriting). She can switch between pencil and keypad with a button. In *For grown-ups › Enseñarle mi letra a Numi* she writes each digit twice so it reads her better.
- **Visual corrections**: when she gets one wrong, Numi shows how it's done: ten-frames, dot arrays for multiplication, groups for division, and column calculations with "me llevo" (carrying) and "pido prestado" (borrowing).
- **Games**: Magic Practice ✨, Race against the clock ⏱️, Balloons 🎈, and a **boss fight** at the end of each world ⚔️ (crab, owl, alien, dragon).
- **Story problems** with drawings ("Hay 4 cajitas con 3 🍎 cada una…") so she understands what each operation means.
- **Daily missions** (3 per day) and a **daily chest** 🎁.
- **Rewards**: stars ⭐, player level, streaks 🔥, daily goal 🎯, daily chest 🎁, sticker album 📒 (common, rare and legendary), medals 🏅, and a shop to **dress up Numi** 👑🕶️🪄.
- **My progress** and **For grown-ups** (press and hold ⚙️): summary, hardest times tables, voice, sound, Apple Pencil, daily goal, backup.

## Installing it on the iPad

1. Open **https://fdevillalobos.github.io/numi-matematica/** in **Safari** on the iPad.
2. Tap Share → **Add to Home Screen**.
3. Open it from the Numi icon: it runs full screen.

### Numi's voice

The app uses the iPad's voices. For a prettier voice, download a female voice in Spanish:
**Settings › Accessibility › Spoken Content › Voices › Español** → for example **Paulina** or **Mónica** (the "Enhanced" or "Premium" versions sound much better). Then pick it in *For grown-ups › Voz* and tap ▶ Probar to hear it.

## Development

No build step: it's plain HTML, CSS and JavaScript modules.

```bash
python3 -m http.server 8765
```

```bash
npm test
```

- `js/engine.js` — levels, problem generation, mastery, adaptation, placement challenge
- `js/game.js` — play screen (lessons, practice, race, tests)
- `js/ink.js` — handwritten digit recognition ($P point-cloud) and the drawing canvas
- `js/visuals.js` — visual explanations
- `js/balloons.js` — balloons game
- `js/app.js` — screens and navigation
