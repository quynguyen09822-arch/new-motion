#!/usr/bin/env node
/**
 * KIỂM ĐO TRANG TRONG TRÌNH DUYỆT NGƯỜI DÙNG.
 *
 * VÌ SAO BÀI NÀY TỒN TẠI. Bản triển khai không có Chromium, nên đường "Dựng từ
 * trang" — và cả Stitch, vốn đi qua đó — chưa từng chạy được trên bản thật: nó nổ
 * `Cannot find module '/app/tools/doc-html.mjs'` ngay trước mắt anh Quý (28/09).
 * Bộ kiểm cũ không bắt được vì nó chạy trên máy làm việc, nơi Chromium có sẵn.
 *
 * Nay trình duyệt người dùng tự đo rồi gửi bản đồ lên. Bài này canh bốn điều:
 *
 *   ① Trang đo phục vụ kèm CSP `sandbox` — HTML lạ chạy ở origin RỖNG, không đụng
 *      được trang sửa, kể cả khi ai đó mở thẳng đường dẫn ấy trong thẻ mới.
 *   ② Tải trang theo địa chỉ KHÔNG được với vào mạng nội bộ.
 *   ③ CDN (Tailwind) PHẢI chạy được trong trang đo. Đây là cái bẫy lặng lẽ nhất:
 *      `srcdoc` thừa kế CSP `script-src 'self'` của trang sửa, trang Stitch dựng
 *      ra trơn không style, và bản đồ sai hoàn toàn mà KHÔNG báo lỗi gì.
 *   ④ Bản đồ trình duyệt gửi lên được làm sạch trước khi vào lời nhắc AI.
 *
 *   node tools/kiem-do-trang.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};
const goi = async (duong, than) => {
  const r = await fetch(`${GOC}${duong}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });
  return { ma: r.status, ...(await r.json().catch(() => ({}))) };
};

/* ---------- ① trang đo bị nhốt ---------- */
console.log('\n① Trang đo chạy trong sandbox');
const cat = await goi('/api/do-trang', { html: '<html><body><h1>Xin chào</h1></body></html>' });
dat('cất được trang, trả mã', cat.ok === true && /^[0-9a-f]{32}$/.test(cat.id || ''), cat.id || cat.loi);
if (cat.id) {
  const r = await fetch(`${GOC}/do-trang/${cat.id}`);
  const csp = r.headers.get('content-security-policy') || '';
  dat('phục vụ kèm CSP `sandbox allow-scripts`', /sandbox allow-scripts/.test(csp), csp.slice(0, 40));
  /* `allow-same-origin` mà lọt vào là trang lạ đọc được mọi thứ của trang sửa. */
  dat('KHÔNG có `allow-same-origin`', !/allow-same-origin/.test(csp));
  dat('chỉ trang mình nhúng được', /frame-ancestors 'self'/.test(csp));
  const h = await r.text();
  dat('trang có kèm đoạn đo', /motionDoTrang/.test(h) && /function doBoCuc/.test(h));
}
const la = await fetch(`${GOC}/do-trang/${'0'.repeat(32)}`);
dat('mã không có thì 404, không lộ gì', la.status === 404, `mã ${la.status}`);

/* ---------- ② không với vào mạng nội bộ ---------- */
console.log('\n② Tải theo địa chỉ không với vào mạng nội bộ');
for (const u of ['http://127.0.0.1:3000/', 'http://localhost/', 'http://169.254.169.254/latest/meta-data/',
  'http://10.0.0.1/', 'http://192.168.1.1/', 'file:///etc/passwd']) {
  const k = await goi('/api/do-trang', { url: u });
  dat(`chặn ${u}`, k.ok !== true, (k.loi || '').slice(0, 50));
}

/* ---------- ④ làm sạch bản đồ gửi lên ---------- */
console.log('\n④ Bản đồ trình duyệt gửi lên được làm sạch');
{
  /* Chỉ soát CỬA, không gọi AI: gửi một bản đồ bậy và xem máy chủ có từ chối
     đúng không. Gọi AI để kiểm một cửa chặn là tốn tiền vô ích. */
  const sai = await goi('/api/tu-html', { slug: 'cta', banDo: { khoi: 'không phải mảng' } });
  dat('bản đồ sai khuôn bị từ chối', sai.ok === false && /khuôn/.test(sai.loi || sai.cau || ''),
    (sai.loi || sai.cau || '').slice(0, 50));
}

/* ---------- ⑤ không bao giờ nhận trang lỗi làm kết quả ---------- */
console.log('\n⑤ Trang báo lỗi KHÔNG được tính là đo thành công');
{
  /* Đã xảy ra thật với `matbao.net` (28/09): JS của trang nổ trong sandbox,
     framework thay cả trang bằng "This page couldn't load", ta đo ra 4 khối của
     trang lỗi, và AI dựng thành "cảnh 7 món". Thành công GIẢ, không một lời báo. */
  const { trangHong } = await import(path.join(M, 'web', 'dotrang.js'));
  const trangLoi = { khoi: [
    { chu: 'This page couldn’t load' }, { chu: 'Reload to try again, or go back.' },
    { chu: 'Reload' }, { chu: 'Back' } ] };
  dat('đúng bốn khối trang lỗi của matbao.net thì CHẶN', Boolean(trangHong(trangLoi, [])));
  dat('câu chặn chỉ đường khác đi được (ảnh hoặc Stitch)',
    /ô ①|ô ③/.test(trangHong(trangLoi, []) || ''));
  dat('trang nghèo KÈM lỗi JS thì chặn',
    Boolean(trangHong({ khoi: [{ chu: 'x' }, { chu: 'y' }] }, ['ReferenceError: a is not defined'])));
  /* Chỉ chặn khi CHẮC. Chặn nhầm một trang Stitch sạch là tắt tính năng đúng lúc
     nó làm việc tốt nhất. */
  const sach = { khoi: Array.from({ length: 15 }, (_, i) => ({ chu: `Mục ${i}` })) };
  dat('trang sạch nhiều khối, không lỗi JS → KHÔNG chặn', trangHong(sach, []) === null);
  dat('trang ít khối nhưng KHÔNG có lỗi JS → không chặn (có thể là trang tối giản thật)',
    trangHong({ khoi: [{ chu: 'Xin chào' }] }, []) === null);
}

/* ---------- ③ đo thật trong trình duyệt, có CDN ---------- */
console.log('\n③ Đo thật trong trình duyệt — CDN phải chạy được');
const trinh = await chromium.launch();
try {
  const t = await trinh.newPage({ viewport: { width: 1400, height: 900 } });
  await t.goto(`${GOC}/sua?clip=cta`, { waitUntil: 'load' });
  await t.waitForTimeout(3000);
  /* Trang dùng Tailwind từ CDN, đúng như trang Stitch xuất ra. `bg-emerald-800`
     phải đo ra đúng #065f46 — có nghĩa là script CDN ĐÃ CHẠY trong trang đo. */
  const kq = await t.evaluate(async () => {
    const { doTrang } = await import('/dotrang.js');
    const html = '<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head>'
      + '<body><div class="bg-emerald-800 text-white p-8 text-3xl">Mắt Bão</div>'
      + '<div class="bg-slate-50 p-6 m-4 rounded-xl"><h2 class="text-2xl font-bold">Gói Khởi đầu</h2></div></body></html>';
    try {
      const b = await doTrang({ html, rong: 1280, cao: 720 });
      return { ok: true, n: b.khoi.length, nen: [...new Set(b.khoi.map((k) => k.nen).filter(Boolean))],
        chu: b.khoi.filter((k) => k.chu).map((k) => k.chu), rong: b.khung?.rong };
    } catch (e) { return { ok: false, loi: String(e.message) }; }
  });
  dat('trình duyệt đo xong, ra bản đồ', kq.ok === true && kq.n > 0, kq.loi || `${kq.n} khối`);
  if (kq.ok) {
    dat('trang được dàn ĐÚNG bề rộng khổ clip', kq.rong === 1280, `${kq.rong}px`);
    dat('chép được chữ', kq.chu.includes('Mắt Bão') && kq.chu.includes('Gói Khởi đầu'), kq.chu.join(' · '));
    const coCdn = kq.nen.includes('#065f46');
    /* HỎI THẲNG MẠNG, đừng đoán từ kết quả đo.
       Bản đầu suy "không ra được Internet" từ chỗ bản đồ không có màu nền nào —
       nhưng CDN bị CSP CHẶN cũng cho ra đúng kết quả ấy. Thử phá (siết CSP lại
       như trang sửa) thì bài kiểm BỎ QUA thay vì đỏ: nó cho qua đúng cái bẫy
       lặng lẽ mà nó sinh ra để bắt. */
    const coMang = await fetch('https://cdn.tailwindcss.com', { method: 'HEAD',
      signal: AbortSignal.timeout(8000) }).then((r) => r.ok).catch(() => false);
    if (!coMang) {
      console.log('  — bỏ qua mục CDN: máy kiểm không tải được cdn.tailwindcss.com.');
    } else {
      dat('Tailwind từ CDN CHẠY được trong trang đo (bg-emerald-800 → #065f46)',
        coCdn, kq.nen.join(' '));
    }
  }
  /* Dọn: iframe đo không được bỏ lại trong trang sau khi đo xong. */
  dat('không bỏ lại iframe đo nào', await t.evaluate(() => [...document.querySelectorAll('iframe')]
    .every((f) => !/\/do-trang\//.test(f.src))));
  await t.close();
} finally {
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Đo trang trong trình duyệt đạt hết.\n');
process.exit(hong ? 1 : 0);
