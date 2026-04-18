#!/usr/bin/env python3
"""
GitHub Push Utility
Pushes files directly to the main branch via GitHub API.
No cloning required.
"""

import requests
import base64
import json
import sys
import os

REPO = "Logan722/-pastor-olumide-oni-site"
BRANCH = "main"
PAT = os.environ.get("GH_PAT", "")
API_BASE = f"https://api.github.com/repos/{REPO}"

def headers():
    return {
        "Authorization": f"token {PAT}",
        "Accept": "application/vnd.github.v3+json",
    }

def get_file_sha(path):
    """Get the SHA of an existing file (needed for updates)"""
    r = requests.get(f"{API_BASE}/contents/{path}", headers=headers(), params={"ref": BRANCH})
    if r.status_code == 200:
        return r.json()["sha"]
    return None

def push_file(local_path, repo_path, commit_message):
    """Push a single file to the repo"""
    with open(local_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    
    payload = {
        "message": commit_message,
        "content": content,
        "branch": BRANCH,
    }
    
    # Check if file exists (need SHA for update)
    existing_sha = get_file_sha(repo_path)
    if existing_sha:
        payload["sha"] = existing_sha
        action = "Updated"
    else:
        action = "Created"
    
    r = requests.put(
        f"{API_BASE}/contents/{repo_path}",
        headers=headers(),
        json=payload,
    )
    
    if r.status_code in (200, 201):
        print(f"  ✓ {action}: {repo_path}")
        return True
    else:
        print(f"  ✗ Failed: {repo_path} — {r.status_code}: {r.json().get('message', '')}")
        return False

def push_book(slug, book_html_path, cover_path=None, commit_prefix="Add book"):
    """Push a complete book (HTML page + cover image)"""
    success = True
    
    # Push book HTML
    if os.path.exists(book_html_path):
        ok = push_file(
            book_html_path,
            f"books/{slug}.html",
            f"{commit_prefix}: {slug} — book page"
        )
        success = success and ok
    
    # Push cover image
    if cover_path and os.path.exists(cover_path):
        ext = os.path.splitext(cover_path)[1]
        ok = push_file(
            cover_path,
            f"img/covers/{slug}{ext}",
            f"{commit_prefix}: {slug} — cover image"
        )
        success = success and ok
    
    return success

def push_books_page(books_page_path):
    """Push updated books.html"""
    return push_file(
        books_page_path,
        "books.html",
        "Update books.html — add new book to library"
    )

def fetch_file(repo_path, local_path):
    """Download a file from the repo"""
    r = requests.get(f"{API_BASE}/contents/{repo_path}", headers=headers(), params={"ref": BRANCH})
    if r.status_code == 200:
        content = base64.b64decode(r.json()["content"])
        with open(local_path, "wb") as f:
            f.write(content)
        print(f"  ↓ Downloaded: {repo_path}")
        return True
    else:
        print(f"  ✗ Not found: {repo_path}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python push_to_github.py <local_path> <repo_path> <commit_message>")
        sys.exit(1)
    
    if not PAT:
        print("Error: Set GH_PAT environment variable")
        sys.exit(1)
    
    push_file(sys.argv[1], sys.argv[2], sys.argv[3])
