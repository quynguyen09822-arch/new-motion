/**
 * BẢN NHÁP — lưới an toàn cho việc "đang sửa dở thì đóng tab".
 *
 * Nháp KHÔNG soát và KHÔNG ghi vào dự án clip. Nó chỉ nằm trong thư mục của
 * trình sửa. Lúc mở lại, nếu nháp mới hơn file thật thì HỎI chứ không tự áp —
 * tự áp là cách nhanh nhất để người dùng mất niềm tin vào công cụ.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KHO = path.join(GOC, '.drafts');

const f = (slug) => path.join(KHO, `${slug}.json`);

export function ghiNhap(slug, doc) {
  mkdirSync(KHO, { recursive: true });
  writeFileSync(f(slug), JSON.stringify({ luc: Date.now(), doc }), 'utf8');
}

export function docNhap(slug) {
  const p = f(slug);
  if (!existsSync(p)) return null;
  try {
    const n = JSON.parse(readFileSync(p, 'utf8'));
    return { luc: n.luc ?? statSync(p).mtimeMs, doc: n.doc };
  } catch {
    return null; // nháp hỏng thì coi như không có, đừng làm chết cả việc mở clip
  }
}

export function xoaNhap(slug) {
  rmSync(f(slug), { force: true });
}
