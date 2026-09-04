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
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;
/* Khổ hình lấy từ số đo THẬT của ffprobe. Tên file chỉ là phương án phụ: mấy
   video cũ (cta-mat-bao, thuong-hieu…) không nhét khổ vào tên nên đọc tên là
   ra dấu hỏi, trong khi số đo thì luôn có. */
const kho = (v) => (v.rong && v.cao ? `${v.rong}×${v.cao}` : v.khoTen || '?');
const gy = (s) => (s == null ? '?' : `${Math.round(s)}s`);
const ngay = (t) => new Date(t).toLocaleString('vi-VN',
  { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function taoBangVideo({ bocGiua, bocBang, bao }) {
  let ds = [];
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

  function ve() {
    dsBoc.innerHTML = '';
    let gocCu = null;
    for (const v of ds) {
      if (v.goc !== gocCu) {
        gocCu = v.goc;
        dsBoc.appendChild(el('div', 'khung-canh', v.goc));
      }
      const h = el('button', 'video-hang');
      h.type = 'button';
      if (dang?.ten === v.ten) h.classList.add('dang');

      const cot = el('span', 'video-cot');
      const d1 = el('span', 'video-ten', `${kho(v)} · ${gy(v.giay)}`);
      const d2 = el('span', 'video-phu', `${mb(v.bytes)} · ${ngay(v.suaLuc)}`);
      cot.append(d1, d2);
      h.appendChild(cot);

      // Nhãn cho biết bản nào đã có tiếng — nhìn tên file thì phải tự dịch "-vo".
      const nh = el('span', 'video-nhan-hang');
      if (v.vo) nh.appendChild(el('span', 'the-nho tieng', 'có tiếng'));
      if (v.sfx) nh.appendChild(el('span', 'the-nho', 'SFX'));
      if (v.nhac) nh.appendChild(el('span', 'the-nho', 'nhạc'));
      if (!v.vo && !v.sfx && !v.nhac) nh.appendChild(el('span', 'the-nho cam', 'chưa tiếng'));
      h.appendChild(nh);

      h.onclick = () => chon(v);
      dsBoc.appendChild(h);
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
      // Nhóm theo clip gốc, trong mỗi nhóm mới nhất lên trước.
      ds = d.videos.sort((a, b) => a.goc.localeCompare(b.goc) || b.suaLuc - a.suaLuc);
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
