/**
 * KHUNG XEM — vòng đời iframe, và phép quy đổi toạ độ.
 *
 * Đây là file DUY NHẤT được phép chạm vào `window.__clip` bên trong iframe.
 * Mọi nơi khác đi qua đây. Có hai cái bẫy mà nhốt lại một chỗ thì không thể quên:
 *
 * BẪY 1 — `__clip.load()` tua về giây 0.
 *   Dòng 1477 của scene-player.html: `load` gọi `render(0)`. Nghĩa là cứ nạp
 *   kịch bản mới là khung hình nhảy về đầu. Người đang sửa một món ở giây 12 mà
 *   mỗi lần gõ một chữ lại bị quăng về giây 0 thì không dùng được. Nên `nap()`
 *   ở đây LUÔN nhớ giây hiện tại rồi tua lại.
 *
 * BẪY 2 — phép quy đổi pixel màn hình ↔ toạ độ sân khấu.
 *   Giữa hai thứ đó có ĐÚNG HAI tầng phóng to: `#stage` (co cho vừa khung) và
 *   `#cam` (máy quay). KHÔNG phải transform của chính món đang kéo — transform
 *   của nó còn chứa `measureFit()`, hiệu ứng bay vào, và nhịp đập, tất cả đều
 *   được áp SAU khi `left/top` đã đặt. Lấy nhầm là kéo đi một đằng chuột đi một nẻo.
 */

const CHO_TOI_DA = 15000; // scene-player fetch JSON không đồng bộ, phải chờ

export function taoPlayer(iframe) {
  let win = null;
  let clip = null;
  let dangChay = false;
  const nghe = new Set();

  function baoTick() {
    for (const f of nghe) f();
  }

  /* Đồng hồ của trang cha, chỉ để cập nhật thanh thời gian — không lái gì cả. */
  function vongLap() {
    if (clip && dangChay) baoTick();
    requestAnimationFrame(vongLap);
  }
  requestAnimationFrame(vongLap);

  return {
    /**
     * Mở một clip. `duongDan` là đường dẫn tương đối của chính server này
     * (vd `/clip/scene-player.html?scene=cta`) — cùng origin, nếu không thì
     * không với được vào `contentDocument`.
     *
     * ⚠️ Tuyệt đối KHÔNG thêm `export=1`: tham số đó tắt `fit()`, sân khấu sẽ
     * không co cho vừa khung nữa và mọi phép đo đều lệch.
     *
     * `doiClip` = 1 nghĩa là clip đời cũ. Những trang ấy chỉ dựng `window.__clip`
     * bên trong nhánh `if (export=1)`, mà `export=1` thì lại đúng thứ ta không
     * được phép bật. Nên với clip đời cũ ta không chờ `__clip` nữa: cứ để trang
     * tự chạy lấy, coi như một khung xem thường. Xuất video vẫn chạy bình thường
     * vì `export-video.mjs` tự thêm `export=1` khi nó lái trang.
     */
    async mo(duongDan, doiClip = 2) {
      clip = null;
      win = null;
      await new Promise((xong, hong) => {
        iframe.onload = xong;
        iframe.onerror = () => hong(new Error('Không mở được khung xem.'));
        iframe.src = duongDan;
      });
      win = iframe.contentWindow;

      if (doiClip !== 2) {
        dangChay = true; // trang đời cũ tự chạy lấy
        baoTick();
        return null;
      }

      const han = Date.now() + CHO_TOI_DA;
      while (!win.__clip) {
        if (Date.now() > han) throw new Error('Khung xem không phản hồi — có thể kịch bản hỏng.');
        await new Promise((r) => setTimeout(r, 50));
      }
      clip = win.__clip;
      await clip.ready();
      dangChay = false;
      baoTick();
      return clip;
    },

    san() {
      return Boolean(clip);
    },

    /**
     * NẠP KỊCH BẢN MỚI mà giữ nguyên chỗ đang xem.
     * Đây là cách DUY NHẤT được phép gọi `__clip.load`.
     */
    nap(doc) {
      if (!clip) return;
      const giuGiay = clip.at();
      clip.load(doc);
      // load() vừa render(0) — tua lại chỗ cũ, kẹp trong thời lượng mới vì
      // sửa kịch bản có thể làm clip ngắn đi.
      clip.seek(Math.min(giuGiay, Math.max(0, clip.duration - 0.001)));
      baoTick();
    },

    tua(giay) {
      if (!clip) return;
      clip.seek(Math.max(0, Math.min(giay, clip.duration)));
      baoTick();
    },

    chay() {
      if (!clip) return;
      clip.play();
      dangChay = true;
      baoTick();
    },

    /** Dừng bằng cách tua tại chỗ — `seek` đặt `DUNG = true` trong bộ dựng. */
    dung() {
      if (!clip) return;
      clip.seek(clip.at());
      dangChay = false;
      baoTick();
    },

    dangChay: () => dangChay,
    giay: () => (clip ? clip.at() : 0),
    thoiLuong: () => (clip ? clip.duration : 0),
    dsCanh: () => (clip ? clip.scenes() : []),

    /** Cảnh đang hiện ở giây hiện tại. */
    canhHienTai() {
      if (!clip) return null;
      const t = clip.at();
      const ds = clip.scenes();
      return ds.find((c) => t >= c.start && t < c.start + c.duration) || ds[ds.length - 1] || null;
    },

    tai() {
      return win?.document ?? null;
    },

    /** Node DOM của một món trong một cảnh. Mọi cảnh đều nằm sẵn trong DOM nên
     * phải lọc theo cả `data-scene`, không thì vớ nhầm món trùng tên ở cảnh khác. */
    node(canhId, monId) {
      const d = win?.document;
      if (!d) return null;
      return d.querySelector(
        `.el[data-scene="${CSS.escape(canhId)}"][data-el="${CSS.escape(monId)}"]`,
      );
    },

    /**
     * HỆ SỐ PHÓNG hiện tại = fit của sân khấu × phóng của máy quay.
     * Phải tính lại mỗi lần bắt đầu kéo: máy quay đang chạy, cache là sai.
     */
    hesoPhong() {
      const d = win?.document;
      if (!d) return 1;
      const doc = (el) => {
        if (!el) return 1;
        const t = getComputedStyle(el).transform;
        if (!t || t === 'none') return 1;
        try {
          return new DOMMatrix(t).a || 1;
        } catch {
          return 1;
        }
      };
      return doc(d.querySelector('#stage')) * doc(d.querySelector('#cam'));
    },

    /** Khung của iframe trên màn hình — để lớp phủ ở trang cha vẽ đúng chỗ. */
    khungIframe() {
      return iframe.getBoundingClientRect();
    },

    /**
     * ĐỔI TOẠ ĐỘ CHUỘT: trang cha → khung nhìn của iframe.
     *
     * `ev.clientX` đo từ gốc trang cha, còn `elementFromPoint` của tài liệu bên
     * trong iframe lại tính từ gốc khung nhìn CỦA NÓ. Hai gốc lệch nhau đúng
     * bằng vị trí iframe trên trang. Quên trừ là dò trượt sang chỗ khác — và
     * càng cuộn trang thì càng trượt xa.
     */
    quyDoi(clientX, clientY) {
      const r = iframe.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    },

    khiDoi(f) {
      nghe.add(f);
      return () => nghe.delete(f);
    },

    baoDoi: baoTick,
  };
}
