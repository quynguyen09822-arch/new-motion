/**
 * KHO TRẠNG THÁI — một nguồn sự thật duy nhất cho kịch bản đang sửa.
 *
 * MỌI thay đổi đều đi qua `sua()`. Không có ngoại lệ — đó chính là thứ khiến
 * hoàn tác luôn đúng: không có đường nào sửa được kịch bản mà lọt ngoài sổ.
 *
 * Hoàn tác dùng cách CHÉP NGUYÊN cả kịch bản mỗi bước, không dựng hệ thống
 * patch/nghịch đảo. Một kịch bản chỉ vài trăm KB, chép 100 bản là không đáng
 * kể; còn hệ patch thì đẻ ra đủ thứ bug tinh vi kiểu "hoàn tác xong lệch một ly".
 * Ở cỡ dữ liệu này, đơn giản là đúng.
 */

const TOI_DA = 120;        // số bước hoàn tác giữ lại
const CHO_NHAP = 5000;     // rảnh chừng này thì tự lưu nháp

export function taoKho() {
  let doc = null;
  let slug = null;
  let mocSach = null;      // bản lúc vừa mở/vừa lưu, để biết có bẩn không
  const lui = [];          // ngăn hoàn tác: {doc, nhan}
  const toi = [];          // ngăn làm lại
  let cuChi = null;        // gộp cả một lượt kéo / rê thanh trượt thành 1 bước
  const nghe = new Set();
  let henNhap = null;

  const chep = (x) => structuredClone(x);
  const baoDoi = (viec) => { for (const f of nghe) f(viec); };

  function henLuuNhap() {
    clearTimeout(henNhap);
    henNhap = setTimeout(() => {
      if (!slug || !doc) return;
      fetch(`/api/draft/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc }),
      }).catch(() => {});
    }, CHO_NHAP);
  }

  return {
    /* ---------- nạp ---------- */
    nap(tenClip, kichBan) {
      slug = tenClip;
      doc = chep(kichBan);
      mocSach = JSON.stringify(doc);
      lui.length = 0;
      toi.length = 0;
      cuChi = null;
      baoDoi('nap');
    },

    doc: () => doc,
    slug: () => slug,
    ban: () => doc != null && JSON.stringify(doc) !== mocSach,

    /* ---------- sửa ---------- */
    /**
     * `nhan` là câu tiếng Việt tả việc vừa làm — nó hiện lên nút hoàn tác thành
     * "Hoàn tác: kéo chữ tiêu đề". Với người không rành kỹ thuật, đây là khác
     * biệt giữa hoàn tác dùng được và hoàn tác đáng sợ.
     */
    sua(nhan, viec) {
      if (!doc) return;
      // Đang trong một cử chỉ (kéo, rê thanh trượt) thì chỉ ghi sổ MỘT lần ở
      // nhịp đầu, để cả lượt kéo chỉ tốn một bước hoàn tác.
      if (!cuChi || !cuChi.daGhi) {
        lui.push({ doc: chep(doc), nhan });
        if (lui.length > TOI_DA) lui.shift();
        toi.length = 0;
        if (cuChi) cuChi.daGhi = true;
      }
      viec(doc);
      henLuuNhap();
      baoDoi('sua');
    },

    /** Mở một cử chỉ: mọi `sua()` từ đây tới `dongCuChi()` gộp thành một bước. */
    moCuChi(nhan) { cuChi = { nhan, daGhi: false }; },
    dongCuChi() { cuChi = null; },

    hoanTac() {
      if (!lui.length) return null;
      const b = lui.pop();
      toi.push({ doc: chep(doc), nhan: b.nhan });
      doc = b.doc;
      baoDoi('sua');
      return b.nhan;
    },

    lamLai() {
      if (!toi.length) return null;
      const b = toi.pop();
      lui.push({ doc: chep(doc), nhan: b.nhan });
      doc = b.doc;
      baoDoi('sua');
      return b.nhan;
    },

    nhanLui: () => (lui.length ? lui[lui.length - 1].nhan : null),
    nhanToi: () => (toi.length ? toi[toi.length - 1].nhan : null),

    /* ---------- lưu ---------- */
    async luu() {
      if (!doc || !slug) return { ok: false, vanDe: ['Chưa mở clip nào.'] };
      const r = await fetch(`/api/clip/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc }),
      });
      const kq = await r.json();
      if (kq.ok) {
        mocSach = JSON.stringify(doc);
        clearTimeout(henNhap);
        baoDoi('luu');
      }
      return kq;
    },

    khiDoi(f) { nghe.add(f); return () => nghe.delete(f); },
  };
}

/* ---------- tìm kiếm trong kịch bản ---------- */

/** Duyệt phẳng mọi món trong một cảnh, kể cả con nằm trong cụm. */
export function duyetMon(els, cha = null, ra = []) {
  for (const el of els || []) {
    ra.push({ el, cha });
    if (el.kind === 'group') duyetMon(el.children, el, ra);
  }
  return ra;
}

export function timCanh(doc, canhId) {
  return (doc?.scenes || []).find((s) => s.id === canhId) || null;
}

/** Trả về { el, cha, canh } — `cha` là cụm chứa nó, null nếu nằm ngoài cùng. */
export function timMon(doc, canhId, monId) {
  const canh = timCanh(doc, canhId);
  if (!canh) return null;
  const hit = duyetMon(canh.elements).find((x) => x.el.id === monId);
  return hit ? { ...hit, canh } : null;
}

/** Đường dẫn từ cảnh xuống tới món, để vẽ thanh chỉ đường. */
export function duongDanMon(doc, canhId, monId) {
  const canh = timCanh(doc, canhId);
  if (!canh) return [];
  const duong = [];
  const dao = (els, tren) => {
    for (const el of els || []) {
      const nay = [...tren, el];
      if (el.id === monId) { duong.push(...nay); return true; }
      if (el.kind === 'group' && dao(el.children, nay)) return true;
    }
    return false;
  };
  dao(canh.elements, []);
  return duong;
}
