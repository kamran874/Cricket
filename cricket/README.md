# Star Kala CC — Cricket Scorer

Ball-by-ball cricket scoring for weekly matches: quick team/overs/toss setup,
then just name each batsman and bowler as they come up — no need to enter a
full playing XI upfront. Every delivery type (runs, wides, no-balls, byes,
leg-byes, all wicket types with fielder and incoming-batsman prompts), live
batting/bowling cards, and full-scorecard export (CSV and JSON) at any point
in the match. All data is stored locally on-device (`localStorage`) — nothing
is sent to a server.

The scoring engine (`src/lib/engine.ts`) is pure and unit-tested
(`src/lib/engine.test.ts`) — strike rotation, over boundaries, maidens, bowler
credit rules, and undo are all covered. Run it with:

```bash
node --experimental-strip-types src/lib/engine.test.ts
```

## Live shared scoring (share a match link)

When you start a match, the app gives it a link (tap the 🔗 icon on the
scoring screen, or it's copied automatically). Send that link to anyone —
whoever opens it, on any browser, on iOS or Android, sees the same match
update **live** as you score it, and can export a copy to their own device at
any point. No login, no app install required on their end.

This needs a free Firestore database behind the static site (GitHub Pages
only serves files, it can't hold shared live state on its own). **Without
this setup, the app still works perfectly** — it just falls back to
local-only mode, where each device has to score its own separate match and a
shared link won't sync between devices. You'll see a banner in the app
saying which mode you're in.

### One-time setup (~10 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with any Google account.
2. **Add project** → give it any name (e.g. "star-kala-cc") → you can
   decline Google Analytics, it's not needed → **Create project**.
3. In the left sidebar: **Build → Firestore Database → Create database**.
   Choose any region close to you, and start in **production mode**.
4. Still in Firestore, open the **Rules** tab and replace the contents with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /matches/{matchId} {
         allow get, write: if true;
         allow list: if false;
       }
     }
   }
   ```

   This means: anyone who has a specific match's exact link can read and
   score it (no login needed), but nobody can browse or discover the full
   list of matches — a match is only reachable if you were sent its link.
   That's the whole security model: an unguessable link, like a Google Meet
   or Zoom link, rather than usernames and passwords. Click **Publish**.
5. Back at the project overview (gear icon → **Project settings**), scroll to
   **Your apps** → click the **</>** (web) icon → register an app (any
   nickname, no need for Firebase Hosting) → it shows a `firebaseConfig`
   object.
6. Copy those values into [`src/lib/firebaseConfig.ts`](src/lib/firebaseConfig.ts)
   in place of the `'REPLACE_ME'` placeholders, then rebuild and redeploy
   (`npm run build`, or just push — the GitHub Actions workflow rebuilds
   automatically). That's it — the banner disappears and every match gets a
   real shareable link from then on.

These config values are meant to be public (they identify your project, not
a secret) — the Rules above are what actually controls access, not keeping
this file hidden.

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
