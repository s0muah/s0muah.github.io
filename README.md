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
videography.html   every TikTok reel, played in-page
contact.html       contact details
CV_Jeffrey_Sarpong.pdf  the CV behind the about and contact download buttons;
                   replace the file under the same name to update it
css/style.css      all styling; design tokens live in :root, light-mode
                   overrides in :root[data-theme="light"]
js/main.js         nav toggle, light/dark switch, footer year, reel player
assets/            images and SVGs exported from Figma
tools/stamp-css.sh cache-busts the stylesheet and script links; see below
```

## Running locally

No build step. Either open `index.html` directly, or serve it:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## After editing the stylesheet or script

Run `./tools/stamp-css.sh` before committing. It rewrites every
`<link rel="stylesheet">` to `css/style.css?v=<hash>` and every main.js
`<script>` to `js/main.js?v=<hash>`, where each hash comes from the file's
contents. Without it a deploy can look like it did nothing: GitHub Pages
caches assets for ten minutes, and the URLs alone never change. The script
is idempotent, so running it when nothing changed rewrites nothing.

## Deploying

Push to `main`, then in the repository settings enable **Pages → Deploy from a
branch → `main` / root**. `.nojekyll` is present so files and folders beginning
with an underscore are served as-is.

## Adding a reel

Copy one `<li>` in `videography.html` and change the video id in its `href`,
`data-tiktok` and cover `src`. Save the cover as `assets/covers/<id>.jpg`,
with its shorter side at 480px. TikTok's oEmbed response carries no
thumbnail, so covers have to live here.
