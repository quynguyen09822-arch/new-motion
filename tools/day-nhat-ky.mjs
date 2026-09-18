#!/usr/bin/env node
/**
 * ĐẨY NHẬT KÝ LƯỢT DÙNG LÊN GITHUB.
 *
 *   node tools/day-nhat-ky.mjs           # xem thử, không đẩy
 *   node tools/day-nhat-ky.mjs --ghi     # gộp + commit + push
 *
 * VÌ SAO CẦN: bản chạy trên vibehost nằm trong container, mà vibehost KHÔNG có
 * chỗ gắn ổ lưu (đã kiểm cả 20 công cụ MCP — không có công cụ nào, và dự án trả
 * về `databases: []`). Nên `.nhat-ky/dung.jsonl` mất sạch mỗi lần triển khai lại,
 * và con số "có ai dùng không" cứ về 0. Đẩy lên repo là chỗ bền duy nhất đang có.
 *
 * GỘP CHỨ KHÔNG ĐÈ. File trên repo là bản gom của mọi lần đẩy trước; file trong
 * máy chỉ có phần từ lần khởi động gần nhất. Đè lên là xoá lịch sử của chính
 * mình. Gộp theo (thời điểm + người + clip + việc) để đẩy hai lần không đếm đôi.
 *
 * KHÔNG CHẠY TỰ ĐỘNG TRONG MÁY CHỦ. Đẩy git là việc ra ngoài, cần khoá và cần
 * mạng; nhét vào đường lưu clip là biến một thao tác 20ms thành vài giây, và
 * thêm một kiểu hỏng mới vào đúng chỗ nguy hiểm nhất. Chạy tay, hoặc hẹn giờ.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRONG_MAY = path.join(GOC, '.nhat-ky', 'dung.jsonl');
// Trên repo để ở `so-lieu/` — KHÔNG để trong `.nhat-ky/` vì thư mục đó đã bị
// `.gitignore` chặn, commit vào sẽ lặng lẽ không có gì.
const TREN_REPO = path.join(GOC, 'so-lieu', 'luot-dung.jsonl');
const GHI = process.argv.includes('--ghi');

const doc = (f) => {
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8').split('\n').filter(Boolean)
    .map((d) => { try { return JSON.parse(d); } catch { return null; } }).filter(Boolean);
};

const may = doc(TRONG_MAY);
const repo = doc(TREN_REPO);
console.log(`Trong máy: ${may.length} dòng · Trên repo: ${repo.length} dòng`);

/* Khoá trùng gồm cả `viec`: một người có thể lưu và khôi phục cùng một clip
   trong cùng một mili giây khi máy nhanh, và hai việc đó là hai lượt khác nhau. */
const khoa = (d) => `${d.luc}|${d.ai}|${d.slug}|${d.viec}`;
const gom = new Map();
for (const d of [...repo, ...may]) gom.set(khoa(d), d);
const ra = [...gom.values()].sort((a, b) => String(a.luc).localeCompare(String(b.luc)));

const them = ra.length - repo.length;
console.log(`Gộp lại: ${ra.length} dòng (thêm ${them} dòng mới)`);
if (ra.length) {
  const nguoi = new Set(ra.map((d) => d.ai).filter(Boolean));
  const clip = new Set(ra.map((d) => d.slug).filter(Boolean));
  console.log(`  ${nguoi.size} người · ${clip.size} clip · từ ${ra[0].luc.slice(0, 10)} tới ${ra[ra.length - 1].luc.slice(0, 10)}`);
}

if (!them) { console.log('\nKhông có gì mới để đẩy.'); process.exit(0); }
if (!GHI) { console.log('\nĐây mới là XEM THỬ. Thêm --ghi để gộp và đẩy thật.'); process.exit(0); }

mkdirSync(path.dirname(TREN_REPO), { recursive: true });
writeFileSync(TREN_REPO, ra.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');

const git = (...a) => execFileSync('git', a, { cwd: GOC, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  git('add', path.relative(GOC, TREN_REPO));
  if (!git('diff', '--cached', '--name-only').trim()) { console.log('\nFile không đổi, không commit.'); process.exit(0); }
  git('commit', '-m', `Số liệu lượt dùng: +${them} dòng (tổng ${ra.length})`);
  git('push', 'origin', 'main');
  console.log(`\n✅ Đã đẩy ${them} dòng mới lên repo.`);
} catch (e) {
  // Không ném ra ngoài: file đã gộp xong và nằm trên đĩa, lần sau đẩy lại được.
  console.error(`\n❌ Không đẩy được: ${String(e.message).split('\n')[0]}`);
  console.error('   File đã gộp vẫn nằm ở so-lieu/luot-dung.jsonl — đẩy tay lúc nào cũng được.');
  process.exit(1);
}
