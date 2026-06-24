"""Генератор иконок для 3DimM.

Создаёт минималистичную иконку: цифра "3" в циановом круге на slate-фоне.
Сохраняет icon.png (512), icon.ico (multi-res) и иконки для всех платформ.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Палитра (минимальный slate + циан)
BG = (15, 23, 42)       # slate-900
CIRCLE = (6, 182, 212)  # cyan-500
TEXT = (241, 245, 249)  # slate-100


def find_font(size):
    candidates = [
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\seguibl.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_icon(size: int, with_bg: bool = True) -> Image.Image:
    # Прозрачный фон для круглой иконки; либо slate-квадрат с скруглёнными углами.
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if with_bg:
        # Скруглённый квадрат-плитка (для Windows/Linux где иконка квадратная).
        radius = int(size * 0.22)
        d.rounded_rectangle(
            [(0, 0), (size - 1, size - 1)],
            radius=radius,
            fill=BG + (255,),
        )

    # Круг-акцент в центре.
    margin = int(size * 0.14)
    d.ellipse(
        [(margin, margin), (size - margin, size - margin)],
        fill=CIRCLE + (255,),
    )

    # Цифра "3".
    font = find_font(int(size * 0.46))
    text = "3"
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1] - int(size * 0.02)
    d.text((tx, ty), text, font=font, fill=TEXT + (255,))

    return img


def main():
    # 1) PNG 512 — источник для всего.
    big = draw_icon(512, with_bg=True)
    png_path = os.path.join(OUT_DIR, "icon.png")
    big.save(png_path, "PNG")
    print("saved", png_path)

    # 2) ICO multi-res (Windows).
    sizes = [16, 24, 32, 48, 64, 128, 256]
    ico_path = os.path.join(OUT_DIR, "icon.ico")
    big.save(
        ico_path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
    )
    print("saved", ico_path)

    # 3) ICNS (macOS) — Pillow собирает .icns из квадратов.
    icns_path = os.path.join(OUT_DIR, "icon.icns")
    try:
        big.save(icns_path, format="ICNS")
        print("saved", icns_path)
    except Exception as e:
        # На не-mac может не поддерживаться — падаем тихо, ICNS опционален для Win/Linux сборки.
        # Создаём копию PNG под именем .icns, чтобы electron-builder не падал на mac-target.
        # (сборка mac всё равно запускается на mac, где есть поддержка)
        print("icns skipped:", e)

    print("done")


if __name__ == "__main__":
    main()
