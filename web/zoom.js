/**
 * PHÓNG TO / THU NHỎ KHUNG LÀM VIỆC — Ctrl + lăn chuột.
 *
 * Phóng bằng `transform` trên trang CHA, không đụng gì tới bên trong iframe.
 * Nhờ vậy khung hình clip vẫn y nguyên: bộ dựng không biết là nó đang bị soi to,
 * và trang đem đi quay phim vẫn sạch.
 *
 * PHÓNG QUANH CON TRỎ, không phải quanh tâm khung. Đây mới là chỗ đáng viết cho
 * đúng: phóng quanh tâm thì chỗ người ta đang nhìn trôi mất khỏi màn hình ngay
 * sau cú lăn thứ hai, và họ phải rượt theo nó.
 *
 * Phép tính: gọi C là tâm khung theo BỐ CỤC (không đổi khi phóng, vì `scale`
 * lấy gốc ở giữa), `d` là quãng dời, `z` hệ số phóng. Một điểm `p` của nội dung
 * hiện lên màn hình ở  C + d + p·z.  Muốn điểm dưới con trỏ đứng yên thì giải
 * `p` từ hệ số cũ rồi tính lại `d` theo hệ số mới — đúng hai dòng ở `phong()`.
 *
 * Lớp phủ (khung chọn, khung rê) nằm TRONG khối bị phóng nên tự đúng theo,
 * không phải nhân chia gì. Còn toạ độ chuột thì phải chia lại — xem
 * `player.quyDoi` và `player.hesoPhong`.
 */

const MIN = 0.25;
const MAX = 8;

export function taoZoom({ boc, san, player, bao }) {
  let z = 1, dx = 0, dy = 0;
  const nghe = new Set();

  function ap() {
    const yen = z === 1 && dx === 0 && dy === 0;
    // Về đúng 100% thì bỏ hẳn transform, đừng để lại `scale(1)`: còn transform là
    // còn tạo tầng dựng hình riêng, và mọi chữ trong khung xem bị mờ đi một chút.
    boc.style.transform = yen ? '' : `translate(${dx}px, ${dy}px) scale(${z})`;
    boc.classList.toggle('dang-phong', !yen);
    for (const f of nghe) f(z);
  }

  /** Tâm khung theo bố cục — suy ngược từ khung hiện tại, trừ đi quãng đã dời. */
  function tam() {
    const r = boc.getBoundingClientRect();
    return { x: r.left + r.width / 2 - dx, y: r.top + r.height / 2 - dy };
  }

  /** Phóng về hệ số `moi`, giữ nguyên điểm đang nằm dưới con trỏ (cx, cy). */
  function phong(moi, cx, cy) {
    const z2 = Math.min(MAX, Math.max(MIN, moi));
    if (z2 === z) return;
    const c = tam();
    // Điểm nội dung đang nằm dưới con trỏ, tính theo hệ toạ độ chưa phóng.
    const px = (cx - c.x - dx) / z;
    const py = (cy - c.y - dy) / z;
    z = z2;
    dx = cx - c.x - px * z;
    dy = cy - c.y - py * z;
    ap();
  }

  function datLai() {
    z = 1; dx = 0; dy = 0;
    ap();
  }

  /** Vừa khít vùng làm việc — dùng khi mở clip khác, hoặc bấm nút "vừa khung". */
  function vuaKhung() { datLai(); }

  function xuLyLan(ev) {
    if (!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault();          // chặn trình duyệt tự phóng cả trang
    /*
     * Chuẩn hoá theo `deltaMode`: chuột lăn nấc báo pixel, còn bàn di và chuột
     * lăn mượt báo dòng hoặc trang. Không quy về một mối thì cùng một cú lăn,
     * máy này nhích một tí còn máy kia nhảy vọt.
     */
    const nac = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 100 : 1;
    const d = ev.deltaY * nac;
    // Luỹ thừa chứ không cộng trừ: mỗi cú lăn đổi cùng MỘT TỈ LỆ, nên từ 25% lên
    // và từ 400% xuống đều mượt như nhau. Cộng trừ thì lúc nhỏ nhảy giật cục.
    phong(z * Math.exp(-d * 0.0015), ev.clientX, ev.clientY);
  }

  // Lăn trên trang cha (viền quanh khung, và lớp bắt của clip đời 2).
  san.addEventListener('wheel', xuLyLan, { passive: false });

  /* ---------- kéo để dời khung khi đang phóng ---------- */
  /*
   * Chuột GIỮA, không phải chuột trái: chuột trái đang dùng để kéo thành phần
   * trong clip. Giữ phím cách rồi kéo cũng được, cho ai quen lối Figma.
   */
  let keo = null;
  san.addEventListener('pointerdown', (ev) => {
    const bangPhimCach = ev.button === 0 && dangGiuCach;
    if (ev.button !== 1 && !bangPhimCach) return;
    ev.preventDefault();
    keo = { x: ev.clientX, y: ev.clientY, dx0: dx, dy0: dy };
    san.setPointerCapture(ev.pointerId);
    san.classList.add('dang-doi');
  });
  san.addEventListener('pointermove', (ev) => {
    if (!keo) return;
    dx = keo.dx0 + (ev.clientX - keo.x);
    dy = keo.dy0 + (ev.clientY - keo.y);
    ap();
  });
  const thaTay = () => { keo = null; san.classList.remove('dang-doi'); };
  san.addEventListener('pointerup', thaTay);
  san.addEventListener('pointercancel', thaTay);

  let dangGiuCach = false;
  document.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space' && !ev.target.matches('input, select, textarea')) dangGiuCach = true;
  });
  document.addEventListener('keyup', (ev) => { if (ev.code === 'Space') dangGiuCach = false; });

  return {
    heSo: () => z,
    phong,
    datLai,
    vuaKhung,
    /** Gắn nghe lăn chuột vào trong iframe — gọi lại sau MỖI lần mở clip. */
    noiVaoKhung() { return player.ngheLan(xuLyLan); },
    khiDoi(f) { nghe.add(f); return () => nghe.delete(f); },
    /** Phóng thêm/bớt một nấc, lấy tâm vùng làm việc làm mốc (cho nút bấm, phím tắt). */
    motNac(len) {
      const r = san.getBoundingClientRect();
      phong(z * (len ? 1.25 : 1 / 1.25), r.left + r.width / 2, r.top + r.height / 2);
    },
  };
}
