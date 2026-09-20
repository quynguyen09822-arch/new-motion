/**
 * Ô XEM THỬ — một ô nhỏ diễn lại đúng một chuyển động hoặc một mức hiệu ứng.
 *
 * Nền của cả đợt `BANG-CHINH-V2.md`: gói chuyển động (Việc 2) và popup hiệu ứng
 * (Việc 1) đều cần đúng thứ này. Viết một lần, hai chỗ xài — viết hai lần là hai
 * lần sai khác nhau.
 *
 * BỐN ĐIỀU ĐÁNG NÓI
 *
 * 1. **Diễn bằng chính bộ dựng thật**, không vẽ tay animation riêng. Mỗi ô là
 *    một iframe `scene-player.html` nạp một cảnh tí hon từ `/api/canh-mau`. Vẽ
 *    tay thì ô xem thử và clip thật sẽ trôi khỏi nhau, mà xem thử nói dối còn
 *    tệ hơn không có xem thử.
 *
 * 2. **Không tự chạm `window.__clip`.** Luật 2 trong `CLAUDE.md`: chỉ
 *    `player.js` được chạm. May là `taoPlayer(iframe)` vốn đã là một nhà máy
 *    nhận iframe, nên ô xem thử gọi lại đúng hàm đó — không mở thêm một đường
 *    chạm nào.
 *
 * 3. **Chỉ dựng iframe khi ô lọt vào tầm nhìn, và dừng khi ra khỏi.** Mỗi ô là
 *    một bộ dựng đầy đủ. Đo thật: 10 ô cùng chạy thì trang cha còn 52 nhịp/giây,
 *    16 ô còn 51 — chịu được, nhưng đó là lúc máy rảnh. Máy đang xuất video thì
 *    khác hẳn, nên vẫn phải dừng ô khuất.
 *
 * 4. **Lệch pha.** Mười ô cùng bắt đầu một lúc thì thành một nhịp giật đồng
 *    loạt, rối mắt. Mỗi ô vào muộn hơn ô trước một chút (`lech`) để cả dải
 *    thành một làn sóng. Đây là đường giữa Quý chốt, thay cho hai lựa chọn
 *    "lặp hết" và "rê chuột mới diễn".
 */
import { taoPlayer } from '../player.js';

/** Nghỉ giữa hai lượt diễn, cho mắt kịp nhận ra một lượt đã xong. */
const NGHI = 250;

/* Kéo thanh trượt bắn ra vài chục lượt mỗi giây. Không gộp thì mỗi lượt là một
   lần nạp lại cảnh — ô giật và máy chủ bị hỏi liên hồi. 150ms vẫn nằm trong
   mốc "đổi theo trong khoảng nửa giây" của BANG-CHINH-V2.md. */
const GOP = 150;

/** Công tắc một dòng: đổi `false` là chuyển sang rê-chuột-mới-diễn. */
export const LAP_LIEN_TUC = true;

const duong = (y) => {
  const q = new URLSearchParams();
  q.set('mau', y.mau || 'the');
  if (y.vao) q.set('vao', y.vao);
  if (y.ra) q.set('ra', y.ra);
  for (const [k, v] of Object.entries(y.hieuUng || {})) {
    if (Number(v) > 0) q.set(k, String(v));
  }
  if (y.dai) q.set('dai', String(y.dai));
  return `/api/canh-mau?${q}`;
};

/**
 * Dựng một ô xem thử.
 *
 * @param {object}  y
 * @param {Element} y.hop       chỗ gắn ô vào
 * @param {string}  [y.mau]     món mẫu: 'the' (mặc định) · 'anh' · 'khung'
 * @param {string}  [y.vao]     id một gói trong KHO_VAO
 * @param {string}  [y.ra]      id một gói trong KHO_RA
 * @param {object}  [y.hieuUng] { soft, softIn, shadow, maskSoft, push, pushOut }
 * @param {boolean} [y.lap]     diễn xong diễn lại (mặc định theo LAP_LIEN_TUC)
 * @param {number}  [y.lech]    lệch pha, tính bằng giây
 * @param {string}  [y.nhan]    chữ đọc cho máy đọc màn hình
 * @returns {{phanTu:Element, dat:Function, chay:Function, dung:Function, huy:Function}}
 */
export function taoOXemThu(y = {}) {
  let dat = { mau: 'the', lap: LAP_LIEN_TUC, lech: 0, hieuUng: {}, ...y };

  const phanTu = document.createElement('div');
  phanTu.className = 'o-xem-thu';
  phanTu.setAttribute('role', 'img');
  if (dat.nhan) phanTu.setAttribute('aria-label', `Xem thử: ${dat.nhan}`);

  let khung = null;      // iframe, chỉ dựng khi ô lọt vào tầm nhìn
  let may = null;        // taoPlayer(khung)
  let boNghe = null;
  let hen = null;        // hẹn giờ cho lượt diễn kế
  let henGop = null;     // hẹn giờ gộp nhịp của dat()
  let thay = false;      // ô có đang trong tầm nhìn không
  let daHuy = false;

  const thoiHen = () => { clearTimeout(hen); hen = null; };

  /* Diễn xong thì hẹn diễn lại. Bám vào `dangChay()` của player chứ không tự
     đếm giờ: bộ dựng tự dừng khi hết cảnh, tự đếm thì hai bên lệch dần. */
  const theoDoi = () => {
    if (!may || !dat.lap || daHuy) return;
    if (!may.dangChay() && !hen && thay) {
      hen = setTimeout(() => { hen = null; if (thay && !daHuy) may?.chay(); }, NGHI);
    }
  };

  /* LẦN ĐẦU: đi qua `may.mo()`, KHÔNG đặt thẳng `iframe.src`.
     Đặt thẳng thì `taoPlayer` không bao giờ gán được `clip` — nó chờ `__clip`
     hiện ra bên trong khung xem rồi mới gọi `ready()`. Bỏ qua bước đó thì
     `san()` mãi là false, `chay()` thành lệnh rỗng, và ô đứng im mà chẳng báo
     gì. Em đã dính đúng bẫy này: sáu ô cùng đứng ở giây 0. */
  const napLanDau = async () => {
    if (!may || daHuy) return;
    try {
      await may.mo(`/clip/scene-player.html?scene=${encodeURIComponent(duong(dat))}`);
    } catch { return; }          // khung xem không lên: để ô trống, đừng làm đổ bảng
    if (!daHuy && thay) chay();
  };

  /* ĐỔI GIÁ TRỊ: nạp thẳng kịch bản mới vào bộ dựng đang sống, KHÔNG tải lại cả
     trang. Tải lại trang là dựng lại toàn bộ bộ dựng cho mỗi nấc thanh trượt —
     chậm hơn hẳn, và nhấp nháy. */
  const napLai = async () => {
    if (!may?.san() || daHuy) return;
    let doc;
    try {
      const r = await fetch(duong(dat), { cache: 'no-store' });
      if (!r.ok) return;
      doc = await r.json();
    } catch { return; }
    if (daHuy || !may?.san()) return;
    may.nap(doc);
    may.tua(0);
    if (thay) may.chay();
  };

  const dung = () => {
    thoiHen();
    may?.dung();
  };

  const chay = () => {
    if (!may?.san()) return;
    /* Lệch pha chỉ tính ở LƯỢT ĐẦU. Cộng vào mọi lượt thì các ô trôi dần ra xa
       nhau tới mức dải trông như hỏng. */
    const cho = Math.max(0, Number(dat.lech) || 0) * 1000;
    thoiHen();
    hen = setTimeout(() => { hen = null; if (!daHuy) may?.chay(); }, cho);
  };

  const dungKhung = () => {
    if (khung || daHuy) return;
    khung = document.createElement('iframe');
    khung.className = 'o-xem-thu-khung';
    khung.setAttribute('tabindex', '-1');
    khung.setAttribute('aria-hidden', 'true');
    khung.setAttribute('scrolling', 'no');
    phanTu.append(khung);
    may = taoPlayer(khung);
    boNghe = may.khiDoi(theoDoi);
    napLanDau();
  };

  const goKhung = () => {
    thoiHen();
    boNghe?.(); boNghe = null;
    may = null;
    khung?.remove(); khung = null;
  };

  /* Chỉ dựng khi ô lọt vào tầm nhìn. `rootMargin` dương một chút để ô kịp sẵn
     sàng trước khi người dùng cuộn tới, không thì thấy một ô trắng rồi mới có
     hình. */
  const doi = new IntersectionObserver((ds) => {
    for (const x of ds) {
      thay = x.isIntersecting;
      if (thay) { dungKhung(); if (may?.san()) chay(); }
      else dung();
    }
  }, { rootMargin: '120px' });
  doi.observe(phanTu);

  return {
    phanTu,

    /** Đổi giá trị rồi diễn lại. Gộp nhịp, nên kéo thanh trượt không giật. */
    dat(moi = {}) {
      dat = { ...dat, ...moi, hieuUng: { ...dat.hieuUng, ...(moi.hieuUng || {}) } };
      if (moi.nhan) phanTu.setAttribute('aria-label', `Xem thử: ${moi.nhan}`);
      clearTimeout(henGop);
      henGop = setTimeout(() => {
        henGop = null;
        if (!khung || daHuy) return;
        napLai();
      }, GOP);
    },

    chay,
    dung,

    /** BẮT BUỘC gọi khi đóng bảng — không gọi là để lại một bộ dựng chạy ngầm. */
    huy() {
      daHuy = true;
      clearTimeout(henGop); henGop = null;
      doi.disconnect();
      goKhung();
      phanTu.remove();
    },
  };
}

/**
 * Dựng một dải nhiều ô, tự rải lệch pha.
 *
 * Để ở đây chứ không bắt mỗi chỗ gọi tự tính: cả hai nơi dùng (dải gói chuyển
 * động, bảng hiệu ứng) đều cần đúng phép rải này, và rải khác nhau thì hai chỗ
 * trông như hai sản phẩm.
 */
export function taoDaiXemThu(ds, chung = {}) {
  const lech = buocLech(ds.length, Number(chung.dai) || 1.6);
  return ds.map((x, i) => taoOXemThu({ ...chung, ...x, lech: lech[i] }));
}

/**
 * Mỗi ô vào muộn bao nhiêu giây.
 *
 * Tách ra thành hàm THUẦN để kiểm được thẳng. Trước đó em kiểm lệch pha bằng
 * cách đo giây của từng ô lúc đang chạy, và phép kiểm ấy **xanh cả khi đã bỏ
 * hẳn lệch pha** — vì các ô vốn nạp xong lệch nhau sẵn, nhiễu đó che mất thứ
 * cần đo. Đo thật thì: có rải, sáu ô trải rộng 1.27 giây; bỏ rải, chỉ 0.16 giây.
 *
 * Rải đều trong MỘT vòng diễn, không cộng dồn mãi: 11 ô mà mỗi ô muộn hơn 0.2s
 * thì ô cuối vào sau ô đầu 2 giây — lúc nó vào thì ô đầu đã diễn xong lâu rồi,
 * dải gãy làm đôi chứ không thành làn sóng.
 */
export function buocLech(soO, vong = 1.6) {
  const n = Math.max(0, soO | 0);
  if (n <= 1) return n === 1 ? [0] : [];
  const buoc = vong / n;
  return Array.from({ length: n }, (_, i) => i * buoc);
}
