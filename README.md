# Mission-2

**[Star Kala CC — Cricket Scorer](cricket/README.md)** — an installable web app
(PWA) for ball-by-ball cricket scoring, running entirely client-side with no
backend (React, TypeScript, Tailwind CSS, Vite). See
[`cricket/README.md`](cricket/README.md) for full details, features, and local
setup.

## Deploying with GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml`, which builds the app
and deploys it automatically on every push to this branch. To turn it on:

1. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
2. Go to the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**
   (or just push a new commit).
3. The app is served at `<your Pages URL>/cricket/`; visiting the bare Pages
   URL redirects there automatically.

## Installing on your iPhone or Android phone

1. Open the app's URL in **Safari** (iPhone) or **Chrome** (Android).
2. Tap the **Share**/menu icon → **Add to Home Screen**.
3. Launch it from the Home Screen icon — it opens full-screen, like a regular app.
