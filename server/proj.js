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

const MAC_DINH = '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';

export const PROJ = path.resolve(process.env.PROJ_ROOT || MAC_DINH);

/** Thư mục `tools/` — MỌI script trong đó bắt buộc chạy với cwd đặt tại đây. */
export const TOOLS = path.join(PROJ, 'tools');
export const SCENES = path.join(PROJ, 'scenes');
export const OUT = path.join(PROJ, 'out');

const TYPES_TS = path.join(PROJ, 'clipvibe-studio', 'src', 'scene', 'types.ts');

function chetSom(viec) {
  throw new Error(
    `Không tìm thấy dự án clip ở "${PROJ}" (thiếu: ${viec}).\n` +
      'Đặt biến môi trường PROJ_ROOT trỏ đúng chỗ rồi chạy lại:\n' +
      '  PROJ_ROOT=/đường/dẫn/tới/hosting-animatic-production npm run dev',
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
