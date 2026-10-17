# Star Kala CC — Cricket Scorer

Ball-by-ball cricket scoring for weekly matches: quick team/overs/toss setup,
then just name each batsman and bowler as they come up — no need to enter a
full playing XI upfront. Every delivery type (runs, wides, no-balls, byes,
leg-byes, all wicket types with fielder and incoming-batsman prompts), live
batting/bowling cards, spoken ball-by-ball call-outs (mutable via the 🔊 icon
on the scoring screen), a delete option for any match you started by mistake
(🗑, on the scoring screen or the match list), and full-scorecard export
(CSV, JSON, and PDF) at any point in the match. All data is stored locally
on-device (`localStorage`) — nothing is sent to a server, and the app works
fully offline once it's been opened once (install it to your Home Screen for
the best offline experience).

The scoring engine (`src/lib/engine.ts`) is pure and unit-tested
(`src/lib/engine.test.ts`) — strike rotation, over boundaries, maidens, bowler
credit rules, and undo are all covered. Run it with:

```bash
node --experimental-strip-types src/lib/engine.test.ts
```

## Fully offline, on-device scoring

Every match lives only on the device that's scoring it (`localStorage`) —
there's no server, no account, and no live sync between devices. Once you've
opened the app's URL in your browser once (or installed it to your Home
Screen), it keeps working with no internet connection at all — the whole UI
and scoring engine run entirely in the browser. Resuming a match (e.g. after
closing the tab or reloading) picks up exactly where you left off on that
same device. Export a scorecard (CSV, JSON, or PDF) at any point to save or
share a copy of the match.

## Running locally

```bash
npm install
npm run dev       # starts a dev server
npm run build     # production build in dist/
npm run preview   # preview the production build
```

## Installing on your iPhone (web app)

1. Open the app's URL in **Safari** on your iPhone.
2. Tap the **Share** icon → **Add to Home Screen** → **Add**.
3. Launch it from the Home Screen icon — it opens full-screen, like a regular app.

See the repo root [`README.md`](../README.md) for how this app is deployed
alongside Ledger via GitHub Pages.

## Building the Android APK

An Android project is already scaffolded in [`android/`](android) via
[Capacitor](https://capacitorjs.com), wrapping the same web app into a native
Android shell. It's committed to the repo, so you don't need to run
`npx cap add android` yourself — it's ready to build.

**This could not be built inside the cloud sandbox that generated this repo.**
Modern Android builds need the Android Gradle Plugin itself, which Gradle
fetches from `dl.google.com` — and that host is explicitly blocked by that
environment's network policy (confirmed by actually running the build there;
it failed at the first step, resolving the Gradle plugin, with `403 Forbidden`
from `dl.google.com`). The sandbox's own Linux package manager only ships an
Android SDK platform from 2015 (API 23), which is far too old for Capacitor's
current Android dependencies regardless. Neither issue exists on a normal
developer machine with internet access, so building it yourself is
straightforward:

### Option A — Android Studio (recommended, handles the SDK for you)

1. Install [Android Studio](https://developer.android.com/studio) (free)
   — first run downloads the Android SDK automatically.
2. `npm install && npm run build && npx cap sync android` in this directory.
3. Open the `android/` folder in Android Studio.
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk` —
   AirDrop/copy it to an Android phone and install it (you'll need to allow
   "install unknown apps" for whichever app you send it through).

### Option B — command line (if you already have the Android SDK installed)

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Same output path as above. `./gradlew assembleDebug` produces a debug-signed
APK, fine for sideloading onto your own devices. A Play Store submission would
need a release build with your own signing key instead — ask if you want that
set up.

### Keeping the Android project in sync with the web app

Whenever the web app changes, re-run `npm run build && npx cap sync android`
before rebuilding the APK — that copies the latest `dist/` into the native
project. The `android/` folder itself (native config, icons, splash screen)
only needs regenerating if you change `capacitor.config.ts`.
