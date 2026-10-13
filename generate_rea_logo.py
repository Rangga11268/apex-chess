import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_rea_logo(size):
    # Render at 4x for super sampling anti-aliasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Dark tech background with rounded squircle
    r = int(canvas_size * 0.22)
    # Squircle background
    draw.rounded_rectangle(
        [(0, 0), (canvas_size - 1, canvas_size - 1)],
        radius=r,
        fill=(11, 15, 25, 255)
    )

    # 2. Subtle outer glowing border
    border_width = max(2, int(canvas_size * 0.025))
    draw.rounded_rectangle(
        [(border_width // 2, border_width // 2),
         (canvas_size - 1 - border_width // 2, canvas_size - 1 - border_width // 2)],
        radius=r,
        outline=(0, 240, 255, 120),
        width=border_width
    )

    # 3. Soft center glow
    glow_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    cx, cy = canvas_size // 2, canvas_size // 2
    glow_rad = int(canvas_size * 0.38)
    glow_draw.ellipse(
        [cx - glow_rad, cy - glow_rad, cx + glow_rad, cy + glow_rad],
        fill=(0, 220, 255, 60)
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(int(canvas_size * 0.12)))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img)

    # 4. Chess Knight / Futuristic "R" Polygon
    # Knight silhouette points normalized (0.0 to 1.0)
    knight_points_norm = [
        (0.34, 0.78),  # base left
        (0.66, 0.78),  # base right
        (0.64, 0.70),  # base taper
        (0.58, 0.65),  # back neck lower
        (0.62, 0.52),  # mane curve
        (0.64, 0.38),  # back neck upper
        (0.56, 0.22),  # crest/ear top
        (0.48, 0.24),  # ear notch
        (0.44, 0.22),  # front ear
        (0.36, 0.30),  # brow
        (0.26, 0.40),  # snout tip
        (0.28, 0.46),  # snout bottom
        (0.38, 0.45),  # chin/jaw
        (0.40, 0.54),  # chest
        (0.36, 0.70),  # chest to base
    ]

    knight_coords = [(int(x * canvas_size), int(y * canvas_size)) for x, y in knight_points_norm]

    # Create gradient mask for the knight
    grad_mask = Image.new("L", (canvas_size, canvas_size), 0)
    ImageDraw.Draw(grad_mask).polygon(knight_coords, fill=255)

    # Gradient texture (Cyan #00F0FF -> Purple #8A2BE2)
    grad_img = Image.new("RGBA", (canvas_size, canvas_size))
    for y in range(canvas_size):
        t = y / max(1, canvas_size)
        # Interpolate between (0, 240, 255) and (138, 43, 226)
        r_c = int(0 * (1 - t) + 138 * t)
        g_c = int(240 * (1 - t) + 43 * t)
        b_c = int(255 * (1 - t) + 226 * t)
        for x in range(canvas_size):
            grad_img.putpixel((x, y), (r_c, g_c, b_c, 255))

    # Composite gradient through knight mask
    knight_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    knight_layer.paste(grad_img, (0, 0), grad_mask)

    # Eye slit for the knight (cybernetic glowing dot/line)
    eye_draw = ImageDraw.Draw(knight_layer)
    eye_x = int(0.38 * canvas_size)
    eye_y = int(0.34 * canvas_size)
    eye_r = max(2, int(canvas_size * 0.025))
    eye_draw.ellipse([eye_x - eye_r, eye_y - eye_r, eye_x + eye_r, eye_y + eye_r], fill=(255, 255, 255, 255))

    img = Image.alpha_composite(img, knight_layer)
    draw = ImageDraw.Draw(img)

    # 5. Text "REA" at the bottom for sizes >= 48
    if size >= 48:
        # Load a default font or draw clean geometric text
        text = "REA"
        # Try finding system font
        font = None
        for font_name in ["segoeuib.ttf", "arialbd.ttf", "Helvetica-Bold.ttf"]:
            try:
                font = ImageFont.truetype(font_name, int(canvas_size * 0.16))
                break
            except Exception:
                continue
        
        if font:
            bbox = draw.textbbox((0, 0), text, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            tx = (canvas_size - tw) // 2
            ty = int(canvas_size * 0.79)
            draw.text((tx, ty), text, fill=(0, 240, 255, 240), font=font)

    # Downscale with high quality Lanczos filter for crisp edge anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# Output directories
out_dir = r"D:\Ngoding\ChessMint\dist\img"
os.makedirs(out_dir, exist_ok=True)

for s in [16, 48, 128, 256]:
    icon = create_rea_logo(s)
    path = os.path.join(out_dir, f"logo-{s}.png" if s != 256 else "logo-big.png")
    icon.save(path, "PNG")
    print(f"Saved: {path}")

# Horizontal banner logo for options header
h_img = Image.new("RGBA", (880, 216), (11, 15, 25, 255))
# Place 180x180 knight icon on left
icon_180 = create_rea_logo(180)
h_img.paste(icon_180, (18, 18), icon_180)

h_draw = ImageDraw.Draw(h_img)
font_rea = None
font_sub = None
for fn in ["segoeuib.ttf", "arialbd.ttf"]:
    try:
        font_rea = ImageFont.truetype(fn, 90)
        font_sub = ImageFont.truetype(fn, 28)
        break
    except Exception:
        pass

if font_rea and font_sub:
    h_draw.text((220, 36), "REA", fill=(0, 240, 255, 255), font=font_rea)
    h_draw.text((430, 36), "CHESS", fill=(255, 255, 255, 240), font=font_rea)
    h_draw.text((225, 138), "REAL-TIME ENGINE ASSISTANT", fill=(120, 140, 180, 220), font=font_sub)

banner_final = h_img.resize((220, 54), Image.Resampling.LANCZOS)
banner_path = os.path.join(out_dir, "logo-h.png")
banner_final.save(banner_path, "PNG")
print(f"Saved: {banner_path}")
