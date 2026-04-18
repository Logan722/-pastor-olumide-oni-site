#!/usr/bin/env python3
"""
Book Text Extraction Pipeline
Handles: DOCX (direct text), PDF (text-based + OCR for scanned)
Output: Raw text file ready for Claude cleanup
"""
import sys
import os
import json

def extract_docx(filepath):
    """Extract text from DOCX files"""
    from docx import Document
    doc = Document(filepath)
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            # Mark headings
            if para.style.name.startswith('Heading'):
                paragraphs.append(f"\n### {text}\n")
            else:
                paragraphs.append(text)
    return "\n\n".join(paragraphs)

def extract_pdf(filepath):
    """Extract text from PDF - tries text extraction first, falls back to OCR"""
    from PyPDF2 import PdfReader
    
    reader = PdfReader(filepath)
    total_pages = len(reader.pages)
    
    # First pass: try direct text extraction
    all_text = []
    text_pages = 0
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if len(text.strip()) > 50:  # meaningful text
            text_pages += 1
        all_text.append(text)
    
    direct_text = "\n\n--- PAGE BREAK ---\n\n".join(all_text)
    
    # If >60% pages have text, use direct extraction
    if text_pages / total_pages > 0.6:
        print(f"[INFO] Direct text extraction: {text_pages}/{total_pages} pages had text")
        return direct_text
    
    # Otherwise, fall back to OCR
    print(f"[INFO] Scanned PDF detected ({text_pages}/{total_pages} text pages). Running OCR...")
    return ocr_pdf(filepath, total_pages)

def ocr_pdf(filepath, total_pages):
    """OCR a scanned PDF using Tesseract"""
    import subprocess
    import tempfile
    from PIL import Image
    import pytesseract
    
    all_text = []
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Convert PDF pages to images using pdftoppm
        subprocess.run([
            "pdftoppm", "-png", "-r", "300",
            filepath, os.path.join(tmpdir, "page")
        ], check=True, capture_output=True)
        
        # OCR each page image
        page_images = sorted([
            f for f in os.listdir(tmpdir) if f.endswith(".png")
        ])
        
        for i, img_file in enumerate(page_images):
            img_path = os.path.join(tmpdir, img_file)
            text = pytesseract.image_to_string(Image.open(img_path))
            all_text.append(text)
            print(f"  OCR page {i+1}/{len(page_images)}")
    
    return "\n\n--- PAGE BREAK ---\n\n".join(all_text)

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_text.py <filepath> [output_path]")
        sys.exit(1)
    
    filepath = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext == ".docx":
        print(f"[DOCX] Extracting: {filepath}")
        raw_text = extract_docx(filepath)
    elif ext == ".pdf":
        print(f"[PDF] Extracting: {filepath}")
        raw_text = extract_pdf(filepath)
    else:
        print(f"[ERROR] Unsupported format: {ext}")
        sys.exit(1)
    
    if output_path:
        with open(output_path, "w") as f:
            f.write(raw_text)
        print(f"[DONE] Raw text saved to: {output_path}")
        print(f"[INFO] Text length: {len(raw_text)} chars, ~{len(raw_text.split())} words")
    else:
        print(raw_text)

if __name__ == "__main__":
    main()
