/**
 * THÊM · XOÁ · NHÂN BẢN — thành phần và cảnh.
 *
 * Mọi món mới sinh ra ở đây đều phải qua được `validateScene`, nên bắt buộc có:
 * `id` không trùng trong cảnh, `kind`, và `x`/`y` là SỐ (kể cả khi nằm trong cụm
 * và hai số đó vô nghĩa — bộ soát vẫn đòi). Thiếu một cái là kịch bản không lưu
 * được, mà lỗi thì hiện ra tận lúc bấm Lưu, rất khó lần.
 */
import { duyetMon, timCanh, timMon } from './store.js';

/** Món mới, kèm giá trị mặc định đủ đẹp để thả vào là thấy được ngay. */
/**
 * KHO THÀNH PHẦN — chia theo BỘ, giống kho hiệu ứng của mấy app dựng phim.
 *
 * Trước đây đây là một danh sách phẳng 13 món, trong khi bộ dựng vẽ được **25
 * loại**. Mười hai loại còn lại có thật, chạy được, mà không có đường nào thêm
 * vào — muốn dùng phải sửa tay file JSON. Đúng kiểu "năng lực bị giấu" mà
 * `tools/kiem-schema.mjs` sinh ra để chặn, chỉ khác là lần này nằm ở menu thêm
 * chứ không nằm ở bảng thuộc tính.
 *
 * `mau` phải ĐỦ ĐẸP ĐỂ THẢ VÀO LÀ THẤY NGAY. Một món mới ra khung hình trống
 * trơn thì người dùng tưởng bấm hỏng. Số mặc định dưới đây lấy từ chính các
 * clip thật đang chạy, không phải bịa.
 *
 * Mọi món mới đều phải qua `validateScene`, nên bắt buộc có `id`, `kind`, và
 * `x`/`y` là SỐ — kể cả khi nằm trong cụm và hai số đó vô nghĩa.
 */
export const BO_MON = [
  { id: 'chu',    ten: 'Chữ & nhãn',        mo: 'tiêu đề, nút bấm, nhãn số' },
  { id: 'khoi',   ten: 'Khối & bố cục',     mo: 'nền, thẻ, bảng, cụm' },
  { id: 'hinh',   ten: 'Hình & phim',       mo: 'ảnh, video, khung máy' },
  { id: 'sanpham',ten: 'Giao diện sản phẩm',mo: 'dựng lại màn hình app' },
  { id: 'trangtri',ten:'Trang trí',         mo: 'nền thương hiệu, hiệu ứng' },
];

export const MAU_MON = [
  /* ---------- chữ & nhãn ---------- */
  { kind: 'text',     bo: 'chu',  ten: 'Chữ',          mo: 'dòng chữ, có thể tô màu nhấn',
    mau: { text: 'Dòng chữ mới', size: 48, align: 'center' } },
  { kind: 'nut',      bo: 'chu',  ten: 'Nút bấm',      mo: 'nút kêu gọi hành động',
    mau: { label: 'Bấm vào đây', size: 32 } },
  { kind: 'chip',     bo: 'chu',  ten: 'Nhãn số',      mo: 'một con số kèm nhãn',
    mau: { value: '99%', label: 'Nhãn' } },
  { kind: 'hangnhan', bo: 'chu',  ten: 'Hàng nhãn',    mo: 'vài nhãn ngắn xếp hàng',
    mau: { items: ['Ngắn gọn', 'Dễ nhớ', 'Nổi bật'] } },
  { kind: 'huyhieu',  bo: 'chu',  ten: 'Huy hiệu',     mo: 'biểu tượng tròn nổi bật',
    mau: { mark: 'cup', w: 96, h: 96 } },
  { kind: 'logo',     bo: 'chu',  ten: 'Logo',         mo: 'dấu hiệu + tên thương hiệu',
    mau: { name: 'Tên thương hiệu', mark: '◆', w: 260, size: 46 } },

  /* ---------- khối & bố cục ---------- */
  { kind: 'panel',    bo: 'khoi', ten: 'Khối màu',     mo: 'hình chữ nhật, hay dùng làm nền',
    mau: { w: 400, h: 220, radius: 16 } },
  { kind: 'card',     bo: 'khoi', ten: 'Thẻ',          mo: 'thẻ có tiêu đề và mấy dòng',
    mau: { title: 'Tiêu đề thẻ', rows: 3, w: 420 } },
  { kind: 'table',    bo: 'khoi', ten: 'Bảng',         mo: 'bảng danh sách',
    mau: { columns: ['Cột 1', 'Cột 2'], rows: 4, w: 520 } },
  { kind: 'group',    bo: 'khoi', ten: 'Cụm',          mo: 'gom nhiều món, xếp tự động',
    mau: { dir: 'doc', align: 'giua', justify: 'giua', gap: 4, children: [] } },
  { kind: 'timeline', bo: 'khoi', ten: 'Dòng thời gian', mo: 'các mốc rải đều trên một đường',
    mau: { labels: ['0s', '15s', '30s', '45s'], w: 1040, pad: 2 } },

  /* ---------- hình & phim ---------- */
  { kind: 'image',    bo: 'hinh', ten: 'Ảnh',          mo: 'một tấm ảnh',
    mau: { src: '', fit: 'contain', h: 120 } },
  /* Mặc định là NỀN ĐỘNG: kín khung, mờ sẵn, tối sẵn, lặp — thả vào là dùng
     được ngay cho việc hay làm nhất, khỏi phải vặn năm núm mới ra hình. */
  { kind: 'video',    bo: 'hinh', ten: 'Video',        mo: 'phim nền, mờ và tối sẵn',
    mau: { src: '', fit: 'cover', blur: 8, dim: 0.25, loop: true, place: 'day' } },
  { kind: 'phone',    bo: 'hinh', ten: 'Điện thoại',   mo: 'khung máy, thả ảnh/phim vào màn',
    mau: { src: '', w: 260, h: 540 } },
  { kind: 'browser',  bo: 'hinh', ten: 'Trình duyệt',  mo: 'cửa sổ web, thả ảnh/phim vào thân',
    mau: { url: 'ten-cua-ban.tinhgon.xyz', w: 560, h: 340 } },

  /* ---------- giao diện sản phẩm ---------- */
  { kind: 'form',     bo: 'sanpham', ten: 'Biểu mẫu',  mo: 'các ô nhập có nhãn và giá trị',
    mau: { title: 'Tạo mới', w: 380,
      fields: [{ label: 'Tên', value: 'du-an-moi' }, { label: 'Nguồn', value: 'Git URL' }] } },
  { kind: 'calendar', bo: 'sanpham', ten: 'Lịch',      mo: 'tháng có một ngày được đánh dấu',
    mau: { month: 'Tháng 12', cta: 'Chọn ngày', days: 28, highlight: 9, w: 380 } },
  { kind: 'upload',   bo: 'sanpham', ten: 'Ô kéo thả', mo: 'vùng kéo file vào',
    mau: { label: 'Kéo file vào đây', file: 'ten-file.zip', w: 446, h: 294 } },
  { kind: 'chat',     bo: 'sanpham', ten: 'Cửa sổ AI', mo: 'khung trò chuyện với trợ lý',
    mau: { title: 'Trợ lý AI', lines: ['Xin chào! Bạn muốn dựng gì?'],
      typing: 'Làm giúp tôi một trang bán hàng…', w: 446, h: 384 } },

  /* ---------- trang trí ---------- */
  { kind: 'nen',      bo: 'trangtri', ten: 'Nền thương hiệu', mo: 'bộ đồ nền phủ cả khung',
    mau: { place: 'day', parts: ['cham', 'net', 'khoi', 'song', 'duong'], draw: 1.3, waveLow: true } },
  { kind: 'quydao',   bo: 'trangtri', ten: 'Quỹ đạo',  mo: 'vòng tròn xoay quanh một tâm',
    mau: { core: 'tim', label: 'ten-mien.vn', warm: true, w: 662, h: 530 } },
  { kind: 'wheel',    bo: 'trangtri', ten: 'Vòng quay', mo: 'vòng quay may mắn',
    mau: { slices: 10, label: 'QUAY\nNGAY', spin: 18, w: 374, h: 374 } },
  { kind: 'shield',   bo: 'trangtri', ten: 'Khiên bảo mật', mo: 'khiên + mấy nhãn chứng nhận',
    mau: { mark: '🔒', badges: ['Chuẩn ngân hàng', 'Dữ liệu tại Việt Nam', 'SSL'], w: 563 } },
  { kind: 'sweep',    bo: 'trangtri', ten: 'Vệt sáng', mo: 'vệt sáng quét qua khung',
    mau: { w: 1280, h: 720, for: 0.5 } },
];


/** Sinh id chưa trùng trong cảnh. */
function idMoi(canh, goc) {
  const dungRoi = new Set(duyetMon(canh.elements).map((x) => x.el.id));
  let i = 1;
  let t = `${goc}-${i}`;
  while (dungRoi.has(t)) t = `${goc}-${++i}`;
  return t;
}

/** Thêm một món vào cảnh, hoặc vào trong một cụm. Trả về id món mới. */
export function themMon(doc, canhId, kind, chaId = null) {
  const canh = timCanh(doc, canhId);
  if (!canh) return null;
  const mau = MAU_MON.find((m) => m.kind === kind);
  const el = { id: idMoi(canh, kind), kind, x: 0, y: 0, ...structuredClone(mau?.mau || {}) };

  // Món ngoài cùng thì cho vào giữa khung cho dễ thấy; món trong cụm thì để
  // flex lo, đặt `place` vào là thừa.
  // Mẫu nào tự khai `place` rồi thì tôn trọng — video mặc định phủ KÍN KHUNG vì
  // việc hay làm nhất với nó là làm nền động.
  if (!chaId && !el.place) el.place = 'giua';

  const cha = chaId ? timMon(doc, canhId, chaId)?.el : null;
  if (cha && cha.kind === 'group') (cha.children ||= []).push(el);
  else canh.elements.push(el);
  return el.id;
}

/**
 * BỘ DỰNG SẴN (kit) — bấm một cái ra nguyên một cụm đã bày sẵn.
 *
 * Thêm từng món một thì ai cũng làm được, nhưng bày cho ĐẸP mới là phần khó:
 * câu dẫn đặt đâu, cách món khoe bao xa, món nào vào trước món nào vào sau.
 * Kit gói sẵn những quyết định đó.
 *
 * KHUÔN LẤY TỪ CLIP THẬT, không bịa. Cả `vibe-host`, `nguon-toi`,
 * `kich-ban-thu` đều dùng đúng một khuôn:
 *
 *     cụm (place 'giua', xếp dọc, căn giữa, khe 5)
 *       ├─ chữ dẫn      (bay lên, 0,55s)
 *       └─ món khoe     (bay lên, 0,6s)
 *
 * Và vì cụm khai `place` chứ không khai toạ độ, kit **tự xếp lại khi đổi khổ
 * clip** — khác hẳn 96,8% số món trong kho hiện nay đang khai toạ độ cứng.
 * Xem `docs/DOI-KHO-HINH.md`.
 */
export const BO_KIT = [
  { id: 'moi',  ten: 'Mở đầu & kết',   mo: 'cảnh đầu, cảnh cuối' },
  { id: 'khoe', ten: 'Khoe sản phẩm',  mo: 'màn hình, trang web, biểu mẫu' },
  { id: 'so',   ten: 'Số liệu & cam kết', mo: 'con số, bảng, bảo mật' },
  { id: 'nen',  ten: 'Nền',             mo: 'lớp phủ cả khung, nằm dưới mọi thứ' },
];

/*
 * NỀN — bộ dựng có SÁU mảnh trang trí (`cham` `net` `khoi` `tien` `song`
 * `duong`) và chúng bật tắt độc lập. Trước đây chỉ có đúng một cách dùng: bật
 * hết. Sáu cái công tắc ấy là sáu cách phối, mà không ai biết để mà phối.
 *
 * Nên thay vì bắt người dùng tự mò tổ hợp, gói sẵn mấy kiểu hay dùng — như kho
 * nền của app dựng phim: chọn một cái, thấy ngay, muốn chỉnh thì mở bảng thuộc
 * tính bật tắt từng mảnh.
 */
const nenTH = (parts, them = {}) => ({
  kind: 'nen', id: 'nen', x: 0, y: 0, place: 'day', parts,
  in: { kind: 'fade', ease: 'out', dur: 0.5 }, ...them,
});

/* Chữ dẫn dùng chung một dáng — đổi ở đây là mọi kit đổi theo. */
const chuDan = (text, size = 96) => ({
  kind: 'text', id: 'chu', x: 0, y: 0, w: 374, text, size, align: 'left', gap: 3,
  in: { kind: 'rise', ease: 'out', dur: 0.55 },
});
const cum = (con) => ({
  kind: 'group', id: 'nhom', x: 0, y: 0, place: 'giua',
  dir: 'doc', align: 'giua', justify: 'giua', gap: 5, children: con,
});
const vao = (el) => ({ ...el, x: 0, y: 0, at: 0, in: { kind: 'rise', ease: 'out', dur: 0.6 } });

export const KIT = [
  { id: 'mo-dau', bo: 'moi', ten: 'Mở đầu — logo',
    mo: 'câu dẫn + logo thương hiệu',
    dung: () => [cum([
      chuDan('Giới thiệu *sản phẩm mới*'),
      vao({ kind: 'logo', id: 'logo', name: 'Tên thương hiệu', mark: '◆', w: 260, size: 46 }),
    ])] },
  { id: 'ket-cta', bo: 'moi', ten: 'Kết — kêu gọi hành động',
    mo: 'câu chốt + nút bấm',
    dung: () => [cum([
      chuDan('Bắt đầu *ngay hôm nay*'),
      vao({ kind: 'nut', id: 'nut', label: 'Dùng thử miễn phí', size: 32 }),
    ])] },


  { id: 'khoe-web', bo: 'khoe', ten: 'Khoe trang web',
    mo: 'câu dẫn + cửa sổ trình duyệt',
    dung: () => [cum([
      chuDan('Trang của bạn *đã lên mạng*'),
      vao({ kind: 'browser', id: 'trinh-duyet', w: 446, h: 321, url: 'trang-cua-ban.vn' }),
    ])] },
  { id: 'khoe-dt', bo: 'khoe', ten: 'Khoe trên điện thoại',
    mo: 'câu dẫn + khung máy, thả ảnh/phim vào màn',
    dung: () => [cum([
      chuDan('Xem tốt trên *mọi màn hình*'),
      vao({ kind: 'phone', id: 'dien-thoai', w: 260, h: 540, src: '' }),
    ])] },
  { id: 'khoe-form', bo: 'khoe', ten: 'Điền biểu mẫu',
    mo: 'câu dẫn + biểu mẫu có sẵn vài ô',
    dung: () => [cum([
      chuDan('Khai vài dòng là *xong*'),
      vao({ kind: 'form', id: 'bieu-mau', w: 380, title: 'Tạo mới',
        fields: [{ label: 'Tên', value: 'du-an-moi' }, { label: 'Nguồn', value: 'Git URL' }] }),
    ])] },
  { id: 'khoe-ai', bo: 'khoe', ten: 'Hỏi trợ lý AI',
    mo: 'câu dẫn + cửa sổ trò chuyện',
    dung: () => [cum([
      chuDan('Nói một câu, *AI dựng hộ*'),
      vao({ kind: 'chat', id: 'tro-ly', w: 446, h: 384, title: 'Trợ lý AI',
        lines: ['Xin chào! Bạn muốn dựng gì?'], typing: 'Làm giúp tôi một trang bán hàng…' }),
    ])] },

  { id: 'ba-so', bo: 'so', ten: 'Ba con số',
    mo: 'câu dẫn + ba nhãn số xếp ngang',
    dung: () => [cum([
      chuDan('Con số *nói thay lời*'),
      { kind: 'group', id: 'hang-so', x: 0, y: 0, dir: 'ngang', align: 'giua',
        justify: 'giua', gap: 4, children: [
          vao({ kind: 'chip', id: 'so-1', value: '99,9%', label: 'Thời gian sống' }),
          vao({ kind: 'chip', id: 'so-2', value: '< 1s', label: 'Tải trang' }),
          vao({ kind: 'chip', id: 'so-3', value: '24/7', label: 'Hỗ trợ' }),
        ] },
    ])] },
  { id: 'bang-so', bo: 'so', ten: 'Bảng danh sách',
    mo: 'câu dẫn + bảng nhiều dòng',
    dung: () => [cum([
      chuDan('Mọi thứ *trong một bảng*'),
      vao({ kind: 'table', id: 'bang', w: 520, columns: ['Tên', 'Trạng thái'], rows: 4 }),
    ])] },
  /* ---------- nền ---------- */
  { id: 'nen-day-du', bo: 'nen', ten: 'Nền thương hiệu đầy đủ',
    mo: 'chấm, nét, khối mềm, sóng đáy, đường tăng',
    dung: () => [nenTH(['cham', 'net', 'khoi', 'song', 'duong'], { draw: 1.3, waveLow: true })] },
  { id: 'nen-toi-gian', bo: 'nen', ten: 'Tối giản — chỉ lưới chấm',
    mo: 'nhẹ nhất, không hút mắt khỏi nội dung',
    dung: () => [nenTH(['cham'])] },
  { id: 'nen-song', bo: 'nen', ten: 'Sóng đáy',
    mo: 'dải sóng dưới đáy + một khối mềm',
    dung: () => [nenTH(['khoi', 'song'], { waveLow: true })] },
  { id: 'nen-luoi', bo: 'nen', ten: 'Lưới chấm và nét',
    mo: 'chấm thưa kèm vài nét bo mảnh',
    dung: () => [nenTH(['cham', 'net'])] },
  { id: 'nen-tang-truong', bo: 'nen', ten: 'Tăng trưởng',
    mo: 'đường tăng vẽ dần + chồng tiền',
    dung: () => [nenTH(['khoi', 'duong', 'tien'], { draw: 1.3 })] },
  { id: 'nen-mau', bo: 'nen', ten: 'Màu trơn',
    mo: 'một mảng màu kín khung, không hoạ tiết',
    dung: () => [{ kind: 'panel', id: 'nen-mau', x: 0, y: 0, place: 'day',
      fill: '#0e1420', radius: 0, in: { kind: 'fade', ease: 'out', dur: 0.4 } }] },
  { id: 'nen-phim', bo: 'nen', ten: 'Phim làm nền',
    mo: 'video kín khung, mờ và tối sẵn — chọn file ở bảng bên phải',
    dung: () => [{ kind: 'video', id: 'nen-phim', x: 0, y: 0, place: 'day',
      src: '', fit: 'cover', blur: 8, dim: 0.25, loop: true,
      in: { kind: 'fade', ease: 'out', dur: 0.5 } }] },

  { id: 'bao-mat', bo: 'so', ten: 'Cam kết bảo mật',
    mo: 'câu dẫn + khiên và mấy nhãn chứng nhận',
    dung: () => [cum([
      chuDan('Dữ liệu của bạn *được giữ kỹ*'),
      vao({ kind: 'shield', id: 'khien', w: 563, mark: '🔒',
        badges: ['Chuẩn ngân hàng', 'Dữ liệu tại Việt Nam', 'SSL'] }),
    ])] },
];

/**
 * Thêm cả một bộ vào cảnh. Trả về id của món ngoài cùng đầu tiên.
 *
 * Mọi id trong bộ đều được đặt LẠI cho khỏi trùng — thêm hai lần cùng một bộ là
 * chuyện thường, mà trùng id thì `validateScene` chặn không cho lưu, và lỗi chỉ
 * hiện ra tận lúc bấm Lưu nên rất khó lần.
 */
export function themKit(doc, canhId, kitId, chaId = null) {
  const canh = timCanh(doc, canhId);
  const kit = KIT.find((k) => k.id === kitId);
  if (!canh || !kit) return null;

  const datLaiId = (el) => {
    el.id = idMoi(canh, `${kitId}-${el.id}`);
    for (const c of el.children || []) datLaiId(c);
    return el;
  };
  const cha = chaId ? timMon(doc, canhId, chaId)?.el : null;
  const dich = cha && cha.kind === 'group' ? (cha.children ||= []) : canh.elements;

  let dau = null;
  for (const el of kit.dung()) {
    const e = datLaiId(structuredClone(el));
    // Nằm trong cụm thì để flex lo chỗ, `place` vào là thừa và làm hỏng bố cục.
    if (cha) delete e.place;
    dich.push(e);
    dau ||= e.id;
  }
  return dau;
}

export function xoaMon(doc, canhId, monId) {
  const canh = timCanh(doc, canhId);
  if (!canh) return false;
  const boc = (ds) => {
    const i = (ds || []).findIndex((e) => e.id === monId);
    if (i >= 0) { ds.splice(i, 1); return true; }
    return (ds || []).some((e) => e.kind === 'group' && boc(e.children));
  };
  return boc(canh.elements);
}

/** Nhân bản một món. Con trong cụm cũng phải được đặt id mới, không thì trùng. */
export function nhanBanMon(doc, canhId, monId) {
  const canh = timCanh(doc, canhId);
  const t = timMon(doc, canhId, monId);
  if (!canh || !t) return null;

  const banSao = structuredClone(t.el);
  const datLaiId = (e) => {
    e.id = idMoi(canh, e.kind);
    if (e.kind === 'group') (e.children || []).forEach(datLaiId);
  };
  // Đặt id cho món ngoài trước rồi mới tới con, để `idMoi` thấy được cả những
  // id vừa cấp — nếu không hai anh em nhân bản cùng lúc sẽ trùng nhau.
  datLaiId(banSao);

  // Lệch đi một chút cho thấy là có hai cái, không phải một cái.
  if (!banSao.place) { banSao.x = (banSao.x || 0) + 24; banSao.y = (banSao.y || 0) + 24; }

  const ds = t.cha ? t.cha.children : canh.elements;
  ds.splice(ds.indexOf(t.el) + 1, 0, banSao);
  return banSao.id;
}

/* ---------- cảnh ---------- */

function idCanhMoi(doc, goc = 'canh') {
  const co = new Set((doc.scenes || []).map((s) => s.id));
  let i = doc.scenes.length + 1;
  let t = `${goc}-${i}`;
  while (co.has(t)) t = `${goc}-${++i}`;
  return t;
}

export function themCanh(doc, sauCanhId = null) {
  const canh = {
    id: idCanhMoi(doc),
    duration: 4,
    stagger: 0.16,           // giá trị cả bộ đang dùng — giữ cho đồng nhịp
    elements: [{ id: 'chu-1', kind: 'text', x: 0, y: 0, place: 'giua',
      text: 'Cảnh mới', size: 56, align: 'center' }],
  };
  const i = sauCanhId ? doc.scenes.findIndex((s) => s.id === sauCanhId) : -1;
  doc.scenes.splice(i >= 0 ? i + 1 : doc.scenes.length, 0, canh);
  return canh.id;
}

export function nhanBanCanh(doc, canhId) {
  const i = doc.scenes.findIndex((s) => s.id === canhId);
  if (i < 0) return null;
  const ban = structuredClone(doc.scenes[i]);
  ban.id = idCanhMoi(doc);
  doc.scenes.splice(i + 1, 0, ban);
  return ban.id;
}

export function xoaCanh(doc, canhId) {
  // Bộ soát đòi ít nhất một cảnh — xoá cái cuối cùng là kịch bản hỏng.
  if ((doc.scenes || []).length <= 1) return false;
  const i = doc.scenes.findIndex((s) => s.id === canhId);
  if (i < 0) return false;
  doc.scenes.splice(i, 1);
  return true;
}
