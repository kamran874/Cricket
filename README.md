# Mission-2

Two installable web apps (PWAs), each running entirely client-side with no
backend — built with React, TypeScript, Tailwind CSS, and Vite.

| App | Path | What it does |
|---|---|---|
| **[Ledger](#ledger--daily-expense-tracker)** | `/` (repo root) | Daily expense tracker with weekly/bi-weekly/monthly reports |
| **[Star Kala Gujran — Cricket Scorer](cricket/README.md)** | `/cricket` | Ball-by-ball cricket scoring with full batting/bowling cards |

Both deploy together via `.github/workflows/deploy-pages.yml` to one GitHub
Pages site: the Ledger app at the site root, the cricket scorer at `/cricket/`.

## Why PWAs instead of native App Store apps

Building a native iOS app requires Xcode, a Mac, and an Apple Developer account,
none of which are available in this environment. A Progressive Web App gives you
the same result for personal use: an icon on your Home Screen, a full-screen
standalone window (no Safari chrome), and offline support — installed directly
from Safari, no App Store review needed. (The cricket scorer also has an
Android build set up — see [`cricket/README.md`](cricket/README.md) for that.)

## Installing either app on your iPhone

1. Open the app's URL in **Safari** on your iPhone.
2. Tap the **Share** icon → **Add to Home Screen** → **Add**.
3. Launch it from the Home Screen icon — it opens full-screen, like a regular app.

### Deploying with GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml`, which builds both apps
and deploys them together automatically on every push to this branch. To turn
it on:

1. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
2. Go to the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**
   (or just push a new commit) — the workflow builds and publishes both apps.
3. Your Pages URL will be shown in the workflow run and under
   **Settings → Pages**. The Ledger app is at that URL; the cricket scorer is
   at `<that URL>/cricket/`.

---

# Ledger — Daily Expense Tracker

Tracks daily expenses, labels what each one was for, and reviews weekly /
bi-weekly / monthly spending reports. All data is stored locally on-device
(`localStorage`) — nothing is sent to a server.

## Features

- **Onboarding** — pick the date you want to start tracking from, your currency,
  and a nightly reminder time (defaults to 11:00 PM).
- **Today** — quick-add an expense with an amount, a category label, and an
  optional note (e.g. "Lunch with the team").
- **History** — browse every day since your start date, grouped by date, with
  inline add/edit/delete.
- **Reports** — weekly, bi-weekly, and monthly views with a daily spending chart,
  period-over-period change, and a "where it went" category breakdown so you can
  see exactly where your money is going.
- **Settings** — manage categories, currency, export your data as JSON/CSV (share
  it anywhere via the iOS share sheet), and reminder preferences.

## Running locally

```bash
npm install
npm run dev       # starts a dev server
npm run build     # production build in dist/
npm run preview   # preview the production build
```

## About the nightly reminder

iOS suspends background JavaScript timers once a web app is closed or
backgrounded, so a purely client-side reminder can only fire reliably **while the
app is open**. For a guaranteed 11 PM nudge, pair it with an iPhone **Shortcuts**
automation:

**Shortcuts → Automation → + → Time of Day → set your time → Open App → Ledger**,
and turn off "Ask Before Running".

That opens the app for you at the time you choose, and the in-app reminder banner
takes it from there.
