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
```

## Running locally

No build step. Either open `index.html` directly, or serve it:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deploying

Push to `main`, then in the repository settings enable **Pages → Deploy from a
branch → `main` / root**. `.nojekyll` is present so files and folders beginning
with an underscore are served as-is.

## Still to fill in

- `about.html` — the bio is still the Lorem ipsum placeholder from the Figma file.
- `contact.html` — email, phone and social handles are placeholders.
- `videography.html` — the three reel cards link to `#`; point them at real videos.
