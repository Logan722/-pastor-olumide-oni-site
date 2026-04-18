#!/usr/bin/env python3
"""
Book Page Generator
Takes a structured JSON config and produces a complete HTML book page
matching the Pastor Olumide Oni site template.

JSON input format:
{
  "slug": "dealing-with-evil-voices",
  "title": "Dealing With Evil Voices",
  "title_html": "Dealing With Evil <em>Voices</em>",
  "subtitle": "When the enemy speaks, God's word silences every voice of destruction.",
  "meta_description": "A book by Pastor Olumide Oni on spiritual warfare against evil voices.",
  "category": "Spiritual Warfare",
  "scripture": {
    "text": "My sheep hear my voice...",
    "ref": "John 10 : 27 · KJV"
  },
  "dedication": "This book is dedicated to...",
  "acknowledgment": "I appreciate...",
  "introduction": ["Paragraph 1...", "Paragraph 2..."],
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title Here",
      "subsections": [
        {
          "heading": null,  // null for opening paragraphs
          "paragraphs": ["Para 1...", "Para 2..."]
        },
        {
          "heading": "Subsection Title",
          "paragraphs": ["Para 1...", "Para 2..."]
        }
      ]
    }
  ],
  "prayers": [
    {
      "group_title": "Prayer Points",
      "start_num": 1,
      "items": ["Prayer 1...", "Prayer 2..."]
    }
  ],
  "footer": {
    "date": "April 2026",
    "isbn": "ISBN 978-978-xx-xxxx-x · Published by Dynamic ERA Global Services (DEGS) Ltd",
    "copyright": "© Olumide Oni 2026"
  }
}
"""

import json
import sys
import os
from html import escape

def dropcap(text):
    """Apply dropcap to first letter of paragraph"""
    if not text:
        return text
    return f'<span class="dropcap">{escape(text[0])}</span>{escape(text[1:])}'

def generate_toc(chapters):
    """Generate table of contents"""
    links = []
    for ch in chapters:
        links.append(
            f'<a href="#chapter-{ch["number"]}">'
            f'<span class="ch-num">Chapter {ch["number"]}</span>'
            f'<span class="ch-title">{escape(ch["title"])}</span></a>'
        )
    return "\n".join(links)

def generate_section(eyebrow, content, section_id=None):
    """Generate a front-matter section (dedication, acknowledgment, etc.)"""
    id_attr = f' id="{section_id}"' if section_id else ""
    if isinstance(content, str):
        paragraphs = [content]
    else:
        paragraphs = content
    
    paras_html = "\n".join(f"        <p>{escape(p)}</p>" for p in paragraphs)
    return f'''
    <section class="section"{id_attr}>
      <div class="section-eyebrow">{escape(eyebrow)}</div>
{paras_html}
    </section>'''

def generate_chapter(ch):
    """Generate a full chapter section"""
    body_parts = []
    for i, sub in enumerate(ch.get("subsections", [])):
        if sub.get("heading"):
            body_parts.append(f'          <h3 class="subsection-heading">{escape(sub["heading"])}</h3>')
        
        for j, para in enumerate(sub.get("paragraphs", [])):
            # Dropcap on first paragraph of the chapter (first subsection, first paragraph)
            if i == 0 and j == 0 and not sub.get("heading"):
                body_parts.append(f'          <p>{dropcap(para)}</p>')
            else:
                body_parts.append(f'          <p>{escape(para)}</p>')
    
    body_html = "\n".join(body_parts)
    
    return f'''
      <section class="chapter" id="chapter-{ch["number"]}">
        <div class="chapter-header">
          <div class="chapter-number">Chapter {ch["number"]}</div>
          <h2 class="chapter-title">{escape(ch["title"])}</h2>
          <div class="chapter-rule"></div>
        </div>
        <div class="chapter-body">
{body_html}
        </div>
      </section>'''

def generate_prayers(prayer_groups):
    """Generate prayer section"""
    groups_html = []
    for group in prayer_groups:
        items = "\n".join(
            f'          <li><span class="prayer-num">{group["start_num"] + i}</span>'
            f'<span class="prayer-text">{escape(item)}</span></li>'
            for i, item in enumerate(group["items"])
        )
        groups_html.append(f'''
        <div class="prayer-group">
          <h3 class="prayer-group-title">{escape(group["group_title"])}</h3>
          <ol class="prayer-list" start="{group["start_num"]}">
{items}
          </ol>
        </div>''')
    
    return f'''
    <section class="prayer-section">
      <div class="section-eyebrow">Prayers &amp; Declarations</div>
{"".join(groups_html)}
    </section>'''

def generate_book_page(config):
    """Generate the complete book HTML page"""
    
    # Table of contents
    toc_html = generate_toc(config["chapters"])
    
    # Front matter sections
    front_matter = []
    if config.get("dedication"):
        front_matter.append(generate_section("Dedication", config["dedication"], "dedication"))
    if config.get("acknowledgment"):
        front_matter.append(generate_section("Acknowledgment", config["acknowledgment"], "acknowledgment"))
    if config.get("introduction"):
        intro_paras = config["introduction"]
        # Apply dropcap to first intro paragraph
        intro_html_parts = []
        for i, p in enumerate(intro_paras):
            if i == 0:
                intro_html_parts.append(f'        <p>{dropcap(p)}</p>')
            else:
                intro_html_parts.append(f'        <p>{escape(p)}</p>')
        intro_content = "\n".join(intro_html_parts)
        front_matter.append(f'''
    <section class="section" id="introduction">
      <div class="section-eyebrow">Introduction</div>
{intro_content}
    </section>''')
    
    # Chapters
    chapters_html = "\n".join(generate_chapter(ch) for ch in config["chapters"])
    
    # Prayers
    prayers_html = ""
    if config.get("prayers"):
        prayers_html = generate_prayers(config["prayers"])
    
    # Footer
    footer = config.get("footer", {})
    
    # Read the base template CSS (from the existing book page)
    # We embed the full CSS inline to keep each book page self-contained
    
    title = config["title"]
    title_html = config.get("title_html", escape(title))
    subtitle = config.get("subtitle", "")
    meta_desc = config.get("meta_description", f"A book by Pastor Olumide Oni.")
    scripture = config.get("scripture", {})
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{escape(title)} — Pastor Olumide Oni</title>
<meta name="description" content="{escape(meta_desc)}">
<meta name="theme-color" content="#0a0907">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTAiIGZpbGw9IiMwYTA5MDciLz4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIyNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDRhODUzIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNTUiLz4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIyMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDRhODUzIiBzdHJva2Utd2lkdGg9IjAuNiIgb3BhY2l0eT0iMC4zNSIvPgogIDx0ZXh0IHg9IjMyIiB5PSI0NCIgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgICAgICBmb250LWZhbWlseT0iR2VvcmdpYSwgc2VyaWYiIGZvbnQtc3R5bGU9Iml0YWxpYyIgZm9udC13ZWlnaHQ9IjQwMCIKICAgICAgICBmb250LXNpemU9IjM2IiBmaWxsPSIjZDRhODUzIiBsZXR0ZXItc3BhY2luZz0iLTEiPk88L3RleHQ+Cjwvc3ZnPg==">
<style>
  :root {{
    --bg: #0a0907;
    --bg-soft: #14110c;
    --bg-card: #1a1612;
    --gold: #d4a853;
    --gold-dim: #9a7a3c;
    --cream: #f2e8d5;
    --ink: #e8dfc9;
    --muted: #8a8070;
    --rule: rgba(212, 168, 83, 0.18);
    --rule-strong: rgba(212, 168, 83, 0.4);
    --display: 'Fraunces', 'Times New Roman', serif;
    --body: 'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html {{ scroll-behavior: smooth; }}
  body {{
    background: var(--bg);
    color: var(--ink);
    font-family: var(--body);
    font-size: 17px;
    line-height: 1.75;
    font-weight: 300;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }}
  body::before {{
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212, 168, 83, 0.05), transparent 70%),
      radial-gradient(ellipse 60% 40% at 50% 100%, rgba(212, 168, 83, 0.03), transparent 60%);
    pointer-events: none;
    z-index: 0;
    animation: breathe 8s ease-in-out infinite;
  }}
  @keyframes breathe {{
    0%, 100% {{ opacity: 1; }}
    50% {{ opacity: 0.6; }}
  }}
  body::after {{
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.83 0 0 0 0 0.66 0 0 0 0 0.32 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
    pointer-events: none;
    opacity: 0.04;
    z-index: 1;
    mix-blend-mode: overlay;
  }}
  .site-header {{
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(10, 9, 7, 0.85);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid var(--rule);
    padding: 18px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .brand {{
    font-family: var(--display);
    font-size: 17px;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--cream);
    text-decoration: none;
  }}
  .brand em {{ color: var(--gold); font-style: italic; font-weight: 400; }}
  .nav {{ display: flex; gap: 36px; align-items: center; }}
  .nav a {{
    color: var(--ink);
    text-decoration: none;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.7;
    transition: opacity 0.3s;
  }}
  .nav a:hover, .nav a.active {{ opacity: 1; color: var(--gold); }}
  .nav-toggle {{
    display: none;
    background: none; border: none; color: var(--cream); cursor: pointer;
    width: 28px; height: 28px;
  }}
  @media (max-width: 768px) {{
    .nav {{ display: none; }}
    .nav-toggle {{ display: block; }}
    .site-header {{ padding: 14px 20px; }}
  }}
  .mobile-nav {{
    position: fixed; top: 0; right: -280px; width: 280px; height: 100vh;
    background: var(--bg-soft); z-index: 100; transition: right 0.35s;
    display: flex; flex-direction: column; padding: 80px 30px 30px;
    border-left: 1px solid var(--rule);
  }}
  .mobile-nav.open {{ right: 0; }}
  .mobile-nav a {{
    color: var(--cream); text-decoration: none; padding: 14px 0;
    font-size: 15px; border-bottom: 1px solid var(--rule); letter-spacing: 0.06em;
  }}
  .mobile-nav a.active {{ color: var(--gold); }}
  .mobile-nav-close {{
    position: absolute; top: 20px; right: 20px; background: none;
    border: none; color: var(--cream); cursor: pointer; width: 28px; height: 28px;
  }}
  .backdrop {{
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 90; opacity: 0; pointer-events: none; transition: opacity 0.35s;
  }}
  .backdrop.show {{ opacity: 1; pointer-events: auto; }}

  /* Hero */
  .hero {{
    text-align: center;
    padding: 100px 40px 80px;
    position: relative; z-index: 2;
  }}
  .hero-eyebrow {{
    font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--gold-dim); margin-bottom: 28px;
  }}
  .hero-title {{
    font-family: var(--display); font-size: clamp(36px, 6vw, 56px);
    font-weight: 700; color: var(--cream); line-height: 1.15; margin-bottom: 16px;
  }}
  .hero-title em {{ color: var(--gold); font-style: italic; font-weight: 400; }}
  .hero-subtitle {{
    font-family: var(--display); font-size: 18px; font-weight: 400;
    font-style: italic; color: var(--muted); margin-bottom: 32px;
  }}
  .hero-rule {{
    width: 48px; height: 1px; background: var(--gold-dim);
    margin: 0 auto 40px; opacity: 0.5;
  }}
  .scripture-anchor {{
    max-width: 560px; margin: 0 auto; padding: 30px 28px;
    border: 1px solid var(--rule); position: relative;
  }}
  .scripture-anchor::before, .scripture-anchor::after {{
    content: '';
    position: absolute; width: 14px; height: 14px;
    border: 1px solid var(--gold-dim);
  }}
  .scripture-anchor::before {{ top: -1px; left: -1px; border-right: none; border-bottom: none; }}
  .scripture-anchor::after {{ bottom: -1px; right: -1px; border-left: none; border-top: none; }}
  .scripture-text {{
    font-family: var(--display); font-size: 16px; font-style: italic;
    color: var(--cream); line-height: 1.7; opacity: 0.85;
  }}
  .scripture-ref {{
    margin-top: 16px; font-size: 11px; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--gold-dim);
  }}

  /* TOC */
  .toc {{
    max-width: 520px; margin: 60px auto 80px;
    border: 1px solid var(--rule); padding: 48px 40px;
  }}
  .toc-heading {{
    font-size: 10px; letter-spacing: 0.35em; text-transform: uppercase;
    color: var(--gold-dim); margin-bottom: 28px;
  }}
  .toc-list {{ display: flex; flex-direction: column; gap: 0; }}
  .toc-list a {{
    display: flex; align-items: baseline; gap: 16px; padding: 11px 0;
    border-bottom: 1px solid var(--rule); text-decoration: none; transition: color 0.2s;
  }}
  .toc-list a:last-child {{ border-bottom: none; }}
  .toc-list a:hover {{ color: var(--gold); }}
  .ch-num {{ font-size: 11px; letter-spacing: 0.2em; color: var(--gold-dim); white-space: nowrap; min-width: 80px; }}
  .ch-title {{ font-family: var(--display); font-size: 16px; color: var(--cream); font-weight: 400; }}
  .toc-list a:hover .ch-title {{ color: var(--gold); }}

  /* Content sections */
  .content {{
    max-width: 680px; margin: 0 auto; padding: 0 40px 80px;
    position: relative; z-index: 2;
  }}
  .section {{
    padding: 48px 0; border-top: 1px solid var(--rule);
  }}
  .section:first-of-type {{ border-top: none; padding-top: 40px; }}
  .section-eyebrow {{
    font-size: 10px; letter-spacing: 0.35em; text-transform: uppercase;
    color: var(--gold-dim); margin-bottom: 24px;
  }}
  .section p {{
    margin-bottom: 18px; color: var(--ink); opacity: 0.88;
  }}
  .dropcap {{
    float: left; font-family: var(--display); font-size: 64px;
    line-height: 0.8; font-weight: 700; color: var(--gold);
    margin: 4px 12px 0 0;
  }}
  .chapter {{
    padding: 64px 0 48px; border-top: 1px solid var(--rule);
  }}
  .section, .prayer-section {{
    padding: 48px 0; border-top: 1px solid var(--rule);
  }}
  .chapter-header {{
    text-align: center; margin-bottom: 48px;
  }}
  .chapter-number {{
    font-size: 10px; letter-spacing: 0.35em; text-transform: uppercase;
    color: var(--gold-dim); margin-bottom: 14px;
  }}
  .chapter-title {{
    font-family: var(--display); font-size: clamp(24px, 4vw, 34px);
    font-weight: 600; color: var(--cream); line-height: 1.25;
  }}
  .chapter-rule {{
    width: 40px; height: 1px; background: var(--gold-dim);
    margin: 20px auto 0; opacity: 0.4;
  }}
  .chapter-body p {{
    margin-bottom: 18px; color: var(--ink); opacity: 0.88;
  }}
  .subsection-heading {{
    font-family: var(--display); font-size: 20px; font-weight: 600;
    color: var(--cream); margin: 40px 0 20px;
    padding-top: 32px; border-top: 1px solid var(--rule);
  }}

  /* Prayer section */
  .prayer-section {{
    margin-top: 40px;
  }}
  .prayer-intro {{
    font-family: var(--display); font-style: italic;
    font-size: 18px; color: var(--cream); opacity: 0.8;
    margin-bottom: 32px; line-height: 1.6;
  }}
  .prayer-group {{
    margin-bottom: 40px;
  }}
  .prayer-group-title {{
    font-family: var(--display); font-size: 18px; font-weight: 600;
    color: var(--gold); margin-bottom: 20px;
    padding-bottom: 12px; border-bottom: 1px solid var(--rule);
  }}
  .prayer-list {{
    list-style: none; padding: 0;
  }}
  .prayer-list li {{
    display: grid; grid-template-columns: 36px 1fr; gap: 16px;
    padding: 14px 0; border-bottom: 1px solid var(--rule);
    align-items: start;
  }}
  .prayer-list li:last-child {{ border-bottom: none; }}
  .prayer-num {{
    font-family: var(--display); font-size: 14px; font-weight: 600;
    color: var(--gold-dim); text-align: right; padding-top: 2px;
  }}
  .prayer-text {{
    color: var(--ink); font-size: 16px; opacity: 0.88; line-height: 1.65;
  }}

  /* Footer */
  .book-footer {{
    text-align: center; padding: 80px 40px 60px;
    border-top: 1px solid var(--rule); margin-top: 40px;
  }}
  .book-footer .meta-line {{
    font-size: 12px; letter-spacing: 0.2em; color: var(--muted);
    text-transform: uppercase; margin-bottom: 12px;
  }}
  .book-footer .isbn {{
    font-size: 11px; color: var(--gold-dim);
    letter-spacing: 0.15em; font-family: var(--body);
  }}
  .return-link {{
    display: inline-block; margin-top: 36px; padding: 14px 32px;
    border: 1px solid var(--rule-strong); color: var(--cream);
    text-decoration: none; font-size: 12px; letter-spacing: 0.24em;
    text-transform: uppercase; font-weight: 500; transition: all 0.3s;
  }}
  .return-link:hover {{
    background: var(--gold); color: var(--bg); border-color: var(--gold);
  }}

  /* Back to top */
  .back-to-top {{
    position: fixed; bottom: 24px; right: 24px; width: 44px; height: 44px;
    background: rgba(26, 22, 18, 0.9); border: 1px solid var(--rule-strong);
    border-radius: 50%; color: var(--gold); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none; transition: opacity 0.3s, transform 0.3s;
    backdrop-filter: blur(10px); z-index: 60;
  }}
  .back-to-top.show {{ opacity: 1; pointer-events: auto; }}
  .back-to-top:hover {{ transform: translateY(-2px); background: var(--gold); color: var(--bg); }}
  .back-to-top svg {{ width: 18px; height: 18px; }}

  @media (max-width: 620px) {{
    body {{ font-size: 16px; }}
    .hero {{ padding: 60px 20px 70px; }}
    .content, .book-footer {{ padding-left: 20px; padding-right: 20px; }}
    .scripture-anchor {{ padding: 24px 22px; }}
    .toc {{ padding: 40px 20px; margin: 60px auto; }}
    .dropcap {{ font-size: 56px; }}
    .prayer-list li {{ grid-template-columns: 32px 1fr; gap: 12px; }}
  }}
</style>
</head>
<body>

<header class="site-header">
  <a href="../index.html" class="brand">Pastor Olumide <em>Oni</em></a>
  <nav class="nav">
    <a href="../index.html">Home</a>
    <a href="../about.html">About</a>
    <a href="../sermons.html">Sermons</a>
    <a href="../books.html" class="active">Books</a>
    <a href="../devotionals.html">Devotionals</a>
    <a href="../contact.html">Contact</a>
  </nav>
  <button class="nav-toggle" id="navToggle" aria-label="Open menu">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  </button>
</header>

<div class="backdrop" id="backdrop"></div>
<nav class="mobile-nav" id="mobileNav">
  <button class="mobile-nav-close" id="navClose" aria-label="Close menu">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
  <a href="../index.html">Home</a>
  <a href="../about.html">About</a>
  <a href="../sermons.html">Sermons</a>
  <a href="../books.html" class="active">Books</a>
  <a href="../devotionals.html">Devotionals</a>
  <a href="../contact.html">Contact</a>
</nav>

<main>
  <section class="hero">
    <div class="hero-eyebrow">A Book By Pastor Olumide Oni</div>
    <h1 class="hero-title">{title_html}</h1>
    <div class="hero-subtitle">{escape(subtitle)}</div>
    <div class="hero-rule"></div>
    <div class="scripture-anchor">
      <div class="scripture-text">&ldquo;{escape(scripture.get("text", ""))}&rdquo;</div>
      <div class="scripture-ref">{escape(scripture.get("ref", ""))}</div>
    </div>
  </section>

  <nav class="toc">
    <div class="toc-heading">Table of Contents</div>
    <div class="toc-list">
{toc_html}
    </div>
  </nav>

  <div class="content">
{"".join(front_matter)}

{chapters_html}

{prayers_html}
  </div>

  <footer class="book-footer">
    <div class="meta-line">{escape(title)} &middot; {escape(footer.get("date", ""))}</div>
    <div class="isbn">{escape(footer.get("isbn", ""))}</div>
    <div class="meta-line" style="margin-top:20px;">{escape(footer.get("copyright", ""))}</div>
    <a href="../books.html" class="return-link">Return to Library</a>
  </footer>
</main>

<button class="back-to-top" id="backToTop" aria-label="Back to top">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="6 15 12 9 18 15"/></svg>
</button>

<script>
  // Mobile nav
  const toggle = document.getElementById('navToggle');
  const closeBtn = document.getElementById('navClose');
  const mobileNav = document.getElementById('mobileNav');
  const backdrop = document.getElementById('backdrop');
  function openNav() {{ mobileNav.classList.add('open'); backdrop.classList.add('show'); }}
  function closeNav() {{ mobileNav.classList.remove('open'); backdrop.classList.remove('show'); }}
  toggle?.addEventListener('click', openNav);
  closeBtn?.addEventListener('click', closeNav);
  backdrop?.addEventListener('click', closeNav);
  mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

  // Back to top
  const btt = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {{
    if (window.scrollY > 500) btt.classList.add('show');
    else btt.classList.remove('show');
  }});
  btt.addEventListener('click', () => window.scrollTo({{ top: 0, behavior: 'smooth' }}));
</script>

</body>
</html>'''
    
    return html


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_book_page.py <config.json> [output.html]")
        sys.exit(1)
    
    config_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    with open(config_path) as f:
        config = json.load(f)
    
    html = generate_book_page(config)
    
    if output_path:
        with open(output_path, "w") as f:
            f.write(html)
        print(f"[DONE] Book page saved to: {output_path}")
        print(f"[INFO] {len(config['chapters'])} chapters, {len(html)} chars")
    else:
        print(html)


if __name__ == "__main__":
    main()
