#!/usr/bin/env node
/**
 * KIỂM RÃNH TIẾNG — lời đọc, nhạc nền, tiếng động.
 *
 * PHÉP ĐO MẠNH NHẤT ở mục 4: dựng một clip chỉ có ĐÚNG MỘT tiếng động đặt ở giây
 * 2,0, xuất ra video, rồi đo độ to theo từng ô 0,1 giây. Đỉnh phải rơi vào ô
 * giây 2,0 và hai bên phải im. "ffmpeg chạy xong mã 0" không chứng minh được gì
 * — nó vẫn trả 0 khi ghép nhầm chỗ hoặc ghép rãnh rỗng.
 *
 * Mục 2 canh một điều dễ hỏng lặng lẽ: lúc xuất video thì trang KHÔNG được tạo
 * thẻ <audio> nào. Bộ xuất nhảy từng khung, thẻ <audio> chạy theo đồng hồ thật
 * sẽ vừa vô ích vừa làm chậm — mà không ai nhận ra vì video vẫn ra bình thường.
 *
 *   node tools/kiem-tieng.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const NHAC = 'public/voice-test/Purple Desire - The Grey Room _ Clark Sims.mp3';
const canh = (ranh) => ({
  version: 2,
  meta: { name: 'thu tieng', width: 1280, height: 720, density: 1, bg: '#ffffff', ink: '#111111' },
  audio: { tracks: ranh },
  scenes: [{ id: 'c1', duration: 4, stagger: 0, elements: [
    { id: 'o', kind: 'panel', x: 400, y: 200, w: 300, h: 200, fill: '#3366cc',
      in: { kind: 'none', dur: 0.001 } }] }],
});

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));
const don = [];

try {
  /* ---------- 1. bộ dựng dựng được rãnh tiếng ---------- */
  console.log('\n1. Bộ dựng nhận rãnh tiếng');
  await trang.goto(`${GOC}/clip/scene-player.html?scene=cta`, { waitUntil: 'domcontentloaded' });
  await trang.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await trang.evaluate(() => window.__clip.ready());

  const ranh = [
    { id: 'nhac', src: NHAC, kind: 'nhac', at: 0, gain: 0.4, fadeIn: 0.5 },
    { id: 'vut', src: 'public/sfx/whoosh.mp3', kind: 'hieu-ung', at: 2, gain: 1 },
  ];
  await trang.evaluate((c) => window.__clip.load(c), canh(ranh));
  await trang.waitForTimeout(700);

  const co = await trang.evaluate(() => ({
    the: document.querySelectorAll('audio').length,
    ke: (window.__clip.tieng || []).map((t) => t.id),
  }));
  dat('mỗi rãnh dựng ra một thẻ tiếng', co.the === 2, `${co.the} thẻ`);
  dat('bộ dựng mở danh sách rãnh cho bộ xuất', co.ke.join(',') === 'nhac,vut', co.ke.join(', '));

  /* ---------- 2. tua tới đâu, tiếng chạy tới đó ---------- */
  console.log('\n2. Tiếng bám theo đồng hồ của clip');
  const doTai = async (giay) => {
    await trang.evaluate((s) => window.__clip.seek(s), giay);
    await trang.waitForTimeout(350);
    return trang.evaluate(() => [...document.querySelectorAll('audio')]
      .map((a) => ({ t: a.currentTime, dung: a.paused, to: a.volume })));
  };
  const o1 = await doTai(1.0);
  dat('tua tới giây 1 thì nhạc nhảy theo', Math.abs(o1[0].t - 1.0) < 0.2, `nhạc ở ${o1[0].t.toFixed(2)}s`);
  dat('tiếng động chưa tới lượt thì đứng im', o1[1].dung === true, o1[1].dung ? 'đang dừng' : 'ĐANG CHẠY');
  const o2 = await doTai(2.3);
  dat('tới giây 2,3 thì tiếng động vào đúng 0,3s', Math.abs(o2[1].t - 0.3) < 0.2,
    `tiếng động ở ${o2[1].t.toFixed(2)}s`);

  const o0 = await doTai(0.1);
  dat('mờ vào làm nhạc nhỏ lại lúc mở đầu', o0[0].to < 0.4 * 0.5,
    `độ to ${o0[0].to.toFixed(3)} (đầy đủ là 0,400)`);

  /* ---------- 3. lúc xuất video thì KHÔNG dựng thẻ tiếng ---------- */
  console.log('\n3. Chế độ xuất video không dựng thẻ tiếng');
  const t2 = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
  await t2.goto(`${GOC}/clip/scene-player.html?scene=cta&export=1`, { waitUntil: 'domcontentloaded' });
  await t2.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await t2.evaluate(() => window.__clip.ready());
  await t2.evaluate((c) => window.__clip.load(c), canh(ranh));
  await t2.waitForTimeout(500);
  const xt = await t2.evaluate(() => ({
    the: document.querySelectorAll('audio').length,
    ke: (window.__clip.tieng || []).length,
  }));
  dat('không dựng thẻ tiếng nào', xt.the === 0, `${xt.the} thẻ`);
  dat('nhưng vẫn mở danh sách rãnh cho ffmpeg', xt.ke === 2, `${xt.ke} rãnh`);
  await t2.close();

  /* ---------- 4. TIẾNG RƠI ĐÚNG GIÂY TRONG VIDEO XUẤT RA ---------- */
  console.log('\n4. Trong video xuất ra, tiếng động rơi đúng giây');
  const tam = path.join(PROJ, 'scenes', 'kiem-tieng-tam.json');
  const ra = path.join(PROJ, 'out', 'kiem-tieng.mp4');
  don.push(tam, ra);
  // Chỉ MỘT tiếng động, không nhạc — để đỉnh nào cũng là của nó.
  writeFileSync(tam, JSON.stringify(canh([
    { id: 'vut', src: 'public/sfx/whoosh.mp3', kind: 'hieu-ung', at: 2, gain: 1 }]), null, 2), 'utf8');
  execFileSync('node', [path.join(M, 'tools/xuat-nhanh.mjs'),
    '--url', `${GOC}/clip/scene-player.html?scene=kiem-tieng-tam`,
    '--preset', '720p', '--out', 'kiem-tieng.mp4'], { encoding: 'utf8', timeout: 400000 });
  dat('xuất ra được file', existsSync(ra));

  const ma = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', ra], { encoding: 'utf8' }).trim();
  dat('video có rãnh tiếng', ma === 'aac', ma || 'không có');

  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', ra, '-ac', '1', '-ar', '8000',
    '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  const B = 800;                                   // ô 0,1 giây
  const o = [];
  for (let i = 0; i + B <= Math.floor(pcm.length / 2); i += B) {
    let s = 0;
    for (let j = i; j < i + B; j++) { const v = pcm.readInt16LE(j * 2); s += v * v; }
    o.push(Math.sqrt(s / B));
  }
  const dinh = o.indexOf(Math.max(...o));
  dat('chỗ to nhất rơi vào quãng giây 2', Math.abs(dinh / 10 - 2) <= 0.3, `đỉnh ở giây ${(dinh / 10).toFixed(1)}`);
  const imTruoc = o.slice(0, 15).every((v) => v < 200);
  dat('trước giây 1,5 thì im', imTruoc, `to nhất trước đó ${Math.max(...o.slice(0, 15)).toFixed(0)}`);

  /* ---------- 5. máy chủ ---------- */
  console.log('\n5. Máy chủ: kho tiếng và sóng âm');
  const kho = await (await fetch(`${GOC}/api/tieng`)).json();
  dat('liệt kê được file tiếng trong dự án', kho.ok && kho.kho.length > 0, `${kho.kho?.length || 0} file`);
  const sa = await (await fetch(`${GOC}/api/song-am?src=${encodeURIComponent('public/sfx/whoosh.mp3')}&o=60`)).json();
  dat('đo được sóng âm', sa.ok && sa.dinh?.length === 60 && sa.giay > 0,
    sa.ok ? `${sa.giay.toFixed(2)}s · đỉnh ${sa.to.toFixed(3)}` : sa.loi);
  dat('sóng có hình dạng thật, không phẳng lì', sa.ok && sa.to > 0.005 && sa.dinh.some((v) => v < sa.to * 0.3),
    sa.ok ? `đỉnh ${sa.to.toFixed(3)}` : '—');
  const xau = await (await fetch(`${GOC}/api/song-am?src=${encodeURIComponent('../.env')}`)).json();
  dat('chặn đường dẫn trèo ra ngoài dự án', xau.ok === false, xau.loi || 'KHÔNG CHẶN');

  /* ---------- 6. bảng trong giao diện ---------- */
  console.log('\n6. Bảng rãnh tiếng trong giao diện');
  const t3 = await trinh.newPage({ viewport: { width: 1500, height: 950 } });
  const loi3 = []; t3.on('pageerror', (e) => loi3.push(String(e)));
  await t3.goto(GOC, { waitUntil: 'networkidle' });
  await t3.waitForTimeout(2000);
  await t3.selectOption('#chon-clip', 'wireframe-thu');
  await t3.waitForTimeout(2000);
  await t3.click('#the-tieng');
  await t3.waitForTimeout(2500);
  const bang = await t3.evaluate(() => {
    const b = document.querySelector('#bang-tieng');
    return {
      hien: !b.classList.contains('an'),
      ranh: b.querySelectorAll('.ranh').length,
      song: b.querySelectorAll('.ranh-song svg path').length,
      ten: [...b.querySelectorAll('.ranh-ten')].map((x) => x.textContent).filter(Boolean).length,
      trai: [...b.querySelectorAll('.ranh-song')].map((x) => parseFloat(x.style.left) || 0),
    };
  });
  dat('bảng mở được', bang.hien);
  dat('mỗi rãnh vẽ một sóng âm', bang.ranh > 0 && bang.song === bang.ranh,
    `${bang.ranh} rãnh · ${bang.song} sóng`);
  dat('rãnh nào cũng hiện tên file', bang.ten === bang.ranh, `${bang.ten}/${bang.ranh}`);
  // clip mẫu dài 24s, tiếng động đặt ở giây 2,2 → phải nằm quanh 9,2%
  dat('sóng đặt đúng chỗ theo chiều dài clip',
    bang.trai.some((v) => Math.abs(v - 9.17) < 1), bang.trai.map((v) => `${v.toFixed(1)}%`).join(' · '));
  dat('không có lỗi JS trong giao diện', loi3.length === 0, loi3.slice(0, 2).join(' | ') || 'sạch');
  await t3.close();

  dat('không có lỗi JS trong bộ dựng', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
  for (const f of don) { try { if (existsSync(f)) (f.endsWith('.json') ? unlinkSync : rmSync)(f, { force: true }); } catch { /* kệ */ } }
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Rãnh tiếng đạt hết.\n');
process.exit(hong ? 1 : 0);
