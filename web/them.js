/**
 * THÊM · XOÁ · NHÂN BẢN — thành phần và cảnh.
 *
 * Mọi món mới sinh ra ở đây đều phải qua được `validateScene`, nên bắt buộc có:
 * `id` không trùng trong cảnh, `kind`, và `x`/`y` là SỐ (kể cả khi nằm trong cụm
 * và hai số đó vô nghĩa — bộ soát vẫn đòi). Thiếu một cái là kịch bản không lưu
 * được, mà lỗi thì hiện ra tận lúc bấm Lưu, rất khó lần.
 */
import { duyetMon, timCanh, timMon } from './store.js';

/** Món mới, kèm giá trị mặc định đủ đẹp để thả vào là thấy được ngay. */
export const MAU_MON = [
  { kind: 'text',     ten: 'Chữ',          mau: { text: 'Dòng chữ mới', size: 48, align: 'center' } },
  { kind: 'nut',      ten: 'Nút bấm',      mau: { label: 'Bấm vào đây', size: 32 } },
  { kind: 'image',    ten: 'Ảnh',          mau: { src: '', fit: 'contain', h: 120 } },
  { kind: 'panel',    ten: 'Khối màu',     mau: { w: 400, h: 220, radius: 16 } },
  { kind: 'chip',     ten: 'Nhãn số',      mau: { value: '99%', label: 'Nhãn' } },
  { kind: 'huyhieu',  ten: 'Huy hiệu',     mau: { mark: 'cup', w: 96, h: 96 } },
  { kind: 'hangnhan', ten: 'Hàng nhãn',    mau: { items: ['Ngắn gọn', 'Dễ nhớ', 'Nổi bật'] } },
  { kind: 'card',     ten: 'Thẻ',          mau: { title: 'Tiêu đề thẻ', rows: 3, w: 420 } },
  { kind: 'table',    ten: 'Bảng',         mau: { columns: ['Cột 1', 'Cột 2'], rows: 4, w: 520 } },
  { kind: 'browser',  ten: 'Trình duyệt',  mau: { url: 'ten-cua-ban.tinhgon.xyz', w: 560, h: 340 } },
  /* Mặc định là NỀN ĐỘNG: kín khung, mờ sẵn, tối sẵn, lặp — thả vào là dùng
     được ngay cho việc hay làm nhất, khỏi phải vặn năm núm mới ra hình. */
  { kind: 'video',    ten: 'Video',        mau: { src: '', fit: 'cover', blur: 8, dim: 0.25, loop: true, place: 'day' } },
  { kind: 'group',    ten: 'Cụm',          mau: { dir: 'doc', align: 'giua', justify: 'giua', gap: 4, children: [] } },
];

/** Sinh id chưa trùng trong cảnh. */
function idMoi(canh, goc) {
  const dungRoi = new Set(duyetMon(canh.elements).map((x) => x.el.id));
  let i = 1;
  let t = `${goc}-${i}`;
  while (dungRoi.has(t)) t = `${goc}-${++i}`;
  return t;
}

/** Thêm một món vào cảnh, hoặc vào trong một cụm. Trả về id món mới. */
export function themMon(doc, canhId, kind, chaId = null) {
  const canh = timCanh(doc, canhId);
  if (!canh) return null;
  const mau = MAU_MON.find((m) => m.kind === kind);
  const el = { id: idMoi(canh, kind), kind, x: 0, y: 0, ...structuredClone(mau?.mau || {}) };

  // Món ngoài cùng thì cho vào giữa khung cho dễ thấy; món trong cụm thì để
  // flex lo, đặt `place` vào là thừa.
  // Mẫu nào tự khai `place` rồi thì tôn trọng — video mặc định phủ KÍN KHUNG vì
  // việc hay làm nhất với nó là làm nền động.
  if (!chaId && !el.place) el.place = 'giua';

  const cha = chaId ? timMon(doc, canhId, chaId)?.el : null;
  if (cha && cha.kind === 'group') (cha.children ||= []).push(el);
  else canh.elements.push(el);
  return el.id;
}

export function xoaMon(doc, canhId, monId) {
  const canh = timCanh(doc, canhId);
  if (!canh) return false;
  const boc = (ds) => {
    const i = (ds || []).findIndex((e) => e.id === monId);
    if (i >= 0) { ds.splice(i, 1); return true; }
    return (ds || []).some((e) => e.kind === 'group' && boc(e.children));
  };
  return boc(canh.elements);
}

/** Nhân bản một món. Con trong cụm cũng phải được đặt id mới, không thì trùng. */
export function nhanBanMon(doc, canhId, monId) {
  const canh = timCanh(doc, canhId);
  const t = timMon(doc, canhId, monId);
  if (!canh || !t) return null;

  const banSao = structuredClone(t.el);
  const datLaiId = (e) => {
    e.id = idMoi(canh, e.kind);
    if (e.kind === 'group') (e.children || []).forEach(datLaiId);
  };
  // Đặt id cho món ngoài trước rồi mới tới con, để `idMoi` thấy được cả những
  // id vừa cấp — nếu không hai anh em nhân bản cùng lúc sẽ trùng nhau.
  datLaiId(banSao);

  // Lệch đi một chút cho thấy là có hai cái, không phải một cái.
  if (!banSao.place) { banSao.x = (banSao.x || 0) + 24; banSao.y = (banSao.y || 0) + 24; }

  const ds = t.cha ? t.cha.children : canh.elements;
  ds.splice(ds.indexOf(t.el) + 1, 0, banSao);
  return banSao.id;
}

/* ---------- cảnh ---------- */

function idCanhMoi(doc, goc = 'canh') {
  const co = new Set((doc.scenes || []).map((s) => s.id));
  let i = doc.scenes.length + 1;
  let t = `${goc}-${i}`;
  while (co.has(t)) t = `${goc}-${++i}`;
  return t;
}

export function themCanh(doc, sauCanhId = null) {
  const canh = {
    id: idCanhMoi(doc),
    duration: 4,
    stagger: 0.16,           // giá trị cả bộ đang dùng — giữ cho đồng nhịp
    elements: [{ id: 'chu-1', kind: 'text', x: 0, y: 0, place: 'giua',
      text: 'Cảnh mới', size: 56, align: 'center' }],
  };
  const i = sauCanhId ? doc.scenes.findIndex((s) => s.id === sauCanhId) : -1;
  doc.scenes.splice(i >= 0 ? i + 1 : doc.scenes.length, 0, canh);
  return canh.id;
}

export function nhanBanCanh(doc, canhId) {
  const i = doc.scenes.findIndex((s) => s.id === canhId);
  if (i < 0) return null;
  const ban = structuredClone(doc.scenes[i]);
  ban.id = idCanhMoi(doc);
  doc.scenes.splice(i + 1, 0, ban);
  return ban.id;
}

export function xoaCanh(doc, canhId) {
  // Bộ soát đòi ít nhất một cảnh — xoá cái cuối cùng là kịch bản hỏng.
  if ((doc.scenes || []).length <= 1) return false;
  const i = doc.scenes.findIndex((s) => s.id === canhId);
  if (i < 0) return false;
  doc.scenes.splice(i, 1);
  return true;
}
