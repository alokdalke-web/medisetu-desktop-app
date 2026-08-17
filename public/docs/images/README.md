# Authoring guides (images, video & rich sections)

The in-app Guidelines pages (`/app/guidelines`) render Markdown from
`public/docs/**`. Beyond plain text/tables, the renderer supports images,
videos, and callouts so guides can look rich (Razorpay-style) instead of being
walls of tables. Put image/diagram assets in **this** folder.

## Folder layout

Images are grouped by guide area so they're easy to find and update:

```
public/docs/images/
├── getting-started/   overview & onboarding screenshots
├── dashboards/        the 5 role dashboards (dashboard-admin.svg, …)
├── roles/             the 5 role guides (role-doctor.svg, …)
└── features/          appointments, patients, payments, pharmacy, subscription
```

Put new images in the matching subfolder (add a new one if a guide area isn't
listed yet).

## Images

1. Drop the file in the right subfolder, e.g.
   `public/docs/images/dashboards/dashboard-admin.png`
   (`.png` for screenshots, `.svg` for diagrams; compress wide screenshots to
   ~1600px max).
2. Reference it from any guide with a **root-absolute** path that includes the
   subfolder:

   ```markdown
   ![Alt text becomes the caption](/docs/images/dashboards/dashboard-admin.png)
   ```

   The alt text renders as an italic caption, and the image is click-to-zoom
   (full-screen lightbox — Esc or click outside to close).
3. Reference images with `/docs/images/...` only — the renderer resolves this
   against the deploy base (`/app/`) automatically. Do **not** hard-code
   `/app/docs/...`.

## Placeholder images (replace these)

Every major guide already has a **labeled placeholder** image (e.g.
`dashboard-admin.svg`, `role-doctor.svg`) sitting right under its title. Each
one renders a dashed "Placeholder — replace this file with a real screenshot"
card. To update, either:

- **Easiest:** overwrite the file in place, keeping the same name (e.g. replace
  `dashboard-admin.svg` with your real image saved as `dashboard-admin.svg`), or
- Save your screenshot under a new name and update the `![…](…)` link in the
  guide to point at it (a `.png`/`.jpg` is fine).

The caption in each placeholder describes what screenshot belongs there.

## Videos (YouTube)

Paste a YouTube URL **on its own line** — it becomes a responsive embedded
player automatically:

```markdown
https://www.youtube.com/watch?v=b410CNAgziE
```

`youtu.be/…`, `/embed/…`, and `/shorts/…` links work too. To give the player a
title, use a link whose text starts with "Video":

```markdown
[Video: Booking an appointment](https://youtu.be/b410CNAgziE)
```

## Making a guide look rich (not just tables)

Mix these building blocks — all already styled by the renderer:

- **Callouts** — start a blockquote with `Note:`, `Tip:`, `Warning:`, or
  `Important:` to get a colored, icon'd box:
  ```markdown
  > Tip: You can press **A** to start a new appointment.
  ```
- **Stepped workflows** — numbered lists (`1.` `2.` `3.`) render as numbered
  badge steps, so break procedures into short numbered steps.
- **Sections** — use `##` headings (auto-numbered, with a right-rail "On this
  page" TOC). Break long tables into short sections with a screenshot or short
  video near the top of each.
- **Code** — fenced code blocks get a copy button.

## Where the rendering lives

`src/pages/guidelines/GuidelinesPage.tsx` — `img` + `Lightbox` (images),
`YouTubeEmbed` (video), `CopyableCodeBlock` (code), and the callout/`details`
components.
