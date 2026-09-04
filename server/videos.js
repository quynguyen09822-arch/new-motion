/**
 * DANH SÁCH VIDEO ĐÃ XUẤT.
 *
 * Thư mục `out/` là kho thành phẩm chung: video do trình sửa này xuất ra nằm
 * chung với video người khác dựng bằng dòng lệnh. Trước đây trình sửa chỉ đưa
 * link tải cho đúng cái nó vừa làm, nên mọi thứ có sẵn trong đó coi như vô hình.
 *
 * Đọc thông số bằng `ffprobe` — chậm (mỗi file một tiến trình con), nên nhớ lại
 * theo (đường dẫn + lần sửa + cỡ file). File không đổi thì không đo lại.
 */
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { OUT } from './proj.js';

const chay = promisify(execFile);
const nho = new Map();
const DUOI = new Set(['.mp4', '.webm', '.mov', '.gif']);
const CUNG_LUC = 4;   // đừng bung 24 tiến trình ffprobe một lúc

async function doThongSo(f, khoa) {
  if (nho.has(khoa)) return nho.get(khoa);
  let ra = { giay: null, rong: null, cao: null };
  try {
    const { stdout } = await chay('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'json', f,
    ], { timeout: 15000 });
    const j = JSON.parse(stdout);
    const s = j.streams?.[0] || {};
    ra = {
      giay: Number(j.format?.duration) || null,
      rong: s.width ?? null,
      cao: s.height ?? null,
    };
  } catch { /* file hỏng hoặc ffprobe vắng — vẫn liệt kê, chỉ thiếu thông số */ }
  nho.set(khoa, ra);
  return ra;
}

/**
 * Tên file mã hoá sẵn khá nhiều thứ, moi ra cho dễ đọc:
 *   vh-03-ceo-dashboard-1080x1920-vo.mp4
 *   └── gốc ─────────────┘ └khổ─┘ └có lồng tiếng
 */
function boc(ten) {
    const khong = ten.replace(/\.[^.]+$/, '');
    const co = { vo: /-vo(\b|-)/.test(khong), sfx: /-sfx(\b|-)/.test(khong),
      nhac: /-music(\b|-)/.test(khong) };
    const khoKhop = khong.match(/(\d{3,4})x(\d{3,4})/);
    const goc = khong
      .replace(/-\d{3,4}x\d{3,4}/, '')
      .replace(/-(vo|sfx|music|high|max|medium|low)(?=-|$)/g, '');
    return { goc, khoTen: khoKhop ? `${khoKhop[1]}×${khoKhop[2]}` : null, ...co };
}

export async function danhSachVideo() {
  if (!existsSync(OUT)) return [];
  const ten = readdirSync(OUT).filter((t) => DUOI.has(path.extname(t).toLowerCase()));

  const ra = [];
  for (let i = 0; i < ten.length; i += CUNG_LUC) {
    const lo = await Promise.all(ten.slice(i, i + CUNG_LUC).map(async (t) => {
      const f = path.join(OUT, t);
      const st = statSync(f);
      const ts = await doThongSo(f, `${f}:${st.mtimeMs}:${st.size}`);
      return {
        ten: t,
        url: `/clip/out/${encodeURIComponent(t)}`,
        bytes: st.size,
        suaLuc: st.mtimeMs,
        ...boc(t),
        ...ts,
      };
    }));
    ra.push(...lo);
  }
  ra.sort((a, b) => b.suaLuc - a.suaLuc);
  return ra;
}
