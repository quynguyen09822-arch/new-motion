/**
 * ĐO TRANG TRONG TRÌNH DUYỆT NGƯỜI DÙNG — phần máy chủ.
 *
 * VÌ SAO. Đường "Dựng từ trang" cần mở trang trong một trình duyệt thật rồi hỏi
 * `getComputedStyle`. Trên máy làm việc thì `tools/doc-html.mjs` lo, bằng Chromium
 * của Playwright. Bản triển khai là `node:22-alpine` và cố ý KHÔNG có Chromium, nên
 * đường ấy nổ `Cannot find module '/app/tools/doc-html.mjs'` — và cả Stitch, vốn đi
 * qua đúng đường ấy, chưa từng chạy được trên bản thật.
 *
 * Trình duyệt anh Quý đang dùng chính là Chromium. Nên: máy chủ phục vụ trang cần
 * đo, trình duyệt mở nó trong một iframe ẩn, chạy `web/dobocuc.js` bên trong, rồi
 * gửi bản đồ ra bằng `postMessage`.
 *
 * VÌ SAO KHÔNG DÙNG `srcdoc` CHO GỌN. Iframe `srcdoc` KẾ THỪA nguyên CSP của trang
 * sửa — mà CSP ấy là `script-src 'self'`, `font-src 'self'`, `base-uri 'self'`.
 * HTML của Stitch nạp Tailwind và Google Fonts từ CDN, nên trong `srcdoc` nó dựng
 * ra TRƠN không có style, và bản đồ đo sai hoàn toàn mà không báo lỗi gì. Phải
 * phục vụ từ một đường RIÊNG để có CSP riêng.
 *
 * AN TOÀN. Trang này là HTML người dùng dán vào hoặc lấy từ Internet — không tin.
 * Nó được phục vụ kèm CSP `sandbox allow-scripts`, tức chạy ở origin RỖNG: không
 * đọc được cookie, không gọi được API của app, không chạm được trang sửa. Ép bằng
 * đầu đề chứ không chỉ bằng thuộc tính `sandbox` của iframe — mở thẳng đường dẫn
 * này trong một thẻ mới cũng vẫn bị nhốt.
 */
import { randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { doBoCuc } from '../web/dobocuc.js';

/** Trang tạm sống bao lâu. Đủ cho một lượt đo, không đủ để thành kho chứa. */
const SONG_MS = 3 * 60_000;
/** HTML nặng hơn thế này thì không phải một màn hình, mà là cả một website. */
const TOI_DA_BYTE = 3 * 1024 * 1024;

const so = new Map();   // id → { html, chu, het }

function donCu() {
  const nay = Date.now();
  for (const [id, v] of so) if (v.het < nay) so.delete(id);
}

/* ─────────────────────── CHẶN ĐƯỜNG VÀO MẠNG NỘI BỘ ───────────────────────
 *
 * Máy chủ sẽ tải bất cứ địa chỉ nào người dùng dán vào. Không chặn thì ai đăng
 * nhập được cũng bắt máy chủ đọc hộ `http://127.0.0.1:3000/...`, hay địa chỉ
 * siêu dữ liệu của nhà cung cấp đám mây `169.254.169.254` — những chỗ chỉ máy chủ
 * mới với tới được.
 *
 * Kiểm IP SAU khi phân giải tên miền, không kiểm chuỗi địa chỉ: `http://localtest.me`
 * trông vô hại mà trỏ về 127.0.0.1.
 */
function ipNoiBo(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127);   // CGNAT, hạ tầng nội bộ hay dùng
  }
  const t = ip.toLowerCase();
  return t === '::1' || t === '::' || t.startsWith('fc') || t.startsWith('fd')
    || t.startsWith('fe80') || t.startsWith('::ffff:127.') || t.startsWith('::ffff:10.')
    || t.startsWith('::ffff:192.168.') || t.startsWith('::ffff:169.254.');
}

export async function kiemDiaChi(u) {
  let url;
  try { url = new URL(u); } catch { return 'Địa chỉ không hợp lệ.'; }
  if (!/^https?:$/.test(url.protocol)) return 'Địa chỉ phải bắt đầu bằng http:// hoặc https://';
  let ds;
  try { ds = await lookup(url.hostname, { all: true }); }
  catch { return `Không tìm thấy tên miền "${url.hostname}".`; }
  if (!ds.length || ds.some((d) => ipNoiBo(d.address))) {
    return 'Không tải được địa chỉ trong mạng nội bộ.';
  }
  return null;
}

/**
 * Tải HTML của một địa chỉ. Tự theo chuyển hướng TỐI ĐA 4 lần, và kiểm lại từng
 * chặng: một trang công khai chuyển hướng sang 127.0.0.1 là cách lách cổ điển
 * nếu chỉ kiểm địa chỉ đầu tiên.
 */
export async function taiHtml(u) {
  let dia = u;
  for (let lan = 0; lan < 5; lan += 1) {
    const loi = await kiemDiaChi(dia);
    if (loi) return { ok: false, cau: loi };
    let r;
    try {
      r = await fetch(dia, { redirect: 'manual', signal: AbortSignal.timeout(20_000),
        headers: { 'User-Agent': 'Mozilla/5.0 (Motion; do bo cuc)' } });
    } catch (e) {
      return { ok: false, cau: `Không tải được trang: ${e.message}` };
    }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      dia = new URL(r.headers.get('location'), dia).href;
      continue;
    }
    if (!r.ok) return { ok: false, cau: `Trang trả về mã ${r.status}.` };
    const html = await r.text();
    if (Buffer.byteLength(html) > TOI_DA_BYTE) {
      return { ok: false, cau: 'Trang nặng quá 3 MB — đó là cả website chứ không phải một màn hình.' };
    }
    return { ok: true, html, url: dia };
  }
  return { ok: false, cau: 'Trang chuyển hướng quá nhiều lần.' };
}

/**
 * Chèn đoạn đo vào cuối trang.
 *
 * `<base>` cho đường URL: trang tải về có đường dẫn TƯƠNG ĐỐI tới CSS và ảnh
 * (`/style.css`); phục vụ lại từ máy chủ này thì chúng trỏ nhầm sang máy chủ này.
 * Đặt `<base>` ở ĐẦU `<head>` — sau thẻ nào đã dùng đường tương đối thì vô tác dụng.
 */
/**
 * ĐOẠN VÁ ĐẶT TRƯỚC MỌI SCRIPT CỦA TRANG.
 *
 * Trang đo chạy ở origin RỖNG (sandbox). Ở đó chỉ cần ĐỌC `localStorage` hay
 * `document.cookie` là ném SecurityError — và rất nhiều website làm đúng việc ấy
 * ngay dòng đầu. Đo thật `matbao.net` 28/09: JS của trang nổ, framework của họ
 * THAY TOÀN BỘ nội dung bằng trang "This page couldn't load", và ta đo ra đúng
 * bốn khối của trang lỗi ấy — rồi AI vui vẻ dựng thành "cảnh 7 món". Thành công
 * giả, không một lời báo.
 *
 * Nên: cho trang một kho nhớ tạm trong RAM thay cho `localStorage`/`cookie` —
 * không phải cửa sau, vì nó chỉ sống trong đúng iframe này và mất khi iframe bị
 * gỡ. Và ghi lại mọi lỗi JS của trang, để phía trình duyệt biết đo có đáng tin
 * không.
 */
const VA_TRUOC = `<script>
(function () {
  var nho = function () {
    var m = new Map();
    return { getItem: function (k) { return m.has(k) ? m.get(k) : null; },
      setItem: function (k, v) { m.set(k, String(v)); }, removeItem: function (k) { m.delete(k); },
      clear: function () { m.clear(); }, key: function (i) { return Array.from(m.keys())[i] || null; },
      get length() { return m.size; } };
  };
  ['localStorage', 'sessionStorage'].forEach(function (t) {
    try { window[t].length; } catch (e) {
      try { Object.defineProperty(window, t, { value: nho(), configurable: true }); } catch (e2) {}
    }
  });
  try { document.cookie; } catch (e) {
    var c = '';
    try { Object.defineProperty(document, 'cookie', { get: function () { return c; },
      set: function (v) { c = String(v); }, configurable: true }); } catch (e2) {}
  }
  window.__motionLoi = [];
  addEventListener('error', function (e) { window.__motionLoi.push(String(e.message || 'lỗi')); });
  addEventListener('unhandledrejection', function (e) {
    window.__motionLoi.push(String((e.reason && e.reason.message) || e.reason || 'promise hỏng'));
  });
})();
</script>`;

function chenDo(html, id, url) {
  const base = (url ? `<base href="${url.replace(/"/g, '&quot;')}">` : '') + VA_TRUOC;
  const script = `<script>
(async () => {
  const doBoCuc = ${doBoCuc.toString()};
  const gui = (x) => parent.postMessage({ motionDoTrang: ${JSON.stringify(id)}, ...x }, '*');
  try {
    if (document.readyState !== 'complete') {
      await new Promise((r) => addEventListener('load', r, { once: true }));
    }
    try { await document.fonts.ready; } catch (e) {}
    /* Tailwind bản CDN sinh CSS bằng JS SAU khi trang nạp xong; đo sớm quá là
       đo một trang chưa có style. */
    await new Promise((r) => setTimeout(r, 900));
    gui({ banDo: doBoCuc(), loiJS: (window.__motionLoi || []).slice(0, 5) });
  } catch (e) {
    gui({ loi: String((e && e.message) || e) });
  }
})();
</script>`;
  let h = String(html);
  /* Chèn ĐẦU <head>: `<base>` sau thẻ đã dùng đường tương đối là vô tác dụng, và
     đoạn vá sau script của trang là vá khi trang đã nổ rồi. */
  h = /<head[^>]*>/i.test(h) ? h.replace(/<head[^>]*>/i, (m) => m + base) : base + h;
  return /<\/body>/i.test(h) ? h.replace(/<\/body>(?![\s\S]*<\/body>)/i, script + '</body>') : h + script;
}

/**
 * Cất một trang để đo. Trả `{ ok, id }`.
 * @param chu email người tạo — chỉ người đó mở được trang của mình.
 */
export async function luuTrang({ html, url, chu }) {
  donCu();
  let h = String(html || '');
  let goc = null;
  if (!h && url) {
    const t = await taiHtml(String(url).trim());
    if (!t.ok) return t;
    h = t.html; goc = t.url;
  }
  if (!h.trim()) return { ok: false, cau: 'Chưa có HTML hay địa chỉ trang.' };
  if (Buffer.byteLength(h) > TOI_DA_BYTE) {
    return { ok: false, cau: 'HTML nặng quá 3 MB — đó là cả website chứ không phải một màn hình.' };
  }
  const id = randomBytes(16).toString('hex');
  so.set(id, { html: chenDo(h, id, goc), chu: chu || '', het: Date.now() + SONG_MS });
  return { ok: true, id };
}

/** Lấy trang đã cất, hoặc null. Người khác (khác email) không lấy được. */
export function layTrang(id, chu) {
  donCu();
  const v = so.get(String(id || ''));
  if (!v) return null;
  if (v.chu && v.chu !== (chu || '')) return null;
  return v.html;
}

/** CSP của trang đo. Xem ghi chú đầu file về `sandbox`. */
export const CSP_DO_TRANG = [
  'sandbox allow-scripts',
  "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'",
  "frame-ancestors 'self'",
].join('; ');
