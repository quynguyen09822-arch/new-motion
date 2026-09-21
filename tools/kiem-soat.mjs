#!/usr/bin/env node
/**
 * KIỂM BẢNG SOÁT CHẤT LƯỢNG.
 *
 * Dựng một clip tạm có LỖI CỐ Ý — chữ gần đen trên nền gần đen, và một món bay
 * vào chưa xong thì cảnh đã hết — rồi kiểm xem bảng có bắt đúng không, có bắt
 * THỪA không, và bấm vào lời báo có nhảy tới đúng món không.
 *
 * Bắt thừa cũng là hỏng: một bảng hay báo nhầm sẽ bị người dùng bỏ qua, và khi
 * đó nó vô dụng đúng vào lúc cần nhất.
 *
 *   node tools/kiem-soat.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
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
const TAM = 'kiem-soat-tam';
const fTam = path.join(PROJ, 'scenes', `${TAM}.json`);

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

function don() {
  rmSync(fTam, { force: true });
  rmSync(path.join(M, '.hub-video-backups', 'scenes', TAM), { recursive: true, force: true });
  rmSync(path.join(M, '.drafts', `${TAM}.json`), { force: true });
}

/*
 * Clip tạm: cảnh 1 có ĐÚNG HAI lỗi cố ý, cảnh 2 hoàn toàn sạch.
 * Cảnh 2 là phần quan trọng nhất của bài kiểm — nó chứng minh bảng biết im.
 */
don();
writeFileSync(fTam, JSON.stringify({
  version: 1,
  meta: { name: 'Kiểm bảng soát', width: 1280, height: 720, density: 1,
    bg: '#101014', ink: '#16181d', accent: '#ff6a1f' },   // ink ≈ bg → chữ chìm
  scenes: [
    { id: 'c1', duration: 2, stagger: 0.16, elements: [
      { id: 'chu-chim', kind: 'text', x: 100, y: 100, w: 400, h: 60,
        text: 'Chữ này chìm vào nền', size: 48 },
      { id: 'vao-cham', kind: 'text', x: 100, y: 300, w: 400, h: 60, ink: '#ffffff',
        text: 'Bay vào quá chậm', size: 48, at: 1.8, in: { kind: 'rise', dur: 1.2 } },
    ] },
    { id: 'c2', duration: 4, stagger: 0.16, elements: [
      { id: 'nen-sang', kind: 'panel', x: 0, y: 0, w: 1280, h: 720, fill: '#ffffff' },
      { id: 'chu-sach', kind: 'text', x: 100, y: 100, w: 400, h: 60, ink: '#111111',
        text: 'Chữ này đọc tốt', size: 48, at: 0.2, in: { kind: 'rise', dur: 0.5 } },
    ] },
  ],
}, null, 2), 'utf8');
console.log(`\nClip tạm: scenes/${TAM}.json (2 lỗi cố ý ở cảnh 1, cảnh 2 sạch)`);

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1700, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));
trang.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) loiJS.push(m.text());
});

try {
  await trang.goto(`${GOC}/sua`, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
    { timeout: 40000 });
  await trang.selectOption('#chon-clip', TAM);
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 30000 });
  await trang.waitForTimeout(700);            // chờ nhịp hoãn 400ms của bộ soát

  /* ---------- 1. bắt đúng ---------- */
  console.log('\n1. Bắt đúng hai lỗi cố ý');
  await trang.click('#the-xuat');
  await trang.waitForTimeout(250);

  const bang = await trang.evaluate(() => ({
    nang: [...document.querySelectorAll('.soat-hang.nang .soat-cau')].map((n) => n.textContent),
    theXuat: document.getElementById('the-xuat').textContent,
    coDauLoi: document.getElementById('the-xuat').classList.contains('co-loi'),
  }));

  dat('bắt đúng 2 lỗi nặng, không nhiều hơn', bang.nang.length === 2,
    `bắt được ${bang.nang.length}`);
  dat('có báo chữ chìm vào nền', bang.nang.some((c) => /chu-chim/.test(c)));
  dat('có báo bay vào chưa xong đã hết cảnh', bang.nang.some((c) => /vao-cham/.test(c)));
  dat('KHÔNG báo nhầm món ở cảnh 2', !bang.nang.some((c) => /chu-sach|nen-sang/.test(c)));
  dat('thẻ Xuất video hiện số lỗi', /2/.test(bang.theXuat) && bang.coDauLoi, bang.theXuat);

  /* ---------- 2. bấm vào lời báo thì nhảy tới đúng món ---------- */
  console.log('\n2. Bấm lời báo → nhảy tới đúng món');
  await trang.click('.soat-hang.nang');
  await trang.waitForTimeout(400);
  const sauBam = await trang.evaluate(() => ({
    the: document.getElementById('the-tt').getAttribute('aria-selected'),
    nhan: document.querySelector('.khung-nhan')?.textContent,
    chiDuong: document.querySelector('.chi-duong')?.textContent?.trim(),
  }));
  dat('chuyển sang thẻ Thuộc tính', sauBam.the === 'true');
  dat('chọn đúng món có vấn đề', /chìm|Chữ/.test(sauBam.nhan || ''), sauBam.nhan);

  /* ---------- 3. sửa xong thì lời báo biến mất ---------- */
  console.log('\n3. Sửa xong thì lời báo tự mất');
  // Đặt màu chữ riêng cho món đang chọn, qua đúng đường của giao diện.
  await trang.evaluate(() => {
    const o = [...document.querySelectorAll('#bang-thuoc-tinh .num')]
      .find((n) => /Màu chữ riêng|Màu chữ/.test(n.textContent));
    const inp = o?.querySelector('input[type="color"], input.o-ma');
    if (!inp) return false;
    inp.value = '#ffffff';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  await trang.waitForTimeout(800);
  await trang.click('#the-xuat');
  await trang.waitForTimeout(250);
  const conLai = await trang.evaluate(() =>
    document.querySelectorAll('.soat-hang.nang').length);
  dat('còn đúng 1 lỗi nặng sau khi sửa màu', conLai === 1, `còn ${conLai}`);

  /* ---------- 4. mục nâng cao mặc định đóng ---------- */
  console.log('\n4. Núm nâng cao mặc định giấu đi');
  await trang.click('#the-tt');
  await trang.waitForTimeout(200);
  const nc = await trang.evaluate(() => {
    const ds = [...document.querySelectorAll('#bang-thuoc-tinh .nang-cao')];
    return { so: ds.length, mo: ds.filter((d) => d.open).length };
  });
  dat('có mục "Nâng cao"', nc.so > 0, `${nc.so} mục`);
  dat('mặc định đóng hết', nc.mo === 0);

  console.log('\n5. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');

  await trang.screenshot({ path: path.join(M, '.kiem', 'soat.png'), scale: 'css' });
  console.log(`\nẢnh: ${path.join(M, '.kiem', 'soat.png')}`);
} finally {
  await trinh.close();
  don();
  console.log('Đã xoá clip tạm — clip thật không bị đụng tới.');
}

console.log(hong === 0 ? '\n✅ Bảng soát: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
