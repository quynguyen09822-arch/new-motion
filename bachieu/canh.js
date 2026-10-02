/**
 * MỘT CẢNH 3D LÀ GÌ — nhiều món, một máy quay, một đèn.
 *
 * VÌ SAO ĐỔI. Bản đầu của xưởng nhốt mọi thứ trong KHUNG PHIM: khổ 9:16, vạch
 * mốc 50%, và mỗi lần chỉ dựng được ĐÚNG MỘT khối. Hợp lý khi mục đích là "làm
 * một món để nhét vào clip", nhưng anh Quý nói rõ không muốn thế — muốn nó như
 * Blender, dựng được cả một cảnh cho ra dáng chuyên nghiệp.
 *
 * Nên bỏ khung phim, và đơn vị làm việc đổi từ KHỐI sang CẢNH.
 *
 * BA THỨ TÁCH BẠCH, và đây là chỗ bản đầu làm lẫn:
 *
 *   · Món  — vật thể đứng ở đâu, xoay bao nhiêu, to nhỏ ra sao.
 *   · Máy quay — người xem đứng ở đâu nhìn vào. KHÔNG phải xoay cái cảnh.
 *   · Đèn  — gắn vào THẾ GIỚI, không gắn vào máy quay.
 *
 * Lẫn máy quay với xoay vật là cái bẫy kinh điển: lia máy một vòng mà mặt sáng
 * cứ bám theo mắt người xem, thành ra vật trông bẹt như dán lên màn hình. Tách
 * ra thì lia tới mặt khuất là thấy tối — đúng như ngoài đời.
 *
 * File này KHÔNG chạm DOM, nên `tools/kiem-ba-chieu.mjs` đo được bằng số.
 */
import { KHO_LOAI, khoiMoi, caoTong } from './khoi.js';
import { beRongChiem, DEN_MAC_DINH, matCuaHop, matCuaTru, matCuaCau } from './hinhhoc.js';

/**
 * Máy quay mặc định — chếch 26°, nhìn xuống 28°.
 *
 * Độ nghiêng 28° chọn theo Blender (nó mở ra ở khoảng 29°), và có lý do: nhìn
 * xuống dưới 20° thì mặt sàn gần như ngang tầm mắt, lưới bẹp thành một vệt
 * mỏng và mất hết tác dụng định hướng. Trên 50° thì thành nhìn từ nóc xuống,
 * vật mất dáng.
 */
export const MAY_MAC_DINH = { ngang: -26, doc: 28, xa: 2200, ti: 1, tamX: 0, tamY: 0 };

export function canhMoi(loai = 'hop') {
  const dau = datTen(monMoi(loai), []);
  dau.vi.y = Math.round(caoTong(dau) / 2);
  return {
    mon: [dau],
    may: { ...MAY_MAC_DINH },
    den: { ...DEN_MAC_DINH },
  };
}

/** Một món = một khối, cộng chỗ đứng trong cảnh. */
export function monMoi(loai = 'hop', mauId = 'den-cam') {
  return { ...khoiMoi(loai, mauId), vi: { x: 0, y: 0, z: 0 } };
}

/**
 * Tên cho người đọc, tự đánh số khi trùng.
 *
 * GIỮ TÊN ĐÃ CÓ nếu món mang sẵn một cái. AI đặt tên theo thứ nó thấy trong
 * ảnh ("Bàn", "Đèn cây") — ném đi để thay bằng tên loại khối ("Hộp", "Ống
 * trụ") là vứt luôn phần thông tin có ích nhất, mà cũng là thứ ta đã dặn AI
 * phải nghĩ ra. Bài kiểm đã bắt đúng lỗi này.
 *
 * Cắt số đuôi trước khi đánh lại: nhân đôi "Hộp 2" phải ra "Hộp 3", không ra
 * "Hộp 2 2".
 */
export function datTen(mon, daCo = []) {
  const san = typeof mon.ten === 'string' ? mon.ten.trim().replace(/\s+\d+$/, '') : '';
  const goc = san || KHO_LOAI.find((l) => l.id === mon.loai)?.ten || 'Món';
  const dung = new Set(daCo.map((m) => m.ten));
  if (!dung.has(goc)) return { ...mon, ten: goc };
  for (let i = 2; i < 999; i++) if (!dung.has(`${goc} ${i}`)) return { ...mon, ten: `${goc} ${i}` };
  return { ...mon, ten: goc };
}

/**
 * Bề ngang một món chiếm, tính cả chỗ nó đứng.
 * Dùng để xếp món mới vào chỗ trống thay vì chồng lên món cũ.
 */
export const rongMon = (m) => beRongChiem(m);

/**
 * Thêm món và TỰ XẾP vào chỗ trống bên phải.
 *
 * Thả đúng gốc toạ độ thì nó chồng khít lên món đang có, và người dùng tưởng
 * bấm hụt — đây là lỗi hay gặp nhất ở mọi trình dựng cảnh. Xếp sẵn thì "dựng
 * nhanh" mới thành thật.
 */
export function themMon(canh, loai = 'hop') {
  const m = datTen(monMoi(loai, canh.mon[0]?.mauId), canh.mon);
  const mep = canh.mon.length
    ? Math.max(...canh.mon.map((x) => x.vi.x + rongMon(x) / 2))
    : 0;
  /* Đặt ĐỨNG TRÊN SÀN, không thả lơ lửng ở tâm. Mặt y = 0 là mặt đất; tâm món
     nằm giữa nó nên phải nâng lên nửa chiều cao. Để y = 0 thì mỗi món chìm một
     nửa xuống đất, và cảnh trông như đồ chơi rơi vào vũng bùn. */
  m.vi = { x: Math.round(mep + rongMon(m) / 2 + 60), y: Math.round(caoTong(m) / 2), z: 0 };
  canh.mon.push(m);
  return m;
}

export function nhanBan(canh, id) {
  const g = canh.mon.find((m) => m.id === id);
  if (!g) return null;
  const m = datTen({ ...g, id: 'm' + Math.random().toString(36).slice(2, 8),
    vi: { ...g.vi }, den: g.den ? { ...g.den } : undefined }, canh.mon);
  m.vi.x += Math.round(rongMon(g) + 60);
  canh.mon.push(m);
  return m;
}

export function xoaMon(canh, id) {
  const i = canh.mon.findIndex((m) => m.id === id);
  if (i < 0) return false;
  canh.mon.splice(i, 1);
  return true;
}

/**
 * Hộp bao quanh cả cảnh. Dùng để máy quay tự lùi cho vừa khung.
 *
 * Tính theo CHỖ ĐỨNG cộng nửa bề ngang từng món, không lấy bừa một con số —
 * cảnh một món nhỏ mà máy lùi xa tít thì món bé như hạt đậu.
 */
export function hopBao(canh) {
  const hien = canh.mon.filter((m) => !m.an);
  if (!hien.length) return { rong: 400, cao: 400, tamX: 0, tamY: 0 };
  let tr = Infinity, ph = -Infinity, du = Infinity, tr2 = -Infinity;
  for (const m of hien) {
    const w = rongMon(m) / 2, h = caoTong(m) / 2;
    tr = Math.min(tr, m.vi.x - w); ph = Math.max(ph, m.vi.x + w);
    du = Math.min(du, m.vi.y - h); tr2 = Math.max(tr2, m.vi.y + h);
  }
  return { rong: ph - tr, cao: tr2 - du, tamX: (tr + ph) / 2, tamY: (du + tr2) / 2 };
}

/**
 * Thu phóng vừa khung nhìn.
 *
 * KHÔNG lùi máy bằng cách đẩy cảnh ra xa theo trục z. Phối cảnh của CSS đặt mặt
 * phẳng z = 0 đúng tỉ lệ 1:1, nên đẩy ra xa vừa thu nhỏ vừa bóp méo phối cảnh
 * — kéo chuột để thu nhỏ mà hình lại biến dạng theo thì không ai hiểu nổi.
 *
 * Tách hẳn hai việc: `xa` là ĐỘ MỞ ỐNG KÍNH (phối cảnh mạnh hay nhẹ), `ti` là
 * THU PHÓNG. Lăn chuột đổi `ti`, và phối cảnh giữ nguyên.
 *
 * Nhân 1,35 để chừa lề — ôm sát mép thì món ngoài cùng chạm viền, cảnh ngột.
 */
export function thuPhongVua(canh, rongO = 900, caoO = 600) {
  const b = hopBao(canh);
  const ti = Math.min(rongO / Math.max(1, b.rong * 1.35), caoO / Math.max(1, b.cao * 1.35));
  return { ti: Math.max(0.05, Math.min(3, ti)), tamX: b.tamX, tamY: b.tamY };
}


/* ---------------------------------------------------------------------------
 * LUẬT MỚI THAY LUẬT CŨ
 *
 * Luật cũ là "khối không được chiếm quá nửa BỀ NGANG KHUNG PHIM". Nay bỏ khung
 * phim thì luật ấy hết nghĩa — nhưng cái lý do sinh ra nó thì VẪN CÒN: máy chủ
 * dựng phim không có chip đồ hoạ riêng, vẽ nhiều quá là giật.
 *
 * Nên đo lại cho đúng thứ thật sự tốn: TỔNG SỐ MẶT trong cảnh. Đo được trên
 * chính máy này — 1.180 mặt mất 16 ms một khung, tức còn thừa cho 60 hình/giây.
 * Suy ra ngưỡng: khoảng 3.500 mặt là chạm 30 hình/giây, 6.000 là bắt đầu ì.
 *
 * Bỏ một luật thì phải thay bằng luật đúng, chứ không phải bỏ trống.
 * ------------------------------------------------------------------------- */

/** Đếm số mặt một món sẽ dựng ra. */
export function soMatMon(mon, boCuc) {
  const bc = boCuc(mon);
  if (bc.kieu === 'chu') return bc.lop;
  let n = 0;
  for (const c of bc.khoiCon) {
    n += c.hinh === 'tru' ? matCuaTru(c).length
      : c.hinh === 'cau' ? matCuaCau(c).length
      : matCuaHop(c).length;
  }
  return n;
};

export const NGUONG_MAT_VUA = 3500;
export const NGUONG_MAT_NANG = 6000;

/** Soát cả cảnh. Rỗng là ổn. Chỉ NHẮC, không bao giờ chặn. */
export function soatCanh(canh, boCuc) {
  const n = canh.mon.filter((m) => !m.an).reduce((s, m) => s + soMatMon(m, boCuc), 0);
  if (n > NGUONG_MAT_NANG) {
    return [`Cảnh đang có ${n.toLocaleString('vi')} mảnh. Quá ${NGUONG_MAT_NANG.toLocaleString('vi')} `
      + `thì kéo chuột bắt đầu ì tay. Bớt món, hoặc hạ độ mịn của những món tròn.`];
  }
  if (n > NGUONG_MAT_VUA) {
    return [`Cảnh đang có ${n.toLocaleString('vi')} mảnh — vẫn chạy được nhưng `
      + `lúc xuất phim sẽ chậm. Hạ độ mịn của những món tròn là nhẹ ngay.`];
  }
  return [];
}
