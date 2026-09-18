#!/usr/bin/env node
/**
 * KIỂM HƯỚNG DẪN TẠI CHỖ.
 *
 * Hai phần, chạy nối nhau:
 *
 *  A. KHUÔN VIẾT (Node trần, không cần trình duyệt) — giữ đúng khuôn đã thống
 *     nhất: tiêu đề dưới 6 từ, mô tả dưới 35 từ, không lọt từ kỹ thuật. Đây là
 *     chốt chặn để nội dung không trôi dần khi có người viết thêm.
 *  B. GIAO DIỆN (Chromium) — mọi núm trong bảng đều có nút hỏi, bong bóng mở
 *     được bằng chuột lẫn bàn phím, Escape đóng, và khai báo `aria` đúng.
 *
 *   node tools/kiem-huong-dan.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUONG_DAN_CHUNG, HUONG_DAN_MAU, NUM_RIENG } from '../web/inspector/schema.js';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* ============================ A. KHUÔN VIẾT ============================ */
console.log('\n1. Mọi núm đều có hướng dẫn');
const thieu = [];
for (const [loai, ds] of Object.entries(NUM_RIENG)) {
  for (const n of ds) if (!n.huongDan) thieu.push(`${loai}.${n.id}`);
}
dat('không núm nào bị bỏ sót', thieu.length === 0, thieu.join(', ') || 'đủ cả');

const tatCa = [];
for (const [loai, ds] of Object.entries(NUM_RIENG)) {
  for (const n of ds) if (n.huongDan) tatCa.push([`${loai}.${n.id}`, n.huongDan]);
}
for (const [k, v] of Object.entries(HUONG_DAN_CHUNG)) tatCa.push([`chung.${k}`, v]);
for (const [k, v] of Object.entries(HUONG_DAN_MAU)) tatCa.push([`mau.${k}`, v]);
dat('gom đủ mục để kiểm', tatCa.length > 100, `${tatCa.length} mục`);

console.log('\n2. Đúng khuôn đã thống nhất');
const dem = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const thieuChu = tatCa.filter(([, h]) => !h.tieuDe || !h.mota);
dat('mục nào cũng có cả tiêu đề lẫn mô tả', thieuChu.length === 0,
  thieuChu.map(([k]) => k).join(', ') || 'đủ cả');
const deDai = tatCa.filter(([, h]) => dem(h.tieuDe) > 6);
dat('tiêu đề dưới 6 từ', deDai.length === 0,
  deDai.map(([k, h]) => `${k} (${dem(h.tieuDe)})`).join(', ') || 'đạt');
const moDai = tatCa.filter(([, h]) => dem(h.mota) > 35);
dat('mô tả dưới 35 từ', moDai.length === 0,
  moDai.map(([k, h]) => `${k} (${dem(h.mota)})`).join(', ') || 'đạt');

/*
 * Từ kỹ thuật là thứ chính cái công cụ này sinh ra để tránh — người dùng không
 * rành kỹ thuật. Lọt một chữ "opacity" vào đây là hỏng đúng mục đích của nó.
 */
const CAM = /\b(opacity|easing|ease|padding|margin|stagger|keyframe|transform|render|z-index|flex|css|dom)\b/i;
const loiTu = tatCa.filter(([, h]) => CAM.test(`${h.tieuDe} ${h.mota}`));
dat('không lọt từ kỹ thuật', loiTu.length === 0, loiTu.map(([k]) => k).join(', ') || 'sạch');

/* ============================ B. GIAO DIỆN ============================ */
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1700, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));
// Schema kêu lên khi một khoá hướng dẫn không khớp núm nào — bắt luôn ở đây.
trang.on('console', (m) => { if (/\[schema\]/.test(m.text())) loiJS.push(m.text()); });

try {
  await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
    { timeout: 40000 });
  await trang.selectOption('#chon-clip', 'cta');
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 30000 });
  await trang.waitForTimeout(900);

  console.log('\n3. Bảng thuộc tính: núm nào cũng có nút hỏi');
  /* Duyệt qua NHIỀU loại phần tử, không chỉ một — mỗi loại bày ra một bộ núm
     khác nhau, kiểm mỗi món chữ thì bỏ sót gần hết. */
  const soHang = await trang.locator('.lop-hang').count();
  let soNum = 0, soThieu = 0; const tenThieu = [];
  for (let i = 0; i < Math.min(soHang, 8); i++) {
    // Lấy lại tay cầm MỖI LẦN: bấm một hàng là bảng thành phần dựng lại toàn bộ,
    // tay cầm cũ rời khỏi cây DOM và lần bấm sau ném lỗi "not attached".
    await trang.locator('.lop-hang').nth(i).click();
    await trang.waitForTimeout(320);
    const r = await trang.evaluate(() => {
      const ra = [];
      for (const n of document.querySelectorAll('#bang-thuoc-tinh .num')) {
        /*
         * Đòi nút phải NHÌN THẤY ĐƯỢC, không chỉ tồn tại trong cây DOM. Núm kiểu
         * bật/tắt ẩn nhãn đi, nên nút hỏi gắn vào đó vẫn "có" mà chuột không
         * thấy và bàn phím không tới được — đếm suông thì lọt.
         */
        const nut = n.querySelector('.hd-nut');
        if (!nut || !nut.offsetParent) {
          ra.push(n.textContent.replace('?', '').trim().slice(0, 24) || '(không nhãn)');
        }
      }
      return { tong: document.querySelectorAll('#bang-thuoc-tinh .num').length, thieu: ra };
    });
    soNum += r.tong; soThieu += r.thieu.length; tenThieu.push(...r.thieu);
  }
  dat('đã duyệt đủ nhiều núm', soNum > 40, `${soNum} núm qua 8 phần tử`);
  dat('không núm nào thiếu nút hỏi', soThieu === 0, [...new Set(tenThieu)].join(', ') || 'đủ cả');

  console.log('\n4. Bong bóng mở, đóng, và khai báo cho trình đọc màn hình');
  await trang.evaluate(() => document.querySelector('.lop-hang')?.click());
  await trang.waitForTimeout(300);
  await trang.mouse.move(900, 900);
  const nut = trang.locator('#bang-thuoc-tinh .hd-nut').first();
  await nut.hover();
  await trang.waitForTimeout(700);
  const mo = await trang.evaluate(() => {
    const h = document.querySelector('.hd');
    const n = document.querySelector('#bang-thuoc-tinh .hd-nut');
    const r = h.getBoundingClientRect();
    return { hien: !h.classList.contains('an'), de: h.querySelector('.hd-de').textContent,
      mo: h.querySelector('.hd-mo').textContent, ben: h.dataset.ben,
      aria: n.getAttribute('aria-describedby'), nhan: n.getAttribute('aria-label'),
      trongMan: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
  });
  dat('rê chuột thì bong bóng hiện', mo.hien);
  dat('có tiêu đề và mô tả', Boolean(mo.de) && mo.mo.length > 10, mo.de);
  dat('mở sang TRÁI cho khỏi tràn khỏi màn hình', mo.ben === 'trai');
  dat('nằm trọn trong màn hình', mo.trongMan);
  dat('nút hỏi trỏ tới bong bóng cho trình đọc màn hình', mo.aria === 'hd-bong-bong');
  dat('nút hỏi có nhãn đọc được', /Hướng dẫn:/.test(mo.nhan || ''), mo.nhan);

  await trang.keyboard.press('Escape');
  await trang.waitForTimeout(250);
  const sauEsc = await trang.evaluate(() => ({
    an: document.querySelector('.hd').classList.contains('an'),
    aria: document.querySelector('#bang-thuoc-tinh .hd-nut').getAttribute('aria-describedby'),
  }));
  dat('Escape đóng bong bóng', sauEsc.an);
  dat('đóng rồi thì gỡ luôn khai báo aria', sauEsc.aria === null);

  console.log('\n5. Dùng được bằng bàn phím');
  await trang.evaluate(() => document.querySelector('#bang-thuoc-tinh .hd-nut').focus());
  await trang.waitForTimeout(300);
  dat('lia phím tới nút hỏi là bong bóng mở ra',
    await trang.evaluate(() => !document.querySelector('.hd').classList.contains('an')));

  console.log('\n6. Bảng đã gọn lại');
  /* Mục đích ban đầu: bảng bớt rối. Dòng gợi ý xám chỉ còn được phép ở lại khi
     nó là GIÁ TRỊ ĐANG DÙNG ("0,6 giây") hoặc gợi ý của lựa chọn đang chọn. */
  await trang.evaluate(() => {
    const h = [...document.querySelectorAll('.lop-hang')].find((x) => /Chữ ·/.test(x.textContent));
    h?.click();
  });
  await trang.waitForTimeout(400);
  const xam = await trang.evaluate(() =>
    [...document.querySelectorAll('#bang-thuoc-tinh .num-goi')].map((n) => n.textContent));
  dat('chỉ còn vài dòng gợi ý xám', xam.length <= 2, `${xam.length} dòng: ${xam.join(' | ')}`);

  console.log('\n7. Lỗi trên trang');
  dat('không có lỗi JS và không có khoá hướng dẫn sai', loiJS.length === 0,
    loiJS.slice(0, 2).join(' | ') || 'sạch');
  await trang.screenshot({ path: path.join(M, '.kiem', 'huong-dan.png'), scale: 'css' });
} finally {
  await trinh.close();
}

console.log(hong === 0 ? '\n✅ Hướng dẫn tại chỗ: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
