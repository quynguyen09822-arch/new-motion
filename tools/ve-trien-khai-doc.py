#!/usr/bin/env python3
"""Clip dọc 9:16: kéo thả một file HTML vào Vibe Hosting rồi web chạy.

DỰNG THEO ĐÚNG PHONG CÁCH KHỔ DỌC CỦA ĐỘI, đọc từ `out/vh-05-loi-rollback-
1080x1920.mp4` (và các clip cùng bộ). Ba điều học được ở đó, đều ngược với
bản tôi làm trước:

  1. NỀN SÁNG. Clip dọc của đội nền trắng, không phải một khoảng tối trống
     trải. Nền tối chỉ dùng cho dải biểu tượng bên trái.
  2. GIAO DIỆN DỰNG LẠI THEO CHIỀU DỌC, không nhét nguyên bản ngang vào rồi
     thu nhỏ. Thanh bên co còn dải biểu tượng ~112px, nội dung xếp thành
     CHỒNG THẺ DỌC. Nhờ vậy chữ đủ to để đọc trên điện thoại mà không cần
     zoom.
  3. CÂU THUYẾT MINH nằm trong viên thuốc tối ở đáy khung.

Màu và câu chữ lấy từ sản phẩm thật (`public/image/*.png`) và từ bản ghi
thao tác `public/video/trien_khai_web.webm`.

Chạy: python3 tools/ve-trien-khai-doc.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import ve_chung as v                                          # noqa: E402
from ve_chung import chu, dau_tick, khoi, mo_canh, the        # noqa: E402

W, H = 720, 1280
v.dat_khung(W, H)
GOC = pathlib.Path('/home/coder/workspace/projects/clipVibehost/hosting-animatic-production')
OUT = GOC / 'scenes' / 'thu-trien-khai-doc.json'
KIEM = pathlib.Path(__file__).parent / f'kiem-{OUT.stem}.json'

# ══ MÀU ════════════════════════════════════════════════════════════════════
# Nền là ẢNH TĨNH cắt từ `public/video/BG.mp4` (xem tools/chup-bg-tinh.mjs).
# Đặt thẳng vào clip nên nhìn đúng ở cả công cụ sửa lẫn video xuất ra, không
# cần bước ghép nào. Màu dưới đây chỉ là lớp lót phòng khi ảnh chưa tải kịp.
NEN      = '#0a1c12'
BG_ANH   = 'public/image/bg-tinh.png'
GIAY     = '#ffffff'
RAIL     = '#1d2839'      # dải biểu tượng bên trái
RAIL_SANG = '#2b3a50'
CAM      = '#ff671a'      # cam thương hiệu Vibe Host
CAM_MO   = '#fff1e9'
VIEN     = '#e8ecf1'
THE_NEN  = '#f5f7f9'
MUC      = '#0f172a'
MO       = '#64748b'
NHAT     = '#94a3b8'
LUC      = '#22c55e'
LUC_MO   = '#dcfce7'
TOI      = '#101725'      # viên thuốc thuyết minh

# ══ HÌNH HỌC ═══════════════════════════════════════════════════════════════
AX, AY, AW, AH = 12, 136, 696, 884        # thẻ ứng dụng
RW = 112                                   # bề rộng dải biểu tượng
CX = AX + RW                               # mép trái vùng nội dung
LE = 24
NX, NW = CX + LE, AW - RW - LE * 2         # 148, 536

DS_Y, DS_BUOC, DS_H = 280, 92, 80          # chồng thẻ: mốc, bước, chiều cao
NUT_Y = DS_Y + 5 * DS_BUOC - 8             # nút chính dưới danh sách
LUU_Y = NUT_Y + 88
LUU_Y_LOG = DS_Y + 4 * DS_BUOC + 12        # thanh tiến trình của nhật ký
LOI_Y = 1078                               # viên thuốc thuyết minh

NGUON = [
    ('Tải file', 'Kéo-thả hoặc chọn file .zip, .html, .htm'),
    ('Dán HTML', 'Dán trực tiếp mã HTML vào ô soạn thảo'),
    ('GitHub', 'Kết nối GitHub (OAuth), tự deploy khi push'),
    ('Git URL', 'Clone từ URL repo công khai'),
    ('Vercel', 'Import từ Vercel Project URL + Token'),
]
BUOC = [
    ('Tải mã nguồn', 'ttindex.html — 68 KB'),
    ('Cài đặt máy chủ', 'Dựng môi trường chạy web tĩnh'),
    ('Cấp chứng chỉ SSL', "Let's Encrypt — miễn phí"),
    ('Kết nối database', 'airtex_db'),
]
RAIL_IC = 6
RAIL_SANG_I = 1


# ══ KHUNG ỨNG DỤNG ═════════════════════════════════════════════════════════
def khung(dong=False):
    """Thẻ ứng dụng + dải biểu tượng. `dong=True`: đứng sẵn, không diễn lại."""
    d = (lambda x: 0) if dong else (lambda x: x)
    va = (lambda x: 'none') if dong else (lambda x: x)

    khoi('nen', 0, 0, W, H, NEN, r=0, **{'in': {'kind': 'none', 'dur': .001}})
    # Ảnh nền phải khai qua `v.anh`: `.k-image{position:relative}` đè lên
    # `.el{position:absolute}` nên ảnh nằm trong dòng chảy và xếp chồng dồn
    # xuống. Clip này có tới chín ảnh (bảy nền + trang máy tính + trang điện
    # thoại) nên không bù trừ là mọi ảnh từ cái thứ hai đều rơi khỏi khung.
    v.anh('bg', 0, 0, W, H, BG_ANH, radius=0, at=0, vao='none', dai=.001)
    the('app', AX, AY, AW, AH, d(.1), vien='#dfe4ea', r=20, vao=va('pop'), day=1)

    # Dải biểu tượng: khối bo tròn, rồi một miếng vuông ép phẳng mép phải —
    # định dạng bo cả bốn góc, để nguyên thì hai góc phải khoét vào thẻ trắng.
    khoi('rail', AX, AY, RW, AH, RAIL, r=20, at=d(.14), vao=va('fade'), chua='app')
    khoi('rail-phang', AX + 52, AY, RW - 52, AH, RAIL, r=0, at=d(.14),
         vao=va('fade'), chua='app')

    khoi('logo', AX + RW / 2 - 22, AY + 30, 44, 44, CAM, r=13, at=d(.2),
         vao=va('pop'), chua='rail')
    chu('logo-ve', AX + RW / 2 - 22, AY + 43, 'VE', size=18, w=44, align='center',
        at=d(.24), mau='#ffffff', vao=va('fade'), chua='logo')
    chu('logo-ten', AX, AY + 84, 'Vibe Host', size=13, w=RW, align='center',
        at=d(.26), mau=CAM, vao=va('rise'), chua='rail')

    for i in range(RAIL_IC):
        y = AY + 150 + i * 58
        if i == RAIL_SANG_I:
            khoi('rail-sang', AX + RW / 2 - 22, y - 11, 44, 44, RAIL_SANG, r=13,
                 at=d(.3), vao=va('fade'), chua='rail')
        khoi(f'rail-ic{i}', AX + RW / 2 - 11, y, 22, 22,
             CAM if i == RAIL_SANG_I else '#5b6a80', r=6,
             at=d(.3 + i * .035), vao=va('fade'), chua='rail')

    khoi('pro', AX + RW / 2 - 27, AY + AH - 100, 54, 28, 'rgba(255,103,26,.14)',
         r=14, at=d(.52), vao=va('fade'), chua='rail')
    chu('pro-c', AX + RW / 2 - 27, AY + AH - 93, 'Pro', size=13, w=54,
        align='center', at=d(.54), mau=CAM, vao=va('fade'), chua='pro')
    chu('pro-so', AX, AY + AH - 58, '6/10', size=12, w=RW, align='center',
        at=d(.56), mau='#7c8ba1', vao=va('fade'), chua='rail')


def dau_trang(tieu_de, phu, duong, dong=False, t0=.6):
    """Vụn bánh mì + tiêu đề + dòng phụ ở đầu vùng nội dung."""
    d = (lambda x: 0) if dong else (lambda x: t0 + x)
    va = (lambda x: 'none') if dong else (lambda x: x)
    chu('vun', NX, AY + 36, duong, size=12, w=NW, at=d(0), mau=NHAT,
        vao=va('rise'), chua='app')
    chu('dau-td', NX, AY + 62, tieu_de, size=27, w=NW, at=d(.06),
        vao=va('rise'), chua='app')
    chu('dau-phu', NX, AY + 104, phu, size=13, w=NW, at=d(.12), mau=MO,
        vao=va('rise'), chua='app')


def loi_thoai(id, text, at, song=None):
    """Viên thuốc thuyết minh ở đáy khung — đúng kiểu clip dọc của đội."""
    w = min(v.rong_chu(text, 20) + 56, W - 48)
    x = (W - w) / 2
    khoi(f'{id}-n', x, LOI_Y, w, 58, TOI, r=29, at=at, vao='rise', dai=.4, song=song)
    chu(f'{id}-c', x, LOI_Y + 18, text, size=20, w=w, align='center', at=at + .04,
        mau='#ffffff', vao='fade', song=None if song is None else song - .04,
        chua=f'{id}-n')


def hang(id, i, ten, phu, at, *, mau_o=THE_NEN, mau_cham=None, tick=False,
         nhan=None, vien=VIEN, nen=THE_NEN, dong=False, chua='app'):
    """Một thẻ trong chồng dọc: ô tròn trạng thái + tiêu đề + dòng phụ."""
    y = DS_Y + i * DS_BUOC
    v.dong_bang.append((v.canhs[-1]['id'], f'{id} · {ten}', y, y + DS_H))
    vao = 'none' if dong else 'rise'
    the(id, NX, y, NW, DS_H, at, nen=nen, vien=vien, r=14, vao=vao, chua=chua)
    khoi(f'{id}-o', NX + 20, y + 20, 40, 40, mau_o, r=20, at=at + .03,
         vao='none' if dong else 'pop', chua=id)
    if tick:
        dau_tick(f'{id}-k', NX + 40, y + 40, 13, mau_cham or LUC, at + .08,
                 chua=id, day=3.4)
    elif mau_cham:
        khoi(f'{id}-c', NX + 32, y + 32, 16, 16, mau_cham, r=8, at=at + .06,
             vao='none' if dong else 'pop', chua=f'{id}-o')
    chu(f'{id}-t', NX + 76, y + 20, ten, size=17, w=NW - 96, at=at + .04,
        vao=vao, chua=id)
    chu(f'{id}-p', NX + 76, y + 46, phu, size=12, w=NW - 96, at=at + .06,
        mau=MO, vao=vao, chua=id)
    if nhan:
        nw = v.rong_chu(nhan, 11) + 20
        khoi(f'{id}-nh', NX + NW - 20 - nw, y + 28, nw, 24, CAM_MO, r=12,
             at=at + .08, vao='none' if dong else 'pop', chua=id)
        chu(f'{id}-nhc', NX + NW - 20 - nw, y + 34, nhan, size=11, w=nw,
            align='center', at=at + .1, mau=CAM, vao='fade', chua=f'{id}-nh')
    return y


def the_tep(id, x, y, at, *, vao='rise', song=None, chua=None, ra=None):
    """Thẻ tệp `ttindex.html` — thứ được kéo thả."""
    w, h = 268, 72
    them = {'out': ra} if ra else {}
    the(id, x, y, w, h, at, vao=vao, r=14, song=song, chua=chua)
    khoi(f'{id}-o', x + 16, y + 16, 40, 40, CAM_MO, r=11, at=at + .03, vao='fade',
         song=song, chua=id, **them)
    chu(f'{id}-ic', x + 16, y + 27, '< >', size=15, w=40, align='center',
        at=at + .05, mau=CAM, vao='fade', song=song, chua=f'{id}-o', **them)
    chu(f'{id}-t', x + 68, y + 16, 'ttindex.html', size=16, at=at + .05,
        vao='fade', song=song, chua=id, **them)
    chu(f'{id}-p', x + 68, y + 42, 'HTML  ·  68 KB', size=12, w=170, at=at + .07,
        mau=MO, vao='fade', song=song, chua=id, **them)


def danh_sach_nguon(t_chon, *, dong=False, t0=.9):
    """Năm nguồn xếp dọc. `t_chon`: giây thẻ "Tải file" sáng viền cam."""
    d = (lambda x: 0) if dong else (lambda x: t0 + x)
    for i, (ten, phu) in enumerate(NGUON):
        hang(f'ng{i}', i, ten, phu, d(i * .07), mau_o='#eef1f5', dong=dong)
    khoi('nut', NX, NUT_Y, NW, 58, CAM, r=29, at=d(.45),
         vao='none' if dong else 'pop', chua='app')
    chu('nut-c', NX, NUT_Y + 18, 'Tiếp tục  →', size=19, w=NW, align='center',
        at=d(.48), mau='#ffffff', vao='fade', chua='nut')

    LUU = ['Website sẽ được cấp SSL miễn phí.',
           'Thời gian triển khai thường 1–3 phút.',
           'Nâng cấp tài nguyên bất kỳ lúc nào.']
    the('luuy', NX, LUU_Y, NW, 160, d(.55), nen=THE_NEN, vien='#eef1f5', r=14,
        vao='none' if dong else 'rise', chua='app')
    khoi('luuy-ic', NX + 20, LUU_Y + 20, 16, 16, CAM, r=4, at=d(.58), vao='fade', chua='luuy')
    chu('luuy-td', NX + 46, LUU_Y + 17, 'Lưu ý', size=15, at=d(.58),
        vao='none' if dong else 'rise', chua='luuy')
    for i, t in enumerate(LUU):
        ry = LUU_Y + 52 + i * 32
        dau_tick(f'luuy-k{i}', NX + 28, ry + 8, 9, LUC, d(.6 + i * .04), chua='luuy')
        chu(f'luuy-d{i}', NX + 46, ry, t, size=12.5, w=NW - 66, at=d(.6 + i * .04),
            mau=MO, vao='none' if dong else 'rise', chua='luuy')

    if t_chon is None:
        return
    # Tệp rơi vào: thẻ "Tải file" sáng viền cam, hiện dấu tích.
    y = DS_Y
    the('ng0x', NX, y, NW, DS_H, t_chon, nen=CAM_MO, vien=CAM, r=14, vao='fade',
        day=2, chua='app')
    khoi('ng0x-o', NX + 20, y + 20, 40, 40, '#fbdcc8', r=20, at=t_chon + .03,
         vao='fade', chua='ng0x')
    chu('ng0x-t', NX + 76, y + 20, 'Tải file', size=17, w=NW - 96, at=t_chon + .04,
        chua='ng0x')
    chu('ng0x-p', NX + 76, y + 46, 'ttindex.html  ·  68 KB', size=12, w=NW - 96,
        at=t_chon + .06, mau=CAM, chua='ng0x')
    khoi('ng0x-d', NX + NW - 48, y + 20, 28, 28, CAM, r=14, at=t_chon + .1,
         vao='pop', dai=.35, chua='ng0x')
    dau_tick('ng0x-k', NX + NW - 34, y + 34, 10, '#ffffff', t_chon + .16,
             chua='ng0x', day=3)


def nhat_ky(moc, *, dong=False, chay=None):
    """Chồng thẻ "Nhật ký triển khai". `moc[i]`: None = chưa tới · số = giây xong.
    `chay` là chỉ số bước đang chạy."""
    for i, (ten, phu) in enumerate(BUOC):
        t = moc[i]
        if t is None:
            dang = i == chay
            hang(f'b{i}', i, ten, phu if dang else 'Chưa bắt đầu',
                 0, mau_o=CAM_MO if dang else '#eef1f5',
                 mau_cham=CAM if dang else '#cbd5e1',
                 nhan='Đang chạy' if dang else None, dong=True)
        else:
            hang(f'b{i}', i, ten, phu, t, mau_o=LUC_MO, mau_cham=LUC, tick=True,
                 dong=(t == 0))

    xong = sum(1 for m in moc if m is not None)
    ty = LUU_Y_LOG
    khoi('tt-ray', NX, ty, NW, 8, '#eef1f5', r=4, at=0, vao='none', chua='app')
    khoi('tt-day', NX, ty, NW * xong / len(BUOC), 8, CAM, r=4, at=0, vao='none', chua='app')
    chu('tt-dc', NX, ty + 22, f'Đã chạy: 00:0{xong}', size=12.5, at=0, vao='none',
        mau=MO, chua='app')
    chu('tt-pt', NX + NW - 90, ty + 22, f'{round(xong / len(BUOC) * 100)}%', size=12.5,
        w=90, align='right', at=0, vao='none', mau=MO, chua='app')

    if xong == len(BUOC):
        gy = ty + 58
        the('xong', NX, gy, NW, 108, 0, nen=LUC_MO, vien='#c8f0d8', r=14,
            vao='none', chua='app')
        khoi('xong-o', NX + 20, gy + 20, 40, 40, '#ffffff', r=20, at=0, vao='none', chua='xong')
        dau_tick('xong-k', NX + 40, gy + 40, 13, LUC, 0, chua='xong', day=3.4)
        chu('xong-t', NX + 76, gy + 18, '4/4 bước thành công', size=17, w=NW - 96,
            at=0, vao='none', mau='#15803d', chua='xong')
        chu('xong-p', NX + 76, gy + 46, 'Website đã chạy tại|airtex-trungthu.vibehost.vn',
            size=12.5, w=NW - 96, at=0, vao='none', mau='#3f8b5c', chua='xong')


def the_ssl(cx, cy, rong, at, song):
    k = rong / 420.0
    cao = 292 * k
    x, y = cx - rong / 2, cy - cao / 2
    khoi('ssl-bong', x - 4 * k, y - 4 * k, rong + 8 * k, cao + 8 * k, '#0f172a1c',
         r=26 * k, at=at, vao='pop', dai=.5, song=song)
    khoi('ssl', x, y, rong, cao, GIAY, r=22 * k, at=at, vao='pop', dai=.5, song=song)
    khoi('ssl-vong', cx - 52 * k, y + 38 * k, 104 * k, 104 * k, LUC_MO, r=52 * k,
         at=at + .08, vao='pop', dai=.5, song=song - .08, chua='ssl')
    khoi('ssl-tron', cx - 38 * k, y + 52 * k, 76 * k, 76 * k, LUC, r=38 * k,
         at=at + .14, vao='pop', dai=.45, song=song - .14, chua='ssl')
    dau_tick('ssl-dau', cx, y + 90 * k, 32 * k, '#ffffff', at + .3, chua='ssl',
             day=7 * k, song=song - .3)
    chu('ssl-td', x, y + 164 * k, 'Đã cấp chứng chỉ SSL', size=21 * k, w=rong,
        align='center', at=at + .34, song=song - .34, chua='ssl')
    chu('ssl-phu', x, y + 200 * k, 'Website đã được cấp SSL miễn phí', size=11 * k,
        w=rong, align='center', at=at + .4, mau=MO, song=song - .4, chua='ssl')
    khoi('ssl-nhan', cx - 64 * k, y + 230 * k, 128 * k, 26 * k, LUC_MO, r=13 * k,
         at=at + .46, vao='pop', song=song - .46, chua='ssl')
    chu('ssl-nhan-c', cx - 64 * k, y + 236 * k, 'HTTPS đang bật', size=11 * k,
        w=128 * k, align='center', at=at + .5, mau=LUC, song=song - .5, chua='ssl')


def cua_so_trang(cx, cy, rong, at):
    """Cửa sổ trình duyệt hiện ẢNH CHỤP THẬT của `ttindex.html`."""
    k = rong / 760.0
    cao, thanh = 430 * k, 38 * k
    x, y = cx - rong / 2, cy - cao / 2
    khoi('br-bong', x - 5 * k, y - 5 * k, rong + 10 * k, cao + 10 * k, '#0f172a24',
         r=15 * k, at=at, vao='pop', dai=.55)
    khoi('br', x, y, rong, cao, '#0b0f24', r=10 * k, at=at, vao='pop', dai=.55)
    # Dùng `v.anh` chứ không gọi thẳng `E`: `.k-image{position:relative}` đè lên
    # `.el{position:absolute}` nên ảnh nằm trong DÒNG CHẢY và xếp chồng dồn
    # xuống. Clip này giờ có hai ảnh (trang máy tính + trang điện thoại) nên
    # phải bù trừ, không thì ảnh thứ hai rơi xuống dưới đáy khung.
    v.anh('tr', x, y + thanh, rong, cao - thanh - 1,
          'public/image/ttindex-xem-truoc.png', radius=0, chua='br', at=at + .28)
    khoi('br-thanh', x, y, rong, thanh, '#171c34', r=10 * k, at=at + .04,
         vao='fade', chua='br')
    for i, mau in enumerate(['#ff5f57', '#febc2e', '#28c840']):
        khoi(f'br-cham{i}', x + (18 + i * 18) * k, y + 14 * k, 10 * k, 10 * k, mau,
             r=5 * k, at=at + .08 + i * .03, vao='pop', dai=.3, chua='br-thanh')
    khoi('br-url', x + 84 * k, y + 9 * k, 320 * k, 20 * k, '#242a45', r=10 * k,
         at=at + .14, vao='fade', chua='br-thanh')
    khoi('br-khoa', x + 94 * k, y + 14 * k, 8 * k, 10 * k, LUC, r=2 * k,
         at=at + .17, vao='pop', dai=.3, chua='br-url')
    chu('br-diachi', x + 108 * k, y + 13 * k, 'airtex-trungthu.vibehost.vn',
        size=10 * k, w=286 * k, at=at + .18, mau='#c9d2ea', chua='br-url')


# ══════════════════════════════════════════════════════════════════════════
# SÁU CẢNH, MỖI CẢNH MỘT CÚ MÁY
# ══════════════════════════════════════════════════════════════════════════
T_CHON = 2.05

# ── C1: toàn cảnh — màn chọn nguồn ────────────────────────────────────────
mo_canh('c1-chon-nguon', 2.6)
khung()
dau_trang('Đưa website lên mạng', 'Chọn mã nguồn, còn lại để VAYS lo phần kỹ thuật',
          'Trang chủ  ›  Triển khai website')
danh_sach_nguon(None)
loi_thoai('l1', 'Vibe Host nhận năm kiểu nguồn', .9)

# ── C2: ĐẨY VÀO — kéo thả tệp lên "Tải file" ──────────────────────────────
# Cú máy này cũng bám quá sát: mép trái thẻ nguồn bị cắt, "Tải file" và
# "Dán HTML" mất đầu dòng. Nới ra 20% và nhích khung ngắm sang trái 15% bề
# ngang khung. Tâm ngắm phải hạ xuống 430 chứ không giữ 400: ở mức ×1,52 thì
# nửa chiều cao khung ngắm là 421px, ngắm ở 400 là mép trên lọt ra ngoài clip.
C2_PHONG = 1.9 * 0.8                  # ×1,52
C2_TRAI = W * 0.15                    # 108px
cam2 = v.cam_ngam(NX + NW / 2 - C2_TRAI, 430, C2_PHONG)
mo_canh('c2-keo-tha', 3.6, camera=cam2, camera_muot=.85)
khung(dong=True)
dau_trang('Đưa website lên mạng', 'Chọn mã nguồn, còn lại để VAYS lo phần kỹ thuật',
          'Trang chủ  ›  Triển khai website', dong=True)
danh_sach_nguon(T_CHON, dong=True)
# Khung ngắm mới hẹp về bên phải, thẻ tệp phải dịch vào cho khỏi lọt ra ngoài.
TEP_X, TEP_Y = NX + 190, 112
the_tep('tep-a', TEP_X, TEP_Y, .3, song=1.35,
        ra={'kind': 'fade', 'dur': .2})
loi_thoai('l2', 'Kéo thẳng file .html vào', .25, song=1.5)
loi_thoai('l2b', 'Xong. Không cấu hình gì.', T_CHON + .3)

tro_a = v.man_hinh(TEP_X + 134, TEP_Y + 36, cam2)
tro_b = v.man_hinh(NX + NW / 2, DS_Y + DS_H / 2, cam2)
v.els.append({
    'id': 'tro', 'kind': 'pointer', 'x': 0, 'y': 0,
    'path': [{'t': .45, 'x': round(tro_a[0] + 240), 'y': round(tro_a[1] - 210)},
             {'t': 1.05, 'x': round(tro_a[0]), 'y': round(tro_a[1])},
             {'t': 1.25, 'x': round(tro_a[0]), 'y': round(tro_a[1])},
             {'t': 2.0, 'x': round(tro_b[0]), 'y': round(tro_b[1])},
             {'t': 3.4, 'x': round(tro_b[0]), 'y': round(tro_b[1])}],
    'clicks': [{'t': 1.12, 'x': round(tro_a[0]), 'y': round(tro_a[1])},
               {'t': 2.08, 'x': round(tro_b[0]), 'y': round(tro_b[1])}],
})

# ── C3: ĐẨY VÀO — nhật ký triển khai ──────────────────────────────────────
mo_canh('c3-nhat-ky', 2.8, camera=v.cam_ngam(NX + NW / 2, 480, 1.5), camera_muot=.8)
khung(dong=True)
dau_trang('Nhật ký triển khai', 'Theo dõi chi tiết quá trình đưa website lên server',
          'Triển khai website  ›  Deployment #1247', dong=True)
nhat_ky([.35, 1.05, 1.85, None], chay=3)
loi_thoai('l3', 'Hệ thống tự làm từng bước', .3, song=2.2)

# ── C4: LÙI RA — thẻ SSL bật ra giữa khung ────────────────────────────────
mo_canh('c4-ssl', 2.2, camera_muot=.7)
khung(dong=True)
dau_trang('Nhật ký triển khai', 'Theo dõi chi tiết quá trình đưa website lên server',
          'Triển khai website  ›  Deployment #1247', dong=True)
nhat_ky([0, 0, 0, None], chay=3)
the_ssl(W / 2, 620, 600, .3, 1.6)
loi_thoai('l4', 'SSL cấp tự động, miễn phí', .5)

# ── C5: ĐẨY VÀO — database bật đèn xanh ───────────────────────────────────
T_DB = .55
# Cú máy này ban đầu bám quá sát (×1,9) nên mép trái thẻ bị cắt — chữ "Tải mã
# nguồn" và "4/4 bước thành công" mất đầu dòng. Nới ra 20% và nhích khung ngắm
# sang trái 10% bề ngang khung hình.
C5_PHONG = 1.9 * 0.8                  # ×1,52
C5_TRAI = W * 0.10                    # 72px
mo_canh('c5-database', 2.0,
        camera=v.cam_ngam(NX + NW / 2 - C5_TRAI, 560, C5_PHONG), camera_muot=.75)
khung(dong=True)
dau_trang('Nhật ký triển khai', 'Theo dõi chi tiết quá trình đưa website lên server',
          'Triển khai website  ›  Deployment #1247', dong=True)
nhat_ky([0, 0, 0, T_DB])
loi_thoai('l5', 'Database nối xong — 4/4 bước', T_DB + .5)

def dien_thoai(cx, cy, rong, at, *, song=None):
    """Khung điện thoại hiện bản DI ĐỘNG THẬT của trang, chụp ở khổ 420×910.

    Vỏ máy vẽ bằng khối; màn hình là ảnh. Tỉ lệ vỏ theo đúng tỉ lệ ảnh chụp nên
    `cover` không cắt mất gì.
    """
    vien = rong * .036                       # bề dày viền máy
    mh_w = rong - vien * 2
    mh_h = mh_w * 910 / 420
    cao = mh_h + vien * 2
    x, y = cx - rong / 2, cy - cao / 2
    khoi(f'dt-bong', x - 6, y - 4, rong + 12, cao + 12, 'rgba(15,23,42,.16)',
         r=rong * .17, at=at, vao='pop', dai=.5, song=song)
    khoi('dt-vo', x, y, rong, cao, '#0f172a', r=rong * .155, at=at, vao='pop',
         dai=.5, song=song)
    v.anh('dt-man', x + vien, y + vien, mh_w, mh_h,
          'public/image/ttindex-dien-thoai.png', radius=rong * .12, chua='dt-vo',
          at=at + .16)
    # tai thỏ
    khoi('dt-tai', cx - rong * .17, y + vien * .9, rong * .34, vien * 2.2,
         '#0f172a', r=vien * 1.1, at=at + .2, vao='fade', chua='dt-vo')


# ── C6: LÙI RA — trang bật ra giữa khung ──────────────────────────────────
mo_canh('c6-bat-ra', 2.8, camera_muot=.8)
khung(dong=True)
dau_trang('Nhật ký triển khai', 'Theo dõi chi tiết quá trình đưa website lên server',
          'Triển khai website  ›  Deployment #1247', dong=True)
nhat_ky([0, 0, 0, 0])
cua_so_trang(W / 2, 620, 660, .35)
loi_thoai('l6', 'airtex-trungthu.vibehost.vn đã chạy', 1.1)

# ── C7: CÙNG MỘT LINK — MỞ TRÊN ĐIỆN THOẠI ────────────────────────────────
# Cảnh trước đóng lại bằng cửa sổ máy tính; cảnh này tắt nó đi và mở khung
# điện thoại — cùng đường link, khổ màn hình khác, trang tự xếp lại một cột.
mo_canh('c7-dien-thoai', 2.4, camera_muot=.7)
khung(dong=True)
dau_trang('Nhật ký triển khai', 'Theo dõi chi tiết quá trình đưa website lên server',
          'Triển khai website  ›  Deployment #1247', dong=True)
nhat_ky([0, 0, 0, 0])
# Chỉ điện thoại. Để cả cửa sổ máy tính chồng lên thì hai khung che nhau, mà
# ý của cảnh này chỉ là: cùng đường link đó, mở trên điện thoại cũng chạy.
dien_thoai(W / 2, 620, 340, .3)
loi_thoai('l7', 'Cùng một link — điện thoại mở cũng chạy', .9)

v.chot(OUT, KIEM, {
    'name': 'Kéo thả HTML → Vibe Hosting (dọc 9:16)',
    'density': 1, 'bg': NEN, 'accent': CAM, 'accent2': '#ffa24d',
    'hot': CAM, 'hot2': '#e3272c', 'ink': MUC,
    'inkSoft': MO, 'inkFaint': NHAT,
}, day_toi_da=AY + AH - 8)
