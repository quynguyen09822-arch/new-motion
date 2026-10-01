/**
 * BẢNG VẶN CỦA XƯỞNG KHỐI NỔI.
 *
 * CÂU CHỮ LÀ VIỆC CHÍNH Ở ĐÂY, không phải mã. `CLAUDE.md` §8: không để lọt từ
 * kỹ thuật ra chỗ người dùng đọc. Thế giới 3D đầy từ như *mesh, normal, PBR,
 * roughness, bake, FOV* — không từ nào trong số đó được xuất hiện trên màn hình
 * này. Bảng đổi nằm ở `docs/LO-TRINH-3D.md` mục 6.
 *
 * Mỗi núm phải trả lời được: "vặn cái này thì CÁI GÌ ĐỔI TRÊN MÀN HÌNH".
 */
import { KHO_LOAI, BO_PHOI, khoiMoi, boCuc } from './khoi.js';
import { KHO_DONG, soatBeRong, beRongChiem, gocTuBanDen, banDenTuGoc, taDen,
  mauTheoSang, DEN_MAC_DINH } from './hinhhoc.js';
import { dung, veTai } from './ve.js';

/* Khung phim THẬT, tính bằng điểm ảnh của phim xuất ra — không phải cỡ hiển thị
   trên màn. Mọi kích thước khối người dùng vặn đều tính theo hệ này, nên lời
   nhắc "chiếm bao nhiêu % khung" mới đúng với phim thật. */
const KHUNG = {
  '9:16': { w: 1080, h: 1920, ten: 'Dọc 9:16' },
  '16:9': { w: 1920, h: 1080, ten: 'Ngang 16:9' },
  '1:1':  { w: 1080, h: 1080, ten: 'Vuông 1:1' },
};

const Q = (s) => document.querySelector(s);
const san = Q('#san'), khungEl = Q('#khung'), bang = Q('#bang');

let khoi = khoiMoi('hop');
let tiLe = '9:16';
let dat = null;          // thẻ đã dựng, do `ve.js` trả về
let t = 0, dangChay = false, mocChay = 0;

/* ---------------------------------------------------------------------------
 * SÂN
 * ------------------------------------------------------------------------- */

function xepSan() {
  const k = KHUNG[tiLe];
  const bao = khungEl.parentElement.getBoundingClientRect();
  const caoToiDa = Math.max(300, Math.min(bao.height - 48, 560));
  const rongToiDa = Math.max(240, bao.width - 48);
  const s = Math.min(caoToiDa / k.h, rongToiDa / k.w);
  khungEl.style.width = Math.round(k.w * s) + 'px';
  khungEl.style.height = Math.round(k.h * s) + 'px';
  /* Sân giữ đúng cỡ khung THẬT rồi thu nhỏ cả cụm lại. Làm ngược — thu nhỏ số
     đo của khối — thì mọi con số trên bảng vặn thành vô nghĩa, và lời nhắc
     "chiếm 60% khung" sẽ nói sai. */
  Object.assign(san.style, {
    width: k.w + 'px', height: k.h + 'px',
    transform: `scale(${s})`, transformOrigin: 'top left',
    perspective: Math.round(k.w * 1.15) + 'px',
  });
}

function lamLai() {
  dat = dung(san, khoi);

  /* CHỮ NỔI không có núm "bề ngang" — bề ngang của nó do chính dòng chữ quyết
     định. Không đo lại thì gõ "MẮT BÃO CLOUD HOSTING" vào mà lời nhắc 50% vẫn
     im như khi còn chữ ngắn, tức là nó nói dối. `offsetWidth` đo theo bố cục
     nên KHÔNG bị cỡ thu nhỏ của sân làm sai. */
  if (khoi.loai === 'chu-noi' && dat.chuDS.length) {
    khoi.rong = Math.round(dat.chuDS[0].el.offsetWidth) || khoi.rong;
  }

  veTai(dat, khoi, t);
  nhacNho();
}

function nhacNho() {
  const ds = soatBeRong(khoi, KHUNG[tiLe].w);
  Q('#nhac').textContent = ds.join(' ');
}

/* ---------------------------------------------------------------------------
 * THANH TUA — bằng chứng sống của luật "vẽ theo giây"
 * ------------------------------------------------------------------------- */

const thoiLuong = () => (khoi.dong?.kieu === 'dung-im' ? 6 : Math.max(0.5, khoi.dong?.chuKy || 6));

function capNhatTua() {
  const d = thoiLuong();
  Q('#thanh').max = String(d);
  Q('#giay').textContent = `${t.toFixed(2).replace('.', ',')} / ${d} s`;
  Q('#thanh').value = String(Math.min(t, d));
}

function vong(now) {
  if (!dangChay) return;
  const d = thoiLuong();
  t = ((now - mocChay) / 1000) % d;
  veTai(dat, khoi, t);
  capNhatTua();
  requestAnimationFrame(vong);
}

Q('#chay').onclick = () => {
  dangChay = !dangChay;
  Q('#chay').textContent = dangChay ? 'Dừng' : 'Chạy';
  if (dangChay) { mocChay = performance.now() - t * 1000; requestAnimationFrame(vong); }
};
Q('#thanh').oninput = (e) => {
  dangChay = false; Q('#chay').textContent = 'Chạy';
  t = Number(e.target.value);
  veTai(dat, khoi, t);
  capNhatTua();
};

Q('#khung-chon').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return;
  tiLe = b.dataset.k;
  for (const x of Q('#khung-chon').children) x.setAttribute('aria-pressed', String(x === b));
  xepSan(); nhacNho();
};

/* ---------------------------------------------------------------------------
 * BẢNG VẶN
 * ------------------------------------------------------------------------- */

/** Núm theo từng loại khối. `lamLai` = đổi cái này thì phải dựng lại thẻ. */
const NUM_THEO_LOAI = {
  hop: [
    ['rong', 'Bề ngang', 60, 900, 10, true], ['cao', 'Bề cao', 60, 900, 10, true],
    ['day', 'Bề dày', 10, 900, 10, true],
    ['chu', 'Chữ trên mặt trước', null, null, null, true],
  ],
  'the-lat': [
    ['rong', 'Bề ngang', 80, 900, 10, true], ['cao', 'Bề cao', 60, 700, 10, true],
    ['chu', 'Chữ mặt trước', null, null, null, true],
    ['chuSau', 'Chữ mặt sau', null, null, null, true],
  ],
  'chu-noi': [
    ['chu', 'Chữ', null, null, null, true],
    ['coChu', 'Cỡ chữ', 24, 220, 2, true],
    ['day', 'Bề dày chữ', 4, 120, 2, true],
    ['soLop', 'Độ mịn của bề dày', 3, 40, 1, true],
  ],
  'gia-may-chu': [
    ['tang', 'Số tầng', 1, 12, 1, true],
    ['rong', 'Bề ngang mỗi tầng', 80, 700, 10, true],
    ['cao', 'Bề cao mỗi tầng', 16, 160, 2, true],
    ['day', 'Bề sâu', 40, 500, 10, true],
    ['khe', 'Khe hở giữa các tầng', 0, 60, 2, true],
  ],
  'logo-khoi': [
    ['chu', 'Dấu hiệu', null, null, null, true],
    ['canh', 'Cạnh khối', 60, 700, 10, true],
    ['coChu', 'Cỡ dấu hiệu', 20, 220, 2, true],
  ],
  'nhan-vat': [
    ['co', 'Độ lớn', 0.3, 2, 0.05, true],
  ],
  tru: [
    ['ban', 'Bề ngang (nửa)', 30, 400, 5, true],
    ['cao', 'Bề cao', 20, 700, 10, true],
    ['soMat', 'Độ mịn đường tròn', 3, 48, 1, true],
  ],
  'bieu-do': [
    ['cotChu', 'Các cột (số, cách nhau bằng dấu phẩy)', null, null, null, true],
    ['nhanChu', 'Tên dưới mỗi cột', null, null, null, true],
    ['rongCot', 'Bề ngang mỗi cột', 20, 200, 2, true],
    ['caoMax', 'Bề cao cột lớn nhất', 60, 600, 10, true],
    ['day', 'Bề sâu', 10, 300, 5, true],
    ['khe', 'Khe hở giữa các cột', 0, 120, 2, true],
  ],
};

const el = (tag, lop, trong) => {
  const n = document.createElement(tag);
  if (lop) n.className = lop;
  if (trong != null) n.textContent = trong;
  return n;
};

function oTruot(nhan, gtri, min, max, buoc, khiDoi, goi) {
  const o = el('div', 'o');
  const trai = el('div');
  trai.appendChild(el('label', null, nhan));
  if (goi) trai.appendChild(el('small', 'goi', goi));
  const i = document.createElement('input');
  Object.assign(i, { type: 'range', min, max, step: buoc, value: gtri });
  const so = el('span', 'giay', String(gtri));
  i.oninput = () => { so.textContent = i.value; khiDoi(Number(i.value)); };
  const phai = el('div'); phai.style.display = 'flex'; phai.style.alignItems = 'center'; phai.style.gap = '8px';
  phai.append(i, so);
  o.append(trai, phai);
  return o;
}

function oChu(nhan, gtri, khiDoi) {
  const o = el('div', 'o');
  o.appendChild(el('label', null, nhan));
  const i = document.createElement('input');
  Object.assign(i, { type: 'text', value: gtri ?? '' });
  i.style.width = '150px';
  i.oninput = () => khiDoi(i.value);
  o.appendChild(i);
  return o;
}

/**
 * BÀN ĐÈN — bấm ra một cái đèn, cầm kéo tới chỗ muốn nó chiếu từ đó.
 *
 * Trước đây chỗ này là hai thanh kéo "đèn đứng bên nào" / "đèn cao hay thấp".
 * Đúng về số nhưng sai về người: không ai nghĩ về ánh sáng bằng hai con số góc,
 * người ta nghĩ "để cái đèn ở trên bên trái". Anh Quý nói thẳng điều đó.
 *
 * Mặt tròn là nửa quả cầu phía trước vật. Quả cầu bên trong được chiếu sáng
 * ngay theo chỗ đang kéo, nên thấy kết quả mà không cần nhìn sang khối.
 */
function nutDen() {
  const boc = el('div', 'den-boc');

  const nut = el('button', 'den-nut');
  nut.type = 'button';
  const xem = el('span', 'den-xem');
  const ta = el('span', 'den-ta');
  nut.append(xem, ta);

  const bang2 = el('div', 'den-bang');
  const ban = el('div', 'den-ban');
  const cau = el('div', 'den-cau');
  const tay = el('button', 'den-tay');
  tay.type = 'button';
  tay.setAttribute('aria-label', 'Cái đèn — kéo để đổi chỗ chiếu');
  ban.append(cau, tay);
  const ghi = el('div', 'den-ghi', 'Cầm cái đèn kéo tới chỗ muốn nó chiếu từ đó.');
  bang2.append(ban, ghi);
  boc.append(nut, bang2);

  /* Vẽ một quả cầu được chiếu sáng từ đúng hướng đang chọn. Dùng cùng công
     thức nhuộm màu với khối thật (`mauTheoSang`) để cái xem trước không nói
     một đằng còn khối làm một nẻo. */
  const veCau = (o, co) => {
    const { x, y } = banDenTuGoc(khoi.den.ngang, khoi.den.cao);
    const mau = khoi.mau || '#FF7A2F';
    const nen = khoi.den.nen ?? DEN_MAC_DINH.nen;
    /* Dời tâm sáng gần sát mép (×46) và cho vùng tối ăn rộng: để nhạt thì quả
       cầu nhìn gần như một đĩa màu phẳng, và cái xem trước mất hết công dụng.
       BÁN KÍNH TÍNH BẰNG PX, không bằng phần trăm: `circle 115%` là cú pháp
       SAI — `circle` chỉ nhận độ dài. Trình duyệt bỏ nguyên câu gradient, quả
       cầu biến mất sạch mà không báo lỗi gì. Đã sập đúng kiểu này. */
    o.style.background = `radial-gradient(circle ${co}px at ${50 + x * 46}% ${50 + y * 46}%, `
      + `${mauTheoSang(mau, 1)} 0%, ${mauTheoSang(mau, (1 + nen) / 2)} 34%, `
      + `${mauTheoSang(mau, nen)} 78%)`;
  };

  const capNhat = () => {
    const { x, y } = banDenTuGoc(khoi.den.ngang, khoi.den.cao);
    tay.style.left = `${50 + x * 50}%`;
    tay.style.top = `${50 + y * 50}%`;
    ta.textContent = taDen(khoi.den);
    veCau(cau, 78);
    veCau(xem, 22);
  };

  const keo = (e) => {
    const r = ban.getBoundingClientRect();
    const g = gocTuBanDen(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      ((e.clientY - r.top) / r.height) * 2 - 1,
    );
    khoi.den.ngang = Math.round(g.ngang);
    khoi.den.cao = Math.round(g.cao);
    if (dat) veTai(dat, khoi, t);
    capNhat();
  };

  /* `setPointerCapture` để kéo ra ngoài mặt tròn vẫn theo tay — không bắt được
     thì buông chuột ngoài vùng là cái đèn đứng lại giữa chừng, và người kéo
     tưởng nó kẹt. Dùng pointer nên chạm tay trên máy bảng cũng kéo được. */
  ban.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ban.setPointerCapture(e.pointerId);
    keo(e);
  });
  ban.addEventListener('pointermove', (e) => {
    if (ban.hasPointerCapture(e.pointerId)) keo(e);
  });

  nut.onclick = () => { boc.classList.toggle('mo'); capNhat(); };
  boc.addEventListener('keydown', (e) => { if (e.key === 'Escape') boc.classList.remove('mo'); });

  capNhat();
  return boc;
}

/* Bấm ra ngoài thì đóng bảng đèn. Gắn MỘT lần ở đây chứ không gắn trong
   `nutDen()`: bảng vặn dựng lại mỗi lần đổi loại khối, gắn trong ấy là mỗi lần
   dựng lại thêm một tai nghe nữa, và chúng không bao giờ được gỡ. */
document.addEventListener('pointerdown', (e) => {
  for (const b of document.querySelectorAll('.den-boc.mo')) {
    if (!b.contains(e.target)) b.classList.remove('mo');
  }
}, true);

function dungBang() {
  bang.textContent = '';
  const nhac = el('div'); nhac.id = 'nhac'; bang.appendChild(nhac);

  /* ① loại khối */
  const m1 = el('div', 'muc'); m1.appendChild(el('h2', null, 'Loại khối'));
  const luoi = el('div', 'the-loai');
  for (const l of KHO_LOAI) {
    const b = el('button');
    b.appendChild(document.createTextNode(l.ten));
    b.appendChild(el('small', null, l.mo));
    b.setAttribute('aria-pressed', String(l.id === khoi.loai));
    b.onclick = () => { khoi = khoiMoi(l.id, khoi.mauId); t = 0; dungBang(); lamLai(); capNhatTua(); };
    luoi.appendChild(b);
  }
  m1.appendChild(luoi); bang.appendChild(m1);

  /* ② hình dạng */
  const m2 = el('div', 'muc'); m2.appendChild(el('h2', null, 'Hình dạng'));
  for (const [khoa, nhan, min, max, buoc] of NUM_THEO_LOAI[khoi.loai] || []) {
    if (khoa === 'cotChu') {
      /* Người dùng gõ "38, 56, 74, 100". Lọc lấy số và BỎ QUA ô rỗng giữa chừng
         — đang gõ dở "38, " mà đã dựng lại thì cột cuối nhấp nháy mất hiện. */
      m2.appendChild(oChu(nhan, (khoi.cot || []).join(', '), (v) => {
        const so = v.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x));
        if (so.length) { khoi.cot = so.slice(0, 12); lamLai(); }
      }));
    } else if (khoa === 'nhanChu') {
      m2.appendChild(oChu(nhan, (khoi.nhan || []).join(', '), (v) => {
        khoi.nhan = v.split(',').map((x) => x.trim()); lamLai();
      }));
    } else if (min == null) {
      m2.appendChild(oChu(nhan, khoi[khoa], (v) => { khoi[khoa] = v; lamLai(); }));
    } else if (khoa === 'canh') {
      m2.appendChild(oTruot(nhan, khoi.rong, min, max, buoc, (v) => {
        khoi.rong = khoi.cao = khoi.day = v; lamLai();
      }));
    } else {
      m2.appendChild(oTruot(nhan, khoi[khoa], min, max, buoc, (v) => { khoi[khoa] = v; lamLai(); }));
    }
  }
  bang.appendChild(m2);

  /* ③ màu — lấy thẳng bộ phối của trình sửa clip, không pha bảng màu thứ hai */
  const m3 = el('div', 'muc'); m3.appendChild(el('h2', null, 'Màu'));
  const day = el('div', 'mau-day');
  for (const b of BO_PHOI) {
    const n = el('button');
    n.style.background = b.mau.accent;
    n.title = `${b.ten} — ${b.moTa}`;
    n.setAttribute('aria-pressed', String(b.id === khoi.mauId));
    n.onclick = () => { khoi.mauId = b.id; khoi.mau = b.mau.accent; dungBang(); veTai(dat, khoi, t); };
    day.appendChild(n);
  }
  m3.appendChild(day);
  bang.appendChild(m3);

  /* ④ đèn — cầm đèn kéo, không vặn số */
  const m4 = el('div', 'muc'); m4.appendChild(el('h2', null, 'Đèn'));
  m4.appendChild(nutDen());
  m4.appendChild(oTruot('Mặt khuất sáng cỡ nào', Math.round(khoi.den.nen * 100), 5, 90, 1,
    (v) => { khoi.den.nen = v / 100; veTai(dat, khoi, t); }, 'kéo về 5 thì mặt khuất đen kịt'));
  bang.appendChild(m4);

  /* ⑤ góc đặt + chuyển động */
  const m5 = el('div', 'muc'); m5.appendChild(el('h2', null, 'Góc đặt và chuyển động'));
  m5.appendChild(oTruot('Xoay ngang', khoi.xoayNgang, -180, 180, 1,
    (v) => { khoi.xoayNgang = v; veTai(dat, khoi, t); }));
  m5.appendChild(oTruot('Ngả trước / sau', khoi.xoayDoc, -80, 80, 1,
    (v) => { khoi.xoayDoc = v; veTai(dat, khoi, t); }));

  const oD = el('div', 'o'); oD.style.display = 'block';
  oD.appendChild(el('label', null, 'Chuyển động'));
  const sel = document.createElement('select');
  for (const d of KHO_DONG) {
    const op = document.createElement('option');
    op.value = d.id; op.textContent = `${d.ten} — ${d.goi}`;
    op.selected = d.id === khoi.dong.kieu;
    sel.appendChild(op);
  }
  sel.onchange = () => { khoi.dong.kieu = sel.value; t = 0; capNhatTua(); veTai(dat, khoi, t); };
  sel.style.marginTop = '6px';
  oD.appendChild(sel);
  m5.appendChild(oD);
  m5.appendChild(oTruot('Một vòng mất mấy giây', khoi.dong.chuKy, 1, 24, 0.5,
    (v) => { khoi.dong.chuKy = v; capNhatTua(); veTai(dat, khoi, t); }));
  bang.appendChild(m5);

  /* ⑥ mang đi chỗ khác */
  const m6 = el('div', 'muc'); m6.appendChild(el('h2', null, 'Mang đi'));
  const chep = el('button', 'chep', 'Chép mã khối');
  chep.onclick = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(khoi, null, 2));
      chep.textContent = 'Đã chép ✓';
    } catch { chep.textContent = 'Trình duyệt không cho chép — mở bảng điều khiển mà lấy'; }
    setTimeout(() => { chep.textContent = 'Chép mã khối'; }, 2200);
  };
  m6.appendChild(chep);
  m6.appendChild(el('div', 'ghi',
    'Xưởng này còn đứng riêng, chưa nối vào trình sửa clip. Mã chép ra để dành cho '
    + 'Giai đoạn 2 — xem docs/LO-TRINH-3D.md.'));
  bang.appendChild(m6);
}

/* ---------------------------------------------------------------------------
 * Chạy
 * ------------------------------------------------------------------------- */
dungBang();
xepSan();
lamLai();
capNhatTua();
addEventListener('resize', xepSan);

/* Để bài kiểm và bảng điều khiển của trình duyệt soi được — cùng kiểu cửa mà
   bộ dựng clip mở ra qua `window.__clip`. */
window.__bachieu = {
  get khoi() { return khoi; },
  dat: () => dat,
  seek: (s) => { t = s; veTai(dat, khoi, t); capNhatTua(); },
  boCuc: () => boCuc(khoi),
  beRongChiem: () => beRongChiem(khoi),
};
