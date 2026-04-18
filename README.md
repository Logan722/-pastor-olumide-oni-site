# Pastor Olumide Oni — God of Elijah Ministry Website

## What's in this folder

```
site/
├── index.html                 Home (live sermon + daily devotional)
├── about.html                 About (Pastor & Pastor Mrs. Oni)
├── sermons.html               Sermons (live YouTube RSS auto-refresh)
├── books.html                 Books (library + Drive reader modal + native HTML pages)
├── devotionals.html           Devotionals index (daily rotation)
├── contact.html               Contact form (Netlify Forms)
├── books/                     Native HTML reading pages for Word-doc books
│   ├── a-living-sacrifice.html
│   ├── your-delay-is-over.html
│   └── your-season-of-lifting-is-here.html
└── devotionals/               9 individual devotional posts
    ├── fire-falls-altar-ready.html
    ├── stand-before-the-lord.html
    ├── still-small-voice.html
    ├── brook-dries-up.html
    ├── double-portion-persistent.html
    ├── prayer-that-shuts-heavens.html
    ├── chariots-of-fire.html
    ├── juniper-tree.html
    └── widows-obedience.html
```

> **How books are served.** The four featured books wired to your Google Drive
> files are read in two different ways:
>
> - **You Will Rejoice Again** (scanned PDF) opens inside the Drive reader
>   modal on `books.html`.
> - **A Living Sacrifice**, **Your Delay Is Over**, and **Your Season Of
>   Lifting Is Here** are rendered as native cathedral-style HTML reading
>   pages under `/books/`. Clicking these cards navigates directly to the
>   dedicated page — hero with scripture anchor, chapter table of contents,
>   drop caps, and numbered prayer points, all in the same gold-on-black
>   design language as the rest of the site.
>
> The remaining 8 slots are placeholders. Open `books.html` and follow the
> inline instructions near the `BOOKS` array to swap in your next titles.
>

---

## Part 1 — Deploy to Netlify (5 minutes)

### A. Initial deploy

1. Go to **https://app.netlify.com/drop**
2. Drag and drop the entire `site/` folder onto the page
3. Netlify uploads, auto-deploys, and gives you a random URL like
   `random-name-12345.netlify.app`. The site is live.

### B. Rename the site

1. In the Netlify dashboard, click **Site configuration → Change site name**
2. Change to: `pastorolumideoni` (or whatever you prefer)
3. Your URL becomes `pastorolumideoni.netlify.app`

### C. Set up contact form email notifications

This is the step that makes form submissions reach your inbox.

1. Netlify dashboard → **Site configuration → Forms**
2. You should see a form named `contact` listed (Netlify auto-detected it)
3. Click on `contact`, then **Settings & usage → Form notifications**
4. Click **Add notification → Email notification**
5. Enter the email address where you want submissions delivered
6. Save

From now on, every form submission emails you with name, email, phone, reason, and message.

### D. (Optional) Custom domain

If you want `pastorolumideoni.com` instead of `.netlify.app`:

1. Buy the domain from any registrar (Namecheap, Google Domains, Cloudflare — ~$12/yr)
2. Netlify dashboard → **Domain settings → Add a domain**
3. Follow the DNS instructions. Free SSL is automatic.

---

## Part 2 — Setting up the Books page

The Books page displays your books as cards and opens each one in an embedded reader right on the site. Visitors never leave the page to read — they tap a book, the reader opens full-screen, they scroll through, and close to return to the library.

**The reader supports four Google file types**, and automatically uses the correct preview URL for each:

- **Drive files (PDFs, images, etc.)** — links like `https://drive.google.com/file/d/{ID}/view`
- **Google Docs** — links like `https://docs.google.com/document/d/{ID}/edit`
- **Google Sheets** — links like `https://docs.google.com/spreadsheets/d/{ID}/edit`
- **Google Slides** — links like `https://docs.google.com/presentation/d/{ID}/edit`

You can also paste just the raw file ID; the code will assume it is a Drive file.

### Required: make each book readable

For each book, whether it is a PDF on Drive or a Google Doc, do this once:

1. Right-click the file in Drive → **Share**
2. Under "General access," change the dropdown to **"Anyone with the link"**
3. Keep the role as **"Viewer"**
4. Click **"Copy link"** — the full URL is what you need

### Adding a book's share URL to the site

1. Open `site/books.html` in any text editor (VS Code, Notepad, Sublime, TextEdit, etc.)
2. Scroll to the bottom and find the `BOOKS` array — it starts with `const BOOKS = [`
3. Find the book you want to activate. Each entry looks like:
   ```js
   {
     "tone": 1,
     "title": "The Mantle of Elijah",
     "posterTitle": "The <em>Mantle</em> of Elijah",
     "category": "Prophetic Ministry",
     "description": "Inheriting the prophetic anointing...",
     "driveFileId": "PLACEHOLDER_ID_01"
   }
   ```
4. Replace `"PLACEHOLDER_ID_01"` with the full share URL you copied, like:
   ```js
   "driveFileId": "https://docs.google.com/document/d/1kwqKlhuApR.../edit?usp=sharing"
   ```
5. Save, redeploy to Netlify (drag the updated folder), and that book now opens in the reader.

**Books 1–4 are already wired up** to the URLs you shared, mapped to the first four placeholder slots. You will want to rename their titles, categories, and descriptions in the array to match your actual book content.

### Optional: hide the download button in the reader

If you want visitors to read on the site only (not download):

1. In Drive, select the file
2. Click the share gear icon (top-right of the share dialog)
3. Uncheck **"Viewers and commenters can see the option to download, print, and copy"**
4. Save

The embedded reader will now hide the download button for that file.

### Adding more books than the current 12

The `BOOKS` array can be any length. To add a new book, copy an existing entry in the array and update its values. The grid layout adjusts automatically. To remove a book, delete its entry from the array.

---

## Part 3 — Live integrations

### Sermons page — YouTube RSS
- Reads from the channel RSS feed for channel ID `UCoVS2R6n3ewcIvSb_OzLLQg`
- Updates automatically within 15 min to ~2 hours of a new video being published
- No manual work needed after deploy

### Devotionals — daily rotation
- 9 devotionals cycle through the "featured" slot
- Rotation is based on day-of-year modulo 9
- Every day, the home page and devotional index highlight a different one
- To add more devotionals, create a new HTML file in `/devotionals/`, then add its metadata to the `DEVOTIONALS` JavaScript array in both `index.html` and `devotionals.html`

### Contact form
- Submissions → Netlify dashboard and your email (once configured)
- Spam protection: honeypot + Netlify's Akismet
- AJAX submission keeps visitors on the page with a success message

---

## Part 4 — Mobile experience

Several mobile-specific improvements are built in:

- **Functional mobile nav drawer**: tapping the hamburger opens a full-screen menu with all six pages, ministry scripture, and social icons
- **Back-to-top button**: floating gold button, bottom-right, appears after scrolling 400px
- **Home hero reflow**: on mobile, the headline and scripture appear before the pastor's portrait (rather than a giant portrait pushing everything below the fold)
- **Preview mode banner**: short version on phones, full version on tablets/desktop
- **Touch targets**: all buttons are at least 44×44px for accessibility

---

## Part 5 — Known limitations

1. **No video duration** on sermon cards — YouTube RSS doesn't expose duration. If you need it, we'd switch to YouTube Data API v3 (needs an API key).
2. **Sermon thumbnails** are YouTube's defaults. Whatever cover image you set on each video is what appears.
3. **Devotional preview in file:// mode** shows demo content with a "Preview Mode" banner. Real YouTube data loads once deployed to an HTTPS URL.
4. **Books in file:// preview** show "Preview Mode" because Google Drive embeds don't work from local files. Real PDF readers load once deployed.
5. **Placeholder Drive IDs** show the "Preview Mode" notice with instructions when tapped. Replace each `PLACEHOLDER_ID_NN` with a real file ID to make the book readable.

---

## Part 6 — Updating content

### To swap book titles, categories, or descriptions
Edit the `BOOKS` array at the bottom of `books.html`. Each entry's fields match exactly what displays on the card.

### To change the YouTube channel
Search for `UCoVS2R6n3ewcIvSb_OzLLQg` in `index.html` and `sermons.html`, replace with the new channel ID.

### To change the brand scripture
Search for `1 Kings 18 : 38` or `Then the fire of the Lord fell` across all files and update.

### To redeploy after changes
Simply drag the updated `site/` folder back onto Netlify's drop page. If you have connected a Git repo or CLI, use your usual deploy workflow.

---

Built April 2026.
