# Deploying Habitus

The app is a single static file, so "deploying" means putting `index.html` somewhere with
an HTTPS URL. Two routes below — GitHub Pages is the one this repo is set up for.

## GitHub Pages (the live site)

The repo is published from the `main` branch, root directory. Every push updates the live
site a minute or so later.

```bash
git add -A && git commit -m "your change" && git push
```

That's the whole deploy. To check the build:

```bash
gh run list --limit 3
```

If you ever need to re-enable Pages from scratch:

```bash
gh api -X POST repos/:owner/:repo/pages -f "source[branch]=main" -f "source[path]=/"
```

## Netlify Drop (throwaway copies)

For a one-off preview that doesn't touch the live site — sharing a work-in-progress, or
testing something before it lands:

1. Go to <https://app.netlify.com/drop>.
2. Drag `index.html` onto the page.
3. You get a URL like `https://something-random.netlify.app` immediately. No account
   needed for the first upload.

Each drop is a separate site with its own URL and its own `localStorage`, so a preview
never sees or corrupts the data on the real site.

## After changing the domain

Cloud sync is off by default, so a fresh deploy needs nothing. If you *have* set up
Firebase (see [SYNC-SETUP.md](SYNC-SETUP.md)), Google sign-in will refuse to run on a
domain it doesn't know about. Add the new one under **Firebase → Authentication →
Settings → Authorized domains**. You need to do this for every deploy target — the Pages
domain and any Netlify preview you want to sign in on.

## What each visitor gets

Data lives in each browser's `localStorage`, keyed `tempo.v1`. Publishing the site shares
the *app*, not your sessions — every visitor starts with an empty log of their own, and
nothing is sent anywhere unless that visitor configures their own Firebase project.

There is no server, no analytics and no telemetry. Nothing to provision, nothing to pay
for, nothing to keep patched.
