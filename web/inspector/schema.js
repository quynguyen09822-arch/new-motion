/**
 * SỔ CÂU CHỮ — 24 loại phần tử, mỗi loại có những núm gì, gọi tên là gì.
 *
 * Đây là file nên coi là VIỆC VIẾT CÂU CHỮ chứ không phải viết code. Toàn bộ vốn
 * từ mà người dùng nhìn thấy nằm ở đây. Nguyên tắc:
 *
 *   · Không để lọt từ kỹ thuật. Không "opacity", không "stagger", không "ease".
 *   · Đặt tên theo thứ MẮT NGƯỜI XEM THẤY, không theo tên biến trong bộ dựng.
 *   · Núm nào cũng phải trả lời được câu "vặn cái này thì cái gì đổi trên màn hình".
 *
 * Đối chiếu với: clipvibe-studio/src/scene/types.ts
 */

/* ---------------------------------------------------------------------------
 * BẪY ĐẶT TÊN — đọc trước khi sửa file này.
 *
 * Trong bộ dựng, `left` nghĩa là món CHẠY SANG TRÁI, tức là nó VÀO TỪ BÊN PHẢI.
 * `right` thì ngược lại. Rất dễ đặt tên lộn. Bảng dưới đây đã đảo cho đúng với
 * mắt người xem — đừng "sửa lại cho khớp tên biến".
 * ------------------------------------------------------------------------- */

/** Kho chuyển động vào. Mỗi ô là một công thức có thật, ghép từ trường sẵn có. */
export const KHO_VAO = [
  { id: 'truot-len',   ten: 'Trượt lên nhẹ',    m: { kind: 'rise', ease: 'out',  dur: 0.55 }, goi: 'chữ, thẻ — kiểu mặc định của nhà' },
  { id: 'truot-len-da',ten: 'Trượt lên có đà',  m: { kind: 'rise', ease: 'back', dur: 0.60 }, goi: 'tiêu đề muốn nhấn' },
  { id: 'buong-xuong', ten: 'Buông xuống',      m: { kind: 'fall', ease: 'out',  dur: 0.55 }, goi: 'món rơi từ trên vào' },
  { id: 'vao-tu-trai', ten: 'Vào từ trái',      m: { kind: 'right',ease: 'out',  dur: 0.55 }, goi: 'thẻ, ảnh vào ngang' },
  { id: 'vao-tu-phai', ten: 'Vào từ phải',      m: { kind: 'left', ease: 'out',  dur: 0.55 }, goi: 'thẻ, ảnh vào ngang' },
  { id: 'bat-nay',     ten: 'Bật nảy',          m: { kind: 'pop',  ease: 'back', dur: 0.60 }, goi: 'huy hiệu, logo, vòng quay' },
  { id: 'no-ra-em',    ten: 'Nở ra êm',         m: { kind: 'pop',  ease: 'out',  dur: 0.70 }, goi: 'ảnh, khối lớn' },
  { id: 'hien-dan',    ten: 'Hiện dần',         m: { kind: 'fade', ease: 'out',  dur: 0.70 }, goi: 'nền, thứ không muốn hút mắt' },
  { id: 'hien-cham',   ten: 'Hiện thật chậm',   m: { kind: 'fade', ease: 'linear', dur: 1.2 }, goi: 'cảnh mở màn' },
  { id: 'dung-im',     ten: 'Đứng im',          m: { kind: 'none', dur: 0.001 },              goi: 'nền giữ nguyên khi sang cảnh' },
];

/** Kho chuyển động ra. */
export const KHO_RA = [
  { id: 'mo-di',       ten: 'Mờ đi',            m: { kind: 'fade', ease: 'inOut', dur: 0.40 }, goi: 'mặc định' },
  { id: 'truot-len-mat',ten: 'Trượt lên rồi mất',m:{ kind: 'rise', ease: 'inOut', dur: 0.45 }, goi: 'nối sang cảnh sau' },
  { id: 'thu-nho',     ten: 'Thu nhỏ lại',      m: { kind: 'pop',  ease: 'inOut', dur: 0.45 }, goi: 'huy hiệu, nút' },
];

/** Kiểu đà — gọi theo cảm giác, không gọi tên hàm toán. */
export const KHO_DA = [
  { v: 'out',    nhan: 'Chậm dần lại' },
  { v: 'inOut',  nhan: 'Êm hai đầu' },
  { v: 'back',   nhan: 'Vượt quá rồi lùi' },
  { v: 'linear', nhan: 'Đều tay' },
];

/** Bảy vùng đặt sẵn. Đây là VÙNG chứ không phải điểm — nó đặt cả chỗ lẫn bề rộng. */
export const KHO_CHO = [
  { v: 'giua', nhan: 'Giữa khung' },
  { v: 'trai', nhan: 'Nửa trái' },
  { v: 'phai', nhan: 'Nửa phải' },
  { v: 'tren', nhan: 'Nửa trên' },
  { v: 'duoi', nhan: 'Nửa dưới' },
  { v: 'cao',  nhan: 'Nhỉnh trên giữa' },
  { v: 'day',  nhan: 'Kín cả khung' },
];

/** Bậc thang 0..7 — TUYỆT ĐỐI không hiện thành px. */
export const TEN_BAC = ['Sát', 'Rất hẹp', 'Hẹp', 'Vừa', 'Thoáng', 'Rộng', 'Rất rộng', 'Tối đa'];

/** Tên loại phần tử, để hiện trên thanh chỉ đường và danh sách lớp. */
export const TEN_LOAI = {
  group: 'Cụm', text: 'Chữ', panel: 'Khối màu', card: 'Thẻ', form: 'Biểu mẫu',
  calendar: 'Lịch', chip: 'Nhãn số', phone: 'Điện thoại', timeline: 'Dòng thời gian',
  logo: 'Logo', image: 'Ảnh', pointer: 'Con trỏ', wheel: 'Vòng quay', chat: 'Cửa sổ AI',
  shield: 'Khiên bảo mật', upload: 'Ô kéo thả', table: 'Bảng', browser: 'Trình duyệt',
  sweep: 'Vệt sáng', nen: 'Nền thương hiệu', huyhieu: 'Huy hiệu', hangnhan: 'Hàng nhãn',
  video: 'Video',
  quydao: 'Quỹ đạo', nut: 'Nút bấm',
};

/*
 * MÀU CHỮ RIÊNG cho từng khối. Bộ dựng đặt `--ink` lên chính nút đó nên con cháu
 * thừa hưởng — vặn ở một cụm là cả cụm đổi màu chữ. Xem `docs/MAU-CHU-RIENG.md`.
 *
 * Trước đây trường này CÓ trong dữ liệu và bộ dựng đọc được, nhưng bảng thuộc
 * tính lại không có núm nào để đặt — nên muốn dùng thì phải sửa tay file JSON.
 * Bảng soát chất lượng bảo người dùng "đặt màu chữ riêng cho món này" mà không
 * có chỗ để đặt thì lời khuyên ấy thành trò đùa.
 */
const MAU_CHU = [
  { id: 'ink', nhan: 'Màu chữ riêng', kieu: 'mau',
    goi: 'bỏ trống = dùng màu chữ chung của clip · đặt ở đây thì cả những gì bên trong cũng đổi theo' },
];

const DAU = [
  { v: '', nhan: '(chữ tự gõ)' },
  { v: 'cup', nhan: 'Cúp' },
  { v: 'bong-den', nhan: 'Bóng đèn' },
  { v: 'dich', nhan: 'Đích ngắm' },
];

/**
 * Núm riêng của từng loại. Núm chung (chỗ đặt, cỡ, thời gian, chuyển động) do
 * bảng thuộc tính tự thêm, không khai lại ở đây.
 */
export const NUM_RIENG = {
  text: [
    { id: 'text', nhan: 'Dòng chính', kieu: 'vanban',
      goi: '*chữ* = tô màu nhấn · | = xuống dòng · [[đường-dẫn.svg]] = chèn logo giữa dòng' },
    { id: 'sub', nhan: 'Câu phụ', kieu: 'chu' },
    { id: 'size', nhan: 'Cỡ chữ', kieu: 'so', min: 10, max: 200, buoc: 1 },
    { id: 'align', nhan: 'Căn', kieu: 'chon', chon: [
      { v: 'left', nhan: 'Trái' }, { v: 'center', nhan: 'Giữa' }, { v: 'right', nhan: 'Phải' }] },
    { id: 'rule', nhan: 'Gạch ngăn', kieu: 'bat', goi: 'gạch ngắn màu nhấn giữa tiêu đề và câu phụ' },
    { id: 'subScale', nhan: 'Cỡ câu phụ', kieu: 'so', min: 0.2, max: 1, buoc: 0.02,
      goi: 'so với dòng chính' },
    { id: 'lineStagger', nhan: 'Hiện từng dòng', kieu: 'so', min: 0, max: 0.6, buoc: 0.01,
      goi: 'giây cách nhau giữa các dòng · 0 = hiện cùng lúc' },
    ...MAU_CHU,
  ],
  nut:      [{ id: 'label', nhan: 'Chữ trên nút', kieu: 'chu' },
             { id: 'size', nhan: 'Cỡ chữ', kieu: 'so', min: 12, max: 120 },
             { id: 'ticks', nhan: 'Đập nhịp', kieu: 'bat',
               goi: '⚠ cả clip chỉ nên có MỘT món đập nhịp' }, ...MAU_CHU],
  image:    [{ id: 'src', nhan: 'File ảnh', kieu: 'anh' },
             { id: 'fit', nhan: 'Cách lấp ô', kieu: 'chon', chon: [
               { v: 'cover', nhan: 'Lấp đầy (cắt bớt)' }, { v: 'contain', nhan: 'Vừa khung (giữ tỉ lệ)' }],
               goi: 'logo thì luôn chọn Vừa khung' },
             { id: 'radius', nhan: 'Bo góc', kieu: 'so', min: 0, max: 80 },
             { id: 'glow', nhan: 'Quầng sáng', kieu: 'bat' },
             { id: 'shine', nhan: 'Vệt sáng quét', kieu: 'so', min: 0, max: 8, buoc: 0.1,
               goi: 'giây một vòng quét · 0 = tắt' }],
  logo:     [{ id: 'name', nhan: 'Tên thương hiệu', kieu: 'chu' },
             { id: 'mark', nhan: 'Dấu hiệu', kieu: 'chu' },
             { id: 'size', nhan: 'Cỡ', kieu: 'so', min: 10, max: 200 }],
  huyhieu:  [{ id: 'mark', nhan: 'Biểu tượng', kieu: 'chon', chon: DAU },
             { id: 'size', nhan: 'Cỡ biểu tượng', kieu: 'so', min: 0.2, max: 1, buoc: 0.02 }],
  hangnhan: [{ id: 'items', nhan: 'Các nhãn', kieu: 'danhsach', goi: 'ngăn nhau bằng dấu chấm giữa' },
             { id: 'size', nhan: 'Cỡ chữ', kieu: 'so', min: 10, max: 90 }],
  chip:     [{ id: 'value', nhan: 'Con số', kieu: 'chu' },
             { id: 'label', nhan: 'Nhãn', kieu: 'chu' },
             { id: 'note', nhan: 'Ghi chú', kieu: 'chu' },
             { id: 'outline', nhan: 'Chỉ viền', kieu: 'bat' }, ...MAU_CHU],
  card:     [{ id: 'title', nhan: 'Tiêu đề thẻ', kieu: 'chu' },
             { id: 'rows', nhan: 'Số dòng', kieu: 'so', min: 0, max: 12 },
             { id: 'button', nhan: 'Chữ trên nút', kieu: 'chu' }, ...MAU_CHU],
  form:     [{ id: 'title', nhan: 'Tiêu đề biểu mẫu', kieu: 'chu' },
             { id: 'dots', nhan: 'Số chấm bước', kieu: 'so', min: 0, max: 8 }],
  table:    [{ id: 'columns', nhan: 'Tên các cột', kieu: 'danhsach' },
             { id: 'rows', nhan: 'Số dòng', kieu: 'so', min: 0, max: 20 }, ...MAU_CHU],
  browser:  [{ id: 'url', nhan: 'Địa chỉ trên thanh', kieu: 'chu' }],
  /*
   * VIDEO. Đặt kín khung thì thành nền động; thu nhỏ lại thì lồng được vào màn
   * hình điện thoại hay khung trình duyệt. Muốn làm nền thì chọn "Chỗ đặt" →
   * "Kín cả khung", và nhớ kéo nó lên ĐẦU danh sách thành phần — thứ tự trong
   * danh sách là thứ tự vẽ, món đứng sau nằm đè lên món đứng trước.
   */
  video:    [{ id: 'src', nhan: 'File video', kieu: 'video' },
             { id: 'fit', nhan: 'Cách lấp ô', kieu: 'chon', chon: [
               { v: 'cover', nhan: 'Lấp đầy (cắt bớt)' }, { v: 'contain', nhan: 'Vừa khung (giữ tỉ lệ)' }],
               goi: 'làm nền thì chọn Lấp đầy' },
             { id: 'blur', nhan: 'Làm mờ', kieu: 'so', min: 0, max: 40,
               goi: 'mờ nền đi thì chữ và thẻ phía trên mới nổi lên · 0 = nét căng' },
             { id: 'dim', nhan: 'Tối đi', kieu: 'so', min: 0, max: 0.9, buoc: 0.05,
               goi: 'phủ một lớp đen mỏng lên trên' },
             { id: 'radius', nhan: 'Bo góc', kieu: 'so', min: 0, max: 80 },
             { id: 'loop', nhan: 'Hết thì chạy lại', kieu: 'bat',
               goi: 'video ngắn hơn cảnh thì bật cái này, không thì nó đứng hình ở khung cuối' },
             { id: 'start', nhan: 'Bắt đầu từ giây', kieu: 'so', min: 0, max: 120, buoc: 0.1,
               goi: 'cắt bỏ đoạn đầu của file' },
             { id: 'rate', nhan: 'Tốc độ phát', kieu: 'so', min: 0.1, max: 3, buoc: 0.1,
               goi: '1 = như thật · 0,5 = chậm một nửa' }],
  chat:     [{ id: 'title', nhan: 'Tiêu đề cửa sổ', kieu: 'chu' },
             { id: 'lines', nhan: 'Các câu thoại', kieu: 'danhsach' },
             { id: 'typing', nhan: 'Câu đang gõ', kieu: 'chu' }],
  shield:   [{ id: 'mark', nhan: 'Dấu trên khiên', kieu: 'chu' },
             { id: 'badges', nhan: 'Nhãn chứng nhận', kieu: 'danhsach' }],
  upload:   [{ id: 'label', nhan: 'Chữ trong ô', kieu: 'chu' },
             { id: 'file', nhan: 'Tên file hiện ra', kieu: 'chu' }],
  timeline: [{ id: 'labels', nhan: 'Các mốc', kieu: 'danhsach' }],
  calendar: [{ id: 'month', nhan: 'Tháng', kieu: 'chu' },
             { id: 'cta', nhan: 'Chữ trên nút', kieu: 'chu' },
             { id: 'days', nhan: 'Số ngày', kieu: 'so', min: 28, max: 31 },
             { id: 'offset', nhan: 'Ngày đầu rơi vào thứ', kieu: 'so', min: 0, max: 6 },
             { id: 'highlight', nhan: 'Ngày tô đậm', kieu: 'so', min: 0, max: 31 }],
  wheel:    [{ id: 'slices', nhan: 'Số nan', kieu: 'so', min: 3, max: 16 },
             { id: 'label', nhan: 'Chữ giữa vòng', kieu: 'chu' },
             { id: 'spin', nhan: 'Tốc độ quay', kieu: 'so', min: 0, max: 10, buoc: 0.1,
               goi: '0 = đứng yên' },
             { id: 'colors', nhan: 'Màu các nan', kieu: 'danhsach' }],
  panel:    [{ id: 'fill', nhan: 'Màu khối', kieu: 'mau' },
             { id: 'radius', nhan: 'Bo góc', kieu: 'so', min: 0, max: 80 }],
  sweep:    [{ id: 'angle', nhan: 'Góc nghiêng', kieu: 'so', min: -90, max: 90 },
             { id: 'width', nhan: 'Bề rộng vệt', kieu: 'so', min: 10, max: 600 },
             { id: 'color', nhan: 'Màu vệt', kieu: 'mau' }],
  phone:    [{ id: 'src', nhan: 'Ảnh trong màn hình', kieu: 'anh' }],
  quydao:   [{ id: 'core', nhan: 'Vật ở tâm', kieu: 'chon', chon: [
               { v: 'cau', nhan: 'Quả cầu' }, { v: 'web', nhan: 'Cửa sổ trình duyệt' },
               { v: 'sao', nhan: 'Ngôi sao' }, { v: 'tim', nhan: 'Ô tìm kiếm' }] },
             { id: 'label', nhan: 'Tên miền hiện trong thẻ', kieu: 'chu' },
             { id: 'query', nhan: 'Chữ gõ trong ô tìm', kieu: 'chu' },
             { id: 'logo', nhan: 'Logo trong thẻ', kieu: 'anh' },
             { id: 'arrow', nhan: 'Mũi tên tăng trưởng', kieu: 'bat' },
             { id: 'warm', nhan: 'Pha màu nóng', kieu: 'bat', goi: 'dùng cho cảnh kêu gọi hành động' }],
  nen:      [{ id: 'parts', nhan: 'Bật những món', kieu: 'nhieu', chon: [
               { v: 'cham', nhan: 'Lưới chấm' }, { v: 'net', nhan: 'Nét mảnh' },
               { v: 'khoi', nhan: 'Khối mềm' }, { v: 'song', nhan: 'Sóng đáy' },
               { v: 'duong', nhan: 'Đường tăng trưởng' }, { v: 'tien', nhan: 'Chồng tiền' }] },
             { id: 'draw', nhan: 'Vẽ dần đường tăng', kieu: 'so', min: 0, max: 5, buoc: 0.1,
               goi: 'giây · 0 = coi như vẽ xong sẵn' },
             { id: 'waveLow', nhan: 'Hạ sóng xuống', kieu: 'bat',
               goi: 'chừa chỗ cho dòng chữ cuối đứng trên nền sáng' }],
  group:    [{ id: 'dir', nhan: 'Xếp theo', kieu: 'chon', chon: [
               { v: 'doc', nhan: 'Dọc (trên xuống)' }, { v: 'ngang', nhan: 'Ngang (trái sang)' }] },
             { id: 'align', nhan: 'Căn ngang', kieu: 'chon', chon: [
               { v: 'dau', nhan: 'Đầu' }, { v: 'giua', nhan: 'Giữa' }, { v: 'cuoi', nhan: 'Cuối' }] },
             { id: 'justify', nhan: 'Căn dọc', kieu: 'chon', chon: [
               { v: 'dau', nhan: 'Đầu' }, { v: 'giua', nhan: 'Giữa' }, { v: 'cuoi', nhan: 'Cuối' }] }, ...MAU_CHU],
  pointer:  [],
};

/** Màu của cả clip. Đổi ở đây là mọi món trỏ vào token đó đổi theo. */
export const NUM_MAU = [
  { id: 'bg',      nhan: 'Nền' },
  { id: 'ink',     nhan: 'Chữ' },
  { id: 'accent',  nhan: 'Màu nhấn' },
  { id: 'accent2', nhan: 'Màu nhấn 2' },
  { id: 'hot',     nhan: 'Màu nóng', goi: 'chỉ dùng cho thứ muốn người ta BẤM' },
  { id: 'hot2',    nhan: 'Màu nóng 2' },
];

/** Bộ màu Mắt Bão — lấy từ chính file logo, không lấy từ Brand Guidelines. */
export const MAU_MAT_BAO = {
  bg: '#0A1F3C', ink: '#E8EDF5', accent: '#00A3FF', accent2: '#4A9EFF',
  hot: '#ED7225', hot2: '#E3272C',
};
