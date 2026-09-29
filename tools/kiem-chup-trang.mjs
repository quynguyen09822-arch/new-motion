#!/usr/bin/env node
/**
 * KIỂM CHỤP TRANG BẰNG TRÌNH DUYỆT THẬT — ô ② của thẻ Dựng hình.
 *
 * VÌ SAO. Đường cũ đo trang trong iframe sandbox của trình duyệt người dùng, và
 * website thật (`matbao.net`) nổ trong đó — ra trang lỗi, AI dựng thành "cảnh"
 * từ trang lỗi. Nay máy chủ mở trang bằng Chromium thật (`server/chuptrang.js`),
 * chụp cả trang + từng phần, người dùng xem rồi chọn phần mới gọi AI (28/09).
 *
 * Canh:
 *   ① chia phần đúng trên một trang mẫu biết trước đáp án (điều hướng · mở đầu ·
 *      bảng giá · chân trang), và mỗi phần có ảnh chụp riêng.
 *   ② CHẶN MẠNG NỘI BỘ ở từng yêu cầu con — không chỉ địa chỉ đầu. Trình duyệt
 *      này chạy trên máy chủ: một `<img>` trỏ 127.0.0.1 mà lọt là máy chủ đi đọc
 *      hộ mạng nội bộ.
 *   ③ đường API: chụp, lấy ảnh, cắt bản đồ theo phần.
 *   ④ giao diện: dán HTML → bấm → thấy thẻ từng phần → chọn → nút dựng mở khoá.
 *      KHÔNG gọi AI (tốn lượt); phần AI đã có `kiem-dung-sua`/`kiem-thanh-ai`.
 *
 *   node tools/kiem-chup-trang.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const TRANG = `<!doctype html><html><head><meta charset="utf-8"><title>Trang mẫu</title>
<style>body{margin:0;font-family:sans-serif} section,header,footer{padding:40px 80px}</style></head><body>
<header style="height:60px;padding:10px 80px;background:#0a1f3c;color:#fff"><nav>Mắt Bão · Sản phẩm · Giá</nav></header>
<section style="height:620px;background:#f3f4f7"><h1 style="font-size:64px">Kinh doanh online dễ dàng</h1><p>Tên miền, hosting, email.</p></section>
<section style="height:520px;background:#fff"><h2>Bảng giá hosting</h2><div>Gói A 49.000 đ/tháng</div><div>Gói B 99.000 đ/tháng</div></section>
<section style="height:400px;background:#eef"><h2>Khách hàng nói gì</h2><p>Rất tốt.</p></section>
<footer style="height:200px;background:#111;color:#aaa">© Mắt Bão</footer>
</body></html>`;

/* ---------- ① chia phần ---------- */
console.log('\n① Chụp và chia phần một trang biết trước đáp án');
const { chupTrang, layChup, banDoPhan, timChromium } = await import(path.join(M, 'server', 'chuptrang.js'));
dat('tìm thấy Chromium', Boolean(timChromium()), timChromium() || 'không có');
const kq = await chupTrang({ html: TRANG, chu: 'a@matbao.com' });
dat('chụp được', kq.ok === true, kq.cau || `${kq.phan?.length} phần, ${kq.soKhoi} khối`);
if (kq.ok) {
  const loai = kq.phan.map((p) => p.loai);
  dat('đúng năm phần theo thứ tự', loai.join(',') === 'Thanh điều hướng,Phần mở đầu,Bảng giá,Nội dung,Chân trang',
    loai.join(' · '));
  dat('tên phần lấy từ tiêu đề', kq.phan[1]?.ten === 'Kinh doanh online dễ dàng', kq.phan[1]?.ten);
  const v = layChup(kq.id, 'a@matbao.com');
  dat('mỗi phần có ảnh JPEG riêng', v.phan.every((p) => p.anh[0] === 0xff && p.anh[1] === 0xd8));
  dat('ảnh cả trang cao đúng khổ trang', kq.cao === 60 + 620 + 520 + 400 + 200 + 16 || kq.cao >= 1800, `${kq.cao}px`);
  const bp = banDoPhan(v, kq.phan[2].id);
  dat('bản đồ của phần chỉ chứa khối của phần đó, toạ độ dời về gốc phần',
    bp.banDo.khoi.some((k) => /49\.000/.test(k.chu || '')) && !bp.banDo.khoi.some((k) => /Rất tốt/.test(k.chu || ''))
      && bp.banDo.khoi.every((k) => k.y >= -2 && k.y < kq.phan[2].h),
    `${bp.banDo.khoi.length} khối`);
  dat('"Cả trang" trả nguyên bản đồ', banDoPhan(v, 'ca').banDo.khoi.length === v.banDo.khoi.length);
  dat('người khác không lấy được lượt chụp', layChup(kq.id, 'nguoi-khac@x.vn') === null);
}

/* ---------- ② mạng nội bộ ---------- */
console.log('\n② Không với vào mạng nội bộ');
{
  const u = await chupTrang({ url: 'http://127.0.0.1:7804/' });
  dat('địa chỉ trỏ 127.0.0.1 bị từ chối', u.ok !== true, (u.cau || '').slice(0, 50));
  const m = await chupTrang({ url: 'http://169.254.169.254/latest/meta-data/' });
  dat('địa chỉ siêu dữ liệu đám mây bị từ chối', m.ok !== true);
  /* Trang VÔ HẠI nhúng ảnh trỏ vào mạng nội bộ — kiểu lách cổ điển. */
  const lach = await chupTrang({ html: `<html><body><h1 style="height:300px">Xin chào thế giới</h1>
    <img src="http://127.0.0.1:7804/health" width="40" height="40"><img src="http://10.0.0.1/x.png"></body></html>` });
  dat('ảnh con trỏ vào mạng nội bộ bị chặn ở từng yêu cầu', lach.ok === true && lach.biChan >= 2,
    `chặn ${lach.biChan} yêu cầu`);
}

/* ---------- ⑤ soát cảnh AI dựng ---------- */
console.log('\n⑤ Cảnh AI dựng phải xem được trong video');
{
  /* ĐÚNG cảnh hỏng đã gặp 28/09 (rút gọn): nhân toạ độ theo 0,5, chữ 20/9, máy
     quay phóng 1,4 vào giữa, hai cụm "giua" + "duoi" chồng nhau. */
  const HONG = { id: 'x', duration: 5, camera: { x: 0, y: 0, scale: 1.4 }, elements: [
    { kind: 'panel', id: 'nen', x: 0, y: 0, place: 'day', fill: '#eef2f6' },
    { kind: 'text', id: 'tieu-de', x: 30, y: 50, w: 660, size: 20, text: 'Kinh doanh online, đến ngay Mắt Bão' },
    { kind: 'text', id: 'phu', x: 30, y: 82, w: 660, size: 9, text: 'Sở hữu tên miền bạn mong muốn' },
    { kind: 'group', id: 'g1', x: 0, y: 0, place: 'giua', dir: 'doc', children: [
      { kind: 'nut', id: 'nut', x: 0, y: 0, label: 'Tìm tên miền' }] },
    { kind: 'group', id: 'g2', x: 0, y: 0, place: 'duoi', dir: 'doc', children: [
      { kind: 'card', id: 'the', x: 0, y: 0, title: 'Đánh giá 4.9' }] },
  ] };
  const META = { width: 720, height: 1280, bg: '#f3f4f7', ink: '#161f3c', accent: '#2f6bff' };
  const { soatVideo } = await import(path.join(M, 'server', 'soatvideo.js'));
  const bao = soatVideo(HONG, META).join(' | ');
  dat('bắt chữ quá nhỏ', /Chữ quá nhỏ/.test(bao) && /tieu-de \(20\)/.test(bao));
  dat('bắt tiêu đề không đủ to', /Chữ lớn nhất chỉ cỡ 20/.test(bao));
  dat('bắt món nằm ngoài vùng máy quay thấy', /nằm ngoài vùng/.test(bao) && /tieu-de/.test(bao));
  dat('bắt hai cụm ngoài cùng tự đặt vùng riêng', /g1:giua, g2:duoi/.test(bao));
  const TOT = { id: 'y', duration: 5, camera: { x: 0, y: 0, scale: 1 }, elements: [
    { kind: 'panel', id: 'nen', x: 0, y: 0, place: 'day', fill: '#eef2f6' },
    { kind: 'group', id: 'g', x: 0, y: 0, place: 'giua', dir: 'doc', children: [
      { kind: 'text', id: 't', x: 0, y: 0, w: 600, size: 64, text: 'Kinh doanh online' },
      { kind: 'text', id: 'p', x: 0, y: 0, w: 600, size: 28, text: 'Tên miền, hosting' }] }] };
  dat('cảnh ổn thì không báo gì', soatVideo(TOT, META).length === 0, soatVideo(TOT, META).join(' | '));

  const { danhGia, doCanh } = await import(path.join(M, 'server', 'docanh.js'));
  dat('đo: món thò ra ngoài khung thì báo cắt',
    /BỊ CẮT/.test(danhGia([{ id: 'a', chu: 'x', x: -0.1, y: 0.1, w: 0.5, h: 0.1 }]).join()));
  dat('đo: hai món chữ chồng nhau thì báo đè', /ĐÈ LÊN NHAU/.test(danhGia([
    { id: 'a', chu: 'x', x: 0.1, y: 0.1, w: 0.5, h: 0.1 }, { id: 'b', chu: 'y', x: 0.2, y: 0.12, w: 0.5, h: 0.1 }]).join()));
  dat('đo: hai món cạnh nhau không chạm thì im', danhGia([
    { id: 'a', chu: 'x', x: 0.1, y: 0.1, w: 0.3, h: 0.1 }, { id: 'b', chu: 'y', x: 0.5, y: 0.1, w: 0.3, h: 0.1 }]).length === 0);
  /* VẼ THẬT bằng bộ dựng của máy chủ đang chạy — tiêu đề y=50 dưới máy quay 1,4
     phải bị báo cắt; cảnh tốt thì im. */
  const thatHong = await doCanh({ goc: GOC, meta: META, canh: HONG, email: '' });
  dat('vẽ thật cảnh hỏng → báo bị cắt', thatHong.some((c) => /BỊ CẮT/.test(c) && /tieu-de/.test(c)),
    thatHong.join(' | ').slice(0, 120) || 'không báo gì');
  const thatTot = await doCanh({ goc: GOC, meta: META, canh: TOT, email: '' });
  dat('vẽ thật cảnh tốt → im', thatTot.length === 0, thatTot.join(' | ').slice(0, 120));
}

/* ---------- ③ + ④ qua máy chủ và giao diện ---------- */
console.log('\n③ Đường API');
const r = await fetch(`${GOC}/api/chup-trang`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html: TRANG }) }).then((x) => x.json());
dat('POST /api/chup-trang trả danh sách phần', r.ok === true && r.phan?.length >= 4, r.cau || r.loi || `${r.phan?.length} phần`);
if (r.ok) {
  const a = await fetch(`${GOC}/api/chup-trang/${r.id}/phan/${r.phan[0].id}`);
  dat('lấy được ảnh một phần', a.status === 200 && a.headers.get('content-type') === 'image/jpeg');
  const b = await fetch(`${GOC}/api/chup-trang/${'0'.repeat(24)}/anh`);
  dat('mã lạ thì 404', b.status === 404);
}
const f = await fetch(`${GOC}/api/chup-trang`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'file:///etc/passwd' }) });
dat('địa chỉ file: bị từ chối', f.status === 400);

console.log('\n④ Giao diện: dán → chụp → chọn phần');
const trinh = await chromium.launch();
try {
  const tr = await trinh.newPage({ viewport: { width: 1500, height: 980 } });
  const loiJS = [];
  tr.on('pageerror', (e) => loiJS.push(String(e)));
  await tr.goto(`${GOC}/sua?clip=cta`, { waitUntil: 'load' });
  await tr.waitForTimeout(3000);
  await tr.click('.nut-ai');
  await tr.waitForTimeout(400);
  await tr.evaluate(() => [...document.querySelectorAll('.ai-the')].find((x) => x.textContent === 'Dựng hình')?.click());
  await tr.waitForTimeout(400);
  await tr.fill('.o-dung-html', TRANG);
  dat('nút nói rõ sẽ CHỤP trước, chưa gọi AI',
    await tr.evaluate(() => document.querySelector('.nut-dung').textContent) === 'Chụp trang để xem trước');
  await tr.click('.nut-dung');
  await tr.waitForSelector('.chup-phan', { timeout: 60_000 }).catch(() => {});
  const the = await tr.evaluate(() => [...document.querySelectorAll('.chup-phan b')].map((b) => b.textContent));
  dat('hiện thẻ "Cả trang" + từng phần', the[0] === 'Cả trang' && the.length >= 5, the.join(' · '));
  dat('ảnh từng phần tải được', await tr.evaluate(async () => {
    const imgs = [...document.querySelectorAll('.chup-phan img')];
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
    return imgs.length > 0 && imgs.every((i) => i.naturalWidth > 0);
  }));
  const nut = () => tr.evaluate(() => [...document.querySelectorAll('.dung-kq .nut.chinh')].map((b) => [b.textContent, b.disabled])[0]);
  dat('chưa chọn phần thì nút dựng bị khoá', (await nut())?.[1] === true, (await nut())?.[0]);
  await tr.click('.chup-phan >> nth=3');
  await tr.waitForTimeout(200);
  dat('chọn một phần thì nút dựng mở', (await nut())?.[1] === false, (await nut())?.[0]);
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await tr.close();
} finally {
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Chụp trang đạt hết.\n');
process.exit(hong ? 1 : 0);
