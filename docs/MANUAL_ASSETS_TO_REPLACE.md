# Manual Asset Replacements — Web Madre feedback 22-abr-2026

Some assets need to be downloaded and placed manually. Here is the full list.

## 1. Home hero image (PDF item 1)

- **Drive file:** https://drive.google.com/file/d/1TZv8DiBNCrG5skBTCMqRDup8mc2UW2yD/view
- **Current behavior:** Home hero rotates through 4 images in `src/components/bizzen/sections/HeroSection.tsx`:
  - `/images/hero/hero-conference.jpg`
  - `/images/hero/hero-event-1.jpg`
  - `/images/team/team-workshop.jpg`
  - `/images/team/gallery-3.jpg`
- **What to do:** Download the Drive file, rename to `hero-conference.jpg`, and replace `public/images/hero/hero-conference.jpg`. (This is the first image in the carousel.)
- **Recommended size:** 1920×1080 (landscape), JPG, < 400 KB after compression.

## 2. Conferences hero image (PDF item 18)

- **Drive file:** https://drive.google.com/file/d/1h5IZF2pV-l2FCvQWPS7FdM3nqRK8irbM/view
- **Current file:** `public/images/team/iskya-speaking.jpg`
- **Used in:** `src/app/[locale]/(website)/conferencias/page.tsx` line 74.
- **What to do:** Download the Drive file, rename to `iskya-speaking.jpg`, and replace `public/images/team/iskya-speaking.jpg`.
- **Recommended size:** 800×600 or larger, JPG.

## 3. Team photos — full-body crops (PDF item 14)

These live in Sanity as `teamMember` documents (Laura Pupo Roncallo, Regina Navarro, etc.).

The display code now uses a portrait aspect (2:3) with `objectPosition: top center`, so most standard portrait photos will render correctly. However, if the photos still look cropped strangely:

- **Open Sanity Studio:** https://kultiva.sanity.studio/
- **Go to:** *Team Members* → open each member
- **Re-upload** their photo and **set a hotspot** (click the crop/hotspot icon) to position the focus on the face. Sanity will then crop around that point.
- **Alternative:** upload a new portrait-format photo (taller than wide) so no crop is needed.

## 4. Hero image on any other page

If a `heroSlide` document already exists in Sanity, the above home-hero replacement can also be done there instead of editing the file:

- **Open Sanity Studio:** https://kultiva.sanity.studio/
- **Go to:** *Hero Slides* → edit or create → upload the new image → publish.
- **Note:** the current code does NOT yet consume `heroSlide` — it reads static files. If you want the website to pull from Sanity, ping me and I'll wire it up.

---

## Why not automate the downloads?

The Drive files aren't public enough for `curl` — for larger files Drive shows a virus-scan confirmation page which breaks headless fetches. Downloading them through your browser (where you're logged in to the Google account that owns them) is the reliable path.
