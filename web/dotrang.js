/**
 * ĐO TRANG NGAY TRONG TRÌNH DUYỆT NÀY — phần trình duyệt.
 *
 * Bản triển khai không có Chromium nên không tự đo được trang; trình duyệt người
 * dùng thì có (nó CHÍNH LÀ Chromium). Máy chủ cất trang lại, ta mở nó trong một
 * iframe ẩn đúng bằng khổ clip, trang tự đo bằng `web/dobocuc.js` rồi gửi bản đồ
 * ra đây. Toàn bộ lý do nằm ở đầu `server/dotrang.js`.
 *
 * IFRAME PHẢI ĐÚNG KHỔ CLIP. Đo một trang ở bề rộng 1600 rồi đem toạ độ đặt vào
 * clip 1280 là lệch hết. Đặt bề rộng iframe = bề rộng clip để trang TỰ DÀN LẠI
 * theo khổ thật, y như `doc-html.mjs` đặt cửa sổ Chromium.
 *
 * ĐẨY RA NGOÀI MÀN HÌNH, KHÔNG `display:none`. Phần tử `display:none` không có bố
 * cục — đo ra toàn số 0. `visibility:hidden` thì có bố cục nhưng trình duyệt có
 * thể không nạp phông cho chữ không hiện, và cỡ chữ đo được lại là cỡ của phông
 * dự phòng.
 */

/**
 * TRANG ĐO ĐƯỢC CÓ PHẢI TRANG THẬT KHÔNG, hay là trang báo lỗi của nó.
 *
 * Đã xảy ra thật: JS của `matbao.net` nổ trong sandbox, framework của họ thay cả
 * trang bằng "This page couldn't load", ta đo ra bốn khối của trang lỗi ấy, và
 * AI dựng thành "cảnh 7 món". Người dùng thấy ô xanh "ra cảnh" — trong khi cảnh
 * ấy là một trang báo lỗi. Thành công GIẢ là kết cục tệ nhất có thể có ở đây,
 * tệ hơn hẳn một câu báo lỗi rõ ràng.
 *
 * Chỉ chặn khi CHẮC: trang có lỗi JS VÀ đo ra quá nghèo, hoặc chữ trên trang là
 * chữ báo lỗi quen thuộc. Một trang Stitch sạch có 10–100 khối và không lỗi JS.
 *
 * @returns câu báo nếu hỏng, `null` nếu dùng được
 */
export function trangHong(banDo, loiJS = []) {
  const khoi = banDo?.khoi || [];
  const chu = khoi.map((k) => k.chu || '').join(' ');
  const coChuLoi = /couldn.?t load|application error|something went wrong|page (is )?not found|reload to try again|đã xảy ra lỗi|không tải được trang/i
    .test(chu);
  if (coChuLoi || (loiJS.length && khoi.length < 8)) {
    return 'Trang này chạy JavaScript nặng và bị hỏng khi mở để đo, nên chỉ đo được '
      + (coChuLoi ? 'trang báo lỗi của nó' : `${khoi.length} khối`) + ' — dựng ra sẽ không giống. '
      + 'Cách chắc hơn: chụp màn hình trang ấy rồi dùng ô ① (ảnh), '
      + 'hoặc dùng ô ③ để Stitch vẽ lại.';
  }
  return null;
}

/** Một trang Stitch nạp Tailwind + phông từ CDN rồi chờ thêm gần một giây. */
const HAN_MS = 60_000;

/**
 * @returns {Promise<object>} bản đồ bố cục, cùng khuôn với `tools/doc-html.mjs`
 * @throws  Error với câu tiếng Việt
 */
export async function doTrang({ html, url, rong, cao }) {
  const r = await fetch('/api/do-trang', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(url ? { url } : { html }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(d.loi || d.cau || 'Máy chủ không cất được trang để đo.');

  const khung = document.createElement('iframe');
  /* `allow-scripts` và KHÔNG có `allow-same-origin`: trang lạ chạy ở origin rỗng,
     không đụng được trang sửa. Máy chủ cũng ép y như vậy bằng đầu đề CSP. */
  khung.setAttribute('sandbox', 'allow-scripts');
  khung.setAttribute('aria-hidden', 'true');
  khung.tabIndex = -1;
  Object.assign(khung.style, {
    position: 'fixed', left: '-100000px', top: '0',
    width: `${rong}px`, height: `${cao}px`,
    border: '0', pointerEvents: 'none',
  });

  try {
    return await new Promise((xong, hong) => {
      const hen = setTimeout(() => {
        removeEventListener('message', nghe);
        hong(new Error('Đo trang quá lâu (hơn 60 giây) — trang có thể đang chờ một thứ không tải được.'));
      }, HAN_MS);

      function nghe(ev) {
        /* Chỉ nhận tin từ ĐÚNG iframe này và ĐÚNG mã lượt đo này. Trang lạ nào
           khác trên máy cũng gửi được `postMessage` tới đây. */
        if (ev.source !== khung.contentWindow) return;
        if (!ev.data || ev.data.motionDoTrang !== d.id) return;
        clearTimeout(hen);
        removeEventListener('message', nghe);
        if (ev.data.loi) return hong(new Error(`Trang đo hỏng: ${ev.data.loi}`));
        if (!ev.data.banDo?.khoi) return hong(new Error('Trang đo không trả về bản đồ.'));
        const kiem = trangHong(ev.data.banDo, ev.data.loiJS || []);
        if (kiem) return hong(new Error(kiem));
        xong(ev.data.banDo);
      }
      addEventListener('message', nghe);
      khung.src = `/do-trang/${d.id}`;
      document.body.appendChild(khung);
    });
  } finally {
    khung.remove();
  }
}
