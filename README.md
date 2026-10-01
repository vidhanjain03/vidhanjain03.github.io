# vidhanjain.com

My personal website: blog, research, projects, photos and an about page.
Built with [Eleventy](https://www.11ty.dev/) (a simple static site generator) and hosted on Vercel.

## Where things live

```
.github/workflows/         the 6-hourly Pinterest sync (setup/pinterest-sync.yml goes here)
scripts/
├── pinterest_sync.py      pulls your new Pinterest uploads
└── pinterest_login.py     one-time login + import (run on your computer)
src/
├── _data/                 ← edit these JSON files to change content
│   ├── site.json            name, email, links, sidebar text, speech bubble
│   ├── publications.json    papers (shown on /research/ and the home page)
│   ├── researchThemes.json  the research groupings (thermal, maritime, lidar)
│   ├── projects.json        project cards (/projects/ and the home page)
│   ├── photos.json          website-only photos, removed photos, Pinterest settings
│   ├── pinterestPins.json   your Pinterest photos (written by the sync, don't edit)
│   └── gallery.js           combines the two for the photos page
├── blog/                  ← one Markdown file per blog post
├── assets/
│   ├── css/style.css        all styling, one file
│   ├── js/main.js           dark mode, accent colour, menu, TOC, lightbox
│   ├── img/                 profile photo + favicon
│   ├── photos/              put your photos here
│   ├── fonts/               self-hosted fonts
│   └── vidhan-jain-resume.pdf
├── _includes/
│   ├── layouts/             base (every page), page, post
│   └── partials/            sidebar, footer, post list, cards
├── index.njk              home page          → /
├── blog.njk               blog archive       → /blog/
├── research.njk           research           → /research/
├── projects.njk           projects           → /projects/
├── photos.njk             photo gallery      → /photos/
├── me.njk                 about me           → /me/
├── now.njk                now page           → /now/
├── topics.njk / topic.njk tag pages          → /topics/, /topics/<tag>/
└── 404.njk
```

## Run it on your computer

Needs Node.js 18 or newer.

```bash
npm install
npm start          # opens a live preview at http://localhost:8080
```

`npm run build` writes the finished site into `_site/`.

**Without Node/npm:** if you have a built `_site/` folder, run `python -m http.server 8080 -d _site`
from this folder and open http://localhost:8080. You don't need npm to publish either: Vercel
installs and builds everything itself when you push.

## Write a blog post

Create a file in `src/blog/` named `YYYY-MM-DD-your-slug.md`:

```markdown
---
title: "My post title"
description: One line that shows under the title and in link previews.
icon: 🧠
tags: [computer-vision, pytorch]
---

Write in Markdown. Use ## headings — they become the "On this page" table of contents.
```

- The date comes from the file name. The URL becomes `/blog/your-slug/`.
- Tags automatically get their own page under `/topics/`.
- Add `draft: true` to hide a post while you work on it.
- Code blocks with a language (```` ```python ````) get syntax highlighting.
- Images for a post: put them in `src/assets/img/` and use `![alt text](/assets/img/file.jpg)`.

## Photos

The photos page is one stream, newest first and grouped by year, fed by two sources:

1. **Your Pinterest uploads, automatically.** Every photo you upload to Pinterest appears
   here within about 6 hours. Pins you *saved* from other people are ignored, and so are videos.
2. **Website-only photos, by hand.** Put the file in `src/assets/photos/` and list it in
   `src/_data/photos.json`.

Both look exactly the same on the page.

`src/_data/photos.json`:

```json
{
  "pinterest": {
    "enabled": true,
    "profile": "your-pinterest-username",
    "removeWhenDeletedOnPinterest": false
  },
  "removed": [
    "https://www.pinterest.com/pin/1234567890/"
  ],
  "photos": [
    { "file": "hostel-roof.jpg", "caption": "Sunset from the hostel roof", "date": "2025-11-02" }
  ]
}
```

| To… | Do this |
| --- | --- |
| Add a Pinterest photo | Upload it on Pinterest. That's it. |
| Add a website-only photo | Put the file in `src/assets/photos/`, add it under `"photos"` (a `date` puts it in the right place in the stream). |
| Remove any photo from the site | Pinterest photo: paste its pin link into `"removed"`. Website photo: delete its entry. A removed photo never comes back. |
| Keep photos you delete on Pinterest | Default. The sync only **adds**; deleting a pin on Pinterest leaves the site alone. Set `removeWhenDeletedOnPinterest` to `true` to mirror deletions. |
| Pause the sync | Set `"enabled": false`. |

The sync is one-way: it only reads from Pinterest and never posts, edits, or deletes anything there.

### How the sync works

- `scripts/pinterest_sync.py` asks Pinterest's official API for the pins you created
  (`pin_filter=exclude_repins`), and adds new photos to `src/_data/pinterestPins.json`.
- A GitHub Action (`.github/workflows/pinterest-sync.yml`) runs it every 6 hours. When
  there are new photos, it commits them, and Vercel redeploys. To run it right away:
  GitHub → Actions → **Sync Pinterest photos** → **Run workflow**.
- Pinterest logins last 60 days but renew every time they're used. The renewed login is
  stored encrypted (with your app secret) in `.pinterest-state`, so it keeps working
  indefinitely. When only that file changes, Vercel skips the redeploy.
- If the login ever breaks, the Action fails and GitHub emails you. Run the login script
  again and update the `PINTEREST_REFRESH_TOKEN` secret. The site keeps all its photos in
  the meantime.
- Images load from Pinterest's image servers (`i.pinimg.com`). If one ever stops loading,
  the site hides it instead of showing a broken image.

### One-time setup (about 10 minutes)

1. **Create a Pinterest app.** Go to <https://developers.pinterest.com/apps/>, connect your
   account, and create an app. Pinterest may review it before it works; trial access is
   enough. In the app settings, add this Redirect URI: `http://localhost:8085/`
2. **Log in and import.** On your computer, from this folder:
   `python scripts/pinterest_login.py`
   Enter the app ID and secret, approve read-only access in the browser that opens, and
   it imports all your existing uploads into `src/_data/pinterestPins.json`.
   It needs plain Python 3.8+ and no pip installs.
3. **Add three secrets** that the script prints, in GitHub → your repo → Settings →
   Secrets and variables → Actions:
   `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `PINTEREST_REFRESH_TOKEN`.
4. **Add the workflow.** Move `setup/pinterest-sync.yml` to `.github/workflows/pinterest-sync.yml`.
5. Commit and push. Then run the action once by hand to check it works.

GitHub pauses scheduled actions in a repo with no activity for 60 days and emails you when
it does. Re-enable it from the Actions tab.

## Add a paper or a project

Copy an existing entry in `publications.json` or `projects.json` and edit it.
For papers, `theme` must match an `id` in `researchThemes.json`, and `status` is one of
`Published`, `Accepted`, `Under review`. To add links to a paper:

```json
"links": [{ "label": "PDF", "url": "https://..." }, { "label": "Code", "url": "https://github.com/..." }]
```

## Deploy (Vercel)

`vercel.json` already tells Vercel what to do (`npm run build`, output folder `_site`).
Push to the GitHub repo that Vercel watches and it deploys by itself. If Vercel's project
settings have an old "Output Directory" override, clear it so `vercel.json` wins.
