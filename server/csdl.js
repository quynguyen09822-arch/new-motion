/**
 * CƠ SỞ DỮ LIỆU — SQLite, dùng bản CÓ SẴN TRONG NODE (`node:sqlite`).
 *
 * VÌ SAO LẦN NÀY LÀM ĐƯỢC, TRONG KHI BẢN THIẾT KẾ THÁNG TRƯỚC NÓI "KHÔNG NÊN".
 *
 *   Luật cứng của repo: không gói phụ thuộc, không bước dựng. Bản thiết kế
 *   trước kết luận CSDL phá luật đó, vì nó mặc định PostgreSQL + trình điều
 *   khiển `pg` + `node_modules`.
 *
 *   Node 22 có sẵn `node:sqlite`. Không cài gì, không dựng gì, không thêm một
 *   dòng nào vào `package.json`. Luật giữ nguyên, mà vẫn có SQL thật, giao dịch
 *   thật, ràng buộc thật. Kết luận cũ sai vì nó chỉ xét đúng một loại CSDL.
 *
 * CÁI GIÁ, NÓI THẲNG:
 *   · `node:sqlite` còn mang nhãn thử nghiệm — Node in ra một dòng cảnh báo, và
 *     API có thể đổi ở bản sau. Đổi thì sửa ở ĐÚNG file này, không lan ra chỗ
 *     khác, vì phần còn lại của app chỉ gọi hàm chứ không đụng thư viện.
 *   · MỘT người ghi tại một thời điểm. Với công cụ nội bộ vài người dùng thì
 *     thừa sức; muốn hàng trăm người ghi song song thì mới cần PostgreSQL. Lược
 *     đồ dưới đây viết bằng SQL chuẩn nhất có thể để lúc ấy chuyển đỡ đau.
 *
 * NGUYÊN TẮC KHÔNG ĐỔI TỪ BẢN CŨ:
 *   File nhị phân lớn (video, ảnh, giọng đọc) KHÔNG vào CSDL — chỉ giữ vân tay
 *   và đường dẫn. Nhét một video 30 MB vào cột blob là biến bản sao lưu CSDL
 *   thành hàng chục GB, và mọi truy vấn chậm theo.
 *
 *   Kịch bản clip vào MỘT cột JSON, không băm nhỏ thành bảng. Cây thành phần
 *   lồng nhau nhiều tầng, 25 loại mỗi loại một bộ trường riêng — băm ra là tự
 *   viết cho mình một bộ ORM để rồi ghép lại y như cũ mỗi lần đọc.
 *   `validateScene` vẫn là thẩm quyền quyết định hợp lệ, không phải ràng buộc
 *   của bảng.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Nơi để file CSDL. Nằm cạnh `kho/` nên cùng được một ổ lưu che chở. */
export const DUONG_MAC_DINH = path.join(GOC, 'kho', 'motion.db');

/* ─────────────────────────── LƯỢC ĐỒ ───────────────────────────
 *
 * Mỗi bước di trú là MỘT file trong `server/csdl/`, chạy theo thứ tự TÊN.
 *
 * Bước đã chạy rồi thì KHÔNG BAO GIỜ sửa nội dung file ấy — thêm file mới với
 * số lớn hơn. Sửa bước cũ thì máy đã chạy và máy mới dựng ra hai lược đồ khác
 * nhau mà không ai biết, cho tới lúc một câu truy vấn hỏng ở đúng một máy.
 *
 * Để SQL ở file riêng chứ không nhúng vào chuỗi JS: SQL có dấu nháy ngược
 * trong chú thích, mà nhúng vào template literal là phải đi thoát từng cái —
 * một việc buồn tẻ và sớm muộn sẽ quên, rồi lược đồ hỏng ngay lúc khởi động.
 * File `.sql` cũng mở được bằng mọi công cụ CSDL, không phải bóc ra khỏi JS.
 */
const THU_MUC_BUOC = path.join(GOC, 'server', 'csdl');

function docBuoc() {
  return readdirSync(THU_MUC_BUOC)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ ten: f.replace(/\.sql$/, ''), sql: readFileSync(path.join(THU_MUC_BUOC, f), 'utf8') }));
}

/**
 * Mở CSDL, chạy nốt những bước di trú chưa chạy, trả về kết nối.
 *
 * GỌI ĐƯỢC NHIỀU LẦN. Mỗi bước ghi tên nó vào `di_tru`, nên lần sau mở lên nó
 * bỏ qua đúng những bước đã làm. Không có bước nào chạy hai lần.
 */
export function moCSDL(duong = DUONG_MAC_DINH) {
  if (duong !== ':memory:') mkdirSync(path.dirname(duong), { recursive: true });
  const db = new DatabaseSync(duong);

  /* WAL: người đọc không chặn người ghi và ngược lại. Không bật thì mỗi lượt
     lưu clip khoá cả những trang chỉ đang xem. Bộ nhớ thì không cần. */
  if (duong !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  /* PHẢI bật theo TỪNG kết nối — SQLite mặc định TẮT khoá ngoại, và tắt thì mọi
     `REFERENCES` ở trên chỉ là lời chú thích đẹp đẽ không ai thi hành. */
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  db.exec(`CREATE TABLE IF NOT EXISTS di_tru (
    ten     TEXT PRIMARY KEY,
    chay_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);

  const BUOC = docBuoc();
  const daChay = new Set(db.prepare('SELECT ten FROM di_tru').all().map((r) => r.ten));
  for (const b of BUOC) {
    if (daChay.has(b.ten)) continue;
    /* MỖI BƯỚC MỘT GIAO DỊCH. Đứt điện giữa chừng thì bước ấy coi như chưa
       chạy, không để lại một lược đồ nửa vời — thứ khó sửa hơn hẳn việc chạy
       lại từ đầu. */
    db.exec('BEGIN');
    try {
      db.exec(b.sql);
      db.prepare('INSERT INTO di_tru (ten) VALUES (?)').run(b.ten);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw new Error(`Bước di trú "${b.ten}" hỏng: ${e.message}`);
    }
  }
  return db;
}

/** Tên các bước đã khai — để bài kiểm đối chiếu, và để báo lúc khởi động. */
export const TEN_BUOC = docBuoc().map((b) => b.ten);

/* ─────────────────────── MẤY PHÉP ĐỌC/GHI ĐÁNG TÁCH RIÊNG ───────────────────────
 *
 * Chỉ những phép mà LÀM SAI THÌ MẤT DỮ LIỆU hoặc MẤT TIỀN mới nằm ở đây. Phần
 * còn lại cứ viết SQL thẳng tại chỗ dùng — bọc mọi câu truy vấn thành hàm là tự
 * dựng một bộ ORM nghèo nàn, và rồi phải đọc hai lớp mới biết nó chạy gì.
 */

/**
 * GHI DỰ ÁN CÓ KIỂM XUNG ĐỘT.
 *
 * Trả `{ ok: false, xungDot: true, phienBanThat }` khi có người ghi trước — KHÔNG
 * tự quyết hộ. Người dùng là người duy nhất biết bản nào đáng giữ; máy đoán hộ
 * là lúc nào đó đoán sai và không ai lấy lại được.
 */
export function ghiDuAn(db, { id, doc, phienBan, suaBoi = null, lyDo = '' }) {
  const chu = JSON.stringify(doc);
  const kq = db.prepare(`
    UPDATE du_an
       SET doc = ?, phien_ban = phien_ban + 1,
           sua_luc = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), sua_boi = ?
     WHERE id = ? AND phien_ban = ?
  `).run(chu, suaBoi, id, phienBan);

  if (kq.changes === 0) {
    const that = db.prepare('SELECT phien_ban FROM du_an WHERE id = ?').get(id);
    if (!that) return { ok: false, khongCo: true };
    return { ok: false, xungDot: true, phienBanThat: that.phien_ban };
  }

  const moi = phienBan + 1;
  /* Cất bản vừa ghi vào lịch sử NGAY trong cùng lượt — tách ra hai lượt thì có
     lúc dự án đã đổi mà lịch sử chưa có dòng nào tương ứng. */
  db.prepare(`INSERT INTO ban_luu (du_an_id, phien_ban, doc, ly_do, luu_boi)
              VALUES (?, ?, ?, ?, ?)`).run(id, moi, chu, lyDo, suaBoi);
  return { ok: true, phienBan: moi };
}

/**
 * Đã dùng bao nhiêu trong NGÀY HÔM NAY (giờ Việt Nam).
 *
 * Cộng thẳng từ sổ cái, không đọc một bảng đếm sẵn nào: một bảng đếm bên cạnh
 * sổ cái là hai nguồn sự thật, và sớm muộn chúng lệch nhau.
 */
export function daDungHomNay(db, nguoiId, donVi = 'luot') {
  const r = db.prepare(`
    SELECT COALESCE(SUM(so_don_vi), 0) AS so,
           COALESCE(SUM(chi_phi_micro), 0) AS tien
      FROM nhat_ky
     WHERE nguoi_id = ? AND don_vi = ?
       AND ngay_vn = date('now', '+7 hours')
  `).get(nguoiId, donVi);
  return { so: Number(r.so), tienMicro: Number(r.tien) };
}

/**
 * NHẬN MỘT VIỆC khỏi hàng đợi, kèm hợp đồng thuê `giayThue` giây.
 *
 * Việc `chay` mà hợp đồng đã hết hạn thì nhặt lại được — đó chính là ca "máy
 * chủ chết giữa lúc xuất video". Cờ "đang chạy" không làm được việc này, vì cờ
 * không bao giờ tự tắt khi tiến trình chết.
 */
export function nhanViec(db, { worker = 'chinh', giayThue = 120 } = {}) {
  const v = db.prepare(`
    UPDATE viec
       SET trang_thai = 'chay',
           lan_thu = lan_thu + 1,
           thue_den = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+' || ? || ' seconds'),
           ket_qua = COALESCE(ket_qua, json_object('worker', ?))
     WHERE id = (
       SELECT id FROM viec
        WHERE (trang_thai = 'cho')
           OR (trang_thai = 'chay' AND thue_den < strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ORDER BY tao_luc
        LIMIT 1
     )
       AND lan_thu < toi_da_thu
    RETURNING *
  `).get(String(giayThue), worker);
  return v || null;
}
