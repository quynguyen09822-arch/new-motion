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
import { SCENES, soatKichBan } from './proj.js';
import { catBanCu, duongDanBan } from './backup.js';
import { duongDanClip } from './clips.js';

export async function luuClip(slug, doc) {
  const vanDe = await soatKichBan(doc);
  if (vanDe.length) return { ok: false, vanDe };

  const banCu = catBanCu(slug);
  const dich = duongDanClip(slug);

  // Ghi tạm rồi đổi tên: `rename` trong cùng một phân vùng là thao tác nguyên
  // khối, nên bộ dựng đọc file này giữa chừng cũng chỉ thấy bản cũ HOẶC bản
  // mới, không bao giờ thấy nửa vời.
  const tam = `${dich}.tmp-${process.pid}`;
  // KHÔNG thêm xuống dòng cuối: các file `scenes/*.json` sẵn có đều không có,
  // nên giữ y hệt thì lưu một clip chưa sửa gì sẽ ra file y nguyên từng byte.
  // Trình sửa không được phép làm xáo trộn file chỉ vì đã mở nó ra.
  writeFileSync(tam, JSON.stringify(doc, null, 2), 'utf8');
  renameSync(tam, dich);

  return { ok: true, vanDe: [], banCu: banCu ? path.basename(banCu, '.json') : null };
}

/** Quay lại một bản đã cất. Bản đang có cũng được cất lại trước, để còn đường lùi. */
export async function khoiPhuc(slug, dau) {
  const nguon = duongDanBan(slug, dau);
  if (!nguon) return { ok: false, vanDe: ['Không thấy bản sao lưu này.'] };

  catBanCu(slug); // cất bản hiện tại đã, kẻo khôi phục nhầm là mất luôn
  const dich = duongDanClip(slug);
  const tam = `${dich}.tmp-${process.pid}`;
  copyFileSync(nguon, tam);
  renameSync(tam, dich);
  return { ok: true, vanDe: [] };
}
