# Book Processing Pipeline

Automation scripts for adding new books to the Pastor Olumide Oni website.

## Workflow (In-Chat)

1. **Dawn uploads a book PDF/DOCX to Google Drive BOOKS folder**
2. **Dawn opens a Claude chat and says "new book uploaded"**
3. **Claude runs the pipeline:**
   - Pulls the file from Drive via connector
   - Extracts raw text (`extract_text.py`)
   - Cleans OCR artifacts and structures content into JSON (Claude does this in-chat)
   - Generates the HTML book page (`generate_book_page.py`)
   - Generates the cover image (`generate_cover.py`)
   - Updates the BOOKS array in `books.html` (`master.py`)
   - Pushes everything to GitHub (`push_to_github.py`)
   - Netlify auto-deploys

## Scripts

| Script | Purpose |
|--------|---------|
| `extract_text.py` | Extracts raw text from PDF (Tesseract OCR for scanned) or DOCX (direct) |
| `generate_book_page.py` | Takes structured JSON config → produces full HTML book page |
| `generate_cover.py` | Takes cover config → renders 800×1200 cathedral-aesthetic cover via Playwright |
| `push_to_github.py` | Pushes files directly to main branch via GitHub API (no cloning) |
| `master.py` | Orchestrates BOOKS array updates and coordinates multi-file pushes |

## JSON Config Format

Each book needs a config JSON with this structure:

```json
{
  "slug": "book-slug-here",
  "title": "Book Title",
  "title_html": "Book <em>Title</em>",
  "subtitle": "One-line description.",
  "category": "Category Name",
  "scripture": { "text": "...", "ref": "Book Ch : V · KJV" },
  "dedication": "...",
  "acknowledgment": "...",
  "introduction": ["Paragraph 1...", "Paragraph 2..."],
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "subsections": [
        { "heading": null, "paragraphs": ["..."] },
        { "heading": "Subsection Title", "paragraphs": ["..."] }
      ]
    }
  ],
  "prayers": [
    { "group_title": "Prayer Points", "start_num": 1, "items": ["..."] }
  ],
  "footer": { "date": "Month Year", "isbn": "...", "copyright": "..." },
  "cover": {
    "title_line1": "BOOK TITLE",
    "title_line2": "Emphasis Word",
    "category": "Category",
    "scripture_short": "Short quote...",
    "scripture_ref": "Book Ch · V"
  }
}
```

## Dependencies

```bash
pip install python-docx PyPDF2 pytesseract pillow playwright --break-system-packages
python3 -m playwright install chromium
# Tesseract OCR must be installed: sudo apt-get install tesseract-ocr
```

## OCR Handling

- **DOCX files**: Direct text extraction, minor artifacts cleaned by Claude
- **Scanned PDFs**: Tesseract OCR extracts raw text, Claude cleans contextual errors
- Common OCR fixes: split words ("disappoint-ment"), dropped letters ("Grtns" → "Greatness"), garbled characters
