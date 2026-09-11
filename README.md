# Ivan Isakov — personal website

## Preview

Install Node.js 20 or newer, then run `npm run dev` from this folder.
Open http://127.0.0.1:4321. Refresh the page after editing content.
Run `npm run build` to regenerate the publishable website in `dist`.
No packages need to be installed. Do not edit generated files in `dist`.

## Add project content

Each project has a folder in `Assets/Projects`, named after the project.
- Write plain text in `description.txt`. Separate paragraphs with a blank line.
- Put images and videos directly beside that file. Both project cards and detail pages automatically show them, with carousel controls when there is more than one item.
- Images: JPG, JPEG, PNG, WebP, GIF, AVIF, SVG.
- Videos: MP4, WebM, OGV, MOV. MP4 with H.264/AAC offers broad browser compatibility; MOV playback depends on the browser and codec.
- Media are sorted by filename. Use `01-cover.jpg`, `02-detail.jpg`, `03-demo.mp4` to set the order. The first asset is the project thumbnail.
- Empty project folders show a neutral title thumbnail until you add media.
- Rebuild and republish after changes to update the hosted site. Local preview rebuilds on page refresh.

`Assets/projects.json` controls project names, folder names, URL slugs, categories, years and order. It was transcribed from `Assets/Projects.rtf`; `Assets/Projects.txt` is its readable extraction. Subsequent changes to the RTF do not automatically modify the catalog. Update the JSON to add/remove projects or change categories; add the corresponding folder and description.txt for a new project. Filters match either an assigned category or its occurrence in the description, case-insensitively. Filter state stays in the URL and is restored on return.

All 32 entries are included, including DJing and Blog, whose inclusion was marked tentative in the original RTF. They have no year because none was supplied. Remove those catalog entries if you decide against them. The blog is also linked through Substack on Contact.

Edit your biography in `Assets/Intro.txt` and your contact links in `Assets/Contact.json`.
The design is in `src/style.css`; interactions are in `src/app.js`; page templates are in `scripts/build.mjs`.

Fonts match the original ivascht.com: Brandon Grotesque Light headings and Avenir Light body text, loaded from its existing font provider with local fallbacks.

## Checks

Run `node scripts/check.mjs` to verify generated routes, internal links, contact details, filters and media rendering using isolated fixtures.
