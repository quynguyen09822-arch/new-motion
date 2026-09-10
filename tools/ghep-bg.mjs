/**
 * LỒNG NỀN ĐỘNG VÀO CLIP ĐÃ XUẤT.
 *
 * Định dạng kịch bản cảnh không có kiểu `video`, nên nền động không đặt được
 * vào trong clip. Cách làm: clip vẽ nền bằng MỘT MÀU KHOÁ (hồng cánh sen
 * #ff00ff — không có trong bảng màu của clip lẫn của trang AIRTEX), rồi ở đây
 * cắt màu đó ra và lồng `public/video/BG.mp4` vào chỗ trống.
 *
 * BG.mp4 dài 8,05 giây còn clip dài hơn, nên nền được LẶP (`-stream_loop -1`)
 * và cắt đúng bằng độ dài clip (`shortest=1`).
 *
 * Chạy: node tools/ghep-bg.mjs <tên-clip-trong-out.mp4> [mờ]
 *   mờ: bán kính làm mờ, mặc định 20.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PROJ = '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const OUT = path.join(PROJ, 'out');
const BG = path.join(PROJ, 'public/video/BG.mp4');

const ten = process.argv[2];
const mo = Number(process.argv[3] || 20);
if (!ten) { console.error('Thiếu tên clip. Ví dụ: node tools/ghep-bg.mjs abc.mp4'); process.exit(1); }
const vao = path.join(OUT, ten);
if (!existsSync(vao)) { console.error(`Không thấy ${vao}`); process.exit(1); }
const ra = path.join(OUT, ten.replace(/\.mp4$/, '-bg.mp4'));

/*
 * Độ dài phải CHẶN CỨNG bằng `-t`. Nguồn nền lặp vô hạn (`-stream_loop -1`)
 * nên `overlay=shortest=1` không đủ để dừng: thử một lần và ffmpeg mã hoá tới
 * 177 MB cho một clip 18 giây mà vẫn chưa xong.
 */
const dai = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
  'format=duration', '-of', 'default=nw=1:nk=1', vao], { encoding: 'utf8' }).trim();

/*
 * `similarity` 0,30 / `blend` 0,12: đủ rộng để nuốt hết vệt hồng do H.264 lấy
 * mẫu màu thưa sinh ra ở mép, mà chưa đụng tới màu nào của giao diện.
 * `eq` hạ sáng nền một chút cho thẻ trắng của ứng dụng nổi lên.
 */
/*
 * Nền phóng 1,3 lần trước khi cắt: vầng sáng xanh của BG.mp4 nằm giữa khung,
 * mà giữa khung lại bị thẻ ứng dụng che kín — để nguyên thì viền chỉ còn phần
 * rìa gần như đen. Phóng lên thì vầng sáng tràn ra hai dải trên/dưới đang thấy.
 */
const loc =
  '[0:v]scale=1404:2496:force_original_aspect_ratio=increase,crop=1080:1920,' +
  `gblur=sigma=${mo},eq=brightness=0.02:saturation=1.05[bg];` +
  '[1:v]colorkey=0xff00ff:0.30:0.12[fg];' +
  '[bg][fg]overlay=shortest=1:format=auto,format=yuv420p';

execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
  '-stream_loop', '-1', '-i', BG, '-i', vao,
  '-filter_complex', loc, '-t', dai,
  '-c:v', 'libx264', '-crf', '20', '-preset', 'fast', '-movflags', '+faststart',
  ra], { stdio: 'inherit' });
console.log(`✓ ${path.basename(ra)}`);
