#!/usr/bin/env python3
"""
Book Cover Generator
Generates 800x1200 cathedral-aesthetic covers via Playwright.

Usage:
  python generate_cover.py <config.json> <output.png>

Config JSON needs: title, title_line1, title_line2, category, scripture_short, scripture_ref
"""

import json
import sys
import os
import asyncio
from html import escape

COVER_HTML_TEMPLATE = '''<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500;1,9..144,700&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: 800px;
    height: 1200px;
    background: #0a0907;
    font-family: 'Inter Tight', sans-serif;
    overflow: hidden;
    position: relative;
  }}

  /* Subtle gold border */
  .border-frame {{
    position: absolute;
    top: 24px; left: 24px; right: 24px; bottom: 24px;
    border: 1px solid rgba(212, 168, 83, 0.15);
  }}

  /* Radial glow behind ornament */
  .glow {{
    position: absolute;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    width: 360px;
    height: 360px;
    background: radial-gradient(circle, rgba(212, 168, 83, 0.12) 0%, rgba(212, 168, 83, 0.03) 40%, transparent 70%);
    border-radius: 50%;
  }}

  /* Ornamental circle */
  .ornament {{
    position: absolute;
    top: 130px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 200px;
  }}
  .ornament svg {{
    width: 100%;
    height: 100%;
  }}

  /* Category */
  .category {{
    position: absolute;
    top: 68px;
    width: 100%;
    text-align: center;
    font-size: 12px;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: rgba(212, 168, 83, 0.7);
  }}
  .category-rule {{
    width: 40px;
    height: 1px;
    background: rgba(212, 168, 83, 0.4);
    margin: 12px auto 0;
  }}

  /* Title block */
  .title-block {{
    position: absolute;
    top: 380px;
    width: 100%;
    text-align: center;
    padding: 0 60px;
  }}
  .title-line1 {{
    font-family: 'Fraunces', serif;
    font-size: {line1_size}px;
    font-weight: 600;
    color: #e8dfc9;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 1.2;
    margin-bottom: 8px;
  }}
  .title-line2 {{
    font-family: 'Fraunces', serif;
    font-size: {line2_size}px;
    font-weight: 400;
    font-style: italic;
    color: #d4a853;
    line-height: 1.15;
  }}

  /* Divider + scripture */
  .divider {{
    position: absolute;
    top: {divider_top}px;
    width: 100%;
    text-align: center;
  }}
  .divider-line {{
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }}
  .divider-line span {{
    width: 30px;
    height: 1px;
    background: rgba(212, 168, 83, 0.4);
  }}
  .divider-diamond {{
    width: 6px;
    height: 6px;
    background: #d4a853;
    transform: rotate(45deg);
  }}
  .scripture {{
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 15px;
    color: rgba(232, 223, 201, 0.6);
    padding: 0 100px;
    line-height: 1.5;
  }}
  .scripture-ref {{
    margin-top: 10px;
    font-family: 'Inter Tight', sans-serif;
    font-size: 11px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(212, 168, 83, 0.5);
  }}

  /* Author */
  .author {{
    position: absolute;
    bottom: 80px;
    width: 100%;
    text-align: center;
  }}
  .author-rule {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }}
  .author-rule span {{
    width: 24px;
    height: 1px;
    background: rgba(212, 168, 83, 0.35);
  }}
  .author-rule .dot {{
    width: 4px;
    height: 4px;
    background: #d4a853;
    border-radius: 50%;
  }}
  .author-name {{
    font-size: 13px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(232, 223, 201, 0.65);
  }}

  /* Noise overlay */
  body::after {{
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.83 0 0 0 0 0.66 0 0 0 0 0.32 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
    pointer-events: none;
    opacity: 0.04;
    mix-blend-mode: overlay;
  }}
</style>
</head>
<body>
  <div class="border-frame"></div>
  <div class="glow"></div>

  <!-- Ornamental motif -->
  <div class="ornament">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer ring -->
      <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(212,168,83,0.15)" stroke-width="0.5"/>
      <!-- Middle ring -->
      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(212,168,83,0.2)" stroke-width="0.5"/>
      <!-- Inner ring with glow -->
      <circle cx="100" cy="100" r="45" fill="none" stroke="rgba(212,168,83,0.25)" stroke-width="0.8"/>
      <!-- Core glow -->
      <circle cx="100" cy="100" r="25" fill="url(#coreGlow)"/>
      <!-- Radial lines -->
      <line x1="100" y1="10" x2="100" y2="30" stroke="rgba(212,168,83,0.15)" stroke-width="0.5"/>
      <line x1="100" y1="170" x2="100" y2="190" stroke="rgba(212,168,83,0.15)" stroke-width="0.5"/>
      <line x1="10" y1="100" x2="30" y2="100" stroke="rgba(212,168,83,0.15)" stroke-width="0.5"/>
      <line x1="170" y1="100" x2="190" y2="100" stroke="rgba(212,168,83,0.15)" stroke-width="0.5"/>
      <!-- Diagonal ticks -->
      <line x1="30" y1="30" x2="42" y2="42" stroke="rgba(212,168,83,0.1)" stroke-width="0.5"/>
      <line x1="170" y1="30" x2="158" y2="42" stroke="rgba(212,168,83,0.1)" stroke-width="0.5"/>
      <line x1="30" y1="170" x2="42" y2="158" stroke="rgba(212,168,83,0.1)" stroke-width="0.5"/>
      <line x1="170" y1="170" x2="158" y2="158" stroke="rgba(212,168,83,0.1)" stroke-width="0.5"/>
      <!-- Arc segments -->
      <path d="M 100 20 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(212,168,83,0.12)" stroke-width="0.5" stroke-dasharray="4 8"/>
      <path d="M 180 100 A 80 80 0 0 1 100 180" fill="none" stroke="rgba(212,168,83,0.12)" stroke-width="0.5" stroke-dasharray="4 8"/>
      <path d="M 100 180 A 80 80 0 0 1 20 100" fill="none" stroke="rgba(212,168,83,0.12)" stroke-width="0.5" stroke-dasharray="4 8"/>
      <path d="M 20 100 A 80 80 0 0 1 100 20" fill="none" stroke="rgba(212,168,83,0.12)" stroke-width="0.5" stroke-dasharray="4 8"/>
      <defs>
        <radialGradient id="coreGlow">
          <stop offset="0%" stop-color="rgba(212,168,83,0.5)"/>
          <stop offset="60%" stop-color="rgba(212,168,83,0.15)"/>
          <stop offset="100%" stop-color="rgba(212,168,83,0.02)"/>
        </radialGradient>
      </defs>
    </svg>
  </div>

  <div class="category">
    {category}
    <div class="category-rule"></div>
  </div>

  <div class="title-block">
    <div class="title-line1">{title_line1}</div>
    <div class="title-line2">{title_line2}</div>
  </div>

  <div class="divider">
    <div class="divider-line">
      <span></span>
      <div class="divider-diamond"></div>
      <span></span>
    </div>
    <div class="scripture">&ldquo;{scripture_short}&rdquo;</div>
    <div class="scripture-ref">{scripture_ref}</div>
  </div>

  <div class="author">
    <div class="author-rule">
      <span></span>
      <div class="dot"></div>
      <span></span>
    </div>
    <div class="author-name">Pastor Olumide Oni</div>
  </div>
</body>
</html>'''


def compute_sizes(line1, line2):
    """Compute font sizes based on text length"""
    l1_len = len(line1)
    l2_len = len(line2)
    
    # Line 1 (uppercase, bold)
    if l1_len <= 12:
        line1_size = 38
    elif l1_len <= 18:
        line1_size = 34
    elif l1_len <= 25:
        line1_size = 30
    else:
        line1_size = 26
    
    # Line 2 (italic, gold)
    if l2_len <= 10:
        line2_size = 58
    elif l2_len <= 16:
        line2_size = 50
    elif l2_len <= 22:
        line2_size = 44
    else:
        line2_size = 38
    
    # Divider position adjusts based on combined title height
    divider_top = 540 + max(0, (l1_len - 15) * 2) + max(0, (l2_len - 12) * 2)
    
    return line1_size, line2_size, min(divider_top, 600)


async def generate_cover(config, output_path):
    from playwright.async_api import async_playwright
    
    line1 = config.get("title_line1", config["title"].upper())
    line2 = config.get("title_line2", "")
    category = config.get("category", "")
    scripture_short = config.get("scripture_short", "")
    scripture_ref = config.get("scripture_ref", "")
    
    line1_size, line2_size, divider_top = compute_sizes(line1, line2)
    
    html = COVER_HTML_TEMPLATE.format(
        category=escape(category),
        title_line1=escape(line1),
        title_line2=escape(line2),
        scripture_short=escape(scripture_short),
        scripture_ref=escape(scripture_ref),
        line1_size=line1_size,
        line2_size=line2_size,
        divider_top=divider_top,
    )
    
    html_path = output_path.replace(".png", ".html")
    with open(html_path, "w") as f:
        f.write(html)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 800, "height": 1200})
        await page.goto(f"file://{os.path.abspath(html_path)}")
        await page.wait_for_timeout(1500)  # Wait for fonts
        await page.screenshot(path=output_path, type="png")
        await browser.close()
    
    os.remove(html_path)
    print(f"[DONE] Cover saved to: {output_path}")


def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_cover.py <config.json> <output.png>")
        sys.exit(1)
    
    with open(sys.argv[1]) as f:
        config = json.load(f)
    
    asyncio.run(generate_cover(config, sys.argv[2]))


if __name__ == "__main__":
    main()
