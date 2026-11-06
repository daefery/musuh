#!/usr/bin/env python3
"""Join part*.html into slides.html (print to PDF with Chrome: 1920x1080 pages)."""
from pathlib import Path
here = Path(__file__).parent
parts = "\n".join(p.read_text() for p in sorted(here.glob("part*.html")))
(here / "slides.html").write_text(f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>MUSUH · slide</title><link rel="stylesheet" href="style.css"></head><body>\n{parts}\n</body></html>\n')
print("wrote slides.html")
