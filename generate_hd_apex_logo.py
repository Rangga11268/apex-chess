import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def draw_apex_symbol(dim):
    """
    Renders pure geometric vector-style Apex Chess symbol at resolution dim x dim.
    Theme: Modern Tactical Knight + Crown in Cobalt Electric & Cyber Cyan on deep dark canvas.
    """
    img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Base Squircle
    radius = int(dim * 0.22)
    draw.rounded_rectangle([(0, 0), (dim - 1, dim - 1)], radius=radius, fill=(11, 14, 20, 255))

    # Clean crisp 1px stroke (no sloppy blurry glow)
    border_width = max(1, int(dim * 0.02))
    draw.rounded_rectangle(
        [(border_width // 2, border_width // 2), (dim - 1 - border_width // 2, dim - 1 - border_width // 2)],
        radius=radius,
        outline=(30, 41, 59, 255),
        width=border_width
    )

    # Precision Geometric Knight Geometry
    # 15 sharp coordinate anchors
    pts = [
        (0.28, 0.80),  # base left
        (0.72, 0.80),  # base right
        (0.70, 0.72),  # base taper
        (0.60, 0.65),  # neck back lower
        (0.63, 0.50),  # mane crest peak 1
        (0.65, 0.35),  # neck back upper
        (0.57, 0.18),  # crown apex rear peak
        (0.49, 0.23),  # crown notch
        (0.43, 0.16),  # crown center peak
        (0.34, 0.27),  # brow facet
        (0.20, 0.39),  # snout tip
        (0.24, 0.46),  # lower jaw
        (0.35, 0.45),  # throat notch
        (0.38, 0.56),  # chest curve
        (0.32, 0.72),  # chest to base
    ]
    coords = [(int(x * dim), int(y * dim)) for x, y in pts]

    # Create solid mask
    mask = Image.new("L", (dim, dim), 0)
    ImageDraw.Draw(mask).polygon(coords, fill=255)

    # High-Definition Linear Gradient: Electric Cyan (#00E5FF) to Deep Royal Cobalt (#2563EB)
    grad = Image.new("RGBA", (dim, dim))
    for y in range(dim):
        t = y / max(1, dim)
        r_c = int(0 * (1 - t) + 37 * t)
        g_c = int(229 * (1 - t) + 99 * t)
        b_c = int(255 * (1 - t) + 235 * t)
        for x in range(dim):
            grad.putpixel((x, y), (r_c, g_c, b_c, 255))

    knight_layer = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    knight_layer.paste(grad, (0, 0), mask)

    # Sharp visor aperture / tactical eye slit
    eye_draw = ImageDraw.Draw(knight_layer)
    eye_x = int(0.35 * dim)
    eye_y = int(0.33 * dim)
    eye_r = max(2, int(dim * 0.028))
    eye_draw.ellipse([eye_x - eye_r, eye_y - eye_r, eye_x + eye_r, eye_y + eye_r], fill=(255, 255, 255, 255))

    # Tactical negative space accent (faceted neck separator)
    slash_start = (int(0.44 * dim), int(0.51 * dim))
    slash_end = (int(0.57 * dim), int(0.44 * dim))
    eye_draw.line([slash_start, slash_end], fill=(11, 14, 20, 255), width=max(2, int(dim * 0.02)))

    img = Image.alpha_composite(img, knight_layer)
    return img

def create_hd_icon(target_size):
    # Render at 4x then downscale with Lanczos for ultra sharp edges
    scale = 4
    high_res_dim = target_size * scale
    high_res_img = draw_apex_symbol(high_res_dim)
    return high_res_img.resize((target_size, target_size), Image.Resampling.LANCZOS)

def create_hd_banner():
    # 1200 x 300 Master Banner
    w, h = 1200, 300
    banner = Image.new("RGBA", (w, h), (11, 14, 20, 255))
    
    # Left Symbol (240 x 240)
    symbol = create_hd_icon(240)
    banner.paste(symbol, (40, 30), symbol)

    # Text Typography
    draw = ImageDraw.Draw(banner)
    font_bold = None
    font_light = None
    font_sub = None

    for fn in ["segoeuib.ttf", "arialbd.ttf", "Helvetica-Bold.ttf"]:
        try:
            font_bold = ImageFont.truetype(fn, 106)
            font_light = ImageFont.truetype("segoeui.ttf" if fn == "segoeuib.ttf" else "arial.ttf", 106)
            font_sub = ImageFont.truetype(fn, 30)
            break
        except Exception:
            pass

    if font_bold and font_sub:
        # Wordmark: APEX (Electric Cyan) + CHESS (Crisp White)
        draw.text((320, 52), "APEX", fill=(0, 229, 255, 255), font=font_bold)
        draw.text((615, 52), "CHESS", fill=(241, 245, 249, 255), font=font_bold)
        
        # Subtitle badge / tagline
        draw.text((324, 180), "TACTICAL ENGINE ASSISTANT & REAL-TIME ANALYZER", fill=(148, 163, 184, 255), font=font_sub)

    # Output downscaled clean banner
    return banner

# Generate all deliverables
out_dir = r"D:\Ngoding\ChessMint\dist\img"
root_img_dir = r"D:\Ngoding\ChessMint\img"
os.makedirs(out_dir, exist_ok=True)
os.makedirs(root_img_dir, exist_ok=True)

for size in [16, 48, 128, 256, 512]:
    icon = create_hd_icon(size)
    filename = f"logo-{size}.png" if size not in [256, 512] else ("logo-big.png" if size == 256 else "logo-512.png")
    icon.save(os.path.join(out_dir, filename), "PNG")
    icon.save(os.path.join(root_img_dir, filename), "PNG")
    print("Saved HD Icon:", filename)

# Master Banner
banner_1200 = create_hd_banner()
banner_1200.save(os.path.join(out_dir, "banner-hd.png"), "PNG")
banner_1200.save(os.path.join(root_img_dir, "banner-hd.png"), "PNG")

# Header Logo for Popup (300 x 75)
banner_popup = banner_1200.resize((320, 80), Image.Resampling.LANCZOS)
banner_popup.save(os.path.join(out_dir, "logo-h.png"), "PNG")
banner_popup.save(os.path.join(root_img_dir, "logo-h.png"), "PNG")
print("Saved HD Banner and logo-h.png")
