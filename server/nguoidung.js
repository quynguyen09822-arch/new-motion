/**
 * TÀI KHOẢN NGƯỜI DÙNG — cất trong CSDL, không cất trong biến môi trường.
 *
 * VÌ SAO ĐỔI. Cách cũ: `MOTION_TAI_KHOAN` khai danh sách email, và MỘT mật khẩu
 * chung cho tất cả. Hai hậu quả mà anh Quý đụng phải ngày 28/09:
 *
 *   · Muốn cho một khách hàng vào dùng thì phải sửa biến môi trường trên Vibe
 *     Host rồi triển khai lại — người dùng của công cụ này không làm được, nên
 *     thực tế là KHÔNG thêm được ai.
 *   · Mật khẩu chung nghĩa là khách hàng gõ email của chủ kho cũng vào được, và
 *     nhìn thấy — sửa được — toàn bộ clip của chủ. Không mất dữ liệu lần này,
 *     nhưng đó là cánh cửa mở sẵn.
 *
 * NAY: mỗi người một dòng trong bảng `nguoi_dung`, MỖI NGƯỜI MỘT MẬT KHẨU riêng
 * (băm scrypt, cùng khuôn với `dangnhap.js`). Chủ kho thêm/khoá/xoá khách ngay
 * trong app.
 *
 * KHÔNG KHOÁ AI RA NGOÀI — luật cũ của `dangnhap.js`, giữ nguyên:
 *
 *   · Bảng còn TRỐNG thì đăng nhập chạy y hệt trước (danh sách env + mật khẩu
 *     chung). Bài kiểm và máy chạy thử rơi vào nhánh này, không phải sửa gì.
 *   · Lần khởi động đầu có mật khẩu, ta CHÉP nguyên danh sách env vào bảng, ai
 *     cũng giữ đúng mật khẩu chung đang dùng — không ai bị đá ra, không ai được
 *     thêm quyền. Chủ kho thành `quan_tri`.
 *   · Có người trong bảng rồi thì BẢNG quyết định ai vào được; env chỉ còn là
 *     đường lùi khi bảng trống.
 *
 * XOÁ NGƯỜI KHÔNG XOÁ KHO CỦA HỌ. `kho/<mã>/` nằm nguyên đó. Xoá nhầm một khách
 * rồi mất luôn clip của họ là kiểu hỏng không lấy lại được; thêm lại đúng email
 * là thấy lại kho cũ.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { bam, dsTaiKhoan, duoiEmail, layCauHinh } from './dangnhap.js';

/** Mật khẩu ngắn thì khoá nào cũng vô nghĩa. */
export const DAI_TOI_THIEU = 8;

const chuan = (e) => String(e || '').trim().toLowerCase();

/** So mật khẩu với chuỗi băm `scrypt$muối$hex`. Dùng chung khuôn với `dangnhap.js`. */
export function khopBam(mk, luu) {
  if (!String(luu || '').startsWith('scrypt$')) return false;
  const [, muoi, dung] = luu.split('$');
  if (!muoi || !dung) return false;
  const thu = scryptSync(String(mk || ''), muoi, 32);
  const chuanBuf = Buffer.from(dung, 'hex');
  return chuanBuf.length === thu.length && timingSafeEqual(thu, chuanBuf);
}

/** Mật khẩu sinh sẵn cho khách mới — đọc được qua điện thoại, không nhầm 0 với O. */
export function matKhauNgau() {
  const chu = 'abcdefghijkmnpqrstuvwxyz23456789';
  const b = randomBytes(12);
  return Array.from(b, (n) => chu[n % chu.length]).join('').replace(/^(.{4})(.{4})/, '$1-$2-');
}

/** Có ai trong bảng chưa. */
export const coNguoi = (db) => db.prepare('SELECT COUNT(*) c FROM nguoi_dung').get().c > 0;

/**
 * CHÉP DANH SÁCH CŨ VÀO BẢNG — chạy một lần, lúc khởi động.
 *
 * Chỉ chép khi bảng đang trống VÀ đã đặt mật khẩu chung: chưa đặt mật khẩu thì
 * app đang chạy kiểu "không ai phải đăng nhập", dựng sẵn tài khoản lúc đó là
 * bịa ra một lớp khoá không ai yêu cầu.
 *
 * @returns số dòng vừa chép
 */
export function chepTuEnv(db, { chuKho = '' } = {}) {
  if (coNguoi(db)) return 0;
  const bamChung = layCauHinh('MOTION_MAT_KHAU_HASH').trim();
  if (!bamChung.startsWith('scrypt$')) return 0;
  const ds = dsTaiKhoan();
  const chu = chuan(chuKho);
  const them = [...new Set([chu, ...ds].filter(Boolean))];
  if (!them.length) return 0;
  const sql = db.prepare(
    'INSERT OR IGNORE INTO nguoi_dung (email, ten, mat_khau_bam, vai) VALUES (?, ?, ?, ?)');
  let n = 0;
  for (const e of them) n += sql.run(e, '', bamChung, e === chu ? 'quan_tri' : 'nguoi_dung').changes;
  return n;
}

/** @returns {{email,ten,vai,dangHoatDong,choDuyet,coGoogle,taoLuc,vaoLanCuoi,matKhauChung}[]} */
export function dsNguoi(db) {
  const bamChung = layCauHinh('MOTION_MAT_KHAU_HASH').trim();
  return db.prepare(`SELECT email, ten, vai, dang_hoat_dong, tao_luc, vao_lan_cuoi, mat_khau_bam,
    google_sub, cho_duyet, anh
    FROM nguoi_dung ORDER BY cho_duyet DESC, vai = 'quan_tri' DESC, email`).all().map((r) => ({
    email: r.email,
    ten: r.ten || '',
    vai: r.vai,
    dangHoatDong: r.dang_hoat_dong === 1,
    choDuyet: r.cho_duyet === 1,
    coGoogle: Boolean(r.google_sub),
    anh: r.anh || '',
    taoLuc: r.tao_luc,
    vaoLanCuoi: r.vao_lan_cuoi,
    /* Ai còn dùng mật khẩu chung thì nói ra, để chủ kho biết mà đổi. Đây không
       phải lỗi — nó là hiện trạng của mọi tài khoản chép từ danh sách cũ sang. */
    matKhauChung: Boolean(bamChung) && r.mat_khau_bam === bamChung,
  }));
}

export const layNguoi = (db, email) => db.prepare(
  `SELECT email, ten, vai, dang_hoat_dong, mat_khau_bam, google_sub, cho_duyet
   FROM nguoi_dung WHERE email = ?`).get(chuan(email)) || null;

/**
 * Tìm theo MÃ GOOGLE trước, rồi mới tới email.
 *
 * Google Workspace đổi được email của một người mà `sub` giữ nguyên; ngược lại
 * một email đã nghỉ việc có thể được cấp lại cho người mới. Gắn theo `sub` là
 * gắn đúng con người, không gắn vào cái nhãn.
 */
export const layTheoGoogle = (db, sub) => db.prepare(
  `SELECT email, ten, vai, dang_hoat_dong, mat_khau_bam, google_sub, cho_duyet
   FROM nguoi_dung WHERE google_sub = ?`).get(String(sub || '')) || null;

export const laQuanTri = (db, email) => {
  const n = layNguoi(db, email);
  return Boolean(n && n.vai === 'quan_tri' && n.dang_hoat_dong === 1 && n.cho_duyet !== 1);
};

/**
 * VÀO BẰNG GOOGLE — tìm người, hoặc ghi một người mới đang CHỜ DUYỆT.
 *
 * Người mới KHÔNG được dùng ngay. Ai có tài khoản Google cũng bấm đăng nhập
 * được; cho vào thẳng là người lạ tiêu hạn mức AI của chủ kho và chiếm chỗ
 * trong kho. Người quản trị duyệt từng người — trừ khi email đúng đuôi đã khai
 * ở `MOTION_TU_DUYET_DUOI` (vd `@matbao.com`), tức người trong nhà.
 *
 * @returns {{ok:true, email, moi, choDuyet}|{ok:false, cau}}
 */
export function vaoBangGoogle(db, { email, sub, ten = '', anh = '' }) {
  const e = chuan(email);
  const s = String(sub || '');
  if (!e || !s) return { ok: false, cau: 'Google không trả về đủ thông tin.' };

  const theoSub = layTheoGoogle(db, s);
  const theoEmail = layNguoi(db, e);

  /* Đã gắn Google rồi: dùng chính dòng ấy, kể cả khi email bên Google vừa đổi. */
  if (theoSub) {
    if (theoSub.email !== e) db.prepare('UPDATE nguoi_dung SET email = ? WHERE google_sub = ?').run(e, s);
    return ketQuaVao(db, layTheoGoogle(db, s));
  }

  /* Có sẵn tài khoản mật khẩu cùng email → GẮN Google vào đúng dòng đó. Không
     đẻ dòng thứ hai: hai dòng cùng email là kho bị tách làm đôi, và người dùng
     mở app lên thấy mất sạch clip (xem chú thích COLLATE NOCASE ở lược đồ). */
  if (theoEmail) {
    db.prepare('UPDATE nguoi_dung SET google_sub = ?, anh = COALESCE(NULLIF(?, \'\'), anh), ten = COALESCE(NULLIF(ten, \'\'), ?) WHERE email = ?')
      .run(s, anh, ten, e);
    return ketQuaVao(db, layNguoi(db, e));
  }

  const tuDuyet = tuDuyetDuoc(e);
  db.prepare(`INSERT INTO nguoi_dung (email, ten, vai, google_sub, anh, cho_duyet, dang_hoat_dong)
    VALUES (?, ?, 'nguoi_dung', ?, ?, ?, 1)`).run(e, ten, s, anh, tuDuyet ? 0 : 1);
  return tuDuyet
    ? { ok: true, email: e, moi: true, choDuyet: false }
    : { ok: false, moi: true, choDuyet: true,
      cau: 'Đã ghi nhận. Tài khoản của bạn đang chờ người quản trị duyệt.' };
}

function ketQuaVao(db, n) {
  if (!n) return { ok: false, cau: 'Không tìm thấy tài khoản.' };
  if (n.cho_duyet === 1) {
    return { ok: false, choDuyet: true, cau: 'Tài khoản của bạn đang chờ người quản trị duyệt.' };
  }
  if (n.dang_hoat_dong !== 1) return { ok: false, cau: 'Tài khoản này đang bị khoá. Hỏi người quản trị.' };
  db.prepare("UPDATE nguoi_dung SET vao_lan_cuoi = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE email = ?")
    .run(n.email);
  return { ok: true, email: n.email, vai: n.vai };
}

/**
 * Email này có được vào thẳng không, khỏi chờ duyệt.
 *
 * `MOTION_TU_DUYET_DUOI` khai đuôi (vd `@matbao.com,@matbao.net`). KHÔNG mặc
 * định lấy `MOTION_DUOI_EMAIL`: hai biến ấy nói hai chuyện khác nhau, và suy
 * bừa ở đây là mở cửa cho cả một tên miền mà không ai cố ý khai.
 */
export function tuDuyetDuoc(email) {
  const e = chuan(email);
  const ds = layCauHinh('MOTION_TU_DUYET_DUOI').split(',').map((x) => x.trim().toLowerCase())
    .filter(Boolean).map((x) => (x.startsWith('@') ? x : `@${x}`));
  return ds.some((d) => e.endsWith(d));
}

/** Duyệt một người đang chờ. */
export function duyetNguoi(db, email) {
  const n = layNguoi(db, email);
  if (!n) return { ok: false, cau: 'Không có tài khoản này.' };
  if (n.cho_duyet !== 1) return { ok: false, cau: 'Tài khoản này không ở diện chờ duyệt.' };
  db.prepare('UPDATE nguoi_dung SET cho_duyet = 0, dang_hoat_dong = 1 WHERE email = ?').run(n.email);
  return { ok: true };
}

/**
 * Thêm một người. `matKhau` bỏ trống thì sinh hộ và TRẢ VỀ NGUYÊN VĂN — chỗ gọi
 * hiện nó đúng một lần cho chủ kho chép cho khách. Không cất lại đâu cả.
 * @returns {{ok:true, email, matKhau}|{ok:false, cau}}
 */
export function themNguoi(db, { email, ten = '', vai = 'nguoi_dung', matKhau = '' }) {
  const e = chuan(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, cau: 'Email chưa đúng khuôn. Ví dụ: khach@congty.com' };
  if (!['nguoi_dung', 'quan_tri'].includes(vai)) return { ok: false, cau: 'Vai không hợp lệ.' };
  if (layNguoi(db, e)) return { ok: false, cau: `${e} đã có trong danh sách rồi.` };
  const mk = matKhau || matKhauNgau();
  if (mk.length < DAI_TOI_THIEU) return { ok: false, cau: `Mật khẩu phải từ ${DAI_TOI_THIEU} ký tự.` };
  db.prepare('INSERT INTO nguoi_dung (email, ten, mat_khau_bam, vai) VALUES (?, ?, ?, ?)')
    .run(e, String(ten || '').slice(0, 80), bam(mk), vai);
  return { ok: true, email: e, matKhau: mk };
}

/** Đặt lại mật khẩu. Bỏ trống `matKhau` thì sinh hộ và trả về. */
export function doiMatKhau(db, email, matKhau = '') {
  const n = layNguoi(db, email);
  if (!n) return { ok: false, cau: 'Không có tài khoản này.' };
  const mk = matKhau || matKhauNgau();
  if (mk.length < DAI_TOI_THIEU) return { ok: false, cau: `Mật khẩu phải từ ${DAI_TOI_THIEU} ký tự.` };
  db.prepare('UPDATE nguoi_dung SET mat_khau_bam = ? WHERE email = ?').run(bam(mk), n.email);
  return { ok: true, email: n.email, matKhau: mk };
}

/**
 * Khoá / mở một tài khoản.
 *
 * KHÔNG ĐƯỢC KHOÁ NGƯỜI QUẢN TRỊ CUỐI CÙNG. Khoá xong thì không còn ai vào để
 * mở lại, và cách duy nhất là sửa CSDL trên máy chủ — thứ người dùng công cụ này
 * không làm được. Cùng lý do với `xoaNguoi`.
 */
export function datHoatDong(db, email, bat) {
  const n = layNguoi(db, email);
  if (!n) return { ok: false, cau: 'Không có tài khoản này.' };
  if (!bat && n.vai === 'quan_tri' && demQuanTri(db) <= 1) {
    return { ok: false, cau: 'Đây là người quản trị duy nhất — khoá xong sẽ không ai vào được nữa.' };
  }
  db.prepare('UPDATE nguoi_dung SET dang_hoat_dong = ? WHERE email = ?').run(bat ? 1 : 0, n.email);
  return { ok: true };
}

export function doiVai(db, email, vai) {
  const n = layNguoi(db, email);
  if (!n) return { ok: false, cau: 'Không có tài khoản này.' };
  if (!['nguoi_dung', 'quan_tri'].includes(vai)) return { ok: false, cau: 'Vai không hợp lệ.' };
  if (vai !== 'quan_tri' && n.vai === 'quan_tri' && demQuanTri(db) <= 1) {
    return { ok: false, cau: 'Đây là người quản trị duy nhất — hạ quyền xong sẽ không ai quản được nữa.' };
  }
  db.prepare('UPDATE nguoi_dung SET vai = ? WHERE email = ?').run(vai, n.email);
  return { ok: true };
}

const demQuanTri = (db) => db.prepare(
  "SELECT COUNT(*) c FROM nguoi_dung WHERE vai = 'quan_tri' AND dang_hoat_dong = 1").get().c;

/**
 * Xoá khỏi danh sách. Kho clip của họ KHÔNG bị đụng tới — xem đầu file.
 *
 * EMAIL CÒN NẰM TRONG `MOTION_TAI_KHOAN` THÌ KHOÁ, KHÔNG XOÁ HẲN. Xoá hẳn thì
 * bảng thôi "biết" email ấy, và `kiemVao` cho nó đi tiếp đường cũ — tức là họ
 * vào lại được bằng mật khẩu chung, trong khi người quản trị vừa bấm Xoá và tin
 * là xong. Khoá lại thì bảng vẫn biết, nên vẫn chặn.
 */
export function xoaNguoi(db, email) {
  const n = layNguoi(db, email);
  if (!n) return { ok: false, cau: 'Không có tài khoản này.' };
  if (n.vai === 'quan_tri' && demQuanTri(db) <= 1) {
    return { ok: false, cau: 'Đây là người quản trị duy nhất — xoá xong sẽ không ai vào được nữa.' };
  }
  if (dsTaiKhoan().includes(n.email)) {
    db.prepare("UPDATE nguoi_dung SET dang_hoat_dong = 0, vai = 'nguoi_dung' WHERE email = ?").run(n.email);
    return { ok: true, khoaThay: true,
      cau: `${n.email} nằm trong danh sách cấu hình của máy chủ nên chỉ KHOÁ được, không xoá hẳn. `
        + 'Họ không vào được nữa.' };
  }
  db.prepare('DELETE FROM nguoi_dung WHERE email = ?').run(n.email);
  return { ok: true };
}

/**
 * Kiểm đăng nhập theo BẢNG.
 *
 * @returns {{ok:true, email, vai}|{ok:false, cau}|null}
 *          `null` = bảng chưa có ai → chỗ gọi dùng đường cũ (env + mật khẩu chung).
 */
export function kiemVao(db, email, matKhau) {
  if (!coNguoi(db)) return null;
  /* VAN CỨU. Bảng có người nhưng KHÔNG còn người quản trị nào đang hoạt động
     thì không ai thêm/mở khoá được cho ai nữa — lúc ấy quay về đường cũ (danh
     sách env + mật khẩu chung) để chủ máy chủ vào dọn. Không có van này thì một
     CSDL hỏng nửa chừng là khoá cứng cả công cụ. */
  if (!db.prepare("SELECT COUNT(*) c FROM nguoi_dung WHERE vai = 'quan_tri' AND dang_hoat_dong = 1")
    .get().c) return null;
  const n = layNguoi(db, email);
  /* Cùng MỘT câu cho "không có tài khoản" và "sai mật khẩu". Nói khác nhau là
     chỉ cho người dò biết email nào có thật. */
  const chung = { ok: false, cau: 'Email hoặc mật khẩu chưa đúng.' };
  /* KHÔNG BIẾT EMAIL NÀY thì KHÔNG phán — trả `null` để chỗ gọi đi tiếp đường
     cũ (danh sách env + mật khẩu chung).
     Bản đầu chặn thẳng, và đó là chặn quá tay: người quản trị thêm một email
     vào `MOTION_TAI_KHOAN` sau này sẽ không vào được, mà chẳng có gì nói vì
     sao. Ba bài kiểm đỏ vì đúng chuyện đó.
     Xoá người vẫn có hiệu lực: `xoaNguoi` KHÓA thay vì xoá hẳn khi email ấy còn
     nằm trong danh sách env — khoá thì bảng vẫn "biết", nên vẫn chặn được. */
  if (!n) return null;
  if (n.cho_duyet === 1) return { ok: false, cau: 'Tài khoản đang chờ người quản trị duyệt.' };
  if (n.dang_hoat_dong !== 1) return { ok: false, cau: 'Tài khoản này đang bị khoá. Hỏi người quản trị.' };
  if (!khopBam(matKhau, n.mat_khau_bam)) return chung;
  db.prepare("UPDATE nguoi_dung SET vao_lan_cuoi = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE email = ?")
    .run(n.email);
  return { ok: true, email: n.email, vai: n.vai };
}
