#!/usr/bin/env node
/**
 * KIỂM CHỈNH KHUNG NHẤN.
 *
 * File `vibe-host-marketer.html` là một VIDEO ĐÃ GIAO và dự án không có git.
 * Nên bài kiểm này: chụp lại toàn bộ file trước → thử ghi → đối chiếu → ghi trả
 * lại số cũ qua chính đường ghi đó → so từng byte với bản đầu. Nếu có sai sót,
 * `finally` chép thẳng bản chụp đè lên.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

const GOC = process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Kiểm trên ĐÚNG clip người dùng chỉ ra: bản văn phòng VH-02, vòng "khung gõ
// yêu cầu" ở 13,0–16,4s — cái bị lệch trong ảnh chụp màn hình.
const SLUG = process.argv[3] || 'vibe-host-vanphong';
const FILE = path.join(PROJ, `${SLUG}.html`);

let hong = 0;
const dat = (t, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${t}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const banChup = readFileSync(FILE);      // lưới an toàn tuyệt đối
console.log(`\nĐã chụp ${FILE} (${banChup.length} byte)`);

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1700, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));
trang.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) loiJS.push(m.text());
});

try {
  /* ---------- 1. đọc ---------- */
  console.log('\n1. Đọc các lớp vẽ đè');
  const d = await (await fetch(`${GOC}/api/khung/${SLUG}`)).json();
  dat('đọc được danh sách lớp', d.ok && d.lop.length > 0, `${d.lop?.length} lớp`);
  dat('có khai hệ toạ độ', d.rong > 0 && d.cao > 0, `${d.rong}×${d.cao}`);
  const coAnh = d.lop.filter((l) => l.anh).length;
  dat('phần lớn lớp có ảnh mockup kèm theo', coAnh > d.lop.length * 0.6, `${coAnh}/${d.lop.length}`);

  const vong = d.lop.find((l) => l.loai === 'vong' && l.suaDuoc);
  dat('tìm thấy vòng sáng sửa được', Boolean(vong),
    `"${vong?.ten}" ${JSON.stringify(vong?.box)} · ${vong?.tu}–${vong?.den}s`);
  dat('nhãn lấy từ chú thích người viết đặt trong file',
    Boolean(vong?.ten) && vong.ten !== vong.loaiTen, vong?.ten);

  /* ---------- 2. ghi rồi trả lại ---------- */
  console.log('\n2. Ghi — và trả lại nguyên trạng');
  const boxCu = [...vong.box];
  const boxThu = [boxCu[0] + 7, boxCu[1] + 11, boxCu[2] - 5, boxCu[3] - 9];

  const ghi = async (box) => (await (await fetch(`${GOC}/api/khung/${SLUG}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kho: vong.kho, chiSo: vong.chiSo, box }),
  })).json());

  const k1 = await ghi(boxThu);
  dat('ghi được', k1.ok, JSON.stringify(k1.box || k1.vanDe));

  const sau = readFileSync(FILE, 'utf8');
  // Bỏ khoảng trắng khi so: bộ ghi CỐ Ý đệm cho thẳng cột, nên số trên đĩa là
  // `box:[1137, 396,1260, 461]` chứ không sát nhau.
  dat('file trên đĩa mang số mới',
    sau.replace(/\s+/g, '').includes(`box:[${boxThu.join(',')}]`));

  const dongMoiCo = sau.split('\n').find((l) => /box\s*:\s*\[/.test(l)
    && l.replace(/\s+/g, '').includes(`box:[${boxThu.join(',')}]`));
  const dongCuCo = String(banChup).split('\n').find((l) =>
    l.replace(/\s+/g, '').includes(`box:[${boxCu.join(',')}]`));
  dat('căn lề tay được giữ nguyên (bề rộng dòng không đổi)',
    dongMoiCo?.length === dongCuCo?.length,
    `${dongCuCo?.length} → ${dongMoiCo?.length} ký tự`);

  // Chỉ được đổi ĐÚNG một dòng, không xáo trộn phần còn lại.
  const dongCu = String(banChup).split('\n');
  const dongMoi = sau.split('\n');
  const khac = dongCu.reduce((n, l, i) => n + (l === dongMoi[i] ? 0 : 1), 0);
  dat('chỉ đúng 1 dòng bị đổi', khac === 1 && dongCu.length === dongMoi.length,
    `${khac} dòng khác · ${dongCu.length} → ${dongMoi.length} dòng`);

  const k2 = await ghi(boxCu);
  dat('trả lại số cũ được', k2.ok);
  dat('file giống hệt bản đầu từng byte',
    Buffer.compare(readFileSync(FILE), banChup) === 0);

  /* ---------- 3. chặn số vô lý ---------- */
  console.log('\n3. Chặn số vô lý');
  const xau = await ghi([500, 500, 100, 100]);
  dat('từ chối khung lộn ngược', xau.ok === false, xau.vanDe?.[0]);
  dat('file vẫn nguyên sau khi bị từ chối',
    Buffer.compare(readFileSync(FILE), banChup) === 0);

  /* ---------- 4. giao diện ---------- */
  console.log('\n4. Giao diện');
  await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.selectOption('#chon-clip', SLUG);
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.waitForTimeout(900);

  dat('thẻ "Khung nhấn" hiện ra cho clip đời cũ',
    await trang.evaluate(() => !document.getElementById('the-khung').classList.contains('an')));
  dat('mở sẵn vào thẻ đó',
    await trang.evaluate(() =>
      document.getElementById('the-khung').getAttribute('aria-selected') === 'true'));

  const soHang = await trang.evaluate(() => document.querySelectorAll('.khung-hang').length);
  dat('cột phải liệt kê đủ các khung', soHang === d.lop.length, `${soHang} hàng`);

  // Chọn đúng vòng bị lệch
  await trang.evaluate((ten) => {
    [...document.querySelectorAll('.khung-hang')]
      .find((x) => x.textContent.includes(ten))?.click();
  }, vong.ten);
  await trang.waitForTimeout(700);

  const hopHien = await trang.evaluate(() => {
    const h = document.querySelector('.khung-hop');
    const a = document.querySelector('.khung-anh');
    return { hien: getComputedStyle(h).display, rongAnh: a.clientWidth, src: a.getAttribute('src') };
  });
  dat('khung vẽ lên ảnh mockup', hopHien.hien === 'block' && hopHien.rongAnh > 0,
    `ảnh rộng ${hopHien.rongAnh}px`);
  dat('đúng ảnh mockup của cảnh đó', /public\/image\//.test(hopHien.src || ''));

  // Phép kiểm quan trọng nhất của cả tính năng: bốn con số trong `box` phải là
  // pixel của CHÍNH tấm ảnh này. Sai chỗ này thì kéo bao nhiêu cũng lệch.
  const cuAnh = await trang.evaluate(() => {
    const a = document.querySelector('.khung-anh');
    return { w: a.naturalWidth, h: a.naturalHeight };
  });
  dat('hệ toạ độ trùng khít cỡ ảnh mockup thật',
    cuAnh.w === d.rong && cuAnh.h === d.cao,
    `ảnh ${cuAnh.w}×${cuAnh.h} · khai ${d.rong}×${d.cao}`);

  const so0 = await trang.evaluate(() =>
    [...document.querySelectorAll('.khung-so input')].map((o) => Number(o.value)));
  dat('bốn ô số khớp với dữ liệu trên đĩa', String(so0) === String(vong.box), String(so0));

  /* kéo bằng chuột thật */
  const hopBox = await trang.locator('.khung-hop').boundingBox();
  const tyLe = hopHien.rongAnh / d.rong;
  const DX = 40, DY = 24;
  await trang.mouse.move(hopBox.x + hopBox.width / 2, hopBox.y + hopBox.height / 2);
  await trang.mouse.down();
  await trang.mouse.move(hopBox.x + hopBox.width / 2 + DX, hopBox.y + hopBox.height / 2 + DY, { steps: 6 });
  await trang.mouse.up();
  await trang.waitForTimeout(300);

  const so1 = await trang.evaluate(() =>
    [...document.querySelectorAll('.khung-so input')].map((o) => Number(o.value)));
  const mongX = Math.round(DX / tyLe), mongY = Math.round(DY / tyLe);
  dat('kéo trên ảnh → số đổi đúng bằng pixel mockup',
    Math.abs((so1[0] - so0[0]) - mongX) <= 2 && Math.abs((so1[1] - so0[1]) - mongY) <= 2,
    `dịch (${so1[0] - so0[0]}, ${so1[1] - so0[1]}) · mong (${mongX}, ${mongY})`);
  dat('khung giữ nguyên kích thước khi chỉ dời chỗ',
    (so1[2] - so1[0]) === (so0[2] - so0[0]) && (so1[3] - so1[1]) === (so0[3] - so0[1]));

  await trang.click('.bang-tt:not(.an) .nut.nho');   // "Trả lại số cũ"
  await trang.waitForTimeout(250);
  const so2 = await trang.evaluate(() =>
    [...document.querySelectorAll('.khung-so input')].map((o) => Number(o.value)));
  dat('nút trả lại số cũ hoạt động', String(so2) === String(so0));

  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');

  await trang.screenshot({ path: path.join(M, '.kiem', 'khung.png'), scale: 'css' });
} finally {
  await trinh.close();
  // Lưới an toàn cuối cùng: dù có chuyện gì, file phải về đúng như lúc bắt đầu.
  if (Buffer.compare(readFileSync(FILE), banChup) !== 0) {
    writeFileSync(FILE, banChup);
    console.log('⚠️  File có khác — đã chép bản chụp đè lại.');
  }
  rmSync(path.join(M, '.hub-video-backups', 'doi-cu', SLUG), { recursive: true, force: true });
  console.log('File đã giao: nguyên vẹn.');
}

console.log(hong === 0 ? '\n✅ Chỉnh khung nhấn: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
