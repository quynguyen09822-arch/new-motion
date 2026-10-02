/**
 * TRÌNH DỰNG CẢNH 3D.
 *
 * VÌ SAO VIẾT LẠI. Bản đầu nhốt mọi thứ trong khung phim 9:16 và mỗi lần chỉ
 * dựng được MỘT khối. Anh Quý nói rõ không muốn thế: muốn nó như Blender, dựng
 * nhanh được cảnh cho ra dáng chuyên nghiệp. Nên khung phim bỏ hẳn, đơn vị làm
 * việc đổi từ KHỐI sang CẢNH, và máy quay tách khỏi vật.
 *
 * CÂU CHỮ VẪN LÀ VIỆC CHÍNH. `CLAUDE.md` §8: không để lọt từ kỹ thuật ra chỗ
 * người dùng đọc. Blender gọi là *viewport, outliner, transform, FOV* — không
 * từ nào trong số đó được xuất hiện ở đây.
 */
import { KHO_LOAI, BO_PHOI, boCuc } from './khoi.js';
import { gocTuBanDen, banDenTuGoc, taDen, mauTheoSang, keoTrenSan, keoTheoCao,
  DEN_MAC_DINH } from './hinhhoc.js';
import { dungCanh, veCanhTai } from './ve.js';
import { canhMoi, themMon, nhanBan, xoaMon, thuPhongVua, soatCanh, soMatMon,
  datTen, timMon, khungMon } from './canh.js';
import { goiJSON } from '../web/goi.js';

const Q = (s) => document.querySelector(s);
const san = Q('#san'), oCanh = Q('#canh3d'), bang = Q('#bang'), dsEl = Q('#ds-mon');

let canh = canhMoi('hop');
let chonId = canh.mon[0].id;
let dat = null;

const monChon = () => canh.mon.find((m) => m.id === chonId) || null;
const kep = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------------------------------------------------------------------
 * VẼ
 * ------------------------------------------------------------------------- */

/** Dựng lại toàn bộ thẻ. Chỉ gọi khi cảnh ĐỔI HÌNH (thêm/xoá/đổi kích thước). */
function lamLai() {
  dat = dungCanh(oCanh, canh);
  veLai();
  veDanhSach();
  veBang();
}

/**
 * Dựng lại HÌNH nhưng GIỮ NGUYÊN bảng vặn.
 *
 * VÌ SAO CÓ HÀM NÀY. Vặn một núm hình dạng thì phải dựng lại khối — nhưng
 * `lamLai()` dựng lại cả bảng vặn, nghĩa là đập chính cái núm đang cầm đi rồi
 * tạo lại cái mới. Hậu quả: kéo thanh trượt được một nhịp là đứt tay, gõ chữ
 * được một ký tự là rớt con trỏ.
 *
 * Trước đó chỗ này được vá bằng cách NHỚ ô đang gõ rồi trả con trỏ về sau khi
 * dựng lại. Vá ấy chữa được ô gõ chữ, nhưng thanh trượt vẫn đứt: con trỏ rơi
 * về `body` ngay từ cú bấm xuống, trước cả lúc có gì để nhớ. Đo được bằng
 * chuột thật.
 *
 * Nên chữa đúng gốc: ĐỪNG ĐẬP BẢNG. Bảng chỉ cần dựng lại khi đổi món đang
 * chọn hoặc đổi danh sách — vặn núm thì không. Thứ duy nhất trong bảng đổi
 * theo hình dạng là con số đếm mảnh và lời nhắc nặng, nên cập nhật riêng hai
 * thứ đó tại chỗ.
 */
function lamLaiHinh() {
  dat = dungCanh(oCanh, canh);
  veLai();
  veDanhSach();
  capNhatDem();
}

/** Vẽ lại thôi — đổi máy quay, màu, đèn thì không cần dựng lại thẻ. */
function veLai() {
  if (!dat) return;
  veCanhTai(dat, canh);
  for (const d of dat.monDS) d.cho.classList.toggle('chon', d.id === chonId);
  const c = canh.may;
  Q('#goc-may').textContent =
    `máy quay ${Math.round(((c.ngang % 360) + 360) % 360)}° · ${Math.round(c.doc)}° · `
    + `phóng ${Math.round(c.ti * 100)}%`;
  veNam();
}

/* ---------------------------------------------------------------------------
 * KHUNG CHỌN VÀ NÚM NẮM
 *
 * Viền xanh mảnh vẽ trên từng mặt phẳng không đủ: quả cầu MƯỢT vẽ bằng một thẻ
 * tròn tô chuyển sắc, nó không có `.bc-mat` nào để mà viền — nên chọn con linh
 * vật xong gần như KHÔNG THẤY gì đổi. Thêm nữa, 60 mảnh rời thì giữa chúng là
 * khe, và bấm vào khe là trúng nền.
 *
 * Khung phẳng này trả lời cả hai: nhìn là biết đang cầm món nào, và cái núm
 * giữa khung thì lúc nào cũng bấm trúng, dù món nhỏ cỡ nào hay thủng chỗ nào.
 * ------------------------------------------------------------------------- */

const oNam = Q('#nam'), oKhungNam = Q('#khung-nam'), oNumNam = Q('#num-nam');

function veNam() {
  const m = canh.mon.find((x) => x.id === chonId);
  if (!m || m.an) { oNam.hidden = true; return; }
  oNam.hidden = false;
  const cx = san.clientWidth / 2, cy = san.clientHeight / 2;
  const k = khungMon(m, boCuc, canh.may);
  /* Chặn sàn 22px: món bé xíu hoặc thu phóng nhỏ hết cỡ thì khung co lại thành
     một chấm, và lúc ấy nó chẳng chỉ ra được gì nữa. */
  const w = Math.max(22, k.rong), h = Math.max(22, k.cao);
  oKhungNam.style.transform =
    `translate(${(cx + (k.tr + k.pha) / 2 - w / 2).toFixed(1)}px, `
    + `${(cy + (k.tren + k.duoi) / 2 - h / 2).toFixed(1)}px)`;
  oKhungNam.style.width = w.toFixed(1) + 'px';
  oKhungNam.style.height = h.toFixed(1) + 'px';
  /* Núm đặt ở GIỮA KHUNG, không ở gốc toạ độ của món: gốc của nhiều món nằm
     lệch hẳn khỏi phần nhìn thấy, và một cái núm nằm ngoài hình thì người dùng
     không đoán được nó thuộc về cái gì. */
  oNumNam.style.transform =
    `translate(${(cx + k.u).toFixed(1)}px, ${(cy + k.v).toFixed(1)}px) translate(-50%, -50%)`;
}

/** Con trỏ đang ở đâu, tính từ TÂM khung nhìn — đúng hệ mà `chieuDiem` trả về. */
function toaDoSan(e) {
  const r = san.getBoundingClientRect();
  return { u: e.clientX - (r.left + r.width / 2), v: e.clientY - (r.top + r.height / 2) };
}

/* ---------------------------------------------------------------------------
 * KHUNG NHÌN — kéo để xoay máy, lăn để phóng, bấm để chọn
 * ------------------------------------------------------------------------- */

let keo = null;
/* Ô số chỗ đứng, giữ lại để cập nhật NGAY trong lúc kéo. Không cập nhật thì
   con số đứng im trong khi vật chạy, và người dùng không tin con số nữa. */
let oSoViTri = null;

/* Chuột PHẢI không được bật thực đơn của trình duyệt trong khung nhìn — nó là
   đường xoay máy khi cả khung đã kín vật, không còn chỗ nền nào mà bấm. */
san.addEventListener('contextmenu', (e) => e.preventDefault());

san.addEventListener('pointerdown', (e) => {
  /* ĐƯỜNG THOÁT. Khung bắt rộng hơn hình, nên cảnh đông vật thì chỗ nền trống
     có thể hết sạch — lúc ấy không còn cách nào xoay máy nữa. Chuột phải, chuột
     giữa, hoặc giữ Alt thì LUÔN LUÔN là xoay máy, bất kể dưới ngón tay là gì. */
  const epXoay = e.button === 1 || e.button === 2 || e.altKey;

  let m = null;
  if (!epXoay) {
    /* ① Núm nắm của món đang chọn — bấm là trúng, không phải nhắm. */
    if (e.target.closest?.('#num-nam')) {
      m = canh.mon.find((x) => x.id === chonId) || null;
    }
    /* ② Thẻ thật nằm dưới ngón tay. Chính xác tới từng pixel, nên xét trước. */
    if (!m) {
      const o = e.target.closest?.('[data-mon]');
      m = o ? canh.mon.find((x) => x.id === o.dataset.mon) : null;
    }
    /* ③ Hụt thẻ thì hỏi KHUNG BẮT. Đây là chỗ chữa đúng lời than "nhiều lúc
       không chọn trúng cái nhân vật": linh vật gồm 60 mảnh rời, bấm vào khe
       giữa hai mảnh là trúng nền và xưởng tưởng người dùng muốn xoay máy. */
    if (!m) {
      const t = toaDoSan(e);
      const id = timMon(t.u, t.v, canh, boCuc);
      m = id ? canh.mon.find((x) => x.id === id) : null;
    }
  }

  if (m && m.id !== chonId) chon(m.id);
  keo = {
    /* Bấm trúng vật → DỜI VẬT. Bấm vào nền → XOAY MÁY. Đây là quy ước dễ đoán
       nhất: thứ nằm dưới ngón tay là thứ sẽ nhúc nhích. */
    kieu: m ? 'mon' : 'may',
    id: m?.id || null,
    x: e.clientX, y: e.clientY, xa: 0,
    ng: canh.may.ngang, dc: canh.may.doc,
    vi: m ? { ...m.vi } : null,
    nangHa: e.shiftKey,
  };
  san.setPointerCapture(e.pointerId);
  san.classList.add('dangkeo');
});

san.addEventListener('pointermove', (e) => {
  if (!keo) return;
  const dx = e.clientX - keo.x, dy = e.clientY - keo.y;
  keo.xa = Math.max(keo.xa, Math.hypot(dx, dy));

  if (keo.kieu === 'mon') {
    const m = canh.mon.find((x) => x.id === keo.id);
    if (!m) return;
    if (keo.nangHa) {
      m.vi = { ...keo.vi, y: Math.round(keo.vi.y + keoTheoCao(dy, canh.may)) };
    } else {
      const d = keoTrenSan(dx, dy, canh.may);
      m.vi = { x: Math.round(keo.vi.x + d.x), y: keo.vi.y, z: Math.round(keo.vi.z + d.z) };
    }
    veLai();
    if (oSoViTri) for (const [k, i] of Object.entries(oSoViTri)) i.value = Math.round(m.vi[k]);
    return;
  }

  canh.may.ngang = keo.ng + dx * 0.42;
  /* Chặn ở ±85°, không cho qua đỉnh. Qua được thì cảnh lộn ngược và kéo tiếp
     thấy nó đi ngược chiều tay — ai cũng tưởng hỏng. */
  canh.may.doc = kep(keo.dc - dy * 0.42, -85, 85);
  veLai();
});

const thaKeo = (e) => {
  if (!keo) return;
  keo = null;
  san.classList.remove('dangkeo');
  san.releasePointerCapture?.(e.pointerId);
};
san.addEventListener('pointerup', thaKeo);
san.addEventListener('pointercancel', thaKeo);

san.addEventListener('wheel', (e) => {
  e.preventDefault();
  canh.may.ti = kep(canh.may.ti * (e.deltaY > 0 ? 0.9 : 1 / 0.9), 0.05, 4);
  veLai();
}, { passive: false });

function vuaKhung() {
  const r = san.getBoundingClientRect();
  const v = thuPhongVua(canh, r.width, r.height);
  Object.assign(canh.may, v);
  veLai();
}
Q('#vua-khung').onclick = vuaKhung;

/* ---------------------------------------------------------------------------
 * THÊM MÓN
 * ------------------------------------------------------------------------- */

const selLoai = Q('#chon-loai');
for (const l of KHO_LOAI) {
  const o = document.createElement('option');
  o.value = l.id; o.textContent = l.ten;
  selLoai.appendChild(o);
}
Q('#them').onclick = () => {
  const m = themMon(canh, selLoai.value);
  chonId = m.id;
  lamLai();
  vuaKhung();
};

/* ---------------------------------------------------------------------------
 * AI BÀY SẴN BỐI CẢNH TỪ MỘT ẢNH MẪU
 *
 * Nói đúng tên để khỏi kỳ vọng sai: nó KHÔNG vẽ lại cái ảnh. Gemini không sinh
 * được hình ba chiều — nó chọn trong kho khối có sẵn rồi xếp đặt. Nhận lại là
 * một BẢN PHÁC: góc máy, hướng đèn, bảng màu, vật nào đứng đâu. Chỉnh tay tiếp.
 *
 * Mượn `web/goi.js` để dịch câu báo lỗi. KHÔNG chép lại phần dịch ấy sang đây:
 * nó đã biết cổng proxy trả trang 504 lúc việc chạy quá lâu — mà việc này chạy
 * tới hai phút nên đúng là ca dễ gặp nhất. Chép lại là hai nơi dịch hai kiểu.
 * ------------------------------------------------------------------------- */

const tepAnh = Q('#tep-anh');
const oBay = Q('#dang-bay');
let dangBay = false;

Q('#tu-anh').onclick = () => { if (!dangBay) tepAnh.click(); };

tepAnh.onchange = async () => {
  const f = tepAnh.files?.[0];
  tepAnh.value = '';                     // chọn lại ĐÚNG tệp cũ vẫn phải nổ sự kiện
  if (!f || dangBay) return;

  const dan = prompt('Muốn dặn thêm gì cho AI không? (để trống cũng được)\n'
    + 'Ví dụ: "chỉ lấy phần bàn làm việc", "bỏ qua người".') ?? '';

  dangBay = true;
  oBay.hidden = false;
  Q('#dang-bay-chu').textContent = 'Đang nhìn ảnh…';
  const moc = Date.now();
  /* Đếm giây để người dùng biết nó CÒN SỐNG. Thiếu cái này thì sau 40 giây im
     lặng ai cũng tưởng treo, rồi bấm lại — mỗi lần bấm tốn một lượt AI. */
  const dem = () => {
    const g = Math.round((Date.now() - moc) / 1000);
    Q('#dang-bay-giay').textContent = `${g} giây — việc này mất tới hai phút`;
  };
  dem();                       // hiện NGAY, đừng để nửa giây đầu trống trơn
  const dong = setInterval(dem, 500);

  try {
    const anh = await new Promise((ok, hu) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(',')[1]);
      r.onerror = () => hu(new Error('Không đọc được tệp ảnh này.'));
      r.readAsDataURL(f);
    });
    const d = await goiJSON('/api/bay-3d', {
      cach: 'POST', than: { anh, mime: f.type || 'image/png', dan },
    });

    /* Đặt lại tên cho khỏi trùng: AI đặt tên theo thứ nó thấy, hai cái bàn thì
       ra hai dòng "Bàn" y hệt trong danh sách và không ai biết dòng nào là cái
       nào. */
    const da = [];
    d.canh.mon = d.canh.mon.map((m) => { const x = datTen(m, da); da.push(x); return x; });

    canh = d.canh;
    chonId = canh.mon[0]?.id || null;
    lamLai();
    vuaKhung();
    const n = canh.mon.length;
    Q('#chi-dan').textContent = `AI bày ${n} món từ ảnh`
      + (d.daSua ? ' (đã tự sửa một lượt)' : '')
      + ' · kéo vật để chỉnh lại';
  } catch (e) {
    alert(e.message || 'Không bày được bối cảnh từ ảnh này.');
  } finally {
    clearInterval(dong);
    oBay.hidden = true;
    dangBay = false;
  }
};

function chon(id) { chonId = id; veLai(); veDanhSach(); veBang(); }

/* ---------------------------------------------------------------------------
 * DANH SÁCH MÓN
 * ------------------------------------------------------------------------- */

const el = (tag, lop, trong) => {
  const n = document.createElement(tag);
  if (lop) n.className = lop;
  if (trong != null) n.textContent = trong;
  return n;
};

function veDanhSach() {
  dsEl.textContent = '';
  for (const m of canh.mon) {
    const h = el('div', 'mon-hang');
    h.setAttribute('aria-selected', String(m.id === chonId));
    const cham = el('span', 'cham'); cham.style.background = m.mau;
    const ten = el('span', 'ten', m.ten);
    h.append(cham, ten);

    const an = el('button', null, m.an ? 'hiện' : 'ẩn');
    an.title = m.an ? 'Cho hiện lại' : 'Tạm ẩn, không xoá';
    an.onclick = (e) => { e.stopPropagation(); m.an = !m.an; lamLai(); };

    const ban = el('button', null, 'nhân đôi');
    ban.onclick = (e) => { e.stopPropagation(); const x = nhanBan(canh, m.id); if (x) chonId = x.id; lamLai(); };

    const xoa = el('button', null, '✕');
    xoa.title = 'Bỏ khỏi cảnh';
    xoa.onclick = (e) => {
      e.stopPropagation();
      /* Cảnh rỗng thì khung nhìn trống trơn và người dùng tưởng app hỏng. Giữ
         lại ít nhất một món. */
      if (canh.mon.length <= 1) return;
      xoaMon(canh, m.id);
      if (chonId === m.id) chonId = canh.mon[0].id;
      lamLai();
    };

    h.append(an, ban, xoa);
    h.onclick = () => chon(m.id);
    dsEl.appendChild(h);
  }
}

/* ---------------------------------------------------------------------------
 * BẢNG VẶN
 * ------------------------------------------------------------------------- */

/** Núm hình dạng theo từng loại. */
const NUM_THEO_LOAI = {
  hop: [['rong', 'Bề ngang', 60, 900, 10], ['cao', 'Bề cao', 60, 900, 10],
    ['day', 'Bề dày', 10, 900, 10], ['chu', 'Chữ trên mặt trước', null]],
  'the-lat': [['rong', 'Bề ngang', 80, 900, 10], ['cao', 'Bề cao', 60, 700, 10],
    ['chu', 'Chữ mặt trước', null], ['chuSau', 'Chữ mặt sau', null]],
  'chu-noi': [['chu', 'Chữ', null], ['coChu', 'Cỡ chữ', 24, 220, 2],
    ['day', 'Bề dày chữ', 4, 120, 2], ['soLop', 'Độ mịn của bề dày', 3, 40, 1]],
  'gia-may-chu': [['tang', 'Số tầng', 1, 12, 1], ['rong', 'Bề ngang mỗi tầng', 80, 700, 10],
    ['cao', 'Bề cao mỗi tầng', 16, 160, 2], ['day', 'Bề sâu', 40, 500, 10],
    ['khe', 'Khe hở giữa các tầng', 0, 60, 2]],
  'logo-khoi': [['chu', 'Dấu hiệu', null], ['canh', 'Cạnh khối', 60, 700, 10],
    ['coChu', 'Cỡ dấu hiệu', 20, 220, 2]],
  tru: [['ban', 'Bề ngang (nửa)', 30, 400, 5], ['cao', 'Bề cao', 20, 700, 10],
    ['soMat', 'Độ mịn đường tròn', 3, 48, 1]],
  'bieu-do': [['cotChu', 'Các cột (số, cách nhau bằng dấu phẩy)', null],
    ['nhanChu', 'Tên dưới mỗi cột', null], ['rongCot', 'Bề ngang mỗi cột', 20, 200, 2],
    ['caoMax', 'Bề cao cột lớn nhất', 60, 600, 10], ['day', 'Bề sâu', 10, 300, 5],
    ['khe', 'Khe hở giữa các cột', 0, 120, 2]],
  'nhan-vat': [['co', 'Độ lớn', 0.3, 2, 0.05]],
};

/**
 * KHOÁ TỰ SINH TỪ NHÃN khi chỗ gọi không khai.
 *
 * Bảng vặn dựng lại mỗi lần cảnh đổi hình, nên mọi ô phải có khoá để tìm lại
 * và trả con trỏ về đúng chỗ. Bắt chỗ gọi tự khai thì sớm muộn có người quên —
 * và đã quên thật: núm "Bo góc" thiếu khoá, kéo nó là con trỏ rơi về `body`,
 * thanh kéo đứt giữa chừng. Lỗi ấy không nổ, không báo, chỉ khó chịu.
 *
 * Sinh từ nhãn thì KHÔNG THỂ quên: nhãn nào cũng có, và trong một bảng thì
 * nhãn không trùng nhau.
 */
const khoaTuNhan = (nhan) => 'n-' + String(nhan).trim().toLowerCase().replace(/\s+/g, '-');

function oTruot(nhan, gtri, min, max, buoc, khiDoi, goi, khoa = khoaTuNhan(nhan)) {
  const o = el('div', 'o');
  const trai = el('div');
  trai.appendChild(el('label', null, nhan));
  if (goi) trai.appendChild(el('small', 'goi', goi));
  const i = document.createElement('input');
  Object.assign(i, { type: 'range', min, max, step: buoc, value: gtri });
  i.dataset.khoa = khoa;
  const so = el('span', 'giay', String(gtri));
  i.oninput = () => { so.textContent = i.value; khiDoi(Number(i.value)); };
  const phai = el('div');
  phai.style.cssText = 'display:flex;align-items:center;gap:8px';
  phai.append(i, so);
  o.append(trai, phai);
  return o;
}

function oChu(nhan, gtri, khiDoi, khoa = khoaTuNhan(nhan)) {
  const o = el('div', 'o');
  o.appendChild(el('label', null, nhan));
  const i = document.createElement('input');
  Object.assign(i, { type: 'text', value: gtri ?? '' });
  i.dataset.khoa = khoa;
  i.style.width = '130px';
  i.oninput = () => khiDoi(i.value);
  o.appendChild(i);
  return o;
}

/** Ba ô số cho chỗ đứng. Dùng số chứ không dùng thanh kéo: đặt món vào đúng
 *  chỗ là việc cần CON SỐ, kéo mò thì không bao giờ thẳng hàng. */
function oViTri(m) {
  const b = el('div');
  const l = el('div', 'ba-o');
  const ghi = {};
  for (const [khoa, ten] of [['x', 'ngang'], ['y', 'cao'], ['z', 'sâu']]) {
    const c = el('div');
    c.appendChild(el('span', null, ten));
    const i = document.createElement('input');
    Object.assign(i, { type: 'number', step: 10, value: Math.round(m.vi[khoa]) });
    i.dataset.khoa = 'vi-' + khoa;
    i.oninput = () => { m.vi[khoa] = Number(i.value) || 0; veLai(); };
    ghi[khoa] = i;
    c.appendChild(i);
    l.appendChild(c);
  }
  oSoViTri = ghi;
  b.appendChild(l);
  return b;
}

function veBang() {
  const activeEl = document.activeElement;
  const activeKhoa = activeEl?.dataset?.khoa;
  const selStart = typeof activeEl?.selectionStart === 'number' ? activeEl.selectionStart : null;
  const selEnd = typeof activeEl?.selectionEnd === 'number' ? activeEl.selectionEnd : null;

  bang.textContent = '';
  const m = monChon();

  /* --- nhắc về độ nặng của cảnh --- */
  const n = el('div');
  n.id = 'nhac-nang';
  n.style.cssText = 'font-size:12px;line-height:1.5;color:#ffd0a8;'
    + 'background:rgba(255,122,47,.09);border:1px solid rgba(255,122,47,.3);'
    + 'border-radius:9px;padding:9px 11px;margin-bottom:14px';
  bang.appendChild(n);

  if (m) {
    /* ① chỗ đứng */
    const m1 = el('div', 'muc'); m1.appendChild(el('h2', null, `Chỗ đứng — ${m.ten}`));
    m1.appendChild(oViTri(m));
    bang.appendChild(m1);

    /* ② đặt dáng — một con số đứng yên, KHÔNG phải chuyển động theo thời gian */
    const m2 = el('div', 'muc'); m2.appendChild(el('h2', null, 'Đặt dáng'));
    m2.appendChild(oTruot('Xoay ngang', m.xoayNgang, -180, 180, 1,
      (v) => { m.xoayNgang = v; veLai(); }));
    m2.appendChild(oTruot('Ngả trước / sau', m.xoayDoc, -80, 80, 1,
      (v) => { m.xoayDoc = v; veLai(); }));
    m2.appendChild(oTruot('Nghiêng (bóp méo)', m.nghieng ?? 0, -45, 45, 1,
      (v) => { m.nghieng = v; veLai(); }, 'xô lệch cả khối như xô một chồng sách'));
    m2.appendChild(oTruot('Bo góc', m.bo ?? 0, 0, 100, 1,
      (v) => { m.bo = v; lamLaiHinh(); },
      '0 là góc vuông, 100 là bo hết mức còn nhìn đặc — không ăn vào món tròn'));
    bang.appendChild(m2);

    /* ③ hình dạng */
    const m3 = el('div', 'muc'); m3.appendChild(el('h2', null, 'Hình dạng'));
    for (const [khoa, nhan, min, max, buoc] of NUM_THEO_LOAI[m.loai] || []) {
      if (khoa === 'cotChu') {
        m3.appendChild(oChu(nhan, (m.cot || []).join(', '), (v) => {
          const so = v.split(',').map((x) => Number(x.trim())).filter(Number.isFinite);
          if (so.length) { m.cot = so.slice(0, 12); lamLaiHinh(); }
        }, 'cotChu'));
      } else if (khoa === 'nhanChu') {
        m3.appendChild(oChu(nhan, (m.nhan || []).join(', '),
          (v) => { m.nhan = v.split(',').map((x) => x.trim()); lamLaiHinh(); }, 'nhanChu'));
      } else if (min == null) {
        m3.appendChild(oChu(nhan, m[khoa], (v) => { m[khoa] = v; lamLaiHinh(); }, khoa));
      } else if (khoa === 'canh') {
        m3.appendChild(oTruot(nhan, m.rong, min, max, buoc,
          (v) => { m.rong = m.cao = m.day = v; lamLaiHinh(); }, null, 'canh'));
      } else {
        m3.appendChild(oTruot(nhan, m[khoa], min, max, buoc,
          (v) => { m[khoa] = v; lamLaiHinh(); }, null, khoa));
      }
    }
    bang.appendChild(m3);

    /* ④ màu */
    const m4 = el('div', 'muc'); m4.appendChild(el('h2', null, 'Màu'));
    const day = el('div', 'mau-day');
    for (const b of BO_PHOI) {
      const n = el('button');
      n.style.background = b.mau.accent;
      n.title = `${b.ten} — ${b.moTa}`;
      n.setAttribute('aria-pressed', String(b.id === m.mauId));
      n.onclick = () => { m.mauId = b.id; m.mau = b.mau.accent; veDanhSach(); veBang(); veLai(); };
      day.appendChild(n);
    }
    m4.appendChild(day);
    bang.appendChild(m4);
  } else {
    bang.appendChild(el('p', 'trong', 'Chưa chọn món nào. Bấm vào một món trong cảnh hoặc trong danh sách.'));
  }

  /* ⑤ cả cảnh */
  const m5 = el('div', 'muc'); m5.appendChild(el('h2', null, 'Cả cảnh'));
  m5.appendChild(nutDen());
  m5.appendChild(oTruot('Mặt khuất sáng cỡ nào', Math.round((canh.den.nen ?? 0.42) * 100), 5, 95, 1,
    (v) => { canh.den.nen = v / 100; veLai(); }, 'kéo về 5 thì mặt khuất đen kịt', 'nenSang'));
  m5.appendChild(oTruot('Độ mở ống kính', canh.may.xa, 700, 6000, 50,
    (v) => { canh.may.xa = v; veLai(); },
    'số nhỏ thì phối cảnh mạnh, vật gần phình to', 'mayXa'));
  const dem = el('p', 'trong');
  dem.id = 'dem-manh';
  m5.appendChild(dem);
  bang.appendChild(m5);
  capNhatDem();

  if (activeKhoa) {
    const elToFocus = bang.querySelector(`[data-khoa="${CSS.escape(activeKhoa)}"]`);
    if (elToFocus) {
      elToFocus.focus();
      if (selStart !== null && selEnd !== null && elToFocus.setSelectionRange) {
        try { elToFocus.setSelectionRange(selStart, selEnd); } catch (_) {}
      }
    }
  }
}

/** Cập nhật con số và lời nhắc TẠI CHỖ — không đập bảng. */
function capNhatDem() {
  const hien = canh.mon.filter((x) => !x.an);
  const mat = hien.reduce((s, x) => s + soMatMon(x, boCuc), 0);
  const d = document.getElementById('dem-manh');
  if (d) d.textContent = `${hien.length} món · ${mat.toLocaleString('vi')} mảnh`;
  const n = document.getElementById('nhac-nang');
  if (n) {
    const nhac = soatCanh(canh, boCuc);
    n.textContent = nhac[0] || '';
    n.style.display = nhac.length ? '' : 'none';
  }
}

/* ---------------------------------------------------------------------------
 * BÀN ĐÈN — đèn của CẢ CẢNH
 * ------------------------------------------------------------------------- */

function nutDen() {
  const boc = el('div', 'den-boc');
  const nut = el('button', 'den-nut'); nut.type = 'button';
  const xem = el('span', 'den-xem'), ta = el('span', 'den-ta');
  nut.append(xem, ta);

  const bg = el('div', 'den-bang');
  const ban = el('div', 'den-ban'), cau = el('div', 'den-cau');
  const tay = el('button', 'den-tay'); tay.type = 'button';
  tay.setAttribute('aria-label', 'Cái đèn — kéo để đổi chỗ chiếu');
  ban.append(cau, tay);
  bg.append(ban, el('div', 'den-ghi', 'Cầm cái đèn kéo tới chỗ muốn nó chiếu từ đó.'));
  boc.append(nut, bg);

  const veCau = (o, co) => {
    const { x, y } = banDenTuGoc(canh.den.ngang, canh.den.cao);
    const mau = monChon()?.mau || '#FF7A2F';
    const nen = canh.den.nen ?? DEN_MAC_DINH.nen;
    /* Bán kính tính bằng PX, không bằng phần trăm: `circle 115%` là cú pháp
       SAI, trình duyệt bỏ im lặng và quả cầu biến mất sạch. Đã sập một lần. */
    o.style.background = `radial-gradient(circle ${co}px at ${50 + x * 46}% ${50 + y * 46}%, `
      + `${mauTheoSang(mau, 1)} 0%, ${mauTheoSang(mau, (1 + nen) / 2)} 34%, `
      + `${mauTheoSang(mau, nen)} 78%)`;
  };
  const capNhat = () => {
    const { x, y } = banDenTuGoc(canh.den.ngang, canh.den.cao);
    tay.style.left = `${50 + x * 50}%`;
    tay.style.top = `${50 + y * 50}%`;
    ta.textContent = taDen(canh.den);
    veCau(cau, 74); veCau(xem, 21);
  };
  const keoDen = (e) => {
    const r = ban.getBoundingClientRect();
    const g = gocTuBanDen(((e.clientX - r.left) / r.width) * 2 - 1,
      ((e.clientY - r.top) / r.height) * 2 - 1);
    canh.den.ngang = Math.round(g.ngang);
    canh.den.cao = Math.round(g.cao);
    veLai(); capNhat();
  };
  ban.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    ban.setPointerCapture(e.pointerId); keoDen(e);
  });
  ban.addEventListener('pointermove', (e) => {
    if (ban.hasPointerCapture(e.pointerId)) keoDen(e);
  });
  nut.onclick = () => { boc.classList.toggle('mo'); capNhat(); };
  boc.addEventListener('keydown', (e) => { if (e.key === 'Escape') boc.classList.remove('mo'); });
  capNhat();
  return boc;
}

/* Bấm ra ngoài thì đóng bảng đèn. Gắn MỘT lần: bảng vặn dựng lại mỗi lần chọn
   món khác, gắn bên trong là mỗi lần thêm một tai nghe không bao giờ gỡ. */
document.addEventListener('pointerdown', (e) => {
  for (const b of document.querySelectorAll('.den-boc.mo')) {
    if (!b.contains(e.target)) b.classList.remove('mo');
  }
}, true);

/* ---------------------------------------------------------------------------
 * Chạy
 * ------------------------------------------------------------------------- */
lamLai();
vuaKhung();
addEventListener('resize', vuaKhung);

/** Cửa cho bài kiểm và bảng điều khiển trình duyệt soi — cùng kiểu `window.__clip`. */
window.__bachieu = {
  get canh() { return canh; },
  get chonId() { return chonId; },
  dat: () => dat,
  chon,
  them: (loai) => { const m = themMon(canh, loai); chonId = m.id; lamLai(); return m.id; },
  vuaKhung,
  /* Dựng lại sau khi bài kiểm tự nhét cảnh vào — không có cửa này thì bài kiểm
     phải bắt chước từng bước dựng, và nó sẽ trôi khỏi bản thật lúc nào không hay. */
  lamLai,
};
