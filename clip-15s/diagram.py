#!/usr/bin/env python3
"""Lớp sơ đồ hub Mắt Bão — vẽ từng khung, nền trong suốt, ghép chồng lên nền Seedance.

Màu lấy trực tiếp từ file logo (.claude/public/image.png) để mọi thứ khớp nhau:
  đỏ #E3272C · cam #ED7225 · nền navy #0A1F3C · đường nối xanh #00A3FF
"""
import os, math, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_SRC = "/home/coder/workspace/.claude/public/image.png"
FONT_B = os.path.join(HERE, "fonts", "BeVietnamPro-Bold.ttf")
FONT_M = os.path.join(HERE, "fonts", "BeVietnamPro-Medium.ttf")

W, H = 1920, 1080
FPS, DUR = 24, 15.0
NFRAMES = int(FPS * DUR)
S = 2                      # vẽ ở 2x rồi thu nhỏ cho mượt viền

RED    = (227, 39, 44)
ORANGE = (237, 114, 37)
BLUE   = (0, 163, 255)
WHITE  = (255, 255, 255)

HUB = (960, 496)
NODES = [
    # (x, y, nhãn chính, nhãn phụ, màu điểm nhấn, icon)
    (392, 288, "Định danh thương hiệu", "Tên miền · SSL",        BLUE,   "shield"),
    (1528, 288, "Hạ tầng lưu trữ",      "Cloud Server · Hosting", BLUE,   "cloud"),
    (392, 728, "Tối ưu vận hành",       "Email · Workspace",      BLUE,   "mail"),
    (1528, 728, "Ứng dụng AI",          "Vibe Hosting · Sale AI", ORANGE, "ai"),
]
SLOGAN = "ĐƠN GIẢN HÓA CÔNG NGHỆ"


# ---------- tiện ích ----------
def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def spring(t):
    """Bật vào có độ nảy nhẹ."""
    if t <= 0:
        return 0.0
    if t >= 1:
        return 1.0
    return 1 - math.exp(-7 * t) * math.cos(9 * t)


def clamp01(x):
    return 0.0 if x < 0 else (1.0 if x > 1 else x)


def seg(t, a, b):
    """Tiến độ 0→1 của đoạn thời gian [a,b]."""
    if b <= a:
        return 1.0
    return clamp01((t - a) / (b - a))


def rgba(c, a):
    return (c[0], c[1], c[2], max(0, min(255, int(a))))


def load_logo():
    """Tách nền trắng khỏi logo, trả PNG nền trong đã cắt sát nội dung."""
    im = Image.open(LOGO_SRC).convert("RGB")
    w, h = im.size
    out = Image.new("RGBA", (w, h))
    src = im.load()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            m = min(r, g, b)
            a = 1.0 - m / 255.0          # alpha từ độ lệch khỏi trắng
            if a <= 0.004:
                dst[x, y] = (0, 0, 0, 0)
                continue
            # gỡ nền trắng khỏi màu (un-premultiply)
            fr = (r - 255 * (1 - a)) / a
            fg = (g - 255 * (1 - a)) / a
            fb = (b - 255 * (1 - a)) / a
            a2 = min(1.0, a / 0.85)      # ép vùng đặc lên alpha đầy
            dst[x, y] = (
                max(0, min(255, int(fr))),
                max(0, min(255, int(fg))),
                max(0, min(255, int(fb))),
                int(a2 * 255),
            )
    return out.crop(out.getbbox())


LOGO = load_logo()


def glow_circle(d, cx, cy, r, color, alpha, layers=7, spread=9):
    """Quầng sáng bằng nhiều vòng chồng nhau (rẻ hơn làm mờ Gauss)."""
    for i in range(layers, 0, -1):
        rr = r + i * spread
        a = alpha * (1 - i / (layers + 1)) ** 2 * 0.55
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=rgba(color, a))


def glow_ring(d, cx, cy, r, color, alpha, layers=8, spread=9):
    """Vòng hào quang RỖNG RUỘT — không phủ sáng vào giữa (chỗ đặt logo)."""
    for i in range(layers, 0, -1):
        rr = r + i * spread
        a = alpha * (1 - i / (layers + 1)) ** 2 * 0.7
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  outline=rgba(color, a), width=int(spread * 1.8))


def glow_line(d, p0, p1, color, alpha, width, layers=5, spread=4):
    for i in range(layers, 0, -1):
        a = alpha * (1 - i / (layers + 1)) ** 2 * 0.5
        d.line([p0, p1], fill=rgba(color, a), width=int(width + i * spread))
    d.line([p0, p1], fill=rgba(color, alpha), width=int(width))


# ---------- icon vẽ tay ----------
def draw_icon(d, kind, cx, cy, size, color, alpha):
    """4 icon hình học đơn giản, nét đồng bộ."""
    c = rgba(color, alpha)
    lw = max(2, int(size * 0.09))
    s = size

    if kind == "shield":                      # khiên + ổ khoá
        top, bot = cy - s * 0.52, cy + s * 0.55
        halfw = s * 0.40
        d.polygon([(cx, top), (cx + halfw, top + s * 0.16),
                   (cx + halfw, cy + s * 0.05), (cx, bot),
                   (cx - halfw, cy + s * 0.05), (cx - halfw, top + s * 0.16)],
                  outline=c, width=lw)
        bw, bh = s * 0.30, s * 0.24
        d.rounded_rectangle([cx - bw / 2, cy - bh * 0.15, cx + bw / 2, cy - bh * 0.15 + bh],
                            radius=int(s * 0.05), outline=c, width=lw)
        d.arc([cx - bw * 0.34, cy - bh * 0.72, cx + bw * 0.34, cy - bh * 0.02],
              start=180, end=360, fill=c, width=lw)

    elif kind == "cloud":                      # đám mây + tầng server
        y = cy - s * 0.18
        d.ellipse([cx - s * 0.44, y - s * 0.16, cx - s * 0.06, y + s * 0.22], outline=c, width=lw)
        d.ellipse([cx - s * 0.20, y - s * 0.34, cx + s * 0.24, y + s * 0.10], outline=c, width=lw)
        d.ellipse([cx + s * 0.04, y - s * 0.14, cx + s * 0.44, y + s * 0.22], outline=c, width=lw)
        d.rectangle([cx - s * 0.40, y + s * 0.10, cx + s * 0.40, y + s * 0.22], fill=(0, 0, 0, 0))
        d.line([(cx - s * 0.40, y + s * 0.20), (cx + s * 0.40, y + s * 0.20)], fill=c, width=lw)
        for i, yy in enumerate((0.34, 0.56)):
            d.rounded_rectangle([cx - s * 0.34, cy + s * yy - s * 0.08,
                                 cx + s * 0.34, cy + s * yy + s * 0.05],
                                radius=int(s * 0.04), outline=c, width=lw)
            d.ellipse([cx + s * 0.20, cy + s * yy - s * 0.035,
                       cx + s * 0.26, cy + s * yy + s * 0.025], fill=c)

    elif kind == "mail":                       # phong bì
        bw, bh = s * 0.82, s * 0.58
        x0, y0 = cx - bw / 2, cy - bh / 2
        d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=int(s * 0.06),
                            outline=c, width=lw)
        d.line([(x0 + lw, y0 + lw * 1.2), (cx, cy + bh * 0.16),
                (x0 + bw - lw, y0 + lw * 1.2)], fill=c, width=lw, joint="curve")

    elif kind == "ai":                         # chip AI + chân tín hiệu
        bw = s * 0.56
        d.rounded_rectangle([cx - bw / 2, cy - bw / 2, cx + bw / 2, cy + bw / 2],
                            radius=int(s * 0.10), outline=c, width=lw)
        inner = s * 0.22
        d.rounded_rectangle([cx - inner, cy - inner, cx + inner, cy + inner],
                            radius=int(s * 0.05), outline=c, width=max(2, lw - 1))
        for i in (-1, 0, 1):
            off = i * s * 0.19
            d.line([(cx + off, cy - bw / 2), (cx + off, cy - bw / 2 - s * 0.16)], fill=c, width=lw)
            d.line([(cx + off, cy + bw / 2), (cx + off, cy + bw / 2 + s * 0.16)], fill=c, width=lw)
            d.line([(cx - bw / 2, cy + off), (cx - bw / 2 - s * 0.16, cy + off)], fill=c, width=lw)
            d.line([(cx + bw / 2, cy + off), (cx + bw / 2 + s * 0.16, cy + off)], fill=c, width=lw)


# ---------- một khung ----------
F_LABEL = ImageFont.truetype(FONT_B, int(30 * S))
F_SUB = ImageFont.truetype(FONT_M, int(21 * S))
F_SLOGAN = ImageFont.truetype(FONT_B, int(50 * S))


def _build_scrims():
    """Lớp làm dịu nền: nền Seedance quá rực ở tâm sẽ nuốt mất logo.

    - toàn khung: phủ navy mỏng để chữ trắng và đường nối nổi lên
    - tâm: đĩa navy đậm loe dần, để logo đỏ đọc rõ trên đó
    """
    glob = Image.new("RGBA", (W, H), (10, 31, 60, 62))

    r_out = 330
    disc = Image.new("RGBA", (r_out * 2, r_out * 2), (0, 0, 0, 0))
    px = disc.load()
    for y in range(r_out * 2):
        dy = y - r_out
        for x in range(r_out * 2):
            dx = x - r_out
            dist = math.hypot(dx, dy) / r_out
            if dist >= 1.0:
                continue
            k = (1.0 - dist) ** 1.9
            px[x, y] = (10, 31, 60, int(224 * k))
    return glob, disc


SCRIM_GLOBAL, SCRIM_DISC = _build_scrims()


def draw_frame(t):
    img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    hx, hy = HUB[0] * S, HUB[1] * S

    # phủ nền dịu + đĩa tối ở tâm (vẽ ở 1x rồi phóng, đỡ tốn thời gian)
    img.alpha_composite(SCRIM_GLOBAL.resize((W * S, H * S), Image.BILINEAR), (0, 0))

    # --- 0–3s: hub hiện + đập sáng ---
    hub_in = ease_out_cubic(seg(t, 0.15, 1.6))
    pulse = 0.5 + 0.5 * math.sin(t * 2.2 * math.pi)
    final_boost = seg(t, 12.0, 13.4)
    hub_a = 255 * hub_in

    # vòng sáng lan ra từ tâm (0–3s)
    for k in range(3):
        rt = seg(t, 0.3 + k * 0.55, 2.6 + k * 0.55)
        if 0 < rt < 1:
            rr = (70 + rt * 300) * S
            d.ellipse([hx - rr, hy - rr, hx + rr, hy + rr],
                      outline=rgba(BLUE, 90 * (1 - rt) * hub_in), width=int(2 * S))

    # vòng hào quang cam quanh hub — rỗng ruột để không rửa trắng logo
    glow_r = (238 + 10 * pulse + 20 * final_boost) * S
    glow_ring(d, hx, hy, glow_r, ORANGE,
              (78 + 30 * pulse + 55 * final_boost) * hub_in, layers=7, spread=int(9 * S))

    # --- 3–8s: nhánh vươn ra + node bật vào ---
    node_state = []
    for i, (nx, ny, lab, sub, acc, icon) in enumerate(NODES):
        a0 = 3.0 + i * 0.55
        grow = ease_out_cubic(seg(t, a0, a0 + 1.15))
        pop = spring(seg(t, a0 + 0.85, a0 + 1.85))
        node_state.append((grow, pop))

    # đường nối hub → node
    for i, (nx, ny, lab, sub, acc, icon) in enumerate(NODES):
        grow, pop = node_state[i]
        if grow <= 0:
            continue
        x1, y1 = nx * S, ny * S
        ex = hx + (x1 - hx) * grow
        ey = hy + (y1 - hy) * grow

        # 8–12s: sáng lần lượt theo chiều kim đồng hồ
        order = [0, 1, 3, 2]                       # trên-trái → trên-phải → dưới-phải → dưới-trái
        k = order.index(i)
        lit = seg(t, 8.0 + k * 0.85, 8.0 + k * 0.85 + 0.7)
        base_a = 150 + 105 * lit + 40 * final_boost
        # nét tối lót dưới để đường nối tách khỏi rừng tia sáng của nền
        d.line([(hx, hy), (ex, ey)], fill=(6, 20, 40, int(150 * grow)), width=int(7.5 * S))
        glow_line(d, (hx, hy), (ex, ey), acc, base_a, 3.0 * S,
                  layers=4, spread=int(3 * S))

        # gói dữ liệu chạy dọc đường nối
        if t >= 8.0 + k * 0.85:
            for m in range(3):
                pt = ((t - (8.0 + k * 0.85)) * 0.62 + m * 0.33) % 1.0
                px, py = hx + (x1 - hx) * pt, hy + (y1 - hy) * pt
                pa = 235 * math.sin(math.pi * pt) * lit
                if pa > 4:
                    glow_circle(d, px, py, 4.0 * S, acc, pa, layers=4, spread=int(2.6 * S))
                    d.ellipse([px - 3.2 * S, py - 3.2 * S, px + 3.2 * S, py + 3.2 * S],
                              fill=rgba(WHITE, pa))

    # node + icon + nhãn
    for i, (nx, ny, lab, sub, acc, icon) in enumerate(NODES):
        grow, pop = node_state[i]
        if pop <= 0.001:
            continue
        x1, y1 = nx * S, ny * S
        r = 60 * S * pop
        na = 255 * min(1.0, pop)

        glow_circle(d, x1, y1, r, acc, 40 * pop + 26 * final_boost, layers=6, spread=int(7 * S))
        d.ellipse([x1 - r, y1 - r, x1 + r, y1 + r], fill=(10, 31, 60, int(216 * pop)))
        d.ellipse([x1 - r, y1 - r, x1 + r, y1 + r],
                  outline=rgba(acc, na), width=int(2.6 * S))
        draw_icon(d, icon, x1, y1, 62 * S * pop, WHITE, na * 0.95)

        # nhãn chữ
        lab_a = 255 * ease_out_cubic(seg(t, 3.0 + i * 0.55 + 1.05, 3.0 + i * 0.55 + 1.75))
        if lab_a > 3:
            ty = y1 + r + 22 * S
            wlab = d.textlength(lab, font=F_LABEL)
            wsub = d.textlength(sub, font=F_SUB)
            # nền mờ sau chữ cho tách khỏi tia sáng
            pw = max(wlab, wsub) / 2 + 20 * S
            d.rounded_rectangle([x1 - pw, ty - 12 * S, x1 + pw, ty + 74 * S],
                                radius=int(12 * S), fill=(8, 26, 50, int(0.62 * lab_a)))
            d.text((x1 - wlab / 2, ty), lab, font=F_LABEL, fill=rgba(WHITE, lab_a))
            d.text((x1 - wsub / 2, ty + 38 * S), sub, font=F_SUB,
                   fill=rgba(acc, lab_a * 0.95))

    # --- đĩa tối ở tâm: dập lõi sáng của nền NGAY TRƯỚC khi đặt logo ---
    if hub_in > 0:
        disc = SCRIM_DISC if hub_in >= 1 else SCRIM_DISC.copy()
        if hub_in < 1:
            disc.putalpha(disc.getchannel("A").point(lambda v: int(v * hub_in)))
        big = disc.resize((SCRIM_DISC.width * S, SCRIM_DISC.height * S), Image.BILINEAR)
        img.alpha_composite(big, (int(hx - big.width / 2), int(hy - big.height / 2)))

    # --- logo ở tâm ---
    if hub_in > 0:
        lw_target = int(430 * S * (0.82 + 0.18 * hub_in))
        lg = LOGO.resize((lw_target, max(1, int(LOGO.height * lw_target / LOGO.width))),
                         Image.LANCZOS)
        la = int(255 * hub_in)
        if la < 255:
            alpha = lg.getchannel("A").point(lambda v: int(v * la / 255))
            lg.putalpha(alpha)
        img.alpha_composite(lg, (int(hx - lg.width / 2), int(hy - lg.height / 2)))

    # --- 12–15s: slogan ---
    sl = ease_out_cubic(seg(t, 12.2, 13.6))
    if sl > 0:
        sa = 255 * sl
        wsl = d.textlength(SLOGAN, font=F_SLOGAN)
        sx, sy = (W * S - wsl) / 2, 902 * S
        for k in range(6, 0, -1):                 # quầng cam sau chữ
            d.text((sx, sy), SLOGAN, font=F_SLOGAN,
                   fill=rgba(ORANGE, sa * 0.06), stroke_width=int(k * 1.6 * S),
                   stroke_fill=rgba(ORANGE, int(sa * 0.05)))
        d.text((sx, sy), SLOGAN, font=F_SLOGAN, fill=rgba(WHITE, sa))
        lnw = wsl * 0.5 * sl
        d.line([(W * S / 2 - lnw, sy - 22 * S), (W * S / 2 + lnw, sy - 22 * S)],
               fill=rgba(ORANGE, sa * 0.75), width=int(2 * S))

    return img.resize((W, H), Image.LANCZOS)


if __name__ == "__main__":
    outdir = os.path.join(HERE, "layer")
    os.makedirs(outdir, exist_ok=True)
    if len(sys.argv) > 1 and sys.argv[1] == "--preview":
        for tt in (float(x) for x in sys.argv[2:] or ["13.0"]):
            draw_frame(tt).save(os.path.join(HERE, f"preview_{tt:.1f}.png"))
            print(f"đã vẽ khung giây {tt:.1f}")
    else:
        for f in range(NFRAMES):
            draw_frame(f / FPS).save(os.path.join(outdir, f"f{f:04d}.png"))
            if f % 60 == 0:
                print(f"  {f}/{NFRAMES}", flush=True)
        print(f"xong {NFRAMES} khung")
