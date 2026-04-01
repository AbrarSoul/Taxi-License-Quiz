# Taxi License Quiz

A small, static web app for practicing taxi-driver knowledge (Finnish), with a **30-minute** countdown, immediate feedback after each answer, and **multiple quiz parts** selectable from the left sidebar. There is no backend: everything runs in the browser.

## Features

- One question at a time, four options (A–D), one point per correct answer
- Progress bar and timer during the quiz; results screen with score ring
- Progress is kept only for the current tab session (refresh starts over)
- Quiz parts load questions from JSON files (Part 1 uses `questions1.json`)

## Requirements

Modern desktop or mobile browser with JavaScript enabled.

Because the app loads question JSON files with `fetch()`, you **cannot** open `index.html` directly as `file://` in most browsers. Use a local HTTP server instead.

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
| `app.js` | Quiz logic, timer, sidebar part selection, loading questions |
| `styles.css` | Layout and styling |
| `questions1.json` | Part 1 question bank (array of question objects) |
| `questions2.json` | Part 2 question bank (same format as Part 1) |
| `questions3.json` | Part 3 question bank (same format as Parts 1–2) |
| `icon.svg` | Brand mark and favicon (SVG) |

## Question format

Each entry in a questions file (for example `questions1.json`) looks like this:

```json
{
  "id": 1,
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0
}
```

`correctIndex` is **0-based** (0 = first option). Each quiz part expects a **non-empty** array of questions; the total is read from the file length.

## Adding Part 2 / Part 3

- Part 1 is `questions1.json`; Part 2 is `questions2.json`; Part 3 is `questions3.json`.
- Use the exact same JSON format as Part 1 (array of question objects)
- Deploy as normal; the sidebar will mark parts as **Ready** when the file exists
