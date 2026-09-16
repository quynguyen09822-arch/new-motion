/**
 * MÔ HÌNH KỊCH BẢN CẢNH.
 *
 * Một clip = danh sách cảnh; một cảnh = thời lượng + máy quay + các phần tử.
 * Đây là **dữ liệu thuần**, không dính React, không dính DOM — `scene-player.html`
 * đọc và diễn, còn studio thì sinh ra và sửa.
 *
 * HAI QUY ƯỚC QUAN TRỌNG:
 *
 * 1. Khoảng cách khai bằng **bậc thang 0..7**, không bao giờ bằng px. Bộ dựng
 *    quy bậc ra px qua `meta.density`. Nhờ vậy một núm làm cả clip thoáng ra
 *    hoặc chặt lại mà tương quan giữa các phần tử không đổi.
 *
 * 2. Toạ độ `x`/`y` là px trên sân khấu (mặc định 1280×720) và tính từ **góc
 *    trên trái** của phần tử. Đây là con số duy nhất dùng px trực tiếp, vì nó
 *    là bố cục chứ không phải khoảng thở.
 */

export type EaseName = 'linear' | 'out' | 'inOut' | 'back';
export type MotionKind = 'none' | 'fade' | 'rise' | 'fall' | 'left' | 'right' | 'pop';

export interface Motion {
  kind: MotionKind;
  /** Giây. Mặc định 0.55 khi vào, 0.4 khi ra. */
  dur?: number;
  ease?: EaseName;
  /** Quãng trượt tính bằng px. Bỏ trống = bộ dựng tự chọn theo cỡ sân khấu. */
  dist?: number;
}

export interface Camera {
  x?: number;
  y?: number;
  scale?: number;
}

/** Vị trí có tên trên sân khấu. Dùng cái này thì khỏi phải gõ toạ độ. */
export type Place = 'giua' | 'trai' | 'phai' | 'tren' | 'duoi' | 'cao' | 'day';

interface Base {
  id: string;
  /**
   * Toạ độ px, tính từ góc trên trái. CHỈ dùng khi cần đặt tay chính xác —
   * cách thường dùng là `place`, để bố cục tự tính theo thang bậc.
   */
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Giây, tính từ đầu cảnh. */
  at?: number;
  /** Sống bao lâu rồi biến. Bỏ trống = ở tới hết cảnh. */
  for?: number;
  in?: Motion;
  out?: Motion;
  rotate?: number;
  opacity?: number;
  /** Đệm trong, theo BẬC 0..7 — không phải px. */
  pad?: number;
  /** Khe giữa các phần con, theo BẬC 0..7. */
  gap?: number;
  /** Đặt theo vị trí có tên; có cái này thì `x`/`y` bị bỏ qua. */
  place?: Place;
  /** Lề an toàn quanh mép, theo BẬC. Mặc định 7. */
  margin?: number;
}

export interface PanelEl extends Base { kind: 'panel'; fill?: string; radius?: number }
/** `text` nhận `*chữ*` để tô màu nhấn — cách viết nhấn mạnh gọn nhất cho người dùng. */
export interface TextEl extends Base {
  kind: 'text';
  /** `|` xuống dòng — chỗ ngắt dòng của một tiêu đề là chuyện bố cục, không phải chuyện may rủi. */
  text: string;
  sub?: string;
  size?: number;
  align?: 'left' | 'center' | 'right';
  /** Gạch ngắn màu nhấn giữa tiêu đề và câu phụ. */
  rule?: boolean;
  /** Cỡ câu phụ so với tiêu đề. Bỏ trống = 0.34. */
  subScale?: number;
  /**
   * Giây lệch nhau giữa các dòng khi hiện ra (kể cả gạch và câu phụ).
   * Có nó thì phần tử KHÔNG tự chạy chuyển động vào nữa — từng dòng tự lo.
   */
  lineStagger?: number;
}
export interface CardEl extends Base { kind: 'card'; title?: string; rows?: number; button?: string }
export interface FormEl extends Base { kind: 'form'; title?: string; fields?: { label: string; value: string }[]; dots?: number }
export interface CalendarEl extends Base { kind: 'calendar'; month?: string; cta?: string; days?: number; offset?: number; highlight?: number }
export interface ChipEl extends Base { kind: 'chip'; label?: string; value: string; note?: string; outline?: boolean }
export interface PhoneEl extends Base { kind: 'phone'; src?: string }
export interface TimelineEl extends Base { kind: 'timeline'; labels: string[] }
export interface LogoEl extends Base { kind: 'logo'; mark?: string; name: string; size?: number }
export interface ImageEl extends Base {
  kind: 'image';
  src: string;
  radius?: number;
  /** `contain` giữ nguyên tỉ lệ — bắt buộc cho logo. Mặc định `cover` (lấp đầy ô). */
  fit?: 'cover' | 'contain';
  /** Quầng sáng mềm lót phía sau, để hình tách khỏi thứ đứng sau lưng nó. */
  glow?: boolean;
  /** Giây cho một chu kỳ vệt sáng quét qua. Bỏ trống = không quét. */
  shine?: number;
}
/** Vòng quay may mắn — nan vẽ bằng conic-gradient, nhẹ khi hứng từng khung. */
export interface WheelEl extends Base { kind: 'wheel'; slices?: number; colors?: string[]; label?: string; spin?: number }
/** Cửa sổ trò chuyện với trợ lý AI: vài bong bóng + ô đang gõ. */
export interface ChatEl extends Base { kind: 'chat'; title?: string; lines?: string[]; typing?: string }
/** Khiên bảo mật + mấy nhãn chứng nhận quanh nó. */
export interface ShieldEl extends Base { kind: 'shield'; mark?: string; badges?: string[] }
/** Vùng kéo thả file. */
export interface UploadEl extends Base { kind: 'upload'; label?: string; file?: string }
/** Bảng danh sách — dashboard người chơi, đơn hàng… */
export interface TableEl extends Base { kind: 'table'; columns?: string[]; rows?: number }
/** Khung trình duyệt để khoe trang đã lên mạng. */
export interface BrowserEl extends Base { kind: 'browser'; url?: string }

/**
 * KHUNG NỀN THƯƠNG HIỆU — lớp trang trí phủ cả khung, nằm dưới mọi thứ khác.
 *
 * Poster thương hiệu nào cũng có một bộ đồ nền giống nhau ở mọi trang: lưới chấm
 * góc trên, vài nét bo mảnh, một khối mềm, dải sóng dưới đáy. Gom thành MỘT phần
 * tử vì hai lẽ: nó phải giữ nguyên xi khi sang cảnh mới (tách ra nhiều phần tử
 * thì độ trễ so le làm chúng nhấp nháy ở mỗi mối nối cảnh), và người viết kịch
 * bản chỉ muốn nói một câu "nền thương hiệu" chứ không muốn kê khai sáu món.
 */
export interface BackdropEl extends Base {
  kind: 'nen';
  /** Bật món nào. Bỏ trống = bật hết. */
  parts?: BackdropPart[];
  /** Giây để vẽ dần đường tăng trưởng. 0 = coi như đã vẽ xong (cảnh sau). */
  draw?: number;
  /** Hạ dải sóng xuống, chừa chỗ cho dòng cuối đứng trên nền sáng. */
  waveLow?: boolean;
}
export type BackdropPart = 'cham' | 'net' | 'khoi' | 'song' | 'duong' | 'tien';

/**
 * CỤM MINH HOẠ QUỸ ĐẠO — một vật ở tâm, vài vòng elip nét đứt quay quanh.
 *
 * Đây là phần *chuyển động liên tục* của một tấm poster: nét đứt trôi, chấm chạy
 * trên vòng, quả cầu trôi lên xuống, ánh lấp lánh nhấp nháy. Khác hẳn `in`/`out`
 * — thứ chỉ chạy một lần lúc vào rồi đứng im.
 */
export interface OrbitEl extends Base {
  kind: 'quydao';
  /** Vật ở tâm. `web` = cửa sổ trình duyệt trên quả cầu; `sao` = ngôi sao trên bục. */
  core?: 'web' | 'sao' | 'cau' | 'tim';
  /** Tên miền của thương hiệu — phần đuôi của nó hiện to trong thẻ. */
  label?: string;
  /** Chữ gõ trong ô tìm kiếm. Bỏ trống = ô để trống. */
  query?: string;
  /** Logo bày trong thẻ, thay cho phần đuôi tên miền viết bằng chữ. */
  logo?: string;
  /** Mũi tên đi lên — dùng cho cảnh nói về đà tăng. */
  arrow?: boolean;
  /** Nhãn tròn nhỏ bay quanh: `check` · `cot`. Tối đa hai cái. */
  chips?: ('check' | 'cot')[];
  /** Pha màu nóng vào vòng và quả cầu — dùng cho cảnh kêu gọi hành động. */
  warm?: boolean;
}

/**
 * NÚT KÊU GỌI HÀNH ĐỘNG — viên thuốc màu nóng, chữ trắng, mũi tên trong vòng tròn.
 *
 * Thứ duy nhất trong cả clip được phép đập nhịp. Cái gì cũng đập thì chẳng cái nào
 * còn nổi bật; để một mình nó động thì mắt người xem đi thẳng tới đó.
 */
export interface ButtonEl extends Base { kind: 'nut'; label: string; size?: number; ticks?: boolean }

/** Huy hiệu tròn có biểu tượng — cái mở đầu cho một tấm poster dọc. */
export interface BadgeEl extends Base { kind: 'huyhieu'; mark?: string; size?: number }

/** Hàng nhãn ngăn nhau bằng chấm: `Ngắn gọn · Dễ nhớ · Nổi bật`. */
export interface TagsEl extends Base { kind: 'hangnhan'; items: string[]; size?: number }

/** Vệt sáng quét chéo qua khung — dùng làm chuyển cảnh mềm trên nền tối. */
export interface SweepEl extends Base { kind: 'sweep'; angle?: number; width?: number; color?: string }

export interface PointerEl extends Base {
  kind: 'pointer';
  path: { t: number; x: number; y: number }[];
  clicks?: { t: number; x?: number; y?: number }[];
}

/**
 * KHỐI DÀN — gom vài thành phần rồi để trình duyệt xếp theo `gap` của thang bậc.
 *
 * Đây là thứ khiến khoảng cách luôn đúng. Tính toạ độ tay thì mỗi lần đổi cỡ
 * chữ hay đổi độ thoáng là phải dò lại; giao cho flex thì đổi một núm là mọi khe
 * hở giãn đều, không chỗ nào dính nhau.
 */
export interface GroupEl extends Base {
  kind: 'group';
  /** `doc` = xếp dọc (mặc định), `ngang` = xếp ngang. */
  dir?: 'ngang' | 'doc';
  /** Căn theo trục ngang của khối. */
  align?: 'dau' | 'giua' | 'cuoi';
  /** Căn theo trục dọc của khối. */
  justify?: 'dau' | 'giua' | 'cuoi';
  children: SceneElement[];
}

/**
 * PHIM NỀN — một đoạn video chạy trong khung, hay dùng nhất là phủ kín làm nền.
 *
 * Bộ dựng GHIM `currentTime` theo đồng hồ của clip, không để phim tự phát: tua
 * tới giây nào thì phim ở giây đó, và mỗi lần xuất video ra đúng một kết quả.
 *
 * ⚠️ HEVC thì trình duyệt không giải được — đặt vào sẽ ra một ô ĐEN mà không báo
 * lỗi gì. Dùng H.264 / VP8 / VP9 / AV1.
 */
export interface VideoEl extends Base {
  kind: 'video';
  /** Đường dẫn file, tương đối với thư mục dự án. */
  src?: string;
  fit?: 'cover' | 'contain';
  radius?: number;
  /** Nhoè nền, tính bằng px trên chính thẻ video. */
  blur?: number;
  /** Lớp tối phủ lên, 0..1 — để chữ đặt trên nền phim còn đọc được. */
  dim?: number;
  /** Hết thì quay lại từ đầu. Mặc định bật. */
  loop?: boolean;
  /** Tốc độ phát so với bình thường. */
  rate?: number;
  /** Giây bắt đầu trong file. */
  start?: number;
}

export type SceneElement =
  | GroupEl
  | PanelEl | TextEl | CardEl | FormEl | CalendarEl
  | ChipEl | PhoneEl | TimelineEl | LogoEl | ImageEl | PointerEl
  | WheelEl | ChatEl | ShieldEl | UploadEl | TableEl | BrowserEl | SweepEl
  | BackdropEl | BadgeEl | TagsEl | OrbitEl | ButtonEl | VideoEl;

export interface Scene {
  id: string;
  /** Giây. */
  duration: number;
  camera?: Camera;
  /** Bao lâu để máy quay đi từ cảnh trước tới đây. */
  cameraMove?: number;
  cameraEase?: EaseName;
  /** Độ trễ so le giữa các phần tử trong cảnh — thứ làm chuyển động bớt "máy". */
  stagger?: number;
  elements: SceneElement[];
}

export interface SceneMeta {
  name: string;
  width: number;
  height: number;
  /** Nhân cho cả thang bậc khoảng cách. 1 = chuẩn, 1.3 = thoáng, 0.8 = chặt. */
  density: number;
  bg: string;
  accent: string;
  /** Màu nhấn thứ hai. Có nó thì chữ trong `*sao*` chuyển màu dần từ `accent` sang đây. */
  accent2?: string;
  /**
   * CẶP MÀU NÓNG — dành cho lời kêu gọi hành động.
   *
   * Tách khỏi `accent` vì hai màu này làm hai việc khác nhau: `accent` là màu
   * nền nếp của thương hiệu (đồ nền, huy hiệu, gạch), còn `hot` chỉ dùng cho thứ
   * muốn người ta BẤM. Trộn chung thì cái nút không còn nổi hơn cái gì cả.
   */
  hot?: string;
  hot2?: string;
  ink: string;
  inkSoft?: string;
  inkFaint?: string;
  paper?: string;
  line?: string;
  skeleton?: string;
}

export interface SceneDoc {
  version: 1;
  meta: SceneMeta;
  scenes: Scene[];
}

export function totalDuration(doc: SceneDoc): number {
  return doc.scenes.reduce((sum, scene) => sum + scene.duration, 0);
}

/**
 * Soát kịch bản trước khi ghi ra đĩa.
 *
 * Bộ dựng chạy trong trình duyệt và cố gắng không chết giữa chừng, nên kịch bản
 * hỏng sẽ hiện ra thành một clip **trông như chạy được** mà sai — kiểu lỗi tệ
 * nhất. Chặn ở đây, nơi còn nói được câu tử tế.
 */
export function validateScene(doc: unknown): string[] {
  const problems: string[] = [];
  const d = doc as Partial<SceneDoc> | null;
  if (!d || typeof d !== 'object') return ['Kịch bản không phải một đối tượng.'];
  if (d.version !== 1) problems.push('Thiếu `version: 1`.');

  const m = d.meta;
  if (!m || typeof m !== 'object') problems.push('Thiếu `meta`.');
  else {
    if (!(m.width > 0) || !(m.height > 0)) problems.push('`meta.width` và `meta.height` phải là số dương.');
    if (!(m.density > 0)) problems.push('`meta.density` phải là số dương.');
    for (const key of ['bg', 'accent', 'ink'] as const) {
      if (typeof m[key] !== 'string' || !m[key]) problems.push(`\`meta.${key}\` phải là một màu.`);
    }
  }

  if (!Array.isArray(d.scenes) || d.scenes.length === 0) {
    problems.push('Phải có ít nhất một cảnh.');
    return problems;
  }

  const ids = new Set<string>();
  d.scenes.forEach((scene, i) => {
    const where = `Cảnh ${i + 1}`;
    if (!scene || typeof scene !== 'object') return problems.push(`${where}: không phải đối tượng.`);
    if (!scene.id) problems.push(`${where}: thiếu \`id\`.`);
    else if (ids.has(scene.id)) problems.push(`${where}: trùng id "${scene.id}".`);
    else ids.add(scene.id);
    if (!(scene.duration > 0)) problems.push(`${where}: \`duration\` phải là số giây dương.`);
    if (!Array.isArray(scene.elements)) return problems.push(`${where}: thiếu \`elements\`.`);

    const elIds = new Set<string>();
    // Khối dàn có con bên trong — phải soi cả con, không thì lỗi nằm trong khối
    // lọt qua rồi hiện ra thành một cảnh trông như chạy được mà sai.
    const flatten = (list: SceneElement[]): SceneElement[] =>
      list.flatMap((el) => (el && el.kind === 'group' ? [el, ...flatten(el.children ?? [])] : [el]));
    flatten(scene.elements).forEach((el, j) => {
      const at = `${where}, phần tử ${j + 1}`;
      if (!el || typeof el !== 'object') return problems.push(`${at}: không phải đối tượng.`);
      if (!el.id) problems.push(`${at}: thiếu \`id\`.`);
      else if (elIds.has(el.id)) problems.push(`${at}: trùng id "${el.id}".`);
      else elIds.add(el.id);
      if (!el.kind) problems.push(`${at}: thiếu \`kind\`.`);
      if (typeof el.x !== 'number' || typeof el.y !== 'number') problems.push(`${at}: \`x\` và \`y\` phải là số.`);
      // Bậc thang chỉ có 0..7 — viết 24 vào đây là nhầm với px, phải nói ngay.
      for (const key of ['pad', 'gap'] as const) {
        const v = (el as unknown as Record<string, unknown>)[key];
        if (v != null && (typeof v !== 'number' || v < 0 || v > 7)) {
          problems.push(`${at}: \`${key}\` là BẬC 0..7 (không phải px), đang là ${String(v)}.`);
        }
      }
      // Phần tử vào sau khi cảnh đã hết thì không ai thấy — gần như luôn là lỗi gõ.
      if (el.at != null && scene.duration > 0 && el.at >= scene.duration) {
        problems.push(`${at}: xuất hiện ở giây ${el.at} nhưng cảnh chỉ dài ${scene.duration}s.`);
      }
    });
  });

  return problems;
}
