/**
 * CỬA DUY NHẤT SANG DỰ ÁN CLIP.
 *
 * Đây là chỗ DUY NHẤT trong cả trình sửa được phép biết dự án clip nằm ở đâu.
 * Mọi file khác hỏi qua đây. Lý do: trình sửa nằm ở một thư mục, dự án clip nằm
 * ở thư mục khác, và ta có mượn `validateScene` của bên đó. Nếu đường dẫn ấy rải
 * khắp nơi thì hôm nào dự án clip dời chỗ là phải đi sửa mười file.
 *
 * `validateScene` thì MƯỢN chứ không chép. Nó là thẩm quyền quyết định một kịch
 * bản có hợp lệ hay không — chép ra một bản riêng thì hai bản sẽ trôi khỏi nhau,
 * và đúng cái kiểu hỏng mà chính nó cảnh báo sẽ xảy ra: một clip TRÔNG NHƯ chạy
 * được mà sai.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

/*
 * TÌM DỰ ÁN CLIP Ở ĐÂU — theo thứ tự, dừng ở chỗ đầu tiên thấy được.
 *
 *   1. `PROJ_ROOT` nếu có khai      — người dùng nói rõ thì nghe
 *   2. dự án thật ở máy làm việc    — có thì luôn ưu tiên
 *   3. `clip/` NGAY TRONG ỨNG DỤNG  — bản đóng gói mang dữ liệu theo mình
 *
 * THỨ TỰ 2 TRƯỚC 3 LÀ CỐ Ý. Ở máy làm việc có cả hai, mà dự án thật mới là bản
 * đầy đủ: 23 clip kể cả clip đời cũ, cùng toàn bộ video nguồn. Bản gói kèm chỉ
 * có 11 clip và 5 tệp ảnh — đủ để chạy trên mạng, không đủ để làm việc hằng
 * ngày. Đảo thứ tự là người dùng mở máy lên thấy mất quá nửa số clip.
 *
 * Bậc 3 là thứ làm ứng dụng TỰ CHỨA ĐƯỢC. Thiếu nó thì đem lên máy chủ là chết
 * ngay lúc khởi động: nơi triển khai chỉ dựng đúng thư mục dự án trong một
 * container, không có `/home/coder/...` nào cả. Đã vấp thật trên Vibe Host —
 * container khởi động rồi chết, lặp 5 lần, ngắt mạch ở bước Health Check.
 *
 * Và nó phải là MỘT BẬC TỰ TÌM chứ không phải chỉ đặt biến môi trường: nơi
 * triển khai có thể tự sinh lấy cách chạy, không dùng `Dockerfile` mình viết,
 * lúc đó biến môi trường mình khai không tới được.
 */
const GOC_UNG_DUNG = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CLIP_KEM = path.join(GOC_UNG_DUNG, 'clip');
const MAC_DINH = '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';

function tuTim() {
  if (process.env.PROJ_ROOT) return process.env.PROJ_ROOT;
  if (existsSync(path.join(MAC_DINH, 'scenes'))) return MAC_DINH;
  if (existsSync(path.join(CLIP_KEM, 'scenes'))) return CLIP_KEM;
  return MAC_DINH;              // không thấy gì thì báo lỗi theo đường quen
}

export const PROJ = path.resolve(tuTim());

/** Thư mục `tools/` — MỌI script trong đó bắt buộc chạy với cwd đặt tại đây. */
export const TOOLS = path.join(PROJ, 'tools');
export const SCENES = path.join(PROJ, 'scenes');
export const OUT = path.join(PROJ, 'out');

const TYPES_TS = path.join(PROJ, 'clipvibe-studio', 'src', 'scene', 'types.ts');

function chetSom(viec) {
  throw new Error(
    `Không tìm thấy dự án clip ở "${PROJ}" (thiếu: ${viec}).\n\n` +
      'Ứng dụng này là một cửa sổ nhìn vào dự án clip — không có dự án đó thì\n' +
      'không có gì để sửa. Ba cách chỉ chỗ cho nó, chọn một:\n' +
      `  1. Gói dữ liệu clip vào "${CLIP_KEM}" (cách dùng khi đem lên máy chủ)\n` +
      '  2. Đặt biến môi trường: PROJ_ROOT=/đường/dẫn/tới/hosting-animatic-production\n' +
      '  3. Chạy ngay trong máy làm việc, nơi dự án clip nằm sẵn ở chỗ mặc định',
  );
}

/** Kiểm ngay lúc khởi động, để hỏng thì hỏng ở chỗ nói được câu tử tế. */
export function kiemTraDuAn() {
  if (!existsSync(PROJ)) chetSom('cả thư mục dự án');
  if (!existsSync(SCENES)) chetSom('thư mục scenes/');
  if (!existsSync(path.join(PROJ, 'scene-player.html'))) chetSom('scene-player.html');
  if (!existsSync(TYPES_TS)) chetSom('clipvibe-studio/src/scene/types.ts');
  if (!existsSync(path.join(TOOLS, 'export-video.mjs'))) chetSom('tools/export-video.mjs');
}

/*
 * Node 22 tự lột kiểu khỏi file .ts nên nạp thẳng được, không cần biên dịch,
 * không cần thêm gói nào. Đã kiểm trên Node v22.22.3.
 */
let _scene = null;
async function napScene() {
  if (!_scene) _scene = await import(TYPES_TS);
  return _scene;
}

/** Soát một kịch bản. Trả về mảng câu lỗi TIẾNG VIỆT — rỗng là sạch. */
export async function soatKichBan(doc) {
  const { validateScene } = await napScene();
  return validateScene(doc);
}

/** Tổng thời lượng của cả clip, tính bằng giây. */
export async function tongThoiLuong(doc) {
  const { totalDuration } = await napScene();
  return totalDuration(doc);
}
