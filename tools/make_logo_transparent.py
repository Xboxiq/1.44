#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""تحويل شعار TSC إلى PNG مفرّغ (شفاف) + JPEG أبيض للقوالب.

- logo.png  → RGBA بخلفية شفافة (إزالة الأبيض والأسود)
- logo.jpeg → خلفية بيضاء مسطّحة لقوالب Word
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG = os.path.join(ROOT, 'assets', 'img', 'logo.png')
JPEG = os.path.join(ROOT, 'assets', 'img', 'logo.jpeg')


def _lum(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_background(r, g, b, a=255):
    if a < 8:
        return True
    lum = _lum(r, g, b)
    chroma = max(r, g, b) - min(r, g, b)
    # أبيض / فضي فاتح (حواف مضادة للتعرّج)
    if lum > 248 or (lum > 228 and chroma < 18):
        return True
    # أسود / رمادي داكن (نسخة الخلفية السوداء)
    if lum < 14 or (lum < 32 and chroma < 12):
        return True
    return False


def to_transparent(src_path):
    im = Image.open(src_path).convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_background(r, g, b, a):
                px[x, y] = (r, g, b, 0)
    # قصّ الهوامش الشفافة
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    # حجم موحّد مع هامش داخلي للطباعة
    side = max(im.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    ox = (side - im.width) // 2
    oy = (side - im.height) // 2
    canvas.paste(im, (ox, oy), im)
    out = canvas.resize((512, 512), Image.Resampling.LANCZOS)
    return out


def to_jpeg_flat(rgba_im, size=400):
    flat = Image.new('RGB', (size, size), (255, 255, 255))
    icon = rgba_im.copy()
    icon.thumbnail((size - 24, size - 24), Image.Resampling.LANCZOS)
    ox = (size - icon.width) // 2
    oy = (size - icon.height) // 2
    flat.paste(icon, (ox, oy), icon)
    return flat


def main():
    if not os.path.exists(PNG):
        raise SystemExit(f'الملف غير موجود: {PNG}')
    rgba = to_transparent(PNG)
    rgba.save(PNG, 'PNG', optimize=True)
    to_jpeg_flat(rgba).save(JPEG, 'JPEG', quality=92, subsampling=0)
    print(f'✓ {PNG} — RGBA شفاف ({rgba.mode})')
    print(f'✓ {JPEG} — JPEG أبيض للقوالب')


if __name__ == '__main__':
    main()
