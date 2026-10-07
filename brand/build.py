"""Brand kit in the reference style (green zap + cyan orbit on graphite). python3 brand/build.py
   → mark.svg (site), icon.png (favicon/app icon), mark.png (transparent, Privy modal), og.png (link preview)."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
BG, CARD, GREEN, CYAN, WHITE, MUTED = (17, 17, 19), (24, 25, 27), (134, 239, 172), (32, 189, 209), (250, 250, 250), (105, 110, 119)
ZAP = [(13, 2), (3, 14), (12, 14), (11, 22), (21, 10), (12, 10)]  # lucide "zap", 24-unit box

SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#111113"/>
<ellipse cx="32" cy="32" rx="15" ry="25" fill="none" stroke="#20bdd1" stroke-width="2" opacity=".85" transform="rotate(35 32 32)"/>
<path d="M33.3 13 18 31.4h13.8L30.3 51l15.3-18.4H31.8z" fill="#86efac"/>
</svg>
"""


def mark(size: int, bg: bool) -> Image.Image:
    s = size * 4  # supersample
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=BG + (255,))
    # orbit: rotated ellipse drawn as a polyline
    cx = cy = s / 2
    rx, ry, a = s * 0.235, s * 0.39, math.radians(35)
    pts = []
    for i in range(361):
        t = math.radians(i)
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)))
    d.line(pts, fill=CYAN + (220,), width=max(2, int(s * 0.03)))
    k, off = s * 0.0255, s * 0.195
    d.polygon([(off + x * k, off + y * k) for x, y in ZAP], fill=GREEN + (255,))
    return img.resize((size, size), Image.LANCZOS)


def og(w=1200, h=630) -> Image.Image:
    img = Image.new("RGBA", (w, h), BG + (255,))
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((520, 120, 1180, 620), fill=GREEN + (36,))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
    img.alpha_composite(mark(260, False), (130, (h - 260) // 2))
    bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 86)
    reg = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 34)
    t = ImageDraw.Draw(img)
    x, y = 430, 230
    for part, col in (("coin", WHITE), ("creator", GREEN), (".fun", WHITE)):
        t.text((x, y), part, font=bold, fill=col)
        x += t.textlength(part, font=bold)
    t.text((434, 345), "Launch your own Solana coin in seconds", font=reg, fill=MUTED)
    return img.convert("RGB")


if __name__ == "__main__":
    (HERE / "mark.svg").write_text(SVG)
    mark(512, True).save(HERE / "icon.png")
    mark(512, False).save(HERE / "mark.png")
    og().save(HERE / "og.png", quality=92)
    print("mark.svg icon.png mark.png og.png written")
