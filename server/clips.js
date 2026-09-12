/**
 * DANH SÁCH CLIP — đọc `scenes/*.json`, và nhận diện clip đời cũ.
 *
 * Trong dự án có hai đời clip. Đời mới là dữ liệu (`scenes/<tên>.json`), sửa
 * bằng chuột được. Đời cũ là code viết tay trong một file HTML — xem và xuất
 * video được, nhưng vị trí do code tính lúc chạy nên không sửa bằng chuột được.
 * Hàm ở đây trả về cả hai, có gắn nhãn `doi`, để giao diện nói thẳng với người
 * dùng thay vì để họ bấm mãi không được rồi tưởng hỏng.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { PROJ, SCENES, tongThoiLuong } from './proj.js';

/**
 * Đời cũ: mỗi clip là một file HTML tự chứa ở gốc dự án. TỰ PHÁT HIỆN chứ không
 * khai tay — đội làm clip vẫn đang dựng thêm (bản văn phòng VH-02 xuất hiện
 * ngày 28/08 mà không ai báo), khai tay là clip mới lặng lẽ không hiện ra.
 */
const BO_QUA = new Set(['scene-player.html', 'index.html', 'tai-ve.html']);

function timDoiCu() {
  const ra = [];
  for (const ten of readdirSync(PROJ).sort()) {
    if (!ten.endsWith('.html') || ten.includes('.bak') || BO_QUA.has(ten)) continue;
    const f = path.join(PROJ, ten);
    let dau = '';
    try {
      // Chỉ đọc phần đầu file: mấy bản animatic nặng tới 1,3 MB.
      dau = readFileSync(f, 'utf8').slice(0, 4000);
    } catch { continue; }
    /*
     * Bỏ file nháp. `zz-probe.html` chỉ 68 byte, thân rỗng — không lọc thì nó
     * hiện lên trong danh sách chọn clip, người dùng bấm vào rồi ngơ ngác.
     * Chỉ dùng ngưỡng kích thước: clip thật nhẹ nhất cũng 26 KB. KHÔNG đòi có
     * `<script>` trong phần đầu — file 1,3 MB thì 4000 ký tự đầu toàn CSS,
     * đòi vậy là loại nhầm gần hết clip thật (đã mắc một lần).
     */
    if (statSync(f).size < 2000) continue;
    const tieuDe = giaiMaHtml((dau.match(/<title>([^<]*)<\/title>/) || [])[1]?.trim());
    ra.push({ slug: ten.replace(/\.html$/, ''), ten: tieuDe || ten, file: ten });
  }
  return ra;
}

/**
 * Đổi thực thể HTML trong `<title>` về chữ thật.
 *
 * `<title>VH-V2 · Tạo &amp; quản lý Database</title>` là HTML ĐÚNG — dấu `&`
 * bắt buộc phải viết là `&amp;`. Nhưng chỗ này lấy nó ra làm CHỮ THƯỜNG rồi
 * nhét vào `textContent`, nên người dùng đọc được nguyên chữ "&amp;" trong ô
 * chọn clip, ở thanh phát và trong mọi lời nhắc.
 *
 * Chỉ giải năm thực thể bắt buộc của XML. Không đụng tới dạng `&#…;`: tiêu đề
 * clip xưa nay chưa từng dùng, mà giải bừa thì mở đường cho chuỗi lạ.
 */
export function giaiMaHtml(t) {
  if (typeof t !== 'string') return t;
  return t
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');       // LUÔN cuối cùng, không thì "&amp;lt;" ra "<"
}

/** Tên file chỉ được là chữ thường, số và gạch ngang — không dấu chấm, không gạch chéo. */
export function locSlug(raw) {
  if (typeof raw !== 'string') return null;
  const slug = raw.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,48}$/.test(slug) ? slug : null;
}

export function duongDanClip(slug) {
  return path.join(SCENES, `${slug}.json`);
}

export function docClip(slug) {
  const f = duongDanClip(slug);
  if (!existsSync(f)) return null;
  return { doc: JSON.parse(readFileSync(f, 'utf8')), suaLuc: statSync(f).mtimeMs };
}

/** Đường dẫn xem thử, tính theo đời clip. Luôn là đường dẫn tương đối của CHÍNH server này. */
export function duongDanXem(clip) {
  return clip.doi === 2
    ? `/clip/scene-player.html?scene=${clip.slug}`
    : `/clip/${clip.file}`;
}

export async function danhSachClip() {
  const ds = [];

  for (const ten of readdirSync(SCENES).sort()) {
    if (!ten.endsWith('.json')) continue;
    const slug = ten.replace(/\.json$/, '');
    const f = path.join(SCENES, ten);
    try {
      const doc = JSON.parse(readFileSync(f, 'utf8'));
      ds.push({
        slug,
        doi: 2,
        ten: doc?.meta?.name || slug,
        rong: doc?.meta?.width ?? null,
        cao: doc?.meta?.height ?? null,
        dung: doc?.meta?.height > doc?.meta?.width,
        soCanh: Array.isArray(doc?.scenes) ? doc.scenes.length : 0,
        giay: Math.round((await tongThoiLuong(doc)) * 10) / 10,
        file: `scenes/${ten}`,
        suaLuc: statSync(f).mtimeMs,
      });
    } catch (e) {
      // Một file hỏng không được làm chết cả danh sách — báo ra rồi đi tiếp.
      ds.push({ slug, doi: 2, ten: slug, hong: `Không đọc được: ${e.message}`, file: `scenes/${ten}` });
    }
  }

  for (const cu of timDoiCu()) {
    ds.push({ ...cu, doi: 1, suaLuc: statSync(path.join(PROJ, cu.file)).mtimeMs });
  }

  return ds;
}
