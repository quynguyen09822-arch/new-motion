#!/usr/bin/env node
/**
 * KIỂM NÚT CHẠY / DỪNG.
 *
 * Ba lỗi thật đã từng có cùng lúc, ngày 10/09/2026:
 *   1. Bấm Dừng thì nhãn đổi thành "Chạy" nhưng phim VẪN CHẠY TIẾP — vì
 *      `player.js` dừng bằng `seek(at())`, mà `seek` không hề đặt `DUNG`.
 *   2. Phim tự chạy hết thì nút kẹt ở nhãn "❚❚ Dừng" và đồng hồ đóng băng.
 *   3. Bấm Chạy khi đang đứng ở cuối phim thì không có gì nhúc nhích.
 *
 * Chạy trên clip THẬT (chỉ đọc, không sửa gì) nên không cần dọn dẹp.
 *
 *   node tools/kiem-chay-dung.mjs [http://127.0.0.1:7803]
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
const trang = await trinh.newPage({ viewport: { width: 1400, height: 900 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

const giay = () => trang.evaluate(() => document.getElementById('khung').contentWindow.__clip.at());
const nhan = () => trang.evaluate(() => document.getElementById('nut-chay').textContent.trim());

async function moClip() {
  await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"], #app[data-trang-thai="hong"]',
    { timeout: 40000 });
  await trang.selectOption('#chon-clip', 'cta');
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 30000 });
  await trang.waitForTimeout(600);
}

try {
  /* ---------- 1. bộ dựng có hàm dừng thật ---------- */
  await moClip();
  console.log('\n1. Bộ dựng có hàm dừng');
  const coPause = await trang.evaluate(() => {
    const c = document.getElementById('khung').contentWindow.__clip;
    return { pause: typeof c.pause, paused: typeof c.paused };
  });
  dat('scene-player.html có `pause()`', coPause.pause === 'function',
    coPause.pause === 'function' ? '' : 'ĐÃ MẤT — xem docs/DUNG-CHAY.md');
  dat('scene-player.html có `paused`', coPause.paused === 'boolean');

  /* ---------- 2. dừng là đứng hẳn ---------- */
  console.log('\n2. Bấm Dừng thì phim đứng hẳn');
  await trang.click('#nut-chay');
  await trang.waitForTimeout(700);
  dat('đang chạy thì nhãn là "Dừng"', (await nhan()).includes('Dừng'), await nhan());
  await trang.click('#nut-chay');
  const t1 = await giay();
  await trang.waitForTimeout(1200);
  const t2 = await giay();
  dat('sau 1,2 giây phim không nhích', Math.abs(t2 - t1) < 0.05,
    `${t1.toFixed(2)} → ${t2.toFixed(2)}`);
  dat('nhãn trở về "Chạy"', (await nhan()).includes('Chạy'), await nhan());

  /* ---------- 3. chạy tiếp được ---------- */
  console.log('\n3. Bấm Chạy thì chạy tiếp từ đúng chỗ đang đứng');
  await trang.click('#nut-chay');
  await trang.waitForTimeout(800);
  const t3 = await giay();
  dat('phim chạy tiếp', t3 > t2 + 0.3, `${t2.toFixed(2)} → ${t3.toFixed(2)}`);

  /* ---------- 4. tự hết phim ---------- */
  console.log('\n4. Phim tự chạy hết');
  await trang.evaluate(() => {
    const c = document.getElementById('khung').contentWindow.__clip;
    c.seek(c.duration - 0.4);
  });
  await trang.waitForTimeout(1500);
  dat('nhãn tự trở về "Chạy"', (await nhan()).includes('Chạy'), await nhan());
  const dongHo = await trang.evaluate(() => document.getElementById('dong-ho').textContent);
  dat('đồng hồ chạy tới cuối, không đóng băng giữa chừng', /6,0 \/ 6,0/.test(dongHo), dongHo);

  /* ---------- 5. bấm Chạy ở cuối phim ---------- */
  console.log('\n5. Bấm Chạy khi đang đứng ở cuối phim');
  const t4 = await giay();
  await trang.click('#nut-chay');
  await trang.waitForTimeout(700);
  const t5 = await giay();
  dat('quay về đầu rồi chạy lại', t5 < t4, `${t4.toFixed(2)} → ${t5.toFixed(2)}`);

  /* ---------- 6. kéo thanh tua trong lúc đang dừng ---------- */
  console.log('\n6. Đang dừng mà kéo thanh tua');
  await trang.click('#nut-chay');                       // dừng lại
  await trang.waitForTimeout(200);
  await trang.evaluate(() => {
    const th = document.getElementById('thanh-tua');
    th.value = '500';
    th.dispatchEvent(new Event('input', { bubbles: true }));
    th.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await trang.waitForTimeout(600);
  const t6 = await giay();
  await trang.waitForTimeout(700);
  const t7 = await giay();
  dat('tua tới được giữa phim', Math.abs(t6 - 3) < 0.6, t6.toFixed(2));
  dat('tua xong vẫn đứng yên, không tự chạy', Math.abs(t7 - t6) < 0.05,
    `${t6.toFixed(2)} → ${t7.toFixed(2)}`);

  /* ---------- 7. ĐƯỜNG LÙI: bộ dựng mất `pause()` ---------- */
  /* `scene-player.html` là file dự án chung, có người thay cả file. Khi đoạn
     thêm biến mất, nút Dừng KHÔNG được phép hỏng trở lại. */
  console.log('\n7. Đường lùi khi bộ dựng mất `pause()`');
  await moClip();
  await trang.evaluate(() => {
    const w = document.getElementById('khung').contentWindow;
    const c = w.__clip;
    // Dựng lại một `__clip` đời cũ: có play/seek/at, KHÔNG có pause/paused.
    w.__clip = { get duration() { return c.duration; }, ready: c.ready,
      play: c.play, at: c.at, seek: c.seek, step: c.step, load: c.load, scenes: c.scenes };
  });
  await trang.reload({ waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.waitForTimeout(500);
  const gia = await trang.evaluate(() => {
    // Sau khi tải lại thì `__clip` thật quay về — gỡ `pause` đi để giả bản cũ.
    const c = document.getElementById('khung').contentWindow.__clip;
    delete c.pause;
    return typeof c.pause;
  });
  dat('đã giả được bản dựng thiếu `pause`', gia === 'undefined');
  await trang.click('#nut-chay');
  await trang.waitForTimeout(700);
  await trang.click('#nut-chay');
  const t8 = await giay();
  await trang.waitForTimeout(1000);
  const t9 = await giay();
  dat('đường lùi vẫn ghim được phim tại chỗ', Math.abs(t9 - t8) < 0.15,
    `${t8.toFixed(2)} → ${t9.toFixed(2)}`);

  console.log('\n8. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');

  await trang.screenshot({ path: path.join(M, '.kiem', 'chay-dung.png'), scale: 'css' });
} finally {
  await trinh.close();
}

console.log(hong === 0 ? '\n✅ Nút chạy/dừng: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
