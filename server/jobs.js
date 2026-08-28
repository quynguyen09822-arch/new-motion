/**
 * CHẠY VIỆC NẶNG — xuất video, kiểm bố cục.
 *
 * MỘT SLOT, KHÔNG BAO GIỜ HAI. Đây không phải chuyện tiết kiệm máy mà là chuyện
 * đúng/sai: `export-video.mjs` để khung hình tạm ở `.export-frames` tính theo
 * thư mục làm việc, mà mọi lệnh đều chạy cùng một chỗ — hai lệnh xuất song song
 * sẽ giẫm lên khung hình của nhau và cho ra hai video hỏng, im lặng. Nên xếp
 * hàng ở đây, chặn từ máy chủ, không tin vào việc giao diện tự giữ mình.
 *
 * TIẾN ĐỘ: bộ xuất không in phần trăm, nên suy từ chặng + đồng hồ. Và nói thật
 * với người dùng rằng nó chạy đúng bằng thời lượng phim — cách hứng hình là quay
 * màn hình theo thời gian thật, giấu cũng không được.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { TOOLS } from './proj.js';

const viec = new Map();   // id → bản ghi
let dem = 0;
const hangCho = [];
let dangChay = null;

const CHANG = {
  'khoi-dong': 'Đang mở trình duyệt',
  'dung-hinh': 'Đang dựng từng khung hình',
  'ghep': 'Đang ghép bằng ffmpeg',
  'xong': 'Xong',
};

function taoViec(loai, ten, args, { doanGiay = 0 } = {}) {
  const id = `v${++dem}`;
  const v = {
    id, loai, ten, args,
    trangThai: 'cho',        // cho | chay | xong | loi | huy
    chang: 'khoi-dong',
    phanTram: 0,
    doanGiay,                // thời lượng phim, để suy tiến độ chặng dựng hình
    nhatKy: [],
    ketQua: null,
    loi: null,
    batDau: null,
    nghe: new Set(),
  };
  viec.set(id, v);
  hangCho.push(v);
  chayTiep();
  return v;
}

function bao(v, kieu = 'doi') {
  const goi = { kieu, id: v.id, trangThai: v.trangThai, chang: v.chang,
    moTaChang: CHANG[v.chang] || v.chang, phanTram: Math.round(v.phanTram),
    ketQua: v.ketQua, loi: v.loi, dong: v.nhatKy[v.nhatKy.length - 1] || null };
  for (const f of v.nghe) { try { f(goi); } catch { /* người nghe hỏng thì kệ */ } }
}

function chayTiep() {
  if (dangChay || !hangCho.length) return;
  const v = hangCho.shift();
  dangChay = v;
  v.trangThai = 'chay';
  v.batDau = Date.now();
  bao(v);

  // cwd BẮT BUỘC là tools/: mọi script trong đó tự dò gốc dự án bằng
  // `path.resolve('..')`, chạy từ chỗ khác là chúng ghi ra sai thư mục.
  const con = spawn('node', v.args, { cwd: TOOLS, env: process.env });
  v.con = con;

  const dem2 = setInterval(() => {
    if (v.chang !== 'dung-hinh' || !v.doanGiay) return;
    const troi = (Date.now() - v.moc) / 1000;
    v.phanTram = Math.min(95, 5 + (troi / v.doanGiay) * 85);
    bao(v);
  }, 500);

  const nuot = (chunk) => {
    for (const dong of String(chunk).split('\n')) {
      const s = dong.trim();
      if (!s) continue;
      v.nhatKy.push(s);
      if (v.nhatKy.length > 400) v.nhatKy.shift();

      if (/Đang chạy phim từ giây/.test(s)) {
        v.chang = 'dung-hinh'; v.moc = Date.now(); v.phanTram = 5;
      } else if (/Đang ghép bằng ffmpeg/.test(s)) {
        v.chang = 'ghep'; v.phanTram = 96;
      } else if (/^✅ Xong:/.test(s)) {
        v.chang = 'xong'; v.phanTram = 100;
        v.ketQua = { file: path.basename(s.replace(/^✅ Xong:\s*/, '').trim()) };
      }
      bao(v, 'dong');
    }
  };
  con.stdout.on('data', nuot);
  con.stderr.on('data', nuot);

  con.on('close', (ma) => {
    clearInterval(dem2);
    if (v.trangThai === 'huy') { /* người dùng bấm dừng */ }
    else if (ma === 0) { v.trangThai = 'xong'; v.phanTram = 100; v.chang = 'xong'; }
    else {
      v.trangThai = 'loi';
      v.loi = v.nhatKy.slice(-6).join(' · ') || `Dừng với mã ${ma}`;
    }
    bao(v, 'xong');
    dangChay = null;
    // Dọn sau 15 phút — đủ lâu để tải file, đủ ngắn để không phình bộ nhớ.
    setTimeout(() => viec.delete(v.id), 15 * 60_000).unref?.();
    chayTiep();
  });
}

/** Khổ xuất hợp lệ cho một clip. Chọn nhầm tỉ lệ là ra video cắt cụt mà KHÔNG báo lỗi. */
export function khoHopLe(rong, cao) {
  return cao > rong
    ? [{ v: 'reels', nhan: '1080 × 1920 — dọc, cho Reels/TikTok/Shorts' },
       { v: 'vertical-4k', nhan: '2160 × 3840 — dọc, 4K' }]
    : [{ v: '1080p', nhan: '1920 × 1080 — ngang, Full HD' },
       { v: '720p', nhan: '1280 × 720 — ngang, nhẹ' },
       { v: '4k', nhan: '3840 × 2160 — ngang, 4K' }];
}

export function xuatVideo({ slug, khungXem, preset, chatLuong, giay, tenRa }) {
  const args = [
    'export-video.mjs',
    '--url', khungXem,
    '--preset', preset,
    '--quality', chatLuong || 'high',
    // README ghi rõ hai tham số này là BẮT BUỘC: để mặc định thì tốc độ hứng
    // hình rớt xuống ~17 hình/giây và video ra bị vấp.
    '--every', '1',
    '--jpeg', '92',
    '--out', tenRa,
  ];
  return taoViec('xuat', `Xuất video ${slug}`, args, { doanGiay: giay });
}

export function kiemBoCuc({ slug, khungXem }) {
  return taoViec('kiem', `Kiểm bố cục ${slug}`, ['check-layout.mjs', '--url', khungXem]);
}

export const layViec = (id) => viec.get(id) || null;
export const soDangCho = () => hangCho.length;
export function huyViec(id) {
  const v = viec.get(id);
  if (!v) return false;
  if (v.trangThai === 'cho') {
    const i = hangCho.indexOf(v);
    if (i >= 0) hangCho.splice(i, 1);
    v.trangThai = 'huy'; bao(v, 'xong');
    return true;
  }
  if (v.trangThai === 'chay' && v.con) {
    v.trangThai = 'huy';
    v.con.kill('SIGTERM');
    setTimeout(() => { try { v.con.kill('SIGKILL'); } catch {} }, 4000).unref?.();
    return true;
  }
  return false;
}
