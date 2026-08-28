/**
 * DANH SÁCH THÀNH PHẦN — cây dựng TỪ KỊCH BẢN, không phải từ DOM.
 *
 * Đây là đường DUY NHẤT để chọn nền (`nen`) và vệt sáng (`sweep`): bộ dựng đặt
 * hai loại đó `pointer-events:none` nên bấm trên khung hình không bao giờ trúng.
 * Cũng là đường thoát khi một món bị món khác che kín.
 */
import { TEN_LOAI } from './inspector/schema.js';
import { tenMon } from './inspector/index.js';

const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

export function taoDanhSach(boc, { onChon, onRe, onThoiRe }) {
  let chon = null;

  function ve(doc, canhId) {
    boc.innerHTML = '';
    const canh = (doc?.scenes || []).find((s) => s.id === canhId);
    if (!canh) return;

    const dao = (els, sau) => {
      for (const e of els || []) {
        const hang = el('div', 'lop-hang');
        hang.style.paddingLeft = `${10 + sau * 14}px`;
        hang.dataset.mon = e.id;
        if (chon?.monId === e.id) hang.classList.add('dang');

        const cham = el('span', 'lop-cham');
        cham.dataset.loai = e.kind;
        hang.append(cham, el('span', 'lop-ten', tenMon(e)));

        // Nền và vệt sáng bấm trên khung hình không trúng — đánh dấu để người
        // dùng biết vì sao chỉ chọn được từ đây.
        if (e.kind === 'nen' || e.kind === 'sweep') {
          hang.append(el('span', 'lop-dau', 'chỉ chọn ở đây'));
        }

        hang.onclick = () => onChon({ canhId, monId: e.id });
        hang.onmouseenter = () => onRe({ canhId, monId: e.id });
        hang.onmouseleave = () => onThoiRe();
        boc.appendChild(hang);

        if (e.kind === 'group') dao(e.children, sau + 1);
      }
    };
    dao(canh.elements, 0);
  }

  return {
    ve,
    dat(c) { chon = c; },
  };
}
