/**
 * NHẬT KÝ LƯỢT DÙNG — để trả lời được "công cụ này có ai dùng không".
 *
 * GHI NỐI THÊM VÀO CUỐI FILE, KHÔNG BAO GIỜ ĐỌC-SỬA-GHI.
 *   Hai người bấm lưu cùng lúc là hai tiến trình ghi cùng một file. Đọc-sửa-ghi
 *   thì bản ghi sau đè mất bản trước; nối thêm bằng `appendFileSync` với một
 *   dòng ngắn thì hệ điều hành ghi nguyên khối, không xen vào nhau.
 *
 * HỎNG THÌ NUỐT LỖI, TUYỆT ĐỐI KHÔNG ĐỂ VIỆC LƯU CLIP THẤT BẠI.
 *   Đây là số liệu thống kê. Đĩa đầy, thiếu quyền, thư mục bị xoá — không có
 *   lý do nào trong số đó đáng để người dùng mất công sửa clip. Mọi lời gọi ở
 *   đây đều bọc try/catch và đi tiếp.
 *
 * MỘT DÒNG MỘT JSON (`.jsonl`), không phải một mảng JSON lớn. Mảng thì muốn
 * thêm một dòng phải đọc cả file, sửa, ghi lại — đúng cái vừa nói ở trên.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THU_MUC = path.join(GOC, '.nhat-ky');
const FILE = path.join(THU_MUC, 'dung.jsonl');

/* Bản đã đẩy lên repo. Container KHÔNG giữ file giữa hai lần triển khai (vibehost
   không có chỗ gắn ổ lưu), nên nếu chỉ đọc `.nhat-ky/` thì mỗi lần deploy lại
   con số về 0 — mà con số cứ về 0 thì không trả lời được câu hỏi nó sinh ra để
   trả lời. Phần cũ nằm trong repo và đi theo ảnh Docker. Đọc CẢ HAI rồi gộp. */
const FILE_REPO = path.join(GOC, 'so-lieu', 'luot-dung.jsonl');

/* Trần 8 MB. Nhật ký là thứ chỉ lớn lên, không ai dọn — một dòng khoảng 120
   byte nên 8 MB là khoảng 70 nghìn lượt lưu, đủ vài năm. Chạm trần thì thôi
   ghi chứ KHÔNG xoá bớt: mất số cũ còn tệ hơn thiếu số mới, và im lặng xoá dữ
   liệu của người khác là việc không được làm. */
const TRAN_BYTE = 8 * 1024 * 1024;

/** Đếm cảnh trong một kịch bản, chịu được mọi kiểu dữ liệu hỏng. */
const demCanh = (doc) => (Array.isArray(doc?.scenes) ? doc.scenes.length : 0);

/**
 * Ghi một lượt dùng. KHÔNG bao giờ ném lỗi ra ngoài.
 * @param viec   'luu' | 'tao' | 'khoi-phuc'
 */
export function ghi(viec, { email, slug, doc, them } = {}) {
  try {
    if (!existsSync(THU_MUC)) mkdirSync(THU_MUC, { recursive: true });
    if (existsSync(FILE) && statSync(FILE).size > TRAN_BYTE) return;
    appendFileSync(FILE, `${JSON.stringify({
      luc: new Date().toISOString(),
      viec,
      ai: email || null,          // `null` chứ không phải chuỗi rỗng: phân biệt
      slug: slug || null,         // được "chưa đăng nhập" với "quên truyền vào"
      canh: demCanh(doc),
      ...(them ? { them } : {}),
    })}\n`, 'utf8');
  } catch { /* nuốt: thống kê hỏng không được phép làm hỏng việc lưu clip */ }
}

/** Đọc một file jsonl, bỏ qua dòng hỏng thay vì chết cả lượt đọc. */
function docMot(f) {
  try {
    if (!existsSync(f)) return [];
    return readFileSync(f, 'utf8').split('\n').filter(Boolean)
      .map((d) => { try { return JSON.parse(d); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

/**
 * Đọc cả phần cũ trên repo lẫn phần mới trong máy, gộp lại, bỏ trùng.
 *
 * Khoá trùng gồm cả `viec`: một người có thể lưu rồi khôi phục cùng một clip
 * trong cùng một mili giây khi máy nhanh, và đó là hai lượt khác nhau.
 */
function docDong() {
  const gom = new Map();
  for (const d of [...docMot(FILE_REPO), ...docMot(FILE)]) {
    gom.set(`${d.luc}|${d.ai}|${d.slug}|${d.viec}`, d);
  }
  return [...gom.values()].sort((a, b) => String(a.luc).localeCompare(String(b.luc)));
}

/**
 * Thống kê 7 và 30 ngày gần nhất.
 *
 * Đếm "người" và "clip" bằng `Set` chứ không cộng dồn: một người sửa 10 lần vẫn
 * là MỘT người. Lẫn hai con số đó là báo cáo ra một cộng đồng đông đúc tưởng
 * tượng, và đó đúng là kiểu số liệu khiến người ta quyết định sai.
 */
export function thongKe() {
  const ds = docDong();
  const gio = Date.now();
  const ngay = (n) => gio - n * 86400_000;

  const goi = (tu) => {
    const trong = ds.filter((d) => Date.parse(d.luc) >= tu);
    return {
      luot: trong.length,
      nguoi: new Set(trong.map((d) => d.ai).filter(Boolean)).size,
      clip: new Set(trong.map((d) => d.slug).filter(Boolean)).size,
    };
  };

  /* Ai dùng nhiều nhất, và clip nào được sửa nhiều nhất — hai câu hỏi đầu tiên
     người ta hỏi sau khi thấy con số tổng. */
  const dem = (lay) => {
    const m = new Map();
    for (const d of ds) { const k = lay(d); if (k) m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([ten, luot]) => ({ ten, luot }));
  };

  return {
    ok: true,
    tong: { luot: ds.length, nguoi: new Set(ds.map((d) => d.ai).filter(Boolean)).size,
      clip: new Set(ds.map((d) => d.slug).filter(Boolean)).size },
    bay: goi(ngay(7)),
    banMuoi: goi(ngay(30)),
    theoNguoi: dem((d) => d.ai),
    theoClip: dem((d) => d.slug),
    dauTien: ds[0]?.luc || null,
    ganNhat: ds[ds.length - 1]?.luc || null,
  };
}

export const duongDanNhatKy = () => FILE;
