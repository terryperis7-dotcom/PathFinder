#!/usr/bin/env python3
"""Static checks for every page in the site.

    python3 tools/check_html.py        (or: npm run check)

Verifies that each HTML file:
  * has a doctype, lang, charset, viewport, theme-color, title and description
  * only links local CSS/JS that actually exists
  * only links local pages that actually exist
  * has no duplicate element ids
  * uses only icon ids that are defined in assets/js/icons.js
  * declares a known data-page and the expected script order
  * ships no inline event handlers and no inline <script> blocks
Exits non-zero on the first category of failure.
"""
import pathlib, re, sys, json

ROOT = pathlib.Path(__file__).resolve().parent.parent
ICONS = (ROOT / "assets/js/icons.js").read_text(encoding="utf-8")
SPRITE_IDS = set(re.findall(r'<symbol id=\\?"([^"\\]+)', ICONS)) or set(re.findall(r'id=\\"(i-[a-z0-9-]+)\\"', ICONS))
SHELL = (ROOT / "assets/js/shell.js").read_text(encoding="utf-8")
KNOWN_PAGES = set(re.findall(r'"?([a-z-]+)"?:\s*"[a-z0-9/.\-]+\.html"', SHELL))
CORE_ORDER = ["icons", "supabase-config", "data", "stages", "core", "charts", "notify", "avatar", "supabase", "safety",
              "chat", "cluster", "recommend", "motion", "locked", "shell", "auth"]

pages = sorted(p for p in ROOT.rglob("*.html") if "node_modules" not in p.parts)
problems, checked = [], 0

for page in pages:
    rel = page.relative_to(ROOT).as_posix()
    html = page.read_text(encoding="utf-8")
    checked += 1
    def bad(msg):
        problems.append(f"{rel}: {msg}")

    # --- head basics
    if not html.lstrip().lower().startswith("<!doctype html>"): bad("missing <!DOCTYPE html>")
    if '<html lang="en"' not in html: bad("<html> needs lang")
    # self-closing tags are equally valid, so match the attribute, not the slash
    for frag, label in [(r'<meta charset="UTF-8"\s*/?>', "charset"),
                        ("width=device-width", "viewport"),
                        ('name="theme-color"', "theme-color"),
                        ('name="description"', "meta description")]:
        if not re.search(frag, html): bad(f"missing {label}")
    if "<title>" not in html or "<title></title>" in html: bad("missing title")

    # --- local assets exist
    base = page.parent
    for attr, pattern in [("href", r'<link[^>]+href="([^"]+)"'), ("src", r'<script[^>]+src="([^"]+)"')]:
        for target in re.findall(pattern, html):
            if target.startswith(("http", "data:", "#")): continue
            if not (base / target).exists(): bad(f"{attr} points at a missing file: {target}")

    # --- local page links exist
    for target in re.findall(r'href="([^"#][^"]*\.html)(?:#[^"]*)?"', html):
        if target.startswith(("http", "data:")): continue
        if not (base / target).exists(): bad(f"link to a missing page: {target}")

    # --- unique ids
    ids = re.findall(r'\sid="([^"]+)"', html)
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes: bad(f"duplicate ids: {sorted(dupes)}")

    # --- icons used are defined
    used = set(re.findall(r'<use href="#(i-[a-z0-9-]+)"', html))
    missing = sorted(u for u in used if u not in SPRITE_IDS)
    if missing: bad(f"undefined icons: {missing}")

    # --- data-page + script order
    m = re.search(r'<body[^>]*data-page="([^"]+)"', html)
    if not m: bad("missing data-page on <body>")
    elif m.group(1) not in KNOWN_PAGES: bad(f'data-page "{m.group(1)}" is not in shell.js URLS')
    scripts = re.findall(r'assets/js/(?:pages/)?([a-z\-]+)\.js', html)
    if scripts[:len(CORE_ORDER)] != CORE_ORDER:
        bad(f"shared script order wrong: {scripts[:len(CORE_ORDER)]}")
    if len(scripts) <= len(CORE_ORDER): bad("no page script")

    # --- no inline handlers or inline scripts
    if re.search(r'\son(click|load|error|change|submit|input)=', html): bad("inline event handler")
    if re.search(r'<script(?![^>]*\bsrc=)[^>]*>', html): bad("inline <script> block")

    # --- a11y spot-checks
    if "<html lang=" not in html: bad("missing lang on <html>")
    for img in re.findall(r'<img\b[^>]*>', html):
        if "alt=" not in img: bad("image without alt")

print(f"checked {checked} HTML files")
if problems:
    print("\n".join("  ✗ " + p for p in problems))
    print(f"\n{len(problems)} problem(s) found")
    sys.exit(1)
print("all static checks passed")
