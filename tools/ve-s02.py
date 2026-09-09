#!/usr/bin/env python3
"""Vẽ lại màn hình S02 "Một đường link" bằng CODE, từ tấm storyboard.

Vì sao viết bộ sinh chứ không gõ tay JSON: màn này hơn 150 thành phần và toạ độ
suy từ nhau (mỗi tin nhắn cách nhau đúng một bước, hai cửa sổ giống hệt nhau).
Gõ tay thì sửa một con số phải dò lại chục chỗ; ở đây đổi một biến là cả cột
dịch theo.

HỆ TOẠ ĐỘ — đây là chỗ bản trước làm ẩu và bị đè chữ:

  · Không có số rời rạc. Mọi vị trí suy từ mốc có tên ở khối HÌNH HỌC bên dưới.
  · Trục dọc chia thành DẢI không chồng nhau: tiêu đề, nhãn, cửa sổ, câu chốt.
    Hàm `kiem_dai()` bắt lỗi nếu hai dải cấn nhau.
  · Toạ độ bên trong cửa sổ là toạ độ TƯƠNG ĐỐI so với góc trái trên của nó;
    `cua_so()` cộng gốc vào. Nhờ vậy cửa sổ trái và phải dùng chung một bộ số.
  · `kiem_trong()` bắt mọi thành phần thò ra ngoài khung hình hoặc ngoài cửa sổ
    chứa nó — dựng xong là biết ngay, không đợi xem video mới thấy.

Sinh ra `scenes/thu-ve-lai-s02.json` — FILE MỚI, không đụng clip nào của đội.
"""
import json
import pathlib
import sys

W, H = 1280, 720
GOC = pathlib.Path('/home/coder/workspace/projects/clipVibehost/hosting-animatic-production')
OUT = GOC / 'scenes' / 'thu-ve-lai-s02.json'
KIEM = pathlib.Path(__file__).parent / 'kiem-s02.json'

# ══ MÀU — đọc từ chính tấm storyboard ═══════════════════════════════════════
NEN     = '#f3f5f8'
NAV     = '#252b38'    # thanh bên tối
NAV_SANG = '#333c4e'   # mục menu đang chọn
GOI_NEN = '#2f3849'    # thẻ gói dưới chân thanh bên
GIAY    = '#ffffff'
VIEN    = '#e6e9ef'
CAM     = '#ed7225'
CAM_MO  = '#fdece0'
BONG    = '#f5f7fa'    # bong bóng tin nhắn
XAM_NEN = '#eef1f6'
MUC     = '#1e2430'    # chữ tối, mặc định cả clip
MUC_NAV = '#e9ecf3'    # chữ sáng trên thanh bên  ← cần `ink` riêng
MUC_GOI = '#aeb8ca'
LUC     = '#1f8a4c'

# ══ HÌNH HỌC — mọi con số của clip bắt đầu từ đây ═══════════════════════════
LE      = 28                       # lề ngoài
KHE     = 54                       # khe giữa hai cửa sổ, chỗ đặt mũi tên
CW      = (W - 2 * LE - KHE) // 2  # bề rộng một cửa sổ
CH      = 495                      # chiều cao một cửa sổ
CY      = 113                      # mép trên hai cửa sổ
CX      = (LE, LE + CW + KHE)      # mép trái cửa sổ trái / phải

# Bốn dải ngang. Không dải nào được cấn dải khác — `kiem_dai()` canh việc đó.
DAI = {
    'tieu-de':  (24, 62),
    'nhan':     (73, 107),
    'cua-so':   (CY, CY + CH),
    'cau-chot': (646, 700),
}

# ── bên trong một cửa sổ (toạ độ tương đối với góc trái trên của nó) ────────
SW      = 166              # bề rộng thanh bên
CHAT_X  = SW + 18          # mép trái vùng chat
CHAT_R  = CW - 18          # mép phải vùng chat
BONG_X  = CHAT_X + 36      # bong bóng thụt vào sau avatar
BONG_R  = CHAT_R           # bong bóng không được vượt mép này
O_NHAP_Y = CH - 50         # ô "Nhập tin nhắn…"
KHE_TIN  = 9               # khe dọc giữa hai khối tin nhắn
KHE_THE  = 8               # khe dọc quanh một thẻ (file / link / cảm xúc)

NHAN_MENU = ['Trang chủ', 'Triển khai website', 'Triển khai từ mẫu',
             'Tạo database', 'Sao lưu', 'Kết nối AI Agent']
MENU_Y0, MENU_BUOC = 86, 30
GOI_Y, GOI_H = CH - 136, 107
GOI_HANG = [('Dịch vụ', '4/10'), ('CPU', '1.2/4 core'), ('RAM', '0.5/8 GB')]

# ══ ƯỚC BỀ RỘNG CHỮ ════════════════════════════════════════════════════════
# Chỉ để bố cục sơ bộ. Số đo THẬT lấy bằng trình duyệt trong `tools/kiem-s02.mjs`
# — nó mới là thẩm quyền, và nó CHẶN nếu chữ bị bẻ dòng.
#
# Hệ số 0,62 đo ngược từ chính bộ kiểm đó. Hệ số cũ 0,505 là bề rộng trung bình
# của câu tiếng Việt dài; nó hụt với chuỗi NGẮN và chuỗi CHỮ HOA ("Admin" cần
# 0,60 · "KHÔNG GIAN LÀM VIỆC" cần 0,59) — mà ở màn này gần như mọi nhãn đều
# ngắn. Ước hụt thì chữ không tràn ngang, nó lặng lẽ xuống dòng rồi đè thứ bên
# dưới: đúng ba chỗ đã hỏng ở bản trước.
HE_SO_RONG = 0.62
BU_RONG = 6


def rong_chu(s, size):
    return max(len(d) for d in s.split('|')) * size * HE_SO_RONG + BU_RONG


def cao_chu(s, size):
    return len(s.split('|')) * size * 1.12

# ══ DỰNG PHẦN TỬ ═══════════════════════════════════════════════════════════
els = []
hop = {}      # id → (x, y, w, h) để kiểm va chạm
trong_cs = {}  # id → id cửa sổ chứa nó


def E(id, kind, x, y, w, h, *, chua=None, **kw):
    d = {'id': id, 'kind': kind, 'x': round(x), 'y': round(y)}
    if w is not None:
        d['w'] = round(w)
    if h is not None:
        d['h'] = round(h)
    d.update(kw)
    els.append(d)
    hop[id] = (round(x), round(y), round(w or 0), round(h or 0))
    if chua:
        trong_cs[id] = chua
    return d


def chu(id, x, y, text, size=12, *, w=None, at=None, mau=None, align='left',
        vao='rise', chua=None, **kw):
    """Một khối chữ. `w` luôn khai rõ — không khai thì không kiểm được va chạm."""
    if w is None:
        w = rong_chu(text, size)
    d = {'text': text, 'size': size, 'align': align}
    if at is not None:
        d['in'] = {'kind': vao, 'ease': 'out', 'dur': .45}
        d['at'] = round(at, 2)
    if mau:
        d['ink'] = mau
    d.update(kw)
    E(id, 'text', x, y, w, cao_chu(text, size), chua=chua, **d)


def khoi(id, x, y, w, h, fill, *, r=10, at=None, vao='rise', chua=None, **kw):
    d = {'fill': fill, 'radius': r}
    if at is not None:
        d['in'] = {'kind': vao, 'ease': 'out', 'dur': .45}
        d['at'] = round(at, 2)
    d.update(kw)
    E(id, 'panel', x, y, w, h, chua=chua, **d)


# ══ NỀN & TIÊU ĐỀ ══════════════════════════════════════════════════════════
khoi('nen', 0, 0, W, H, NEN, r=0, **{'in': {'kind': 'none', 'dur': .001}})

t0, t1 = DAI['tieu-de']
chu('tieu-de', LE, t0, '*S02* · Một đường link', size=30, at=.15, vao='rise',
    w=rong_chu('S02 · Một đường link', 30))


# ══ MỘT CỬA SỔ CHAT ════════════════════════════════════════════════════════
def cua_so(p, gx, t, nhan, nen_nhan, muc_nhan):
    """Dựng khung cửa sổ + thanh bên + đầu khung + ô nhập.

    `p` là tiền tố id, `gx` là mép trái tuyệt đối, `t` là giây bắt đầu.
    Mọi toạ độ bên trong viết theo hệ TƯƠNG ĐỐI rồi cộng `gx`/`CY` — nhờ vậy
    hai cửa sổ dùng chung đúng một bộ số, lệch là lệch cả hai.
    """
    X = lambda rx: gx + rx      # noqa: E731 — đổi trục ngang
    Y = lambda ry: CY + ry      # noqa: E731 — đổi trục dọc
    cs = f'{p}-khung'

    # nhãn tròn phía trên, căn giữa theo cửa sổ
    n0, n1 = DAI['nhan']
    nw = 214
    khoi(f'{p}-nhan', X((CW - nw) / 2), n0, nw, n1 - n0, nen_nhan, r=(n1 - n0) / 2,
         at=t, vao='fall')
    chu(f'{p}-nhan-chu', X((CW - nw) / 2), n0 + 9, nhan, size=14, w=nw,
        align='center', at=t + .05, mau=muc_nhan, vao='fade')

    # khung + thanh bên. Viền là một khối lớn hơn 1px nằm dưới — định dạng
    # không có `border`, mà thiếu viền thì cửa sổ trắng chìm vào nền sáng.
    khoi(f'{p}-vien', gx - 1, CY - 1, CW + 2, CH + 2, '#dfe3ea', r=15,
         at=t + .09, vao='pop')
    khoi(cs, gx, CY, CW, CH, GIAY, r=14, at=t + .1, vao='pop')
    khoi(f'{p}-nav', gx, CY, SW, CH, NAV, r=14, at=t + .14, vao='fade', chua=cs)

    # logo
    khoi(f'{p}-logo-o', X(16), Y(20), 22, 22, CAM, r=11, at=t + .2, vao='pop', chua=cs)
    chu(f'{p}-logo', X(46), Y(21), 'Vibe Host', size=15, at=t + .22, mau=MUC_NAV, chua=cs)
    chu(f'{p}-kglv', X(16), Y(62), 'KHÔNG GIAN LÀM VIỆC', size=9, at=t + .26,
        mau=MUC_GOI, chua=cs)

    # mục menu
    for i, ten in enumerate(NHAN_MENU):
        ry = MENU_Y0 + i * MENU_BUOC
        if i == 0:
            khoi(f'{p}-menu-sang', X(10), Y(ry - 6), SW - 20, 27, NAV_SANG, r=8,
                 at=t + .3, vao='fade', chua=cs)
        khoi(f'{p}-menu-ic{i}', X(24), Y(ry + 2), 12, 12, '#5b6577', r=3,
             at=t + .3 + i * .035, vao='fade', chua=cs)
        chu(f'{p}-menu{i}', X(44), Y(ry), ten, size=11, w=SW - 44 - 10,
            at=t + .3 + i * .035, mau=MUC_NAV if i == 0 else MUC_GOI, chua=cs)

    # thẻ gói dưới chân thanh bên
    khoi(f'{p}-goi', X(10), Y(GOI_Y), SW - 20, GOI_H, GOI_NEN, r=10,
         at=t + .52, vao='fade', chua=cs)
    chu(f'{p}-goi-ten', X(22), Y(GOI_Y + 10), 'Gói Vibe Host Pro', size=10,
        at=t + .55, mau=MUC_NAV, chua=cs)
    for i, (k, v) in enumerate(GOI_HANG):
        ry = GOI_Y + 38 + i * 22
        chu(f'{p}-goi-k{i}', X(22), Y(ry), k, size=10, w=62,
            at=t + .58 + i * .04, mau=MUC_GOI, chua=cs)
        chu(f'{p}-goi-v{i}', X(SW - 22 - 64), Y(ry), v, size=10, w=64,
            align='right', at=t + .58 + i * .04, mau=MUC_NAV, chua=cs)

    # đầu khung chat
    khoi(f'{p}-ava-nhom', X(CHAT_X), Y(18), 30, 30, XAM_NEN, r=15,
         at=t + .36, vao='pop', chua=cs)
    chu(f'{p}-nhom', X(CHAT_X + 40), Y(17), 'Nhóm: Vận hành hệ thống', size=14,
        at=t + .36, chua=cs)
    chu(f'{p}-tv', X(CHAT_X + 40), Y(40), '12 thành viên', size=10,
        at=t + .4, mau='#8a93a6', chua=cs)
    for i in range(4):
        khoi(f'{p}-ic{i}', X(CHAT_R - 34 - i * 30), Y(26), 14, 14, '#c8cedb', r=4,
             at=t + .42 + i * .03, vao='fade', chua=cs)
    khoi(f'{p}-gach', X(SW), Y(62), CW - SW, 1, VIEN, r=0, at=t + .44,
         vao='fade', chua=cs)

    # ô nhập tin nhắn
    khoi(f'{p}-o-nhap', X(CHAT_X), Y(O_NHAP_Y), CHAT_R - CHAT_X, 38, '#f7f8fb',
         r=11, at=t + .62, vao='fade', chua=cs)
    chu(f'{p}-o-chu', X(CHAT_X + 14), Y(O_NHAP_Y + 12), 'Nhập tin nhắn…', size=11,
        at=t + .64, mau='#8a93a6', chua=cs)
    for i in range(2):
        khoi(f'{p}-nhap-ic{i}', X(CHAT_R - 106 + i * 28), Y(O_NHAP_Y + 12), 14, 14,
             '#c8cedb', r=4, at=t + .64 + i * .03, vao='fade', chua=cs)
    khoi(f'{p}-gui', X(CHAT_R - 42), Y(O_NHAP_Y + 8), 22, 22, CAM, r=11,
         at=t + .66, vao='pop', chua=cs)
    return X, Y, cs


def tin(p, X, Y, cs, i, ry, ten, gio, loi, t, *, quan_tri=False, ava='#f4ded0'):
    """Một tin nhắn: avatar + tên (+ huy hiệu) + giờ, rồi bong bóng bên dưới.

    Trả về mép dưới (tương đối) để tin sau đặt tiếp — không ai phải cộng tay.
    """
    khoi(f'{p}-av{i}', X(CHAT_X), Y(ry), 26, 26, ava, r=13, at=t, vao='pop', chua=cs)
    chu(f'{p}-ten{i}', X(BONG_X), Y(ry + 1), ten, size=12, at=t, chua=cs)

    x = BONG_X + rong_chu(ten, 12) + 6
    if quan_tri:
        khoi(f'{p}-qt{i}', X(x), Y(ry), 68, 17, XAM_NEN, r=8, at=t + .02,
             vao='fade', chua=cs)
        chu(f'{p}-qtc{i}', X(x), Y(ry + 3), 'Quản trị viên', size=9, w=68,
            align='center', at=t + .04, mau='#6c7689', chua=cs)
        x += 76
    chu(f'{p}-gio{i}', X(x), Y(ry + 3), gio, size=10, at=t + .04, mau='#9aa3b4', chua=cs)

    by = ry + 22
    bw = min(rong_chu(loi, 11) + 20, BONG_R - BONG_X)
    bh = cao_chu(loi, 11) + 20
    khoi(f'{p}-bong{i}', X(BONG_X), Y(by), bw, bh, BONG, r=10, at=t + .08, chua=cs)
    chu(f'{p}-loi{i}', X(BONG_X + 13), Y(by + 10), loi, size=11, w=bw - 20,
        at=t + .1, chua=cs)
    return by + bh


# ══ CỬA SỔ TRÁI — "Trước đây: Gửi file" ════════════════════════════════════
XT, YT, csT = cua_so('t', CX[0], .5, 'Trước đây: Gửi file', '#e7eaf0', '#5d6678')

y = tin('t', XT, YT, csT, 0, 76, 'Admin', '09:21',
        'Team ơi, gửi file ca trực mới nhất,|mọi người kiểm tra giúp nhé.', 1.6,
        quan_tri=True)

# thẻ file .xlsx — thủ phạm của cả màn bên trái
y += KHE_THE
khoi('t-file', XT(BONG_X), YT(y), BONG_R - BONG_X, 46, GIAY, r=10, at=2.1, chua=csT)
khoi('t-file-o', XT(BONG_X + 12), YT(y + 10), 26, 26, LUC, r=6, at=2.15, vao='pop', chua=csT)
chu('t-file-ic', XT(BONG_X + 12), YT(y + 17), 'X', size=11, w=26, align='center',
    at=2.18, mau='#ffffff', chua=csT)
chu('t-file-ten', XT(BONG_X + 48), YT(y + 9), 'dang-ky-ca-truc-FINAL-v7-sua-lan-cuoi.xlsx',
    size=10, w=BONG_R - BONG_X - 90, at=2.2, chua=csT)
chu('t-file-cap', XT(BONG_X + 48), YT(y + 26), 'XLSX  ·  25.6 KB', size=9,
    w=140, at=2.24, mau='#8a93a6', chua=csT)
y += 46

y = tin('t', XT, YT, csT, 1, y + KHE_TIN, 'Minh', '09:25',
        'File này bản nào vậy anh?', 2.7, ava='#e2ddf5')
y = tin('t', XT, YT, csT, 2, y + KHE_TIN, 'Huy', '09:25',
        'Em mở bị lỗi, không tải được ạ.', 3.3, ava='#d9e6f7')
y = tin('t', XT, YT, csT, 3, y + KHE_TIN, 'Admin', '09:28',
        'À gửi nhầm bản cũ, để anh gửi lại nhé.', 3.9, quan_tri=True)

# thẻ file thứ hai — cùng một tệp, thêm một bản nữa
y += KHE_THE
khoi('t-file2', XT(BONG_X), YT(y), BONG_R - BONG_X, 44, GIAY, r=10, at=4.3, chua=csT)
khoi('t-file2-o', XT(BONG_X + 12), YT(y + 9), 26, 26, LUC, r=6, at=4.34, vao='pop', chua=csT)
chu('t-file2-ic', XT(BONG_X + 12), YT(y + 16), 'X', size=11, w=26, align='center',
    at=4.36, mau='#ffffff', chua=csT)
chu('t-file2-ten', XT(BONG_X + 48), YT(y + 8), 'dang-ky-ca-truc-FINAL-v8.xlsx',
    size=10, w=BONG_R - BONG_X - 90, at=4.38, chua=csT)
chu('t-file2-cap', XT(BONG_X + 48), YT(y + 25), 'XLSX  ·  26.1 KB', size=9,
    w=140, at=4.4, mau='#8a93a6', chua=csT)
DAY_TRAI = y + 44

# ══ MŨI TÊN ════════════════════════════════════════════════════════════════
chu('mui-ten', CX[0] + CW, CY + CH / 2 - 26, '*→*', size=40, w=KHE,
    align='center', at=4.9, vao='pop')

# ══ CỬA SỔ PHẢI — "Bây giờ: Gửi link" ══════════════════════════════════════
XP, YP, csP = cua_so('p', CX[1], 5.2, 'Bây giờ: Gửi link', CAM_MO, CAM)

y = tin('p', XP, YP, csP, 0, 76, 'Admin', '09:21',
        'Team ơi, ca trực đã cập nhật mới nhất|tại đây, mọi người xem giúp nhé.', 6.3,
        quan_tri=True)

# thẻ LINK — nhân vật chính của cả màn
y += KHE_THE
khoi('p-link', XP(BONG_X), YP(y), BONG_R - BONG_X, 58, GIAY, r=11, at=6.9, vao='pop', chua=csP)
khoi('p-link-o', XP(BONG_X + 12), YP(y + 14), 30, 30, CAM_MO, r=9, at=6.95, vao='pop', chua=csP)
khoi('p-link-vong', XP(BONG_X + 21), YP(y + 25), 12, 8, CAM, r=4, at=7.0, vao='pop', chua=csP)
chu('p-link-url', XP(BONG_X + 52), YP(y + 13), '*https://internal.matbao.net/ca-truc*',
    size=12, w=BONG_R - BONG_X - 96, at=7.05, chua=csP)
chu('p-link-phu', XP(BONG_X + 52), YP(y + 33), 'Ca trực · Cập nhật 28/08/2026 09:15',
    size=10, w=BONG_R - BONG_X - 96, at=7.1, mau='#8a93a6', chua=csP)
y += 58

# thả cảm xúc — dấu hiệu cả phòng đã xem
y += KHE_THE
for i, (nen_c, cham_c, so) in enumerate([(XAM_NEN, '#f0b429', '2'), ('#fdeaea', '#e3272c', '1')]):
    bx = BONG_X + i * 56
    khoi(f'p-cx{i}', XP(bx), YP(y), 48, 24, nen_c, r=12, at=7.5 + i * .12, vao='pop', chua=csP)
    khoi(f'p-cx{i}-o', XP(bx + 9), YP(y + 8), 9, 9, cham_c, r=5, at=7.54 + i * .12,
         vao='pop', chua=csP)
    chu(f'p-cx{i}-so', XP(bx + 22), YP(y + 6), so, size=10, w=18, at=7.56 + i * .12, chua=csP)
y += 24

y = tin('p', XP, YP, csP, 1, y + KHE_TIN, 'Minh', '09:23',
        'Ok luôn anh, mở nhanh, xem dễ hơn nhiều!', 7.9, ava='#e2ddf5')
y = tin('p', XP, YP, csP, 2, y + KHE_TIN, 'Huy', '09:24',
        'Chuẩn rồi anh, không còn lỗi file nữa ạ.', 8.5, ava='#d9e6f7')
y = tin('p', XP, YP, csP, 3, y + KHE_TIN, 'Lan', '09:24',
        'Cảm ơn anh, tiện quá!', 9.1, ava='#d6efe0')
DAY_PHAI = y

# ══ CÂU CHỐT ═══════════════════════════════════════════════════════════════
c0, c1 = DAI['cau-chot']
chu('chot', 0, c0, 'Một đường link  ·  cả phòng nhìn cùng một *bản*', size=26,
    w=W, align='center', at=10.0)
khoi('chot-gach', (W - 190) / 2, c0 + 42, 190, 4, CAM, r=2, at=10.5, vao='pop')


# ══ KIỂM TRA TRƯỚC KHI GHI ═════════════════════════════════════════════════
loi = []


def kiem_dai():
    """Bốn dải ngang không được cấn nhau."""
    ten = list(DAI)
    for i in range(len(ten)):
        for j in range(i + 1, len(ten)):
            a0, a1 = DAI[ten[i]]
            b0, b1 = DAI[ten[j]]
            if a0 < b1 and b0 < a1:
                loi.append(f'Dải "{ten[i]}" ({a0}–{a1}) cấn dải "{ten[j]}" ({b0}–{b1}).')


def kiem_trong():
    """Mọi thành phần phải nằm trong khung hình; con phải nằm trong cửa sổ cha."""
    for id_, (x, y_, w_, h_) in hop.items():
        if x < 0 or y_ < 0 or x + w_ > W or y_ + h_ > H:
            loi.append(f'`{id_}` thò ra ngoài khung hình: '
                       f'({x},{y_}) {w_}×{h_} — khung {W}×{H}.')
        cha = trong_cs.get(id_)
        if cha:
            cx, cy, cw, ch = hop[cha]
            if x < cx or y_ < cy or x + w_ > cx + cw or y_ + h_ > cy + ch:
                loi.append(f'`{id_}` thò ra ngoài cửa sổ `{cha}`: '
                           f'({x},{y_}) {w_}×{h_} — cửa sổ ({cx},{cy}) {cw}×{ch}.')


def kiem_day():
    """Tin nhắn cuối không được chạm ô nhập."""
    for ten, day in (('trái', DAY_TRAI), ('phải', DAY_PHAI)):
        if day > O_NHAP_Y - 6:
            loi.append(f'Cột {ten}: nội dung xuống tới {round(day)}, '
                       f'đè ô nhập ở {O_NHAP_Y}.')


kiem_dai()
kiem_trong()
kiem_day()

if loi:
    print('✗ Bố cục sai — KHÔNG ghi file:', file=sys.stderr)
    for l in loi:
        print('   ·', l, file=sys.stderr)
    sys.exit(1)

doc = {
    'version': 1,
    'meta': {'name': 'S02 · Một đường link', 'width': W, 'height': H, 'density': 1,
             'bg': NEN, 'accent': CAM, 'accent2': '#f4a261',
             'hot': CAM, 'hot2': '#e3272c', 'ink': MUC,
             'inkSoft': '#5d6678', 'inkFaint': '#98a1b2'},
    'scenes': [{'id': 'canh-1', 'duration': 12.5, 'stagger': 0,
                'camera': {'x': 0, 'y': 0, 'scale': 1}, 'elements': els}],
}
OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding='utf-8')

# Bản kê cho `kiem-s02.mjs` đo lại bằng trình duyệt thật.
KIEM.write_text(json.dumps({'w': W, 'h': H, 'trong': trong_cs}, ensure_ascii=False,
                           indent=2), encoding='utf-8')

print(f'✓ {OUT.name}: {len(els)} thành phần, {doc["scenes"][0]["duration"]}s')
print(f'  cột trái xuống tới {round(DAY_TRAI)}, cột phải {round(DAY_PHAI)}, '
      f'ô nhập ở {O_NHAP_Y}')
