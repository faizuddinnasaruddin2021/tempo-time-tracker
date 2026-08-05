# Tempo — Cloud Sync Setup (free, ~10 minutes)

Sync uses Firebase (Google's free backend). Once set up, sign in with Google on any device and your sessions, tasks and settings stay in sync — phone included.

## 1. Create a Firebase project
1. Go to https://console.firebase.google.com and click **Add project** (any name, e.g. "tempo"). Google Analytics can be off.
2. In the project, click the **</>** (Web) icon to register a web app (any nickname). Firebase shows you a `firebaseConfig` object — **copy it**, you'll need it in step 4.

## 2. Enable Google sign-in
1. In the left menu: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Google** and save.

## 3. Create the database
1. **Build → Firestore Database → Create database** → Start in **production mode**, pick a region near you.
2. Open the **Rules** tab and replace the rules with this (each user can only read/write their own data), then **Publish**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 4. Paste your config into index.html
Open `index.html` in a text editor, find this line (search for `FIREBASE_CONFIG`):
```js
const FIREBASE_CONFIG = null; /* e.g. ...
```
Replace it with your config from step 1, e.g.:
```js
const FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "tempo-xxxxx.firebaseapp.com",
  projectId: "tempo-xxxxx",
  appId: "1:1234:web:abcd"
};
```

## 5. Host the site (required for Google sign-in)
Google sign-in doesn't work when opening the file directly from disk. Easiest options:
- **Netlify Drop** (easiest): go to https://app.netlify.com/drop and drag `index.html` in. You get a URL like `https://something.netlify.app`.
- Or GitHub Pages, Vercel, Firebase Hosting — anything with HTTPS.

Then in Firebase: **Authentication → Settings → Authorized domains → Add domain** and add your new domain (e.g. `something.netlify.app`).

## 6. Use it
Open your URL on any device → click the **☁** icon in the top bar → **Sign in with Google**. That's it. Changes sync automatically within a couple of seconds; last edit wins if two devices change things at once. Your local data is pushed up on first sign-in, and everything still works offline (it re-syncs when you're back online).
