/**
 * TẠO DỰ ÁN MỚI trong kho của người đang đăng nhập.
 *
 * Trước đây trình sửa chỉ có `/api/clip/:slug` GET và POST: sửa được clip đã
 * có, không tạo được clip mới. Sửa hết 11 clip cũ là hết việc.
 *
 * BA LUẬT, cả ba đều đã trả giá ở chỗ khác trong repo này:
 *
 *  1. KHÔNG BAO GIỜ ĐÈ. Trùng tên thì từ chối và gợi ý một tên còn trống. Tự đè
 *     là mất việc của người khác mà không ai kịp biết; tự thêm đuôi số lặng lẽ
 *     là hai dự án cùng hiện một cái tên trong danh sách, rồi người dùng mở
 *     nhầm.
 *  2. DỰ ÁN TRẮNG PHẢI SOÁT ĐƯỢC. Nó đi qua đúng `luuClip` như mọi lần lưu
 *     khác, nghĩa là qua `validateScene`. Sinh thẳng ra file là có ngày khuôn
 *     đổi mà chỗ này không đổi theo, và người dùng nhận một dự án mở ra đã hỏng.
 *  3. TRẮNG NHƯNG KHÔNG RỖNG. Một cảnh không có món nào vẫn hợp lệ, nhưng mở ra
 *     là khung đen thui — người dùng tưởng công cụ hỏng. Đặt sẵn đúng một thẻ
 *     chữ mang tên dự án.
 */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { catBanCu } from './backup.js';
import { docClip } from './clips.js';
import { xoaNhap } from './drafts.js';
import { luuClip } from './save.js';
/* MƯỢN của `web/`, không chép: trang tạo dự án hiện tên file ngay lúc gõ, và
   hai bản luật đặt tên thì sớm muộn cũng lệch. Cùng cách `main.js` mượn
   `soatChatLuong` từ `web/soat.js`. */
import { ganTen } from '../web/tenfile.js';

/** Khổ dựng sẵn. Tên gọi theo chỗ đăng, không gọi theo con số. */
export const KHO_HINH = [
  { v: 'ngang', nhan: 'Ngang 16:9 — YouTube, web', rong: 1280, cao: 720 },
  { v: 'doc', nhan: 'Dọc 9:16 — Reels, TikTok, Shorts', rong: 720, cao: 1280 },
  { v: 'vuong', nhan: 'Vuông 1:1 — bài đăng mạng xã hội', rong: 1080, cao: 1080 },
];

/** Tên còn trống gần nhất trong kho này: `ten`, `ten-2`, `ten-3`… */
export function tenConTrong(slug, kho) {
  if (!docClip(slug, kho)) return slug;
  for (let i = 2; i < 200; i++) {
    const thu = `${slug}-${i}`.slice(0, 49);
    if (!docClip(thu, kho)) return thu;
  }
  return `${slug}-${Date.now().toString(36).slice(-5)}`;
}

/**
 * Kịch bản của một dự án trắng.
 *
 * Màu lấy đúng bộ mà các clip sẵn có đang dùng, không bịa bảng màu mới: dự án
 * mới mở ra phải trông cùng một nhà với dự án cũ.
 */
export function duAnTrang(ten, rong, cao) {
  /* Cỡ chữ theo CẠNH NGẮN, không theo chiều cao. Theo chiều cao thì clip dọc
     1280 ra cỡ chữ 128 — một dòng tiêu đề tràn hết khung ngay lúc mở ra. */
  const co = Math.round(Math.min(rong, cao) * 0.1);
  return {
    version: 1,
    meta: { name: ten, width: rong, height: cao, density: 1,
      bg: '#0a0b10', ink: '#f4f6fb', accent: '#ff6a1f' },
    scenes: [{
      id: 'canh-1',
      duration: 4,
      stagger: 0.16,
      elements: [
        /* KHÔNG dùng `place: 'giua'`. Nghe tên thì tưởng căn giữa, nhưng nó đặt
           khối chữ phủ khung trừ lề và chữ vẫn nằm sát mép TRÊN của khối — đúng
           cái bẫy đã ghi trong `server/canhmau.js`. Đặt `y` tay. */
        { kind: 'text', id: 'chu-1', x: 0, y: Math.round((cao - co) / 2),
          w: rong, align: 'center', size: co, text: ten,
          in: { kind: 'rise', ease: 'out', dur: 0.55 } },
      ],
    }],
  };
}

/**
 * Tạo một dự án.
 *
 * @param {object} y          { ten, slug?, kho: 'ngang'|'doc'|'vuong', mau?: slug }
 * @param {object} kho        kho của người đang đăng nhập
 * @param {string|null} email ai đang làm việc này, để vào nhật ký
 * @returns {{ok:boolean, slug?:string, loi?:string, goiY?:string, vanDe?:string[]}}
 */
export async function taoDuAn(y, kho, email = null) {
  const ten = String(y?.ten || '').trim().slice(0, 80);
  if (!ten) return { ok: false, ma: 400, loi: 'Chưa đặt tên cho dự án.' };

  /* Tên rút gọn rỗng nghĩa là cái tên vừa gõ không còn chữ Latin nào sau khi bỏ
     dấu (toàn biểu tượng, toàn chữ Nhật…). Đặt tên thay chứ đừng từ chối —
     người ta vừa gõ một cái tên hợp lệ với họ. */
  const slug = String(y?.slug || '').trim()
    || ganTen(ten)
    || `du-an-${Date.now().toString(36).slice(-5)}`;
  if (!/^[a-z0-9][a-z0-9-]{0,48}$/.test(slug)) {
    return { ok: false, ma: 400,
      loi: 'Tên rút gọn chỉ được gồm chữ thường không dấu, số và gạch ngang.' };
  }

  if (docClip(slug, kho)) {
    return { ok: false, ma: 409, goiY: tenConTrong(slug, kho),
      loi: `Trong kho của bạn đã có dự án "${slug}".` };
  }

  let doc;
  if (y?.mau) {
    /* Mẫu phải nằm trong CHÍNH kho này. Cho chép từ kho người khác là mở một
       cửa đọc trộm ngay trong tính năng sinh ra để tách kho ra. */
    const nguon = docClip(String(y.mau), kho);
    if (!nguon) return { ok: false, ma: 404, loi: `Không thấy dự án mẫu "${y.mau}" trong kho của bạn.` };
    doc = JSON.parse(JSON.stringify(nguon.doc));
    doc.meta = { ...doc.meta, name: ten };
  } else {
    const k = KHO_HINH.find((x) => x.v === y?.kho) || KHO_HINH[0];
    doc = duAnTrang(ten, k.rong, k.cao);
  }

  /* Đi qua đúng đường lưu thường ngày: soát → cất bản cũ (ở đây không có) →
     ghi nguyên khối → ghi nhật ký. Viết một đường ghi thứ hai là sớm muộn cũng
     có một luật chỉ áp cho một trong hai. */
  const kq = await luuClip(slug, doc, email, kho);
  if (!kq.ok) return { ok: false, ma: 422, loi: 'Dự án mới không qua được bộ soát.', vanDe: kq.vanDe };
  return { ok: true, slug, ten };
}

/**
 * XOÁ MỘT DỰ ÁN.
 *
 * Luật cứng số 1 của repo này: dự án clip KHÔNG có git, ghi đè sai một lần là
 * mất hẳn. Xoá còn nặng hơn ghi đè, nên ở đây **cất bản cũ TRƯỚC**, rồi mới xoá,
 * và trả về đường dẫn bản đã cất để câu báo nói được cho người dùng biết đồ của
 * họ đang nằm ở đâu. "Đã xoá" mà không nói cất ở đâu thì người ta không dám bấm.
 *
 * KHÔNG xoá được clip đời cũ: chúng là file HTML ở gốc dự án chung, không thuộc
 * kho của ai, và nhiều người khác cũng đang dùng. `catBanCu` trả null khi không
 * thấy file kịch bản — lấy luôn đó làm cửa chặn, khỏi phải kiểm hai lần.
 */
export function xoaDuAn(slug, kho) {
  if (!docClip(slug, kho)) {
    return { ok: false, ma: 404, loi: `Không thấy dự án "${slug}" trong kho của bạn.` };
  }

  const ban = catBanCu(slug, kho);
  if (!ban) {
    return { ok: false, ma: 400,
      loi: 'Chỉ xoá được dự án trong kho của bạn. Clip đời cũ là file dùng chung, không xoá ở đây được.' };
  }

  rmSync(path.join(kho.scenes, `${slug}.json`), { force: true });
  /* Xoá cả bản nháp. Để lại thì lần mở kho sau nó hiện ra như dự án chưa xoá,
     và người dùng tưởng nút xoá không ăn. */
  try { xoaNhap(slug, kho); } catch { /* không có nháp thì thôi */ }

  return { ok: true, slug, ban };
}
