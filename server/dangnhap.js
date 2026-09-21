/**
 * ĐĂNG NHẬP — email công ty + một mật khẩu chung.
 *
 * KHÔNG BAO GIỜ KHOÁ NGƯỜI DÙNG RA NGOÀI.
 *   Chưa đặt mật khẩu thì app chạy y như trước, chỉ hiện một lời nhắc. Bắt đăng
 *   nhập ngay khi chưa ai kịp đặt mật khẩu là khoá chính chủ ra khỏi công cụ của
 *   họ, và cách duy nhất để vào lại là sửa file trên máy chủ — thứ mà người dùng
 *   của công cụ này không làm được.
 *
 * DANH SÁCH TÀI KHOẢN CHO PHÉP, không phải "đuôi email nào cũng được".
 *   Bản đầu chỉ kiểm đuôi `@matbao.com`, nghĩa là gõ `abc@matbao.com` cũng vào
 *   được — lớp email khi đó chỉ là trang trí. quynd chỉ ra đúng chỗ đó.
 *
 *   Nay `MOTION_TAI_KHOAN` khai thẳng ai được vào (ngăn nhau bằng dấu phẩy).
 *   Khai rồi thì CHỈ những tài khoản đó vào được, đuôi email không còn quyết định.
 *   Bỏ trống thì mới quay về luật đuôi cũ — dành cho lúc chạy thử ở máy.
 *
 *   Vẫn nhớ: email KHÔNG được kiểm chứng bằng thư xác nhận. Nó thu hẹp cửa vào
 *   và cho biết ai đang sửa, nhưng cửa thật vẫn là mật khẩu.
 *
 * MẬT KHẨU CẤT DẠNG BĂM, KHÔNG CẤT NGUYÊN VĂN.
 *   `scrypt` với muối ngẫu nhiên. Ai đọc được file `.env` cũng không lấy ra được
 *   mật khẩu. Đặt bằng `npm run dat-mat-khau`.
 *
 * PHIÊN KHÔNG LƯU TRONG BỘ NHỚ.
 *   Vé đăng nhập là một chuỗi tự chứng thực: `payload.chữ-ký`, ký bằng HMAC với
 *   một khoá bí mật. Nhờ vậy khởi động lại máy chủ thì người dùng KHÔNG bị đá ra
 *   — mà công cụ này khởi động lại rất thường xuyên.
 *
 * ĐẾM SỐ LẦN GÕ SAI.
 *   Không đếm thì một mật khẩu bình thường bị dò ra trong vài giờ. Sai 8 lần
 *   trong 15 phút là khoá theo địa chỉ máy.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F_ENV = path.join(GOC, '.env');

export const TEN_COOKIE = 'motion_phien';
const SONG_NGAY = 14;                    // vé sống 14 ngày
const SAI_TOI_DA = 8;
const KHOA_PHUT = 15;

/* ---------- đọc/ghi .env của CHÍNH repo này ---------- */
/* Cố ý KHÔNG dùng `.env` của dự án clip: file đó đang chứa khoá ElevenLabs và
   khoá Google, lại là dự án dùng chung không có git. Mật khẩu của công cụ này
   là chuyện của công cụ này. */
function docEnv() {
  if (!existsSync(F_ENV)) return {};
  const gt = {};
  for (const dong of readFileSync(F_ENV, 'utf8').split('\n')) {
    const d = dong.trim();
    if (!d || d.startsWith('#') || !d.includes('=')) continue;
    const i = d.indexOf('=');
    let v = d.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    gt[d.slice(0, i).trim()] = v;
  }
  return gt;
}

export function ghiEnv(khoa, giaTri) {
  const cu = existsSync(F_ENV) ? readFileSync(F_ENV, 'utf8') : '';
  const dong = cu.split('\n');
  const moi = `${khoa}=${giaTri}`;
  const i = dong.findIndex((d) => d.trim().startsWith(`${khoa}=`));
  if (i >= 0) dong[i] = moi; else dong.push(moi);
  writeFileSync(F_ENV, dong.filter((d, j) => d !== '' || j < dong.length - 1).join('\n').replace(/\n*$/, '\n'), 'utf8');
}

/* Biến môi trường thắng file — để chạy thử và để bài kiểm dựng máy chủ riêng mà
   không phải đụng vào `.env` thật.
 *
 * Kiểm bằng `k in process.env` chứ KHÔNG bằng `process.env[k] || …`: đặt biến
 * thành CHUỖI RỖNG là cách nói "cố ý không có giá trị này". Dùng `||` thì chuỗi
 * rỗng bị coi như chưa đặt và rơi xuống đọc `.env` — nghĩa là không có cách nào
 * tắt mật khẩu bằng biến môi trường khi `.env` đang có mật khẩu. Bài kiểm dựng
 * máy chủ "chưa đặt mật khẩu" vấp đúng chỗ này. */
export const layCauHinh = (k) => (k in process.env ? String(process.env[k]) : (docEnv()[k] || ''));
/* Tên ngắn dùng trong chính file này; `layCauHinh` là tên cho người ngoài gọi
   (`kho.js` cần đọc `MOTION_CHU_KHO` theo đúng luật biến-môi-trường-thắng-file). */
const lay = layCauHinh;

/* ---------- mật khẩu ---------- */

export function bam(mk, muoi = randomBytes(16).toString('hex')) {
  return `scrypt$${muoi}$${scryptSync(String(mk), muoi, 32).toString('hex')}`;
}

export const daDatMatKhau = () => lay('MOTION_MAT_KHAU_HASH').startsWith('scrypt$');

/** Đuôi email được phép. Bỏ trống trong `.env` là chấp nhận mọi email. */
export const duoiEmail = () => (lay('MOTION_DUOI_EMAIL') || '').trim().toLowerCase();

/**
 * Danh sách tài khoản được vào. Ngăn nhau bằng dấu phẩy.
 *
 * Khai `motion11011` (không có phần đuôi) thì tự ghép thêm `MOTION_DUOI_EMAIL`
 * — người đặt cấu hình không phải gõ lại đuôi cho từng dòng, và gõ lại thì sớm
 * muộn cũng có dòng gõ sai.
 */
export function dsTaiKhoan() {
  return (lay('MOTION_TAI_KHOAN') || '')
    .split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
    .map((x) => (x.includes('@') ? x : x + duoiEmail()));
}

/**
 * Email có dùng được không.
 *
 * Kiểm khuôn TRƯỚC rồi mới kiểm đuôi: `@matbao.com` tự nó khớp đuôi nhưng không
 * phải email của ai cả, và nếu chỉ kiểm đuôi thì chuỗi rỗng phía trước lọt qua,
 * rồi hiện lên thanh trên thành một cái tên trống trơn.
 */
export function kiemEmail(em) {
  const e = String(em || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    return { ok: false, cau: 'Email chưa đúng khuôn. Ví dụ: ten.ban@matbao.com' };
  }
  /* Có danh sách thì danh sách QUYẾT ĐỊNH, đuôi không còn vai trò. Kiểm cả hai
     là thừa, mà thừa ở chỗ này thì sinh ra hai câu báo lỗi khác nhau cho cùng
     một chuyện "bạn không được vào". */
  const ds = dsTaiKhoan();
  if (ds.length) {
    if (!ds.includes(e)) {
      return { ok: false, cau: 'Tài khoản này không được phép đăng nhập.' };
    }
    return { ok: true, email: e };
  }

  const duoi = duoiEmail();
  if (duoi && !e.endsWith(duoi)) {
    return { ok: false, cau: `Chỉ email đuôi ${duoi} mới vào được.` };
  }
  return { ok: true, email: e };
}

export function kiemMatKhau(mk) {
  const luu = lay('MOTION_MAT_KHAU_HASH');
  if (!luu.startsWith('scrypt$')) return false;
  const [, muoi, dung] = luu.split('$');
  if (!muoi || !dung) return false;
  const thu = scryptSync(String(mk || ''), muoi, 32);
  const chuan = Buffer.from(dung, 'hex');
  /* `timingSafeEqual` ném lỗi nếu hai bên khác độ dài — kiểm trước, không thì
     một mật khẩu dài bất thường làm sập máy chủ thay vì bị từ chối. */
  return chuan.length === thu.length && timingSafeEqual(thu, chuan);
}

/* ---------- vé phiên ---------- */

/** Khoá ký. Chưa có thì sinh một lần rồi cất — không sinh mới mỗi lần khởi động,
 *  vì làm vậy là mọi người bị đá ra sau mỗi lần khởi động lại. */
function khoaKy() {
  let k = lay('MOTION_KHOA_PHIEN');
  if (!k) { k = randomBytes(32).toString('hex'); ghiEnv('MOTION_KHOA_PHIEN', k); }
  return k;
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');
const ky = (p) => createHmac('sha256', khoaKy()).update(p).digest('base64url');

/**
 * @param email ai đang cầm vé
 * @param y.xuat vé CHỈ dùng cho việc xuất video — xem `duocVaoKhiXuat`
 * @param y.song vé sống bao nhiêu giây
 */
export function taoVe(email = '', { xuat = false, song = SONG_NGAY * 86400 } = {}) {
  const than = { het: Date.now() + song * 1000, em: email };
  if (xuat) than.xuat = 1;
  const p = b64(JSON.stringify(than));
  return `${p}.${ky(p)}`;
}

/**
 * VÉ NGẮN HẠN CHO VIỆC XUẤT VIDEO.
 *
 * Bộ xuất mở khung xem bằng Chromium, và Chromium đó KHÔNG có vé đăng nhập —
 * nên từ ngày có mật khẩu thì mọi lần xuất trên máy chủ có mật khẩu đều nhận
 * lại trang đăng nhập và quay ra một video chụp cái trang ấy. Kho riêng chỉ làm
 * chuyện này lộ ra, vì kho riêng chỉ tồn tại khi đăng nhập đang bật.
 *
 * CÁCH VÁ SAI mà ai cũng nghĩ tới đầu tiên: "bỏ qua đăng nhập nếu gọi từ
 * localhost". Cửa hậu nào rồi cũng có ngày bị bật nhầm trên bản chạy thật —
 * luật này đã ghi sẵn trong CLAUDE.md và DANG-NHAP.md.
 *
 * CÁCH ĐÚNG: máy chủ tự ký một vé sống một giờ, nhét vào đường dẫn đưa cho bộ
 * xuất. Vé ấy KHÔNG phải một lần đăng nhập — nó chỉ mở đúng những đường cần để
 * VẼ RA khung hình, và không mở một đường ghi nào. Lỡ có lọt ra ngoài thì thứ
 * lấy được cũng chỉ là xem clip, trong vòng một giờ.
 *
 * Vé vẫn mang theo email, vì bộ dựng phải đọc kịch bản trong ĐÚNG kho của người
 * bấm nút — không mang thì vé mở ra kho gốc và xuất nhầm clip của người khác.
 */
export const SONG_VE_XUAT = 3600;      // một giờ
export const taoVeXuat = (email) => taoVe(email, { xuat: true, song: SONG_VE_XUAT });

/** Vé xuất video mở được những đường nào — DANH SÁCH TRẮNG, chỉ đủ để vẽ hình. */
export function duocVaoKhiXuat(duong) {
  return duong === '/health'
    || duong.startsWith('/clip/')          // bộ dựng, phông, ảnh, video nguồn
    || duong.startsWith('/api/kich-ban/')  // kịch bản của kho riêng
    || duong === '/api/canh-mau';          // cảnh mẫu của ô xem thử
}

/** Mở vé ra. Trả `null` nếu chữ ký sai hoặc đã hết hạn. */
export function moVe(ve) {
  const s = String(ve || '');
  const i = s.lastIndexOf('.');
  if (i <= 0) return null;
  const p = s.slice(0, i);
  const c = s.slice(i + 1);
  const dung = ky(p);
  if (c.length !== dung.length || !timingSafeEqual(Buffer.from(c), Buffer.from(dung))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    return d.het > Date.now() ? d : null;
  } catch { return null; }
}

export const veConHan = (ve) => moVe(ve) !== null;

/** Ai đang đăng nhập — lấy từ chính vé, không giữ sổ riêng trong bộ nhớ. */
export const aiDangVao = (req) => moVe(docCookie(req, TEN_COOKIE))?.em || null;

export function docCookie(req, ten) {
  for (const c of String(req.headers.cookie || '').split(';')) {
    const i = c.indexOf('=');
    if (i > 0 && c.slice(0, i).trim() === ten) return decodeURIComponent(c.slice(i + 1).trim());
  }
  return null;
}

/** `Secure` chỉ khi thật sự đang chạy qua https — bật bừa thì cookie không bao
 *  giờ được gửi lúc chạy thử ở `http://127.0.0.1`, và đăng nhập thành vòng lặp. */
export function datCookie(req, ve, song = SONG_NGAY * 86400) {
  const https = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  return `${TEN_COOKIE}=${encodeURIComponent(ve)}; Path=/; HttpOnly; SameSite=Lax; `
    + `Max-Age=${song}${https ? '; Secure' : ''}`;
}

export function xoaCookie(req) {
  const https = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  return `${TEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${https ? '; Secure' : ''}`;
}

/* ---------- đếm lần gõ sai ---------- */

const soSai = new Map();

/**
 * Địa chỉ máy gọi tới, dùng làm khoá đếm số lần gõ sai.
 *
 * LẤY PHẦN CUỐI của `x-forwarded-for`, KHÔNG lấy phần đầu.
 *
 * Phần đầu là thứ NGƯỜI GỌI tự khai — ai cũng gửi được. Lấy phần đầu thì người
 * dò mật khẩu chỉ cần đổi con số đó mỗi lần là bộ đếm không bao giờ tới ngưỡng.
 * Đã đo thật trên bản chạy: gõ sai 12 lần kèm 12 địa chỉ giả thì 7 lần LỌT, còn
 * không khai gì thì bị khoá đủ 12/12.
 *
 * Phần cuối do proxy gần mình nhất ghi vào, người ngoài không chèn được — trừ
 * khi có nhiều tầng proxy, và lúc đó phải khai `MOTION_SO_PROXY` cho đúng số tầng.
 */
export function diaChi(req) {
  const ds = String(req.headers['x-forwarded-for'] || '')
    .split(',').map((x) => x.trim()).filter(Boolean);
  if (ds.length) {
    const soProxy = Math.max(1, Number(lay('MOTION_SO_PROXY')) || 1);
    return ds[Math.max(0, ds.length - soProxy)] || ds[ds.length - 1];
  }
  return req.socket?.remoteAddress || 'khong-ro';
}

/**
 * Đếm theo CẢ HAI khoá: địa chỉ máy VÀ tài khoản.
 *
 * Chỉ đếm theo máy thì một mạng công ty dùng chung một địa chỉ ra ngoài sẽ khoá
 * lẫn nhau; chỉ đếm theo tài khoản thì người dò chỉ việc đổi máy. Đếm cả hai:
 * dò một tài khoản từ nhiều máy vẫn bị chặn, mà người ngồi cạnh gõ sai cũng
 * không khoá được người khác quá lâu.
 */
export function dangBiKhoa(...khoa) {
  let lau = 0;
  for (const k of khoa.filter(Boolean)) {
    const g = soSai.get(k);
    if (!g) continue;
    if (Date.now() > g.den) { soSai.delete(k); continue; }
    if (g.lan >= SAI_TOI_DA) lau = Math.max(lau, Math.ceil((g.den - Date.now()) / 60000));
  }
  return lau;
}

export function ghiSai(...khoa) {
  let con = SAI_TOI_DA;
  for (const k of khoa.filter(Boolean)) {
    const g = soSai.get(k) || { lan: 0, den: 0 };
    g.lan += 1;
    g.den = Date.now() + KHOA_PHUT * 60000;
    soSai.set(k, g);
    con = Math.min(con, SAI_TOI_DA - g.lan);
  }
  return con;
}

export function xoaSai(...khoa) { for (const k of khoa.filter(Boolean)) soSai.delete(k); }

/* ---------- cửa ---------- */

/** Đường nào đi được khi chưa đăng nhập. Danh sách TRẮNG, không phải đen. */
/* `/api/toi-la-ai` nằm trong danh sách mở vì TRANG ĐĂNG NHẬP gọi nó để biết đuôi
   email mà gợi ý. Nó chỉ trả những thứ ai cũng thấy được ở màn hình đăng nhập:
   đã đặt mật khẩu chưa, đuôi email là gì, và ai đang đăng nhập (rỗng nếu chưa). */
const MO = new Set(['/dang-nhap', '/api/dang-nhap', '/api/dang-xuat', '/api/toi-la-ai',
  '/health', '/api/health',
  '/dang-nhap.css', '/logo/motion-mark.png', '/logo/motion-full.png', '/logo/favicon.png']);

/* Bộ chữ tự chứa phải đi được TRƯỚC cửa: trang đăng nhập cũng cần đúng mặt chữ.
   Để tiền tố chứ không liệt kê 21 file woff2 — thêm một nét chữ là quên sửa ngay.
   Mở một thư mục font chỉ-đọc, không phải mở `/clip/`: `static.js` vẫn chặn `..`
   và mọi đoạn bắt đầu bằng dấu chấm, nên không lần ra ngoài thư mục này được. */
const MO_TIEN_TO = ['/clip/public/fonts/'];

/**
 * @param veThem vé lấy từ `?ve=` trên đường dẫn — bộ xuất video đưa vào lối này.
 *               Vẫn phải qua đúng những phép kiểm như vé trong cookie.
 */
export function duocVao(req, duong, veThem = null) {
  if (!daDatMatKhau()) return true;          // chưa đặt mật khẩu → không chặn ai
  if (MO.has(duong)) return true;
  if (MO_TIEN_TO.some((t) => duong.startsWith(t))) return true;

  for (const ve of [docCookie(req, TEN_COOKIE), veThem]) {
    const d = ve && moVe(ve);
    if (!d) continue;
    /* Vé thường mở mọi đường. Vé xuất video CHỈ mở đường vẽ hình — nó không
       phải một lần đăng nhập, mà là một chiếc chìa cho đúng một việc. */
    if (!d.xuat) return true;
    if (duocVaoKhiXuat(duong)) return true;
  }
  return false;
}
