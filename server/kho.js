/**
 * KHO RIÊNG CỦA TỪNG NGƯỜI — cửa duy nhất trả lời "kịch bản của người này nằm đâu".
 *
 * `proj.js` biết DỰ ÁN CLIP nằm đâu. File này biết KHO CỦA AI nằm đâu. Hai câu
 * hỏi khác nhau nên hai file khác nhau: dự án clip là phần dùng chung (bộ dựng,
 * phông, ảnh, video nguồn, `validateScene`), còn kịch bản thì từ 20/09/2026 là
 * của riêng từng tài khoản và KHÔNG đồng bộ với nhau nữa.
 *
 * KHO GỐC KHÔNG DỜI ĐI ĐÂU CẢ.
 *   Chủ kho — tài khoản đầu tiên trong `MOTION_TAI_KHOAN`, hoặc ai khai thẳng ở
 *   `MOTION_CHU_KHO` — dùng CHÍNH `scenes/` của dự án clip. Không chép, không
 *   dời, không di trú. Bao nhiêu clip đang có cứ nằm nguyên chỗ cũ.
 *
 *   Không phải để đỡ việc: dự án clip nặng 447 MB và KHÔNG có git. Mỗi bước
 *   "dời file cho gọn" là một cơ hội mất dữ liệu không lấy lại được, đổi lấy
 *   đúng một thứ là sự gọn gàng. Không đáng.
 *
 * NGƯỜI MỚI THÌ KHO TRỐNG.
 *   `kho/<mã>/scenes/` nằm trong thư mục ứng dụng. Trống trơn, không chép sẵn
 *   clip của ai khác. Thấy trong kho mình có sẵn clip lạ thì người ta hoặc
 *   tưởng mình làm ra chúng, hoặc sửa vào bản mà người khác cũng đang sửa —
 *   đúng cái chuyện tính năng này sinh ra để chấm dứt.
 *
 * CHƯA KHAI AI LÀ CHỦ THÌ KHÔNG CHIA.
 *   `MOTION_TAI_KHOAN` trống nghĩa là chưa ai cấu hình danh sách người dùng.
 *   Lúc đó mọi người dùng chung kho gốc, y như trước khi có tính năng này —
 *   và bộ bài kiểm (máy chủ không mật khẩu) cũng rơi vào nhánh này nên 28 bài
 *   cũ không phải sửa một dòng nào.
 *
 *   Đoán bừa "ai đăng nhập đầu tiên là chủ" thì người vào trước chiếm mất kho
 *   của người khác, và cách duy nhất lấy lại là sửa file trên máy chủ — thứ
 *   người dùng của công cụ này không làm được.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJ, SCENES } from './proj.js';
import { dsTaiKhoan, duoiEmail, layCauHinh } from './dangnhap.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Nơi để kho của những người KHÔNG phải chủ. Đã `.gitignore`. */
export const GOC_KHO = path.join(GOC, 'kho');

/**
 * Ai là chủ kho gốc.
 *
 * `MOTION_CHU_KHO` khai thẳng thì nghe; không thì lấy tài khoản ĐẦU TIÊN trong
 * `MOTION_TAI_KHOAN`. Khai tên trần (không có `@`) thì tự ghép đuôi email, y
 * như `dsTaiKhoan()` — hai chỗ hiểu cùng một chuỗi theo hai kiểu là cái bẫy.
 */
export function chuKho() {
  const khai = layCauHinh('MOTION_CHU_KHO').trim().toLowerCase();
  if (khai) return khai.includes('@') ? khai : khai + duoiEmail();
  return dsTaiKhoan()[0] || '';
}

/**
 * Mã thư mục của một tài khoản.
 *
 * Phần chữ để người quản trị mở thư mục ra còn đoán được của ai; phần băm để
 * hai email KHÁC nhau không bao giờ ra cùng một thư mục. Thiếu phần băm thì
 * `a.b@x.com` và `a-b@x.com` cùng rút gọn thành `a-b-x-com` — hai người dùng
 * chung một kho, đúng cái lỗi tính năng này sinh ra để tránh.
 */
export function maKho(email) {
  const e = String(email || '').trim().toLowerCase();
  const chu = e.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'kho';
  return `${chu}-${createHash('sha256').update(e).digest('hex').slice(0, 8)}`;
}

/**
 * Kho của một người. Đây là thứ mọi đường đọc/ghi kịch bản phải đi qua.
 *
 * `email` rỗng (chưa đặt mật khẩu, hoặc bài kiểm) → kho gốc. KHÔNG được trả về
 * một kho trống trong ca này: chưa đặt mật khẩu thì app phải chạy y như trước,
 * mà mở app lên thấy mất sạch clip thì chẳng khác gì hỏng.
 *
 * @returns {{email:string, ma:string, laGoc:boolean, scenes:string, nhap:string,
 *            sao:string, thuMuc:string}}
 */
export function khoCua(email) {
  const em = String(email || '').trim().toLowerCase();
  const chu = chuKho();

  if (!chu || !em || em === chu) {
    return {
      email: em, ma: 'goc', laGoc: true,
      thuMuc: PROJ,
      scenes: SCENES,
      /* Giữ nguyên hai đường cũ của kho gốc. Đổi tên thư mục là bỏ lại toàn bộ
         nháp đang dở và cả kho sao lưu — đường lùi duy nhất của dự án không git. */
      nhap: path.join(GOC, '.drafts'),
      sao: path.join(GOC, '.hub-video-backups'),
    };
  }

  const ma = maKho(em);
  const thuMuc = path.join(GOC_KHO, ma);
  return {
    email: em, ma, laGoc: false, thuMuc,
    scenes: path.join(thuMuc, 'scenes'),
    nhap: path.join(thuMuc, 'nhap'),
    sao: path.join(thuMuc, 'sao-luu'),
  };
}

/**
 * Tạo thư mục kho nếu chưa có. Gọi ngay trước khi GHI, không gọi lúc đọc.
 *
 * Gọi lúc đọc thì mỗi lần ai đó liếc qua danh sách là đĩa lại mọc thêm một
 * thư mục rỗng — kể cả khi họ đăng nhập nhầm tài khoản rồi thoát ra ngay.
 *
 * Kho gốc thì KHÔNG đụng vào: nó là thư mục của dự án clip, không phải chỗ để
 * công cụ này tự ý tạo cây thư mục.
 */
export function moKho(kho) {
  if (kho.laGoc) return kho;
  for (const d of [kho.scenes, kho.nhap, kho.sao]) mkdirSync(d, { recursive: true });
  return kho;
}

/** Đếm dự án trong một kho. Kho chưa tạo thì là 0, không phải lỗi. */
export function soDuAn(kho) {
  if (!existsSync(kho.scenes)) return 0;
  return readdirSync(kho.scenes).filter((t) => t.endsWith('.json')).length;
}

/* ---------- ổ lưu có bền không ---------- */

/**
 * KHO RIÊNG CÓ ĐANG NẰM TRÊN Ổ LƯU BỀN KHÔNG.
 *
 * Kho gốc mất thì còn `.hub-video-backups` và bản chụp hằng ngày làm phao. Kho
 * riêng thì `kho/` là NƠI DUY NHẤT trên đời giữ dự án của người không phải chủ
 * kho — dựng lại container mà không gắn ổ là mất sạch, không có bản nào khác.
 *
 * Nên phải nói TRƯỚC khi mất, chứ không phải sau.
 *
 * CHỈ BÁO KHI CHẮC, và ba điều kiện phải đủ cả:
 *   1. kho riêng đang bật (có khai `MOTION_TAI_KHOAN`) — không thì chẳng ai có
 *      kho riêng để mà mất;
 *   2. đang chạy trong container — ở máy làm việc thì thư mục nằm trên đĩa thật,
 *      báo là báo nhảm;
 *   3. `kho/` không phải một điểm gắn ổ.
 *
 * Thà im khi không chắc còn hơn báo sai: mỗi lời báo sai dạy người dùng rằng
 * chỗ này nói nhảm, và từ đó họ bỏ qua cả lời báo đúng.
 */
export function oLuuBenVung() {
  if (!chuKho()) return { hopLe: true, lyDo: 'chưa bật kho riêng' };
  /* `/.dockerenv` là dấu Docker để lại trong mọi container. Không thấy thì coi
     như đang ở máy thật — im lặng. */
  if (!existsSync('/.dockerenv')) return { hopLe: true, lyDo: 'không chạy trong container' };

  let mount = '';
  try { mount = readFileSync('/proc/self/mountinfo', 'utf8'); }
  catch { return { hopLe: true, lyDo: 'không đọc được bảng ổ đĩa' }; }
  return soatOLuu(mount);
}

/**
 * NHỮNG THƯ MỤC MẤT LÀ MẤT HẲN — không có bản sao nào khác trên đời.
 *
 * Bản chụp hằng ngày (`.hub-video-backups`) chỉ cứu được kịch bản của kho gốc.
 * Hai chỗ dưới đây không nằm trong đó.
 */
export const PHAI_GIU = [
  { duong: () => GOC_KHO, la: 'dự án của tài khoản không phải chủ kho' },
  /* Ảnh dán/kéo vào clip. Lần đầu thêm thư mục này thì `docker-compose.yml`
     chưa có dòng gắn ổ nào cho nó — và nếu cảnh báo chỉ soi mỗi `kho/` thì nó
     vẫn báo XANH trong khi ảnh của người ta bay mất sau mỗi lần dựng lại. Kiểu
     cảnh báo tệ nhất là kiểu nói "ổn" lúc không ổn. */
  { duong: () => path.join(PROJ, 'anh'), la: 'ảnh dán/kéo vào clip' },
];

/**
 * Đọc bảng ổ đĩa ra thành kết luận. Hàm THUẦN — nhận nguyên văn `mountinfo`.
 *
 * Tách khỏi `oLuuBenVung()` để kiểm được: hàm kia chỉ chạy THẬT bên trong
 * container, nên trên máy làm việc nó luôn trả "ổn" và không bài kiểm nào chạm
 * tới được luật bên trong. Mà đây đúng là luật không được sai — nó là thứ duy
 * nhất đứng giữa người dùng và một lần mất sạch dữ liệu.
 */
export function soatOLuu(mountinfo) {
  /* Cột thứ 5 của mỗi dòng trong `mountinfo` là ĐIỂM GẮN. So đúng cả cột, không
     dùng `includes` trên cả file: `/app/kho-cu` cũng chứa chuỗi `/app/kho`. */
  const diem = new Set(String(mountinfo || '').split('\n').map((d) => d.split(' ')[4]));
  const thieu = PHAI_GIU.filter((x) => !diem.has(x.duong()));
  return thieu.length === 0
    ? { hopLe: true, lyDo: 'đã gắn ổ lưu' }
    : { hopLe: false,
        lyDo: thieu.map((x) => `"${x.duong()}" chưa gắn ổ lưu (${x.la})`).join(' · ') };
}
