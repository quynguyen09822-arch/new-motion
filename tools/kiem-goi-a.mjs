#!/usr/bin/env node
/**
 * KIỂM GÓI A — thêm/xoá/nhân bản, kéo thả bằng CHUỘT THẬT, xuất video.
 *
 * Chạy trên clip TẠM tự tạo rồi tự xoá. Dự án clip không có git nên một bài
 * kiểm ghi bậy vào clip thật là mất luôn.
 */
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
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
const TAM = 'kiem-goi-a-tam';
const fTam = path.join(PROJ, 'scenes', `${TAM}.json`);

let hong = 0;
const dat = (t, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${t}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};
const don = () => {
  rmSync(fTam, { force: true });
  rmSync(path.join(M, '.hub-video-backups', 'scenes', TAM), { recursive: true, force: true });
  rmSync(path.join(M, '.drafts', `${TAM}.json`), { force: true });
};

don();
copyFileSync(path.join(PROJ, 'scenes', 'cta.json'), fTam);

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1700, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));
trang.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) loiJS.push(m.text());
});

const soMon = () => trang.evaluate(() => document.querySelectorAll('.lop-hang').length);
const soCanh = () => trang.evaluate(() => document.querySelectorAll('#ds-canh li[data-canh]').length);
const cho = () => trang.waitForTimeout(400);

try {
  // Chờ tín hiệu sẵn sàng của chính ứng dụng, KHÔNG chờ 'networkidle': trang có
// khung xem bên trong tự nạp ảnh và phông, mạng không bao giờ thật sự lặng.
await trang.goto(`${GOC}/sua`, { waitUntil: 'domcontentloaded' });
await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
  { timeout: 40000 });
  await trang.selectOption('#chon-clip', TAM);
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 30000 });

  /* ---------- 1. thêm thành phần ---------- */
  console.log('\n1. Thêm thành phần');
  const truoc = await soMon();
  await trang.click('#mon-them');
  await cho();
  const coMenu = await trang.evaluate(() =>
    !document.getElementById('menu-them').classList.contains('an'));
  dat('menu thêm mở ra', coMenu);
  /*
   * Bảng chọn nay có HAI THẺ và mở sẵn ở thẻ "Bộ dựng sẵn" — thẻ đó không có
   * món "Chữ" nào. Phải sang thẻ "Một món" trước.
   *
   * Và nhắm vào `.kho-mon` chứ đừng nhắm `button` trơn: hai nút chuyển thẻ cũng
   * là `button`, `:has-text("Chữ")` vớ trúng chúng thì bài kiểm bấm nhầm.
   */
  await trang.evaluate(() =>
    [...document.querySelectorAll('.kho-the-nut')].find((x) => /Một món/.test(x.textContent))?.click());
  await cho();
  await trang.click('#menu-them .kho-mon:has-text("Chữ")');
  await cho();
  const sauThem = await soMon();
  dat('danh sách thành phần tăng thêm 1', sauThem === truoc + 1, `${truoc} → ${sauThem}`);

  const monMoi = await trang.evaluate(() => document.querySelector('.khung-nhan')?.textContent);
  dat('món mới được chọn sẵn', /Chữ/.test(monMoi || ''), monMoi);

  const hienTrenKhung = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    return [...d.querySelectorAll('.el.k-text')].some((n) => /Dòng chữ mới/.test(n.textContent));
  });
  dat('món mới hiện luôn trên khung hình', hienTrenKhung);

  /* ---------- 2. đổi sang tự đặt chỗ rồi kéo bằng chuột thật ---------- */
  console.log('\n2. Kéo bằng chuột thật');
  await trang.click('#bang-thuoc-tinh .doan-o:has-text("Tự đặt")');
  await cho();

  // Đọc toạ độ XUẤT PHÁT trước đã: kéo là cộng thêm quãng dịch vào chỗ đang
  // đứng, chứ không phải đặt lại từ 0. Quên cái này là bài kiểm báo sai.
  const docXY = () => trang.evaluate(() => {
    const o = [...document.querySelectorAll('#bang-thuoc-tinh .num')]
      .filter((n) => /^(Ngang|Dọc)$/.test((n.querySelector('.num-nhan')?.textContent || '').trim()))
      .map((n) => Number(n.querySelector('input')?.value));
    return { x: o[0], y: o[1] };
  });
  const xyDau = await docXY();

  const truocKeo = await trang.evaluate(() => {
    const n = document.querySelector('.khung-chon');
    const r = n.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const heSo = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    const m = (s) => {
      const t = getComputedStyle(d.querySelector(s)).transform;
      return !t || t === 'none' ? 1 : new DOMMatrix(t).a || 1;
    };
    return m('#stage') * m('#cam');
  });

  const DX = 120, DY = 70;   // px trên màn hình
  await trang.mouse.move(truocKeo.x, truocKeo.y);
  await trang.mouse.down();
  await trang.mouse.move(truocKeo.x + DX / 2, truocKeo.y + DY / 2, { steps: 5 });
  await trang.mouse.move(truocKeo.x + DX, truocKeo.y + DY, { steps: 5 });
  await trang.mouse.up();
  await cho();

  const xySau = await docXY();
  const dichX = xySau.x - xyDau.x, dichY = xySau.y - xyDau.y;
  const mongX = Math.round(DX / heSo), mongY = Math.round(DY / heSo);
  dat('kéo 120×70px màn hình → toạ độ sân khấu dịch đúng chừng ấy',
    Math.abs(dichX - mongX) <= 3 && Math.abs(dichY - mongY) <= 3,
    `mong dịch ~(${mongX}, ${mongY}) · thật (${dichX}, ${dichY}) · hệ số ${heSo.toFixed(3)}`);

  await trang.click('#nut-lui');
  await cho();
  const xyLui = await docXY();
  dat('hoàn tác trả về đúng chỗ xuất phát (cả lượt kéo chỉ tốn 1 bước)',
    xyLui.x === xyDau.x && xyLui.y === xyDau.y,
    `(${xyLui.x}, ${xyLui.y}) — xuất phát (${xyDau.x}, ${xyDau.y})`);

  /* ---------- 3. nhân bản & xoá ---------- */
  console.log('\n3. Nhân bản và xoá');
  const n0 = await soMon();
  await trang.click('#mon-nhan');
  await cho();
  const n1 = await soMon();
  dat('nhân bản thêm đúng 1 món', n1 === n0 + 1, `${n0} → ${n1}`);

  const trungId = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    const ids = [...d.querySelectorAll('.el')].map((n) => n.dataset.el);
    return ids.length !== new Set(ids).size;
  });
  dat('bản sao KHÔNG bị trùng id với bản gốc', !trungId);

  await trang.click('#mon-xoa');
  await cho();
  const n2 = await soMon();
  dat('xoá bớt đúng 1 món', n2 === n0, `${n1} → ${n2}`);

  /* ---------- 4. cảnh ---------- */
  console.log('\n4. Thêm · nhân bản · xoá cảnh');
  const c0 = await soCanh();
  await trang.click('#canh-them');
  await trang.waitForTimeout(700);
  const c1 = await soCanh();
  dat('thêm cảnh', c1 === c0 + 1, `${c0} → ${c1}`);

  await trang.click('#canh-nhan');
  await trang.waitForTimeout(700);
  dat('nhân bản cảnh', (await soCanh()) === c0 + 2);

  await trang.click('#canh-xoa');
  await trang.waitForTimeout(700);
  dat('xoá cảnh', (await soCanh()) === c0 + 1);

  /* ---------- 5. lưu vẫn hợp lệ sau ngần ấy thao tác ---------- */
  console.log('\n5. Lưu');
  await trang.click('#nut-luu');
  await trang.waitForTimeout(1000);
  const noiDung = readFileSync(fTam, 'utf8');
  let doc = null;
  try { doc = JSON.parse(noiDung); } catch {}
  dat('file lưu ra vẫn là JSON hợp lệ', Boolean(doc));
  dat('bộ soát chấp nhận (không hiện lỗi)',
    await trang.evaluate(() => document.getElementById('dau-ban').classList.contains('an')));
  dat('số cảnh trên đĩa khớp giao diện', doc?.scenes?.length === c0 + 1,
    `${doc?.scenes?.length} cảnh`);

  /* ---------- 6. chặn khổ hình sai ---------- */
  console.log('\n6. Chốt chặn khổ hình');
  const chan = await trang.evaluate(async (s) => {
    const r = await fetch('/api/export', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: s, preset: '1080p' }),
    });
    return r.json();
  }, TAM);
  dat('clip dọc bị từ chối khổ ngang', chan.ok === false, chan.loi?.slice(0, 74));

  const kho = await trang.evaluate(async (s) =>
    (await (await fetch(`/api/khoxuat/${s}`)).json()).kho.map((k) => k.v), TAM);
  dat('danh sách khổ chỉ đưa ra khổ dọc', kho.every((k) => /reels|vertical/.test(k)), kho.join(', '));

  /* ---------- 7. lỗi JS ---------- */
  console.log('\n7. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');

  await trang.screenshot({ path: path.join(M, '.kiem', 'goi-a.png'), scale: 'css' });
} finally {
  await trinh.close();
  don();
  console.log('\nĐã xoá clip tạm.');
}

console.log(hong === 0 ? '\n✅ Gói A: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
