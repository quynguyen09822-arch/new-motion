#!/usr/bin/env node
/**
 * KIỂM ẢNH NHỎ CỦA THÀNH PHẦN (bảng lớp kiểu Photoshop).
 *
 * Ảnh nhỏ dựng bằng cách nhân bản nút DOM từ trong iframe ra shadow root ở
 * trang cha. Hai lỗi đã vấp lúc dựng, và cả hai đều hỏng LẶNG LẼ — ra một ô
 * trông vẫn "có gì đó" nên rất dễ tưởng là xong:
 *
 *   1. Đường dẫn ảnh tương đối. Trong iframe gốc là `/clip/`, ở trang cha gốc
 *      là `/` — chép nguyên `src="public/a.png"` là ảnh vỡ hết.
 *   2. Đo ô khi ô còn `display:none`. Mọi phép đo ra 0, hệ số thu bị chặn ở
 *      mức tối đa, và món phóng to gấp bốn thay vì thu vừa ô.
 *
 *   node tools/kiem-anh-nho.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

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

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1700, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

try {
  await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
    { timeout: 40000 });
  await trang.selectOption('#chon-clip', 'cta');
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 30000 });
  await trang.waitForTimeout(1500);

  /* ---------- 1. có ảnh, và ảnh đúng loại món ---------- */
  console.log('\n1. Mỗi hàng có một ô ảnh dựng được');
  const o = await trang.evaluate(() => [...document.querySelectorAll('.lop-anh')].map((x) => ({
    mon: x.dataset.mon,
    loai: x.dataset.loai,
    trongO: x.shadowRoot?.querySelector('.el')?.className || null,
  })));
  dat('danh sách có ô ảnh', o.length > 3, `${o.length} ô`);
  dat('mọi ô đều dựng được nội dung', o.every((x) => x.trongO),
    `${o.filter((x) => x.trongO).length}/${o.length}`);
  dat('ô dựng ĐÚNG loại món của hàng đó',
    o.every((x) => !x.trongO || x.trongO.includes(`k-${x.loai}`)),
    o.find((x) => x.trongO && !x.trongO.includes(`k-${x.loai}`))?.mon || 'khớp hết');

  /* ---------- 2. ảnh trong ô phải tải được ---------- */
  console.log('\n2. Đường dẫn ảnh được đổi sang tuyệt đối');
  const anh = await trang.evaluate(async () => {
    const ra = [];
    for (const x of document.querySelectorAll('.lop-anh')) {
      for (const i of x.shadowRoot?.querySelectorAll('img') || []) {
        ra.push({ src: i.getAttribute('src'), rong: i.naturalWidth });
      }
    }
    return ra;
  });
  dat('có ảnh trong ô để kiểm', anh.length > 0, `${anh.length} ảnh`);
  dat('mọi src đều là đường dẫn tuyệt đối',
    anh.every((a) => /^https?:/.test(a.src || '')), anh.find((a) => !/^https?:/.test(a.src || ''))?.src || 'đúng hết');
  dat('mọi ảnh đều tải được (không vỡ)', anh.every((a) => a.rong > 0),
    `${anh.filter((a) => a.rong > 0).length}/${anh.length} tải được`);

  /* ---------- 3. ô xem lớn khi rê chuột ---------- */
  console.log('\n3. Ô xem lớn khi rê chuột');
  const hang = trang.locator('.lop-hang', { hasText: 'Quỹ đạo' }).first();
  await hang.hover();
  await trang.waitForTimeout(600);
  const lon = await trang.evaluate(() => {
    const x = document.querySelector('.lop-xem-lon');
    const e = x.shadowRoot?.querySelector('.el');
    const m = /scale\(([\d.]+)\)/.exec(e?.style.transform || '');
    return { hien: !x.classList.contains('an'), loai: e?.className || null,
      tiLe: m ? Number(m[1]) : null, rongMon: e?.offsetWidth || 0, oRong: x.offsetWidth };
  });
  dat('ô lớn hiện ra', lon.hien);
  dat('ô lớn dựng đúng món đang rê', /k-quydao/.test(lon.loai || ''), lon.loai);
  /*
   * Chốt chặn cho lỗi "đo khi còn ẩn": món rộng 662px thả vào ô 168px thì hệ số
   * phải NHỎ HƠN 1. Nếu ai đó lại vẽ trước khi hiện ô, hệ số sẽ vọt lên mức
   * tối đa và mục này bắt được ngay.
   */
  dat('món to hơn ô thì phải THU NHỎ, không phóng to',
    lon.rongMon > lon.oRong ? lon.tiLe < 1 : true,
    `món rộng ${lon.rongMon}px · ô ${lon.oRong}px · tỉ lệ ${lon.tiLe}`);
  dat('món vừa khít trong ô', lon.tiLe * lon.rongMon <= lon.oRong + 1,
    `${(lon.tiLe * lon.rongMon).toFixed(0)}px ≤ ${lon.oRong}px`);

  await trang.evaluate(() => document.querySelector('.lop-hang')?.dispatchEvent(
    new MouseEvent('mouseleave', { bubbles: true })));
  await trang.mouse.move(900, 500);
  await trang.waitForTimeout(400);

  /* ---------- 4. cảnh nặng thì dựng LƯỜI ---------- */
  console.log('\n4. Cảnh nhiều món thì chỉ dựng ô đang nhìn thấy');
  await trang.selectOption('#chon-clip', 'thu-trien-khai-html');
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.waitForTimeout(1800);
  const nang = await trang.evaluate(() => {
    const x = [...document.querySelectorAll('.lop-anh')];
    return { tong: x.length, daVe: x.filter((y) => y.dataset.veRoi).length };
  });
  dat('cảnh này thật sự nhiều món', nang.tong > 100, `${nang.tong} món`);
  dat('KHÔNG dựng hết một lượt', nang.daVe < nang.tong / 2,
    `mới dựng ${nang.daVe}/${nang.tong}`);

  /* ---------- 5. QUY TẮC ẢNH NHỎ — áp cho MỌI clip ---------- */
  /*
   * Đây là chốt chặn cho lỗi đã làm hỏng cả bảng lớp mà không ai thấy: bản sao
   * giữ nguyên `left/top` NỘI TUYẾN của bộ dựng, nên nó nằm ở đúng chỗ của nó
   * trong khung 1280×720 — tức là ngoài hẳn cái ô 34px. Mọi phép kiểm cũ vẫn
   * qua (ô CÓ nội dung, ảnh CÓ tải được, tỉ lệ ĐÚNG là thu nhỏ) trong khi người
   * dùng nhìn thấy 156 ô trắng như nhau.
   *
   * Nên phép kiểm ở đây đo CHỖ ĐẶT, không đo sự tồn tại: phần bản sao lọt vào
   * trong ô phải gần bằng phần LẼ RA lọt được. Lệch chỗ là rớt ngay.
   */
  console.log('\n5. Quy tắc ảnh nhỏ áp cho mọi clip');
  const { banDoNen } = await import(new URL('../web/soat.js', import.meta.url));

  for (const slug of ['cta', 'thu-ve-lai-s02', 'thu-trien-khai-html']) {
    await trang.selectOption('#chon-clip', slug);
    await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
    await trang.waitForTimeout(1200);

    const doc = await (await fetch(`${GOC}/api/clip/${slug}`)).json();
    const canh = doc.doc?.scenes?.[0] || doc.scenes?.[0];
    const meta = doc.doc?.meta || doc.meta || {};
    const nen = banDoNen(canh, meta);

    const kq = await trang.evaluate(() => {
      const ra = [];
      for (const o of document.querySelectorAll('.lop-anh')) {
        const b = o.shadowRoot?.querySelector('.khung > .el');
        if (!b) continue;
        const r = b.getBoundingClientRect(), ro = o.getBoundingClientRect();
        const gx = Math.max(0, Math.min(r.right, ro.right) - Math.max(r.left, ro.left));
        const gy = Math.max(0, Math.min(r.bottom, ro.bottom) - Math.max(r.top, ro.top));
        // Phần LẼ RA lọt được vào ô, nếu đặt đúng chỗ.
        const can = Math.min(r.width, ro.width) * Math.min(r.height, ro.height);
        const m = /scale\(([\d.]+)\)/.exec(b.style.transform || '');
        ra.push({
          mon: o.dataset.mon,
          lot: can > 0 ? (gx * gy) / can : 0,
          ti: m ? Number(m[1]) : null,
          nen: getComputedStyle(o.shadowRoot.querySelector('.khung')).backgroundColor,
        });
      }
      return ra;
    });

    const lech = kq.filter((x) => x.lot < 0.8);
    dat(`${slug}: bản sao nằm ĐÚNG trong ô`, lech.length === 0,
      lech.length ? `${lech.length}/${kq.length} lệch — ${lech.slice(0, 3).map((x) => `${x.mon} ${(x.lot * 100).toFixed(0)}%`).join(', ')}`
        : `${kq.length} ô đều lọt trọn`);

    const qua = kq.filter((x) => x.ti != null && x.ti > 4.001);
    dat(`${slug}: không ô nào phóng quá trần`, qua.length === 0,
      qua.slice(0, 2).map((x) => `${x.mon}=${x.ti}`).join(', ') || 'trần 4×');

    // Nền phải là nền THẬT dưới món, không phải màu nền của trang sửa.
    const sai = kq.filter((x) => {
      const mong = nen.get(x.mon)?.mau;
      if (!mong || !/^#[0-9a-f]{6}$/i.test(mong)) return false;
      const p = /^rgba?\(([^)]+)\)/.exec(x.nen);
      if (!p) return true;
      const [r, g, b] = p[1].split(',').map((v) => parseInt(v, 10));
      const t = [1, 3, 5].map((i) => parseInt(mong.slice(i, i + 2), 16));
      return Math.abs(r - t[0]) + Math.abs(g - t[1]) + Math.abs(b - t[2]) > 6;
    });
    dat(`${slug}: ô lấy đúng nền nằm dưới món`, sai.length === 0,
      sai.slice(0, 3).map((x) => `${x.mon}: ${x.nen} ≠ ${nen.get(x.mon)?.mau}`).join(' · ')
        || `${kq.length} ô đúng nền`);
  }

  console.log('\n6. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await trang.screenshot({ path: path.join(M, '.kiem', 'anh-nho.png'), scale: 'css' });
} finally {
  await trinh.close();
}

console.log(hong === 0 ? '\n✅ Ảnh nhỏ thành phần: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
