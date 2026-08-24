# jssarpong.io

Personal portfolio for **Sarpong Jeffrey Somuah** — computer engineer, mobile
videographer, UI/UX designer.

Built as a static site (plain HTML, CSS and vanilla JS) from the Figma source:
<https://www.figma.com/design/Fr6ovCaBcgdWnB078Ls0Df/Untitled>

## Structure

```
index.html         hero / landing
about.html         bio, education, achievements, journey
projects.html      PATRIOT, Kromthrift, Automatic Relay, Mobile Phone Detector
videography.html   mobile videography reel page
contact.html       contact details
css/style.css      all styling; design tokens live in :root
js/main.js         nav toggle + footer year
assets/            images and SVGs exported from Figma
tools/stamp-css.sh cache-busts the stylesheet link; see below
```

## Running locally

No build step. Either open `index.html` directly, or serve it:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## After editing the stylesheet

Run `./tools/stamp-css.sh` before committing. It rewrites every
`<link rel="stylesheet">` to `css/style.css?v=<hash>`, where the hash comes
from the file's contents. Without it a deploy can look like it did nothing:
GitHub Pages caches assets for ten minutes, and the stylesheet URL alone
never changes. The script is idempotent, so running it when nothing changed
rewrites nothing.

## Deploying

Push to `main`, then in the repository settings enable **Pages → Deploy from a
branch → `main` / root**. `.nojekyll` is present so files and folders beginning
with an underscore are served as-is.

## Still to fill in

- `about.html` — the bio is still the Lorem ipsum placeholder from the Figma file.
- `contact.html` — LinkedIn row was removed for want of a handle; add it back
  when there is one.
- `videography.html` — reels 2 and 3 currently point at the same TikTok
  (`ZSVQm136c`); replace reel 3 with its own link.
