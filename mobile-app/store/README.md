# Google Play submission kit (drafts)

Everything in this folder is a **draft for the owner to review**. Nothing here
is uploaded anywhere automatically, and nothing in it is a legal opinion.

| File | Use in Play Console |
| --- | --- |
| `play-icon-512.png` | Store listing → App icon (512 × 512 PNG) |
| `feature-graphic-1024x500.png` | Store listing → Feature graphic |
| `screenshots/*.png` | Store listing → Phone screenshots (1080 × 2160, 2:1). Taken on the Android emulator against production; they show the listings that are on the site today. Replace them once real dealer listings exist. |
| `listing-draft.md` | Store listing texts (Arabic and English) |
| `privacy-policy-draft.md` | Pointer only: the policy now lives in `src/constants/privacyPolicy.ts` and is served at `/privacy` |
| This file | Answers to prepare for Data safety, content rating, app access and the release checklist |

Release file: `build/app/outputs/bundle/release/app-release.aab`
(package `com.souqcars.mobile_app`, version 1.0.0, version code 1, signed with
the upload key whose SHA-256 is
`D5:55:ED:9D:2B:06:16:E2:99:FA:6C:2E:3B:35:A7:00:76:B9:60:7B:BA:32:A1:B7:B1:6B:4A:63:C3:E1:68:E5`).

## Data safety form: what the app and backend actually do

Checked in the code (`mobile-app/lib`, `server.ts`, `services/`, `routes/`).
Answer the form from this table; the privacy policy must say the same.

| Data type (Play category) | Collected | Why | Notes |
| --- | --- | --- | --- |
| Name (Personal info) | Yes, required | Account | Shown publicly for dealers |
| Email address (Personal info) | Yes, required | Account, sign-in, verification codes | Sent to Brevo to deliver verification emails |
| Phone number (Personal info) | Dealers only | Shown on listings so buyers can call / WhatsApp | Public |
| Address (Personal info) | Dealers: showroom address. Buyers: optional delivery address in a part order | App functionality | |
| Photos and videos | Dealers only | Car, part and reel listings | Public |
| Other user-generated content | Listings, captions, ratings, follows, favourites | App functionality | Listings and ratings are public |
| App interactions (App activity) | Favourites, follows, likes, views, sign-in events | App functionality | Stored on the server |
| Other actions / in-app search history | Smart AI search messages | App functionality | Sent to Google (Gemini) to interpret the search; also printed in the server log |
| Device or other IDs | No | | The app does not read advertising or device IDs |
| IP address | Server side, when a verification code is requested | Fraud and abuse prevention (rate limits) | Stored with the email in `otp_send_log` |
| Location | No (the app does not request location) | | Dealer coordinates entered on the website are public |
| Financial info / payments | No | | No payments in the app |
| Messages | No in-app chat | | Contact happens in WhatsApp or the phone app, outside Souq Cars |
| Reports and blocks | Yes, when a user reports content or blocks a dealer | Moderation, safety | Reporter, target, reason and optional details (`content_reports`); blocks (`user_blocks`). Not shown to the reported account |

- **Shared with third parties:** none in Play's sense. Google (Gemini) and Brevo
  process data on Souq Cars' behalf (service providers); Railway hosts the
  server. Name them in the privacy policy.
- **Encrypted in transit:** yes (HTTPS only; plain HTTP is allowed in debug
  builds only).
- **Data deletion:** in the app (Settings → Delete account) and on the web at
  `https://souq-elsyrat.com/delete-account` (email + password; the same
  generic answer for an unknown email and a wrong password). Both run
  `services/accountDeletion.ts`. What is removed and kept is listed on that
  page and in section 8 of the privacy policy. The web link only exists once
  this change is deployed.
- **Ads:** none. **Analytics or crash SDKs:** none.

## Content rating and audience (questionnaire hints)

- Category: Auto & Vehicles. Not designed for children; target audience 18+.
- Users can upload content that others see (listings, reels), and users can
  contact each other by phone or WhatsApp outside the app.
- No violence, gambling, alcohol or tobacco content is provided by the app.

## App access (for Google's reviewers)

The app works without an account (browse, search, Smart AI, parts, reels).
Favourites, notifications, part orders, account settings and all dealer tools
need a verified account. Give reviewers:

1. A verified **buyer** account (email + password), and
2. An approved **dealer** account if you want dealer tools reviewed,

created on the live site before submitting. New accounts need the emailed
verification code, so check that email delivery works first.

## Done in the compliance change (not deployed yet)

- Report (cars, parts, reels, dealers, users) and block dealers in the app;
  admin review in the website dashboard (Reports); terms section 6 forbids
  objectionable content (website and app).
- Public bilingual `/privacy` page; the app shows the same text
  (`mobile-app/tool/generate_privacy_policy.mts` regenerates it).
- Public `/delete-account` page with a verified request.
- Deleting a dealer now removes its reels, withdraws its parts, deletes its
  branches, staff, offers, warranties and warehouses, and deletes the uploaded
  photos and videos.

## Remaining blockers before a public release

1. **Deploy** the backend and website so `/privacy` and `/delete-account` are
   live, then put both URLs in Play Console (store listing and Data safety).
2. **Owner/legal approval of the policy text**, including the legal name of
   the operator, a postal address if required, and the governing law. The
   policy currently names only the support email.
3. **Business decisions** the policy states as current behaviour and that the
   owner should confirm: reports are kept after the account is deleted;
   order records stay with the other party; the verification-email log is kept
   30 days; the service is for people 18 and over.
4. **Reviewer accounts** and working verification email (see App access).
5. **Testing requirement.** Personal developer accounts created after
   13 November 2023 must run a closed test with at least 12 testers for 14 days
   before applying for production. Play Console shows whether it applies.
6. **Real-device check** of report, block and delete on a phone; only the
   emulator and automated tests have exercised them so far.
