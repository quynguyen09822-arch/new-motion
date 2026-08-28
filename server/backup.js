/**
 * KHO SAO LƯU — đường lùi duy nhất.
 *
 * Dự án clip nặng 447 MB và KHÔNG có git. Nghĩa là một lần ghi đè sai là mất
 * hẳn, không có `git checkout` nào cứu được. Nên trước khi trình sửa ghi một chữ
 * nào xuống đó, ở đây phải có sẵn một bản chụp nguyên trạng.
 *
 * Kho để bên trình sửa, KHÔNG để trong dự án clip: dự án clip giữ nguyên không
 * đụng tới, còn thư mục này thì có git.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES } from './proj.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KHO = path.join(GOC, '.hub-video-backups');

const GIU_BAN = 50; // giữ ít nhất chừng này bản gần nhất mỗi clip
const GIU_NGAY = 7; // và giữ tất cả những gì trong chừng này ngày

function dauThoiGian(d = new Date()) {
  return d.toISOString().replace(/[:.]/g, '-');
}

/**
 * Chụp nguyên trạng toàn bộ `scenes/*.json` một lần lúc khởi động.
 *
 * Chỉ chụp nếu hôm nay chưa chụp — khởi động lại server mười lần trong ngày thì
 * vẫn chỉ có một bản gốc, không làm rác kho.
 */
export function chupBanGoc() {
  const ngay = new Date().toISOString().slice(0, 10);
  const dich = path.join(KHO, `_ban-goc-${ngay}`);
  if (existsSync(dich)) return { moi: false, thuMuc: dich, soFile: readdirSync(dich).length };

  mkdirSync(dich, { recursive: true });
  let soFile = 0;
  for (const ten of readdirSync(SCENES)) {
    if (!ten.endsWith('.json')) continue;
    copyFileSync(path.join(SCENES, ten), path.join(dich, ten));
    soFile++;
  }
  return { moi: true, thuMuc: dich, soFile };
}

function thuMucClip(slug) {
  return path.join(KHO, 'scenes', slug);
}

/**
 * Cất bản hiện tại đi trước khi ghi đè. Gọi NGAY TRƯỚC mỗi lần lưu.
 * Trả về đường dẫn bản đã cất, hoặc null nếu file gốc chưa tồn tại (clip mới).
 */
export function catBanCu(slug) {
  const nguon = path.join(SCENES, `${slug}.json`);
  if (!existsSync(nguon)) return null;
  const thuMuc = thuMucClip(slug);
  mkdirSync(thuMuc, { recursive: true });
  const dich = path.join(thuMuc, `${dauThoiGian()}.json`);
  copyFileSync(nguon, dich);
  donKho(slug);
  return dich;
}

/** Dọn bớt bản cũ: giữ 50 bản gần nhất, cộng tất cả bản trong 7 ngày. */
function donKho(slug) {
  const thuMuc = thuMucClip(slug);
  if (!existsSync(thuMuc)) return;
  const han = Date.now() - GIU_NGAY * 86400_000;
  const ban = readdirSync(thuMuc)
    .filter((t) => t.endsWith('.json'))
    .map((ten) => ({ ten, luc: statSync(path.join(thuMuc, ten)).mtimeMs }))
    .sort((a, b) => b.luc - a.luc);

  for (const [i, b] of ban.entries()) {
    if (i < GIU_BAN) continue;
    if (b.luc >= han) continue;
    rmSync(path.join(thuMuc, b.ten), { force: true });
  }
}

/** Danh sách bản đã cất của một clip, mới nhất trước. */
export function lichSu(slug) {
  const thuMuc = thuMucClip(slug);
  if (!existsSync(thuMuc)) return [];
  return readdirSync(thuMuc)
    .filter((t) => t.endsWith('.json'))
    .map((ten) => {
      const st = statSync(path.join(thuMuc, ten));
      return { dau: ten.replace(/\.json$/, ''), bytes: st.size, luc: st.mtimeMs };
    })
    .sort((a, b) => b.luc - a.luc);
}

export function duongDanBan(slug, dau) {
  // `dau` đi từ ngoài vào — chặn mọi cách trỏ ra khỏi thư mục của clip này.
  if (!/^[0-9TZ.-]{10,40}$/.test(dau)) return null;
  const f = path.join(thuMucClip(slug), `${dau}.json`);
  return existsSync(f) ? f : null;
}
