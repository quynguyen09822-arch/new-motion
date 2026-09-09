/**
 * VIDEO ĐÃ XUẤT — xem lại và tải về mọi thành phẩm trong `out/`.
 *
 * Thư mục đó là kho chung: video trình sửa này xuất ra nằm lẫn với video người
 * khác dựng bằng dòng lệnh. Trước đây chỉ thấy được đúng cái vừa xuất xong, nên
 * mọi thứ có sẵn coi như vô hình — mở tab này là thấy hết.
 */

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};
const mb = (b) => { const m = b / 1048576; return `${m >= 10 ? Math.round(m) : m.toFixed(1)} MB`; };
/* Khổ hình lấy từ số đo THẬT của ffprobe. Tên file chỉ là phương án phụ: mấy
   video cũ (cta-mat-bao, thuong-hieu…) không nhét khổ vào tên nên đọc tên là
   ra dấu hỏi, trong khi số đo thì luôn có. */
const kho = (v) => (v.rong && v.cao ? `${v.rong}×${v.cao}` : v.khoTen || '?');
const gy = (s) => (s == null ? '?' : `${Math.round(s)}s`);
/* Tự ghép ngày thay vì nhờ `toLocaleString`: nó trả về "21:55 07-09" — giờ đứng
   trước ngày, và cả cụm dài quá cột 150px nên dung lượng bị cắt cụt thành "48…".
   Chỉ giữ ngày/tháng; danh sách đã xếp mới nhất trước nên giờ không còn để làm gì. */
const ngay = (t) => {
  const d = new Date(t);
  const hai = (n) => String(n).padStart(2, '0');
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}`;
};
/* Chữ ▸ ▾ ra ô vuông tofu trên máy này (thiếu phông) — vẽ tay cho chắc. */
const NS = 'http://www.w3.org/2000/svg';
const mui = () => {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 10 10');
  s.setAttribute('aria-hidden', 'true');
  const d = document.createElementNS(NS, 'path');
  d.setAttribute('d', 'M3.5 1.5 L7 5 L3.5 8.5');
  s.appendChild(d);
  return s;
};

export function taoBangVideo({ bocGiua, bocBang, bao }) {
  let ds = [];
  let bo = [];
  let dang = null;

  const xem = el('video', 'video-xem');
  xem.controls = true;
  xem.playsInline = true;
  xem.preload = 'metadata';
  const nhan = el('p', 'video-nhan');
  const trong = el('p', 'khung-trong', 'Chọn một video ở cột bên phải để xem.');
  const nutTai = el('a', 'nut chinh', 'Tải video này về');
  const boc = el('div', 'video-boc');
  boc.append(xem, nhan, nutTai);
  boc.style.display = 'none';
  bocGiua.append(boc, trong);

  const dsBoc = el('div', 'video-ds');
  const dem = el('p', 'num-goi');
  const nutMoi = el('button', 'nut nho rong', 'Đọc lại danh sách');
  nutMoi.type = 'button';

  function chon(v) {
    dang = v;
    // `preload=metadata` chứ không tự chạy: mấy file này 35 MB, tự chạy là ngốn
    // băng thông của người ta mà chưa chắc họ muốn xem.
    xem.src = v.url;
    nhan.textContent = `${v.ten} · ${kho(v)} · ${gy(v.giay)} · ${mb(v.bytes)}`;
    nutTai.href = v.url;
    nutTai.download = v.ten;
    boc.style.display = '';
    trong.style.display = 'none';
    ve();
  }

  /* Bộ nào mở sẵn. "Thử nghiệm & bản cũ" gập lại: 16 video tháng 7-8 không còn
     dùng nữa, để mở là chúng chiếm hết màn hình và che mất việc đang làm. */
  const gap = new Set(['thu']);

  function hang(v) {
    const h = el('button', 'video-hang');
    h.type = 'button';
    if (dang?.ten === v.ten) h.classList.add('dang');

    const cot = el('span', 'video-cot');
    // Biến thể (dọc/ngang/4K/phần thân…) là thứ phân biệt các bản trong cùng một
    // chủ đề — cho nó đứng ngay hàng đầu, đừng bắt đọc tên file mà đoán.
    cot.appendChild(el('span', 'video-ten',
      v.bien ? `${kho(v)} · ${v.bien}` : kho(v)));
    cot.appendChild(el('span', 'video-phu',
      `${ngay(v.suaLuc)} · ${gy(v.giay)} · ${mb(v.bytes)}`));
    h.appendChild(cot);

    // Nhãn cho biết bản nào đã có tiếng — nhìn tên file thì phải tự dịch "-vo".
    const nh = el('span', 'video-nhan-hang');
    if (v.vo) nh.appendChild(el('span', 'the-nho tieng', 'có tiếng'));
    if (v.sfx) nh.appendChild(el('span', 'the-nho', 'SFX'));
    if (v.nhac) nh.appendChild(el('span', 'the-nho', 'nhạc'));
    if (!v.vo && !v.sfx && !v.nhac) nh.appendChild(el('span', 'the-nho cam', 'chưa tiếng'));
    h.appendChild(nh);

    h.onclick = () => chon(v);
    return h;
  }

  function ve() {
    dsBoc.innerHTML = '';
    for (const b of bo) {
      const trongBo = ds.filter((v) => v.bo === b.ma);
      if (!trongBo.length) continue;
      const dangGap = gap.has(b.ma);

      const dau = el('button', 'video-bo' + (dangGap ? ' gap' : ''));
      dau.type = 'button';
      dau.setAttribute('aria-expanded', String(!dangGap));
      const nhanBo = el('span', 'video-bo-cot');
      nhanBo.append(el('b', null, b.ten), el('span', 'video-bo-mo', b.mo));
      const oMui = el('span', 'video-mui');
      oMui.appendChild(mui());
      dau.append(oMui, nhanBo, el('span', 'the-nho', String(trongBo.length)));
      dau.onclick = () => {
        if (dangGap) gap.delete(b.ma); else gap.add(b.ma);
        ve();
      };
      dsBoc.appendChild(dau);
      if (dangGap) continue;

      let deCu = null;
      for (const v of trongBo) {
        if (v.chuDe !== deCu) {
          deCu = v.chuDe;
          dsBoc.appendChild(el('div', 'khung-canh', v.tenChuDe));
        }
        dsBoc.appendChild(hang(v));
      }
    }
    dem.textContent = ds.length
      ? `${ds.length} video · ${mb(ds.reduce((t, v) => t + v.bytes, 0))} tất cả`
      : 'Chưa có video nào trong out/.';
  }

  async function nap() {
    nutMoi.disabled = true;
    try {
      const d = await (await fetch('/api/videos')).json();
      if (!d.ok) return bao(d.loi, true);
      // Server đã xếp sẵn theo bộ → chủ đề → ngày. Giữ nguyên thứ tự đó.
      ds = d.videos;
      bo = d.bo || [];
      ve();
    } catch (e) {
      bao(`Không đọc được danh sách video — ${e.message}`, true);
    } finally {
      nutMoi.disabled = false;
    }
  }
  nutMoi.onclick = nap;

  const muc = el('section', 'muc');
  muc.appendChild(el('h3', 'muc-ten', 'Video đã xuất'));
  muc.append(dem, nutMoi);
  bocBang.append(muc, dsBoc);

  return { nap, coGi: () => ds.length };
}
