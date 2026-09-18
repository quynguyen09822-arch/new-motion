/**
 * Ô THẢ ẢNH dùng chung — cho thẻ "Dựng hình" và thẻ "Sửa món".
 *
 * BA ĐƯỜNG NẠP: chọn file, kéo thả, và DÁN (Ctrl+V). Đường dán là đường hay dùng
 * nhất trong thực tế — người ta chụp màn hình rồi dán thẳng vào.
 *
 * Đường dán chỉ nghe khi ô này ĐANG HIỆN. Nghe cả lúc ẩn là cướp Ctrl+V của ô gõ
 * chữ ở chỗ khác, và người dùng dán chữ vào đâu cũng ra chuyện chọn ảnh.
 */
const el = (the, lop, chu) => {
  const n = document.createElement(the);
  if (lop) n.className = lop;
  if (chu != null) n.textContent = chu;
  return n;
};

export const TOI_DA_ANH = 4 * 1024 * 1024;   // khớp với ngưỡng máy chủ

/** Đổi ArrayBuffer sang base64 theo TỪNG KHÚC.
 *  `String.fromCharCode(...mảng)` một lần với ảnh vài MB là tràn ngăn xếp lời
 *  gọi và trang chết đứng — không có lỗi nào dễ hiểu bắn ra. */
export function sangB64(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
  return btoa(s);
}

/**
 * @param dangHien  hàm trả về true khi ô này đang nhìn thấy (để lọc Ctrl+V)
 * @param khiDoi    gọi lại mỗi khi ảnh đổi (có thể là null khi người dùng bỏ ảnh)
 */
export function taoThaAnh({ chinh, phu, dangHien, khiDoi, bao }) {
  let anh = null;

  const tha = el('div', 'dung-tha');
  tha.tabIndex = 0;
  tha.setAttribute('role', 'button');
  tha.setAttribute('aria-label', 'Chọn hoặc kéo thả ảnh vào đây');
  const oFile = el('input');
  oFile.type = 'file';
  oFile.accept = 'image/png,image/jpeg,image/webp';
  oFile.style.display = 'none';

  function ve() {
    tha.innerHTML = '';
    if (!anh) {
      tha.classList.remove('co-anh');
      tha.append(el('p', 'dung-tha-chinh', chinh), el('p', 'dung-tha-phu', phu));
      return;
    }
    tha.classList.add('co-anh');
    const h = el('img', 'dung-anh');
    h.src = `data:${anh.mime};base64,${anh.b64}`;
    h.alt = `Ảnh đã chọn: ${anh.ten}`;
    const bo = el('button', 'nut-ti dung-bo');
    bo.type = 'button';
    bo.title = 'Bỏ ảnh này';
    bo.setAttribute('aria-label', 'Bỏ ảnh đã chọn');
    bo.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
    bo.onclick = (ev) => { ev.stopPropagation(); dat(null); };
    tha.append(h, el('span', 'dung-ten', `${anh.ten} · ${(anh.co / 1024).toFixed(0)} KB`), bo);
  }

  function dat(a) { anh = a; ve(); khiDoi?.(anh); }

  async function nhanFile(f) {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
      return bao?.(`Không đọc được định dạng "${f.type || 'lạ'}". Dùng PNG, JPG hoặc WebP.`, true);
    }
    if (f.size > TOI_DA_ANH) {
      return bao?.(`Ảnh nặng ${(f.size / 1048576).toFixed(1)} MB, quá mức 4 MB. Thu nhỏ lại rồi thử lại.`, true);
    }
    dat({ b64: sangB64(await f.arrayBuffer()), mime: f.type, ten: f.name || 'ảnh dán', co: f.size });
  }

  tha.onclick = () => oFile.click();
  tha.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); oFile.click(); } };
  oFile.onchange = () => nhanFile(oFile.files?.[0]);
  tha.ondragover = (ev) => { ev.preventDefault(); tha.classList.add('dang-keo'); };
  tha.ondragleave = () => tha.classList.remove('dang-keo');
  tha.ondrop = (ev) => { ev.preventDefault(); tha.classList.remove('dang-keo'); nhanFile(ev.dataTransfer?.files?.[0]); };

  document.addEventListener('paste', (ev) => {
    if (!dangHien?.()) return;
    for (const it of ev.clipboardData?.items || []) {
      if (it.type.startsWith('image/')) { nhanFile(it.getAsFile()); ev.preventDefault(); return; }
    }
  });

  ve();
  return { node: tha, oFile, lay: () => anh, xoa: () => dat(null), ve };
}
