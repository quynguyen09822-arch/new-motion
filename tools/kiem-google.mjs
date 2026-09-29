#!/usr/bin/env node
/**
 * KIỂM ĐĂNG NHẬP BẰNG GOOGLE.
 *
 * VÌ SAO BÀI NÀY GẮT. Đây là cửa vào duy nhất mà người lạ trên Internet chạm
 * tới được. Sai một cửa kiểm là ai cũng giả được người khác — và kiểu hỏng ấy
 * không kêu, không ghi log, chỉ lộ ra khi đã muộn. Anh Quý dặn "phải verify và
 * chính chủ đàng hoàng đủ bảo mật" (28/09).
 *
 * CÁCH THỬ. Không gọi Google thật (không thể tự bấm nút trong trang của họ).
 * Bài này dựng một GOOGLE GIẢ: tự sinh một cặp khoá RSA, tự ký id_token, và
 * phơi JWKS của chính mình. Nhờ vậy thử được cả những ca Google thật không
 * dựng lại được: thẻ hết hạn, thẻ ký bằng khoá khác, thẻ cấp cho ứng dụng khác,
 * thẻ của tài khoản chưa xác minh email.
 *
 *   ① Thẻ hợp lệ thì qua.
 *   ② Chữ ký sai / khoá lạ → chặn.
 *   ③ `aud` của ứng dụng khác → chặn.        ⑥ `nonce` không khớp → chặn.
 *   ④ `iss` không phải Google → chặn.        ⑦ email chưa xác minh → chặn.
 *   ⑤ thẻ hết hạn → chặn.                    ⑧ `state` không khớp → chặn.
 *   ⑨ người mới phải CHỜ DUYỆT, duyệt xong mới vào được.
 *   ⑩ gắn Google vào tài khoản email có sẵn thì KHÔNG đẻ dòng thứ hai.
 *
 *   node tools/kiem-google.mjs
 */
import { createSign, generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CONG = Number(process.env.CONG_GOOGLE || 7899);
const CONG_G = CONG + 1;
const GOC = `http://127.0.0.1:${CONG}`;
const MA_UNG_DUNG = 'ma-ung-dung-cua-motion.apps.googleusercontent.com';
const MK_CHUNG = 'mat-khau-chung-2026';
const CHU = 'chu@matbao.com';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* ---------- Google giả: một cặp khoá RSA và một JWKS ---------- */
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const { publicKey: pubLa, privateKey: privLa } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'khoa-thu-1';
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: KID, use: 'sig', alg: 'RS256' };

const b64 = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');

/** Ký một id_token như Google. `khoa` khác đi để thử ca chữ ký sai. */
function kyThe(than, { khoa = privateKey, kid = KID } = {}) {
  const dau = b64({ alg: 'RS256', kid, typ: 'JWT' });
  const t = b64(than);
  const s = createSign('RSA-SHA256').update(`${dau}.${t}`).sign(khoa).toString('base64url');
  return `${dau}.${t}.${s}`;
}

const thanChuan = (them = {}) => ({
  iss: 'https://accounts.google.com', aud: MA_UNG_DUNG, sub: '1234567890',
  email: 'khach-moi@gmail.com', email_verified: true, name: 'Khách Mới',
  exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), ...them,
});

/* Google giả: `/certs` trả JWKS, `/token` đổi code lấy id_token đã hẹn trước. */
let theKeTiep = null;
const gia = createServer((req, res) => {
  if (req.url.startsWith('/certs')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ keys: [jwk] }));
  }
  if (req.url.startsWith('/token')) {
    let than = '';
    req.on('data', (d) => { than += d; });
    return req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id_token: theKeTiep, access_token: 'x', token_type: 'Bearer' }));
    });
  }
  res.writeHead(404); return res.end();
});
await new Promise((r) => gia.listen(CONG_G, '127.0.0.1', r));
const GOC_G = `http://127.0.0.1:${CONG_G}`;

/* ---------- ①–⑦ kiểm thẳng hàm `moIdToken` ---------- */
console.log('\n① Thẻ id_token — bảy cửa kiểm');
process.env.GOOGLE_CLIENT_ID = MA_UNG_DUNG;
process.env.GOOGLE_CLIENT_SECRET = 'bi-mat-thu';
const { moIdToken } = await import(path.join(M, 'server', 'google.js'));
/* `nap` giả: mọi lời gọi JWKS đi về Google giả. */
const nap = (u, y) => fetch(String(u).includes('googleapis.com/oauth2/v3/certs') ? `${GOC_G}/certs` : u, y);

const thu = (ten, than, y = {}) => moIdToken(kyThe(than, y.ky), { nonce: y.nonce, nap })
  .then((k) => ({ ten, ...k }));

{
  const hople = await thu('hợp lệ', thanChuan({ nonce: 'n1' }), { nonce: 'n1' });
  dat('thẻ hợp lệ thì QUA', hople.ok === true, hople.cau);
  dat('email đọc ra đúng', hople.than?.email === 'khach-moi@gmail.com');

  const kyLa = await thu('ký khoá lạ', thanChuan(), { ky: { khoa: privLa } });
  dat('ký bằng khoá LẠ → chặn', kyLa.ok === false, kyLa.cau);
  dat('và nói đúng vì sao', /chữ ký/i.test(kyLa.cau || ''), kyLa.cau);

  const kidLa = await thu('kid lạ', thanChuan(), { ky: { kid: 'khong-co-that' } });
  dat('thẻ trỏ tới khoá không có thật → chặn', kidLa.ok === false, kidLa.cau);

  const audLa = await thu('aud lạ', thanChuan({ aud: 'ung-dung-khac.apps.googleusercontent.com' }));
  dat('thẻ cấp cho ỨNG DỤNG KHÁC → chặn', audLa.ok === false, audLa.cau);

  const issLa = await thu('iss lạ', thanChuan({ iss: 'https://ke-gia-mao.com' }));
  dat('thẻ không phải của Google → chặn', issLa.ok === false, issLa.cau);

  const hetHan = await thu('hết hạn', thanChuan({ exp: Math.floor(Date.now() / 1000) - 60 }));
  dat('thẻ hết hạn → chặn', hetHan.ok === false, hetHan.cau);

  const nonceLech = await thu('nonce lệch', thanChuan({ nonce: 'n1' }), { nonce: 'n2' });
  dat('nonce không khớp lượt đăng nhập → chặn', nonceLech.ok === false, nonceLech.cau);

  const chuaXac = await thu('chưa xác minh', thanChuan({ email_verified: false }));
  dat('email CHƯA XÁC MINH → chặn', chuaXac.ok === false, chuaXac.cau);
  dat('và nói đúng vì sao', /xác minh/i.test(chuaXac.cau || ''), chuaXac.cau);

  const khongEmail = await thu('không email', thanChuan({ email: undefined }));
  dat('thẻ không có email → chặn', khongEmail.ok === false, khongEmail.cau);
}

/* ---------- ⑧–⑩ chạy thật qua máy chủ ---------- */
console.log('\n② Chạy thật: sang Google, quay về, chờ duyệt');
const { bam } = await import(path.join(M, 'server', 'dangnhap.js'));
const tam = mkdtempSync(path.join(tmpdir(), 'motion-google-'));
const mc = spawn('node', [path.join(M, 'server', 'main.js')], {
  cwd: M, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(CONG),
    MOTION_MAT_KHAU_HASH: bam(MK_CHUNG), MOTION_KHOA_PHIEN: 'kiem-google',
    MOTION_TAI_KHOAN: CHU, MOTION_CHU_KHO: CHU,
    MOTION_GOC_KHO: path.join(tam, 'kho'),
    GOOGLE_CLIENT_ID: MA_UNG_DUNG, GOOGLE_CLIENT_SECRET: 'bi-mat-thu',
    /* Google giả: đổi `code` và lấy JWKS đều về máy này. */
    MOTION_GOOGLE_TOKEN: `${GOC_G}/token`, MOTION_GOOGLE_JWKS: `${GOC_G}/certs` },
});
let raMC = '';
mc.stdout.on('data', (d) => { raMC += d; });
mc.stderr.on('data', (d) => { raMC += d; });
const don = () => {
  try { mc.kill(); } catch { /* đã chết */ }
  try { gia.close(); } catch { /* đã đóng */ }
  try { rmSync(tam, { recursive: true, force: true }); } catch { /* kệ */ }
};
process.on('exit', don);

let len = false;
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`${GOC}/health`)).ok) { len = true; break; } } catch { /* chưa lên */ }
  await new Promise((r) => setTimeout(r, 300));
}
if (!len) { console.error(`❌ Máy chủ kiểm không lên được.\n${raMC.slice(-800)}`); don(); process.exit(1); }

try {
  /* Bước 1: xin đường sang Google, nhặt `state` + cookie. */
  const r1 = await fetch(`${GOC}/dang-nhap/google`, { redirect: 'manual' });
  const di = new URL(r1.headers.get('location'));
  const ckG = (r1.headers.get('set-cookie') || '').match(/motion_g=([^;]+)/)?.[1];
  dat('bước 1 chuyển sang accounts.google.com', di.host === 'accounts.google.com', di.host);
  dat('có state, nonce, và PKCE', Boolean(di.searchParams.get('state') && di.searchParams.get('nonce')
    && di.searchParams.get('code_challenge')), di.searchParams.get('code_challenge_method'));
  dat('xin đúng quyền, không xin thừa', di.searchParams.get('scope') === 'openid email profile',
    di.searchParams.get('scope'));
  dat('cookie tạm là HttpOnly', /HttpOnly/i.test(r1.headers.get('set-cookie') || ''));
  const state = di.searchParams.get('state');
  const nonce = di.searchParams.get('nonce');

  const veLai = async (y = {}) => {
    theKeTiep = kyThe(thanChuan({ nonce, ...(y.than || {}) }), y.ky);
    const u = new URL(`${GOC}/dang-nhap/google/tra-ve`);
    u.searchParams.set('code', 'ma-gia');
    u.searchParams.set('state', y.state === undefined ? state : y.state);
    const r = await fetch(u, { redirect: 'manual',
      headers: y.khongCookie ? {} : { Cookie: `motion_g=${y.cookie || ckG}` } });
    return { ma: r.status, chu: await r.text(),
      ve: (r.headers.get('set-cookie') || '').match(/motion_phien=([^;]+)/)?.[1] };
  };

  /* ⑧ state — cửa chống login CSRF. */
  const saiState = await veLai({ state: 'state-cua-ke-khac' });
  dat('state không khớp → chặn', !saiState.ve && saiState.ma === 400
    && /không khớp/i.test(saiState.chu), `mã ${saiState.ma}`);
  const khongCk = await veLai({ khongCookie: true });
  /* Kiểm CẢ mã trả về lẫn câu báo. Chỉ kiểm "không có vé" thì một lỗi 500 cũng
     cho qua — và bản đầu của bài này đã xanh nhầm đúng kiểu ấy. */
  dat('không có cookie tạm → chặn', !khongCk.ve && khongCk.ma === 400
    && /quá hạn|trình duyệt khác/i.test(khongCk.chu), `mã ${khongCk.ma}`);

  /* ⑨ người mới phải chờ duyệt. */
  const moi = await veLai();
  dat('người mới KHÔNG được vào thẳng', !moi.ve, `mã ${moi.ma}`);
  dat('và được nói là đang chờ duyệt', /chờ.*duyệt/i.test(moi.chu), moi.chu.match(/<p>([^<]*)/)?.[1]?.slice(0, 60));

  /* Chủ kho vào bằng mật khẩu, thấy người đang chờ, bấm duyệt. */
  const rc = await fetch(`${GOC}/api/dang-nhap`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CHU, mk: MK_CHUNG }), redirect: 'manual' });
  const veChu = (rc.headers.get('set-cookie') || '').match(/motion_phien=([^;]+)/)?.[1];
  const ds1 = await (await fetch(`${GOC}/api/nguoi-dung`, { headers: { Cookie: `motion_phien=${veChu}` } })).json();
  const cho = (ds1.nguoi || []).find((n) => n.email === 'khach-moi@gmail.com');
  dat('người quản trị thấy người đang chờ', Boolean(cho?.choDuyet), JSON.stringify(cho?.email));
  dat('và biết họ vào bằng Google', cho?.coGoogle === true);
  dat('người chờ duyệt KHÔNG gọi được API nào', (await fetch(`${GOC}/api/clips`,
    { headers: { Cookie: 'motion_phien=x' } })).status !== 200);

  const duyet = await fetch(`${GOC}/api/nguoi-dung/${encodeURIComponent('khach-moi@gmail.com')}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: `motion_phien=${veChu}` },
      body: JSON.stringify({ duyet: true }) });
  dat('duyệt được', (await duyet.json()).ok === true);

  /* Vào lại bằng Google — lần này phải qua. Phải xin `state` mới: một state chỉ
     dùng được đúng một lần. */
  const r2 = await fetch(`${GOC}/dang-nhap/google`, { redirect: 'manual' });
  const di2 = new URL(r2.headers.get('location'));
  const ck2 = (r2.headers.get('set-cookie') || '').match(/motion_g=([^;]+)/)?.[1];
  theKeTiep = kyThe(thanChuan({ nonce: di2.searchParams.get('nonce') }));
  const u2 = new URL(`${GOC}/dang-nhap/google/tra-ve`);
  u2.searchParams.set('code', 'ma-gia-2');
  u2.searchParams.set('state', di2.searchParams.get('state'));
  const r3 = await fetch(u2, { redirect: 'manual', headers: { Cookie: `motion_g=${ck2}` } });
  const veKhach = (r3.headers.get('set-cookie') || '').match(/motion_phien=([^;]+)/)?.[1];
  dat('duyệt xong thì vào được', Boolean(veKhach), `mã ${r3.status}`);
  dat('cookie tạm được xoá sau khi dùng', /motion_g=;/.test(r3.headers.get('set-cookie') || ''));
  const ai = await (await fetch(`${GOC}/api/toi-la-ai`, { headers: { Cookie: `motion_phien=${veKhach}` } })).json();
  dat('vào đúng tài khoản của mình', ai.email === 'khach-moi@gmail.com', ai.email);
  dat('và KHÔNG phải quản trị', ai.laQuanTri !== true);

  /* Dùng lại đúng state cũ lần nữa — phải trượt. */
  const lai = await fetch(u2, { redirect: 'manual', headers: { Cookie: `motion_g=${ck2}` } });
  dat('dùng lại state cũ lần hai → chặn', !(lai.headers.get('set-cookie') || '').includes('motion_phien=')
    && lai.status === 400, `mã ${lai.status}`);

  /* ⑩ gắn Google vào email đã có tài khoản mật khẩu → không đẻ dòng thứ hai. */
  const ds2 = await (await fetch(`${GOC}/api/nguoi-dung`, { headers: { Cookie: `motion_phien=${veChu}` } })).json();
  dat('không đẻ tài khoản trùng', new Set(ds2.nguoi.map((n) => n.email)).size === ds2.nguoi.length,
    ds2.nguoi.map((n) => n.email).join(', '));
} finally {
  if (process.env.SOI) console.log('\n--- máy chủ nói ---\n' + raMC.slice(-1500));
  don();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Đăng nhập bằng Google đạt hết.\n');
process.exit(hong ? 1 : 0);
