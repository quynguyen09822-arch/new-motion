#!/usr/bin/env node
/**
 * KIỂM NHẬT KÝ LƯỢT DÙNG (mục M1 trong TIEP-THEO.md).
 *
 * Chạy bằng Node trần, KHÔNG cần Chromium. Nó tự dựng máy chủ riêng ở cổng
 * 7808/7809 với mật khẩu tạm, nên không đụng máy chủ thật lẫn `.env` thật.
 *
 * Phép thử đáng giá nhất là ⑤: ghi nhật ký hỏng thì việc LƯU CLIP vẫn phải
 * thành công. Thống kê là thứ xem cho biết; clip là việc của người dùng. Để một
 * lỗi ghi log làm hỏng một lần lưu là kiểu hỏng không được phép có ở đây.
 */
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { bam } = await import(path.join(M, 'server', 'dangnhap.js'));
const NK = path.join(M, '.nhat-ky');
const DONG = path.join(NK, 'dung.jsonl');

/* Bài kiểm này xoá đi xoá lại `.nhat-ky/`. Trên máy đang chạy thật, đó là SỐ
   LIỆU THẬT chưa kịp đẩy lên repo. Cất sang một bên trước, trả lại lúc xong —
   kể cả khi bài kiểm gãy giữa chừng. */
const CAT = path.join(M, '.nhat-ky.dang-kiem');
rmSync(CAT, { recursive: true, force: true });
if (existsSync(NK)) renameSync(NK, CAT);
const traLai = () => {
  rmSync(NK, { recursive: true, force: true });
  if (existsSync(CAT)) renameSync(CAT, NK);
};
process.on('exit', traLai);
process.on('SIGINT', () => { traLai(); process.exit(130); });

let hong = 0;
const dat = (t, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${t}${them ? ' — ' + them : ''}`);
  if (!ok) hong++;
};

/** Dựng một máy chủ riêng, đợi tới lúc nó trả lời /health. */
async function dungMayChu({ cong, mk, taiKhoan }) {
  const mc = spawn('node', [path.join(M, 'server', 'main.js')], {
    cwd: M, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(cong), MOTION_KHOA_PHIEN: 'kiem-nhat-ky',
           MOTION_MAT_KHAU_HASH: bam(mk), MOTION_DUOI_EMAIL: '@matbao.com',
           MOTION_TAI_KHOAN: taiKhoan },
  });
  let loi = '';
  mc.stderr.on('data', (d) => { loi += d; });
  const goc = `http://127.0.0.1:${cong}`;
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${goc}/health`)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return { mc, goc, loi: () => loi };
}

async function vao(goc, em, mk) {
  const r = await fetch(`${goc}/api/dang-nhap`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: em, mk }), redirect: 'manual',
  });
  return (r.headers.get('set-cookie') || '').match(/motion_phien=([^;]+)/)?.[1];
}

async function luu(goc, ve, slug) {
  const d = await (await fetch(`${goc}/api/clip/${slug}`, { headers: { Cookie: `motion_phien=${ve}` } })).json();
  const r = await fetch(`${goc}/api/clip/${slug}`, {
    method: 'POST', headers: { Cookie: `motion_phien=${ve}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc: d.doc }),
  });
  return r.status;
}

const thongKeQua = (goc, ve) =>
  fetch(`${goc}/api/thong-ke`, { headers: { Cookie: `motion_phien=${ve}` } }).then((r) => r.json());

/* ───────── ①②③④ đúng bốn gạch đầu dòng nghiệm thu ───────── */
{
  const MK = 'kiem-nhat-ky-123';
  rmSync(NK, { recursive: true, force: true });
  const { mc, goc } = await dungMayChu({ cong: 7808, mk: MK, taiKhoan: 'nguoi-a,nguoi-b' });

  console.log('\n① Sửa 3 clip bằng 2 tài khoản → đếm đúng 3 lượt, 2 người');
  const a = await vao(goc, 'nguoi-a@matbao.com', MK);
  const b = await vao(goc, 'nguoi-b@matbao.com', MK);
  dat('hai tài khoản đăng nhập được', Boolean(a && b));
  const ma = [await luu(goc, a, 'cta'), await luu(goc, a, 'vibe-host'), await luu(goc, b, 'thuong-hieu')];
  dat('lưu được 3 clip', ma.every((x) => x === 200), ma.join('/'));
  const tk = await thongKeQua(goc, a);
  dat('đếm đúng 3 lượt', tk.tong.luot === 3, `${tk.tong.luot} lượt`);
  dat('đếm đúng 2 người', tk.tong.nguoi === 2, `${tk.tong.nguoi} người`);
  dat('đếm đúng 3 clip', tk.tong.clip === 3, `${tk.tong.clip} clip`);
  dat('có xếp hạng theo người', tk.theoNguoi?.[0]?.luot === 2, JSON.stringify(tk.theoNguoi));

  console.log('\n② Xoá .nhat-ky/ đi thì app vẫn lưu clip, không văng lỗi');
  rmSync(NK, { recursive: true, force: true });
  dat('đã xoá thư mục nhật ký', !existsSync(NK));
  const s4 = await luu(goc, a, 'cta');
  dat('vẫn lưu được clip', s4 === 200, `mã ${s4}`);
  dat('nhật ký tự dựng lại', existsSync(NK));
  const tk2 = await thongKeQua(goc, a);
  dat('thống kê vẫn đọc được', tk2.ok === true && tk2.tong.luot === 1, `${tk2.tong.luot} lượt`);

  console.log('\n③ .nhat-ky/ nằm trong .gitignore và .dockerignore');
  for (const f of ['.gitignore', '.dockerignore']) {
    dat(`${f} có .nhat-ky/`, /^\.nhat-ky\/?$/m.test(readFileSync(path.join(M, f), 'utf8')));
  }

  console.log('\n④ Thống kê phải nằm sau cửa đăng nhập');
  const chua = await fetch(`${goc}/api/thong-ke`, { redirect: 'manual' });
  dat('chưa đăng nhập thì không xem được', chua.status === 401, `mã ${chua.status}`);

  mc.kill();
  rmSync(NK, { recursive: true, force: true });
}

/* ───────── ⑤ Ghi nhật ký hỏng → LƯU CLIP vẫn phải thành công ─────────
   Dựng .nhat-ky/ ở chế độ chỉ đọc để ép `appendFileSync` ném lỗi thật, rồi xem
   việc lưu có sống không. Không giả lập bằng mock: phải là lỗi hệ thống tệp thật. */
{
  const MK = 'kiem-nhat-ky-456';
  console.log('\n⑤ Ghi nhật ký hỏng thì việc LƯU CLIP vẫn phải thành công');
  rmSync(NK, { recursive: true, force: true });
  mkdirSync(NK, { recursive: true });
  writeFileSync(DONG, '');
  chmodSync(DONG, 0o444);
  chmodSync(NK, 0o555);

  const { mc, goc, loi } = await dungMayChu({ cong: 7809, mk: MK, taiKhoan: 'x' });
  const ve = await vao(goc, 'x@matbao.com', MK);
  const ma = await luu(goc, ve, 'cta');
  dat('nhật ký không ghi được mà clip VẪN LƯU ĐƯỢC', ma === 200, `mã ${ma}`);
  dat('máy chủ không văng lỗi ra ngoài', !/Error|EACCES/.test(loi()), loi().slice(0, 60) || 'sạch');
  const tk = await thongKeQua(goc, ve);
  dat('thống kê vẫn trả lời được, không sập', tk.ok === true);

  mc.kill();
  chmodSync(NK, 0o755);
  chmodSync(DONG, 0o644);
  rmSync(NK, { recursive: true, force: true });
}

/* ───────── ⑥ Số liệu sống qua lần triển khai lại ─────────
   Phần cũ nằm ở so-lieu/ (đi theo repo), phần mới ở .nhat-ky/ (mất khi deploy
   lại). Thống kê phải gộp cả hai và bỏ dòng trùng. */
{
  console.log('\n⑥ Số liệu sống qua lần triển khai lại');
  const REPO = path.join(M, 'so-lieu', 'luot-dung.jsonl');
  const cu = existsSync(REPO) ? readFileSync(REPO, 'utf8') : '';
  try {
    writeFileSync(REPO, [
      JSON.stringify({ luc: '2026-09-01T01:00:00.000Z', viec: 'luu', ai: 'cu@matbao.com', slug: 'cta', canh: 1 }),
      JSON.stringify({ luc: '2026-09-01T02:00:00.000Z', viec: 'luu', ai: 'cu2@matbao.com', slug: 'vibe-host', canh: 2 }),
    ].join('\n') + '\n', 'utf8');
    mkdirSync(NK, { recursive: true });
    writeFileSync(DONG, [
      JSON.stringify({ luc: '2026-09-01T02:00:00.000Z', viec: 'luu', ai: 'cu2@matbao.com', slug: 'vibe-host', canh: 2 }), // TRÙNG
      JSON.stringify({ luc: '2026-09-18T03:00:00.000Z', viec: 'luu', ai: 'moi@matbao.com', slug: 'cta', canh: 1 }),
    ].join('\n') + '\n', 'utf8');

    const { thongKe } = await import(path.join(M, 'server', 'nhatky.js') + '?v=' + Date.now());
    const t = thongKe();
    dat('gộp cả phần cũ trên repo lẫn phần mới', t.tong.luot === 3, `${t.tong.luot} lượt (2 cũ + 2 mới − 1 trùng)`);
    dat('bỏ đúng dòng trùng', t.tong.nguoi === 3, `${t.tong.nguoi} người`);
  } finally {
    writeFileSync(REPO, cu, 'utf8');
    rmSync(NK, { recursive: true, force: true });
  }
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Nhật ký lượt dùng đạt hết.\n');
process.exit(hong ? 1 : 0);
