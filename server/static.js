/**
 * PHỤC VỤ FILE TĨNH — của trình sửa, và của dự án clip.
 *
 * Cách làm mượn từ `clipvibe-studio/src/server/static.ts`, chép chứ không import:
 * đây là ống nước thuần, không có ngữ nghĩa gì để trôi khỏi nhau, và chép thì
 * trình sửa không dính vào bố cục thư mục của studio.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * DANH SÁCH TRẮNG — chỉ những thứ này trong dự án clip mới ra được ngoài.
 *
 * Thư mục gốc của dự án clip có file `.env` chứa khoá ElevenLabs. Phục vụ cả thư
 * mục là đưa khoá lên mạng. Dùng danh sách trắng chứ không phải danh sách đen:
 * mai mốt ai thả file mới vào dự án cũng không vô tình bị lộ.
 */
// Mọi .html NGAY Ở GỐC dự án đều là trang clip, cho phép hết — khai từng tên
// thì clip mới dựng xong lại không xem được. Vẫn an toàn: `.env` không phải
// .html, và luật chặn-đoạn-bắt-đầu-bằng-dấu-chấm bên dưới lo phần còn lại.
const laTrangClip = (d) => /^[^/]+\.html$/.test(d);
const THU_MUC_CHO_PHEP = ['scenes/', 'public/', 'out/'];

export function duocPhucVu(duongDan) {
  if (!duongDan || duongDan.includes('..') || duongDan.startsWith('/')) return false;
  // Chặn mọi đoạn bắt đầu bằng dấu chấm: `.env`, `.studio/`, `.git/`…
  if (duongDan.split('/').some((doan) => doan.startsWith('.'))) return false;
  if (laTrangClip(duongDan)) return true;
  return THU_MUC_CHO_PHEP.some((tm) => duongDan.startsWith(tm));
}

/**
 * Gửi một file, có hỗ trợ `Range` để trình duyệt tua video mp4 mà không phải tải
 * cả file về trước.
 */
export function guiFile(req, res, duongDanTuyetDoi, { cache = 'no-cache' } = {}) {
  if (!existsSync(duongDanTuyetDoi)) return false;
  const stat = statSync(duongDanTuyetDoi);
  if (stat.isDirectory()) return false;

  const kieu = MIME[path.extname(duongDanTuyetDoi).toLowerCase()] ?? 'application/octet-stream';
  const range = req.headers.range;

  if (range) {
    const khop = /bytes=(\d*)-(\d*)/.exec(range);
    if (khop) {
      const dau = khop[1] ? Number(khop[1]) : 0;
      const cuoi = khop[2] ? Number(khop[2]) : stat.size - 1;
      if (dau <= cuoi && cuoi < stat.size) {
        res.writeHead(206, {
          'Content-Type': kieu,
          'Content-Length': cuoi - dau + 1,
          'Content-Range': `bytes ${dau}-${cuoi}/${stat.size}`,
          'Accept-Ranges': 'bytes',
        });
        createReadStream(duongDanTuyetDoi, { start: dau, end: cuoi }).pipe(res);
        return true;
      }
    }
  }

  res.writeHead(200, {
    'Content-Type': kieu,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': cache,
  });
  createReadStream(duongDanTuyetDoi).pipe(res);
  return true;
}
