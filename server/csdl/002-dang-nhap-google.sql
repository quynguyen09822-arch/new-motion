/* ══════════ ĐĂNG NHẬP BẰNG GOOGLE ══════════
 *
 * Thêm ba cột vào `nguoi_dung`. Không đụng bảng nào khác, không đổi cột nào
 * đang có — bước di trú mà sửa cột cũ thì bản đang chạy lỡ quay về phiên bản
 * trước là đọc sai dữ liệu.
 *
 * `google_sub` là mã người dùng Google trả về (`sub` trong id_token). GẮN THEO
 * MÃ NÀY, không gắn theo email: Google Workspace đổi được email của một người
 * mà `sub` giữ nguyên, còn email thì có thể được cấp lại cho người khác.
 *
 * `cho_duyet = 1` là người vừa đăng ký, CHƯA được dùng. Ai có tài khoản Google
 * cũng bấm đăng nhập được, nên không có bước duyệt thì người lạ vào tiêu hạn
 * mức AI của chủ kho. Người quản trị duyệt từng người.
 */
ALTER TABLE nguoi_dung ADD COLUMN google_sub TEXT;
ALTER TABLE nguoi_dung ADD COLUMN cho_duyet INTEGER NOT NULL DEFAULT 0 CHECK (cho_duyet IN (0, 1));
ALTER TABLE nguoi_dung ADD COLUMN anh TEXT;

/* Một tài khoản Google chỉ gắn được vào một người. `WHERE ... IS NOT NULL` để
   mọi dòng chưa gắn Google (cột NULL) không đụng nhau. */
CREATE UNIQUE INDEX nguoi_dung_google ON nguoi_dung (google_sub) WHERE google_sub IS NOT NULL;
