# Blueprint Merge · App Store launch guide

The game is packaged as an iOS app (Capacitor, `ios/`), built in the cloud by Codemagic (no Mac needed) and uploaded to TestFlight. This page lists what's done, what only you can do (accounts and payments), and the store listing text to paste.

## What's done in the code

- **App shell:** `ios/` Xcode project (Swift Package Manager). The game runs offline from the app bundle. iPhone only, portrait only. Bundle ID `com.blueprintmerge.game`, version 1.0.0.
- **App icon:** 1024 px, full square, from the builder logo. **Launch screen:** the logo on the game's dark blue, handed straight over to the game's own loading screen.
- **Native features:**
  - Haptics on shots, merges (stronger for big buildings and combos), level clears, map changes and game over. There's a Vibration switch in Settings.
  - The status bar is styled over the game.
  - Going to the background saves the run and pauses.
- **Ads (Google AdMob):** rewarded ads (continue, ×2 coins, free booster, extra Daily try) and between-round interstitials, with the same fair rules as the web build. On first launch the app asks Apple's "Allow tracking?" question, then shows Google's consent form where the law requires it (EU/UK). Settings → Privacy & ads opens Google's privacy options. **Until you put in your own ad unit IDs it shows Google test ads.**
- **In-app purchase:** a one-time Remove Ads (stops between-round ads; rewarded ads stay optional). Settings has Restore purchases, which Apple requires. No server or third-party account is needed: it uses StoreKit through `@capgo/native-purchases`.
- **Privacy:**
  - `PrivacyInfo.xcprivacy` (the app itself collects nothing).
  - Info.plist: the tracking prompt text, the AdMob app ID, Google's SKAdNetwork IDs and the encryption-exemption flag (so no export compliance questions).
- **Pages:** `/privacy.html` and `/support.html` on the Vercel site, linked from Settings.
- **Store screenshots:** `docs/app-store/screenshots/` at 1320 × 2868 (the 6.9" iPhone size Apple requires). Regenerate with `npm run build && npm run screenshots`.
- **Cloud build:** `codemagic.yaml` runs the tests, builds the game, signs, sets the build number and uploads to TestFlight.

## What you need to do (in order)

1. **Apple Developer Program** ($99/year): developer.apple.com/programs → Enroll. Approval can take 1–2 days.
2. **App Store Connect** (appstoreconnect.apple.com):
   1. Apps → **+** → New App: iOS, name **Blueprint Merge**, language English, bundle ID `com.blueprintmerge.game` (register it first under Certificates, IDs & Profiles → Identifiers if it isn't offered), SKU `blueprintmerge1`.
   2. Users and Access → Integrations → **App Store Connect API** → generate a key with **App Manager** access. Download the .p8 file (you can only download it once) and note the Key ID and Issuer ID.
3. **Codemagic** (codemagic.io, free tier is enough):
   1. Sign in with GitHub and add this repository.
   2. Team settings → Integrations → **Developer Portal** → add the API key from step 2 and name it **`blueprint-asc`**.
   3. Put your app's Apple ID (App Store Connect → your app → App Information → Apple ID, a number) into `APP_STORE_APPLE_ID` in `codemagic.yaml`, or ask me to.
   4. Start the **iOS → TestFlight** workflow. About 15–25 minutes later the build appears in TestFlight.
4. **TestFlight:** install the TestFlight app on your iPhone, add yourself as an internal tester, and play the real app. You'll see test ads.
5. **AdMob** (admob.google.com):
   1. Add an iOS app (you can link it to the store listing later).
   2. Create two ad units, **Rewarded** and **Interstitial**.
   3. Send me the app ID (`ca-app-pub-…~…`) and the two unit IDs (`ca-app-pub-…/…`). They go in `ios/App/App/Info.plist` and `src/native/ids.ts`.
   4. In AdMob → Privacy & messaging, create a **GDPR** message (needed for EU players) and an **IDFA explainer** (optional).
6. **Remove Ads purchase:** App Store Connect → your app → Monetization → In-App Purchases → **+** → **Non-Consumable**.
   - Product ID: `com.blueprintmerge.game.removeads`
   - Price: e.g. $2.99
   - Display name: Remove Ads
   - Review screenshot: the Settings screen

   You also need to accept the **Paid Apps agreement** and fill in your banking and tax details (Business → Agreements). Purchases don't work until that's done.
7. **Support email:** in `public/support.html`, replace `SUPPORT_EMAIL` with the address you want players to write to (or tell me and I'll do it).
8. **Store listing:** paste the text below, upload the six screenshots, and fill in the age rating and App Privacy answers below.
9. **Submit for review.** Answer **Yes** to "uses the Advertising Identifier (IDFA)" if asked; it's for serving ads. Review usually takes 1–2 days.

## Store listing text

**Name:** Blueprint Merge
**Subtitle (30 chars):** Slide, merge & build a city
**Category:** Games → Puzzle (secondary: Casual)
**Price:** Free (with in-app purchase)

**Promotional text (170 chars):**
Eight worlds to build in: from a construction site to Atlantis, sakura gardens and a desert oasis. Slide, merge and grow a brick into a space elevator!

**Description:**
Slide buildings up the blueprint, merge two of a kind, and grow a single brick into a city that reaches the clouds.

SATISFYING MERGES
• Aim, slide and watch two matching buildings snap together into something bigger
• Set off chain reactions: the glowing aim guide shows when a shot will merge, and lights up in rainbow for the big chains
• Bank shots, streaks, combos and Heat levels that make every run flashier than the last

EIGHT WORLDS
• Construction Site, Tropical Beach, Alpine Peaks, Sweet Town, Neon City, Atlantis, Sakura Spring and Desert Oasis
• Every world has its own 18 buildings, music, merge sounds and living scenery: falling snow, drifting cherry petals, bubbles and fish
• In endless mode the world changes right when your run is at its hottest

A CAMPAIGN TO CONQUER
• 264 hand-tuned levels across eight districts on a winding campaign map
• Earn stars to clear the clouds and reveal the next district
• Big Build landmark levels, scaffolds to play around, and a fireworks finale every time you clear a level

EVERY DAY SOMETHING NEW
• The Daily Blueprint: the same puzzle for everyone, once a day
• Login rewards, a collection book of every building in every world, and your own skyline

FAIR AND FRIENDLY
• No timers, no energy, no pay-to-win
• Ads only between rounds (never in your first games), and rewards only when you choose them
• Remove Ads with a single one-time purchase
• Plays offline

**Keywords (100 chars):**
merge,puzzle,build,city,house,blocks,stack,relax,casual,tower,match,builder,offline,satisfying

**Support URL:** https://house-merge-game.vercel.app/support.html
**Privacy Policy URL:** https://house-merge-game.vercel.app/privacy.html
**Copyright:** 2026 (your name)

## Age rating answers

Answer **None** to every content question: no violence, no mature themes, no gambling, no contests, no user-generated content, no unrestricted web access. Result: **4+**.

Note: the game has ads. With "Made for Kids" left **unchecked**, a 4+ rating is fine. Don't choose the Kids category, because Apple's rules for kids' apps forbid behavioural ads.

## App Privacy answers ("nutrition label")

Data collection: **Yes**. The data comes from the AdMob SDK, not the game itself.

| Data type | Linked to the user? | Used for tracking? | Purposes |
|---|---|---|---|
| Identifiers → Device ID | No | Yes | Third-Party Advertising |
| Usage Data → Advertising Data | No | Yes | Third-Party Advertising |
| Diagnostics → Crash Data, Performance Data | No | No | App Functionality (AdMob) |
| Location → Coarse Location (from IP) | No | Yes | Third-Party Advertising |

The game has no accounts and collects no contact info, purchases history or gameplay content: everything stays on the device.

## Before you submit: checklist

- [ ] Real AdMob app ID in `ios/App/App/Info.plist` and real unit IDs in `src/native/ids.ts` (test ads otherwise)
- [ ] Remove Ads product created, with the same ID as `src/native/ids.ts`
- [ ] Paid Apps agreement signed
- [ ] `SUPPORT_EMAIL` replaced in `public/support.html`
- [ ] `SITE` in `src/native/links.ts` matches your Vercel domain (used by the in-app privacy and support links)
- [ ] Played the TestFlight build on a real iPhone: sound, haptics, a rewarded ad, Remove Ads (sandbox tester), Restore purchases
- [ ] Music and art: confirm you have commercial rights to the music tracks and the painted backgrounds
- [ ] Screenshots uploaded (6.9" iPhone)

## Updating the app later

Push to the branch: Codemagic builds and uploads a new TestFlight build automatically. To release it, create a new version in App Store Connect, pick the build and submit. Bump `version` in `package.json` and `MARKETING_VERSION` in the Xcode project for each App Store release (or ask me).
