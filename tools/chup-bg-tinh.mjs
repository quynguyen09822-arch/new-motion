/**
 * CẮT MỘT KHUNG CỦA BG.mp4 LÀM NỀN TĨNH CHO CLIP.
 *
 * Bản nền động phải ghép ở khâu ffmpeg (định dạng kịch bản cảnh không có kiểu
 * `video`), nên clip trong công cụ sửa hiện ra nền hồng — màu khoá. Nền tĩnh
 * thì đặt thẳng vào clip được: nhìn đúng ở mọi chỗ, xuất video không cần bước
 * ghép nào.
 *
 * Xử lý y hệt bản động để hai bản trông như nhau:
 *   phóng 1,3 lần  — vầng sáng xanh nằm giữa khung, chỗ đó bị thẻ ứng dụng che
 *                    kín; không phóng thì viền chỉ còn phần rìa gần như đen
 *   làm mờ σ=20    — theo yêu cầu
 *   sáng +0,02 · đậm màu 1,05
 *
 * Chạy: node tools/chup-bg-tinh.mjs [giây]
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const PROJ = '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const BG = path.join(PROJ, 'public/video/BG.mp4');
const RA = path.join(PROJ, 'public/image/bg-tinh.png');
const giay = process.argv[2] || '4.0';

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', giay, '-i', BG,
  '-frames:v', '1',
  '-vf', 'scale=1404:2496:force_original_aspect_ratio=increase,crop=1080:1920,'
       + 'gblur=sigma=20,eq=brightness=0.02:saturation=1.05',
  RA], { stdio: 'inherit' });
console.log(`✓ ${path.basename(RA)}  (giây ${giay})`);
