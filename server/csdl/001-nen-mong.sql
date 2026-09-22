/* ══════════ NGƯỜI VÀ KHO ══════════ */

/* Tài khoản. Hôm nay còn khai bằng biến môi trường, nghĩa là thêm một người là
   phải sửa cấu hình rồi triển khai lại — không có "quên mật khẩu", không có
   phân quyền. Bảng này gỡ đúng chỗ đó. */
CREATE TABLE nguoi_dung (
  id             INTEGER PRIMARY KEY,
  /* COLLATE NOCASE: "Quy@matbao.com" và "quy@matbao.com" là MỘT người. Thiếu
     nó thì hai bản ghi cùng tồn tại và kho bị tách làm đôi — người dùng mở app
     lên thấy mất sạch clip, mà không có lỗi nào được ghi ở đâu cả. */
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  ten            TEXT NOT NULL DEFAULT '',
  /* NULL = chưa đặt mật khẩu (giữ đúng hành vi hiện tại: chưa đặt thì không
     hỏi ai). Chuỗi rỗng KHÁC NULL — rỗng nghĩa là "cố ý không có". */
  mat_khau_bam   TEXT,
  vai            TEXT NOT NULL DEFAULT 'nguoi_dung'
                 CHECK (vai IN ('nguoi_dung', 'quan_tri')),
  dang_hoat_dong INTEGER NOT NULL DEFAULT 1 CHECK (dang_hoat_dong IN (0, 1)),
  tao_luc        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  vao_lan_cuoi   TEXT
);

CREATE TABLE kho (
  id      INTEGER PRIMARY KEY,
  chu_id  INTEGER REFERENCES nguoi_dung(id) ON DELETE RESTRICT,
  ma      TEXT NOT NULL UNIQUE,
  la_goc  INTEGER NOT NULL DEFAULT 0 CHECK (la_goc IN (0, 1)),
  tao_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
/* Chỉ được MỘT kho gốc. Giao việc này cho chỉ mục chứ không cho kỷ luật của
   người viết code — kỷ luật thì có ngày quên, chỉ mục thì không. */
CREATE UNIQUE INDEX kho_chi_mot_goc ON kho (la_goc) WHERE la_goc = 1;

/* ══════════ DỰ ÁN ══════════ */

CREATE TABLE du_an (
  id       INTEGER PRIMARY KEY,
  kho_id   INTEGER NOT NULL REFERENCES kho(id) ON DELETE CASCADE,
  slug     TEXT NOT NULL,
  ten      TEXT NOT NULL,
  doc      TEXT NOT NULL CHECK (json_valid(doc)),

  /* CHỐNG GHI ĐÈ — con số quan trọng nhất trong cả bảng này.
     Hôm nay `luuClip()` không có phép kiểm xung đột nào: mở một clip trên hai
     tab, sửa cả hai, bấm Lưu cả hai — bản sau đè bản trước, IM LẶNG, và người
     mất bản sửa không hề được báo.
     Cách dùng: đọc kèm `phien_ban`, ghi bằng
       UPDATE du_an SET ..., phien_ban = phien_ban + 1
        WHERE id = ? AND phien_ban = ?
     Không dòng nào đổi nghĩa là có người khác đã ghi trước — lúc đó HỎI người
     dùng, đừng tự quyết hộ họ. */
  phien_ban INTEGER NOT NULL DEFAULT 1,

  /* Khuôn mẫu: một dự án được đánh dấu để người khác nhân bản ra mà dùng. Cờ
     trên chính bảng này, không phải bảng riêng — một khuôn VẪN là một dự án,
     mở ra sửa được y như mọi dự án khác. */
  la_khuon INTEGER NOT NULL DEFAULT 0 CHECK (la_khuon IN (0, 1)),

  /* XOÁ MỀM. Dự án clip không có git; xoá nhầm là mất hẳn. Đánh dấu rồi dọn
     sau cho người ta còn đường quay lại. */
  xoa_luc  TEXT,
  tao_luc  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sua_luc  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sua_boi  INTEGER REFERENCES nguoi_dung(id),

  /* Cột suy ra, để lọc/đếm mà không phải mở JSON mỗi lần. */
  rong    INTEGER GENERATED ALWAYS AS (json_extract(doc, '$.meta.width'))  STORED,
  cao     INTEGER GENERATED ALWAYS AS (json_extract(doc, '$.meta.height')) STORED,
  so_canh INTEGER GENERATED ALWAYS AS (json_array_length(doc, '$.scenes')) STORED,

  /* UNIQUE theo (kho, slug) chứ KHÔNG phải theo slug. Hai người được có dự án
     trùng tên trong kho riêng của mỗi người; khoá toàn cục là vô tình cho
     người vào trước chiếm mất cái tên. */
  UNIQUE (kho_id, slug)
);
CREATE INDEX du_an_kho_moi ON du_an (kho_id, sua_luc DESC) WHERE xoa_luc IS NULL;
CREATE INDEX du_an_khuon   ON du_an (la_khuon) WHERE la_khuon = 1 AND xoa_luc IS NULL;

/* Lịch sử từng lần lưu — thay cho `.hub-video-backups/` đang xếp theo tên file. */
CREATE TABLE ban_luu (
  id        INTEGER PRIMARY KEY,
  du_an_id  INTEGER NOT NULL REFERENCES du_an(id) ON DELETE CASCADE,
  phien_ban INTEGER NOT NULL,
  doc       TEXT NOT NULL CHECK (json_valid(doc)),
  ly_do     TEXT NOT NULL DEFAULT '',
  luu_luc   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  luu_boi   INTEGER REFERENCES nguoi_dung(id),
  UNIQUE (du_an_id, phien_ban)
);
CREATE INDEX ban_luu_moi ON ban_luu (du_an_id, luu_luc DESC);

/* Nháp tự lưu: nhiều nhất MỘT bản mỗi dự án. Khoá chính đặt thẳng trên
   `du_an_id` nên không cần kỷ luật nào để giữ điều đó. */
CREATE TABLE ban_nhap (
  du_an_id INTEGER PRIMARY KEY REFERENCES du_an(id) ON DELETE CASCADE,
  doc      TEXT NOT NULL CHECK (json_valid(doc)),
  sua_luc  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

/* ══════════ TỆP ══════════ */

/* NỘI DUNG tệp, khử trùng theo VÂN TAY — không phải theo tên.
   Đúng cách `/api/anh` đang làm: dán lại cùng một ảnh chụp màn hình thì nhận
   lại đúng file cũ. Ở đây thêm được thứ file thường không cho: biết ai đang
   dùng tệp nào, nên dọn rác được mà không xoá nhầm. */
CREATE TABLE tep (
  id      INTEGER PRIMARY KEY,
  bam     TEXT NOT NULL UNIQUE,          -- sha256, 16 ký tự đầu
  loai    TEXT NOT NULL CHECK (loai IN ('anh', 'video', 'tieng')),
  kieu    TEXT NOT NULL,                 -- image/png, video/mp4…
  so_byte INTEGER NOT NULL CHECK (so_byte > 0),
  rong    INTEGER,
  cao     INTEGER,
  tao_luc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

/* Ai đang dùng tệp nào. Không có bảng này thì không bao giờ dám xoá tệp nào
   cả — và thư mục ảnh chỉ có phình lên, không bao giờ nhỏ lại. */
CREATE TABLE tep_dung (
  tep_id   INTEGER NOT NULL REFERENCES tep(id)   ON DELETE CASCADE,
  du_an_id INTEGER NOT NULL REFERENCES du_an(id) ON DELETE CASCADE,
  PRIMARY KEY (tep_id, du_an_id)
);
CREATE INDEX tep_dung_nguoc ON tep_dung (du_an_id);

/* ══════════ VIỆC NẶNG ══════════ */

/* Hàng đợi BỀN. Hôm nay hàng đợi nằm trong `new Map()`: khởi động lại giữa
   chừng một lượt xuất video là việc biến mất, mà trình duyệt thì vẫn quay vòng
   chờ mãi không ai trả lời.

   `thue_den` là hợp đồng thuê: đứa chạy việc phải gia hạn đều. Chết giữa chừng
   thì hợp đồng hết hạn và đứa khác nhặt lại — khác hẳn cờ "đang chạy", vì cờ
   ấy không bao giờ tự tắt khi tiến trình chết. */
CREATE TABLE viec (
  id         INTEGER PRIMARY KEY,
  loai       TEXT NOT NULL,
  ten        TEXT NOT NULL,
  tham_so    TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(tham_so)),
  nguoi_id   INTEGER REFERENCES nguoi_dung(id),
  du_an_id   INTEGER REFERENCES du_an(id) ON DELETE SET NULL,
  trang_thai TEXT NOT NULL DEFAULT 'cho'
             CHECK (trang_thai IN ('cho', 'chay', 'xong', 'loi', 'huy')),
  lan_thu    INTEGER NOT NULL DEFAULT 0,
  toi_da_thu INTEGER NOT NULL DEFAULT 3,
  thue_den   TEXT,
  tien_do    INTEGER NOT NULL DEFAULT 0 CHECK (tien_do BETWEEN 0 AND 100),
  ket_qua    TEXT,
  loi        TEXT,
  tao_luc    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  xong_luc   TEXT
);
CREATE INDEX viec_hang_cho ON viec (trang_thai, tao_luc) WHERE trang_thai IN ('cho', 'chay');

/* ══════════ TIỀN ══════════ */

/* SỔ CÁI: mỗi lượt tốn tiền một dòng. Đây là bảng đáng giá nhất trong cả lược
   đồ, vì nó vá một lỗ TIỀN có thật.

   Hôm nay hạn mức đếm trong `new Map()` — khởi động lại là bộ đếm về 0, ai
   cũng được cấp lại 300 lượt AI và 20.000 ký tự đọc. Chính `hanmuc.js` đã ghi
   là nó cần "chỗ ghi bền — mà bản chạy trong container thì chưa có". Nay có
   rồi.

   ĐẾM THEO TIỀN, KHÔNG ĐẾM THEO LƯỢT. Một lượt hỏi 12 token và một lượt dựng
   cảnh từ ảnh 8.000 token đang bị tính NHƯ NHAU. Trần "300 lượt/ngày" vì thế
   vừa quá chặt với việc rẻ vừa quá lỏng với việc đắt. Giữ `so_don_vi` để mấy
   trần cũ vẫn chạy, nhưng thêm `chi_phi_micro` để dần chuyển sang trần tiền.

   `chi_phi_micro` là SỐ NGUYÊN (phần triệu của một đồng). Tiền mà để số thực
   thì cộng một triệu dòng lại lệch, và lệch theo kiểu không ai truy ra được. */
CREATE TABLE nhat_ky (
  id         INTEGER PRIMARY KEY,
  luc        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  nguoi_id   INTEGER REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  email      TEXT NOT NULL DEFAULT '',     -- chép lại, để xoá người vẫn còn số liệu
  viec_gi    TEXT NOT NULL,                -- 'luu' | 'goi-ai' | 'doc-loi' | 'xuat'…
  slug       TEXT NOT NULL DEFAULT '',
  model      TEXT NOT NULL DEFAULT '',
  token_vao  INTEGER NOT NULL DEFAULT 0,
  token_ra   INTEGER NOT NULL DEFAULT 0,
  don_vi     TEXT NOT NULL DEFAULT 'luot'  -- 'luot' | 'ky_tu' | 'giay'
             CHECK (don_vi IN ('luot', 'ky_tu', 'giay')),
  so_don_vi  INTEGER NOT NULL DEFAULT 1,
  chi_phi_micro INTEGER NOT NULL DEFAULT 0,

  /* NGÀY THEO GIỜ VIỆT NAM, tính sẵn thành cột.
     "Hôm nay" của người dùng phải là hôm nay của họ — theo UTC thì 7 giờ sáng
     mới sang ngày mới, và hạn mức reset giữa buổi làm việc. `hanmuc.js` đã
     cộng 7 tiếng bằng tay; ở đây cột tự tính nên không có chỗ nào quên. */
  ngay_vn TEXT GENERATED ALWAYS AS (date(luc, '+7 hours')) STORED
);
CREATE INDEX nhat_ky_han_muc ON nhat_ky (nguoi_id, ngay_vn, don_vi);
CREATE INDEX nhat_ky_theo_ngay ON nhat_ky (ngay_vn);

/* KHÔNG có bảng `han_muc` riêng.
   Một bảng đếm sẵn bên cạnh sổ cái là hai nguồn sự thật, và sớm muộn chúng
   lệch nhau — lúc ấy không ai biết tin cái nào. Hạn mức CỘNG THẲNG từ sổ cái;
   chỉ mục ngay trên đã lo phần tốc độ. Bao giờ sổ cái lớn tới mức cộng chậm
   thì mới thêm bảng tổng theo ngày, và lúc đó nó là bộ nhớ đệm dựng lại được,
   không phải nguồn sự thật thứ hai. */

/* ══════════ PHIÊN ══════════ */

CREATE TABLE phien (
  ma        TEXT PRIMARY KEY,
  nguoi_id  INTEGER NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  la_ve_xuat INTEGER NOT NULL DEFAULT 0 CHECK (la_ve_xuat IN (0, 1)),
  tao_luc   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  het_luc   TEXT NOT NULL
);
CREATE INDEX phien_don ON phien (het_luc);

/* ══════════ THƯ VIỆN THÀNH PHẦN ══════════ */

/* Thành phần người dùng tự cất để dùng lại: một cái nền, một cụm đã bày sẵn,
   một khối lấy từ màn Stitch.
   Hôm nay kho mẫu (`KIT` trong `them.js`) ghi CỨNG trong mã — muốn thêm một
   mẫu là phải sửa mã rồi triển khai lại. Bảng này mở đúng chỗ đó ra. */
CREATE TABLE thanh_phan (
  id       INTEGER PRIMARY KEY,
  kho_id   INTEGER NOT NULL REFERENCES kho(id) ON DELETE CASCADE,
  ten      TEXT NOT NULL,
  loai     TEXT NOT NULL,                 -- kind của món, hoặc 'cum'
  doc      TEXT NOT NULL CHECK (json_valid(doc)),
  anh_bam  TEXT REFERENCES tep(bam),      -- ảnh xem trước
  /* Ở đâu ra: tự dựng, chép từ một clip, hay lấy từ màn Stitch. Biết nguồn thì
     lần ngược được khi một mẫu hoá ra dựng sai. */
  nguon    TEXT NOT NULL DEFAULT 'tu-dung'
           CHECK (nguon IN ('tu-dung', 'tu-clip', 'tu-stitch', 'tu-ai')),
  dem_dung INTEGER NOT NULL DEFAULT 0,    -- dùng bao nhiêu lần, để xếp cái hay dùng lên trước
  tao_luc  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (kho_id, ten)
);

CREATE TABLE the (
  thanh_phan_id INTEGER NOT NULL REFERENCES thanh_phan(id) ON DELETE CASCADE,
  ten           TEXT NOT NULL COLLATE NOCASE,
  PRIMARY KEY (thanh_phan_id, ten)
);
CREATE INDEX the_tim ON the (ten);

/* ══════════ CÙNG LÀM ══════════ */

/* CHIA SẺ — thứ mở đường cho "phát triển mạnh mẽ hơn" nhiều nhất.
   Hôm nay kho là RIÊNG TUYỆT ĐỐI: không có cách nào cho người khác xem clip
   của mình, kể cả chỉ để góp ý. Sếp muốn xem thì phải xuất video gửi đi. */
CREATE TABLE chia_se (
  du_an_id INTEGER NOT NULL REFERENCES du_an(id)      ON DELETE CASCADE,
  nguoi_id INTEGER NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  quyen    TEXT NOT NULL CHECK (quyen IN ('xem', 'gop_y', 'sua')),
  tao_luc  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tao_boi  INTEGER REFERENCES nguoi_dung(id),
  PRIMARY KEY (du_an_id, nguoi_id)
);
CREATE INDEX chia_se_cua_toi ON chia_se (nguoi_id);

/* GÓP Ý gắn vào ĐÚNG GIÂY và ĐÚNG MÓN.
   "Chữ ở đoạn giữa hơi nhỏ" là một câu không dùng được: không biết cảnh nào,
   món nào, giây thứ mấy. Neo vào toạ độ cụ thể thì bấm một cái là nhảy thẳng
   tới chỗ đang nói. */
CREATE TABLE gop_y (
  id       INTEGER PRIMARY KEY,
  du_an_id INTEGER NOT NULL REFERENCES du_an(id) ON DELETE CASCADE,
  canh_id  TEXT NOT NULL DEFAULT '',
  mon_id   TEXT NOT NULL DEFAULT '',
  giay     REAL,
  chu      TEXT NOT NULL,
  nguoi_id INTEGER REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  xong_luc TEXT,                            -- đã xử lý xong thì đóng lại
  tao_luc  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX gop_y_con_mo ON gop_y (du_an_id, tao_luc) WHERE xong_luc IS NULL;
