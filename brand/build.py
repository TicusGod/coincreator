"""Regenerates the brand kit from the chosen Higgsfield render (logo-candidates/v2.png).
   python3 brand/build.py  →  mark.png (transparent), icon.png (app/favicon), og.png (social preview)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
SRC = HERE / "logo-candidates" / "v2.png"
BG = (11, 11, 18)


def key_out(img: Image.Image) -> Image.Image:
    """Navy background → transparent, soft edge from colour distance."""
    img = img.convert("RGBA")
    ref = img.getpixel((4, 4))[:3]
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, _ = px[x, y]
            d = abs(r - ref[0]) + abs(g - ref[1]) + abs(b - ref[2])
            px[x, y] = (r, g, b, 0 if d < 24 else 255 if d > 70 else int((d - 24) / 46 * 255))
    return img.crop(img.getbbox())


def square(mark: Image.Image, size: int, pad: float) -> Image.Image:
    inner = int(size * (1 - 2 * pad))
    m = mark.copy()
    m.thumbnail((inner, inner), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return out


def icon(mark: Image.Image, size=512) -> Image.Image:
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.23), fill=255)
    bg = Image.new("RGBA", (size, size), BG + (255,))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((size * 0.15, size * 0.2, size * 0.85, size * 0.9), fill=(245, 75, 0, 70))
    bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * 0.12)))
    bg.alpha_composite(square(mark, size, 0.17))
    base.paste(bg, (0, 0), mask)
    return base


def og(mark: Image.Image, w=1200, h=630) -> Image.Image:
    img = Image.new("RGBA", (w, h), BG + (255,))
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((-200, -300, 600, 400), fill=(245, 75, 0, 90))
    d.ellipse((700, -200, 1500, 500), fill=(110, 69, 255, 90))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(140)))
    m = square(mark, 300, 0.0)
    img.alpha_composite(m, (150, (h - 300) // 2))
    bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 92)
    reg = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 34)
    t = ImageDraw.Draw(img)
    t.text((510, 225), "CoinCreator", font=bold, fill=(245, 245, 255))
    t.text((514, 400), "coincreator.fun", font=reg, fill=(245, 75, 0))
    t.text((514, 345), "Create & copy Solana coins on Meteora", font=reg, fill=(149, 149, 178))
    return img.convert("RGB")


if __name__ == "__main__":
    mark = key_out(Image.open(SRC))
    square(mark, 512, 0.02).save(HERE / "mark.png")
    icon(mark).save(HERE / "icon.png")
    og(mark).save(HERE / "og.png", quality=92)
    print("mark.png icon.png og.png written")
