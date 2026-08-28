/**
 * KÉO ĐỔI CHỖ.
 *
 * Ba trường hợp khác hẳn nhau, và giao diện phải cho thấy ngay là cái nào:
 *
 *   · Món TỰ ĐẶT CHỖ  → kéo tự do, ghi thẳng vào `x`/`y`
 *   · Món dùng VÙNG ĐẶT SẴN → không ghi x/y (vùng đặt sẵn còn giữ cả bề rộng,
 *     đổi sang toạ độ là mất tính co giãn). Kéo thì hiện 7 vùng cho chọn.
 *   · Món NẰM TRONG CỤM → flex giữ chỗ, đặt toạ độ vào là hỏng cả cụm. Kéo thì
 *     đổi THỨ TỰ giữa các anh em.
 *
 * Trong lúc kéo KHÔNG gọi `player.nap()`: nạp lại cả kịch bản mỗi nhịp chuột thì
 * giật, mà lại còn tua về giây 0. Chỉ đặt thẳng `left`/`top` lên node cho mượt,
 * tới lúc thả mới ghi vào kịch bản một lần.
 */
import { timMon } from './store.js';

const NGUONG = 3; // px — dưới ngưỡng này coi là bấm chọn, không phải kéo

export function ganKeo({ lopBat, player, kho, layChon, sauKhiKeo, bao }) {
  let phien = null;

  lopBat.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    const chon = layChon();
    if (!chon?.monId) return;

    const t = timMon(kho.doc(), chon.canhId, chon.monId);
    if (!t) return;
    const node = player.node(chon.canhId, chon.monId);
    if (!node) return;

    // Chỉ bắt đầu kéo khi bấm TRÚNG món đang chọn, không thì để cú bấm đi tiếp
    // thành thao tác chọn món khác.
    const d = player.tai();
    const { x: qx, y: qy } = player.quyDoi(ev.clientX, ev.clientY);
    const duoi = d?.elementFromPoint(qx, qy)?.closest?.('.el');
    if (!duoi || duoi.dataset.el !== chon.monId) return;

    phien = {
      chon, t, node,
      x0: ev.clientX, y0: ev.clientY,
      heSo: player.hesoPhong() || 1,     // tính lại mỗi lần kéo: máy quay đang chạy
      batDauX: t.el.x ?? 0,
      batDauY: t.el.y ?? 0,
      leftCu: node.style.left,
      topCu: node.style.top,
      daKeo: false,
      loai: t.cha ? 'con' : t.el.place ? 'dat' : 'tu',
    };
    lopBat.setPointerCapture(ev.pointerId);
  });

  lopBat.addEventListener('pointermove', (ev) => {
    if (!phien) return;
    const dx = ev.clientX - phien.x0;
    const dy = ev.clientY - phien.y0;
    if (!phien.daKeo && Math.hypot(dx, dy) < NGUONG) return;

    if (!phien.daKeo) {
      phien.daKeo = true;
      if (phien.loai === 'dat') {
        bao('Món này đang dùng vùng đặt sẵn — đổi sang "Tự đặt" trong bảng bên phải rồi mới kéo tự do được.');
      } else if (phien.loai === 'con') {
        bao('Món này nằm trong một cụm — cụm tự xếp chỗ cho nó.');
      } else {
        kho.moCuChi();
      }
    }
    if (phien.loai !== 'tu') return;

    // Đặt thẳng lên node cho mượt — đây là ngoại lệ DUY NHẤT được phép ghi vào
    // DOM của iframe, và nó bị xoá ngay khi thả.
    const sx = phien.batDauX + dx / phien.heSo;
    const sy = phien.batDauY + dy / phien.heSo;
    phien.node.style.left = `${Math.round(sx)}px`;
    phien.node.style.top = `${Math.round(sy)}px`;
  });

  const thaTay = () => {
    if (!phien) return;
    const p = phien;
    phien = null;
    if (!p.daKeo || p.loai !== 'tu') return;

    const sx = Math.round(parseFloat(p.node.style.left) || 0);
    const sy = Math.round(parseFloat(p.node.style.top) || 0);
    // Trả node về nguyên trạng rồi ghi vào kịch bản — để bộ dựng vẽ lại từ dữ
    // liệu, không phải từ mấy dòng style ta vừa nhét vào.
    p.node.style.left = p.leftCu;
    p.node.style.top = p.topCu;

    kho.sua('kéo đổi chỗ', (doc) => {
      const t = timMon(doc, p.chon.canhId, p.chon.monId);
      if (!t) return;
      t.el.x = sx;
      t.el.y = sy;
    });
    kho.dongCuChi();
    sauKhiKeo?.();
  };

  lopBat.addEventListener('pointerup', thaTay);
  lopBat.addEventListener('pointercancel', thaTay);

  return { dangKeo: () => Boolean(phien?.daKeo) };
}
