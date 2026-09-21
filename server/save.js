/**
 * ĐƯỜNG GHI — chỗ nguy hiểm nhất trong cả trình sửa.
 *
 * Dự án clip 447 MB và KHÔNG có git. Ghi đè sai một lần là mất hẳn. Nên mọi lần
 * lưu đều đi qua đúng bốn cửa, theo thứ tự này, không được đảo:
 *
 *   1. SOÁT  — validateScene phải sạch. Kịch bản hỏng mà lọt xuống đĩa thì bộ
 *              dựng vẫn cố chạy và đẻ ra một clip TRÔNG NHƯ chạy được mà sai —
 *              kiểu hỏng tệ nhất, vì không ai phát hiện cho tới lúc xuất video.
 *   2. CẤT   — chép bản đang có sang kho sao lưu TRƯỚC khi động vào.
 *   3. GHI   — ra file tạm rồi đổi tên. Bộ dựng có thể đang đọc đúng file này.
 *   4. BÁO   — trả về đường dẫn bản đã cất, để giao diện hiện nút quay lại.
 */
import { copyFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { soatKichBan } from './proj.js';
import { khoCua, moKho } from './kho.js';
import { catBanCu, duongDanBan } from './backup.js';
import { duongDanClip } from './clips.js';
import { ghi } from './nhatky.js';

const MAC_DINH = () => khoCua(null);

export async function luuClip(slug, doc, email = null, kho = MAC_DINH()) {
  const vanDe = await soatKichBan(doc);
  if (vanDe.length) return { ok: false, vanDe };

  /* Tạo thư mục kho NGAY TRƯỚC khi ghi, không sớm hơn. Người mới đăng nhập lần
     đầu chưa có thư mục nào; `writeFileSync` vào chỗ không tồn tại thì ném
     ENOENT, và câu đó chẳng nói lên điều gì với người đang mất bản sửa. */
  moKho(kho);

  const banCu = catBanCu(slug, kho);
  const dich = duongDanClip(slug, kho);

  // Ghi tạm rồi đổi tên: `rename` trong cùng một phân vùng là thao tác nguyên
  // khối, nên bộ dựng đọc file này giữa chừng cũng chỉ thấy bản cũ HOẶC bản
  // mới, không bao giờ thấy nửa vời.
  const tam = `${dich}.tmp-${process.pid}`;
  // KHÔNG thêm xuống dòng cuối: các file `scenes/*.json` sẵn có đều không có,
  // nên giữ y hệt thì lưu một clip chưa sửa gì sẽ ra file y nguyên từng byte.
  // Trình sửa không được phép làm xáo trộn file chỉ vì đã mở nó ra.
  writeFileSync(tam, JSON.stringify(doc, null, 2), 'utf8');
  renameSync(tam, dich);

  /* Ghi nhật ký SAU khi file đã nằm yên trên đĩa, và chỉ khi đã nằm yên. Ghi
     trước thì có lượt được đếm mà clip lại chưa lưu được — số liệu nói dối.
     `ghi()` tự nuốt mọi lỗi, nên dòng này không bao giờ làm hỏng việc lưu. */
  ghi('luu', { email, slug, doc, kho: kho.ma });

  return { ok: true, vanDe: [], banCu: banCu ? path.basename(banCu, '.json') : null };
}

/** Quay lại một bản đã cất. Bản đang có cũng được cất lại trước, để còn đường lùi. */
export async function khoiPhuc(slug, dau, email = null, kho = MAC_DINH()) {
  const nguon = duongDanBan(slug, dau, kho);
  if (!nguon) return { ok: false, vanDe: ['Không thấy bản sao lưu này.'] };

  catBanCu(slug, kho); // cất bản hiện tại đã, kẻo khôi phục nhầm là mất luôn
  const dich = duongDanClip(slug, kho);
  const tam = `${dich}.tmp-${process.pid}`;
  copyFileSync(nguon, tam);
  renameSync(tam, dich);
  ghi('khoi-phuc', { email, slug, them: dau, kho: kho.ma });
  return { ok: true, vanDe: [] };
}
