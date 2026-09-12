/**
 * BONG BÓNG HƯỚNG DẪN TẠI CHỖ (Rich Tooltip).
 *
 * Bảng thuộc tính có gần một trăm núm. Bày hết lời giải thích ra cùng lúc thì
 * chính lời giải thích thành thứ gây rối — đó là tình trạng cũ: mỗi núm kèm một
 * dòng chữ xám, cuộn mãi không hết. Nên lời giải thích chuyển vào đây: chỉ hiện
 * khi người dùng hỏi tới.
 *
 * NỘI DUNG NẰM TRONG `schema.js`, KHÔNG nằm ở đây. Đây chỉ là cái khung để bày.
 * Theo đúng §6.1 của ARCHITECTURE.md: "Thêm property mới = sửa schema, không
 * đụng UI code." Thêm hướng dẫn cho một núm mới = khai thêm `huongDan` trong
 * schema, không phải sửa file này.
 *
 * Một bong bóng DUY NHẤT cho cả trang, dời chỗ khi cần. Bảng thuộc tính dựng
 * lại toàn bộ sau mỗi lần sửa kịch bản, nên bong bóng phải sống ngoài nó —
 * gắn vào `document.body` — nếu không nó biến mất giữa chừng khi người dùng
 * đang đọc.
 */

const CHO_RE = 380;      // ms rê chuột rồi mới hiện — lướt qua thì đừng bật
const CHO_RA = 160;      // ms rời chuột rồi mới ẩn, để còn kịp rê vào bong bóng
const RONG = 300;

export function taoHuongDan() {
  const boc = document.createElement('div');
  boc.className = 'hd an';
  boc.setAttribute('role', 'tooltip');
  boc.id = 'hd-bong-bong';

  const de = document.createElement('h4');
  de.className = 'hd-de';
  const mo = document.createElement('p');
  mo.className = 'hd-mo';
  const khungDemo = document.createElement('div');
  khungDemo.className = 'hd-demo an';
  boc.append(de, mo, khungDemo);
  document.body.appendChild(boc);

  let neo = null;          // phần tử đang được giải thích
  let henHien = null, henAn = null;
  let ghim = false;        // mở bằng bàn phím / bấm chuột thì GHIM, không tự ẩn

  const dungHen = () => { clearTimeout(henHien); clearTimeout(henAn); };

  /**
   * Đặt bong bóng cạnh cái neo.
   *
   * Ưu tiên mở sang TRÁI: bảng thuộc tính là cột hẹp sát mép phải màn hình, mở
   * sang phải là tràn ra ngoài. Hết chỗ bên trái thì mới lật sang phải.
   */
  function datCho() {
    if (!neo) return;
    const r = neo.getBoundingClientRect();
    const cao = boc.offsetHeight;
    const trai = r.left - RONG - 12;
    boc.style.left = `${trai >= 8 ? trai : Math.min(r.right + 12, innerWidth - RONG - 8)}px`;
    boc.style.top = `${Math.min(Math.max(8, r.top - 8), innerHeight - cao - 8)}px`;
    boc.dataset.ben = trai >= 8 ? 'trai' : 'phai';
  }

  function hien(el, hd) {
    if (!hd) return;
    neo = el;
    de.textContent = hd.tieuDe || '';
    mo.textContent = hd.mota || '';
    de.classList.toggle('an', !hd.tieuDe);
    boc.classList.remove('an');
    datCho();
    el.setAttribute('aria-describedby', boc.id);
  }

  function an() {
    dungHen();
    ghim = false;
    boc.classList.add('an');
    neo?.removeAttribute('aria-describedby');
    neo = null;
  }

  /**
   * Gắn một nút hỏi vào nhãn của núm.
   * @param nhan  phần tử nhãn (`<label>`)
   * @param hd    { tieuDe, mota } lấy từ schema
   */
  function gan(nhan, hd) {
    if (!hd || (!hd.tieuDe && !hd.mota)) return null;

    const nut = document.createElement('button');
    nut.type = 'button';
    nut.className = 'hd-nut';
    // Nút chỉ có một ký tự nên BẮT BUỘC có nhãn cho trình đọc màn hình, không
    // thì người dùng bàn phím nghe thấy "nút, dấu hỏi" và không biết hỏi về cái gì.
    nut.setAttribute('aria-label', `Hướng dẫn: ${hd.tieuDe || nhan.textContent}`);
    nut.textContent = '?';

    const moNgay = () => { dungHen(); ghim = true; hien(nut, hd); };

    nut.addEventListener('pointerenter', () => {
      dungHen();
      henHien = setTimeout(() => hien(nut, hd), CHO_RE);
    });
    nut.addEventListener('pointerleave', () => {
      if (ghim) return;
      dungHen();
      henAn = setTimeout(an, CHO_RA);
    });
    // Bấm thì GHIM lại: người dùng muốn đọc kỹ, hoặc muốn rê chuột vào trong
    // bong bóng để chọn chữ.
    nut.addEventListener('click', (ev) => { ev.preventDefault(); ghim ? an() : moNgay(); });
    nut.addEventListener('focus', moNgay);
    nut.addEventListener('blur', () => { if (!boc.contains(document.activeElement)) an(); });

    nhan.appendChild(nut);
    return nut;
  }

  // Rê vào chính bong bóng thì đừng ẩn — người ta đang đọc.
  boc.addEventListener('pointerenter', dungHen);
  boc.addEventListener('pointerleave', () => { if (!ghim) henAn = setTimeout(an, CHO_RA); });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !boc.classList.contains('an')) { ev.stopPropagation(); an(); }
  }, true);
  // Bấm ra ngoài thì đóng cái đang ghim.
  document.addEventListener('pointerdown', (ev) => {
    if (ghim && !boc.contains(ev.target) && ev.target !== neo) an();
  });
  addEventListener('resize', () => { if (!boc.classList.contains('an')) datCho(); });

  return { gan, an, khungDemo, dangMo: () => !boc.classList.contains('an') };
}

/*
 * MỘT bản dùng chung cho cả trang, dựng khi cần tới lần đầu.
 *
 * Để `fields.js` gọi thẳng mà không phải chuyền qua từng lớp gọi hàm — nhờ vậy
 * thêm hướng dẫn cho một núm chỉ là khai thêm trong `schema.js`, đúng §6.1.
 */
let _chung = null;
export function huongDanChung() {
  if (!_chung) _chung = taoHuongDan();
  return _chung;
}
