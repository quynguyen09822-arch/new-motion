/**
 * LỚP PHỦ — vẽ khung chọn, khung rê chuột.
 *
 * LUẬT CỨNG: mọi thứ vẽ ở TRANG CHA, không bao giờ chèn vào iframe. Chèn class
 * hay CSS vào iframe là làm bẩn đúng cái trang mà lát nữa `export-video.mjs`
 * đem đi quay thành phim.
 *
 * Lớp phủ nằm chồng khít lên iframe nên toạ độ của `getBoundingClientRect()`
 * bên trong iframe dùng thẳng được, không cần cộng trừ gì.
 */

export function taoLopPhu(boc, player) {
  const khungChon = document.createElement('div');
  khungChon.className = 'khung-chon';
  const khungRe = document.createElement('div');
  khungRe.className = 'khung-re';
  boc.append(khungRe, khungChon);

  const nhan = document.createElement('span');
  nhan.className = 'khung-nhan';
  khungChon.appendChild(nhan);

  /* TÁM TAY NẮM CO GIÃN.
   *
   * Tên gồm hai chữ: dọc rồi ngang. t=trên/trái, g=giữa, d=dưới, p=phải.
   * `tp` là góc trên-phải, `gt` là cạnh giữa-trái. `keoco.js` đọc đúng hai chữ
   * này để biết mép nào đang bị kéo, nên đổi tên ở đây là phải đổi cả bên đó.
   *
   * Bản cũ vẽ hai chấm góc bằng `::before`/`::after` — chỉ để NHÌN, bấm không
   * trúng vì cả khung chọn đang `pointer-events:none`. Nay là thẻ thật, có
   * `pointer-events:auto`, và vì `#lop-phu` nằm sau `#lop-bat` trong DOM nên
   * chúng đứng trên lớp bắt sự kiện, bấm là trúng tay nắm chứ không thành một
   * cú chọn món khác. */
  const TAY_NAM = ['tt', 'tg', 'tp', 'gt', 'gp', 'dt', 'dg', 'dp'];
  for (const t of TAY_NAM) {
    const h = document.createElement('span');
    h.className = 'khung-nam';
    h.dataset.nam = t;
    khungChon.appendChild(h);
  }

  function dat(khung, canhId, monId, chuThich) {
    const node = canhId && monId ? player.node(canhId, monId) : null;
    if (!node) { khung.style.display = 'none'; return null; }
    const r = node.getBoundingClientRect();
    if (!r.width && !r.height) { khung.style.display = 'none'; return null; }
    khung.style.display = 'block';
    khung.style.left = `${r.left}px`;
    khung.style.top = `${r.top}px`;
    khung.style.width = `${r.width}px`;
    khung.style.height = `${r.height}px`;
    if (chuThich != null) nhan.textContent = chuThich;
    /* Hộp bé hơn 34px thì tám tay nắm chen nhau kín mặt, và cú bấm vào giữa để
       DỜI CHỖ lại trúng tay nắm thành CO GIÃN. Giấu bớt theo từng chiều — đúng
       cách `khung.js` đã làm cho khung cắt ảnh. */
    khung.classList.toggle('mong-ngang', r.height < 34);
    khung.classList.toggle('mong-doc', r.width < 34);
    khung.classList.toggle('be-ti', r.width < 30 && r.height < 30);
    return { node, r };
  }

  return {
    /** @param kieu 'tu' = tự đặt chỗ (kéo được) · 'dat' = vùng đặt sẵn · 'con' = nằm trong cụm */
    veChon(canhId, monId, chuThich, kieu) {
      const kq = dat(khungChon, canhId, monId, chuThich);
      khungChon.dataset.kieu = kieu || 'tu';
      return kq;
    },
    veRe(canhId, monId) { dat(khungRe, canhId, monId); },
    xoaRe() { khungRe.style.display = 'none'; },
    xoa() { khungChon.style.display = 'none'; khungRe.style.display = 'none'; },
  };
}
