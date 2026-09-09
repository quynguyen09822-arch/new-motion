/**
 * XẾP VIDEO THEO BỘ DỰ ÁN.
 *
 * `out/` là một thư mục phẳng 41 video, tên file mã hoá đủ thứ vào một chuỗi:
 * chủ đề, khổ hình, giai đoạn, đã lồng tiếng hay chưa. Liệt kê thẳng ra thì
 * thành danh sách A-Z dài dằng dặc, gần như mỗi video một tiêu đề riêng — cùng
 * một clip "Vibe Hosting 18 giây" nằm rải ra 5 chỗ chỉ vì có bản dọc, bản ngang
 * và bản 4K.
 *
 * KHÔNG dời file thật. `tools/ghep-map-domain.mjs` gán cứng
 * `out/map-domain-than-1920x1080.mp4`, còn `tools/trang-tai-ve.mjs` đọc `out/`
 * không đệ quy — dời vào thư mục con là hai chỗ đó hỏng mà không báo gì. Xếp ở
 * đây là xếp cách NHÌN; file vẫn nằm nguyên chỗ cũ.
 */

/** Ba bộ, theo đúng thứ tự cần thấy. Bộ VH mới nhất nên đứng đầu. */
export const BO = [
  { ma: 'vh', ten: 'Bộ VH — nhân vật',
    mo: 'Series chính, quay dọc cho mạng xã hội' },
  { ma: 'ho-tro', ten: 'Hỗ trợ Vibe Host',
    mo: 'Trỏ domain · Template · Database · Triển khai web' },
  { ma: 'thu', ten: 'Thử nghiệm & bản cũ',
    mo: 'Dựng trong lúc thử app' },
];

/*
 * Nhận diện theo TỪ KHOÁ trong tên, không theo danh sách file. Đội làm clip vẫn
 * dựng thêm mỗi ngày — khai tay từng tên là video mới lặng lẽ rơi hết vào "Thử
 * nghiệm" mà không ai biết vì sao.
 */
const HO_TRO = /(map-domain|tao-template|tao-database|trien-khai-web)/;
const LA_VH = /(^|-)vh-\d{2}-/;

/** Nhãn đọc được cho từng chủ đề — tên file không bỏ dấu nên phải trả dấu lại. */
const TEN_DEP = {
  'vh-02-van-phong': 'VH-02 · Văn phòng',
  'vh-03-ceo-dashboard': 'VH-03 · CEO xem dashboard',
  'vh-04-designer': 'VH-04 · Designer',
  'vh-05-loi-rollback': 'VH-05 · Lỗi & quay lui',
  'vh-06-6-cach': 'VH-06 · 6 cách',
  marketer: 'Marketer',
  'map-domain': 'Trỏ domain về hosting',
  'tao-template': 'Tạo website từ template',
  'tao-database': 'Tạo database',
  'trien-khai-web': 'Triển khai web',
  '18s': 'Vibe Hosting 18 giây',
  'vibe-hosting': 'Vibe Hosting — bản đầu',
  'thu-ve-lai-s02': 'S02 · Một đường link',
  'scene-thu-nghiem': 'Cảnh thử nghiệm',
  'cta-mat-bao': 'Thẻ kêu gọi Mắt Bão',
  'thuong-hieu': 'Nhận diện thương hiệu',
};

/*
 * Những mảnh chỉ nói về ĐỊNH DẠNG, không nói về nội dung. Bóc hết ra khỏi khoá
 * chủ đề thì bản dọc, bản ngang và bản 4K của cùng một clip mới về chung một
 * chỗ; chúng quay lại ở cột "biến thể" để vẫn phân biệt được.
 */
const BIEN = {
  doc: 'dọc', ngang: 'ngang', '4k': '4K', '1080p': '1080p', '720p': '720p',
  than: 'phần thân', thanhinh: 'thay hình', full: 'đủ', high: 'nét cao',
  wireframe: 'khung xám',
};

/**
 * Bóc một tên file thành chủ đề + biến thể.
 * `goc` là tên đã được `videos.js` gỡ khổ hình và hậu tố tiếng (-vo/-sfx/-music).
 */
export function phanLoai(goc, ten) {
  const luu = /^BACKUP-/.test(goc);
  const khongLuu = goc.replace(/^BACKUP-/, '');
  /* Giữ lại tiền tố vừa gỡ: mấy bản tháng 7 (`vibe-hosting-doc`) không còn chữ
     nào khác, gỡ hết là chủ đề rỗng. */
  const dau = (khongLuu.match(/^vibe-host(?:ing)?/) || ['vibe-hosting'])[0];
  let con = khongLuu.replace(/^vibe-host(ing)?-/, '');

  /* Bộ xuất video dán mốc thời gian vào tên file (`-202609090911`). Không gỡ
     thì MỖI LẦN XUẤT thành một chủ đề riêng — đúng cái đống lộn xộn vừa dọn.
     Ngày giờ đã hiện ở cột bên phải mỗi hàng rồi, không cần trong tên mục. */
  con = con.replace(/-\d{10,14}$/, '');

  const bien = [];
  /* Đuôi số là bản dựng lại lần thứ mấy, không phải chủ đề — `vibe-hosting-doc-2`
     từng thành một mục tên "2" đứng riêng. */
  const lan = con.match(/-(\d)$/);
  if (lan) { bien.push(`bản ${lan[1]}`); con = con.slice(0, -2); }
  for (const [tu, nhan] of Object.entries(BIEN)) {
    const re = new RegExp(`(^|-)${tu}(-|$)`);
    if (re.test(con)) { bien.push(nhan); con = con.replace(re, '$1').replace(/^-|-$/g, ''); }
  }

  /*
   * Bản lưu giữ nguyên đuôi mô tả của nó ("giong-MinhTrung", "thu-tu-theo-vaitro")
   * — đó chính là thứ phân biệt chúng với nhau, bỏ đi là hai file thành một.
   */
  if (luu) {
    const rieng = con.replace(HO_TRO, '').replace(/vibe-host(ing)?/g, '')
      .replace(/-+/g, ' ').trim();
    if (rieng) bien.unshift(`bản lưu: ${rieng}`);
    else bien.unshift('bản lưu');
  }

  const khoa = (con.match(HO_TRO) || [])[0]
    || (con.match(/vh-\d{2}-[a-z0-9-]+/) || [])[0]
    || con || dau;

  return {
    bo: HO_TRO.test(goc) ? 'ho-tro'
      : LA_VH.test(ten) ? 'vh'
      /*
       * Bản marketer khổ đầy (1080×1920, có lồng tiếng, có phụ đề) là tập đầu
       * của chính series VH, chỉ chưa kịp đánh số. Còn `vibe-host-marketer.mp4`
       * trần 1,5 MB là bản nháp hồi tháng 8 — thuộc mục thử nghiệm.
       */
      : /^vibe-host-marketer/.test(ten) && /\d{3,4}x\d{3,4}/.test(ten) ? 'vh'
      : 'thu',
    chuDe: khoa,
    tenChuDe: TEN_DEP[khoa] || khoa.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
    bien: bien.join(' · ') || null,
  };
}
