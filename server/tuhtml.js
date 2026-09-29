/**
 * DỰNG CẢNH TỪ MỘT TRANG HTML.
 *
 * Đường Stitch → Motion: Stitch sinh màn hình giao diện dạng HTML, ta đọc nó rồi
 * dựng lại thành một CẢNH bằng đúng những thành phần app này có.
 *
 * VÌ SAO ĐƯỜNG NÀY TỐT HƠN HẲN ĐƯỜNG "DỰNG TỪ ẢNH"
 *
 *   Cùng một màn Stitch, đưa vào dưới dạng ẢNH thì AI phải đoán ngược lại mọi
 *   thứ từ pixel: đệm bao nhiêu, màu gì, chữ viết gì. Đưa dưới dạng HTML thì
 *   trình duyệt đã tính sẵn — `padding: 24px`, `#2f6bff`, và chữ nằm nguyên văn
 *   trong thẻ.
 *
 *   Đo trên màn Stitch thật của dự án: 102 khối chữ đọc ra đúng từng chữ, kèm
 *   màu và cỡ chính xác. Không một con số nào phải đoán.
 *
 *   Nên AI ở đây KHÔNG làm việc "nhìn và đoán". Nó chỉ làm đúng phần nó giỏi:
 *   nhìn một khối đã đo và nói "cái này là `card`", "cái này là `nut`".
 *
 * BA CỬA CHẶN — giữ nguyên như `dungcanh.js`, vì lý do vẫn y hệt:
 *   1. Chỉ được ghép từ 23 loại có sẵn, kèm MẪU THẬT lấy từ clip của người dùng.
 *   2. Sinh xong bắt buộc qua `validateScene`, sai thì cho sửa một lượt.
 *   3. Trả về dạng ĐỀ XUẤT, không tự ghi vào clip.
 */
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { goiGemini, HAN_GIAY_ANH } from './gemini.js';
import { LOAI_CHO_PHEP, chuanHoaCanh, mauThat, vaTuongPhan } from './dungcanh.js';
import { chuNhoNhat, soatVideo, tieuDeNhoNhat } from './soatvideo.js';
import { soatKichBan } from './proj.js';
import { soatChatLuong } from '../web/soat.js';

const chay = promisify(execFile);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Bản đồ bố cục của một màn giao diện đầy đủ có thể tới hai trăm khối. Đưa hết
   vào lời nhắc là tốn token mà phần đuôi toàn khối vụn. Cắt còn số này, ưu tiên
   khối TO và khối CÓ CHỮ — đó là thứ làm nên bố cục người xem nhận ra. */
const TOI_DA_KHOI = 70;

/** Gọi bộ đọc HTML, trả về bản đồ bố cục. */
async function docBanDo({ html, url, rong, cao }) {
  let thuMuc = null;
  try {
    let nguon = url;
    if (!nguon) {
      /* Ghi ra file tạm chứ không truyền HTML qua tham số dòng lệnh: một trang
         Stitch nặng 43 KB, vượt xa giới hạn độ dài lệnh trên nhiều hệ. */
      thuMuc = mkdtempSync(path.join(tmpdir(), 'motion-html-'));
      nguon = path.join(thuMuc, 'trang.html');
      writeFileSync(nguon, html, 'utf8');
    }
    const { stdout } = await chay('node',
      [path.join(GOC, 'tools', 'doc-html.mjs'), nguon, '--rong', String(rong), '--cao', String(cao)],
      { cwd: GOC, maxBuffer: 32 * 1024 * 1024, timeout: 120_000 });
    return JSON.parse(stdout);
  } finally {
    if (thuMuc) rmSync(thuMuc, { recursive: true, force: true });
  }
}

/**
 * LÀM SẠCH BẢN ĐỒ DO TRÌNH DUYỆT GỬI LÊN.
 *
 * Bản đồ này không còn do máy chủ tự đo mà do trình duyệt đo rồi gửi về — tức
 * là dữ liệu từ bên ngoài. Nó chỉ đi vào lời nhắc AI nên không mở được cửa nào,
 * nhưng vẫn phải chặn hai thứ: một khối chữ dài 1 MB (đốt sạch hạn mức token
 * trong một lượt) và những trường lạ không ai đọc (mỗi trường là token trả tiền).
 * Giữ ĐÚNG các trường `web/dobocuc.js` sinh ra, cắt chữ về đúng độ dài nó cắt.
 */
function lamSachBanDo(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.khoi)) return null;
  const so = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : undefined);
  const chuoi = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const mau = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
  const khoi = b.khoi.slice(0, 3000).filter((k) => k && typeof k === 'object').map((k) => ({
    the: chuoi(k.the, 16), sau: so(k.sau),
    x: so(k.x) ?? 0, y: so(k.y) ?? 0, w: so(k.w) ?? 0, h: so(k.h) ?? 0,
    chu: chuoi(k.chu, 160), bieuTuong: chuoi(k.bieuTuong, 40),
    nen: mau(k.nen), mauChu: mau(k.mauChu), coChu: so(k.coChu), damChu: so(k.damChu),
    canChu: chuoi(k.canChu, 12), dem: so(k.dem), demNgang: so(k.demNgang),
    boTron: so(k.boTron), vien: mau(k.vien), anh: chuoi(k.anh, 120),
    laAnh: k.laAnh === true || undefined,
  }));
  return JSON.parse(JSON.stringify({
    tieuDe: chuoi(b.tieuDe, 200) || '',
    khung: { rong: so(b.khung?.rong) ?? 0, cao: so(b.khung?.cao) ?? 0 },
    nenTrang: mau(b.nenTrang),
    khoi,
  }));
}

/**
 * Bớt khối cho vừa lời nhắc.
 *
 * Xếp theo "đáng kể" chứ không cắt từ dưới lên: một khối chữ 12px ở cuối trang
 * vẫn đáng giữ hơn một khung viền 400px không nội dung. Cắt theo thứ tự DOM là
 * mất đúng phần chữ nằm cuối.
 */
function bot(khoi) {
  if (khoi.length <= TOI_DA_KHOI) return khoi;
  const diem = (k) => (k.chu ? 2_000_000 : 0) + (k.laAnh ? 500_000 : 0) + k.w * k.h;
  return [...khoi].sort((a, b) => diem(b) - diem(a)).slice(0, TOI_DA_KHOI)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));   // trả lại thứ tự đọc từ trên xuống
}

function loiNhac(meta, banDo, y, vanDeCu, canhCu, mayTruoc) {
  const mau = mauThat();
  const viDu = ['text', 'nut', 'panel', 'card', 'group', 'image', 'huyhieu', 'chip']
    .filter((k) => mau[k]).map((k) => `  ${JSON.stringify(mau[k])}`).join('\n');

  const khoi = bot(banDo.khoi || []);
  const suaLai = vanDeCu?.length ? `

LẦN TRƯỚC BẠN SINH RA CẢNH NÀY:
${JSON.stringify(canhCu)}

VÀ BỘ SOÁT BÁO CÁC LỖI SAU:
${vanDeCu.map((v) => `  - ${v}`).join('\n')}

Hãy sửa đúng những lỗi đó rồi trả lại cảnh mới. Giữ nguyên phần đã đúng.` : '';

  return `Bạn dựng MỘT CẢNH cho app làm clip quảng cáo, dựa trên một trang giao
diện đã được ĐO SẴN. Mọi con số dưới đây là số thật đo từ trình duyệt — KHÔNG
phải ước lượng. Hãy dùng đúng chúng, đừng tự đoán lại.

KHUNG CLIP: ${meta.width}×${meta.height} px. Toạ độ tính từ góc trên trái.
TRANG NGUỒN: ${banDo.khung?.rong}×${banDo.khung?.cao} px${banDo.nenTrang ? ` · nền ${banDo.nenTrang}` : ''}
${banDo.tieuDe ? `TIÊU ĐỀ TRANG: ${banDo.tieuDe}` : ''}

BẢN ĐỒ BỐ CỤC — mỗi dòng là một khối đã đo:
${khoi.map((k) => JSON.stringify(k)).join('\n')}

Ý nghĩa các trường: \`x\`/\`y\`/\`w\`/\`h\` pixel trên TRANG NGUỒN · \`chu\` chữ thật
· \`bieuTuong\` là BIỂU TƯỢNG (mã icon, KHÔNG phải chữ hiện ra) · \`nen\` màu nền
· \`mauChu\` màu chữ · \`coChu\` cỡ chữ px · \`dem\`/\`demNgang\` đệm px ·
\`boTron\` bo góc px · \`sau\` độ sâu trong cây (0 là ngoài cùng).

CHỈ ĐƯỢC DÙNG NHỮNG \`kind\` SAU:
${LOAI_CHO_PHEP.join(', ')}

MẪU THẬT lấy từ chính clip của người dùng — bắt chước đúng hình dạng này:
${viDu}

LUẬT
1. Trả ĐÚNG MỘT đối tượng JSON của một cảnh:
   {"id":"...","duration":<giây>,"stagger":0.12,"elements":[ ... ]}
2. Mỗi phần tử BẮT BUỘC có \`id\` (không trùng trong cảnh), \`kind\`, \`x\`, \`y\` (số).
3. XẾP LẠI CHO VIDEO — KHÔNG THU NHỎ TRANG WEB.
   Trang nguồn rộng ${banDo.khung?.rong} px, khung clip ${meta.width}×${meta.height}${meta.height > meta.width ? ' (DỌC)' : ''}.
   ĐỪNG nhân toạ độ theo tỉ lệ rồi chép vị trí: làm vậy chữ bé tí và dồn một góc.
   Làm như dựng một cảnh video từ nội dung ấy:
   · CHỌN 5–12 món đáng kể nhất (tiêu đề, một câu phụ, nút chính, vài thẻ nổi
     bật). Bỏ menu, chữ nhỏ, chi tiết phụ.
   · CHỮ TO: tiêu đề ≥ ${tieuDeNhoNhat(meta)}px, mọi chữ khác ≥ ${chuNhoNhat(meta)}px. Chữ \`text\` nên có \`w\`
     để tự xuống dòng trong khung.
   · PHỦ KHUNG: nội dung trải từ khoảng 12% tới 88% chiều cao khung, lề hai bên
     ≥ ${Math.round(meta.width * 0.06)}px.${meta.height > meta.width ? `
   · KHUNG DỌC: hàng ngang trên trang (4 thẻ cạnh nhau) phải xếp lại thành cột
     hoặc lưới 2×2 — bốn thẻ chen ngang ${meta.width}px là không đọc được.` : ''}
   · MỘT CỤM DỌC DUY NHẤT: sau tấm nền, đặt đúng MỘT \`group\` \`"place":"giua"\`,
     \`"dir":"doc"\` chứa mọi món nội dung (cụm con bên trong tuỳ ý). Hai cụm
     ngoài cùng mỗi cụm một \`place\` ("giua" + "duoi") là CHỒNG LÊN NHAU khi
     cụm trên cao — đã xảy ra thật: nút bấm bị thẻ đè mất một nửa.
   · Giữ đúng MÀU, chữ nguyên văn, và thứ bậc (cái gì to/nổi trên trang thì
     vẫn to/nổi trong cảnh).
4. MÀU LẤY THẲNG TỪ BẢN ĐỒ. \`nen\` → \`fill\`, \`mauChu\` → \`ink\`. Đây là màu
   thật của trang, không phải màu bạn đoán. Nếu trang có nền rõ rệt thì đặt món
   ĐẦU TIÊN là {"kind":"panel","id":"nen-khung","x":0,"y":0,"place":"day","fill":"<nenTrang>"}.
5. ĐỆM: \`dem\` trong bản đồ là PIXEL, còn \`pad\`/\`gap\` của app là BẬC 0..7.
   Bảng quy đổi thật: 0→0px · 1→4px · 2→8px · 3→12px · 4→16px · 5→24px · 6→32px · 7→48px.
   Chọn bậc gần nhất với số pixel đã đo.
6. CHỮ: chép ĐÚNG NGUYÊN VĂN trường \`chu\`. Không tóm tắt, không dịch, không bịa
   thêm. \`coChu\` nhân theo tỉ lệ khổ ở luật 3 rồi đặt vào \`size\`.
7. \`bieuTuong\` KHÔNG phải chữ — đừng bao giờ đưa giá trị đó vào \`text\`. Muốn
   thể hiện thì dùng \`huyhieu\`, hoặc bỏ qua.
8. TƯƠNG PHẢN — LẤY MÀU THÌ LẤY CẢ CẶP. Bản đồ cho sẵn \`nen\` và \`mauChu\`
   của từng khối. Lấy \`mauChu\` mà BỎ QUÊN \`nen\` là chữ rơi xuống nền clip
   khác màu hẳn — một nút trắng chữ đen trên trang nguồn sẽ thành chữ đen trên
   nền tối, không đọc được. Đã xảy ra thật ở lượt trước.
   Nên: món nào lấy \`ink\` từ \`mauChu\` thì PHẢI đặt \`fill\` bằng \`nen\` của
   CHÍNH khối đó. Khối nguồn không có \`nen\` thì chọn \`ink\` tương phản với
   nền khung, đừng chép \`mauChu\` một cách máy móc.
9. Nhiều món xếp hàng/cột thì bọc trong \`group\` (\`place\`, \`dir\`, \`children\`),
   con để \`x:0, y:0\`.
10. Hiệu ứng vào: \`"in":{"kind":"rise"|"fade"|"pop","ease":"out","dur":0.6}\`,
    \`at\` tăng dần để món vào lần lượt. \`duration\` khoảng 4–6 giây.
11. MÁY QUAY. Khai \`"camera":{"x":<số>,"y":<số>,"scale":<số>}\`, kèm
    \`"cameraMove":0.8\` và \`"cameraEase":"inOut"\`.
    Bộ dựng KHÔNG cắt cứng — nó bay mượt từ máy quay cảnh TRƯỚC sang cảnh này.
    Con số bạn chọn là "bay TỚI ĐÂU", không phải "đặt máy ở đâu".
    ${mayTruoc
      ? `Cảnh TRƯỚC đang ở: x=${mayTruoc.x || 0}, y=${mayTruoc.y || 0}, scale=${mayTruoc.scale ?? 1}. Chọn khác đi thì mới có chuyển động.\n       RÀNG BUỘC: scale của cảnh này phải chênh cảnh trước ÍT NHẤT 0,2 —\n       chênh dưới 0,05 là máy quay ĐỨNG IM và cảnh trông như ảnh tĩnh.\n       Chỉ cố ý để đứng im khi cảnh này là phần tiếp NGUYÊN VẸN của cảnh trước.`
      : 'Đây là cảnh ĐẦU — không có gì để bay tới, để x=0, y=0, scale=1.'}
    VÙNG MÁY QUAY THẤY: tâm (${meta.width / 2} + x, ${meta.height / 2} + y), rộng ${meta.width}/scale, cao
    ${meta.height}/scale. Mọi món quan trọng PHẢI nằm trong vùng đó — scale 1,4 ngắm
    giữa khung là cắt mất 14% mỗi mép, tiêu đề đặt sát trên cùng sẽ biến mất.
    Ba nhịp, chọn một: DỒN VÀO (tăng \`scale\` 0,3–0,5 và ngắm tới chi tiết cần
    đọc) · LƯỚT NGANG (giữ \`scale\`, chỉ đổi \`x\`) · THỞ RA (kéo \`scale\` về
    1,0–1,1, \`x\`/\`y\` về gần 0 để kết đoạn).
    \`scale\` trong khoảng 1,0–2,0 — quá 2,0 là vỡ hình vì bộ dựng phóng chính
    khung hình chứ không vẽ lại. \`x\`/\`y\` tính bằng pixel trên khung
    ${meta.width}×${meta.height}, gốc ở giữa.

${String(y || '').trim() ? `NGƯỜI DÙNG DẶN THÊM\n${String(y).trim()}\n` : ''}
CHỈ TRẢ VỀ JSON. Không rào đầu, không giải thích, không dấu \`\`\`.${suaLai}`;
}

/** Bóc JSON ra khỏi câu trả lời — model hay bọc trong dấu ``` dù đã dặn đừng. */
function bocJSON(chu) {
  const s = String(chu || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const d = s.indexOf('{');
  const c = s.lastIndexOf('}');
  if (d < 0 || c <= d) return null;
  try { return JSON.parse(s.slice(d, c + 1)); } catch { return null; }
}

/**
 * Dựng một cảnh từ HTML.
 *
 * @param {object} y
 * @param {object} y.doc   kịch bản clip đang mở (lấy `meta`)
 * @param {string} [y.html] nội dung HTML
 * @param {string} [y.url]  hoặc một địa chỉ trang
 * @returns { ok, canh, vanDe[], chimNen[], banDo, model, daSua } hoặc { ok:false, cau }
 */
export async function dungTuHtml({ doc, html, url, y, banDo: banDoGui, anh, doThat }) {
  const meta = doc?.meta;
  /* Máy quay cảnh cuối clip — xem ghi chú cùng chỗ trong `dungcanh.js`. */
  const mayTruoc = doc?.scenes?.length ? (doc.scenes[doc.scenes.length - 1].camera || null) : null;
  if (!meta?.width) return { ok: false, cau: 'Clip chưa có khổ hình.' };
  /* ĐO SẴN THÌ DÙNG LUÔN. Trình duyệt người dùng đã đo rồi gửi lên — đó là đường
     của bản triển khai, nơi không có Chromium. Xem `server/dotrang.js`. */
  let banDo = banDoGui ? lamSachBanDo(banDoGui) : null;
  if (banDoGui && !banDo) return { ok: false, cau: 'Bản đồ trang gửi lên không đúng khuôn.' };

  if (!banDo) {
    if (!html && !url) return { ok: false, cau: 'Chưa có HTML hay địa chỉ trang.' };
    try {
      banDo = await docBanDo({ html, url, rong: meta.width, cao: meta.height });
    } catch (e) {
      /* Máy này không tự đo được (không có Chromium — bản triển khai là vậy).
         KHÔNG đổ stack trace ra: anh Quý đã nhận nguyên vệt "Cannot find module
         '/app/tools/doc-html.mjs'" đúng ở chỗ này. Nói bằng tiếng người, và
         nói việc phải làm. */
      if (/Cannot find module|playwright|chromium|ENOENT/i.test(String(e.message))) {
        return { ok: false, cau: 'Máy chủ này không tự mở trang để đo được. Tải lại trang '
          + 'trình sửa rồi thử lại — bản mới đo ngay trong trình duyệt của bạn.' };
      }
      /* Nói rõ HỎNG Ở BƯỚC NÀO. "Không dựng được" chung chung thì người dùng không
         biết nên sửa HTML hay thử lại sau. */
      return { ok: false, cau: `Không đọc được trang: ${e.message?.slice(0, 200) || e}` };
    }
  }
  if (!banDo?.khoi?.length) {
    return { ok: false, cau: 'Trang này không có khối nào nhìn thấy được — kiểm lại HTML.' };
  }

  const goi = async (vanDeCu, canhCu) => {
    /* CÓ ẢNH CHỤP phần trang thì gửi kèm: bản đồ cho số đo chính xác, ảnh cho
       AI thấy phân cấp, nhóm, cái gì nổi bật — thứ con số không nói được. */
    const nhac = loiNhac(meta, banDo, y, vanDeCu, canhCu, mayTruoc);
    const g = await goiGemini(anh ? [
      { text: `${nhac}\n\nKÈM THEO: ẢNH CHỤP THẬT của đúng phần trang này (khổ ${banDo.khung?.rong}×${banDo.khung?.cao}). `
        + 'Nhìn ảnh để hiểu bố cục, nhóm và thứ bậc; SỐ ĐO và MÀU vẫn lấy từ bản đồ ở trên. '
        + 'Đây là làm CẢNH VIDEO chứ không chép web 1:1: được bỏ chi tiết phụ, phóng to phần chính, chữ to hơn cho dễ đọc.' },
      { inline_data: { mime_type: 'image/jpeg', data: anh } },
    ] : nhac,
      { nong: 0.3, toiDa: 8000, nghi: true, hanGiay: HAN_GIAY_ANH });
    if (!g.ok) return { loi: g.cau };
    const canh = bocJSON(g.chu);
    if (!canh) return { loi: 'AI trả về thứ không phải JSON.', model: g.model };
    const sach = chuanHoaCanh(canh);
    /* Cùng chốt như đường ảnh: cảnh rỗng là dựng hỏng, dù bộ soát bảo sạch. */
    if (!sach?.elements?.length) {
      return { loi: 'Không dựng được món nào từ trang này. Thử dặn thêm cho AI '
        + 'biết cần lấy phần nào.', model: g.model };
    }
    return { canh: sach, model: g.model };
  };

  let r = await goi();
  if (r.loi) return { ok: false, cau: r.loi };

  const thu = (c) => soatKichBan({ version: 1, meta, scenes: [c] });
  /* Chữ chìm nền + "xem được trong video" (`soatvideo.js`) — cả hai chỉ là lý
     do để AI sửa một lượt, không chặn nhận cảnh. */
  const soatChu = (c) => {
    let ra = [];
    try {
      ra = (soatChatLuong({ version: 1, meta, scenes: [c] }).loi || [])
        .filter((l) => l.ma === 'CHU_CHIM_NEN' || l.ma === 'TUONG_PHAN_THAP')
        .map((l) => l.cau);
    } catch { /* soát hỏng thì coi như không có gì để báo */ }
    return [...ra, ...soatVideo(c, meta)];
  };

  /* `doThat`: VẼ cảnh ra bằng trình duyệt thật rồi đo (`server/docanh.js`) — bắt
     được thứ JSON không nói: cụm cao hơn khung, chữ đè nhau. Không có thì bỏ qua. */
  const soat = async (c) => [...soatChu(c), ...(doThat ? await doThat(c) : [])];

  let vanDe = await thu(r.canh);
  let chimNen = await soat(r.canh);
  let daSua = false;

  /* HAI lượt sửa, không phải một: đo thật hay bắt ra lỗi bố cục mà sửa xong
     lượt đầu vẫn còn lệch một chút (bớt được món nhưng vẫn cao hơn khung). */
  for (let lan = 0; lan < 2 && (vanDe.length || chimNen.length); lan++) {
    const r2 = await goi([...vanDe, ...chimNen], r.canh);
    if (r2.loi || !r2.canh) break;
    const v2 = await thu(r2.canh);
    const c2 = await soat(r2.canh);
    if (v2.length + c2.length > vanDe.length + chimNen.length) break;
    r = r2; vanDe = v2; chimNen = c2; daSua = true;
  }

  /* VÁ CUỐI CÙNG, sau khi AI đã được một lượt tự sửa. Đặt ở đây chứ không đặt
     trước: lượt sửa của AI còn lo cả lỗi định dạng, và nếu mình vá sạch tương
     phản từ sớm thì nó mất luôn cái cớ để nhìn lại cảnh. */
  const daVa = vaTuongPhan(r.canh, meta);
  if (daVa) chimNen = [...soatChu(r.canh), ...chimNen.filter((c) => c.startsWith('VẼ THẬT'))];

  return {
    ok: vanDe.length === 0,
    daVa,
    canh: r.canh,
    vanDe,
    chimNen,
    /* Trả kèm vài con số của bản đồ để giao diện nói được "đọc ra 102 khối chữ"
       — người dùng thấy công cụ đã ĐỌC được gì thì mới tin kết quả. */
    banDo: {
      tieuDe: banDo.tieuDe,
      khung: banDo.khung,
      soKhoi: banDo.khoi.length,
      soChu: banDo.khoi.filter((k) => k.chu).length,
    },
    model: r.model,
    daSua,
    cau: vanDe.length ? `Cảnh AI dựng còn ${vanDe.length} chỗ chưa hợp lệ.`
      : chimNen.length ? `Dựng xong, nhưng còn ${chimNen.length} chỗ nên xem lại (chữ chìm nền, chữ nhỏ, hay bị máy quay cắt).`
        : null,
  };
}
