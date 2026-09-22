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
import { goiGemini, HAN_GIAY_ANH } from './gemini.js';
import { PROJ, soatKichBan } from './proj.js';
import { banDoNen, soatChatLuong, tuongPhan } from '../web/soat.js';

/* 23 loại có mẫu thật trong kho clip. `video` không có mẫu nên không mời AI dùng
   — món đó cần file phim có thật, AI đoán tên file là ra món hỏng. */
export const LOAI_CHO_PHEP = [
  'group', 'text', 'panel', 'card', 'nut', 'image', 'browser', 'huyhieu', 'logo',
  'chip', 'form', 'table', 'timeline', 'phone', 'chat', 'shield', 'upload',
  'wheel', 'calendar', 'hangnhan', 'quydao', 'pointer', 'nen',
];

/** Mẫu thật, rút từ chính các clip trong dự án. Đọc một lần rồi nhớ.
    Xuất ra để `tuhtml.js` dùng CHUNG — hai kho mẫu khác nhau là hai lời nhắc
    dạy AI hai hình dạng khác nhau cho cùng một `kind`. */
let _mau = null;
export function mauThat() {
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
MÀU — ĐỌC THẲNG TỪ ẢNH, đây là việc quan trọng bậc nhất.
  Nhìn ảnh, lấy đúng màu nó đang dùng, rồi ghi vào món dưới dạng mã hex:
    \`fill\`  màu nền của một khối  (panel, card, nut, chip…)
    \`ink\`   màu chữ của một khối  (text, và mọi món có chữ bên trong)
  Nền cả khung: nếu ảnh có màu nền rõ rệt, đặt món ĐẦU TIÊN là
    {"kind":"panel","id":"nen-khung","x":0,"y":0,"place":"day","fill":"<màu nền của ảnh>"}
  TƯƠNG PHẢN LÀ BẮT BUỘC. Trước khi chốt \`ink\` cho một món, nhìn xem PHÍA SAU
  nó là gì — \`fill\` của khối bọc ngoài, hoặc màu nền khung nếu không có khối
  nào. Nền TỐI thì chữ phải SÁNG; nền SÁNG thì chữ phải TỐI. Đừng đặt #333 lên
  #222. Đây là lỗi hay gặp nhất, và nó làm cả cảnh không đọc được dù mọi thứ
  khác đúng.

  Bảng màu sẵn của clip chỉ là ĐƯỜNG LÙI, dùng khi ảnh mờ hoặc không rõ màu:
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
3. \`pad\` (đệm trong) và \`gap\` (khe giữa các món) là BẬC THANG 0..7, KHÔNG
   phải pixel. Viết 24 vào đó là sai. Đây là bảng quy đổi THẬT của bộ dựng:
     bậc 0→0px · 1→4px · 2→8px · 3→12px · 4→16px · 5→24px · 6→32px · 7→48px
   Cách làm: ĐO khoảng trống trong ảnh bằng pixel, rồi chọn bậc gần nhất. Thẻ và
   khối thường ở bậc 4–5; khe giữa các món trong một cụm thường bậc 3–4.
4. Muốn xếp nhiều món theo hàng/cột thì bọc trong \`group\` với
   \`place\`: "giua"|"tren"|"duoi", \`dir\`: "doc"|"ngang", và đặt con vào \`children\`.
   Con trong group để \`x:0, y:0\` — group tự dàn.
5. Chữ: dùng \`text\` với \`text\`, \`sub\`, \`size\`, \`align\`. Dấu \`|\` trong \`text\`
   là xuống dòng, \`**chữ**\` là tô màu nhấn.
   CHÉP ĐỦ MỌI CHỮ NHÌN THẤY TRONG ẢNH — cả nhãn nhỏ, con số, chú thích dưới
   chân. Không tóm tắt, không rút gọn, không bịa thêm chữ ảnh không có. Thiếu
   một dòng là bản dựng ra khác hẳn ảnh gốc.
   Cỡ chữ cũng ĐO từ ảnh: ước chiều cao chữ hoa theo pixel rồi đặt vào \`size\`.
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
      /* Hạn rộng vì lượt này GỬI KÈM ẢNH: model phải nhìn, đo, rồi sinh vài nghìn
           token JSON — hạn 12 giây mặc định là cả bốn model đều quá hạn, và người
           dùng chỉ thấy "AI dở" chứ không biết nó chưa kịp trả lời. */
        { nong: 0.4, toiDa: 8000, nghi: true, hanGiay: HAN_GIAY_ANH },
    );
    if (!g.ok) return { loi: g.cau };
    const canh = bocJSON(g.chu);
    if (!canh) return { loi: 'AI trả về thứ không phải JSON.', model: g.model };
    /* Lấp `x`/`y` VẮNG MẶT trước khi soát. Đường HTML đã làm việc này từ đầu,
       đường ảnh thì quên — và hai đường dùng chung một bộ soát, nên chỗ quên
       hiện ra thành "phần tử 9: `x` và `y` phải là số", đúng những món nằm
       trong cụm. Lấp ở ĐÂY chứ không ở ngoài, để cả vòng sửa lại cũng được lấp
       chứ không riêng lượt đầu. */
    return { canh: chuanHoaCanh(canh), model: g.model };
  };

  let r = await goi();
  if (r.loi) return { ok: false, cau: r.loi };

  /* Soát bằng CHÍNH bộ soát mà nút Lưu dùng — không viết bộ soát riêng cho AI.
     Hai bộ soát khác nhau là sớm muộn cũng lệch, và lúc đó AI sinh ra thứ qua
     được cửa này nhưng không lưu được. */
  const thu = (c) => soatKichBan({ version: 1, meta, scenes: [c] });

  /* TẦNG SOÁT THỨ HAI, đưa vào vòng sửa của AI.
     `validateScene` chỉ hỏi "kịch bản có HỢP LỆ không". Một cảnh chữ đen đặt
     trên nền đen thì hợp lệ hoàn toàn — và không đọc được chữ nào. Bảng soát
     chất lượng của app bắt đúng lỗi đó từ lâu (`CHU_CHIM_NEN`,
     `TUONG_PHAN_THAP`), chỉ là AI chưa bao giờ được xem. Nay đưa cho nó.
     Dùng CHÍNH `soatChatLuong` mà bảng bên phải đang dùng — hai bộ soát khác
     nhau là sớm muộn cũng nói khác nhau, và lúc đó AI sửa xong bảng vẫn kêu.
     CHỈ lấy nhóm tương phản: lời than về nhịp hay khổ hình thì AI sửa được ít
     mà dễ làm hỏng chỗ đang đúng. */
  const soatChu = (c) => {
    try {
      return (soatChatLuong({ version: 1, meta, scenes: [c] }).loi || [])
        .filter((l) => l.ma === 'CHU_CHIM_NEN' || l.ma === 'TUONG_PHAN_THAP')
        .map((l) => l.cau);
    } catch { return []; }   // bộ soát hỏng thì đừng kéo cả tính năng theo
  };

  let vanDe = await thu(r.canh);
  let chimNen = soatChu(r.canh);
  let daSua = false;

  if (vanDe.length || chimNen.length) {
    // Cho đúng MỘT lượt sửa. Sai hai lần thì lượt ba cũng không khá hơn.
    const r2 = await goi([...vanDe, ...chimNen], r.canh);
    if (!r2.loi && r2.canh) {
      const v2 = await thu(r2.canh);
      const c2 = soatChu(r2.canh);
      /* Nhận bản sửa khi TỔNG số chỗ hỏng giảm. So riêng từng nhóm thì gặp ca
         sửa được tương phản mà sinh thêm một lỗi định dạng, và lúc đó không
         biết chọn bản nào. */
      if (v2.length + c2.length < vanDe.length + chimNen.length) {
        r = r2; vanDe = v2; chimNen = c2; daSua = true;
      }
    }
  }

  return {
    ok: vanDe.length === 0,
    canh: r.canh,
    vanDe,
    chimNen,
    model: r.model,
    daSua,
    /* `ok` CHỈ nhìn tầng soát định dạng. Tương phản kém vẫn là cảnh hợp lệ, và
       người dùng có quyền cố tình làm vậy — luật ở mục 5.1 CLAUDE.md: "Tầng hai
       KHÔNG bao giờ được chặn lưu". Nên chữ chìm chỉ báo ra, không hạ `ok`. */
    cau: vanDe.length ? `Cảnh AI dựng còn ${vanDe.length} chỗ chưa hợp lệ.`
      : chimNen.length ? `Dựng xong, nhưng còn ${chimNen.length} chỗ chữ chìm vào nền.`
        : null,
  };
}

/**
 * CHUẨN HOÁ CẢNH AI VỪA SINH, trước khi đem đi soát.
 *
 * `validateScene` đòi `x` và `y` là SỐ ở mọi phần tử — kể cả phần tử nằm trong
 * `group`, nơi hai con số ấy vô nghĩa vì flex tự xếp chỗ (xem mục 5 CLAUDE.md).
 * Model bỏ quên chúng ở đúng những chỗ đó, và bỏ quên đều đặn: đo trên một lượt
 * dựng từ HTML thật, ba phần tử con trong cụm đều thiếu.
 *
 * Bắt AI nhớ một điều vô nghĩa là cách tốn tiền nhất để có một con số 0. Điền hộ
 * rẻ hơn, và KHÔNG che giấu lỗi nào: chỉ điền khi trường VẮNG MẶT, sai kiểu thì
 * vẫn để bộ soát bắt.
 */
export function chuanHoaCanh(canh) {
  if (!canh || typeof canh !== 'object') return canh;
  const di = (ds) => {
    for (const e of ds || []) {
      if (!e || typeof e !== 'object') continue;
      if (e.x == null) e.x = 0;
      if (e.y == null) e.y = 0;
      di(e.children);
    }
  };
  di(canh.elements);
  return canh;
}

/** Dưới ngưỡng này thì chữ coi như chìm vào nền. WCAG đòi 4.5 cho chữ nhỏ; ở
    đây chữ clip thường to nên lấy 3.0 — đủ để bắt ca hỏng thật mà không đi sửa
    những chỗ người ta cố tình làm mờ. */
const NGUONG_TUONG_PHAN = 3.0;

/**
 * VÁ CHỮ CHÌM NỀN, tất định.
 *
 * Vòng sửa của AI đã được xem lời than của bộ soát, nhưng đo thật thì nó vẫn sót:
 * một lượt dựng từ HTML còn đúng một nút chữ đen nằm trên nền tối, và lượt sửa
 * KHÔNG gỡ được. Nhờ model nhớ một luật số học là cách đắt và không chắc.
 *
 * Ở đây tính thẳng: lấy màu nền THẬT dưới từng món (`banDoNen` — chính hàm mà
 * bảng soát và bảng lớp đang dùng, nên ba nơi không nói khác nhau), đo tương
 * phản, thấp quá thì đổi `ink` sang trắng hoặc gần đen, chọn bên nào tương phản
 * hơn.
 *
 * KHÔNG đụng tới `fill`: đổi màu nền là đổi thiết kế của người ta. Chỉ đổi màu
 * CHỮ, vì chữ không đọc được thì không còn là thiết kế nữa.
 */
export function vaTuongPhan(canh, meta) {
  if (!canh || !Array.isArray(canh.elements)) return 0;
  const nen = banDoNen(canh, meta);
  let va = 0;
  const di = (ds) => {
    for (const e of ds || []) {
      if (!e || typeof e !== 'object') { continue; }
      if (typeof e.ink === 'string' && e.id != null) {
        const duoi = nen.get(e.id)?.mau || meta?.bg;
        const tp = tuongPhan(e.ink, duoi);
        if (tp != null && tp < NGUONG_TUONG_PHAN) {
          const sang = tuongPhan('#ffffff', duoi) || 0;
          const toi = tuongPhan('#101010', duoi) || 0;
          e.ink = sang >= toi ? '#ffffff' : '#101010';
          va++;
        }
      }
      di(e.children);
    }
  };
  di(canh.elements);
  return va;
}
