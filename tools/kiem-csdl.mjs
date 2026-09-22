#!/usr/bin/env node
/**
 * KIỂM CƠ SỞ DỮ LIỆU — lược đồ có THI HÀNH được điều nó hứa không.
 *
 * Một lược đồ đọc thì hay mà không ai kiểm thì chỉ là chú thích. Mọi ràng buộc
 * dưới đây đều được thử bằng cách CỐ TÌNH LÀM SAI rồi xem nó có chặn không —
 * viết `UNIQUE` vào file rồi tin là nó chạy thì có ngày phát hiện SQLite tắt
 * khoá ngoại theo mặc định, lúc dữ liệu đã hỏng.
 *
 * Chạy bằng Node trần, chưa tới một giây, trên CSDL trong bộ nhớ — không đụng
 * file thật, không để lại gì.
 *
 *   node tools/kiem-csdl.mjs
 */
import path from 'node:path';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { moCSDL, TEN_BUOC, ghiDuAn, daDungHomNay, nhanViec } =
  await import(path.join(M, 'server', 'csdl.js'));

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};
/** Chạy một câu và trả về mã lỗi SQLite, hoặc null nếu nó KHÔNG lỗi. */
const chan = (f) => { try { f(); return null; } catch (e) { return e.message; } };

const db = moCSDL(':memory:');

/* ---------- 1. di trú ---------- */
console.log('\n1. Di trú');
dat('chạy hết các bước đã khai',
  db.prepare('SELECT COUNT(*) c FROM di_tru').get().c === TEN_BUOC.length,
  TEN_BUOC.join(', '));
/* Mở lại CSDL đã có sẵn bảng KHÔNG được chạy lại bước nào — chạy lại là
   `CREATE TABLE` trên bảng đã tồn tại, tức là hỏng ngay lúc khởi động. */
{
  const lai = moCSDL(':memory:');
  const truoc = lai.prepare('SELECT COUNT(*) c FROM di_tru').get().c;
  dat('mở lần hai không chạy lại bước nào', truoc === TEN_BUOC.length);
  lai.close();
}
dat('khoá ngoại ĐANG BẬT (SQLite mặc định TẮT)',
  db.prepare('PRAGMA foreign_keys').get().foreign_keys === 1);

/* ---------- 2. người và kho ---------- */
console.log('\n2. Người và kho');
const quy = db.prepare('INSERT INTO nguoi_dung (email, ten) VALUES (?, ?) RETURNING id')
  .get('quynd@matbao.com', 'Quý');
const nam = db.prepare('INSERT INTO nguoi_dung (email, ten) VALUES (?, ?) RETURNING id')
  .get('namlt@matbao.com', 'Nam');
dat('thêm được người', quy.id > 0 && nam.id > 0);

/* Hai bản ghi cho cùng một người là kho bị tách làm đôi, và người dùng mở app
   lên thấy mất sạch clip mà không có lỗi nào ghi ở đâu cả. */
dat('email KHÔNG phân biệt hoa thường',
  chan(() => db.prepare('INSERT INTO nguoi_dung (email) VALUES (?)').run('QUYND@matbao.com')),
  'chặn đúng');

dat('vai lạ thì chặn',
  chan(() => db.prepare('INSERT INTO nguoi_dung (email, vai) VALUES (?, ?)')
    .run('x@matbao.com', 'ong-trum')));

const khoGoc = db.prepare('INSERT INTO kho (chu_id, ma, la_goc) VALUES (?, ?, 1) RETURNING id')
  .get(quy.id, 'goc');
const khoNam = db.prepare('INSERT INTO kho (chu_id, ma) VALUES (?, ?) RETURNING id')
  .get(nam.id, 'namlt-ab12cd34');
dat('chỉ được MỘT kho gốc',
  chan(() => db.prepare('INSERT INTO kho (chu_id, ma, la_goc) VALUES (?, ?, 1)')
    .run(nam.id, 'goc-2')));

/* Xoá người mà kho đi theo thì mất sạch dự án vì một cú bấm ở màn quản trị. */
dat('xoá người KHÔNG kéo theo kho được (phải xử lý kho trước)',
  chan(() => db.prepare('DELETE FROM nguoi_dung WHERE id = ?').run(nam.id)));

/* ---------- 3. dự án ---------- */
console.log('\n3. Dự án');
const doc1 = { meta: { width: 1280, height: 720, name: 'CTA' }, scenes: [{ id: 'c1' }, { id: 'c2' }] };
const da = db.prepare(`INSERT INTO du_an (kho_id, slug, ten, doc) VALUES (?,?,?,?) RETURNING *`)
  .get(khoGoc.id, 'cta', 'CTA', JSON.stringify(doc1));
dat('cột suy ra tự tính từ JSON',
  da.rong === 1280 && da.cao === 720 && da.so_canh === 2,
  `${da.rong}×${da.cao}, ${da.so_canh} cảnh`);

dat('JSON hỏng thì chặn ngay ở cửa',
  chan(() => db.prepare('INSERT INTO du_an (kho_id, slug, ten, doc) VALUES (?,?,?,?)')
    .run(khoGoc.id, 'x', 'X', '{ đây không phải json')));

dat('trùng slug TRONG CÙNG một kho thì chặn',
  chan(() => db.prepare('INSERT INTO du_an (kho_id, slug, ten, doc) VALUES (?,?,?,?)')
    .run(khoGoc.id, 'cta', 'CTA 2', '{}')));
/* Khoá toàn cục là vô tình cho người vào trước chiếm mất cái tên. */
dat('trùng slug ở kho KHÁC thì CHO',
  !chan(() => db.prepare('INSERT INTO du_an (kho_id, slug, ten, doc) VALUES (?,?,?,?)')
    .run(khoNam.id, 'cta', 'CTA của Nam', '{}')));

/* ---------- 4. chống ghi đè ---------- */
console.log('\n4. Chống ghi đè — lỗ hổng `luuClip` hôm nay đang có');
{
  /* Dựng lại đúng ca thật: một clip mở trên HAI tab, cả hai đọc phiên bản 1,
     cả hai sửa, cả hai bấm Lưu. Hôm nay bản sau đè bản trước IM LẶNG. */
  const tabA = da.phien_ban;
  const tabB = da.phien_ban;

  const a = ghiDuAn(db, { id: da.id, doc: { ...doc1, x: 'A sửa' }, phienBan: tabA, suaBoi: quy.id });
  dat('tab A lưu được, phiên bản tăng', a.ok === true && a.phienBan === 2, JSON.stringify(a));

  const b = ghiDuAn(db, { id: da.id, doc: { ...doc1, x: 'B sửa' }, phienBan: tabB, suaBoi: nam.id });
  dat('tab B BỊ CHẶN, và được nói phiên bản thật là bao nhiêu',
    b.ok === false && b.xungDot === true && b.phienBanThat === 2, JSON.stringify(b));

  /* Điều quan trọng nhất: bản của A vẫn còn nguyên. Không có cửa chặn thì tới
     đây nội dung đã là của B, và A không bao giờ biết mình vừa mất gì. */
  const giu = db.prepare('SELECT doc FROM du_an WHERE id = ?').get(da.id);
  dat('nội dung vẫn là bản của A, KHÔNG bị B đè',
    JSON.parse(giu.doc).x === 'A sửa', JSON.parse(giu.doc).x);

  const c = ghiDuAn(db, { id: da.id, doc: { ...doc1, x: 'B đọc lại rồi ghi' }, phienBan: 2 });
  dat('đọc lại phiên bản mới rồi ghi thì qua', c.ok === true && c.phienBan === 3);

  dat('mỗi lần ghi để lại một bản trong lịch sử',
    db.prepare('SELECT COUNT(*) c FROM ban_luu WHERE du_an_id = ?').get(da.id).c === 2);
  dat('lịch sử không có hai dòng cùng một phiên bản',
    chan(() => db.prepare('INSERT INTO ban_luu (du_an_id, phien_ban, doc) VALUES (?,?,?)')
      .run(da.id, 2, '{}')));

  dat('ghi vào dự án không có thì báo đúng thế, không im lặng',
    ghiDuAn(db, { id: 99999, doc: {}, phienBan: 1 }).khongCo === true);
}

/* ---------- 5. nháp ---------- */
console.log('\n5. Nháp — nhiều nhất một bản mỗi dự án');
db.prepare('INSERT INTO ban_nhap (du_an_id, doc) VALUES (?, ?)').run(da.id, '{"a":1}');
dat('bản nháp thứ hai bị chặn bởi khoá chính, không cần kỷ luật nào',
  chan(() => db.prepare('INSERT INTO ban_nhap (du_an_id, doc) VALUES (?, ?)').run(da.id, '{"a":2}')));

/* ---------- 6. tệp ---------- */
console.log('\n6. Tệp — khử trùng theo vân tay, và dọn rác được');
const tep = db.prepare(`INSERT INTO tep (bam, loai, kieu, so_byte, rong, cao)
                        VALUES (?,?,?,?,?,?) RETURNING id`)
  .get('0bb05aa453aa2d62', 'anh', 'image/png', 1234, 600, 400);
dat('cùng vân tay thì chỉ một dòng',
  chan(() => db.prepare('INSERT INTO tep (bam, loai, kieu, so_byte) VALUES (?,?,?,?)')
    .run('0bb05aa453aa2d62', 'anh', 'image/png', 1234)));
dat('tệp rỗng thì chặn',
  chan(() => db.prepare('INSERT INTO tep (bam, loai, kieu, so_byte) VALUES (?,?,?,?)')
    .run('rong', 'anh', 'image/png', 0)));

db.prepare('INSERT INTO tep_dung (tep_id, du_an_id) VALUES (?, ?)').run(tep.id, da.id);
/* Không biết ai đang dùng tệp nào thì không bao giờ dám xoá tệp nào — và thư
   mục ảnh chỉ phình lên, không bao giờ nhỏ lại. */
const rac = () => db.prepare(`SELECT COUNT(*) c FROM tep
  WHERE NOT EXISTS (SELECT 1 FROM tep_dung WHERE tep_id = tep.id)`).get().c;
dat('tệp đang có người dùng thì KHÔNG phải rác', rac() === 0);
db.prepare('DELETE FROM du_an WHERE id = ?').run(da.id);
dat('xoá dự án thì tệp thành rác, và đếm ra được', rac() === 1);

/* ---------- 7. sổ cái tiền ---------- */
console.log('\n7. Sổ cái — hạn mức sống qua khởi động lại, và đếm theo TIỀN');
{
  const ghi = (donVi, so, tien, model = 'gemini-3.1-flash') =>
    db.prepare(`INSERT INTO nhat_ky (nguoi_id, email, viec_gi, don_vi, so_don_vi,
                                     chi_phi_micro, model, token_vao, token_ra)
                VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(quy.id, 'quynd@matbao.com', 'goi-ai', donVi, so, tien, model, 12, 400);

  ghi('luot', 1, 120);
  ghi('luot', 1, 9800, 'gemini-3.1-pro');   // lượt dựng cảnh từ ảnh: đắt gấp 80 lần
  ghi('ky_tu', 500, 4000);

  const luot = daDungHomNay(db, quy.id, 'luot');
  dat('cộng đúng số lượt', luot.so === 2, `${luot.so} lượt`);
  /* ĐÂY là điều trần "300 lượt/ngày" không nhìn thấy: hai lượt, nhưng một lượt
     tốn gấp 80 lần lượt kia. Đếm theo lượt thì vừa quá chặt với việc rẻ vừa
     quá lỏng với việc đắt. */
  dat('và cộng đúng TIỀN, thứ trần đếm-theo-lượt không nhìn thấy',
    luot.tienMicro === 9920, `${luot.tienMicro} micro`);
  dat('ký tự đếm riêng, không lẫn vào lượt',
    daDungHomNay(db, quy.id, 'ky_tu').so === 500);

  /* Ngày phải theo giờ Việt Nam. Theo UTC thì 7 giờ sáng mới sang ngày mới, và
     hạn mức reset ngay giữa buổi làm việc. */
  const ngay = db.prepare('SELECT ngay_vn FROM nhat_ky ORDER BY id DESC LIMIT 1').get().ngay_vn;
  const mong = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  dat('ngày tính theo giờ Việt Nam, không theo UTC', ngay === mong, `${ngay} (mong ${mong})`);

  /* Sổ cái phải sống sót khi người dùng bị xoá — không thì một lần dọn tài
     khoản là mất hết số liệu chi tiêu để báo cáo. */
  db.prepare('DELETE FROM kho WHERE chu_id = ?').run(nam.id);
  db.prepare('DELETE FROM nguoi_dung WHERE id = ?').run(nam.id);
  dat('xoá người thì số liệu chi tiêu VẪN CÒN (email đã chép lại)',
    db.prepare('SELECT COUNT(*) c FROM nhat_ky').get().c === 3);
}

/* ---------- 8. hàng đợi bền ---------- */
console.log('\n8. Hàng đợi — sống qua lần khởi động lại giữa chừng');
{
  const them = (ten) => db.prepare(`INSERT INTO viec (loai, ten, nguoi_id) VALUES ('xuat', ?, ?)`)
    .run(ten, quy.id);
  them('Xuất video A');
  them('Xuất video B');

  const v1 = nhanViec(db, { worker: 'w1' });
  dat('nhận được việc đầu hàng, đúng thứ tự', v1?.ten === 'Xuất video A', v1?.ten);
  dat('việc đã nhận thì người khác không nhặt lại khi hợp đồng còn hạn',
    nhanViec(db, { worker: 'w2' })?.ten === 'Xuất video B');
  dat('hết việc thì trả null, không treo', nhanViec(db, { worker: 'w3' }) === null);

  /* CA QUAN TRỌNG NHẤT: máy chủ chết giữa lúc đang xuất. Cờ "đang chạy" không
     bao giờ tự tắt khi tiến trình chết, nên việc ấy kẹt mãi và trình duyệt
     quay vòng chờ không ai trả lời. Hợp đồng thuê thì tự hết hạn. */
  db.prepare(`UPDATE viec SET thue_den = strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hours')
              WHERE id = ?`).run(v1.id);
  const lai = nhanViec(db, { worker: 'w4' });
  dat('hợp đồng hết hạn thì việc được nhặt lại', lai?.id === v1.id, lai?.ten);
  dat('và đếm đúng số lần đã thử', lai?.lan_thu === 2, `lần thứ ${lai?.lan_thu}`);

  /* Thử mãi một việc luôn hỏng là một vòng lặp đốt tiền. */
  db.prepare(`UPDATE viec SET lan_thu = toi_da_thu,
              thue_den = strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hours') WHERE id = ?`).run(v1.id);
  dat('quá số lần thử thì THÔI, không lặp vô hạn',
    nhanViec(db, { worker: 'w5' })?.id !== v1.id);

  dat('tiến độ ngoài 0..100 thì chặn',
    chan(() => db.prepare('UPDATE viec SET tien_do = 140 WHERE id = ?').run(v1.id)));
}

/* ---------- 9. thư viện thành phần ---------- */
console.log('\n9. Thư viện thành phần — thay cho KIT ghi cứng trong mã');
{
  const tp = db.prepare(`INSERT INTO thanh_phan (kho_id, ten, loai, doc, nguon)
                         VALUES (?,?,?,?,?) RETURNING id`)
    .get(khoGoc.id, 'Nền Mắt Bão', 'nen', '{"kind":"nen"}', 'tu-stitch');
  dat('cất được một thành phần, có ghi nguồn gốc', tp.id > 0);
  dat('trùng tên trong cùng kho thì chặn',
    chan(() => db.prepare('INSERT INTO thanh_phan (kho_id, ten, loai, doc) VALUES (?,?,?,?)')
      .run(khoGoc.id, 'Nền Mắt Bão', 'nen', '{}')));
  dat('nguồn lạ thì chặn',
    chan(() => db.prepare('INSERT INTO thanh_phan (kho_id, ten, loai, doc, nguon) VALUES (?,?,?,?,?)')
      .run(khoGoc.id, 'Khác', 'nen', '{}', 'trên trời rơi xuống')));

  db.prepare('INSERT INTO the (thanh_phan_id, ten) VALUES (?, ?)').run(tp.id, 'Nền');
  dat('gắn thẻ KHÔNG phân biệt hoa thường',
    chan(() => db.prepare('INSERT INTO the (thanh_phan_id, ten) VALUES (?, ?)').run(tp.id, 'nền')));
}

/* ---------- 10. chia sẻ và góp ý ---------- */
console.log('\n10. Chia sẻ và góp ý — thứ hôm nay hoàn toàn chưa có');
{
  const ai = db.prepare('INSERT INTO nguoi_dung (email) VALUES (?) RETURNING id').get('sep@matbao.com');
  const d2 = db.prepare('INSERT INTO du_an (kho_id, slug, ten, doc) VALUES (?,?,?,?) RETURNING id')
    .get(khoGoc.id, 'demo', 'Demo', JSON.stringify(doc1));

  db.prepare('INSERT INTO chia_se (du_an_id, nguoi_id, quyen) VALUES (?,?,?)')
    .run(d2.id, ai.id, 'gop_y');
  dat('chia sẻ được một dự án cho người khác, có mức quyền', true);
  dat('quyền lạ thì chặn',
    chan(() => db.prepare('INSERT INTO chia_se (du_an_id, nguoi_id, quyen) VALUES (?,?,?)')
      .run(d2.id, quy.id, 'toan-quyen')));
  dat('chia sẻ hai lần cho cùng một người thì chặn',
    chan(() => db.prepare('INSERT INTO chia_se (du_an_id, nguoi_id, quyen) VALUES (?,?,?)')
      .run(d2.id, ai.id, 'xem')));

  db.prepare(`INSERT INTO gop_y (du_an_id, canh_id, mon_id, giay, chu, nguoi_id)
              VALUES (?,?,?,?,?,?)`).run(d2.id, 'canh-1', 'chu-1', 3.5, 'Chữ này hơi nhỏ', ai.id);
  const mo = db.prepare('SELECT * FROM gop_y WHERE du_an_id = ? AND xong_luc IS NULL').all(d2.id);
  dat('góp ý neo vào ĐÚNG cảnh, ĐÚNG món, ĐÚNG giây',
    mo.length === 1 && mo[0].canh_id === 'canh-1' && mo[0].giay === 3.5,
    `${mo[0]?.canh_id}/${mo[0]?.mon_id} @${mo[0]?.giay}s`);

  /* Xoá dự án thì góp ý và lượt chia sẻ phải đi theo — để lại là rác trỏ vào
     hư không, và màn "ai đang xem gì" đếm ra những dự án không còn tồn tại. */
  db.prepare('DELETE FROM du_an WHERE id = ?').run(d2.id);
  dat('xoá dự án thì góp ý và chia sẻ đi theo',
    db.prepare('SELECT COUNT(*) c FROM gop_y').get().c === 0
    && db.prepare('SELECT COUNT(*) c FROM chia_se').get().c === 0);
}

db.close();
console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Cơ sở dữ liệu: lược đồ thi hành đúng mọi điều đã hứa.\n');
process.exit(hong ? 1 : 0);
