# Ivan Isakov — personal website

## Preview

Install Node.js 20 or newer, then run `npm run dev` from this folder.
Open http://127.0.0.1:4321. Refresh the page after editing content.
Run `npm run build` to regenerate the publishable website in `dist`.
No packages need to be installed. Do not edit generated files in `dist`.

## Add project content

Each project has a folder in `Assets/Projects`, named after the project.
- Write plain text in `description.txt`. Separate paragraphs with a blank line.
- Put images and videos directly beside that file. Project detail pages automatically show them, with carousel controls when there is more than one asset. The Projects grid shows only thumbnail.png, without carousel controls or counters.
- Images: JPG, JPEG, PNG, WebP, GIF, AVIF, SVG.
- Videos: MP4, WebM, OGV, MOV. MP4 with H.264/AAC offers broad browser compatibility; MOV playback depends on the browser and codec.
- Media are sorted by filename. Use `01-cover.jpg`, `02-detail.jpg`, `03-demo.mp4` to set the order. Add `thumbnail.png` to each project folder to choose its cover. It is used only on the Projects grid and is excluded from the detail gallery. Without it, the grid shows a neutral title placeholder.
- Empty project folders show a neutral title thumbnail until you add media.
- Rebuild and republish after changes to update the hosted site. Local preview rebuilds on page refresh.

`Assets/projects.json` controls project names, folder names, URL slugs, categories, years and order. It was transcribed from `Assets/Projects.rtf`; `Assets/Projects.txt` is its readable extraction. Subsequent changes to the RTF do not automatically modify the catalog. Update the JSON to add/remove projects or change categories; add the corresponding folder and description.txt for a new project. Filters match either an assigned category or its occurrence in the description, case-insensitively. Filter and sort state stay in the URL and are restored on return. Sort by name (A–Z or Z–A), year (newest or oldest), or original order. Year ranges use their final year; undated entries stay last.

All 32 entries are included, including DJing and Blog, whose inclusion was marked tentative in the original RTF. They have no year because none was supplied. Remove those catalog entries if you decide against them. The blog is also linked through Substack on Contact.

Edit your biography in `Assets/Intro.txt` and your contact links in `Assets/Contact.json`.
The design is in `src/style.css`; interactions are in `src/app.js`; page templates are in `scripts/build.mjs`.

Fonts match the original ivascht.com: Brandon Grotesque Light headings and Avenir Light body text, loaded from its existing font provider with local fallbacks.

## Checks

Run `node scripts/check.mjs` to verify generated routes, internal links, contact details, filters and media rendering using isolated fixtures.

## Home and About

The home page shows your name and subtitle. Edit the subtitle in `scripts/build.mjs`. The About page reads `Assets/Intro.txt`. Add photos to `Assets/About`; they display in filename order. Use descriptive names such as `01-portrait.jpg`.

## Imported content from the old site

The 2026-09-11 import is documented in `Assets/Imported-source/IMPORT-REPORT.md`.
Project media and descriptions are in their normal folders; imported About photos are in `Assets/About`.
`import-sources.json` records the original source and checksum. `imported-text.txt` preserves additional source prose, and `video-notes.txt` preserves video descriptions and unavailable video links. The website displays `description.txt`; these other text files are reference material.
Unmatched older work and stock/demo items are in `Assets/Import-review`, outside the published project catalog.
Imported videos remain at up to 1080p, including long recordings. Unchanged media is copied only once into the local preview output.

## Storage-efficient local preview

`npm.cmd run dev` serves all media directly from `Assets`; it regenerates only the small HTML/CSS/JavaScript files in `dist`. Restart an already-running server after this update. Refresh after editing content; no manual build is needed for local work.

`npm.cmd run build` is the explicit self-contained publishing build and copies media into `dist/media`. Use it only when that output is needed. A future GitHub Actions publishing workflow can run this build on GitHub instead of your computer. GitHub Pages requires generated static pages; `Assets` alone is not a complete website. No GitHub deployment workflow has been added yet.

## YouTube videos and thumbnails

Put YouTube links in each project's `videos.txt`, one per line in the desired order. Standard watch, youtu.be, Shorts, live and embed links are supported. Videos appear before images in the detail carousel; playback stops when leaving a slide. Local video files are no longer shown in the carousel.

Use `thumbnail.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, or another supported image extension for a project's grid cover. Thumbnails are excluded from the detail carousel. Existing thumbnails were resized to a maximum dimension of 1000 pixels and compressed as JPEGs.

HTTP/HTTPS URLs in `description.txt` become clickable links opening in a new tab. Keep descriptions as plain text.
