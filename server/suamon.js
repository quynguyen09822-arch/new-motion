/**
 * AI SỬA MỘT MÓN ĐANG CHỌN, theo lời dặn hoặc theo một ảnh minh hoạ.
 *
 * KHÁC `dungcanh.js`: kia dựng MỚI cả một cảnh, đây chỉ động vào ĐÚNG MỘT món
 * người dùng đang chọn. Phạm vi hẹp là chỗ mạnh nhất của nó — AI không phải đoán
 * bố cục cả màn hình, chỉ cần sửa đúng thứ được chỉ vào.
 *
 * BỐN CỬA CHẶN:
 *
 *   1. KHÔNG ĐỔI `kind` VÀ `id`. Đổi `kind` là thay hẳn món khác chứ không phải
 *      sửa, và người dùng sẽ mất luôn mọi thứ đã chỉnh. Đổi `id` là đứt mọi tham
 *      chiếu tới nó. Hai trường này ép về giá trị cũ sau khi AI trả lời.
 *
 *   2. CHỈ NHẬN NHỮNG TRƯỜNG CÓ THẬT trong món cùng loại. AI rất hay bịa ra tên
 *      trường nghe hợp lý (`fontWeight`, `color`, `shadow`) mà bộ dựng không đọc.
 *      Trường lạ thì bỏ, và NÓI RA là đã bỏ những gì — im lặng bỏ thì người dùng
 *      tưởng AI làm rồi mà nhìn không thấy đổi gì.
 *
 *   3. SOÁT LẠI bằng chính `validateScene` sau khi vá.
 *
 *   4. TRẢ VỀ BẢN VÁ KÈM DANH SÁCH THAY ĐỔI (cũ → mới) để người dùng nhìn thấy
 *      trước khi nhận. "Đã sửa xong" mà không nói sửa gì thì không ai dám bấm.
 */
import { goiGemini, HAN_GIAY_ANH } from './gemini.js';
import { soatKichBan } from './proj.js';

/* Trường không bao giờ được AI đổi. `children` cũng nằm đây: sửa một món thì
   không được âm thầm thay cả cây con bên trong nó. */
const CAM_DOI = new Set(['kind', 'id', 'children']);

/** Tìm một món trong tài liệu, trả kèm cảnh chứa nó. */
export function timMon(doc, canhId, monId) {
  for (const c of doc?.scenes || []) {
    if (canhId && c.id !== canhId) continue;
    const di = (ds) => {
      for (const e of ds || []) {
        if (e?.id === monId) return e;
        const s = di(e?.children);
        if (s) return s;
      }
      return null;
    };
    const m = di(c.elements);
    if (m) return { canh: c, mon: m };
  }
  return null;
}

/**
 * Những trường một món loại này ĐƯỢC PHÉP có.
 *
 * Gom từ chính các món cùng `kind` đang có trong clip, cộng thêm bộ trường chung.
 * Không có bảng khai sẵn nào liệt kê đủ các trường của 23 loại, mà viết tay một
 * bảng như vậy thì nó sẽ lệch khỏi bộ dựng ngay lần thêm núm tiếp theo.
 */
const CHUNG = ['x', 'y', 'w', 'h', 'at', 'in', 'out', 'opacity', 'rotate', 'place',
  'dir', 'align', 'justify', 'gap', 'pad', 'radius', 'fill', 'ink', 'keys',
  'blur', 'shine', 'glow', 'shadow', 'mask', 'blend'];

export function truongChoPhep(doc, kind) {
  const co = new Set(CHUNG);
  const di = (ds) => {
    for (const e of ds || []) {
      if (e?.kind === kind) for (const k of Object.keys(e)) if (!CAM_DOI.has(k)) co.add(k);
      di(e?.children);
    }
  };
  for (const c of doc?.scenes || []) di(c.elements);
  return co;
}

function loiNhac(mon, kind, truong, meta, y, coAnh) {
  return `Bạn sửa MỘT thành phần trong một clip quảng cáo. Chỉ sửa đúng thành phần này.

KHUNG HÌNH: ${meta.width}×${meta.height} px.
MÀU CỦA CLIP (dùng lại, đừng chế màu mới):
  nền ${meta.bg} · chữ ${meta.ink} · nhấn ${meta.accent}${meta.accent2 ? ` · nhấn 2 ${meta.accent2}` : ''}${meta.hot ? ` · nóng ${meta.hot}` : ''}

THÀNH PHẦN ĐANG CHỌN (loại \`${kind}\`):
${JSON.stringify(mon, null, 2)}

CHỈ ĐƯỢC ĐẶT NHỮNG TRƯỜNG SAU, không được chế thêm tên trường:
${[...truong].sort().join(', ')}

LUẬT
1. Trả về MỘT đối tượng JSON chỉ chứa NHỮNG TRƯỜNG BẠN ĐỔI. Trường nào giữ
   nguyên thì đừng ghi lại.
2. KHÔNG đổi \`kind\`, \`id\`, \`children\` — ba trường đó bị khoá.
3. Muốn BỎ một trường thì đặt giá trị \`null\`.
4. \`pad\` và \`gap\` là BẬC THANG 0..7, không phải pixel.
5. Chữ: dấu \`|\` là xuống dòng, \`**chữ**\` là tô màu nhấn.
6. Hiệu ứng vào: \`"in":{"kind":"rise"|"fade"|"pop","ease":"out","dur":0.6}\`.
${coAnh ? '7. Có một ảnh minh hoạ kèm theo — sửa cho giống ảnh đó nhất có thể, trong giới hạn những trường được phép.\n' : ''}
NGƯỜI DÙNG DẶN
${String(y || '').trim() || '(không dặn gì — bám theo ảnh minh hoạ)'}

CHỈ TRẢ VỀ JSON. Không rào đầu, không giải thích, không dấu \`\`\`.`;
}

function bocJSON(chu) {
  let t = String(chu || '').trim();
  const m = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  if (m) t = m[1].trim();
  const d = t.indexOf('{');
  const c = t.lastIndexOf('}');
  if (d < 0 || c <= d) return null;
  try { return JSON.parse(t.slice(d, c + 1)); } catch { return null; }
}

/**
 * Lọc bản vá AI trả về: bỏ trường khoá và trường lạ, NÓI RA đã bỏ những gì.
 *
 * Tách riêng thành hàm THUẦN để kiểm được mà không phải gọi AI. Kiểm qua đường
 * gọi AI thì phép kiểm phụ thuộc vào việc model có chịu đề nghị trường bậy hay
 * không — lần nó ngoan là phép kiểm xanh mà chẳng canh được gì.
 */
export function locVa(va, truong) {
  const boQua = [];
  const sach = {};
  for (const [k, v] of Object.entries(va || {})) {
    if (CAM_DOI.has(k)) { boQua.push(`${k} (trường khoá)`); continue; }
    if (!truong.has(k)) { boQua.push(`${k} (không có trường này)`); continue; }
    sach[k] = v;
  }
  return { sach, boQua };
}

const bang = (v) => JSON.stringify(v) === undefined ? 'undefined' : JSON.stringify(v);

export async function suaMon({ doc, canhId, monId, y, anh, mime }) {
  const t = timMon(doc, canhId, monId);
  if (!t) return { ok: false, cau: 'Không thấy thành phần đang chọn. Chọn lại rồi thử.' };
  if (!String(y || '').trim() && !anh) {
    return { ok: false, cau: 'Nói cho AI biết muốn sửa gì, hoặc đưa một ảnh minh hoạ.' };
  }
  const meta = doc.meta || {};
  const kind = t.mon.kind;
  const truong = truongChoPhep(doc, kind);

  // Bỏ `children` ra khỏi thứ đưa cho AI: món có cây con thì cây đó có thể rất
  // dài, mà AI cũng không được phép đụng vào.
  const goiMon = { ...t.mon };
  if (goiMon.children) goiMon.children = `[${goiMon.children.length} món con — không được đụng]`;

  const phan = [{ text: loiNhac(goiMon, kind, truong, meta, y, Boolean(anh)) }];
  if (anh) phan.push({ inline_data: { mime_type: mime || 'image/png', data: anh } });

  /* Có ảnh thì nới hạn giờ: nhìn ảnh lâu hơn hẳn đọc chữ, và hạn 12 giây mặc
     định làm cả bốn model quá hạn. Không có ảnh thì giữ hạn ngắn cho nhanh. */
  const g = await goiGemini(phan, { nong: 0.35, toiDa: 3000, nghi: true,
    ...(anh ? { hanGiay: HAN_GIAY_ANH } : {}) });
  if (!g.ok) return { ok: false, cau: g.cau };
  const va = bocJSON(g.chu);
  if (!va || typeof va !== 'object') return { ok: false, cau: 'AI trả về thứ không phải JSON.' };

  const { sach, boQua } = locVa(va, truong);

  const doi = Object.entries(sach)
    .filter(([k, v]) => bang(t.mon[k]) !== bang(v))
    .map(([k, v]) => ({ truong: k, cu: t.mon[k] ?? null, moi: v }));

  if (!doi.length) {
    return { ok: false, cau: 'AI không đổi gì cả.'
      + (boQua.length ? ` (đã bỏ ${boQua.length} trường không dùng được: ${boQua.slice(0, 3).join(', ')})` : ''),
      boQua };
  }

  /* Soát bằng chính bộ soát mà nút Lưu dùng — vá lên một BẢN SAO, không đụng bản thật. */
  const sao = structuredClone(doc);
  const t2 = timMon(sao, canhId, monId);
  for (const [k, v] of Object.entries(sach)) { if (v === null) delete t2.mon[k]; else t2.mon[k] = v; }
  const vanDe = await soatKichBan(sao);

  return {
    ok: vanDe.length === 0,
    va: sach,
    doi,
    boQua,
    vanDe,
    model: g.model,
    cau: vanDe.length ? `Bản sửa còn ${vanDe.length} chỗ chưa hợp lệ.` : null,
  };
}
