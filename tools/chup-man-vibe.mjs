/**
 * CẮT KHUNG HÌNH THẬT TỪ BẢN GHI THAO TÁC LÀM NỀN CHO CLIP.
 *
 * Đội dựng clip hướng dẫn bằng cách PHÁT bản ghi màn hình thật
 * (`public/video/trien_khai_web.webm`, 74 giây) rồi zoom và vẽ vòng cam lên
 * trên — nên giao diện của họ chân thật tuyệt đối: nó CHÍNH LÀ sản phẩm.
 *
 * Định dạng kịch bản cảnh không có kiểu `video`, nhưng có kiểu `image`. Nên ta
 * cắt đúng những khung cần rồi lồng vào như ảnh, và để CAMERA làm phần zoom.
 * Kết quả: pixel của giao diện là pixel thật, không phải tôi vẽ lại.
 *
 * Vùng cắt y=113…1028 đo bởi chính đội (chú thích trong
 * `vibe-host-trien-khai-web.html`) — đó là phần giao diện, bỏ thanh trình duyệt.
 *
 * Chạy: node tools/chup-man-vibe.mjs
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const PROJ = '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const NGUON = path.join(PROJ, 'public/video/trien_khai_web.webm');
/*
 * Cắt SÁT từng nhịp, không lấy cả màn hình. Hai lý do, cả hai đều thật:
 *
 *  1. Khung 9:16. Cả màn hình là ảnh 2,1:1 — nhét vào khung dọc thì thành một
 *     dải mỏng, quanh nó toàn khoảng trống. Cắt sát vùng đang nói tới thì ảnh
 *     lấp được khung và chữ đủ to để đọc trên điện thoại.
 *  2. Bản ghi quay luồng **Git URL**, thẻ đó đang được CHỌN (viền cam + dấu
 *     tích). Câu chuyện của clip là kéo thả file, nên khung cắt của nhịp kéo
 *     thả chỉ lấy thẻ "Tải file" — thẻ Git URL nằm ngoài, không mâu thuẫn.
 *     Muốn khớp tuyệt đối thì cần một bản ghi 30 giây luồng tải file.
 *
 * Toạ độ đo trên khung đã bỏ thanh trình duyệt (y gốc = 113 + y ở đây).
 */
const CAT = 113;
const KHUNG = [
  // tên,        giây,   x,   y,  rộng, cao
  ['nguon',     '1.95', 300,  55, 1170, 258],  // tiêu đề + "Chọn nguồn" + HÀNG TRÊN
  ['taifile',   '1.95', 322, 214,  396,  92],  // riêng thẻ "Tải file"
  ['chay',      '36',   690, 175,  810, 275],  // khối "Đang triển khai hệ thống…"
  ['xong',      '71.5', 855, 180,  470, 300],  // khối "Ứng dụng đã khởi chạy"
];

for (const [ten, giay, x, y, w, h] of KHUNG) {
  const ra = path.join(PROJ, `public/image/vh-man-${ten}.png`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', giay, '-i', NGUON,
    '-frames:v', '1', '-vf', `crop=${w}:${h}:${x}:${y + CAT}`, ra]);
  console.log(`✓ ${path.basename(ra)}  ${w}×${h}  (giây ${giay})`);
}
