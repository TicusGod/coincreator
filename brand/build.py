"""Brand kit from the reference rocket (brand/rocket.svg, rendered to brand/rocket.png by headless Chrome).
   python3 brand/build.py → icon.png (apple/app icon), og.png (link preview). The favicon is rocket.svg itself."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
BG, GREEN, WHITE, MUTED = (17, 17, 19), (134, 239, 172), (250, 250, 250), (105, 110, 119)


def rocket(size: int) -> Image.Image:
    r = Image.open(HERE / "rocket.png").convert("RGBA")
    r = r.crop(r.getbbox())
    r.thumbnail((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(r, ((size - r.width) // 2, (size - r.height) // 2))
    return out


def icon(size=512) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=255)
    bg = Image.new("RGBA", (size, size), BG + (255,))
    bg.alpha_composite(rocket(int(size * 0.74)), (int(size * 0.13), int(size * 0.13)))
    img.paste(bg, (0, 0), mask)
    return img


def og(w=1200, h=630) -> Image.Image:
    img = Image.new("RGBA", (w, h), BG + (255,))
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((350, -150, 850, 250), fill=GREEN + (40,))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(110)))
    img.alpha_composite(rocket(330), (110, (h - 330) // 2))
    bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 84)
    reg = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 34)
    t = ImageDraw.Draw(img)
    x, y = 500, 230
    for part, col in (("coin", WHITE), ("creator", GREEN), (".fun", WHITE)):
        t.text((x, y), part, font=bold, fill=col)
        x += t.textlength(part, font=bold)
    t.text((504, 340), "Launch your own Solana coin in seconds", font=reg, fill=MUTED)
    return img.convert("RGB")


if __name__ == "__main__":
    icon().save(HERE / "icon.png")
    og().save(HERE / "og.png", quality=92)
    print("icon.png og.png written")
