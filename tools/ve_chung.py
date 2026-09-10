"""Bộ dựng cảnh dùng chung cho các bộ sinh clip `ve-*.py`.

Gom những thứ mọi clip đều cần: dựng phần tử, đo bề rộng chữ, tính khung ngắm
camera, và BỐN PHÉP KIỂM đã từng bắt lỗi thật:

  kiem_trong()  thành phần thò ra ngoài khung hoặc ngoài khối cha
  kiem_dong()   các dòng xếp chồng dọc cấn nhau (phép kiểm cha-con KHÔNG thấy
                lớp lỗi này — mọi dòng đều nằm gọn trong cùng một thẻ)
  kiem_sao()    cặp `*…*` bắc qua dấu `|` — trình dựng cắt dòng TRƯỚC rồi mới
                dịch dấu sao, nên cặp sao bị chẻ đôi và ký tự `*` hiện nguyên
  kiem_camera() khung ngắm zoom lọt ra ngoài mép clip (lòi nền trống ở rìa)

Số đo THẬT do `tools/kiem-canh.mjs` đo lại bằng trình duyệt; ở đây chỉ là ước
để bắt lỗi thô trước khi ghi file.
"""
import json
import math

W = H = 0
canhs, els = [], None
hop, trong, dong_bang, loi = {}, {}, [], []
tran = set()      # id được phép nằm ngoài mép clip (nền do camera cắt)

HE_SO_RONG = 0.62
BU_RONG = 6


def dat_khung(rong, cao):
    global W, H
    W, H = rong, cao


def rong_chu(s, size):
    return max(len(d) for d in s.split('|')) * size * HE_SO_RONG + BU_RONG


def cao_chu(s, size):
    return len(s.split('|')) * size * 1.12


# ══ DỰNG ═══════════════════════════════════════════════════════════════════
def mo_canh(id, giay, camera=None, camera_muot=None):
    global els
    els = []
    c = {'id': id, 'duration': giay, 'stagger': 0,
         'camera': camera or {'x': 0, 'y': 0, 'scale': 1}, 'elements': els}
    if camera_muot is not None:
        c['cameraMove'] = camera_muot
    canhs.append(c)


def E(id, kind, x, y, w, h, *, chua=None, ra_ngoai=False, **kw):
    """`ra_ngoai=True`: phần tử được phép vượt mép clip. Dùng cho lớp nền mà
    CAMERA mới là thứ quyết định thấy phần nào — chặn nó thì không dựng được
    giao diện to hơn khung để zoom vào."""
    if ra_ngoai:
        tran.add(id)
    d = {'id': id, 'kind': kind, 'x': round(x), 'y': round(y)}
    if w is not None:
        d['w'] = round(w)
    if h is not None:
        d['h'] = round(h)
    d.update(kw)
    els.append(d)
    hop[(canhs[-1]['id'], id)] = (round(x), round(y), round(w or 0), round(h or 0))
    if chua:
        trong[id] = chua


def khoi(id, x, y, w, h, fill, *, r=10, at=None, vao='rise', dai=.45, xoay=None,
         song=None, chua=None, **kw):
    d = {'fill': fill, 'radius': round(r, 2)}
    if at is not None:
        d['in'] = {'kind': vao, 'ease': 'out', 'dur': dai}
        d['at'] = round(at, 2)
    if song is not None:
        d['for'] = round(song, 2)
    if xoay is not None:
        d['rotate'] = round(xoay, 2)
    d.update(kw)
    E(id, 'panel', x, y, w, h, chua=chua, **d)


def chu(id, x, y, text, size=11, *, w=None, at=None, mau=None, align='left',
        vao='rise', dai=.45, song=None, chua=None, **kw):
    if w is None:
        w = rong_chu(text, size)
    d = {'text': text, 'size': round(size, 2), 'align': align}
    if at is not None:
        d['in'] = {'kind': vao, 'ease': 'out', 'dur': dai}
        d['at'] = round(at, 2)
    if song is not None:
        d['for'] = round(song, 2)
    if mau:
        d['ink'] = mau
    d.update(kw)
    E(id, 'text', x, y, w, cao_chu(text, size), chua=chua, **d)


_anh_cao = 0


def anh(id, x, y, w, h, src, *, radius=0, fit='cover', at=None, vao='fade',
        dai=.5, chua=None, **kw):
    """Ảnh — CÓ BÙ TRỪ DÒNG CHẢY.

    `scene-player.html` dòng 150 đặt `.k-image{position:relative}`, đè lên
    `.el{position:absolute}` ở dòng 52 (cùng độ ưu tiên, luật sau thắng). Nghĩa
    là ảnh KHÔNG được đặt tuyệt đối mà nằm trong dòng chảy: ảnh thứ hai bắt đầu
    từ đáy ảnh thứ nhất rồi mới cộng `top`. Mọi cảnh lại nằm chung một `#cam`
    nên chồng dồn qua cả các cảnh — ảnh thứ tư trong clip rơi xuống y=2034.

    Clip nào chỉ có MỘT ảnh thì không bao giờ thấy lỗi này, nên nó nằm im cho
    tới khi có clip thứ hai dùng nhiều ảnh.

    Ở đây trừ sẵn tổng chiều cao các ảnh đã khai trước đó. `hop` vẫn ghi vị trí
    MONG MUỐN để phép kiểm nói đúng chuyện; số đo thật do `kiem-canh.mjs` xác
    nhận lại bằng trình duyệt.
    """
    global _anh_cao
    d = {'src': src, 'radius': radius, 'fit': fit}
    if at is not None:
        d['in'] = {'kind': vao, 'ease': 'out', 'dur': dai}
        d['at'] = round(at, 2)
    d.update(kw)
    E(id, 'image', x, y - _anh_cao, w, h, chua=chua, **d)
    hop[(canhs[-1]['id'], id)] = (round(x), round(y), round(w), round(h))
    _anh_cao += round(h)


def the(id, x, y, w, h, at, *, nen='#ffffff', vien='#e7e9ee', r=12, vao='rise',
        dai=.45, chua=None, song=None, day=1):
    """Thẻ có viền mảnh. Định dạng không có `border` nên viền là một khối lớn
    hơn nằm dưới — trên nền trắng mà thiếu viền thì thẻ tan vào nền."""
    khoi(f'{id}-v', x - day, y - day, w + day * 2, h + day * 2, vien, r=r + day,
         at=at, vao=vao, dai=dai, chua=chua, song=song)
    khoi(id, x, y, w, h, nen, r=r, at=at, vao=vao, dai=dai, chua=chua, song=song)


def dau_tick(id, cx, cy, R, mau, at, *, chua=None, day=None, vao='fade',
             song=None, ra_ngoai=False):
    """Dấu tick vẽ bằng HAI THANH XOAY, không dùng ký tự — ký tự ✓ phụ thuộc
    phông máy đang chạy (máy này đã ra ô vuông với `＋` và `⧉`)."""
    T = day or max(2.4, R * 0.2)
    for i, (ax, ay, bx, by) in enumerate([(-.42, .02, -.10, .32), (-.10, .32, .44, -.30)]):
        x1, y1, x2, y2 = ax * R, ay * R, bx * R, by * R
        d = math.hypot(x2 - x1, y2 - y1) + T * .3
        khoi(f'{id}-t{i}', cx + (x1 + x2) / 2 - d / 2, cy + (y1 + y2) / 2 - T / 2,
             d, T, mau, r=T / 2, at=at, vao=vao, dai=.25, song=song,
             xoay=math.degrees(math.atan2(y2 - y1, x2 - x1)), chua=chua,
             ra_ngoai=ra_ngoai)


def vien_dut(id, x, y, w, h, mau, at, *, day=2, net=13, khe=9, chua=None):
    """Viền nét đứt rải bằng vòng lặp — đổi kích thước vùng là viền tự chạy lại."""
    # Làm tròn về số nguyên: `range` không nhận bước thập phân, mà `net`/`khe`
    # có thể là số lẻ sau khi nhân hệ số thu/phóng.
    net, khe, day = round(net), round(khe), max(1, round(day))
    buoc = max(2, net + khe)
    for i, cx in enumerate(range(0, int(w - net) + 1, buoc)):
        for cy, t in ((y, 'tr'), (y + h - day, 'du')):
            khoi(f'{id}-{t}{i}', x + cx, cy, net, day, mau, r=day / 2, at=at,
                 vao='fade', dai=.3, chua=chua)
    for i, cy in enumerate(range(buoc, int(h - net) + 1, buoc)):
        for cx, t in ((x, 'tra'), (x + w - day, 'ph')):
            khoi(f'{id}-{t}{i}', cx, y + cy, day, net, mau, r=day / 2, at=at,
                 vao='fade', dai=.3, chua=chua)


# ══ CAMERA ═════════════════════════════════════════════════════════════════
def cam_ngam(x, y, phong):
    """Khung ngắm phóng `phong` lần, đặt điểm (x,y) vào giữa khung."""
    return {'x': x - W / 2, 'y': y - H / 2, 'scale': phong}


def neo_man(x, y, cam):
    """Ngược của `man_hinh`: muốn một PHẦN TỬ hiện ra ở điểm (x,y) trên MÀN HÌNH
    thì phải đặt nó ở đâu trên sân khấu.

    Cần vì camera phóng MỌI THỨ trong `#cam`, kể cả câu thuyết minh. Cảnh nào
    đẩy máy vào giao diện mà đặt viên thuốc ở toạ độ sân khấu thì nó cũng bị
    phóng theo và văng ra ngoài khung. Đặt qua hàm này (và chia cỡ chữ cho mức
    phóng) thì nó đứng yên đúng chỗ, đúng cỡ, dù máy đẩy vào bao nhiêu.
    """
    s = cam.get('scale', 1)
    mx, my = cam['x'] + W / 2, cam['y'] + H / 2
    return (mx + (x - W / 2) / s, my + (y - H / 2) / s)


def man_hinh(x, y, cam):
    """Điểm trên sân khấu → toạ độ MÀN HÌNH, tính cả cú zoom.

    Con trỏ chuột được trình dựng vẽ ở lớp NGOÀI `#cam` nên camera không phóng
    nó theo. Cảnh nào có zoom mà đưa toạ độ sân khấu vào là con trỏ trỏ lệch.
    """
    s = cam.get('scale', 1)
    mx, my = cam['x'] + W / 2, cam['y'] + H / 2
    return (W / 2 + s * (x - mx), H / 2 + s * (y - my))


# ══ KIỂM ═══════════════════════════════════════════════════════════════════
def kiem_trong():
    for (canh, id_), (x, y, w, h) in hop.items():
        if id_ not in tran and (x < 0 or y < 0 or x + w > W or y + h > H):
            loi.append(f'[{canh}] `{id_}` thò ra ngoài khung hình: '
                       f'({x},{y}) {w}×{h} — khung {W}×{H}.')
        cha = trong.get(id_)
        if cha:
            c = hop.get((canh, cha))
            if c is None:
                loi.append(f'[{canh}] `{id_}` khai cha `{cha}` nhưng cảnh này không có.')
                continue
            cx, cy, cw, ch = c
            if x < cx or y < cy or x + w > cx + cw or y + h > cy + ch:
                loi.append(f'[{canh}] `{id_}` thò ra ngoài `{cha}`: '
                           f'({x},{y}) {w}×{h} — cha ({cx},{cy}) {cw}×{ch}.')


def kiem_dong(day_toi_da=None):
    for c in canhs:
        d = sorted([x for x in dong_bang if x[0] == c['id']], key=lambda x: x[2])
        for a, b in zip(d, d[1:]):
            if b[2] < a[3]:
                loi.append(f'[{c["id"]}] "{a[1]}" ({a[2]:.0f}–{a[3]:.0f}) '
                           f'cấn "{b[1]}" ({b[2]:.0f}–{b[3]:.0f}).')
        if d and day_toi_da is not None and d[-1][3] > day_toi_da:
            loi.append(f'[{c["id"]}] "{d[-1][1]}" xuống tới {d[-1][3]:.0f}, '
                       f'quá mép {day_toi_da}.')


def kiem_sao():
    for c in canhs:
        for e in c['elements']:
            for phan in ('text', 'sub'):
                v = e.get(phan)
                if not isinstance(v, str) or '|' not in v:
                    continue
                for d in v.split('|'):
                    if d.count('*') % 2:
                        loi.append(f'[{c["id"]}] `{e["id"]}`: cặp `*…*` bắc qua dấu `|` — '
                                   f'dòng "{d.strip()}" lẻ dấu sao, sẽ hiện nguyên ký tự.')


def kiem_camera():
    for c in canhs:
        cam = c['camera']
        s = cam.get('scale', 1)
        if s <= 1:
            continue
        mx, my = cam['x'] + W / 2, cam['y'] + H / 2
        nx, ny = W / 2 / s, H / 2 / s
        if mx - nx < -.5 or mx + nx > W + .5 or my - ny < -.5 or my + ny > H + .5:
            loi.append(f'[{c["id"]}] khung ngắm zoom ×{s} quanh ({mx:.0f},{my:.0f}) '
                       f'lọt ra ngoài clip: x {mx - nx:.0f}…{mx + nx:.0f}, '
                       f'y {my - ny:.0f}…{my + ny:.0f} — clip {W}×{H}.')


def kiem_id_moc():
    for c in canhs:
        thay = set()
        for e in c['elements']:
            if e['id'] in thay:
                loi.append(f'[{c["id"]}] trùng id `{e["id"]}`.')
            thay.add(e['id'])
            if e.get('at', 0) >= c['duration']:
                loi.append(f'[{c["id"]}] `{e["id"]}` hiện ở giây {e["at"]} '
                           f'nhưng cảnh chỉ dài {c["duration"]}s.')


def chot(OUT, KIEM, meta, *, day_toi_da=None):
    """Chạy hết phép kiểm rồi ghi file. Sai thì KHÔNG ghi."""
    import sys
    kiem_trong(); kiem_dong(day_toi_da); kiem_sao(); kiem_camera(); kiem_id_moc()
    if loi:
        print('✗ Bố cục sai — KHÔNG ghi file:', file=sys.stderr)
        for l in loi:
            print('   ·', l, file=sys.stderr)
        sys.exit(1)

    doc = {'version': 1, 'meta': {**meta, 'width': W, 'height': H}, 'scenes': canhs}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding='utf-8')

    moc, chay = [], 0.0
    for c in canhs:
        chay += c['duration']
        moc.append({'id': c['id'], 'moc': round(chay - .15, 2)})
    KIEM.write_text(json.dumps({'slug': OUT.stem, 'w': W, 'h': H, 'canh': moc,
                                'trong': trong}, ensure_ascii=False, indent=2),
                    encoding='utf-8')
    tong = sum(len(c['elements']) for c in canhs)
    print(f'✓ {OUT.name}: {tong} thành phần, {len(canhs)} cảnh, {chay:.1f}s')
    for c in canhs:
        print(f'   · {c["id"]:<18} {c["duration"]:>4.1f}s  ×{c["camera"].get("scale", 1)}  '
              f'{len(c["elements"])} thành phần')
