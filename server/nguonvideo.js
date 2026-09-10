/**
 * NGUỒN VIDEO — liệt kê file trong `public/video/`, và nói rõ file nào DÙNG ĐƯỢC.
 *
 * VÌ SAO PHẢI KIỂM CODEC, không chỉ liệt kê tên file: `BG.mp4` của dự án là
 * HEVC (H.265). Trình duyệt Chromium — cả bản người dùng xem lẫn bản bộ xuất
 * dùng để quay phim — KHÔNG giải mã được HEVC. Thả file đó vào clip thì không
 * có lỗi nào hiện ra cả, chỉ là một ô đen. Đó chính là lý do trước đây phải vẽ
 * nền bằng màu khoá rồi lồng video bằng ffmpeg ở `tools/ghep-bg.mjs`.
 *
 * Nên ở đây đo codec bằng `ffprobe` rồi trả về `chayDuoc`, và nếu không chạy
 * được thì trỏ sang bản đã chuyển đổi (nếu có) để giao diện mời chuyển.
 */
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { PROJ } from './proj.js';

const chay = promisify(execFile);

export const THU_MUC = 'public/video';
const GOC = () => path.join(PROJ, THU_MUC);

const DUOI = new Set(['.mp4', '.webm', '.mov', '.m4v', '.mkv']);

/*
 * Codec trình duyệt phát được. Danh sách này ĐÃ ĐO trên chính Chromium mà bộ
 * xuất dùng (`canPlayType`), không phải chép từ tài liệu:
 *   hevc → KHÔNG · h264 → được · vp8/vp9 → được · av1 → được
 */
const CHAY_DUOC = new Set(['h264', 'vp8', 'vp9', 'av1']);

/** Hậu tố của bản đã chuyển cho trình duyệt xem được. */
const HAU_TO = '-web';

const nho = new Map();

async function doThongSo(f, khoa) {
  if (nho.has(khoa)) return nho.get(khoa);
  let ra = { codec: null, rong: null, cao: null, giay: null };
  try {
    const { stdout } = await chay('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,width,height:format=duration',
      '-of', 'json', f,
    ], { timeout: 15000 });
    const j = JSON.parse(stdout);
    const s = j.streams?.[0] || {};
    ra = { codec: s.codec_name ?? null, rong: s.width ?? null, cao: s.height ?? null,
      giay: Number(j.format?.duration) || null };
  } catch { /* ffprobe vắng hoặc file hỏng — vẫn liệt kê, chỉ thiếu thông số */ }
  nho.set(khoa, ra);
  return ra;
}

/** Tên bản chuyển đổi của một file. `BG.mp4` → `BG-web.mp4`. */
export function tenBanChuyen(ten) {
  return `${ten.replace(/\.[^.]+$/, '')}${HAU_TO}.mp4`;
}

/** Lọc tên file người dùng gửi lên — chỉ nhận file nằm thẳng trong thư mục. */
export function locTen(raw) {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t || t.includes('/') || t.includes('\\') || t.startsWith('.')) return null;
  return DUOI.has(path.extname(t).toLowerCase()) ? t : null;
}

export const duongDanThat = (ten) => path.join(GOC(), ten);

export async function danhSachVideo() {
  const goc = GOC();
  if (!existsSync(goc)) return [];
  const ten = readdirSync(goc).filter((t) => DUOI.has(path.extname(t).toLowerCase())).sort();
  const banChuyen = new Set(ten.filter((t) => t.includes(`${HAU_TO}.`)));

  const ra = [];
  for (const t of ten) {
    const f = path.join(goc, t);
    const st = statSync(f);
    const ts = await doThongSo(f, `${f}:${st.mtimeMs}:${st.size}`);
    const duoc = ts.codec ? CHAY_DUOC.has(ts.codec) : false;
    const ban = tenBanChuyen(t);
    ra.push({
      ten: t,
      duongDan: `${THU_MUC}/${t}`,
      ...ts,
      bytes: st.size,
      chayDuoc: duoc,
      laBanChuyen: banChuyen.has(t),
      // Không chạy được nhưng đã có bản chuyển sẵn thì giao diện trỏ thẳng sang.
      banChuyen: !duoc && banChuyen.has(ban) ? `${THU_MUC}/${ban}` : null,
    });
  }
  return ra;
}

/**
 * Tham số ffmpeg để chuyển một file sang thứ trình duyệt phát được.
 *
 * H.264 + yuv420p + `faststart`: mẫu số chung lớn nhất, chạy trên mọi trình
 * duyệt lẫn mọi bản Chromium headless. Bỏ tiếng luôn (`-an`) — nền động trong
 * clip không bao giờ cần tiếng, mà có tiếng thì trình duyệt CHẶN tự phát.
 */
export function thamSoChuyen(vao, ra) {
  return ['-v', 'error', '-stats', '-y', '-i', vao,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', ra];
}
