/**
 * RÃNH TIẾNG — liệt kê file tiếng có sẵn, và đo sóng âm để vẽ.
 *
 * Sóng âm đo bằng cách giải mã cả file ra PCM một kênh 8 kHz rồi lấy đỉnh theo
 * từng ô. Chậm (mỗi file một tiến trình ffmpeg) nên NHỚ LẠI theo đường dẫn + lần
 * sửa + cỡ file: file không đổi thì không đo lại. Một bản nhạc 3 phút đo mất gần
 * một giây, mà thanh rãnh vẽ lại mỗi lần người dùng kéo thì không chịu nổi.
 *
 * Vì sao 8 kHz một kênh: chỉ để VẼ HÌNH. Giữ 48 kHz hai kênh là tải về gấp
 * mười hai lần dữ liệu cho đúng một hình thù y hệt.
 */
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { PROJ } from './proj.js';

const chay = promisify(execFile);
const DUOI = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.flac']);
const nhoSong = new Map();
const nhoDai = new Map();

/* Chỉ nhận file NẰM TRONG dự án. Không kiểm thì một đường dẫn kiểu
   `../../.env` sẽ đọc được khoá ElevenLabs — cùng lối phòng thủ với `static.js`. */
export function duongDanTieng(tuongDoi) {
  if (!tuongDoi || tuongDoi.includes('..') || path.isAbsolute(tuongDoi)) return null;
  if (tuongDoi.split('/').some((d) => d.startsWith('.'))) return null;
  if (!DUOI.has(path.extname(tuongDoi).toLowerCase())) return null;
  const f = path.join(PROJ, tuongDoi);
  return existsSync(f) && statSync(f).isFile() ? f : null;
}

/** Đi tìm mọi file tiếng trong `public/`, xếp theo thư mục. */
export function khoTieng() {
  const goc = path.join(PROJ, 'public');
  if (!existsSync(goc)) return [];
  const ra = [];
  const di = (thuMuc, sau = 0) => {
    if (sau > 3) return;                       // đủ sâu rồi, đừng quét cả ổ đĩa
    for (const ten of readdirSync(thuMuc)) {
      if (ten.startsWith('.')) continue;
      const f = path.join(thuMuc, ten);
      let st; try { st = statSync(f); } catch { continue; }
      if (st.isDirectory()) { di(f, sau + 1); continue; }
      if (!DUOI.has(path.extname(ten).toLowerCase())) continue;
      ra.push({
        src: path.relative(PROJ, f),
        ten,
        nhom: path.relative(path.join(PROJ, 'public'), thuMuc) || 'public',
        co: st.size,
      });
    }
  };
  di(goc);
  return ra.sort((a, b) => a.nhom.localeCompare(b.nhom) || a.ten.localeCompare(b.ten));
}

export async function doDai(f) {
  const st = statSync(f);
  const khoa = `${f}|${st.mtimeMs}|${st.size}`;
  if (nhoDai.has(khoa)) return nhoDai.get(khoa);
  let giay = 0;
  try {
    const { stdout } = await chay('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]);
    giay = Number(String(stdout).trim()) || 0;
  } catch { /* đọc không được thì để 0 */ }
  nhoDai.set(khoa, giay);
  return giay;
}

/**
 * Sóng âm: mảng `0..1`, mỗi số là đỉnh của một ô thời gian.
 *
 * Trả ĐỈNH chứ không phải trung bình. Trung bình làm tiếng gõ và tiếng vụt —
 * thứ ngắn và mạnh — biến mất khỏi hình, mà đó lại đúng là thứ người dùng cần
 * nhìn để đặt đúng chỗ.
 */
export async function songAm(f, o = 400) {
  const st = statSync(f);
  const khoa = `${f}|${st.mtimeMs}|${st.size}|${o}`;
  if (nhoSong.has(khoa)) return nhoSong.get(khoa);
  const giay = await doDai(f);
  let dinh = new Array(o).fill(0);
  try {
    const { stdout } = await chay('ffmpeg',
      ['-v', 'error', '-i', f, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'],
      { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 });
    const b = Buffer.from(stdout);
    const n = Math.floor(b.length / 2);
    if (n > 0) {
      const moiO = Math.max(1, Math.floor(n / o));
      for (let i = 0; i < o; i++) {
        let max = 0;
        const dau = i * moiO, cuoi = Math.min(n, dau + moiO);
        for (let j = dau; j < cuoi; j++) {
          const v = Math.abs(b.readInt16LE(j * 2));
          if (v > max) max = v;
        }
        dinh[i] = Math.min(1, max / 32768);
      }
    }
  } catch { dinh = new Array(o).fill(0); }
  /* Trả kèm đỉnh lớn nhất để giao diện tự chuẩn hoá chiều cao.
     Không chuẩn hoá sẵn ở đây: người dùng cần thấy rãnh nào TO hơn rãnh nào khi
     xếp chồng, mà chuẩn hoá từng rãnh thì mọi rãnh đều cao bằng nhau. Nhưng cũng
     không thể vẽ thô: file tiếng vụt trong kho chỉ to 4% nên vẽ thô ra một vạch
     phẳng, nhìn như file hỏng. Đưa cả hai, giao diện quyết. */
  const to = dinh.reduce((a, b) => (b > a ? b : a), 0);
  const kq = { giay, dinh, to };
  nhoSong.set(khoa, kq);
  return kq;
}
