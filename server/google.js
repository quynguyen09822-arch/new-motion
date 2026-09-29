/**
 * ĐĂNG NHẬP BẰNG GOOGLE — luồng OAuth 2.0 / OpenID Connect, viết tay.
 *
 * VÌ SAO VIẾT TAY. Repo này không có gói phụ thuộc nào (CLAUDE.md §2), và thư
 * viện OAuth nào cũng kéo theo hàng chục gói. Node 22 có đủ: `fetch` để gọi
 * Google, `node:crypto` để xác minh chữ ký RS256. Toàn bộ nằm trong một file
 * này, không quá 300 dòng.
 *
 * VÌ SAO DÙNG GOOGLE. Anh Quý muốn khách hàng "đăng ký được nhiều tài khoản,
 * verify và chính chủ" (28/09). Google đã làm phần khó nhất: xác minh email là
 * thật và đúng chủ. Ta chỉ cần TIN ĐÚNG CÁCH — và chỗ này sai thì ai cũng giả
 * được người khác, nên mọi bước kiểm dưới đây đều bắt buộc.
 *
 * ═══ BỐN CỬA KIỂM, KHÔNG BỎ CỬA NÀO ═══
 *
 *  ① `state` — chuỗi ngẫu nhiên ta phát ra, Google trả lại nguyên văn. Không so
 *     lại thì kẻ khác gửi được cho nạn nhân một đường dẫn "đăng nhập xong" và
 *     ép nạn nhân đăng nhập vào TÀI KHOẢN CỦA KẺ ẤY (login CSRF). Ta ký `state`
 *     bằng HMAC và cất trong cookie `HttpOnly`, so cả hai đầu.
 *
 *  ② `nonce` — gửi lên lúc xin phép, Google nhét vào id_token. So lại thì một
 *     id_token cũ (đi ăn cắp được) không dùng lại được ở lượt sau.
 *
 *  ③ CHỮ KÝ id_token — RS256, khoá công khai lấy từ JWKS của Google. Không kiểm
 *     thì ai cũng tự viết một id_token "email: sep@matbao.com" rồi gửi vào.
 *     Kèm theo: `iss` đúng của Google, `aud` đúng mã ứng dụng của ta, `exp`
 *     chưa hết hạn. Thiếu `aud` là token cấp cho ứng dụng KHÁC cũng vào được.
 *
 *  ④ `email_verified` — Google có kiểu tài khoản email chưa xác minh. Nhận
 *     những tài khoản ấy là mất luôn ý nghĩa của việc dùng Google.
 *
 * PKCE (`code_verifier`) cũng có, dù ứng dụng loại "web" đã dùng `client_secret`
 * — thêm một lớp không tốn gì.
 */
import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from 'node:crypto';
import { layCauHinh } from './dangnhap.js';

const XIN_PHEP = 'https://accounts.google.com/o/oauth2/v2/auth';
/*
 * Hai đường của Google. `MOTION_GOOGLE_TOKEN`/`MOTION_GOOGLE_JWKS` chỉ để BÀI
 * KIỂM trỏ sang một "Google giả" chạy ở máy — không có chúng thì không thử được
 * những ca Google thật không dựng lại được (thẻ hết hạn, thẻ ký khoá khác, thẻ
 * cấp cho ứng dụng khác).
 *
 * Đây là biến môi trường, tức chỉ người quản trị máy chủ đặt được — cùng mức
 * tin cậy với `GOOGLE_CLIENT_SECRET`. Người dùng không với tới.
 */
const DOI_VE = () => (process.env.MOTION_GOOGLE_TOKEN || '').trim() || 'https://oauth2.googleapis.com/token';
const JWKS = () => (process.env.MOTION_GOOGLE_JWKS || '').trim() || 'https://www.googleapis.com/oauth2/v3/certs';
const PHAT_HANH = ['https://accounts.google.com', 'accounts.google.com'];

export const TEN_COOKIE_G = 'motion_g';
/** Người ta có 10 phút để bấm xong bên Google. Dài hơn thì `state` cũ sống lâu vô ích. */
const SONG_GIAY = 600;

export const maUngDung = () => layCauHinh('GOOGLE_CLIENT_ID').trim();
const biMat = () => layCauHinh('GOOGLE_CLIENT_SECRET').trim();
/** Đã khai đủ chưa — giao diện hỏi trước để khỏi bày nút bấm vào thì báo lỗi. */
export const coGoogle = () => Boolean(maUngDung() && biMat());

/**
 * Đường dẫn Google gọi ngược về.
 *
 * PHẢI khớp TỪNG KÝ TỰ với ô "Authorized redirect URI" khai trong Google Cloud
 * Console, nên suy từ chính yêu cầu đang xử lý chứ đừng viết cứng: bản chạy ở
 * máy là `http://127.0.0.1:7803`, bản thật là `https://motion.n1.tinhgon.xyz`.
 * `GOOGLE_REDIRECT` đè lên khi máy chủ đứng sau proxy lạ.
 */
export function duongTraVe(req) {
  const khai = layCauHinh('GOOGLE_REDIRECT').trim();
  if (khai) return khai;
  const chu = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
    || (req.socket.encrypted ? 'https' : 'http');
  const nha = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${chu}://${nha}/dang-nhap/google/tra-ve`;
}

/* ---------- cookie tạm mang state · nonce · code_verifier ---------- */

const khoa = () => layCauHinh('MOTION_KHOA_PHIEN') || 'motion-google';
const kyChuoi = (p) => createHmac('sha256', khoa()).update(p).digest('base64url');

function dongGoi(than) {
  const p = Buffer.from(JSON.stringify(than), 'utf8').toString('base64url');
  return `${p}.${kyChuoi(p)}`;
}
function moGoi(chuoi) {
  const [p, chuKy] = String(chuoi || '').split('.');
  if (!p || !chuKy) return null;
  const dung = kyChuoi(p);
  /* So bằng `timingSafeEqual`: so bằng `===` thì thời gian so tiết lộ dần chữ ký. */
  if (chuKy.length !== dung.length
    || !timingSafeEqual(Buffer.from(chuKy), Buffer.from(dung))) return null;
  try {
    const t = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    return t.het > Date.now() ? t : null;
  } catch { return null; }
}

/**
 * Bước 1 — dựng đường sang Google.
 * @returns {{diaChi:string, cookie:string}}
 */
export function batDau(req, { quayVe = '/' } = {}) {
  const state = randomBytes(24).toString('base64url');
  const nonce = randomBytes(24).toString('base64url');
  const maBiMat = randomBytes(32).toString('base64url');            // code_verifier
  const thach = createHash('sha256').update(maBiMat).digest('base64url');  // code_challenge

  const u = new URL(XIN_PHEP);
  u.searchParams.set('client_id', maUngDung());
  u.searchParams.set('redirect_uri', duongTraVe(req));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email profile');
  u.searchParams.set('state', state);
  u.searchParams.set('nonce', nonce);
  u.searchParams.set('code_challenge', thach);
  u.searchParams.set('code_challenge_method', 'S256');
  /* `select_account`: máy dùng chung mà không hỏi thì Google lẳng lặng lấy tài
     khoản đang đăng nhập sẵn, người thứ hai không đổi được sang tài khoản mình. */
  u.searchParams.set('prompt', 'select_account');

  const than = { state, nonce, pkce: maBiMat, ve: String(quayVe || '/').startsWith('/') ? quayVe : '/',
    het: Date.now() + SONG_GIAY * 1000 };
  const bao = dongGoi(than);
  const kin = (req.headers['x-forwarded-proto'] || '').includes('https') || req.socket.encrypted;
  return {
    diaChi: u.toString(),
    /* `SameSite=Lax`: Google trả về bằng một lượt CHUYỂN TRANG GET nên cookie
       `Lax` vẫn đi kèm, mà vẫn chặn được yêu cầu chéo kiểu POST. `Strict` thì
       cookie KHÔNG đi kèm lúc quay về và lượt đăng nhập nào cũng hỏng. */
    cookie: `${TEN_COOKIE_G}=${bao}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SONG_GIAY}`
      + (kin ? '; Secure' : ''),
  };
}

export const xoaCookieG = () => `${TEN_COOKIE_G}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/* ---------- MỘT `state` CHỈ DÙNG ĐƯỢC ĐÚNG MỘT LẦN ----------
 *
 * Xoá cookie tạm ở lượt trả về là chưa đủ: xoá cookie chỉ nhờ TRÌNH DUYỆT quên
 * đi, còn ai giữ được giá trị cookie ấy (máy dùng chung, nhật ký proxy, tiện
 * ích trình duyệt) thì gửi lại nguyên lượt đăng nhập trong 10 phút sau vẫn vào
 * được. Bài kiểm bắt đúng ca này: gửi lại y hệt lần hai vẫn ra vé.
 *
 * Google cũng chỉ cho đổi `code` một lần, nhưng đó là hàng rào của người khác —
 * không phải thứ ta được phép dựa vào.
 *
 * Sổ nằm trong bộ nhớ nên khởi động lại là trắng; hậu quả xấu nhất của việc ấy
 * là một lượt đăng nhập đang dở phải bấm lại, nên không đáng đưa vào CSDL.
 */
const daDung = new Map();   // state → lúc hết hạn
export function danhDauDaDung(state) {
  const nay = Date.now();
  for (const [k, het] of daDung) if (het < nay) daDung.delete(k);
  if (daDung.has(state)) return false;
  daDung.set(state, nay + SONG_GIAY * 1000);
  return true;
}

/* ---------- xác minh id_token ---------- */

let khoGoogle = { luc: 0, khoa: [] };

/** Khoá công khai của Google. Cất lại một giờ — hỏi mỗi lượt đăng nhập là phí. */
async function layKhoaGoogle(nap = fetch) {
  if (Date.now() - khoGoogle.luc < 3600_000 && khoGoogle.khoa.length) return khoGoogle.khoa;
  const r = await nap(JWKS(), { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`Không lấy được khoá của Google (mã ${r.status}).`);
  const d = await r.json();
  khoGoogle = { luc: Date.now(), khoa: d.keys || [] };
  return khoGoogle.khoa;
}

const docPhan = (p) => JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));

/**
 * Mở và KIỂM id_token. Trả về phần thân nếu mọi cửa đều qua.
 *
 * @param y.nonce  nonce đã phát ra ở bước 1
 * @param y.nap    hàm `fetch` — bài kiểm thay bằng Google giả
 * @param y.gio    giờ hiện tại (ms) — bài kiểm thử token hết hạn
 * @returns {{ok:true, than}|{ok:false, cau}}
 */
export async function moIdToken(token, { nonce, nap = fetch, gio = Date.now() } = {}) {
  const phan = String(token || '').split('.');
  if (phan.length !== 3) return { ok: false, cau: 'Google trả về thẻ không đúng khuôn.' };
  let dau, than;
  try { dau = docPhan(phan[0]); than = docPhan(phan[1]); }
  catch { return { ok: false, cau: 'Google trả về thẻ không đọc được.' }; }

  if (dau.alg !== 'RS256') return { ok: false, cau: `Thẻ ký bằng ${dau.alg}, không phải RS256.` };
  let khoaDS;
  try { khoaDS = await layKhoaGoogle(nap); }
  catch (e) { return { ok: false, cau: e.message }; }
  const k = khoaDS.find((x) => x.kid === dau.kid);
  if (!k) return { ok: false, cau: 'Không tìm thấy khoá công khai khớp với thẻ này.' };

  const pub = createPublicKey({ key: k, format: 'jwk' });
  const ok = verify('RSA-SHA256', Buffer.from(`${phan[0]}.${phan[1]}`), pub,
    Buffer.from(phan[2], 'base64url'));
  if (!ok) return { ok: false, cau: 'Chữ ký của thẻ không đúng.' };

  if (!PHAT_HANH.includes(than.iss)) return { ok: false, cau: `Thẻ không phải của Google (${than.iss}).` };
  /* `aud` PHẢI là mã ứng dụng của ta. Thiếu cửa này thì một id_token cấp cho
     ứng dụng khác (kẻ tấn công tự lập) cũng mở được cửa ở đây. */
  if (than.aud !== maUngDung()) return { ok: false, cau: 'Thẻ này cấp cho ứng dụng khác.' };
  if (!than.exp || than.exp * 1000 < gio) return { ok: false, cau: 'Thẻ đã hết hạn — thử đăng nhập lại.' };
  if (nonce && than.nonce !== nonce) return { ok: false, cau: 'Thẻ không khớp lượt đăng nhập này.' };
  if (than.email_verified !== true && than.email_verified !== 'true') {
    return { ok: false, cau: 'Tài khoản Google này chưa xác minh email.' };
  }
  if (!than.email) return { ok: false, cau: 'Google không trả về email.' };
  if (!than.sub) return { ok: false, cau: 'Google không trả về mã người dùng.' };
  return { ok: true, than };
}

/**
 * Bước 2 — Google gọi về. Đổi `code` lấy id_token rồi kiểm.
 *
 * @returns {{ok:true, email, sub, ten, anh, ve}|{ok:false, cau}}
 */
export async function nhanVeGoogle(req, { code, state, cookie, nap = fetch, gio = Date.now(),
  duongDoi = DOI_VE() } = {}) {
  const goi = moGoi(cookie);
  if (!goi) return { ok: false, cau: 'Lượt đăng nhập đã quá hạn hoặc mở ở trình duyệt khác. Thử lại.' };
  if (!state || state !== goi.state) return { ok: false, cau: 'Lượt đăng nhập không khớp — thử lại từ đầu.' };
  if (!danhDauDaDung(state)) {
    return { ok: false, cau: 'Lượt đăng nhập này đã dùng rồi — bấm đăng nhập lại từ đầu.' };
  }
  if (!code) return { ok: false, cau: 'Google không trả về mã đăng nhập.' };

  let r;
  try {
    r = await nap(duongDoi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: maUngDung(), client_secret: biMat(),
        redirect_uri: duongTraVe(req), grant_type: 'authorization_code',
        code_verifier: goi.pkce,
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) { return { ok: false, cau: `Không gọi được Google: ${e.message}` }; }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.id_token) {
    return { ok: false, cau: `Google từ chối đổi mã đăng nhập${d.error ? ` (${d.error})` : ''}.` };
  }

  const kq = await moIdToken(d.id_token, { nonce: goi.nonce, nap, gio });
  if (!kq.ok) return kq;
  return {
    ok: true,
    email: String(kq.than.email).trim().toLowerCase(),
    sub: String(kq.than.sub),
    ten: String(kq.than.name || '').slice(0, 80),
    anh: String(kq.than.picture || '').slice(0, 300),
    ve: goi.ve || '/',
  };
}
