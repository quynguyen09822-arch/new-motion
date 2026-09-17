#!/usr/bin/env node
/**
 * XUẤT VIDEO NHANH — nhảy từng khung, chia nhiều luồng.
 *
 * KHÁC `export-video.mjs` Ở ĐÂU
 *   Bộ cũ cho phim chạy đúng tốc độ thật rồi quay màn hình. Ba phút phim tốn ba
 *   phút, và khung nào rớt thì rớt — mỗi lần chạy ra một kết quả hơi khác.
 *   Bộ này nhảy thẳng tới từng mốc giây rồi chụp: khung số n LUÔN là giây n/fps,
 *   không phụ thuộc máy nhanh hay chậm, và chạy lại bao nhiêu lần cũng ra đúng
 *   một file.
 *
 * VÌ SAO GIỜ MỚI LÀM ĐƯỢC
 *   Chú thích trong bộ cũ ghi là không được nhảy khung vì vài hiệu ứng chạy theo
 *   đồng hồ trình duyệt. Điều đó đã hết đúng: `TICK.video` kéo cả phim lồng bên
 *   trong về đồng hồ clip, và `kiem-hieu-ung` canh mọi hiệu ứng phải là hàm thuần
 *   của `t`. Đo lại bằng `tools/do-tat-dinh.mjs`: 24/24 mốc khớp, kể cả khi đi
 *   ngược và khi nạp lại trang.
 *
 * ĐO ĐƯỢC (máy 12 lõi, rảnh — xem `tools/do-toc-xuat.mjs`)
 *   nhảy khung 5,2ms · chụp 47,9ms → nút thắt là khâu CHỤP, không phải khâu nhảy.
 *   Chia 4 luồng thì nhanh gấp 2,8 lần so với quay thời gian thật.
 *   ⚠️ Số này TỤT vài lần khi máy bận. Đo lúc máy tải 23/12 lõi ra 80–210ms mỗi
 *   khung, tức là chậm hơn cả quay thật. Cần quyết thì đo lại, đừng tin số cũ.
 *
 * MỖI LUỒNG MỘT THƯ MỤC TẠM RIÊNG. Bộ cũ phải xếp hàng một-việc-một-lúc vì nó
 * để khung tạm ở một chỗ cố định, hai lệnh chạy cùng lúc là giẫm lên nhau và cho
 * ra hai video hỏng trong im lặng. Ở đây mỗi lần chạy sinh một thư mục riêng
 * theo mã việc, nên chạy song song được thật.
 *
 * Dùng:
 *   node tools/xuat-nhanh.mjs --url <trang> --out ten.mp4
 *   --preset 1080p|720p|4k|reels|vertical-4k     --format mp4|webm|gif|png
 *   --fps 30      --luong 4      --chat 18       --tu 0 --den 0
 */
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, statSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };

const KHO = {
  '1080p': { w: 1920, h: 1080 }, '720p': { w: 1280, h: 720 }, '4k': { w: 3840, h: 2160 },
  reels: { w: 1080, h: 1920 }, 'vertical-4k': { w: 2160, h: 3840 },
};
const preset = arg('preset', '1080p');
if (!KHO[preset]) throw new Error(`khổ không có: ${preset} (có: ${Object.keys(KHO).join(', ')})`);
const { w: RA_W, h: RA_H } = KHO[preset];
const DOC = RA_H > RA_W;
const NEN_W = DOC ? 720 : 1280, NEN_H = DOC ? 1280 : 720;

const URL_TRANG = arg('url', 'http://127.0.0.1:7803/clip/scene-player.html?scene=cta');
const FPS = Number(arg('fps', 30));
const CRF = arg('chat', '18');
const DINH_DANG = arg('format', 'mp4');
const RA = path.resolve(PROJ, 'out', arg('out', `xuat-nhanh-${Date.now()}.${DINH_DANG === 'png' ? 'zip' : DINH_DANG}`));
const TU = Number(arg('tu', 0));

/* Số luồng: mặc định 4, nhưng không bao giờ quá nửa số lõi — mỗi luồng là một
   Chromium, ăn hết lõi thì các luồng giành nhau và tổng thời gian còn xấu hơn. */
const LOI = (await import('node:os')).cpus().length;
const LUONG = Math.max(1, Math.min(Number(arg('luong', 4)), Math.max(1, Math.floor(LOI / 2))));

const noi = (u, x) => u + (u.includes('?') ? '&' : '?') + x;
const TAM = mkdtempSync(path.join(tmpdir(), 'xuat-nhanh-'));

const chay = (lenh, args, opt = {}) => new Promise((res, rej) => {
  const c = spawn(lenh, args, { stdio: ['ignore', 'ignore', 'pipe'], ...opt });
  let er = '';
  c.stderr.on('data', (d) => { er += d; });
  c.on('close', (m) => (m === 0 ? res() : rej(new Error(`${lenh} mã ${m}: ${er.slice(-400)}`))));
});

/* ---------- hỏi thời lượng trước, để còn chia phần cho các luồng ---------- */
const br0 = await chromium.launch({ args: ['--hide-scrollbars'] });
const pg0 = await br0.newPage({ viewport: { width: NEN_W, height: NEN_H } });
await pg0.goto(noi(URL_TRANG, 'export=1'), { waitUntil: 'load' });
await pg0.waitForFunction(() => Boolean(window.__clip), null, { timeout: 30000 });
await pg0.evaluate(() => window.__clip.ready());
const DAI = await pg0.evaluate(() => window.__clip.duration);
/* Rãnh tiếng lấy TỪ TRANG chứ không đọc lại file JSON: trang là nơi duy nhất
   biết mình đang dựng kịch bản nào (có thể đã được studio nạp đè bằng `load`). */
const RANH = await pg0.evaluate(() => (window.__clip.tieng || []));
await br0.close();

const DEN = Number(arg('den', 0)) || DAI;
const SO_KHUNG = Math.max(1, Math.round((DEN - TU) * FPS));
console.log(`Xuất ${RA_W}×${RA_H} · ${FPS} hình/giây · ${DINH_DANG} · ${LUONG} luồng`);
console.log(`Từ giây ${TU} tới ${DEN.toFixed(2)} → ${SO_KHUNG} khung · mỗi khung đúng giây của nó`);

/* ---------- chia phần: luồng k lo các khung k, k+LUONG, k+2·LUONG… KHÔNG phải
     một đoạn liền. Chia theo đoạn liền thì luồng nào trúng cảnh nặng sẽ chạy lâu
     hơn hẳn, và cả bộ phải đợi nó. Chia xen kẽ thì việc nặng rải đều. ---------- */
const bat = Date.now();
let xong = 0;
const motLuong = async (k) => {
  const br = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  const pg = await br.newPage({
    viewport: { width: NEN_W, height: NEN_H },
    deviceScaleFactor: RA_W / NEN_W,
  });
  await pg.goto(noi(URL_TRANG, 'export=1'), { waitUntil: 'load' });
  await pg.waitForFunction(() => Boolean(window.__clip), null, { timeout: 30000 });
  await pg.evaluate(() => window.__clip.ready());
  const cdp = await pg.context().newCDPSession(pg);
  for (let n = k; n < SO_KHUNG; n += LUONG) {
    await pg.evaluate((s) => window.__clip.step(s), TU + n / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94 });
    writeFileSync(path.join(TAM, `k${String(n).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64'));
    if (++xong % 60 === 0 || xong === SO_KHUNG) {
      const s = (Date.now() - bat) / 1000;
      process.stdout.write(`\r  khung ${xong}/${SO_KHUNG} · ${(xong / s).toFixed(1)} khung/giây`
        + ` · còn ~${Math.round((s / xong) * (SO_KHUNG - xong))}s    `);
    }
  }
  await br.close();
};
await Promise.all(Array.from({ length: LUONG }, (_, k) => motLuong(k)));
const giayHung = (Date.now() - bat) / 1000;
console.log(`\nHứng xong ${SO_KHUNG} khung trong ${giayHung.toFixed(1)}s`
  + ` (quay theo thời gian thật sẽ tốn ${(DEN - TU).toFixed(0)}s)`);

const co = readdirSync(TAM).filter((f) => f.endsWith('.jpg')).length;
if (co !== SO_KHUNG) { rmSync(TAM, { recursive: true, force: true }); throw new Error(`thiếu khung: ${co}/${SO_KHUNG}`); }

/* ---------- tiếng ----------
 * Tiếng KHÔNG quay theo khung hình được — bộ xuất nhảy từng khung, không có
 * khái niệm "thời gian thật" để thu. Nên ffmpeg ghép tiếng vào sau, từ đúng
 * danh sách rãnh mà trang đang dùng.
 *
 * Thứ tự bộ lọc có ý nghĩa: cắt → đặt lại mốc → chỉnh to nhỏ → mờ vào/ra →
 * RỒI MỚI đẩy lùi (`adelay`). Đẩy lùi trước thì `afade` tính mốc theo thời
 * gian đã lùi và vệt mờ rơi sai chỗ.
 */
function dungTieng() {
  const vao = [], loc = [], nhan = [];
  /* Đếm SỐ LUỒNG VÀO, không dùng `vao.length`: mỗi rãnh đẩy vào 6 phần tử
     (`-ss`, giá trị, `-t`, giá trị, `-i`, đường dẫn), nên lấy độ dài mảng sẽ ra
     số thứ tự 1, 7, 13, 19 thay vì 1, 2, 3, 4 — và ffmpeg báo "Invalid argument"
     chứ không nói rõ là sai chỗ nào. */
  let so = 0;
  for (const [i, r] of RANH.entries()) {
    if (!r || !r.src) continue;
    const f = path.resolve(PROJ, r.src);
    if (!existsSync(f)) { console.log(`  ⚠ bỏ qua rãnh "${r.id || i}" — không thấy file ${r.src}`); continue; }
    let dai = 0;
    try {
      dai = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim()) || 0;
    } catch { /* đọc không được thì để 0, dưới sẽ bỏ qua */ }
    if (!dai) { console.log(`  ⚠ bỏ qua rãnh "${r.id || i}" — không đọc được thời lượng`); continue; }
    const tu = Math.max(0, r.from || 0);
    const L = Math.max(0.01, r.for != null ? r.for : dai - tu);
    const D = Math.round(Math.max(0, r.at || 0) * 1000);
    const G = r.gain != null ? r.gain : 1;
    const fi = r.fadeIn || 0, fo = r.fadeOut || 0;
    const k = ++so;                                // luồng 0 là chuỗi khung hình
    vao.push('-ss', String(tu), '-t', String(L), '-i', f);
    const b = [`[${k}:a]`, 'aresample=48000', 'asetpts=PTS-STARTPTS', `volume=${G}`];
    if (fi > 0) b.push(`afade=t=in:st=0:d=${fi}`);
    if (fo > 0) b.push(`afade=t=out:st=${Math.max(0, L - fo)}:d=${fo}`);
    if (D > 0) b.push(`adelay=${D}|${D}`);
    const ten = `[at${k}]`;
    loc.push(b.slice(0, 1).concat(b.slice(1).join(',')).join('') + ten);
    nhan.push(ten);
  }
  if (!nhan.length) return null;
  // `normalize=0`: amix mặc định chia đều độ to cho số rãnh, nên thêm một tiếng
  // động nhỏ là cả lời đọc tụt xuống một nửa — nghe như hỏng máy.
  loc.push(`${nhan.join('')}amix=inputs=${nhan.length}:normalize=0:dropout_transition=0,atrim=0:${(DEN - TU).toFixed(3)}[ara]`);
  return { vao, loc: loc.join(';') };
}
const TIENG = dungTieng();
if (TIENG) console.log(`Ghép ${TIENG.vao.filter((x) => x === '-i').length} rãnh tiếng`);

/* ---------- ghép ---------- */
mkdirSync(path.dirname(RA), { recursive: true });
const VAO = ['-start_number', '0', '-framerate', String(FPS), '-i', path.join(TAM, 'k%06d.jpg')];
const SCALE = `scale=${RA_W}:${RA_H}:flags=lanczos`;
let args;
if (DINH_DANG === 'png') {
  /* Chuỗi ảnh PNG phải gói lại thành MỘT file zip, không để nguyên thư mục:
     giao diện đưa cho người dùng một đường tải duy nhất, mà một thư mục thì
     không tải được — bấm vào là lỗi 404 và chẳng ai hiểu vì sao. */
  const thuMuc = RA.replace(/\.[^.]+$/, '');
  mkdirSync(thuMuc, { recursive: true });
  console.log('Đang đổi sang chuỗi ảnh PNG…');
  await chay('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    ...VAO, '-vf', SCALE, path.join(thuMuc, 'k%06d.png')]);
  rmSync(TAM, { recursive: true, force: true });
  const so = readdirSync(thuMuc).length;
  console.log('Đang gói lại thành một file zip…');
  await chay('zip', ['-q', '-r', '-0', RA, path.basename(thuMuc)], { cwd: path.dirname(RA) });
  rmSync(thuMuc, { recursive: true, force: true });   // giữ cả hai là tốn đôi đĩa
  console.log(`\n✅ Xong: ${RA}`);
  console.log(`   ${(statSync(RA).size / 1024 / 1024).toFixed(1)} MB · ${so} ảnh PNG`
    + ` · ${(DEN - TU).toFixed(2)} giây`);
  process.exit(0);
} else if (DINH_DANG === 'webm') {
  args = TIENG
    ? [...VAO, ...TIENG.vao, '-filter_complex', `${TIENG.loc}`, '-map', '0:v', '-map', '[ara]',
       '-vf', `${SCALE},format=yuv420p`, '-c:v', 'libvpx-vp9', '-crf', String(Number(CRF) + 12),
       '-b:v', '0', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '128k', '-shortest', RA]
    : [...VAO, '-vf', `${SCALE},format=yuv420p`, '-c:v', 'libvpx-vp9',
       '-crf', String(Number(CRF) + 12), '-b:v', '0', '-row-mt', '1', RA];
} else if (DINH_DANG === 'gif') {
  args = [...VAO, '-vf',
    `fps=${Math.min(FPS, 15)},scale=${Math.round(RA_W / 2)}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer`,
    '-loop', '0', RA];
} else if (TIENG) {
  args = [...VAO, ...TIENG.vao, '-filter_complex', `${TIENG.loc}`,
    '-map', '0:v', '-map', '[ara]', '-vf', `${SCALE},format=yuv420p`,
    '-c:v', 'libx264', '-crf', CRF, '-preset', 'medium', '-profile:v', 'high',
    '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', RA];
} else {
  // Không có rãnh nào thì vẫn kèm một luồng im lặng — nhiều nền tảng từ chối
  // video không có tiếng, và lỗi đó chỉ lộ ra lúc đăng bài.
  args = [...VAO, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-map', '0:v', '-map', '1:a', '-vf', `${SCALE},format=yuv420p`,
    '-c:v', 'libx264', '-crf', CRF, '-preset', 'medium', '-profile:v', 'high',
    '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', '-shortest', RA];
}
console.log(`Đang ghép bằng ffmpeg (${DINH_DANG})…`);
await chay('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
rmSync(TAM, { recursive: true, force: true });
console.log(`\n✅ Xong: ${RA}`);
console.log(`   ${(statSync(RA).size / 1024 / 1024).toFixed(1)} MB · ${(DEN - TU).toFixed(2)} giây`
  + ` · nhanh gấp ${((DEN - TU) / giayHung).toFixed(1)} lần so với quay thật`);
