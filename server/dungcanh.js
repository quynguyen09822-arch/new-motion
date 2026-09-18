/**
 * AI DỰNG CẢNH TỪ MỘT TẤM HÌNH.
 *
 * Người dùng đưa vào một ảnh (ảnh chụp màn hình, bản thiết kế, ảnh tham khảo),
 * AI đọc bố cục rồi dựng lại thành một CẢNH bằng đúng những thành phần app này có.
 *
 * BA CỬA CHẶN, và cả ba đều bắt buộc:
 *
 *   1. AI CHỈ ĐƯỢC GHÉP TỪ THÀNH PHẦN CÓ SẴN, không tự chế `kind` mới. Danh sách
 *      23 loại nằm ngay trong lời nhắc, kèm MẪU THẬT lấy từ chính clip của người
 *      dùng — bắt chước mẫu thật thì ra đúng hình dạng, còn tả bằng lời thì AI
 *      sẽ bịa ra tên trường nghe rất hợp lý mà bộ dựng không đọc được.
 *
 *   2. SINH XONG BẮT BUỘC QUA `validateScene`. Sai thì đưa NGUYÊN danh sách lỗi
 *      cho AI sửa lại một lượt. Sửa vẫn sai thì trả lỗi cho người dùng, không
 *      đưa cảnh hỏng vào clip.
 *
 *   3. TRẢ VỀ DẠNG ĐỀ XUẤT, không tự ghi vào clip. Người bấm nhận mới vào, và
 *      vào rồi vẫn hoàn tác được. Bỏ bước này là lần AI làm sai đầu tiên sẽ khiến
 *      người dùng tắt hẳn tính năng và không bao giờ bật lại.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { goiGemini } from './gemini.js';
import { PROJ, soatKichBan } from './proj.js';

/* 23 loại có mẫu thật trong kho clip. `video` không có mẫu nên không mời AI dùng
   — món đó cần file phim có thật, AI đoán tên file là ra món hỏng. */
export const LOAI_CHO_PHEP = [
  'group', 'text', 'panel', 'card', 'nut', 'image', 'browser', 'huyhieu', 'logo',
  'chip', 'form', 'table', 'timeline', 'phone', 'chat', 'shield', 'upload',
  'wheel', 'calendar', 'hangnhan', 'quydao', 'pointer', 'nen',
];

/** Mẫu thật, rút từ chính các clip trong dự án. Đọc một lần rồi nhớ. */
let _mau = null;
function mauThat() {
  if (_mau) return _mau;
  const thuMuc = path.join(PROJ, 'scenes');
  const mau = {};
  try {
    for (const ten of existsSync(thuMuc) ? readdirSync(thuMuc) : []) {
      if (!ten.endsWith('.json')) continue;
      let d;
      try { d = JSON.parse(readFileSync(path.join(thuMuc, ten), 'utf8')); } catch { continue; }
      const di = (ds) => {
        for (const e of ds || []) {
          const k = e?.kind;
          if (k && !mau[k]) {
            const c = { ...e };
            // Bỏ con ra: mẫu chỉ để dạy HÌNH DẠNG của một món, không phải cả cây.
            if (c.children) c.children = '…';
            mau[k] = c;
          }
          di(e?.children);
        }
      };
      for (const c of d?.scenes || []) di(c?.elements);
    }
  } catch { /* không đọc được thì đi tiếp với mẫu rỗng */ }
  _mau = mau;
  return mau;
}
function loiNhac(meta, y, vanDeCu, canhCu) {
  const mau = mauThat();
  const viDu = ['text', 'nut', 'panel', 'card', 'group', 'image', 'huyhieu', 'logo', 'browser']
    .filter((k) => mau[k])
    .map((k) => `  ${JSON.stringify(mau[k])}`)
    .join('\n');

  const suaLai = vanDeCu?.length ? `

LẦN TRƯỚC BẠN SINH RA CẢNH NÀY:
${JSON.stringify(canhCu)}

VÀ BỘ SOÁT BÁO CÁC LỖI SAU:
${vanDeCu.map((v) => `  - ${v}`).join('\n')}

Hãy sửa đúng những lỗi đó rồi trả lại cảnh mới. Giữ nguyên phần đã đúng.` : '';

  return `Bạn dựng MỘT CẢNH cho một app làm clip quảng cáo. Người dùng đưa cho bạn
một tấm hình; hãy dựng lại bố cục đó bằng đúng những thành phần app này có.

KHUNG HÌNH: ${meta.width}×${meta.height} px. Toạ độ tính từ góc trên trái.
MÀU CỦA CLIP (dùng lại, đừng chế màu mới):
  nền ${meta.bg} · chữ ${meta.ink} · nhấn ${meta.accent}${meta.accent2 ? ` · nhấn 2 ${meta.accent2}` : ''}${meta.hot ? ` · nóng ${meta.hot}` : ''}

CHỈ ĐƯỢC DÙNG NHỮNG \`kind\` SAU, không được chế thêm:
${LOAI_CHO_PHEP.join(', ')}

MẪU THẬT lấy từ chính clip của người dùng — bắt chước đúng hình dạng này:
${viDu}

LUẬT
1. Trả về ĐÚNG MỘT đối tượng JSON của một cảnh, dạng:
   {"id":"...","duration":<số giây>,"stagger":0.12,"elements":[ ... ]}
2. Mỗi phần tử BẮT BUỘC có \`id\` (chuỗi, không trùng nhau trong cảnh), \`kind\`,
   \`x\` và \`y\` (số).
3. \`pad\` và \`gap\` là BẬC THANG 0..7, KHÔNG phải pixel. Viết 24 vào đó là sai.
4. Muốn xếp nhiều món theo hàng/cột thì bọc trong \`group\` với
   \`place\`: "giua"|"tren"|"duoi", \`dir\`: "doc"|"ngang", và đặt con vào \`children\`.
   Con trong group để \`x:0, y:0\` — group tự dàn.
5. Chữ: dùng \`text\` với \`text\`, \`sub\`, \`size\`, \`align\`. Dấu \`|\` trong \`text\`
   là xuống dòng, \`**chữ**\` là tô màu nhấn.
6. Ảnh: chỉ dùng \`image\` khi CHẮC CHẮN có file đó trong dự án. Không đoán tên file.
   Không chắc thì thay bằng \`panel\` hoặc \`huyhieu\`.
7. Hiệu ứng vào: \`"in":{"kind":"rise"|"fade"|"pop","ease":"out","dur":0.6}\`.
   Muốn món vào lần lượt thì đặt \`at\` tăng dần (0, 0.12, 0.24…).
8. \`duration\` khoảng 4–6 giây.

${String(y || '').trim() ? `NGƯỜI DÙNG DẶN THÊM\n${String(y).trim()}\n` : ''}
CHỈ TRẢ VỀ JSON. Không rào đầu, không giải thích, không dấu \`\`\`.${suaLai}`;
}

/** Bóc JSON ra khỏi câu trả lời — model hay bọc trong dấu ``` dù đã dặn đừng. */
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
 * Dựng một cảnh từ ảnh.
 * @returns { ok, canh, vanDe[], model, daSua } hoặc { ok:false, cau }
 */
export async function dungCanh({ doc, anh, mime, y }) {
  const meta = doc?.meta;
  if (!meta?.width) return { ok: false, cau: 'Clip chưa có khổ hình.' };
  if (!anh) return { ok: false, cau: 'Chưa chọn ảnh.' };

  const goi = async (vanDeCu, canhCu) => {
    const g = await goiGemini(
      [{ text: loiNhac(meta, y, vanDeCu, canhCu) }, { inline_data: { mime_type: mime, data: anh } }],
      { nong: 0.4, toiDa: 8000, nghi: true },
    );
    if (!g.ok) return { loi: g.cau };
    const canh = bocJSON(g.chu);
    if (!canh) return { loi: 'AI trả về thứ không phải JSON.', model: g.model };
    return { canh, model: g.model };
  };

  let r = await goi();
  if (r.loi) return { ok: false, cau: r.loi };

  /* Soát bằng CHÍNH bộ soát mà nút Lưu dùng — không viết bộ soát riêng cho AI.
     Hai bộ soát khác nhau là sớm muộn cũng lệch, và lúc đó AI sinh ra thứ qua
     được cửa này nhưng không lưu được. */
  const thu = (c) => soatKichBan({ version: 1, meta, scenes: [c] });
  let vanDe = await thu(r.canh);
  let daSua = false;

  if (vanDe.length) {
    // Cho đúng MỘT lượt sửa. Sai hai lần thì lượt ba cũng không khá hơn, chỉ tốn thêm thời gian.
    const r2 = await goi(vanDe, r.canh);
    if (!r2.loi && r2.canh) {
      const v2 = await thu(r2.canh);
      if (v2.length < vanDe.length) { r = r2; vanDe = v2; daSua = true; }
    }
  }

  return {
    ok: vanDe.length === 0,
    canh: r.canh,
    vanDe,
    model: r.model,
    daSua,
    cau: vanDe.length ? `Cảnh AI dựng còn ${vanDe.length} chỗ chưa hợp lệ.` : null,
  };
}
