/**
 * THẺ "DỰNG HÌNH" — nạp một tấm ảnh, AI dựng lại thành cảnh.
 *
 * LUÔN LÀ ĐỀ XUẤT, KHÔNG BAO GIỜ TỰ GHI VÀO CLIP.
 *   Dựng xong hiện ra cái nó định thêm, người dùng bấm "Nhận vào clip" mới vào —
 *   và vào rồi vẫn Ctrl+Z được. Bỏ bước này thì lần AI làm sai đầu tiên sẽ khiến
 *   người ta tắt hẳn tính năng và không bao giờ bật lại.
 *
 * NÓI RÕ NÓ ĐỊNH THÊM GÌ, dưới dạng cây món — không phải một dòng "đã dựng xong".
 *   Người dùng phải quyết định nhận hay bỏ, mà muốn quyết thì phải thấy.
 */
import { taoThaAnh } from './thaanh.js';

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

export function taoDungHinh(boc, { laySlug, bao, nhanCanh }) {
  const muc = el('div', 'muc-dung');
  let ketQua = null;       // { canh, vanDe, model, daSua }
  let dangDung = false;

  const kq = el('div', 'dung-kq an');

  const oAnh = taoThaAnh({
    chinh: 'Kéo ảnh vào đây, bấm để chọn, hoặc dán bằng Ctrl+V',
    phu: 'Ảnh chụp màn hình, bản thiết kế, hay ảnh tham khảo đều được — PNG, JPG, WebP, dưới 4 MB',
    dangHien: () => !boc.classList.contains('an'),
    khiDoi: () => { ketQua = null; veKetQua(); veNut(); },
    bao,
  });

  const oY = el('textarea', 'o-nhap o-y o-dung-y');
  oY.rows = 2;
  oY.placeholder = 'Dặn thêm nếu cần: "chỉ lấy phần tiêu đề", "đổi sang tông tối", "bỏ nút bấm"…';
  oY.setAttribute('aria-label', 'Dặn thêm cho AI');

  const nut = el('button', 'nut chinh rong nut-dung', 'Chọn ảnh trước đã');
  nut.type = 'button';
  nut.disabled = true;

  function veNut() {
    const a = oAnh.lay();
    nut.disabled = dangDung || !a;
    nut.textContent = dangDung ? 'AI đang dựng…' : a ? 'Dựng thử' : 'Chọn ảnh trước đã';
  }

  /* ---- cây món, để người dùng thấy AI định thêm gì ---- */
  function veCay(ds, sau = 0) {
    const ra = [];
    for (const e of ds || []) {
      const d = el('div', 'dung-mon');
      d.style.paddingLeft = `${sau * 14}px`;
      const nhan = String(e.text || e.label || e.name || e.title || e.url || '')
        .replace(/\*/g, '').replace(/\s*\|\s*/g, ' ');
      d.append(el('span', 'dung-kind', e.kind || '?'));
      if (nhan) d.append(el('span', 'dung-nhan', nhan.slice(0, 48)));
      ra.push(d, ...veCay(e.children, sau + 1));
    }
    return ra;
  }

  function veKetQua() {
    kq.innerHTML = '';
    kq.classList.remove('hong');
    if (!ketQua) { kq.classList.add('an'); return; }
    kq.classList.remove('an');
    const { canh, vanDe, daSua } = ketQua;
    const dem = (ds) => (ds || []).reduce((t, e) => t + 1 + dem(e.children), 0);

    kq.append(el('p', 'dung-tom',
      `AI dựng ${dem(canh.elements)} món, cảnh dài ${String(canh.duration ?? 0).replace('.', ',')} giây.`
      + (daSua ? ' (phải sửa lại một lượt cho hợp lệ)' : '')));

    const cay = el('div', 'dung-cay');
    cay.append(...veCay(canh.elements));
    kq.appendChild(cay);

    if (vanDe?.length) {
      kq.classList.add('hong');
      kq.appendChild(el('p', 'dung-loi', `Còn ${vanDe.length} chỗ chưa hợp lệ — không nhận vào clip được:`));
      for (const v of vanDe.slice(0, 6)) kq.appendChild(el('p', 'dung-loi-dong', `· ${v}`));
      return;
    }

    const hang = el('div', 'hang-nut');
    const nhan = el('button', 'nut chinh', 'Nhận vào clip');
    nhan.type = 'button';
    nhan.onclick = () => {
      nhanCanh?.(canh);
      ketQua = null; veKetQua();
      bao('Đã thêm cảnh AI dựng vào cuối clip. Không ưng thì Ctrl+Z.');
    };
    const bo = el('button', 'nut nho rong', 'Bỏ, dựng lại');
    bo.type = 'button';
    bo.onclick = () => { ketQua = null; veKetQua(); };
    hang.append(nhan, bo);
    kq.appendChild(hang);
  }

  nut.onclick = async () => {
    const slug = laySlug?.();
    const anh = oAnh.lay();
    if (!anh || dangDung) return;
    if (!slug) return bao('Mở một clip trước đã.', true);
    dangDung = true; veNut();
    kq.classList.remove('an', 'hong');
    kq.innerHTML = '';
    kq.appendChild(el('p', 'dung-tom', 'AI đang đọc ảnh và dựng lại — thường mất 15–30 giây…'));
    try {
      const r = await fetch('/api/dung-canh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, anh: anh.b64, mime: anh.mime, y: oY.value.trim() }),
      });
      const d = await r.json();
      if (!d.canh) {
        kq.classList.add('hong'); kq.innerHTML = '';
        kq.appendChild(el('p', 'dung-loi', d.loi || d.cau || 'AI dựng hỏng.'));
        return;
      }
      ketQua = d; veKetQua();
    } catch (e) {
      kq.classList.add('hong'); kq.innerHTML = '';
      kq.appendChild(el('p', 'dung-loi', `AI dựng hỏng — ${String(e.message || e).slice(0, 80)}`));
    } finally { dangDung = false; veNut(); }
  };

  /* HAI CỘT: nạp ảnh bên trái, kết quả bên phải. Xếp dọc hết thì ô ảnh đẩy nút
     "Nhận vào clip" ra ngoài tầm nhìn — mà đó là nút người dùng PHẢI bấm. */
  const trai = el('div', 'ai-cot');
  const phai = el('div', 'ai-cot');
  trai.append(oAnh.node, oAnh.oFile, oY, nut);
  phai.append(kq);
  muc.append(trai, phai);
  boc.appendChild(muc);
  veNut();
  return { ve: () => { oAnh.ve(); veNut(); veKetQua(); } };
}
