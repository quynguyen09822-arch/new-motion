#!/usr/bin/env node
/**
 * KIỂM PHẦN SỬA — bấm chọn, vặn, hoàn tác, lưu. Chạy thật bằng Chromium.
 *
 * Dùng một clip TẠM tự tạo rồi tự xoá, tuyệt đối không đụng vào clip thật của
 * người dùng. Đây không phải chuyện cẩn thận thừa: dự án clip không có git, nên
 * một bài kiểm ghi bậy vào clip thật là mất luôn.
 *
 *   node tools/kiem-sua.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

const GOC = process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = 'kiem-thu-tam';
const fTam = path.join(PROJ, 'scenes', `${TAM}.json`);
const fGoc = path.join(PROJ, 'scenes', 'cta.json');

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

don();
copyFileSync(fGoc, fTam);
console.log(`\nClip tạm: scenes/${TAM}.json (chép từ cta.json)`);

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1700, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));
trang.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) loiJS.push(m.text());
});

try {
  // Chờ tín hiệu sẵn sàng của chính ứng dụng, KHÔNG chờ 'networkidle': trang có
// khung xem bên trong tự nạp ảnh và phông, mạng không bao giờ thật sự lặng.
await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
  { timeout: 40000 });
  await trang.selectOption('#chon-clip', TAM);
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 30000 });

  /* ---------- 1. bấm chọn trên khung hình ---------- */
  console.log('\n1. Bấm chọn trên khung hình');
  // Bấm vào giữa món chữ, dùng toạ độ thật của nó trong iframe.
  const oChu = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    const n = d.querySelector('.el.k-text');
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: n.dataset.el };
  });
  dat('tìm được món chữ trong khung', Boolean(oChu), oChu?.id);

  const khungIf = await trang.locator('#khung').boundingBox();
  await trang.mouse.click(khungIf.x + oChu.x, khungIf.y + oChu.y);
  await trang.waitForTimeout(250);

  const sauBam = await trang.evaluate(() => ({
    khungHien: getComputedStyle(document.querySelector('.khung-chon')).display,
    nhan: document.querySelector('.khung-nhan')?.textContent,
    coBang: document.querySelectorAll('#bang-thuoc-tinh .num').length,
    chiDuong: document.querySelector('.chi-duong')?.textContent?.trim(),
  }));
  dat('khung chọn hiện lên', sauBam.khungHien !== 'none', sauBam.nhan);
  dat('bảng thuộc tính có núm', sauBam.coBang > 0, `${sauBam.coBang} núm`);
  dat('thanh chỉ đường có nội dung', Boolean(sauBam.chiDuong), sauBam.chiDuong?.slice(0, 46));

  /* ---------- 2. sửa chữ, xem khung hình có đổi không ---------- */
  console.log('\n2. Sửa chữ → khung hình đổi ngay');
  const truoc = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    return d.querySelector('.el.k-text')?.textContent?.trim();
  });

  const oVan = trang.locator('#bang-thuoc-tinh textarea').first();
  await oVan.fill('KIỂM THỬ SỬA CHỮ');
  await trang.waitForTimeout(400);

  const sau = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    return d.querySelector('.el.k-text')?.textContent?.trim();
  });
  dat('chữ trên khung hình đổi theo', sau !== truoc && /KIỂM THỬ SỬA CHỮ/.test(sau || ''),
    `"${(sau || '').slice(0, 34)}"`);

  /* ---------- 3. load() không làm mất chỗ đang xem ---------- */
  console.log('\n3. Sửa xong không bị tua về đầu');
  const giayLuc = await trang.evaluate(() => {
    const c = document.getElementById('khung').contentWindow.__clip;
    c.seek(3.2);
    return c.at();
  });
  await oVan.fill('KIỂM THỬ LẦN HAI');
  await trang.waitForTimeout(400);
  const giaySau = await trang.evaluate(() => document.getElementById('khung').contentWindow.__clip.at());
  dat('vẫn đứng nguyên chỗ đang xem', Math.abs(giaySau - giayLuc) < 0.05,
    `${giayLuc} → ${giaySau}`);

  /* ---------- 4. hoàn tác ---------- */
  console.log('\n4. Hoàn tác');
  const banTruoc = await trang.evaluate(() => document.getElementById('dau-ban').classList.contains('an'));
  dat('có đánh dấu "chưa lưu"', !banTruoc);

  await trang.click('#nut-lui');
  await trang.waitForTimeout(300);
  const sauLui = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    return d.querySelector('.el.k-text')?.textContent?.trim();
  });
  dat('hoàn tác đưa chữ về bước trước', /KIỂM THỬ SỬA CHỮ/.test(sauLui || ''),
    `"${(sauLui || '').slice(0, 34)}"`);

  /* ---------- 5. lưu ---------- */
  console.log('\n5. Lưu');
  await trang.click('#nut-luu');
  await trang.waitForTimeout(900);
  const tren = readFileSync(fTam, 'utf8');
  dat('file trên đĩa đã đổi', tren.includes('KIỂM THỬ SỬA CHỮ'));
  dat('bản cũ được cất lại', existsSync(path.join(M, '.hub-video-backups', 'scenes', TAM)));
  dat('lưu xong hết đánh dấu "chưa lưu"',
    await trang.evaluate(() => document.getElementById('dau-ban').classList.contains('an')));
  dat('file vẫn là JSON hợp lệ', (() => { try { JSON.parse(tren); return true; } catch { return false; } })());

  /* ---------- 6. chọn nền từ danh sách thành phần ---------- */
  console.log('\n6. Chọn nền — thứ bấm trên khung hình không bao giờ trúng');
  const coNen = await trang.evaluate(() => {
    const h = [...document.querySelectorAll('.lop-hang')].find((x) => /Nền thương hiệu/.test(x.textContent));
    if (!h) return null;
    h.click();
    return true;
  });
  await trang.waitForTimeout(250);
  const nenChon = await trang.evaluate(() => document.querySelector('.khung-nhan')?.textContent);
  dat('chọn được nền từ danh sách bên trái', coNen && /Nền/.test(nenChon || ''), nenChon);

  /* ---------- 7. lỗi JS ---------- */
  console.log('\n7. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');

  await trang.screenshot({ path: path.join(M, '.kiem', 'sua.png'), scale: 'css' });
  console.log(`\nẢnh: ${path.join(M, '.kiem', 'sua.png')}`);
} finally {
  await trinh.close();
  don();
  console.log(`Đã xoá clip tạm — clip thật không bị đụng tới.`);
}

console.log(hong === 0 ? '\n✅ Phần sửa: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
