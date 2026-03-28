# Taxi License Quiz

A small, static web app for practicing taxi-driver knowledge with **50 multiple-choice questions** (Finnish), a **20-minute** countdown, and immediate feedback after each answer. There is no backend: everything runs in the browser.

## Features

- One question at a time, four options (A–D), one point per correct answer
- Progress bar and timer during the quiz; results screen with score ring
- Progress is kept only for the current tab session (refresh starts over)
- Questions load from `questions.json` so you can edit or replace the bank without changing code

## Requirements

Modern desktop or mobile browser with JavaScript enabled.

Because the app loads `questions.json` with `fetch()`, you **cannot** open `index.html` directly as `file://` in most browsers. Use a local HTTP server instead.

## Run locally

From the project folder:

**Python 3**

```bash
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

**Node (npx)**

```bash
npx --yes serve .
```

Follow the URL printed in the terminal.

Any static file server (VS Code Live Server, `php -S localhost:8080`, etc.) works the same way.

## Project layout

| File | Role |
|------|------|
| `index.html` | Page structure and stages (welcome, quiz, results, error) |
| `app.js` | Quiz logic, timer, loading and validating questions |
| `styles.css` | Layout and styling |
| `questions.json` | Array of question objects (must contain exactly 50 entries) |
| `icon.svg` | Brand mark and favicon (SVG) |

## Question format

Each entry in `questions.json` looks like this:

```json
{
  "id": 1,
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0
}
```

`correctIndex` is **0-based** (0 = first option). The app expects **50** questions; otherwise it shows the setup error screen.
