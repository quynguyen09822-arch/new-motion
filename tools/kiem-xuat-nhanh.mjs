#!/usr/bin/env node
/**
 * KIỂM BỘ XUẤT NHANH — nhảy từng khung, chia luồng, bốn định dạng.
 *
 * ĐIỀU QUAN TRỌNG NHẤT phải canh không phải là tốc độ mà là TÍNH TẤT ĐỊNH: chạy
 * hai lần phải ra hai file giống nhau tới từng khung. Mất tính đó thì cái nhanh
 * trở nên vô dụng — sửa một chữ rồi xuất lại mà cả phim đổi thì không ai dám dùng.
 *
 * VÌ SAO KHÔNG ĐẶT NGƯỠNG CHO TỐC ĐỘ. Đo được 47,9ms mỗi khung lúc máy rảnh và
 * 80–210ms lúc máy tải 23 trên 12 lõi — chênh hơn bốn lần. Đặt ngưỡng thì phép
 * kiểm sẽ đỏ vì máy bận chứ không phải vì code hỏng, và một phép kiểm đỏ vu vơ
 * còn tệ hơn không có phép kiểm. Ở đây chỉ ĐO và IN ra; muốn quyết thì chạy
 * `tools/do-toc-xuat.mjs` lúc máy rảnh.
 *
 *   node tools/kiem-xuat-nhanh.mjs [http://127.0.0.1:7803]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const OUT = path.join(PROJ, 'out');
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
const don = [];
const xoa = () => { for (const f of don) rmSync(f, { recursive: true, force: true }); };

const xuat = (them) => {
  const t0 = Date.now();
  const ra = execFileSync('node', [path.join(M, 'tools/xuat-nhanh.mjs'),
    '--url', `${GOC}/clip/scene-player.html?scene=thu-ve-lai-s02`,
    '--preset', '720p', '--den', '1', ...them], { encoding: 'utf8', timeout: 300000 });
  return { ra, giay: (Date.now() - t0) / 1000 };
};
const ffprobe = (f, muc) => execFileSync('ffprobe',
  ['-v', 'error', '-select_streams', 'v:0', '-show_entries', muc, '-of', 'csv=p=0', f],
  { encoding: 'utf8' }).trim();

try {
  /* ---------- 1. tất định ---------- */
  console.log('\n1. Chạy hai lần phải ra hai file giống nhau tới mức nhìn không ra');
  const a = path.join(OUT, 'kiem-nhanh-a.mp4'), b = path.join(OUT, 'kiem-nhanh-b.mp4');
  don.push(a, b);
  const r1 = xuat(['--out', 'kiem-nhanh-a.mp4']);
  const r2 = xuat(['--out', 'kiem-nhanh-b.mp4']);
  dat('cả hai lần đều ra file', existsSync(a) && existsSync(b));

  /* framemd5 băm TỪNG KHUNG ĐÃ GIẢI MÃ — bỏ qua phần đầu file (có ghi giờ tạo),
     nên so được đúng phần hình chứ không so nhầm siêu dữ liệu.
     `-an` là BẮT BUỘC: file mp4 luôn kèm một rãnh tiếng im lặng, không bỏ ra thì
     đếm được 76 "khung" cho một giây phim — 30 khung hình cộng 46 gói tiếng. */
  const bam = (f) => execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-an', '-f', 'framemd5', '-'],
    { encoding: 'utf8' }).split('\n').filter((l) => l && !l.startsWith('#')).join('\n');
  const ba = bam(a), bb = bam(b);
  const soKhung = ba.split('\n').length;
  dat('hai lần ra đúng bằng nhau số khung', bb.split('\n').length === soKhung,
    `${soKhung} khung đối chiếu`);

  /* TỪNG KHUNG PHẢI GIỐNG NHAU TỚI MỨC NHÌN KHÔNG RA — chứ KHÔNG còn đòi giống
     nhau tới từng byte. Đây là một bước nới, có đo đạc, không phải cho dễ qua:

     Từ 19/09 chữ dùng phông tự chứa thay cho phông hệ thống, và Chromium khử
     răng cưa con chữ KHÔNG tất định giữa hai tiến trình khi máy đang tải nặng.
     Đã đo trên chính clip này, có ép tải 4 nhân:
        máy rảnh                 0/30 khung lệch byte
        máy tải nặng           7–8/30 khung lệch byte, SSIM khung tệ nhất 0.9988–0.9996
     Còn khi phông SAI thật (cất bộ chữ đi rồi xuất lại): SSIM 0.956.
     Khoảng cách 0.9988 với 0.956 đủ rộng để đặt ngưỡng ở giữa mà không lẫn.

     Đã thử ghim tất định bằng cờ Chromium trước khi nới: `--font-render-hinting=none`
     + `--disable-lcd-text` + `--disable-font-subpixel-positioning` làm TỆ HƠN
     (17/30 lệch), `--run-all-compositor-stages-before-draw` không đổi, còn
     `--deterministic-mode` thì treo hẳn trang (bài kiểm hết giờ ở
     `waitForFunction` chờ `window.__clip`). Không có cờ nào dùng được.

     Ngưỡng 0.998 vẫn bắt được những thứ cần bắt: sai phông, rơi khung, lệch bố
     cục, sai màu — tất cả đều kéo SSIM xuống thấp hơn nhiều. */
  const NGUONG = 0.998;
  const ssim = execFileSync('ffmpeg',
    ['-v', 'error', '-i', a, '-i', b, '-lavfi', 'ssim=stats_file=-', '-f', 'null', '-'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const diem = [...ssim.matchAll(/All:([0-9.]+)/g)].map((m) => Number(m[1]));
  const te = diem.length ? Math.min(...diem) : 0;
  const soByteLech = ba === bb ? 0
    : ba.split('\n').filter((l, i) => l !== bb.split('\n')[i]).length;
  dat('từng khung giống nhau tới mức nhìn không ra', diem.length === soKhung && te >= NGUONG,
    `${diem.length} khung đo, khung tệ nhất SSIM ${te.toFixed(6)}`
    + (soByteLech ? ` (${soByteLech} khung lệch byte — răng cưa chữ)` : ' (trùng cả byte)'));

  /* ---------- 2. đúng số khung, đúng thời lượng ---------- */
  console.log('\n2. Mỗi khung đúng giây của nó');
  dat('đủ 30 khung cho 1 giây ở 30 hình/giây', soKhung === 30, `${soKhung} khung`);
  dat('đúng khổ 1280×720', ffprobe(a, 'stream=width,height') === '1280,720',
    ffprobe(a, 'stream=width,height'));
  dat('mã hoá H.264', ffprobe(a, 'stream=codec_name') === 'h264', ffprobe(a, 'stream=codec_name'));

  /* ---------- 3. bốn định dạng ---------- */
  console.log('\n3. Bốn định dạng đều ra file dùng được');
  const dd = [['mp4', 'h264'], ['webm', 'vp9'], ['gif', 'gif']];
  for (const [d, ma] of dd) {
    const f = path.join(OUT, `kiem-nhanh.${d}`); don.push(f);
    xuat(['--format', d, '--out', `kiem-nhanh.${d}`]);
    const co = existsSync(f) && statSync(f).size > 1024;
    dat(`${d} ra file đọc được`, co && ffprobe(f, 'stream=codec_name') === ma,
      co ? `${(statSync(f).size / 1024).toFixed(0)} KB · ${ffprobe(f, 'stream=codec_name')}` : 'không có file');
  }
  const z = path.join(OUT, 'kiem-nhanh.zip'); don.push(z, z.replace('.zip', ''));
  xuat(['--format', 'png', '--out', 'kiem-nhanh.zip']);
  dat('chuỗi ảnh PNG gói thành MỘT file zip tải được',
    existsSync(z) && statSync(z).size > 1024 && !existsSync(z.replace('.zip', '')),
    existsSync(z) ? `${(statSync(z).size / 1024 / 1024).toFixed(1)} MB` : 'không có file');

  /* ---------- 4. máy chủ chặn đúng chỗ ---------- */
  console.log('\n4. Máy chủ chặn những lựa chọn không chạy được');
  const goi = async (than) => {
    const r = await fetch(`${GOC}/api/export`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(than) });
    return { ma: r.status, d: await r.json() };
  };
  const q1 = await goi({ slug: 'cta', preset: '720p', dinhDang: 'mp4', cach: 'nhanh' });
  dat('khổ ngang cho clip dọc thì bị chặn', q1.ma === 400 && !q1.d.ok, q1.d.loi || `mã ${q1.ma}`);
  const q2 = await goi({ slug: 'cta', preset: 'reels', dinhDang: 'gif', cach: 'trung-thuc' });
  dat('cách trung thực + định dạng khác MP4 thì bị chặn', q2.ma === 400 && !q2.d.ok,
    q2.d.loi || `mã ${q2.ma}`);

  /* ---------- 5. tốc độ: chỉ ĐO, không chấm đỗ trượt ---------- */
  console.log('\n5. Tốc độ (chỉ ghi nhận — phụ thuộc tải máy, không dùng để chấm)');
  const { loadavg, cpus } = await import('node:os');
  console.log(`  · máy ${cpus().length} lõi, tải ${loadavg()[0].toFixed(2)}`);
  console.log(`  · 1 giây phim dựng mất ${r1.giay.toFixed(1)}s và ${r2.giay.toFixed(1)}s`
    + ' (gồm cả mở trình duyệt và ghép — chi phí này không tăng theo độ dài phim)');
} finally {
  xoa();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Bộ xuất nhanh đạt hết.\n');
process.exit(hong ? 1 : 0);
