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
  { id: 'thu-tu-lon',  ten: 'Thu lại từ lớn',   m: { kind: 'nen',  ease: 'out',  dur: 1.0 }, goi: 'ảnh, khối lớn — cú đẩy máy của phim' },
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
  { v: 'out',      nhan: 'Chậm dần lại' },
  { v: 'inOut',    nhan: 'Êm hai đầu' },
  { v: 'back',     nhan: 'Vượt quá rồi lùi' },
  { v: 'linear',   nhan: 'Đều tay' },
  /* Bốn kiểu trên là của nhà, cả kho clip đang dùng — đừng đổi thứ tự hay tên.
     Tám kiểu dưới vẽ bằng đường cong bốn điểm, cho tay nghề cao hơn một bậc. */
  { v: 'mem',      nhan: 'Mềm — êm, không tính cách' },
  { v: 'ra-cham',  nhan: 'Vọt đi rồi hãm — hợp với chữ' },
  { v: 'vao-cham', nhan: 'Rời chỗ chậm rồi lao tới' },
  { v: 'hai-dau',  nhan: 'Nhanh ở giữa, chậm hai đầu' },
  { v: 'manh',     nhan: 'Bật rất nhanh rồi trôi' },
  { v: 'ghim',     nhan: 'Dứt khoát, đóng đinh hai đầu' },
  { v: 'nay',      nhan: 'Nhún ngược rồi vọt qua' },
  { v: 'vot',      nhan: 'Vọt quá đích rồi lùi về' },
];

/** Cách một món hiện ra theo HÌNH, thay vì chỉ mờ dần. */
export const KHO_MAT_NA = [
  { v: 'khong',      nhan: 'Không che' },
  { v: 'tron',       nhan: 'Cắt tròn' },
  { v: 'no-tron',    nhan: 'Nở tròn từ giữa' },
  { v: 'quet-phai',  nhan: 'Quét sang phải' },
  { v: 'quet-trai',  nhan: 'Quét sang trái' },
  { v: 'quet-len',   nhan: 'Quét lên trên' },
  { v: 'quet-xuong', nhan: 'Quét xuống dưới' },
];

/** Cách màu của món ăn vào thứ nằm dưới nó. */
export const KHO_HOA = [
  { v: 'thuong',   nhan: 'Dán đè như thường' },
  { v: 'nhan',     nhan: 'Ăn vào nền (tối đi)' },
  { v: 'sang',     nhan: 'Loé lên (sáng ra)' },
  { v: 'phu',      nhan: 'Phủ lên, giữ chất nền' },
  { v: 'toi',      nhan: 'Chỉ giữ chỗ tối hơn' },
  { v: 'sang-hon', nhan: 'Chỉ giữ chỗ sáng hơn' },
  { v: 'chenh',    nhan: 'Đảo màu chỗ chồng nhau' },
  { v: 'cong',     nhan: 'Cộng ánh sáng' },
];

/** Kiểu chạy của từng chữ cái. */
export const KHO_CHU_CHAY = [
  { v: 'rise', nhan: 'Nhô lên' },
  { v: 'roi',  nhan: 'Rơi xuống' },
  { v: 'pop',  nhan: 'Bật nở' },
  { v: 'xoay', nhan: 'Xoay vào' },
  { v: 'nhoe', nhan: 'Nét dần từ nhoè' },
  { v: 'go',   nhan: 'Gõ như máy đánh chữ' },
  { v: 'fade', nhan: 'Chỉ hiện dần' },
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
/**
 * ĐỆM TRONG và KHE HỞ — loại nào THẬT SỰ nghe, và bộ dựng lấy bậc mấy làm mặc định.
 *
 * Hai bảng này sinh ra từ một lỗi lặng lẽ: bảng thuộc tính bày núm "Đệm trong"
 * cho CẢ 24 loại, trong khi bộ dựng chỉ đọc `pad` ở 8 loại. Mười sáu núm còn lại
 * bấm vào thì số trong kịch bản có đổi, mà khung hình không nhúc nhích — đúng
 * kiểu hỏng tệ nhất, vì nó trông như đang chạy. Chiều ngược lại cũng sai: `gap`
 * chạy được ở 11 loại nhưng chỉ `group` được bày núm, nên khe hở giữa các dòng
 * trong một tấm thẻ là thứ có thật mà không ai chỉnh tới được.
 *
 * Con số là BẬC 0..7 (xem `TEN_BAC`), không phải điểm ảnh — đổi "Độ thoáng cả
 * clip" là mọi bậc giãn theo.
 *
 * SỐ MẶC ĐỊNH PHẢI ĐÚNG. Trước đây núm luôn hiện bậc 0 khi kịch bản chưa khai,
 * trong khi tấm thẻ thật đang đệm bậc 5 — núm nói dối, và người dùng bấm vào
 * bậc 0 tưởng "giữ nguyên" thì thẻ co lại.
 *
 * Đo thật bằng Chromium, không đọc code mà đoán: dựng một cảnh có đủ 24 loại,
 * vặn bậc 0 → 7 rồi đo lại `padding`/`gap` của từng nút. `tools/kiem-dem-khe.mjs`
 * chạy đúng phép đo đó, nên bộ dựng đổi là bài kiểm biết ngay.
 */
export const DEM_TRONG = {
  group: 0, card: 5, form: 5, calendar: 5, chip: 4, timeline: 2, chat: 4, upload: 5,
};

export const KHE_HO = {
  group: 4, text: 3, card: 3, form: 4, calendar: 3, chip: 1,
  logo: 3, chat: 3, shield: 4, upload: 3, hangnhan: 4,
};

/** Núm khe hở gọi tên khác nhau tuỳ loại — "các phần" chỉ đúng với cụm. */
export const NHAN_KHE_HO = {
  group: 'Khoảng cách giữa các phần',
  text: 'Khoảng cách giữa các dòng',
  hangnhan: 'Khoảng cách giữa các nhãn',
};

/**
 * HIỆU ỨNG HÌNH — nhoè, bóng đổ, đẩy máy chậm.
 *
 * Ba thứ làm một clip trông "điện ảnh" hơn mà không phải vẽ lại gì: chiều sâu
 * (nhoè hậu cảnh), khối (bóng đổ), và máy quay không bao giờ đứng chết (đẩy máy
 * rất chậm suốt cảnh).
 *
 * Tất cả đều là BẬC, không phải điểm ảnh — đổi khổ clip thì hiệu ứng giãn theo.
 * Và tất cả đều lái bằng `t` của clip, KHÔNG bằng animation của CSS: bộ xuất
 * video nhảy thẳng tới từng mốc giây, dùng CSS là mỗi lần xuất ra một khung
 * khác nhau. Xem `docs/HIEU-UNG-HINH.md`.
 *
 * Áp được cho MỌI loại phần tử — `filter` của trình duyệt không kén loại.
 */
export const BAC_NHOE  = ['Không', 'Rất nhẹ', 'Nhẹ', 'Vừa', 'Đậm', 'Rất đậm'];
export const BAC_BONG  = ['Không', 'Rất nhẹ', 'Nhẹ', 'Vừa', 'Đậm', 'Rất đậm'];
export const BAC_DAY   = ['Không', 'Rất chậm', 'Chậm', 'Vừa', 'Rõ'];

export const NUM_HIEU_UNG = [
  { id: 'soft',   nhan: 'Làm nhoè',        kieu: 'bac', bac: BAC_NHOE },
  { id: 'softIn', nhan: 'Nét dần khi vào', kieu: 'bac', bac: BAC_NHOE },
  { id: 'shadow', nhan: 'Bóng đổ',         kieu: 'bac', bac: BAC_BONG },
  { id: 'push',   nhan: 'Đẩy máy chậm',    kieu: 'bac', bac: BAC_DAY },
  { id: 'pushOut', nhan: 'Đẩy ra thay vì đẩy vào', kieu: 'bat' },
  { id: 'blend',  nhan: 'Hoà vào nền',     kieu: 'chon', chon: KHO_HOA },
  { id: 'mask',   nhan: 'Hiện ra theo hình', kieu: 'chon', chon: KHO_MAT_NA },
  { id: 'maskSoft', nhan: 'Nhoè mép chỗ cắt', kieu: 'bac', bac: BAC_NHOE },
  { id: 'maskSrc', nhan: 'Cắt theo ảnh riêng', kieu: 'anh' },
];

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
    { id: 'charStagger', nhan: 'Hiện từng chữ cái', kieu: 'so', min: 0, max: 0.3, buoc: 0.005 },
    { id: 'charIn', nhan: 'Kiểu chạy của chữ cái', kieu: 'chon', chon: KHO_CHU_CHAY },
    { id: 'charDur', nhan: 'Mỗi chữ cái chạy trong', kieu: 'so', min: 0.05, max: 1.2, buoc: 0.01 },
    { id: 'charEase', nhan: 'Đà của chữ cái', kieu: 'chon', chon: KHO_DA },
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
  browser:  [{ id: 'url', nhan: 'Địa chỉ trên thanh', kieu: 'chu' },
             { id: 'src', nhan: 'Ảnh hoặc video trong cửa sổ', kieu: 'hinh',
               goi: 'bỏ trống thì hiện mấy vạch giả như trang đang tải' },
             { id: 'loop', nhan: 'Phát lặp lại', kieu: 'bat' }],
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
  phone:    [{ id: 'src', nhan: 'Ảnh hoặc video trong màn hình', kieu: 'hinh' },
             { id: 'loop', nhan: 'Phát lặp lại', kieu: 'bat' }],
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

/* ===========================================================================
 * SỔ HƯỚNG DẪN TẠI CHỖ
 *
 * Mỗi núm một cặp: `tieuDe` (tên + công dụng cốt lõi, dưới 6 từ) và `mota`
 * (1–2 câu tả cơ chế, dưới 35 từ). Bảng thuộc tính tự dựng nút hỏi từ đây —
 * thêm hướng dẫn cho núm mới là viết thêm một dòng ở đây, KHÔNG đụng UI code.
 *
 * Luật viết, giống hệt phần trên của file này:
 *   · Không từ kỹ thuật. Không "opacity", không "easing", không "padding".
 *   · Tả thứ MẮT NGƯỜI XEM THẤY đổi, không tả tên biến trong bộ dựng.
 *   · Nói luôn cái bẫy nếu núm đó có bẫy — đó mới là chỗ người dùng cần cứu.
 * ======================================================================== */

const HUONG_DAN = {
  /* ---------- chữ ---------- */
  'text.text': { tieuDe: 'Dòng chữ chính',
    mota: 'Chữ to nhất của món. Bọc một đoạn trong dấu sao để tô màu nhấn, gõ dấu gạch đứng để xuống dòng đúng chỗ mình muốn.' },
  'text.sub': { tieuDe: 'Câu phụ dưới dòng chính',
    mota: 'Dòng nhỏ nằm ngay dưới, cỡ chữ tự tính theo dòng chính. Bỏ trống thì không hiện gì cả.' },
  'text.size': { tieuDe: 'Cỡ chữ trên khung hình',
    mota: 'Tính theo khung hình của clip chứ không theo màn hình. Clip dọc 720 rộng thì cỡ 48 đã là một dòng tiêu đề lớn.' },
  'text.align': { tieuDe: 'Căn chữ trái, giữa hay phải',
    mota: 'Căn trong bề rộng của chính món chữ. Món đang dùng vùng đặt sẵn thì bề rộng là cả vùng đó.' },
  'text.rule': { tieuDe: 'Gạch ngắn ngăn hai dòng',
    mota: 'Chèn một gạch ngắn màu nhấn giữa dòng chính và câu phụ. Dùng khi hai dòng nói hai ý khác nhau.' },
  'text.subScale': { tieuDe: 'Câu phụ nhỏ bằng bao nhiêu',
    mota: 'Một phần mấy của dòng chính. Để 0,34 là câu phụ nhỏ bằng một phần ba — mức dễ đọc mà không tranh chỗ.' },
  'text.lineStagger': { tieuDe: 'Hiện lần lượt từng dòng',
    mota: 'Số giây cách nhau giữa các dòng. Bật cái này thì món KHÔNG chạy hiệu ứng bay vào chung nữa, từng dòng tự hiện lấy.' },
  'text.charStagger': { tieuDe: 'Hiện lần lượt từng chữ cái',
    mota: 'Số giây cách nhau giữa hai chữ cái. Để 0,03 là một dòng tiêu đề chạy hết trong khoảng một giây. Bật cái này thì hiện từng dòng bị bỏ qua.' },
  'text.charIn': { tieuDe: 'Từng chữ cái chạy kiểu gì',
    mota: 'Nhô lên là kiểu an toàn nhất, hợp mọi tiêu đề. Gõ như máy đánh chữ hợp với dòng lệnh. Xoay vào và Bật nở rất mạnh, chỉ nên dùng một lần.' },
  'text.charDur': { tieuDe: 'Một chữ chạy bao lâu',
    mota: 'Tính bằng giây, cho riêng một chữ cái chứ không phải cả dòng. Để dài hơn khoảng cách giữa hai chữ thì các chữ chồng nhịp thành một làn sóng.' },
  'text.charEase': { tieuDe: 'Đà của từng chữ cái',
    mota: 'Chọn "Vọt đi rồi hãm" cho chữ là hợp nhất: chữ bung ra ngay rồi đứng lại nhẹ, giống cách chữ rơi xuống giấy. Tránh "Đều tay" — nó làm chữ trông như máy đẩy.' },

  /* ---------- nút bấm ---------- */
  'nut.label': { tieuDe: 'Chữ trên nút',
    mota: 'Nên là một hành động ngắn: "Khám phá ngay", "Dùng thử". Nút dài quá thì chữ co lại và mất vẻ dứt khoát.' },
  'nut.size': { tieuDe: 'Cỡ chữ trong nút',
    mota: 'Nút tự nở theo chữ, nên đổi cỡ chữ là đổi luôn cả kích thước nút.' },
  'nut.ticks': { tieuDe: 'Cho nút đập nhịp',
    mota: 'Nút phồng lên xẹp xuống đều đặn để hút mắt. Cả clip chỉ nên có MỘT món đập nhịp — nhiều thứ cùng động thì chẳng thứ nào nổi.' },

  /* ---------- ảnh ---------- */
  'image.src': { tieuDe: 'File ảnh trong dự án',
    mota: 'Đường dẫn tính từ gốc dự án clip, ví dụ public/image/logo.png.' },
  'image.fit': { tieuDe: 'Ảnh lấp đầy hay vừa khung',
    mota: 'Lấp đầy thì ảnh phủ kín ô và bị cắt bớt hai bên. Vừa khung thì thấy trọn ảnh — logo luôn phải chọn Vừa khung, không thì mất chữ.' },
  'image.radius': { tieuDe: 'Bo tròn góc ảnh',
    mota: 'Số càng lớn góc càng tròn. Để 0 là góc vuông.' },
  'image.glow': { tieuDe: 'Quầng sáng sau ảnh',
    mota: 'Lót một vầng sáng mềm phía sau để ảnh tách khỏi thứ đứng sau lưng nó. Hợp với logo đặt trên nền nhiều chi tiết.' },
  'image.shine': { tieuDe: 'Vệt sáng quét qua ảnh',
    mota: 'Số giây cho một vòng quét. Quét một nhát rồi nghỉ chứ không quét liên tục — quét mãi thì thành đèn nhấp nháy, mắt bỏ qua ngay.' },

  /* ---------- logo, huy hiệu, hàng nhãn ---------- */
  'logo.name': { tieuDe: 'Tên thương hiệu',
    mota: 'Chữ đứng cạnh dấu hiệu.' },
  'logo.mark': { tieuDe: 'Dấu hiệu đứng trước tên',
    mota: 'Một hai chữ cái viết tắt, hiện trong ô vuông bo góc màu nhấn.' },
  'logo.size': { tieuDe: 'Cỡ cả cụm logo',
    mota: 'Đổi một số thì cả dấu hiệu lẫn chữ to nhỏ theo, không lệch nhau.' },
  'huyhieu.mark': { tieuDe: 'Biểu tượng trong huy hiệu',
    mota: 'Chọn một hình có sẵn, hoặc để trống rồi tự gõ chữ vào giữa.' },
  'huyhieu.size': { tieuDe: 'Cỡ hình trong huy hiệu',
    mota: 'Phần trăm so với vòng tròn bao ngoài. Số nhỏ thì hình co lại, chừa nhiều khoảng trống quanh nó.' },
  'hangnhan.items': { tieuDe: 'Các nhãn trên một hàng',
    mota: 'Mỗi dòng một nhãn, khi hiện ra chúng nằm cùng hàng và ngăn nhau bằng dấu chấm giữa.' },
  'hangnhan.size': { tieuDe: 'Cỡ chữ của hàng nhãn',
    mota: 'Hàng nhãn là chữ phụ, nên để nhỏ hơn hẳn dòng chính thì bố cục mới có trên có dưới.' },

  /* ---------- nhãn số, thẻ, bảng, biểu mẫu ---------- */
  'chip.value': { tieuDe: 'Con số nổi bật',
    mota: 'Phần chữ to nhất của nhãn, thường là con số hoặc phần trăm.' },
  'chip.label': { tieuDe: 'Nhãn dưới con số',
    mota: 'Câu ngắn nói con số đó là cái gì.' },
  'chip.note': { tieuDe: 'Ghi chú nhỏ thêm',
    mota: 'Dòng nhỏ nhất, dùng cho chú thích kiểu "so với tháng trước".' },
  'chip.outline': { tieuDe: 'Chỉ vẽ viền, bỏ nền',
    mota: 'Nhãn thành trong suốt chỉ còn đường viền. Dùng khi đặt trên nền đã nhiều màu, đỡ chồng khối lên nhau.' },
  'card.title': { tieuDe: 'Tiêu đề trên thẻ',
    mota: 'Dòng đậm trên cùng của thẻ.' },
  'card.rows': { tieuDe: 'Số dòng giả trong thẻ',
    mota: 'Mấy vạch xám tượng trưng cho nội dung. Đây là thẻ minh hoạ giao diện nên không gõ chữ thật vào từng dòng.' },
  'card.button': { tieuDe: 'Chữ trên nút của thẻ',
    mota: 'Bỏ trống thì thẻ không có nút.' },
  'table.columns': { tieuDe: 'Tên các cột',
    mota: 'Mỗi dòng một tên cột. Số cột quyết định bề rộng chia đều trong bảng.' },
  'table.rows': { tieuDe: 'Số dòng giả trong bảng',
    mota: 'Các dòng vẽ bằng vạch xám, dùng để gợi hình một bảng dữ liệu chứ không phải để điền số thật.' },
  'form.title': { tieuDe: 'Tiêu đề biểu mẫu',
    mota: 'Dòng trên cùng của khối biểu mẫu.' },
  'form.dots': { tieuDe: 'Số chấm chỉ bước',
    mota: 'Dãy chấm nhỏ cho thấy biểu mẫu có mấy bước, kiểu "bước 2 trên 4".' },

  /* ---------- trình duyệt, điện thoại, dòng thời gian ---------- */
  'browser.url': { tieuDe: 'Địa chỉ trên thanh',
    mota: 'Chữ hiện trong thanh địa chỉ của khung trình duyệt giả.' },
  'browser.src': { tieuDe: 'Hình trong cửa sổ',
    mota: 'Thả ảnh hoặc đoạn phim lấp đầy thân cửa sổ. Bỏ trống thì hiện mấy vạch xám như trang đang tải dở.' },
  'browser.loop': { tieuDe: 'Hết thì quay lại đầu',
    mota: 'Phim ngắn hơn cảnh thì cứ chạy vòng. Tắt đi thì nó dừng ở khung cuối và đứng yên tới hết cảnh.' },
  'phone.src': { tieuDe: 'Hình trong màn hình máy',
    mota: 'Thả ảnh hoặc đoạn phim vào màn hình. Nó được cắt vừa khít, khung máy vẽ sẵn bao quanh.' },
  'phone.loop': { tieuDe: 'Hết thì quay lại đầu',
    mota: 'Phim ngắn hơn cảnh thì cứ chạy vòng. Tắt đi thì nó dừng ở khung cuối và đứng yên tới hết cảnh.' },
  'timeline.labels': { tieuDe: 'Các mốc trên dòng thời gian',
    mota: 'Mỗi dòng một mốc. Chúng được rải đều trên một đường ngang, có chấm đánh dấu từng mốc.' },

  /* ---------- video ---------- */
  'video.src': { tieuDe: 'File video làm nền',
    mota: 'Chọn file trong thư mục video của dự án. File nào trình duyệt không mở được sẽ báo ngay kèm nút chuyển đổi.' },
  'video.fit': { tieuDe: 'Video lấp đầy hay vừa khung',
    mota: 'Làm nền thì chọn Lấp đầy để không hở mép. Vừa khung dùng khi muốn thấy trọn khuôn hình gốc.' },
  'video.blur': { tieuDe: 'Làm mờ nền động',
    mota: 'Mờ nền đi thì chữ và thẻ phía trên mới nổi lên. Để 0 là nét căng — chỉ hợp khi phía trên không có chữ.' },
  'video.dim': { tieuDe: 'Phủ lớp đen lên video',
    mota: 'Kéo lên cho nền tối lại. Cách nhanh nhất để cứu một dòng chữ trắng đang chìm vào chỗ sáng của video.' },
  'video.radius': { tieuDe: 'Bo tròn góc khung video',
    mota: 'Để 0 khi làm nền phủ kín; bo góc khi lồng video vào trong một khung nhỏ.' },
  'video.loop': { tieuDe: 'Hết thì chạy lại từ đầu',
    mota: 'Video ngắn hơn cảnh thì phải bật, không thì nó đứng hình ở khung cuối và người xem tưởng treo.' },
  'video.start': { tieuDe: 'Bắt đầu từ giây thứ mấy',
    mota: 'Cắt bỏ đoạn đầu của file. Dùng khi mấy giây đầu của video chưa đẹp.' },
  'video.rate': { tieuDe: 'Tốc độ phát video',
    mota: 'Để 1 là như thật, 0,5 là chậm một nửa. Nền động chạy chậm thường dễ nhìn hơn vì nó không tranh mắt với chữ.' },

  /* ---------- cửa sổ AI, khiên, ô kéo thả ---------- */
  'chat.title': { tieuDe: 'Tiêu đề cửa sổ trò chuyện',
    mota: 'Chữ trên thanh đầu cửa sổ.' },
  'chat.lines': { tieuDe: 'Các câu đã nói',
    mota: 'Mỗi dòng một bong bóng thoại, xếp lần lượt từ trên xuống.' },
  'chat.typing': { tieuDe: 'Câu đang được gõ dở',
    mota: 'Hiện trong ô nhập kèm con trỏ nháy, để thấy cuộc trò chuyện vẫn đang diễn ra.' },
  'shield.mark': { tieuDe: 'Dấu trên mặt khiên',
    mota: 'Một hai ký tự nằm giữa khiên.' },
  'shield.badges': { tieuDe: 'Nhãn chứng nhận quanh khiên',
    mota: 'Mỗi dòng một nhãn, bay quanh khiên như huy hiệu chứng nhận.' },
  'upload.label': { tieuDe: 'Chữ trong ô kéo thả',
    mota: 'Câu mời kéo file vào, ví dụ "Kéo file vào đây".' },
  'upload.file': { tieuDe: 'Tên file sau khi thả',
    mota: 'Bỏ trống thì ô vẫn ở trạng thái đang chờ, chưa có file nào.' },

  /* ---------- lịch, vòng quay ---------- */
  'calendar.month': { tieuDe: 'Tên tháng trên lịch',
    mota: 'Chữ ở đầu tấm lịch.' },
  'calendar.cta': { tieuDe: 'Chữ trên nút của lịch',
    mota: 'Nút nhỏ dưới tấm lịch, thường là lời mời đặt hẹn.' },
  'calendar.days': { tieuDe: 'Số ngày trong tháng',
    mota: 'Quyết định lịch có bao nhiêu ô.' },
  'calendar.offset': { tieuDe: 'Mùng một rơi vào thứ mấy',
    mota: 'Đẩy ô đầu tiên sang phải chừng này cột, để hàng ngày trong tuần khớp với lịch thật.' },
  'calendar.highlight': { tieuDe: 'Ngày được tô đậm',
    mota: 'Một ngày duy nhất được khoanh màu nhấn. Để 0 là không tô ngày nào.' },
  'wheel.slices': { tieuDe: 'Số nan của vòng quay',
    mota: 'Vòng chia đều thành chừng này phần.' },
  'wheel.label': { tieuDe: 'Chữ trong nút giữa vòng',
    mota: 'Chữ nằm trên cái nút tròn ở tâm.' },
  'wheel.spin': { tieuDe: 'Cho vòng quay tít',
    mota: 'Số càng lớn quay càng nhanh. Để 0 là vòng đứng yên.' },
  'wheel.colors': { tieuDe: 'Màu các nan',
    mota: 'Mỗi dòng một mã màu, dùng lặp vòng cho tới hết số nan. Bỏ trống thì dùng bộ màu sẵn có.' },

  /* ---------- khối màu, vệt sáng ---------- */
  'panel.fill': { tieuDe: 'Màu của khối',
    mota: 'Khối màu hay được dùng làm nền cho chữ đặt lên trên. Nhớ chọn màu chữ đủ tương phản với nó.' },
  'panel.radius': { tieuDe: 'Bo tròn góc khối',
    mota: 'Số càng lớn góc càng tròn.' },
  'sweep.angle': { tieuDe: 'Góc nghiêng của vệt sáng',
    mota: 'Độ nghiêng so với phương ngang. Vệt chéo nhìn động hơn vệt thẳng đứng.' },
  'sweep.width': { tieuDe: 'Bề rộng vệt sáng',
    mota: 'Vệt hẹp thì như tia loé, vệt rộng thì như một luồng sáng quét chậm qua khung.' },
  'sweep.color': { tieuDe: 'Màu vệt sáng',
    mota: 'Vệt sáng chỉ nổi trên nền tối. Trên nền sáng thì gần như không thấy.' },

  /* ---------- quỹ đạo ---------- */
  'quydao.core': { tieuDe: 'Vật nằm ở tâm quỹ đạo',
    mota: 'Thứ đứng giữa, có mấy vòng elip nét đứt quay quanh nó.' },
  'quydao.label': { tieuDe: 'Tên miền hiện trong thẻ',
    mota: 'Phần đuôi của tên miền được tách ra và hiện to trong tấm thẻ.' },
  'quydao.query': { tieuDe: 'Chữ gõ trong ô tìm kiếm',
    mota: 'Bỏ trống thì ô tìm kiếm để trống.' },
  'quydao.logo': { tieuDe: 'Logo bày trong thẻ',
    mota: 'Có logo thì thẻ hiện logo thay cho phần đuôi tên miền viết bằng chữ.' },
  'quydao.arrow': { tieuDe: 'Mũi tên đi lên',
    mota: 'Thêm một mũi tên tăng trưởng. Dùng cho cảnh nói về đà đi lên.' },
  'quydao.warm': { tieuDe: 'Pha màu nóng vào quỹ đạo',
    mota: 'Đổi vòng và quả cầu sang tông nóng. Để dành cho cảnh kêu gọi hành động ở cuối clip.' },

  /* ---------- nền thương hiệu ---------- */
  'nen.parts': { tieuDe: 'Bật tắt từng món đồ nền',
    mota: 'Nền thương hiệu gom sẵn lưới chấm, nét mảnh, khối mềm, sóng đáy. Tắt bớt khi cảnh đã nhiều chi tiết.' },
  'nen.draw': { tieuDe: 'Vẽ dần đường tăng trưởng',
    mota: 'Số giây để nét vẽ chạy hết. Để 0 khi cảnh này nối tiếp cảnh trước — coi như đã vẽ xong từ trước.' },
  'nen.waveLow': { tieuDe: 'Hạ dải sóng xuống thấp',
    mota: 'Đẩy sóng đáy xuống để chừa chỗ cho dòng chữ cuối đứng trên phần nền sáng.' },

  /* ---------- cụm ---------- */
  'group.dir': { tieuDe: 'Cụm xếp dọc hay ngang',
    mota: 'Xếp dọc là các món chồng lên nhau từ trên xuống; xếp ngang là nằm cạnh nhau từ trái sang.' },
  'group.align': { tieuDe: 'Căn các món theo chiều ngang',
    mota: 'Cụm xếp dọc thì đây là căn trái, giữa hay phải cho tất cả các món trong cụm.' },
  'group.justify': { tieuDe: 'Căn các món theo chiều dọc',
    mota: 'Quyết định cả chồng món dồn lên trên, nằm giữa, hay tụt xuống dưới trong khoảng cụm chiếm.' },

  /* ---------- màu chữ riêng, dùng chung cho nhiều loại ---------- */
  ink: { tieuDe: 'Màu chữ riêng cho món này',
    mota: 'Bỏ trống là dùng màu chữ chung của clip. Đặt ở đây thì mọi thứ bên trong món cũng đổi màu theo — cách cứu chữ bị chìm vào nền.' },
};

/* Núm `ink` khai chung một chỗ nên gắn cho mọi loại có nó. */
for (const ds of Object.values(NUM_RIENG)) {
  for (const n of ds) if (n.id === 'ink' && !n.huongDan) n.huongDan = HUONG_DAN.ink;
}
for (const [khoa, hd] of Object.entries(HUONG_DAN)) {
  if (!khoa.includes('.')) continue;
  const [loai, id] = khoa.split('.');
  const num = (NUM_RIENG[loai] || []).find((n) => n.id === id);
  // Khoá sai chính tả thì im lặng trôi mất — kêu lên để còn sửa.
  if (!num) console.warn(`[schema] hướng dẫn "${khoa}" không khớp núm nào`);
  else num.huongDan = hd;
}

/**
 * Hướng dẫn cho NÚM CHUNG — thứ bảng thuộc tính tự thêm cho mọi loại phần tử,
 * nên không khai được trong `NUM_RIENG`. Khoá theo `id` của núm.
 */
export const HUONG_DAN_CHUNG = {
  mocChuyenDong: { tieuDe: 'Tự đặt mốc chuyển động',
    mota: 'Thay vì chọn một hiệu ứng bay có sẵn, bạn đặt mốc cho từng lúc: giây này món ở đâu, giây kia thế nào. Bật lên thì hiệu ứng vào và ra nghỉ hẳn.' },
  in: { tieuDe: 'Cách món xuất hiện',
    mota: 'Chọn kiểu món bay vào khi tới lượt nó. "Nở ra êm" phóng món to dần từ tâm ra, "Trượt lên nhẹ" đẩy món từ dưới lên — kiểu mặc định của nhà.' },
  out: { tieuDe: 'Cách món biến đi',
    mota: 'Chỉ chạy khi món có hẹn giờ biến, hoặc khi sang cảnh mới. Bỏ trống là dùng kiểu mờ dần mặc định.' },
  cachDat: { tieuDe: 'Đặt sẵn hay tự đặt chỗ',
    mota: 'Đặt sẵn thì bộ dựng lo chỗ theo vùng, đổi khổ clip vẫn đúng. Tự đặt thì bạn kéo tay — chính xác hơn nhưng đổi khổ là phải chỉnh lại.' },
  at: { tieuDe: 'Chờ rồi mới hiện',
    mota: 'Số giây món nằm im chưa xuất hiện, tính từ đầu cảnh. Đây là thứ làm nên nhịp: cho các món vào lệch nhau thay vì ùa ra một lượt.' },
  for: { tieuDe: 'Ở lại trong bao lâu',
    mota: 'Hiện chừng này giây rồi biến. Bỏ trống là ở tới hết cảnh — phần lớn trường hợp cứ bỏ trống.' },
  dur: { tieuDe: 'Hiệu ứng chạy nhanh hay chậm',
    mota: 'Số giây để món vào xong. Nhỏ thì dứt khoát, lớn thì mềm mại. Dưới 0,3 giây gần như không kịp thấy chuyển động.' },
  ease: { tieuDe: 'Kiểu lấy đà của chuyển động',
    mota: 'Chậm dần lại là mặc định của nhà, hợp mọi chỗ. Vượt quá rồi lùi cho cảm giác nảy, hợp huy hiệu và nút.' },
  dist: { tieuDe: 'Món đi xa hay gần',
    mota: 'Quãng đường món trượt khi bay vào. Bỏ trống thì bộ dựng tự chọn theo cỡ khung — thường là vừa nhất.' },
  place: { tieuDe: 'Vùng đặt sẵn trên khung',
    mota: 'Đây là VÙNG chứ không phải một điểm: nó đặt cả chỗ lẫn bề rộng. Nhờ vậy đổi khổ clip thì bố cục vẫn đúng.' },
  pad: { tieuDe: 'Khoảng thở bên trong món',
    mota: 'Nới rộng khoảng trống giữa viền món và nội dung bên trong. Đo bằng bậc chứ không bằng điểm ảnh, nên đổi độ thoáng cả clip là nó giãn theo.' },
  gap: { tieuDe: 'Khe hở giữa các món',
    mota: 'Cũng đo bằng bậc. Một núm này làm mọi khe trong cụm giãn đều, không chỗ nào dính nhau.' },
  margin: { tieuDe: 'Lề chừa quanh mép khung',
    mota: 'Khoảng cách tối thiểu từ món tới mép khung hình. Chừa đủ thì trên điện thoại không bị góc bo hay thanh trạng thái che mất.' },
  opacity: { tieuDe: 'Độ mờ của món',
    mota: 'Để 1 là rõ hẳn, kéo xuống cho món chìm bớt. Hay dùng để hạ đồ trang trí xuống làm nền.' },
  rotate: { tieuDe: 'Nghiêng món đi một góc',
    mota: 'Đây là một góc CỐ ĐỊNH, không phải chuyển động xoay. Món nghiêng rồi đứng yên ở đó.' },
  duration: { tieuDe: 'Cảnh này dài bao lâu',
    mota: 'Số giây của riêng cảnh. Nhớ để đủ dài cho mọi món kịp bay vào xong — bảng soát sẽ báo nếu thiếu.' },
  stagger: { tieuDe: 'Các món vào so le nhau',
    mota: 'Món sau vào chậm hơn món trước chừng này giây. Đây là thứ làm chuyển động bớt máy móc — bỏ đi là cả cảnh ùa ra một lượt.' },
  src: { tieuDe: 'File đặt vào khe này',
    mota: 'Nhận cả ảnh lẫn phim — máy tự nhận ra theo đuôi file. Phim đặt vào đây chạy theo đồng hồ của clip, tua tới đâu phim ở đó.' },
  loop: { tieuDe: 'Hết thì quay lại từ đầu',
    mota: 'Phim ngắn hơn cảnh thì cứ chạy vòng cho tới hết cảnh. Tắt đi thì phim dừng ở khung cuối và đứng yên tới hết.' },
  soft: { tieuDe: 'Làm nhoè món này',
    mota: 'Đẩy món ra sau bằng cách làm nó nhoè đi. Dùng cho hậu cảnh, để mắt người xem dính vào thứ còn sắc nét ở trước.' },
  softIn: { tieuDe: 'Nét dần khi vào',
    mota: 'Món vào khung còn nhoè rồi rõ dần, như ống kính vừa lấy nét xong. Hợp với ảnh và khối lớn mở đầu một cảnh.' },
  shadow: { tieuDe: 'Bóng đổ dưới món',
    mota: 'Nâng món lên khỏi nền, cho nó dày và có khối. Bóng bám theo đúng hình món nên logo hay ảnh khoét nền vẫn đúng viền.' },
  push: { tieuDe: 'Đẩy máy chậm suốt cảnh',
    mota: 'Phóng rất chậm suốt cảnh nên mắt không bắt được, chỉ thấy hình như đang thở. Đây là thứ tách một đoạn phim khỏi một tấm ảnh đứng yên.' },
  blend: { tieuDe: 'Cho món ăn vào nền',
    mota: 'Bình thường món dán đè lên nền như miếng giấy. Cho hoà vào thì màu của nó trộn với màu bên dưới: chữ ăn vào chất liệu, vệt sáng thành ánh sáng thật.' },
  mask: { tieuDe: 'Hiện ra theo hình',
    mota: 'Thay vì mờ dần, món bị che rồi lộ dần ra theo hình. Các kiểu Quét và Nở tròn chạy theo nhịp vào của món, xong nhịp thì mép sắc lại.' },
  maskSoft: { tieuDe: 'Nhoè mép chỗ bị cắt',
    mota: 'Mép cắt sắc lẹm trông như bị dao cứa. Nhoè nhẹ một chút là chỗ nối mềm đi và mắt không bắt được đường cắt. Để đậm quá thì món tan ra như sương.' },
  maskSrc: { tieuDe: 'Cắt theo một ảnh khuôn',
    mota: 'Chọn một ảnh làm khuôn: chỗ nào trong ảnh đặc thì chỗ đó của món hiện ra, chỗ trong suốt thì bị cắt đi. Dùng để cắt theo hình thù bất kỳ.' },
  pushOut: { tieuDe: 'Đẩy ra thay vì đẩy vào',
    mota: 'Đổi chiều: bắt đầu ở mức lớn rồi lùi dần về. Hợp lúc kết cảnh, khi muốn mở rộng ra cho thấy toàn cảnh.' },
  density: { tieuDe: 'Độ thoáng của cả clip',
    mota: 'Một núm làm mọi khoảng cách trong clip giãn ra hoặc chặt lại cùng lúc, mà tương quan giữa các món không đổi.' },
};

/** Hướng dẫn cho sáu màu của cả clip. Khoá theo `id` trong `NUM_MAU`. */
export const HUONG_DAN_MAU = {
  bg: { tieuDe: 'Màu nền cả clip',
    mota: 'Màu phủ dưới cùng. Đổi cái này là đổi tông cả clip, nên nhớ ngó lại màu chữ cho khỏi chìm.' },
  ink: { tieuDe: 'Màu chữ chung',
    mota: 'Mọi chữ trong clip dùng màu này, trừ món nào tự đặt màu chữ riêng.' },
  accent: { tieuDe: 'Màu nhấn của thương hiệu',
    mota: 'Dùng cho đồ nền, huy hiệu, gạch ngăn và đoạn chữ bọc trong dấu sao.' },
  accent2: { tieuDe: 'Màu nhấn thứ hai',
    mota: 'Có màu này thì chữ trong dấu sao chuyển dần từ màu nhấn sang đây, thay vì một màu phẳng.' },
  hot: { tieuDe: 'Màu nóng cho nút bấm',
    mota: 'Tách riêng khỏi màu nhấn vì hai màu làm hai việc. Trộn chung thì cái nút không còn nổi hơn thứ gì nữa.' },
  hot2: { tieuDe: 'Màu nóng thứ hai',
    mota: 'Vế còn lại của cặp màu nóng, dùng để chuyển màu trên nút kêu gọi hành động.' },
};
