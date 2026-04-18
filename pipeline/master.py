#!/usr/bin/env python3
"""
MASTER BOOK PIPELINE
====================
Orchestrates the complete flow:
  1. Download book from Google Drive (handled by Claude in-chat via Drive connector)
  2. Extract raw text from PDF/DOCX
  3. Claude cleans up OCR + structures into JSON (done by Claude in-chat)
  4. Generate HTML book page from JSON
  5. Generate cover image via Playwright
  6. Update books.html BOOKS array
  7. Push everything to GitHub → Netlify auto-deploys

USAGE (in-chat workflow):
  Step 1: Dawn says "new book uploaded"
  Step 2: Claude pulls file from Drive, saves locally
  Step 3: Run extraction:
          python pipeline/extract_text.py <book_file> raw_text.txt
  Step 4: Claude reads raw_text.txt, cleans OCR, creates book_config.json
  Step 5: Generate book page:
          python pipeline/generate_book_page.py book_config.json books/<slug>.html
  Step 6: Generate cover:
          python pipeline/generate_cover.py book_config.json img/covers/<slug>.png
  Step 7: Update books.html BOOKS array (Claude edits inline)
  Step 8: Push to GitHub:
          python pipeline/push_all.py <slug>
"""

import json
import sys
import os
import re

def update_books_array(books_html_path, new_book_entry):
    """
    Insert a new book entry into the BOOKS array in books.html
    
    new_book_entry: dict with keys:
      tone, title, posterTitle, category, description, readUrl, coverImageUrl, driveFileId
    """
    with open(books_html_path, "r") as f:
        content = f.read()
    
    # Find the BOOKS array closing bracket
    # Pattern: find "];" that closes the BOOKS array
    pattern = r'(const BOOKS = \[.*?)(^\s*\];)'
    match = re.search(pattern, content, re.DOTALL | re.MULTILINE)
    
    if not match:
        print("[ERROR] Could not find BOOKS array in books.html")
        return False
    
    # Build the new entry JSON
    entry_json = json.dumps(new_book_entry, indent=4)
    # Indent each line to match the existing format
    indented = "\n".join("  " + line for line in entry_json.split("\n"))
    
    # Insert before the closing "];""
    insert_point = match.start(2)
    new_content = content[:insert_point] + ",\n" + indented + "\n" + content[insert_point:]
    
    with open(books_html_path, "w") as f:
        f.write(new_content)
    
    print(f"[DONE] Added '{new_book_entry['title']}' to BOOKS array")
    return True


def create_book_entry(slug, title, title_html, category, description):
    """Create a new BOOKS array entry"""
    return {
        "tone": 1,  # Will be set based on position
        "title": title,
        "posterTitle": title_html,
        "category": category,
        "description": description,
        "readUrl": f"reader.html?book={slug}",
        "coverImageUrl": f"img/covers/{slug}.png",
        "driveFileId": ""
    }


def push_all(slug, workspace="/home/claude"):
    """Push all files for a new book to GitHub"""
    sys.path.insert(0, os.path.join(workspace, "pipeline"))
    from push_to_github import push_file, push_books_page
    
    book_html = os.path.join(workspace, f"books/{slug}.html")
    cover_png = os.path.join(workspace, f"img/covers/{slug}.png")
    books_page = os.path.join(workspace, "books.html")
    
    print(f"\n=== Pushing '{slug}' to GitHub ===")
    
    results = []
    
    if os.path.exists(book_html):
        results.append(push_file(book_html, f"books/{slug}.html", f"Add book: {slug}"))
    
    if os.path.exists(cover_png):
        results.append(push_file(cover_png, f"img/covers/{slug}.png", f"Add cover: {slug}"))
    
    if os.path.exists(books_page):
        results.append(push_file(books_page, "books.html", f"Update library: add {slug}"))
    
    if all(results):
        print(f"\n✓ All files pushed! Netlify will auto-deploy.")
        print(f"  Book page: /books/{slug}.html")
        print(f"  Cover: /img/covers/{slug}.png")
        print(f"  Library: /books.html updated")
    else:
        print(f"\n✗ Some files failed to push. Check errors above.")
    
    return all(results)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == "update-array":
        # python pipeline/master.py update-array <books.html> <entry.json>
        books_path = sys.argv[2]
        with open(sys.argv[3]) as f:
            entry = json.load(f)
        update_books_array(books_path, entry)
    
    elif cmd == "push":
        # python pipeline/master.py push <slug>
        slug = sys.argv[2]
        push_all(slug)
    
    else:
        print(f"Unknown command: {cmd}")
        print("Commands: update-array, push")
