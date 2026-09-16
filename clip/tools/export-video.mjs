/**
 * XUẤT VIDEO từ animatic.
 *
 * Cách làm: mở trang ở chế độ xuất (?export=1), cho chạy đúng tốc độ thật rồi
 * hứng từng khung hình do trình duyệt vẽ ra (Chromium screencast), sau đó ghép
 * bằng ffmpeg.
 *
 *   Vì sao hứng theo thời gian thật mà không nhảy từng khung: một số hiệu ứng
 *   trong animatic vẫn chạy theo đồng hồ của trình duyệt (xem mục G1 trong
 *   docs/PLAN.md). Nhảy từng khung sẽ làm chúng sai nhịp. Chạy thật thì hình ra
 *   đúng y như lúc xem. Đổi lại, dựng 90 giây phim tốn đúng 90 giây.
 *
 * Dùng:
 *   node export-video.mjs                          → MP4 1080p chất lượng cao
 *   node export-video.mjs --quality max            → nén nhẹ tay nhất, file to
 *   node export-video.mjs --format webm            → WebM VP9 cho nhúng web
 *   node export-video.mjs --format gif --fps 15    → ảnh động gửi chat
 *   node export-video.mjs --preset 4k              → 3840x2160
 *   node export-video.mjs --preset reels           → 1080x1920 dọc (bố cục body.vertical riêng)
 *   node export-video.mjs --preset vertical-4k     → 2160x3840 dọc, nét nhất
 *   node export-video.mjs --from 14 --to 31        → chỉ dựng một đoạn (để xem thử nhanh)
 *
 *   node export-video.mjs --every 1 --jpeg 92      → hứng dày hơn, nén khung tạm nhẹ tay hơn
 *
 *     Dùng khi bản dựng bị rớt khung: mặc định máy lấy 1 trong 2 khung (chờ
 *     trình duyệt vẽ đủ 60 hình/giây) và nén khung tạm ở mức 100. Trang nào
 *     nặng, trình duyệt chỉ vẽ nổi ~55 hình/giây thì cách lấy đó ra chưa tới 30.
 *     Đặt --every 1 để lấy mọi khung vẽ được, --jpeg thấp hơn để khâu hứng nhẹ đi;
 *     thời lượng thật của từng khung vẫn được ghi lại nên phim không bị sai tốc độ.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, createWriteStream, statSync } from 'node:fs';
import path from 'node:path';

// ---------- tham số ----------
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };

const PRESETS = {                       // khung hình đích
  '1080p': { w: 1920, h: 1080 },
  '720p':  { w: 1280, h: 720 },
  '4k':    { w: 3840, h: 2160 },
  // dọc 9:16 — khung logic 720×1280 (xem body.vertical trong animatic)
  'shorts':      { w: 1080, h: 1920 },
  'reels':       { w: 1080, h: 1920 },
  'tiktok':      { w: 1080, h: 1920 },
  'vertical-4k': { w: 2160, h: 3840 },
};
const QUALITY = {                       // crf: số nhỏ = nét hơn, file to hơn
  max:    { crf: 15, preset: 'slow'   },
  high:   { crf: 19, preset: 'medium' },
  medium: { crf: 23, preset: 'medium' },
  low:    { crf: 28, preset: 'fast'   },
};

const preset = arg('preset', '1080p');
const quality = arg('quality', 'high');
const format = arg('format', 'mp4');
const FPS = Number(arg('fps', 30));
const FROM = Number(arg('from', 0));
const TO = Number(arg('to', 0)) || null;
const URL_PAGE = arg('url', 'http://127.0.0.1:8080/vibe-hosting-animatic-90s.html');
const WIREFRAME = argv.includes('--wireframe'); // che tên/URL dự án thật trong bảng dashboard

if (!PRESETS[preset]) throw new Error('preset không có: ' + preset + ' (có: ' + Object.keys(PRESETS) + ')');
if (!QUALITY[quality]) throw new Error('quality không có: ' + quality + ' (có: ' + Object.keys(QUALITY) + ')');

const { w: OUT_W, h: OUT_H } = PRESETS[preset];
const VERTICAL = OUT_H > OUT_W;                     // khung dọc dùng layout body.vertical riêng
const BASE_W = VERTICAL ? 720 : 1280, BASE_H = VERTICAL ? 1280 : 720;
const SCALE = OUT_W / BASE_W;
const TMP = path.resolve('.export-frames');
const OUT_DIR = path.resolve('../out');
mkdirSync(OUT_DIR, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const outName = arg('out', `vibe-hosting-${preset}-${quality}.${format}`);
const OUT = path.join(OUT_DIR, outName);

console.log(`Xuất ${OUT_W}x${OUT_H} · ${FPS} hình/giây · chất lượng ${quality} · định dạng ${format}`);

// ---------- hứng khung hình ----------
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const page = await browser.newPage({
  viewport: { width: BASE_W, height: BASE_H },
  deviceScaleFactor: SCALE,
});
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));

// Nối tham số cho đúng: URL đã có `?` rồi thì phải dùng `&`, không thì hỏng
// (trang dựng cảnh nhận `?scene=...`).
const withParams = (url, extra) => url + (url.includes('?') ? '&' : '?') + extra;
await page.goto(withParams(URL_PAGE, 'export=1' + (VERTICAL ? '&vertical=1' : '') + (WIREFRAME ? '&wireframe=1' : '')), { waitUntil: 'load' });
// Trang dựng cảnh nạp kịch bản BẤT ĐỒNG BỘ rồi mới gán `window.__clip`, nên
// `waitUntil: 'load'` chưa đủ — phải chờ đúng nó xuất hiện. Trước đây chạy được
// chỉ vì máy nhanh hơn trang; hôm nào trang nặng hơn là hỏng, mà lỗi lại hiện ra
// thành "không đọc được thuộc tính của undefined" chẳng liên quan gì tới nguyên nhân.
await page.waitForFunction(() => Boolean(window.__clip), null, { timeout: 15000 });
await page.evaluate(() => window.__clip.ready());
const DUR = await page.evaluate(() => window.__clip.duration);
const T0 = FROM, T1 = TO ?? DUR;
if (FROM > 0) await page.evaluate((s) => window.__clip.seek?.(s), FROM);

const cdp = await page.context().newCDPSession(page);
const frames = [];
let writing = 0;

cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  const i = frames.length;
  frames.push({ ts: metadata.timestamp });
  writing++;
  const f = path.join(TMP, `f${String(i).padStart(6, '0')}.jpg`);
  const ws = createWriteStream(f);
  ws.end(Buffer.from(data, 'base64'), () => { writing--; });
});

// Mặc định everyNthFrame 2: trình duyệt vẽ 60 hình/giây, ta lấy 1 trong 2 → khoảng 30.
// Trang nặng vẽ chậm hơn 60 thì đặt --every 1 để lấy hết những khung vẽ được.
const EVERY = Number(arg('every', Math.max(1, Math.round(60 / FPS))));
const JPEGQ = Number(arg('jpeg', 100));
await cdp.send('Page.startScreencast', {
  format: 'jpeg', quality: JPEGQ, everyNthFrame: EVERY,
});

// Chờ khung đầu tiên về rồi mới bấm nút chạy. Luồng hứng mất vài phần mười giây
// để khởi động; bấm chạy ngay thì đoạn mở đầu bị rơi và phim ra ngắn hơn thật.
for (let i = 0; i < 200 && frames.length === 0; i++) await new Promise((r) => setTimeout(r, 20));
const SKIP = frames.length;                 // mấy khung chờ này không thuộc về phim

console.log(`Đang chạy phim từ giây ${T0} tới ${T1} (mất đúng ${(T1 - T0).toFixed(0)} giây thật)…`);
const started = Date.now();
await page.evaluate(() => window.__clip.play());
await page.waitForFunction((goal) => window.__clip.at() >= goal, T1 - 0.05,
  { polling: 100, timeout: (T1 - T0 + 30) * 1000 });
// Khung cuối thường về chậm hơn lệnh dừng vài phần mười giây. Nán lại một nhịp
// rồi mới tắt, nếu không phim sẽ cụt mất đoạn đuôi. Phim đã chạm mốc cuối nên
// mấy khung dôi ra chỉ là hình đứng yên — lát nữa cắt bỏ cho tròn thời lượng.
await new Promise((r) => setTimeout(r, 600));
await cdp.send('Page.stopScreencast');
while (writing > 0) await new Promise((r) => setTimeout(r, 50));
await browser.close();

if (errs.length) console.log('⚠️ trang báo lỗi:', errs.slice(0, 3).join(' | '));
const real = (Date.now() - started) / 1000;
const got = frames.length;
console.log(`Hứng được ${got - SKIP} khung trong ${real.toFixed(1)}s → ${((got - SKIP) / real).toFixed(1)} hình/giây thực tế`);
if (got - SKIP < 10) throw new Error('không hứng được khung nào — kiểm tra lại trang có chạy không');

// ---------- ghép bằng ffmpeg ----------
// Khung hình đến không đều tuyệt đối, nên khai báo thời lượng thật của từng
// khung cho ffmpeg rồi để nó tự rải lại thành nhịp đều — chuyển động giữ nguyên.
// Thời lượng ra đúng bằng đoạn đã yêu cầu: dôi thì cắt, thiếu thì giữ khung cuối.
const TARGET = T1 - T0;
const ten = (i) => `f${String(i).padStart(6, '0')}.jpg`;
const lines = ['ffconcat version 1.0'];
let acc = 0, cuoi = Math.max(0, SKIP - 1);
// BẮT ĐẦU TỪ KHUNG CUỐI TRƯỚC LÚC BẤM CHẠY, không phải từ khung đầu sau đó.
//
// Trình duyệt chỉ gửi khung khi màn hình ĐỔI. Clip mở đầu bằng vài giây đứng
// yên (nền đen, một tấm bìa…) thì suốt quãng đó không có khung nào về, và khung
// đầu tiên sau khi chạy mới xuất hiện lúc có thay đổi. Bỏ khung trước đó đi là
// mất luôn quãng đứng yên — phim ra ngắn hơn và lệch nhịp từ đầu tới cuối.
//
// Khung cuối trước lúc chạy chính là hình ở giây `FROM`, nên giữ nó lại và để
// thời lượng của nó phủ đúng quãng chờ.
const BAT_DAU = Math.max(0, SKIP - 1);
for (let i = BAT_DAU; i < got && acc < TARGET - 1e-6; i++) {
  let d = i < got - 1 ? Math.max(0.001, frames[i + 1].ts - frames[i].ts) : 1 / FPS;
  if (acc + d > TARGET) d = TARGET - acc;
  acc += d; cuoi = i;
  lines.push(`file '${ten(i)}'`, `duration ${d.toFixed(5)}`);
}
if (acc < TARGET - 1e-3) lines.push(`file '${ten(cuoi)}'`, `duration ${(TARGET - acc).toFixed(5)}`);
lines.push(`file '${ten(cuoi)}'`);
writeFileSync(path.join(TMP, 'list.txt'), lines.join('\n'));

const q = QUALITY[quality];
// LƯU Ý thứ tự: mọi tham số đầu vào phải đứng trước, tham số đầu ra đứng sau.
const IN = ['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt'];
const VF = `fps=${FPS},scale=${OUT_W}:${OUT_H}:flags=lanczos,format=yuv420p`;

let args;
if (format === 'mp4') {
  args = [...IN,
    // luôn kèm một luồng tiếng im lặng: nhiều nền tảng từ chối video không có tiếng
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-map', '0:v', '-map', '1:a', '-vf', VF,
    '-c:v', 'libx264', '-crf', String(q.crf), '-preset', q.preset,
    '-profile:v', 'high', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', OUT];
} else if (format === 'webm') {
  args = [...IN, '-vf', VF, '-c:v', 'libvpx-vp9', '-crf', String(q.crf + 12),
    '-b:v', '0', '-row-mt', '1', OUT];
} else if (format === 'mov') {
  args = [...IN, '-vf', `fps=${FPS},scale=${OUT_W}:${OUT_H}:flags=lanczos`,
    '-c:v', 'prores_ks', '-profile:v', '3', OUT];
} else if (format === 'gif') {
  args = [...IN, '-vf',
    `fps=${FPS},scale=${Math.round(OUT_W / 3)}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`,
    OUT];
} else throw new Error('format không có: ' + format + ' (mp4 | webm | mov | gif)');

console.log('Đang ghép bằng ffmpeg…');
await new Promise((res, rej) => {
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'warning', ...args], { cwd: TMP });
  ff.stderr.on('data', (d) => process.stderr.write(d));
  ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg lỗi mã ' + c))));
});

rmSync(TMP, { recursive: true, force: true });
const mb = statSync(OUT).size / 1024 / 1024;
console.log(`\n✅ Xong: ${OUT}`);
console.log(`   ${OUT_W}x${OUT_H} · ${(T1 - T0).toFixed(0)} giây · ${mb.toFixed(1)} MB`);
