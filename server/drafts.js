/**
 * BẢN NHÁP — lưới an toàn cho việc "đang sửa dở thì đóng tab".
 *
 * Nháp KHÔNG soát và KHÔNG ghi vào dự án clip. Nó chỉ nằm trong thư mục của
 * trình sửa. Lúc mở lại, nếu nháp mới hơn file thật thì HỎI chứ không tự áp —
 * tự áp là cách nhanh nhất để người dùng mất niềm tin vào công cụ.
 *
 * NHÁP CŨNG CHIA THEO KHO. Hai người đặt trùng tên dự án là chuyện thường (ai
 * cũng có một clip tên `thu-nghiem`); chung một thư mục nháp thì bản đang sửa
 * dở của người này hiện lên trong tab của người kia.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { khoCua } from './kho.js';

const MAC_DINH = () => khoCua(null);

const f = (slug, kho) => path.join(kho.nhap, `${slug}.json`);

export function ghiNhap(slug, doc, kho = MAC_DINH()) {
  mkdirSync(kho.nhap, { recursive: true });
  writeFileSync(f(slug, kho), JSON.stringify({ luc: Date.now(), doc }), 'utf8');
}

export function docNhap(slug, kho = MAC_DINH()) {
  const p = f(slug, kho);
  if (!existsSync(p)) return null;
  try {
    const n = JSON.parse(readFileSync(p, 'utf8'));
    return { luc: n.luc ?? statSync(p).mtimeMs, doc: n.doc };
  } catch {
    return null; // nháp hỏng thì coi như không có, đừng làm chết cả việc mở clip
  }
}

export function xoaNhap(slug, kho = MAC_DINH()) {
  rmSync(f(slug, kho), { force: true });
}
