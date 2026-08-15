"""
Featured Listing Open Graph Card Generator
──────────────────────────────────────────
Renders a 1200×630 PNG suitable for social share previews (Facebook, WhatsApp,
iMessage, LinkedIn, X/Twitter, Slack). The card is composited from Pillow to
match the site's luxury aesthetic:

  ┌──────────────────────────────────────────────────────────────┐
  │  [full-bleed front-elevation photo]                          │
  │                                                              │
  │  ······ dark gradient overlay bottom 55% ······              │
  │                                                              │
  │  FEATURED LISTING · JUST LISTED (gold micro-label)           │
  │  3015 141 Street                                             │
  │  ELGIN CHANTRELL · SURREY, BC                                │
  │  Quality, Location, Lasting Value                            │
  │                                                              │
  │  Doug LeMaire, REALTOR®       EZtoFind.ca (gold accent)      │
  └──────────────────────────────────────────────────────────────┘

The generator is deliberately read-only — no MongoDB writes, no cache table.
The rendered PNG is streamed with a 1h Cache-Control header so Facebook's
crawler and Doug's own preview clicks share the same on-the-fly composite.

Text overlays use Liberation Serif (Playfair substitute) + Liberation Sans;
both ship with the base container image so no font install is required.
"""
from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image, ImageDraw, ImageFont

# ── Fraser Property Management logo (bundled with the frontend) ──────────────
# Rendered at the bottom-left of the OG card, below the brokerage line.
_FRASER_LOGO_PATH = Path(
    os.environ.get("FRASER_LOGO_PATH")
    or "/app/frontend/public/brand/fraser-logo.png"
)

# ── Font paths (Liberation ships with the container) ─────────────────────────
FONT_SERIF_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
FONT_SANS_BOLD  = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_SANS       = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

# ── Colours (matches DashboardMockup / brand system) ─────────────────────────
NAVY = (15, 42, 91)
GOLD = (249, 189, 0)
BRAND_BLUE = (10, 61, 153)
BRAND_GREEN = (47, 107, 56)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)


def _load_font(path: str, size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def _text_w(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    """Pillow ≥10 removed textsize; use textbbox instead."""
    l, t, r, b = draw.textbbox((0, 0), text, font=font)
    return r - l


async def _fetch_photo(url: str, timeout: float = 8.0) -> Optional[Image.Image]:
    """Fetch a remote photo and return as an RGB PIL Image. Returns None on failure."""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
            img = Image.open(io.BytesIO(r.content)).convert("RGB")
            return img
    except Exception:
        return None


def _cover_crop(img: Image.Image, w: int, h: int) -> Image.Image:
    """Scale + centre-crop img to exactly w×h (CSS `object-fit: cover`)."""
    src_ratio = img.width / img.height
    dst_ratio = w / h
    if src_ratio > dst_ratio:
        # Source wider — scale by height, crop sides
        new_h = h
        new_w = int(img.width * (new_h / img.height))
    else:
        new_w = w
        new_h = int(img.height * (new_w / img.width))
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    return resized.crop((left, top, left + w, top + h))


def _gradient_overlay(size: tuple, top_alpha: int = 0, bottom_alpha: int = 220) -> Image.Image:
    """Vertical black gradient from transparent (top) → opaque (bottom)."""
    w, h = size
    grad = Image.new("L", (1, h), color=0)
    for y in range(h):
        # ease-in curve — overlay stays subtle for top 45%, ramps hard bottom 55%
        t = y / (h - 1)
        eased = 0 if t < 0.35 else ((t - 0.35) / 0.65) ** 1.4
        grad.putpixel((0, y), int(top_alpha + (bottom_alpha - top_alpha) * eased))
    grad = grad.resize((w, h))
    black = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    black.putalpha(grad)
    return black


async def render_featured_og(
    *,
    photo_url: str,
    address: str,
    city: str,
    province: str,
    neighbourhood: str,
    headline: str,
    status: str = "JUST LISTED",
    price: Optional[int] = None,
    brokerage_line: str = "Doug LeMaire, REALTOR® · EZtoFind.ca",
    is_live: bool = False,
) -> bytes:
    """Compose the 1200×630 OG card and return PNG bytes."""
    W, H = 1200, 630
    canvas = Image.new("RGB", (W, H), NAVY)

    # ── Layer 1 · Background photo (cover-cropped) ───────────────────────────
    photo = await _fetch_photo(photo_url)
    if photo is not None:
        canvas.paste(_cover_crop(photo, W, H), (0, 0))
    else:
        # Fallback: navy gradient background
        for y in range(H):
            r_, g_, b_ = NAVY
            fade = 1 - (y / H) * 0.25
            row = Image.new("RGB", (W, 1), (int(r_ * fade), int(g_ * fade), int(b_ * fade)))
            canvas.paste(row, (0, y))

    # Convert to RGBA for overlay
    canvas = canvas.convert("RGBA")

    # ── Layer 2 · Dark gradient overlay (bottom 55%) ─────────────────────────
    overlay = _gradient_overlay((W, H))
    canvas.alpha_composite(overlay)

    # ── Layer 3 · Text (draw in white with slight shadow for legibility) ─────
    draw = ImageDraw.Draw(canvas)

    # Fonts (sized for 1200×630)
    f_eyebrow  = _load_font(FONT_SANS_BOLD, 22)
    f_title    = _load_font(FONT_SERIF_BOLD, 72)
    f_location = _load_font(FONT_SANS_BOLD, 22)
    f_headline = _load_font(FONT_SANS, 26)
    f_footer   = _load_font(FONT_SANS_BOLD, 20)
    f_brand    = _load_font(FONT_SERIF_BOLD, 30)

    margin = 60
    bottom_pad = 40
    # Reserve vertical space for the brokerage logo which is rendered
    # BELOW the brokerage-line text near the bottom edge.
    fraser_logo_target_h = 56
    logo_gap_above = 12  # space between text row and logo top edge

    # 3a · Gold status pill (top-right corner)
    if status:
        pill_text = status.upper()
        pw = _text_w(draw, pill_text, f_eyebrow) + 32
        ph = 40
        px = W - margin - pw
        py = margin
        draw.rounded_rectangle([px, py, px + pw, py + ph], radius=20, fill=GOLD)
        # Vertically centre using textbbox
        bl, bt, br, bb = draw.textbbox((0, 0), pill_text, font=f_eyebrow)
        text_h = bb - bt
        draw.text((px + 16, py + (ph - text_h) // 2 - bt), pill_text, fill=NAVY, font=f_eyebrow)

    # 3b · Featured Listing eyebrow (bottom-left, above title)
    eyebrow_text = "FEATURED LISTING"
    # Render bottom-up. Start above the Fraser logo strip.
    y_cursor = H - bottom_pad - fraser_logo_target_h - logo_gap_above
    # Order: brokerage line → EZ to Find pill → hairline → headline → location → title → eyebrow

    # Brokerage line at the very bottom
    bl_w = _text_w(draw, brokerage_line, f_footer)
    draw.text((margin, y_cursor - 30), brokerage_line, fill=WHITE, font=f_footer)
    y_cursor -= 30 + 6

    # EZtoFind.ca multi-colour wordmark on the right end of the footer row.
    # Matches the on-site sidebar palette: EZ (green) · to (navy) · Find
    # (blue) · .ca (gold).  Drawn as four consecutive draw calls advancing
    # the x-cursor by each segment's measured width.
    parts = [
        ("EZ ",   BRAND_GREEN),
        ("to ",   NAVY),
        ("Find",  BRAND_BLUE),
        (".ca",   GOLD),
    ]
    ez_total_w = sum(_text_w(draw, s, f_brand) for s, _ in parts)
    # Draw a subtle white pill behind the wordmark so navy text stays legible
    # against the dark gradient overlay.
    pill_pad_x, pill_pad_y = 16, 8
    pill_x0 = W - margin - ez_total_w - pill_pad_x * 2
    pill_y0 = y_cursor + 4 - pill_pad_y
    pill_x1 = W - margin
    _, bt2, _, bb2 = draw.textbbox((0, 0), "EZ", font=f_brand)
    th2 = bb2 - bt2
    pill_y1 = pill_y0 + th2 + pill_pad_y * 2
    draw.rounded_rectangle([pill_x0, pill_y0, pill_x1, pill_y1], radius=8, fill=(255, 255, 255, 240))
    x_cursor = pill_x0 + pill_pad_x
    for s, colour in parts:
        draw.text((x_cursor, y_cursor + 4 - bt2), s, fill=colour, font=f_brand)
        x_cursor += _text_w(draw, s, f_brand)

    y_cursor -= 24  # gap above brokerage line

    # Divider hairline
    draw.line([(margin, y_cursor), (W - margin, y_cursor)], fill=(255, 255, 255, 140), width=1)
    y_cursor -= 24

    # Headline (italic-feel via regular sans)
    if headline:
        draw.text((margin, y_cursor - 30), headline, fill=(255, 255, 255, 235), font=f_headline)
        y_cursor -= 30 + 12

    # Location strip: NEIGHBOURHOOD · CITY, PROVINCE
    loc_parts = [p for p in [neighbourhood, f"{city}, {province}".strip(", ")] if p]
    loc_text = " · ".join(loc_parts).upper()
    draw.text((margin, y_cursor - 26), loc_text, fill=GOLD, font=f_location)
    y_cursor -= 26 + 8

    # Address (Playfair-like serif, big)
    draw.text((margin, y_cursor - 72), address, fill=WHITE, font=f_title)
    y_cursor -= 72 + 10

    # Featured Listing eyebrow
    draw.text((margin, y_cursor - 24), eyebrow_text, fill=GOLD, font=f_eyebrow)

    # 3c · Price band (only if MLS is live)
    if is_live and price:
        price_text = f"${price/1_000_000:.2f}M" if price >= 1_000_000 else f"${price:,}"
        price_text = price_text.replace(".00M", "M").replace(".0M", "M")
        pw = _text_w(draw, price_text, f_title) + 40
        ph = 90
        px = W - margin - pw
        py = margin + 60  # below the status pill
        draw.rounded_rectangle([px, py, px + pw, py + ph], radius=14, fill=(15, 42, 91, 220))
        bl, bt, br, bb = draw.textbbox((0, 0), price_text, font=f_title)
        th = bb - bt
        draw.text((px + 20, py + (ph - th) // 2 - bt), price_text, fill=WHITE, font=f_title)

    # 3d · Fraser Property Management logo (bottom-left, below brokerage line)
    try:
        if _FRASER_LOGO_PATH.exists():
            fraser = Image.open(_FRASER_LOGO_PATH).convert("RGBA")
            # Scale to target height while preserving aspect ratio.
            ratio = fraser_logo_target_h / fraser.height
            fw = int(fraser.width * ratio)
            fh = fraser_logo_target_h
            fraser = fraser.resize((fw, fh), Image.LANCZOS)
            # White rounded rectangle behind the logo so the transparent PNG
            # renders cleanly against the dark gradient overlay (matches the
            # feel of the EZ to Find.ca pill on the right).
            pad_x, pad_y = 10, 6
            bg_x0 = margin - pad_x
            bg_y0 = H - bottom_pad - fh - pad_y
            bg_x1 = margin + fw + pad_x
            bg_y1 = H - bottom_pad + pad_y
            draw.rounded_rectangle([bg_x0, bg_y0, bg_x1, bg_y1], radius=8, fill=(255, 255, 255, 235))
            canvas.paste(fraser, (margin, H - bottom_pad - fh), fraser)
    except Exception:
        pass  # logo missing — silently omit rather than fail the render

    # ── Serialize ────────────────────────────────────────────────────────────
    out = canvas.convert("RGB")
    buf = io.BytesIO()
    out.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf.getvalue()
