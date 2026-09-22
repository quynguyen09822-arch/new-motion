/**
 * KÉO CO GIÃN — nắm tay nắm ở mép khung chọn rồi kéo, như mọi app thiết kế.
 *
 * VÌ SAO CẦN, KHI BẢNG BÊN PHẢI ĐÃ CÓ Ô "RỘNG"/"CAO":
 *   Hai ô đó chỉ hiện cho món TỰ ĐẶT CHỖ. Món nằm trong cụm thì bảng thuộc tính
 *   không cho núm kích thước nào — và đó lại là phần lớn số món trong một cảnh
 *   dựng từ HTML. Với chúng, kéo tay nắm là đường DUY NHẤT để đổi bề rộng.
 *   Ngoài ra gõ số thì phải nhắm rồi sửa, sửa rồi nhắm lại; kéo thì thấy ngay.
 *
 * KHÔNG CHO KÉO MÓN DÙNG VÙNG ĐẶT SẴN.
 *   `place()` của bộ dựng tự tính bề rộng bằng `calc(100% - …)`, còn `el.w` thì
 *   ghi đè lên đúng phép tính ấy. Đặt một con số cứng vào là món thôi co theo
 *   khung — và khổ 16:9 với 9:16 lại lệch nhau, đúng cái vừa mất công sửa. Nên
 *   tay nắm bị giấu hẳn cho nhóm này, và nói ra lý do khi người ta cố kéo.
 *
 * `x`/`y` CHỈ ĐỔI KHI MÓN TỰ ĐẶT CHỖ.
 *   Kéo mép trái thì mép phải phải đứng yên, nghĩa là `x` dịch theo. Món nằm
 *   trong cụm không có `x` — flex giữ chỗ cho nó — nên ở đó kéo mép trái chỉ
 *   đổi bề rộng, neo giữ nguyên. Đó cũng đúng cách auto-layout hành xử.
 *
 * Trong lúc kéo KHÔNG gọi `player.nap()`: nạp lại cả kịch bản mỗi nhịp chuột là
 * giật và tua về giây 0. Chỉ đặt thẳng `width`/`height` lên node cho mượt, thả
 * ra mới ghi vào kịch bản một lần — y hệt `drag.js`.
 */
import { timMon } from './store.js';

/** Dưới cỡ này thì món biến mất khỏi tầm tay, không ai nắm lại được. */
const TOI_THIEU = 8;

/**
 * Kích thước mới sau một cú kéo. Hàm THUẦN — không đụng DOM, không đụng kho.
 *
 * Tách ra để kiểm được thẳng bằng `node`: tám tay nắm nhân với giữ-tỉ-lệ là mười
 * sáu lối đi, mà dò tay từng lối trên trình duyệt thì vừa lâu vừa sót.
 *
 * @param nam   hai chữ: dọc rồi ngang — t/g/d và t/g/p
 * @param dau   { x, y, w, h } lúc bắt đầu kéo, theo px của sân khấu
 * @param d     { dx, dy } đã quy về px sân khấu
 * @param y     { tiLe: giữ tỉ lệ (phím Shift), dichDuoc: có được đổi x/y không }
 */
export function coMoi(nam, dau, d, { tiLe = false, dichDuoc = true } = {}) {
  const [doc, ngang] = [nam[0], nam[1]];
  let w = dau.w;
  let h = dau.h;

  if (ngang === 'p') w = dau.w + d.dx;
  else if (ngang === 't') w = dau.w - d.dx;
  if (doc === 'd') h = dau.h + d.dy;
  else if (doc === 't') h = dau.h - d.dy;

  /* GIỮ TỈ LỆ chỉ có nghĩa ở bốn góc. Ở cạnh thì người ta đang cố ý đổi đúng
     một chiều, mà kéo theo chiều kia là làm trái điều họ vừa làm. */
  if (tiLe && doc !== 'g' && ngang !== 'g' && dau.w > 0 && dau.h > 0) {
    // Theo chiều nào ĐỔI NHIỀU HƠN, để con trỏ không rời khỏi tay nắm.
    if (Math.abs(w - dau.w) * dau.h >= Math.abs(h - dau.h) * dau.w) h = w * (dau.h / dau.w);
    else w = h * (dau.w / dau.h);
  }

  w = Math.max(TOI_THIEU, Math.round(w));
  h = Math.max(TOI_THIEU, Math.round(h));

  /* Kéo mép TRÁI hay mép TRÊN thì neo là mép đối diện: bề rộng tăng bao nhiêu,
     `x` lùi bấy nhiêu. Tính từ `w` ĐÃ CHỐT chứ không từ `d.dx`, nếu không thì
     lúc chạm cỡ tối thiểu món vẫn trôi tiếp. */
  let x = dau.x;
  let y = dau.y;
  if (dichDuoc) {
    if (ngang === 't') x = dau.x + (dau.w - w);
    if (doc === 't') y = dau.y + (dau.h - h);
  }
  return { x, y, w, h };
}

export function ganKeoCo({ lopPhu, player, kho, layChon, veLai, sauKhiCo, bao }) {
  let phien = null;

  lopPhu.addEventListener('pointerdown', (ev) => {
    const nam = ev.target?.dataset?.nam;
    if (!nam || ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();

    const chon = layChon();
    const t = chon?.monId && timMon(kho.doc(), chon.canhId, chon.monId);
    const node = t && player.node(chon.canhId, chon.monId);
    if (!t || !node) return;

    if (!t.cha && t.el.place) {
      return bao('Món này đang dùng vùng đặt sẵn — nó tự co theo khung, nên không '
        + 'đặt cỡ cứng được. Đổi sang "Tự đặt" trong bảng bên phải rồi mới kéo.');
    }

    /* Cỡ bắt đầu lấy TỪ MÀN HÌNH khi kịch bản chưa ghi `w`/`h`: phần lớn món để
       bộ dựng tự tính cỡ, và bắt đầu từ 0 thì cú kéo đầu tiên làm món nhảy bé
       tí rồi mới lớn lại. */
    const hs = player.hesoPhong() || 1;
    const r = node.getBoundingClientRect();
    phien = {
      chon, nam, hs,
      x0: ev.clientX,
      y0: ev.clientY,
      dichDuoc: !t.cha,
      dau: {
        x: t.el.x ?? 0,
        y: t.el.y ?? 0,
        w: t.el.w ?? Math.round(r.width / hs),
        h: t.el.h ?? Math.round(r.height / hs),
      },
      node,
      cu: {
        w: node.style.width, h: node.style.height,
        left: node.style.left, top: node.style.top,
      },
      daKeo: false,
      moi: null,
    };
    lopPhu.setPointerCapture(ev.pointerId);
  });

  lopPhu.addEventListener('pointermove', (ev) => {
    if (!phien) return;
    const dx = (ev.clientX - phien.x0) / phien.hs;
    const dy = (ev.clientY - phien.y0) / phien.hs;
    if (!phien.daKeo) {
      if (Math.hypot(ev.clientX - phien.x0, ev.clientY - phien.y0) < 3) return;
      phien.daKeo = true;
      kho.moCuChi();
    }

    const m = coMoi(phien.nam, phien.dau, { dx, dy },
      { tiLe: ev.shiftKey, dichDuoc: phien.dichDuoc });
    phien.moi = m;

    /* Ngoại lệ DUY NHẤT được phép ghi vào DOM của iframe, và bị xoá ngay khi
       thả — bộ dựng vẽ lại từ dữ liệu chứ không từ mấy dòng style này. */
    phien.node.style.width = `${m.w}px`;
    phien.node.style.height = `${m.h}px`;
    if (phien.dichDuoc) {
      phien.node.style.left = `${m.x}px`;
      phien.node.style.top = `${m.y}px`;
    }
    veLai?.();
  });

  const tha = (ev) => {
    if (!phien) return;
    const p = phien;
    phien = null;
    try { lopPhu.releasePointerCapture(ev.pointerId); } catch { /* đã nhả */ }
    if (!p.daKeo || !p.moi) return;

    // Trả node về nguyên trạng rồi mới ghi kịch bản: để bộ dựng vẽ lại từ dữ liệu.
    p.node.style.width = p.cu.w;
    p.node.style.height = p.cu.h;
    p.node.style.left = p.cu.left;
    p.node.style.top = p.cu.top;

    kho.sua('kéo đổi cỡ', (doc) => {
      const t = timMon(doc, p.chon.canhId, p.chon.monId);
      if (!t) return;
      t.el.w = p.moi.w;
      t.el.h = p.moi.h;
      if (p.dichDuoc) { t.el.x = p.moi.x; t.el.y = p.moi.y; }
    });
    kho.dongCuChi();
    sauKhiCo?.();
  };

  lopPhu.addEventListener('pointerup', tha);
  lopPhu.addEventListener('pointercancel', tha);

  return { dangCo: () => Boolean(phien?.daKeo) };
}
