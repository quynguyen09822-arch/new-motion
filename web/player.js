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
 * BẪY 2 — `seek()` KHÔNG dừng phim.
 *   Trong `scene-player.html`, `DUNG` chỉ bật lên ở đúng hai chỗ: lúc khai báo,
 *   và khi phim chạy hết (`if (t >= DUR) DUNG = true`). `seek` chỉ vẽ lại MỘT
 *   khung hình rồi vòng lặp chạy tiếp ngay nhịp sau. File này từng dừng phim
 *   bằng `seek(at())` và ghi chú rằng làm vậy là dừng — không đúng: nhãn nút đổi
 *   thành "Chạy" mà phim vẫn trôi. Nay bộ dựng có `pause()` thật, xem
 *   `docs/DUNG-CHAY.md`.
 *
 * BẪY 3 — phép quy đổi pixel màn hình ↔ toạ độ sân khấu.
 *   Giữa hai thứ đó có ĐÚNG HAI tầng phóng to: `#stage` (co cho vừa khung) và
 *   `#cam` (máy quay). KHÔNG phải transform của chính món đang kéo — transform
 *   của nó còn chứa `measureFit()`, hiệu ứng bay vào, và nhịp đập, tất cả đều
 *   được áp SAU khi `left/top` đã đặt. Lấy nhầm là kéo đi một đằng chuột đi một nẻo.
 */

const CHO_TOI_DA = 15000; // scene-player fetch JSON không đồng bộ, phải chờ

export function taoPlayer(iframe) {
  let win = null;
  let clip = null;
  /*
   * Cờ dự phòng, CHỈ dùng khi bộ dựng không có `paused` (bản cũ, hoặc file đã bị
   * ai đó thay mất). Nguồn sự thật là `clip.paused` — tự giữ một lá cờ riêng thì
   * nó lệch ngay lần đầu phim tự chạy hết: bộ dựng đứng lại mà cờ vẫn báo đang
   * chạy, nút kẹt ở nhãn "Dừng".
   */
  let coDuDoan = false;
  let giuTai = null;       // vòng giữ chỗ, chỉ dùng khi thiếu `pause()`
  let giuGiay = 0;         // giây mà vòng giữ đang ghim — biến SỐNG, không chụp cứng
  const nghe = new Set();

  /** Bộ dựng đang chạy hay đang đứng. */
  function dangChayThat() {
    if (!clip) return false;
    return typeof clip.paused === 'boolean' ? !clip.paused : coDuDoan;
  }

  const oCuoi = () => Boolean(clip) && clip.at() >= clip.duration - 1e-3;

  /** Tắt vòng giữ chỗ của đường lùi. Gọi trước mọi thao tác đổi thời gian. */
  function thoiGiu() {
    if (giuTai != null) { cancelAnimationFrame(giuTai); giuTai = null; }
  }

  function baoTick() {
    for (const f of nghe) f();
  }

  /*
   * Đồng hồ của trang cha, chỉ để cập nhật thanh thời gian — không lái gì cả.
   *
   * Vẫn phải báo thêm MỘT nhịp sau khi phim đứng lại, nếu không: phim chạy hết,
   * bộ dựng tự đặt `DUNG = true`, nhưng trang cha đã thôi báo nên nút vẫn đứng
   * nguyên nhãn "❚❚ Dừng" và đồng hồ đóng băng.
   */
  /*
   * HỆ SỐ PHÓNG CỦA TRANG CHA (nút Ctrl + lăn chuột). Mặc định 1.
   *
   * Nó KHÔNG nằm trong iframe nên `hesoPhong()` không thấy — mà mọi phép quy đổi
   * chuột đều phải tính nó, nếu không: phóng to 2 lần rồi bấm là trúng chỗ cách
   * đó gấp đôi, kéo một phân thì món nhảy hai phân.
   */
  let layPhongCha = () => 1;

  let chayNhipTruoc = false;
  function vongLap() {
    const chay = dangChayThat();
    if (clip && (chay || chayNhipTruoc)) baoTick();
    chayNhipTruoc = chay;
    requestAnimationFrame(vongLap);
  }
  requestAnimationFrame(vongLap);

  return {
    /**
     * Mở một clip. `duongDan` là đường dẫn tương đối của chính server này
     * (vd `/clip/scene-player.html?scene=cta`) — cùng origin, nếu không thì
     * không với được vào `contentDocument`.
     *
     * ⚠️ CLIP ĐỜI MỚI: tuyệt đối KHÔNG thêm `export=1`. Tham số đó tắt `fit()`,
     * sân khấu sẽ không co cho vừa khung nữa và mọi phép đo đều lệch — mà clip
     * đời mới thì SỬA được, nên phép đo phải đúng.
     *
     * CLIP ĐỜI CŨ (`doiClip` = 1) thì ngược lại: ta CỐ Ý bật `export=1`.
     *
     * Những trang ấy chỉ dựng `window.__clip` bên trong nhánh `if (export=1)`.
     * Không bật thì không có `__clip`, và trước đây ta đành để trang tự chạy
     * lấy — kết quả là nút Chạy và thanh tua chết cứng, đồng hồ ghi "trang tự
     * chạy", xem xong một clip 90 giây phải ngồi đợi đủ 90 giây. Đo thử cả 12
     * clip đời cũ: **cả 12 đều phơi ra `duration/ready/play/at/seek/step`** —
     * tức là cái transport ta cần vốn đã nằm sẵn ở đó.
     *
     * Đánh đổi: `export=1` tắt `fit()`, sân khấu ra đúng cỡ gốc (1280×720 hoặc
     * 720×1280) và tràn khỏi iframe. Không sao — clip đời cũ KHÔNG sửa được nên
     * chẳng có phép đo nào để mà lệch. Trang cha tự lo phần thu nhỏ: đặt iframe
     * đúng cỡ gốc rồi `scale` nó, xem `khoTho()`.
     *
     * Trang nào không phơi `__clip` thì nạp lại bản trần và về đúng nếp cũ.
     */
    async mo(duongDan, doiClip = 2) {
      thoiGiu();
      clip = null;
      win = null;
      await new Promise((xong, hong) => {
        iframe.onload = xong;
        iframe.onerror = () => hong(new Error('Không mở được khung xem.'));
        iframe.src = doiClip === 2 ? duongDan
          : duongDan + (duongDan.includes('?') ? '&' : '?') + 'export=1';
      });
      win = iframe.contentWindow;

      if (doiClip !== 2) {
        // Đã nạp kèm `export=1` ở trên; chờ `__clip` hiện ra.
        const hanCu = Date.now() + CHO_TOI_DA;
        while (!win.__clip) {
          if (Date.now() > hanCu) {
            // Không phơi `__clip` — nạp lại bản trần, về đúng nếp cũ.
            await new Promise((xong) => { iframe.onload = xong; iframe.src = duongDan; });
            win = iframe.contentWindow;
            coDuDoan = true; // trang đời cũ tự chạy lấy
            baoTick();
            return null;
          }
          await new Promise((r) => setTimeout(r, 50));
        }
        clip = win.__clip;
        await clip.ready();
        coDuDoan = false;
        baoTick();
        return clip;
      }

      const han = Date.now() + CHO_TOI_DA;
      while (!win.__clip) {
        if (Date.now() > han) throw new Error('Khung xem không phản hồi — có thể kịch bản hỏng.');
        await new Promise((r) => setTimeout(r, 50));
      }
      clip = win.__clip;
      await clip.ready();
      coDuDoan = false;
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
      const dangDung = !dangChayThat();
      const giuGiay = clip.at();
      clip.load(doc);
      // load() vừa render(0) — tua lại chỗ cũ, kẹp trong thời lượng mới vì
      // sửa kịch bản có thể làm clip ngắn đi.
      clip.seek(Math.min(giuGiay, Math.max(0, clip.duration - 0.001)));
      // `load()` gọi `render(0)` chứ không đụng tới `DUNG`, nên đang dừng mà sửa
      // kịch bản thì vẫn đang dừng — trừ khi trước đó ta dừng bằng đường lùi,
      // lúc ấy phải bật lại vòng giữ vì `nap` vừa cắt nó.
      if (dangDung && typeof clip.pause === 'function') clip.pause();
      else if (giuTai != null) giuGiay = clip.at();   // đường lùi: ghim lại chỗ mới
      baoTick();
    },

    tua(giay) {
      if (!clip) return;
      const moi = Math.max(0, Math.min(giay, clip.duration));
      // Đang dừng bằng đường lùi thì DỜI chỗ ghim chứ đừng tắt vòng giữ — tắt là
      // hoá ra đang chạy trở lại; còn không dời thì vòng giữ lôi ngược về chỗ cũ
      // và thanh tua nhảy lại như bị ma làm.
      giuGiay = moi;
      clip.seek(moi);
      baoTick();
    },

    /**
     * Chạy. Đang đứng ở CUỐI phim thì quay về đầu rồi mới chạy.
     *
     * Không có bước quay về đầu ấy thì nút kẹt cứng: bộ dựng đặt `DUNG = true`
     * khi `t >= DUR`, nên `play()` vừa bật `DUNG = false` là nhịp sau nó bật lại
     * ngay. Người dùng bấm Chạy mà không có gì nhúc nhích, không hiểu vì sao.
     */
    chay() {
      if (!clip) return;
      thoiGiu();
      if (oCuoi()) clip.seek(0);
      clip.play();
      coDuDoan = true;
      baoTick();
    },

    /** Dừng tại chỗ. */
    dung() {
      if (!clip) return;
      coDuDoan = false;
      if (typeof clip.pause === 'function') {
        clip.pause();
      } else {
        /*
         * ĐƯỜNG LÙI cho bộ dựng thiếu `pause()` — `scene-player.html` là file của
         * dự án chung, có người sửa hằng ngày, và `docs/DUNG-CHAY.md` ghi rõ đoạn
         * thêm vào đó có thể biến mất khi ai đó thay cả file.
         *
         * Giữ chỗ bằng cách mỗi nhịp tua lại đúng giây đang đứng. Phim vẫn nhích
         * trong lòng một khung hình rồi bị kéo về, nên hơi rung — nhưng đứng gần
         * đúng chỗ vẫn hơn là chạy tiếp trong khi nút ghi "Chạy".
         */
        thoiGiu();
        giuGiay = clip.at();
        const giu = () => {
          if (!clip) return;
          clip.seek(giuGiay);
          giuTai = requestAnimationFrame(giu);
        };
        giu();
      }
      baoTick();
    },

    dangChay: dangChayThat,
    giay: () => (clip ? clip.at() : 0),
    thoiLuong: () => (clip ? clip.duration : 0),
    /* Clip đời cũ có `__clip` nhưng KHÔNG có `scenes()` — nó không chia cảnh.
       Gọi thẳng là ném TypeError giữa vòng lặp vẽ, và vòng lặp thì chạy mỗi
       nhịp hình nên lỗi đổ ra hàng trăm dòng. Hỏi trước rồi hãy gọi. */
    dsCanh: () => (typeof clip?.scenes === 'function' ? clip.scenes() : []),

    /** Cảnh đang hiện ở giây hiện tại. */
    canhHienTai() {
      if (!clip) return null;
      if (typeof clip.scenes !== 'function') return null;   // clip đời cũ: không chia cảnh
      const t = clip.at();
      const ds = clip.scenes();
      return ds.find((c) => t >= c.start && t < c.start + c.duration) || ds[ds.length - 1] || null;
    },

    tai() {
      return win?.document ?? null;
    },

    /**
     * KHỔ GỐC của sân khấu bên trong — chỉ có nghĩa với clip đời cũ chạy
     * `export=1`, vì lúc đó trang không tự co nữa.
     *
     * Mỗi clip một khổ: đo thật 12 clip ra 1280×720, 720×1280 và vài trang lấy
     * chiều cao theo cửa sổ. Nên phải ĐO, không được đoán 16:9.
     */
    khoTho() {
      const d = win?.document;
      const n = d?.querySelector('#stage, .stage');
      if (!n || !n.offsetWidth || !n.offsetHeight) return null;
      return { w: n.offsetWidth, h: n.offsetHeight };
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
      // Nhân cả phóng của trang cha: `dx` mà `drag.js` đo được là pixel MÀN HÌNH,
      // đã đi qua cả hai tầng phóng trong iframe LẪN tầng phóng của trang cha.
      return doc(d.querySelector('#stage')) * doc(d.querySelector('#cam')) * (layPhongCha() || 1);
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
      // Chia cho hệ số phóng của trang cha: `r` đã là khung ĐÃ PHÓNG, còn
      // `elementFromPoint` bên trong iframe thì tính bằng pixel CHƯA phóng.
      const z = layPhongCha() || 1;
      return { x: (clientX - r.left) / z, y: (clientY - r.top) / z };
    },

    /** Trang cha khai hệ số phóng của nó vào đây. Xem `web/zoom.js`. */
    datPhongCha(f) { layPhongCha = typeof f === 'function' ? f : () => 1; },

    /**
     * Nghe lăn chuột NGAY TRONG tài liệu của iframe.
     *
     * Sự kiện chuột không vượt qua ranh giới iframe, nên trang cha không thấy cú
     * lăn nào xảy ra bên trong. Với clip đời 2 thì lớp bắt phủ kín nên không sao;
     * clip đời cũ thì lớp bắt bị ẩn, và nếu không có hàm này thì Ctrl+lăn ngay
     * trên khung hình không ăn — chỉ ăn ở viền ngoài, một tính năng nửa vời.
     *
     * Đây là GẮN NGHE, không phải ghi vào DOM: không thêm bớt thẻ nào, không đổi
     * kiểu dáng gì, nên trang đem đi quay phim vẫn sạch. Mà bộ xuất cũng mở trang
     * bằng trình duyệt riêng của nó, không dính gì tới trình sửa.
     */
    ngheLan(f) {
      const d = win?.document;
      if (!d) return () => {};
      d.addEventListener('wheel', f, { passive: false });
      return () => d.removeEventListener('wheel', f);
    },

    khiDoi(f) {
      nghe.add(f);
      return () => nghe.delete(f);
    },

    baoDoi: baoTick,
  };
}
