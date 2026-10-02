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
import { beRongChiem, DEN_MAC_DINH, matCuaHop, matCuaTru, matCuaCau,
  chieuDiem, khungHop } from './hinhhoc.js';

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
 * Nên đo lại cho đúng thứ thật sự tốn: TỔNG SỐ MẢNH trong cảnh — và mỗi mảnh
 * đúng bằng một thẻ DOM, nên con số này ăn khớp với thứ trình duyệt phải vẽ.
 *
 * ĐO LẠI SAU KHI CÓ CẦU MƯỢT (02/10). Trước đây một quả cầu là cả trăm mảnh
 * phẳng; nay nó là MỘT thẻ, nên cả thang đo lệch hẳn một bậc và ngưỡng cũ
 * (3.500 / 6.000) thành không thể chạm tới — món nặng nhất chỉ còn 72 mảnh,
 * 24 món tối đa mới 1.700. Một lời nhắc không bao giờ kêu thì thà bỏ đi.
 *
 * Số đo trên chính máy này:
 *     720 thẻ  → 13–27 ms một khung  (mượt tay)
 *   1.440 thẻ  → 85 ms một khung     (ì rõ)
 *
 * Bỏ một luật thì phải thay bằng luật đúng — và khi cách vẽ đổi thì phải ĐO
 * LẠI, chứ giữ nguyên con số cũ là tự ru mình.
 * ------------------------------------------------------------------------- */

/** Đếm số mặt một món sẽ dựng ra. */
export function soMatMon(mon, boCuc) {
  const bc = boCuc(mon);
  if (bc.kieu === 'chu') return bc.lop;
  let n = 0;
  for (const c of bc.khoiCon) {
    /* Quả cầu MƯỢT vẽ bằng ĐÚNG MỘT thẻ, không ghép mảnh. Đếm nó như cầu ghép
       mảnh là thổi phồng con số lên cả trăm lần: linh vật bị tính 2.085 mảnh
       trong khi trình duyệt chỉ dựng 137, và lời nhắc "cảnh nặng" kêu oan ngay
       từ món đầu tiên. Phép kiểm đã bắt đúng chỗ này. */
    n += c.muot ? 1
      : c.hinh === 'tru' ? matCuaTru(c).length
        : c.hinh === 'cau' ? matCuaCau(c).length
          : matCuaHop(c).length;
  }
  return n;
};

export const NGUONG_MAT_VUA = 900;
export const NGUONG_MAT_NANG = 1300;

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

/* ---------------------------------------------------------------------------
 * NẮM BẮT MÓN — món nào đang nằm dưới con trỏ
 *
 * VẤN ĐỀ THẬT. Xưởng vẫn chọn món bằng cách hỏi trình duyệt "thẻ nào nằm dưới
 * ngón tay". Chính xác khi trúng, nhưng con linh vật là 60 mảnh RỜI NHAU: giữa
 * hai mảnh là khe hở, bấm vào khe là trúng nền và cả xưởng quay máy. Thu nhỏ
 * cảnh thì khe càng chiếm tỉ lệ lớn, nên càng nhỏ càng khó bắt. Người dùng gọi
 * đúng tên bệnh: "nhiều lúc tôi cũng không chọn trúng cái nhân vật đó được".
 *
 * CÁCH CHỮA. Dựng thêm một KHUNG BẮT quanh chỗ món chiếm trên màn. Thẻ thật
 * vẫn được ưu tiên (nó chính xác tới từng pixel); khung bắt chỉ đỡ những cú
 * bấm rơi vào khe. Cách này cũng là cách Blender làm: vùng bấm rộng hơn hình.
 *
 * VÌ SAO TÍNH BẰNG TOÁN CHỨ KHÔNG ĐO THẺ. Đo `getBoundingClientRect()` của
 * từng mảnh thì phải quét 60 thẻ mỗi lần nhích chuột. Toán thì 8 đỉnh một món.
 * ------------------------------------------------------------------------- */

const rad2 = (d) => (d * Math.PI) / 180;

/**
 * TÁM ĐỈNH của một bộ phận, trong hệ toạ độ của món.
 *
 * `ve.js` dựng mỗi bộ phận bằng: dời → xoay Y, X, Z → bóp. Đọc ngược chuỗi ấy
 * ra thứ tự áp lên điểm. Sai thứ tự thì áo choàng ngả 44° sẽ tính ra một khung
 * nghiêng về phía khác, mà chẳng có gì báo lỗi cả.
 */
function dinhBoPhan(c) {
  const p = c.phong || [1, 1, 1];
  let hw, hh, hd;
  if (c.hinh === 'cau') { const r = c.ban ?? 100; hw = r * p[0]; hh = r * p[1]; hd = r * p[2]; }
  else if (c.hinh === 'tru') {
    const r = c.ban ?? 60; hw = r * p[0]; hh = ((c.cao ?? 150) / 2) * p[1]; hd = r * p[2];
  } else {
    hw = ((c.rong ?? 100) / 2) * p[0]; hh = ((c.cao ?? 100) / 2) * p[1]; hd = ((c.day ?? 100) / 2) * p[2];
  }
  const x = c.xoay || null;
  const ca = Math.cos(rad2(x?.ngang || 0)), sa = Math.sin(rad2(x?.ngang || 0));
  const cb = Math.cos(rad2(x?.doc || 0)), sb = Math.sin(rad2(x?.doc || 0));
  const cg = Math.cos(rad2(x?.lan || 0)), sg = Math.sin(rad2(x?.lan || 0));
  const ra = [];
  for (const ex of [-hw, hw]) for (const ey of [-hh, hh]) for (const ez of [-hd, hd]) {
    const px = ex * cg - ey * sg, py = ex * sg + ey * cg;
    const py2 = py * cb - ez * sb, pz2 = py * sb + ez * cb;
    const px3 = px * ca + pz2 * sa, pz3 = -px * sa + pz2 * ca;
    /* `ve.js` dời bộ phận bằng `-con.y`, nên `c.y` vốn đã hướng LÊN. */
    ra.push([c.x + px3, c.y - py2, c.z + pz3]);
  }
  return ra;
}

/**
 * Món chiếm chỗ nào trên màn. Trả về khung chữ nhật tính từ TÂM khung nhìn.
 *
 * CHIẾU TỪNG BỘ PHẬN, không chiếu một hộp bao chung. Bản đầu gom hết bộ phận
 * thành một hộp rồi mới chiếu tám đỉnh hộp ấy — và khung phồng lên 1,29 lần:
 * hộp bao xoay 42° thì hai góc chéo của nó chìa ra, trong khi hình thật bên
 * trong chẳng có gì ở đó. Hộp-của-hộp luôn to hơn hình.
 *
 * QUẢ CẦU MƯỢT TÍNH RIÊNG. Nó là tấm BILLBOARD xoay ngược lại đúng bằng góc
 * máy quay, nên trên màn lúc nào cũng là một đĩa `rx × ry` — không bao giờ
 * chìa ra như hộp. Nhét nó vào phép xoay là thổi phồng khung lên vô cớ.
 */
export function khungMon(mon, boCuc, may) {
  const bc = boCuc(mon);
  const con = bc.kieu === 'hop' && bc.khoiCon?.length ? bc.khoiCon : null;
  if (!con) {
    /* Chữ nổi không có bộ phận để gom — rơi về số khai báo. Vẫn hơn là không
       có khung nào để mà bấm. */
    const w = rongMon(mon), h = caoTong(mon);
    return khungHop([mon.vi.x, mon.vi.y, mon.vi.z], [w, h, w], may);
  }
  const ti = Math.abs(may?.ti ?? 1);
  let tr = Infinity, pha = -Infinity, tren = Infinity, duoi = -Infinity, sau = -Infinity;
  const an = (u, v) => {
    if (u < tr) tr = u; if (u > pha) pha = u;
    if (v < tren) tren = v; if (v > duoi) duoi = v;
  };
  for (const c of con) {
    if (c.hinh === 'cau' && c.muot) {
      const r = c.ban ?? 100;
      const rx = r * (c.phong?.[0] ?? 1), ry = r * (c.phong?.[1] ?? 1);
      const p = chieuDiem([mon.vi.x + c.x, mon.vi.y + c.y, mon.vi.z + c.z], may);
      an(p.u - rx * ti * p.k, p.v - ry * ti * p.k);
      an(p.u + rx * ti * p.k, p.v + ry * ti * p.k);
      if (p.sau > sau) sau = p.sau;
      continue;
    }
    for (const [x, y, z] of dinhBoPhan(c)) {
      const p = chieuDiem([mon.vi.x + x, mon.vi.y + y, mon.vi.z + z], may);
      an(p.u, p.v);
      if (p.sau > sau) sau = p.sau;
    }
  }
  return { tr, pha, tren, duoi, u: (tr + pha) / 2, v: (tren + duoi) / 2,
    rong: pha - tr, cao: duoi - tren, sau };
}

/** Nới khung ra cho dễ bấm: món bé tí trên màn vẫn phải tóm được. */
export const LE_BAT = 9;

/**
 * Món nào nằm dưới điểm (u, v) — toạ độ tính từ TÂM khung nhìn.
 *
 * Nhiều khung chồng nhau thì lấy món GẦN MÁY NHẤT. Lấy món đầu danh sách là
 * sai: dời một món ra sau lưng món khác rồi bấm vào chỗ chồng nhau sẽ tóm
 * nhầm món đang bị che.
 *
 * @returns {string|null} id của món, không trúng gì thì `null`.
 */
export function timMon(u, v, canh, boCuc, le = LE_BAT) {
  let trung = null, sau = -Infinity;
  for (const m of canh.mon) {
    if (m.an || m.khoa) continue;
    const k = khungMon(m, boCuc, canh.may);
    if (u < k.tr - le || u > k.pha + le || v < k.tren - le || v > k.duoi + le) continue;
    if (k.sau > sau) { sau = k.sau; trung = m.id; }
  }
  return trung;
}

