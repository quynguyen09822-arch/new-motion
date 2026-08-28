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
