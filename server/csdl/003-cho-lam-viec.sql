/* ══════════ ĐANG LÀM DỞ Ở ĐÂU ══════════
 *
 * Mỗi tài khoản một dòng: lần trước đang mở dự án nào, ở cảnh nào, giây nào.
 * Mở app lên là về đúng chỗ ấy, không phải đi tìm lại.
 *
 * KHÁC với bảng `phien`: `phien` là vé đăng nhập (ai đang được vào). Bảng này
 * là chỗ làm việc — nó sống qua cả những lần đăng xuất.
 *
 * Khoá theo EMAIL chứ không theo `nguoi_dung.id`: máy chủ chưa đặt mật khẩu thì
 * chẳng có dòng `nguoi_dung` nào cả, mà vẫn phải nhớ được chỗ làm việc. Mất một
 * dòng ở đây thì hậu quả xấu nhất là mở nhầm dự án đầu danh sách — không đáng
 * đánh đổi lấy một ràng buộc khoá ngoại.
 */
CREATE TABLE cho_lam_viec (
  email   TEXT PRIMARY KEY COLLATE NOCASE,
  slug    TEXT NOT NULL,
  canh    TEXT NOT NULL DEFAULT '',
  giay    REAL NOT NULL DEFAULT 0,
  sua_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
