#!/usr/bin/env node
/**
 * KIỂM THÀNH PHẦN VIDEO.
 *
 * Hai chuyện phải chắc, và chuyện thứ hai mới là chuyện khó:
 *
 *   1. Video chạy trong KHUNG XEM của trình sửa, và bám đúng đồng hồ clip —
 *      tua tới giây 3 thì nền cũng phải ở giây 3.
 *   2. Video lọt được vào VIDEO ĐÃ XUẤT. Bộ xuất quay màn hình theo thời gian
 *      thật nên về lý là được, nhưng "về lý là được" đúng cho tới lúc không.
 *
 * Cũng canh cái bẫy đã làm mất bao công: `public/video/BG.mp4` là HEVC, trình
 * duyệt KHÔNG giải mã được, đặt vào clip thì ra ô đen mà không báo lỗi gì.
 *
 *   node tools/kiem-nen-video.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
const TAM = 'kiem-nen-video-tam';
const fTam = path.join(PROJ, 'scenes', `${TAM}.json`);
const OUT = path.join(PROJ, 'out');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

function don() {
  rmSync(fTam, { force: true });
  rmSync(path.join(M, '.hub-video-backups', 'scenes', TAM), { recursive: true, force: true });
  rmSync(path.join(M, '.drafts', `${TAM}.json`), { force: true });
  // Video do chính bài kiểm này xuất ra — dọn, đừng để rác trong kho thành phẩm.
  if (existsSync(OUT)) {
    for (const t of readdirSync(OUT)) if (t.startsWith(TAM)) rmSync(path.join(OUT, t), { force: true });
  }
}

/* Tìm một file video trình duyệt phát được, hỏi thẳng máy chủ cho khỏi đoán. */
const nguon = await (await fetch(`${GOC}/api/nguon-video`)).json();
const chayDuoc = (nguon.video || []).find((v) => v.chayDuoc);
if (!chayDuoc) {
  console.error('Không có file video nào trình duyệt phát được trong public/video/ — bỏ qua.');
  process.exit(0);
}
console.log(`\nDùng ${chayDuoc.ten} (${chayDuoc.codec})`);

don();
writeFileSync(fTam, JSON.stringify({
  version: 1,
  meta: { name: 'Kiểm nền video', width: 720, height: 1280, density: 1,
    bg: '#0b1220', ink: '#0f172a', accent: '#ff6a1f' },
  scenes: [{ id: 'c1', duration: 3, stagger: 0.16, elements: [
    { id: 'nen-dong', kind: 'video', x: 0, y: 0, place: 'day',
      src: chayDuoc.duongDan, fit: 'cover', blur: 10, dim: 0.2, loop: true },
    { id: 'the', kind: 'panel', x: 60, y: 480, w: 600, h: 220,
      fill: '#ffffff', radius: 20 },
  ] }],
}, null, 2), 'utf8');

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1600, height: 1000 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

try {
  await trang.goto(`${GOC}/sua`, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
    { timeout: 40000 });
  await trang.selectOption('#chon-clip', TAM);
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 30000 });
  await trang.waitForTimeout(1500);

  /* ---------- 1. dựng ra thẻ video thật ---------- */
  console.log('\n1. Khung xem dựng ra thẻ <video>');
  const tt = await trang.evaluate(() => {
    const d = document.getElementById('khung').contentWindow.document;
    const v = d.querySelector('.k-video video');
    return v ? { co: true, sanSang: v.readyState, w: v.videoWidth, h: v.videoHeight,
      mo: getComputedStyle(v).filter, cam: v.muted } : { co: false };
  });
  dat('có thẻ <video>', tt.co);
  dat('video đã nạp được dữ liệu', tt.sanSang >= 2, `readyState ${tt.sanSang}`);
  dat('có kích thước thật (không phải ô đen)', tt.w > 0 && tt.h > 0, `${tt.w}×${tt.h}`);
  dat('bị tắt tiếng — điều kiện để tự phát', tt.cam === true);
  dat('có áp làm mờ', /blur/.test(tt.mo || ''), tt.mo);

  /* ---------- 2. bám đồng hồ clip ---------- */
  console.log('\n2. Tua clip thì video nhảy theo');
  for (const moc of [2.5, 0.5]) {
    await trang.evaluate((s) => document.getElementById('khung').contentWindow.__clip.seek(s), moc);
    await trang.waitForTimeout(400);
    const g = await trang.evaluate(() =>
      document.getElementById('khung').contentWindow.document.querySelector('.k-video video').currentTime);
    dat(`tua tới giây ${moc} thì video ở giây ${g.toFixed(2)}`, Math.abs(g - moc) < 0.5);
  }

  /* ---------- 3. lọt vào video đã xuất ---------- */
  console.log('\n3. Nền động lọt vào video xuất ra (phần quan trọng nhất)');
  const d = await (await fetch(`${GOC}/api/export`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: TAM, preset: 'reels', chatLuong: 'low' }),
  })).json();
  dat('nhận việc xuất', d.ok, d.loi || '');
  let ra = null;
  for (let i = 0; i < 40 && d.ok; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const v = await (await fetch(`${GOC}/api/job/${d.id}`)).json();
    if (v.trangThai === 'xong') { ra = v.ketQua?.file; break; }
    if (v.trangThai === 'loi' || v.trangThai === 'huy') { dat('xuất xong', false, v.loi); break; }
  }
  dat('xuất ra file', Boolean(ra), ra || 'không có');

  if (ra) {
    const f = path.join(OUT, ra);
    /* So DẢI TRÊN CÙNG của ba khung — vùng đó chỉ có nền, không dính thẻ trắng.
       Ba vân tay khác nhau nghĩa là nền có chuyển động thật. */
    const vanTay = (moc) => execFileSync('ffmpeg', ['-v', 'error', '-ss', String(moc), '-i', f,
      '-frames:v', '1', '-vf', 'crop=iw:300:0:0,scale=8:4', '-f', 'rawvideo',
      '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 20 }).toString('hex');
    const a = vanTay(0.4), b = vanTay(1.5), c = vanTay(2.6);
    dat('nền trong video xuất ra có CHUYỂN ĐỘNG',
      a !== b && b !== c && a !== c);
    // Đen thui thì mọi byte đều gần 0 — bắt luôn ca "ô đen" kinh điển.
    const sang = Buffer.from(a, 'hex').reduce((n, x) => n + x, 0) / (8 * 4 * 3);
    dat('nền không phải ô đen', sang > 12, `độ sáng trung bình ${sang.toFixed(1)}/255`);
  }

  console.log('\n4. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
  don();
  console.log('Đã xoá clip tạm và video thử.');
}

console.log(hong === 0 ? '\n✅ Thành phần video: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
