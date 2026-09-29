#!/usr/bin/env node
/**
 * KIỂM TRÌNH NÓI CHUYỆN VỚI POSTGRES (`server/pg.js`).
 *
 * VÌ SAO TỰ VIẾT TRÌNH NÀY. Anh Quý gắn một Postgres vào dự án trên Vibe Host
 * (29/09) và muốn đẩy dữ liệu cần giữ lên đó. Repo này cố ý không có gói phụ
 * thuộc nào (CLAUDE.md §2), mà Node thì không có sẵn trình nói chuyện với
 * Postgres — nên phải viết lấy phần mình cần.
 *
 * VÌ SAO BÀI KIỂM NÀY GẮT. Một trình CSDL viết tay là chỗ lỗi tinh vi ăn mất dữ
 * liệu mà không kêu. Bài này chạy với MỘT POSTGRES THẬT (tự dựng bằng Docker),
 * không giả lập: giả lập chỉ chứng minh mã khớp với hiểu biết của người viết,
 * mà chỗ sai lại nằm đúng ở hiểu biết ấy.
 *
 *   ① Nối được, đăng nhập SCRAM-SHA-256, hỏi được.
 *   ② THAM SỐ LÀ THAM SỐ: chuỗi `'; drop table … --` chỉ là chữ, không thành lệnh.
 *   ③ Tiếng Việt có dấu đi về nguyên vẹn (UTF-8, không rớt dấu).
 *   ④ NULL khác chuỗi rỗng.
 *   ⑤ Sai mật khẩu → báo rõ, không treo.
 *   ⑥ Máy chủ không có ở đó → báo rõ trong vài giây, KHÔNG treo vô hạn.
 *   ⑦ Gói tin về trước khi có người chờ vẫn không mất (bẫy đã dính 29/09).
 *
 *   node tools/kiem-pg.mjs
 */
import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TEN = 'motion-kiem-pg';
const CONG = Number(process.env.CONG_PG || 55433);
const MK = 'mat-khau-kiem-2026';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const co = (lenh) => { try { execSync(lenh, { stdio: 'ignore' }); return true; } catch { return false; } };
if (!co('docker info')) {
  /* KHÔNG im lặng cho qua. Bỏ qua mà không nói thì một hôm nào đó cả bài này
     ngừng chạy và không ai biết. */
  console.log('\n⚠ Không có Docker ở máy này nên KHÔNG dựng được Postgres để kiểm.');
  console.log('  Bài này bỏ qua — nhưng `server/pg.js` thì CHƯA được kiểm lần chạy này.\n');
  process.exit(0);
}

console.log('\nDựng một Postgres thật để kiểm…');
try { execFileSync('docker', ['rm', '-f', TEN], { stdio: 'ignore' }); } catch { /* chưa có */ }
execFileSync('docker', ['run', '-d', '--name', TEN, '-p', `${CONG}:5432`,
  '-e', `POSTGRES_PASSWORD=${MK}`, '-e', 'POSTGRES_DB=motion_kiem',
  'postgres:16-alpine'], { stdio: 'ignore' });
const don = () => { try { execFileSync('docker', ['rm', '-f', TEN], { stdio: 'ignore' }); } catch { /* kệ */ } };
process.on('exit', don);
process.on('uncaughtException', (e) => { don(); console.error(e); process.exit(1); });

let san = false;
for (let i = 0; i < 40; i++) {
  try { execFileSync('docker', ['exec', TEN, 'pg_isready', '-q'], { stdio: 'ignore' }); san = true; break; }
  catch { await new Promise((r) => setTimeout(r, 1000)); }
}
if (!san) { console.error('❌ Postgres không lên kịp.'); don(); process.exit(1); }

const { docDiaChi, moKetNoi, voiCSDL } = await import(path.join(M, 'server', 'pg.js'));
const U = `postgres://postgres:${MK}@127.0.0.1:${CONG}/motion_kiem`;

try {
  console.log('\n① Nối, đăng nhập, hỏi');
  const dc = docDiaChi(U);
  dat('đọc đúng địa chỉ', dc.host === '127.0.0.1' && dc.port === CONG && dc.ten === 'motion_kiem');
  await voiCSDL(U, async (db) => {
    const r = await db.hoi('select 1 as mot');
    dat('hỏi được câu đầu tiên', r.dong[0]?.mot === '1', JSON.stringify(r.dong[0]));
    dat('đọc được phiên bản máy chủ',
      /PostgreSQL/.test((await db.hoi('select version() as v')).dong[0]?.v || ''));

    await db.hoi('create table thu (id serial primary key, ten text, so int, ghi text)');

    console.log('\n② Tham số là tham số, không phải mảnh SQL');
    const doc = "'; drop table thu; --";
    await db.hoi('insert into thu (ten, so) values ($1, $2)', [doc, 1]);
    const con = await db.hoi("select count(*)::int as n from information_schema.tables where table_name = 'thu'");
    dat('bảng KHÔNG bị xoá bởi chuỗi độc hại', con.dong[0]?.n === '1');
    dat('và chuỗi ấy được cất nguyên văn',
      (await db.hoi('select ten from thu where so = $1', [1])).dong[0]?.ten === doc);

    console.log('\n③ Tiếng Việt có dấu');
    const chu = 'Nguyễn Duy Quý — dự án “Mắt Bão” ⚡ 100%';
    await db.hoi('insert into thu (ten, so) values ($1, $2)', [chu, 2]);
    dat('đi về nguyên vẹn từng dấu',
      (await db.hoi('select ten from thu where so = $1', [2])).dong[0]?.ten === chu);

    console.log('\n④ NULL khác chuỗi rỗng');
    await db.hoi('insert into thu (ten, so, ghi) values ($1, $2, $3)', ['a', 3, null]);
    await db.hoi('insert into thu (ten, so, ghi) values ($1, $2, $3)', ['b', 4, '']);
    dat('NULL đọc ra là null', (await db.hoi('select ghi from thu where so = $1', [3])).dong[0]?.ghi === null);
    dat('chuỗi rỗng đọc ra là chuỗi rỗng',
      (await db.hoi('select ghi from thu where so = $1', [4])).dong[0]?.ghi === '');

    console.log('\n⑦ Nhiều câu hỏi liên tiếp không lạc gói tin');
    /* Bẫy đã dính 29/09: bản đầu chỉ xếp hàng người-ĐỢI, gói tin về trước khi
       có ai chờ thì bị vứt — cả kết nối treo tới lúc hết giờ. */
    const nhieu = [];
    for (let i = 0; i < 25; i++) nhieu.push((await db.hoi('select $1::int as i', [i])).dong[0]?.i);
    dat('25 câu liên tiếp trả về đúng thứ tự', nhieu.join(',') === [...Array(25).keys()].join(','));
    const songSong = await Promise.all([1, 2, 3].map((i) => db.hoi('select $1::int as i', [i])));
    dat('gọi chồng nhau vẫn ra đúng số', songSong.map((x) => x.dong[0]?.i).join(',') === '1,2,3');

    await db.hoi('drop table thu');
  });

  console.log('\n⑤⑥ Hỏng thì báo rõ, không treo');
  const bat = async (u, y) => { try { await voiCSDL(u, async (db) => db.hoi('select 1'), y); return null; }
    catch (e) { return e.message; } };
  const saiMk = await bat(`postgres://postgres:sai-mat-khau@127.0.0.1:${CONG}/motion_kiem`);
  dat('sai mật khẩu → báo rõ', Boolean(saiMk) && /mật khẩu|password|từ chối/i.test(saiMk), saiMk?.slice(0, 60));
  const t = Date.now();
  const khongCo = await bat('postgres://postgres:x@127.0.0.1:1/khong_co', { hanMs: 4000 });
  dat('không có máy chủ → báo trong vài giây, không treo',
    Boolean(khongCo) && Date.now() - t < 8000, `${((Date.now() - t) / 1000).toFixed(1)}s · ${khongCo?.slice(0, 40)}`);
  const saiTen = await bat(`postgres://postgres:${MK}@127.0.0.1:${CONG}/khong_co_csdl_nay`);
  dat('CSDL không tồn tại → báo rõ', /không tồn tại|does not exist|từ chối/i.test(saiTen || ''), saiTen?.slice(0, 60));
} finally {
  don();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Nói chuyện với Postgres đạt hết.\n');
process.exit(hong ? 1 : 0);
