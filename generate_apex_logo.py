import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_knight_crown_icon(size):
    # Render at 4x for clean supersampling
    scale = 4
    dim = size * scale
    img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background squircle: Deep Onyx / Navy
    r = int(dim * 0.22)
    draw.rounded_rectangle([(0, 0), (dim - 1, dim - 1)], radius=r, fill=(10, 13, 20, 255))

    # 2. Outer cyber glow ring
    border_w = max(2, int(dim * 0.024))
    draw.rounded_rectangle(
        [(border_w // 2, border_w // 2), (dim - 1 - border_w // 2, dim - 1 - border_w // 2)],
        radius=r,
        outline=(0, 240, 255, 110),
        width=border_w
    )

    # 3. Ambient inner radial glow
    glow = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    cx, cy = dim // 2, int(dim * 0.48)
    rad = int(dim * 0.40)
    g_draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(0, 210, 255, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(int(dim * 0.12)))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # 4. Chess Knight + Crown Hybrid Geometry (Apex/Knight)
    # Normalized coordinates
    pts = [
        (0.32, 0.76),  # base left
        (0.68, 0.76),  # base right
        (0.66, 0.68),  # base curve
        (0.58, 0.64),  # lower neck back
        (0.62, 0.50),  # mane crest
        (0.65, 0.36),  # upper neck back
        (0.58, 0.22),  # crown back peak
        (0.50, 0.26),  # crown valley
        (0.44, 0.20),  # crown center peak
        (0.35, 0.29),  # brow
        (0.24, 0.40),  # snout
        (0.27, 0.46),  # jaw lower
        (0.37, 0.45),  # throat
        (0.40, 0.55),  # chest
        (0.35, 0.68),  # chest to base
    ]
    coords = [(int(x * dim), int(y * dim)) for x, y in pts]

    # Create gradient mask
    mask = Image.new("L", (dim, dim), 0)
    ImageDraw.Draw(mask).polygon(coords, fill=255)

    # Smooth Gradient: Electric Cyan (#00F5FF) -> Royal Purple (#7A22FF) -> Deep Violet (#4B00B5)
    grad = Image.new("RGBA", (dim, dim))
    for y in range(dim):
        t = y / max(1, dim)
        r_c = int(0 * (1 - t) + 122 * t)
        g_c = int(245 * (1 - t) + 34 * t)
        b_c = int(255 * (1 - t) + 255 * t)
        for x in range(dim):
            grad.putpixel((x, y), (r_c, g_c, b_c, 255))

    knight_layer = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    knight_layer.paste(grad, (0, 0), mask)

    # Glowing Cybernetic Eye
    e_draw = ImageDraw.Draw(knight_layer)
    ex = int(0.38 * dim)
    ey = int(0.34 * dim)
    er = max(2, int(dim * 0.024))
    e_draw.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(255, 255, 255, 255))

    # Tactical geometric slash across neck (gives it a modern cyber/reverse-engineered motif)
    slash_p1 = (int(0.46 * dim), int(0.50 * dim))
    slash_p2 = (int(0.58 * dim), int(0.43 * dim))
    e_draw.line([slash_p1, slash_p2], fill=(10, 13, 20, 255), width=max(2, int(dim * 0.016)))

    img = Image.alpha_composite(img, knight_layer)
    draw = ImageDraw.Draw(img)

    # 5. Clean Typography for larger icon sizes
    if size >= 48:
        font = None
        for fn in ["segoeuib.ttf", "arialbd.ttf", "Helvetica-Bold.ttf"]:
            try:
                font = ImageFont.truetype(fn, int(dim * 0.15))
                break
            except Exception:
                pass
        if font:
            txt = "APEX" if size >= 128 else "APEX"
            bbox = draw.textbbox((0, 0), txt, font=font)
            tw = bbox[2] - bbox[0]
            tx = (dim - tw) // 2
            ty = int(dim * 0.78)
            draw.text((tx, ty), txt, fill=(0, 245, 255, 240), font=font)

    return img.resize((size, size), Image.Resampling.LANCZOS)

# Create icons
out_dir = r"D:\Ngoding\ChessMint\dist\img"
os.makedirs(out_dir, exist_ok=True)

for s in [16, 48, 128, 256]:
    icon = create_knight_crown_icon(s)
    name = f"logo-{s}.png" if s != 256 else "logo-big.png"
    target = os.path.join(out_dir, name)
    icon.save(target, "PNG")
    print("Generated:", target)

# Generate wide banner header (880x216 -> 240x58)
b_dim_w, b_dim_h = 960, 232
b_img = Image.new("RGBA", (b_dim_w, b_dim_h), (10, 13, 20, 255))
icon_200 = create_knight_crown_icon(190)
b_img.paste(icon_200, (20, 21), icon_200)

b_draw = ImageDraw.Draw(b_img)
font_title = None
font_sub = None
for fn in ["segoeuib.ttf", "arialbd.ttf"]:
    try:
        font_title = ImageFont.truetype(fn, 86)
        font_sub = ImageFont.truetype(fn, 26)
        break
    except Exception:
        pass

if font_title and font_sub:
    # APEX in electric cyan
    b_draw.text((230, 42), "APEX", fill=(0, 245, 255, 255), font=font_title)
    # CHESS in white
    b_draw.text((475, 42), "CHESS", fill=(255, 255, 255, 245), font=font_title)
    # Tagline
    b_draw.text((235, 142), "TACTICAL ENGINE ASSISTANT", fill=(130, 155, 190, 230), font=font_sub)

banner_final = b_img.resize((240, 58), Image.Resampling.LANCZOS)
b_target = os.path.join(out_dir, "logo-h.png")
banner_final.save(b_target, "PNG")
print("Generated banner:", b_target)
