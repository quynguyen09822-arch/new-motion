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
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { TOOLS } from './proj.js';
import { thamSoChuyen } from './nguonvideo.js';
import { fileURLToPath } from 'node:url';

/* Gốc của CHÍNH ứng dụng này — khác `PROJ` (gốc dự án clip). Bộ xuất nhanh nằm
   trong repo có git của ứng dụng, còn `export-video.mjs` nằm bên dự án clip
   không có git; hai đường dẫn không được lẫn nhau. */
const GOC_APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const viec = new Map();   // id → bản ghi
let dem = 0;
const hangCho = [];
let dangChay = null;

const CHANG = {
  'khoi-dong': 'Đang mở trình duyệt',
  'nhay-khung': 'Đang nhảy từng khung',
  chuyen: 'Đang chuyển sang định dạng trình duyệt xem được',
  'dung-hinh': 'Đang dựng từng khung hình',
  'ghep': 'Đang ghép bằng ffmpeg',
  'xong': 'Xong',
};

function taoViec(loai, ten, args, { doanGiay = 0, lenh = 'node' } = {}) {
  const id = `v${++dem}`;
  const v = {
    id, loai, ten, args, lenh,
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
  // (Việc chuyển video gọi thẳng `ffmpeg` và dùng đường dẫn tuyệt đối nên cwd
  // không ảnh hưởng — vẫn để chung cho một đường chạy duy nhất.)
  const con = spawn(v.lenh, v.args, { cwd: TOOLS, env: process.env });
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

      /* ffmpeg in `time=00:00:03.20` ra stderr — suy phần trăm từ đó. Không có
         dòng nào khác báo tiến độ, mà chuyển một file 8 giây 4,6 MB vẫn mất
         vài chục giây nên im lặng là người dùng tưởng treo. */
      if (v.loai === 'chuyen') {
        const m2 = /time=(\d+):(\d+):(\d+\.?\d*)/.exec(s);
        if (m2 && v.doanGiay) {
          const troi = (+m2[1]) * 3600 + (+m2[2]) * 60 + parseFloat(m2[3]);
          v.chang = 'chuyen';
          v.phanTram = Math.min(99, (troi / v.doanGiay) * 100);
        }
      } else if (/khung (\d+)\/(\d+)/.test(s)) {
        /* Bộ xuất nhanh in tiến độ bằng `\r` nên cả chuỗi về trong MỘT dòng,
           chứa nhiều mốc chồng lên nhau. Lấy mốc CUỐI chứ không lấy mốc đầu —
           lấy đầu thì thanh tiến độ tụt lùi mỗi lần có chunk mới. */
        const ds = [...s.matchAll(/khung (\d+)\/(\d+)/g)];
        const [, da, tong] = ds[ds.length - 1];
        v.chang = 'nhay-khung';
        v.phanTram = Math.min(95, 3 + (Number(da) / Number(tong)) * 92);
      } else if (/Đang chạy phim từ giây/.test(s)) {
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

/**
 * XUẤT VIDEO CÓ CHẠY ĐƯỢC TRÊN MÁY NÀY KHÔNG.
 *
 * Bản chạy trong Docker KHÔNG đóng gói `tools/`, cũng không có ffmpeg lẫn
 * Chromium — ảnh sẽ phình lên khoảng 1 GB. Không kiểm trước thì người dùng bấm
 * "Xuất video", chờ, rồi nhận một dòng "spawn ffmpeg ENOENT" chẳng nói lên điều
 * gì. Kiểm ở đây để báo bằng tiếng người, ngay lúc bấm.
 */
export function xuatDuocKhong() {
  const thieu = [];
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
  catch { thieu.push('ffmpeg'); }
  try { createRequire(path.join(TOOLS, '/'))('playwright'); }
  catch { thieu.push('trình duyệt Chromium'); }
  if (!existsSync(path.join(GOC_APP, 'tools', 'xuat-nhanh.mjs'))) thieu.push('bộ xuất');
  return thieu.length
    ? { ok: false, thieu, cau: `Bản này không dựng video được — thiếu ${thieu.join(' và ')}.`
        + ' Hãy mở dự án trên máy làm việc rồi xuất ở đó.' }
    : { ok: true, thieu: [] };
}

/**
 * XUẤT NHANH — nhảy từng khung, chia nhiều luồng.
 *
 * Vẫn xếp chung một hàng với bộ cũ dù bộ này để khung tạm ở thư mục riêng nên
 * chạy song song được: mỗi việc đã tự mở 4 trình duyệt rồi, cho hai việc cùng
 * chạy trên máy 12 lõi là cả hai cùng chậm chứ không ai nhanh lên.
 */
export function xuatNhanh({ slug, khungXem, preset, dinhDang, giay, tenRa, luong }) {
  const args = [
    path.join(GOC_APP, 'tools', 'xuat-nhanh.mjs'),
    '--url', khungXem,
    '--preset', preset,
    '--format', dinhDang || 'mp4',
    '--luong', String(luong || 4),
    '--out', tenRa,
  ];
  return taoViec('xuat', `Xuất nhanh ${slug} (${dinhDang || 'mp4'})`, args, { doanGiay: giay });
}

/** Chuyển một file video sang H.264 để trình duyệt phát được. */
export function chuyenVideo({ ten, vao, ra, giay }) {
  return taoViec('chuyen', `Chuyển ${ten}`, thamSoChuyen(vao, ra),
    { lenh: 'ffmpeg', doanGiay: giay || 0 });
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
