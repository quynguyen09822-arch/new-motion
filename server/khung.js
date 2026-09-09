/**
 * KHUNG NHẤN TRÊN CLIP ĐỜI CŨ — đọc và sửa toạ độ các lớp vẽ đè.
 *
 * VÌ SAO ĐÂY LÀ NGOẠI LỆ. Nguyên tắc chung là không đụng vào clip đời cũ, vì ở
 * đó vị trí do code TÍNH RA lúc chạy. Mấy lớp vẽ đè thì khác hẳn: toạ độ của
 * chúng là SỐ VIẾT THẲNG trong mảng, tính theo pixel ảnh mockup. Người ta đo tay
 * trên ảnh rồi gõ số vào, nên lệch là chuyện thường — và sửa số thì có nghĩa.
 *
 * BIẾN THỂ. Một clip có thể có nhiều bản dùng bộ mockup khác nhau, phân biệt
 * bằng hậu tố tên biến:
 *     LOP_N / XOA_N / ANH_N / MK_N   → bản ngang
 *     LOP_D / XOA_D / ANH_D / MK_D   → bản dọc
 *     LOP   / XOA   / ANH   / MK     → clip chỉ có một bản
 * Bản `const LOP=V?LOP_D:LOP_N` chỉ là cái công tắc, không phải dữ liệu.
 *
 * CỠ ẢNH LẤY TỪ CHÍNH FILE ẢNH, không đọc từ code. Hôm 28/08 người khác đổi
 * `const IMG_W=1672` thành `const IMG_W=V?941:1672` và bộ đọc cũ gãy im lặng.
 * Đọc thẳng đầu file PNG thì họ viết kiểu gì cũng không ảnh hưởng.
 */
import { copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync,
  readdirSync, closeSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { PROJ } from './proj.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KHO = path.join(GOC, '.hub-video-backups', 'doi-cu');
const BO_QUA = new Set(['scene-player.html', 'index.html', 'tai-ve.html']);

/** Cỡ thật của một file PNG — đọc IHDR ở 16 byte đầu. */
function coAnh(duongDan) {
  try {
    const fd = openSync(duongDan, 'r');
    const b = Buffer.alloc(24);
    readSync(fd, b, 0, 24, 0);
    closeSync(fd);
    if (b.readUInt32BE(0) !== 0x89504e47) return null;   // không phải PNG
    return { rong: b.readUInt32BE(16), cao: b.readUInt32BE(20) };
  } catch { return null; }
}

/**
 * HẰNG SỐ CỦA CHÍNH FILE ĐÓ.
 *
 * Mảng dữ liệu trong clip hay tham chiếu hằng số khai phía trên: bản 6-cach có
 * `const B=7.4` (độ dài một nhịp) rồi viết `b:13.0+B`, bản văn phòng có `V`
 * (cờ bản dọc). Hộp cát trần là nổ ngay "B is not defined".
 *
 * Mồi từng tên một là trò đuổi bắt — mỗi clip mới lại đẻ hằng số mới, mà mỗi
 * lần thiếu là cả clip biến mất khỏi công cụ. Nên gom luôn MỌI khai báo hằng
 * đơn giản trong file rồi chạy trước.
 *
 * Chỉ nhận khai báo lành: không ngoặc vuông/nhọn, không hàm, không đụng
 * `document`/`location`/`window`. Cái nào chạy không nổi thì bỏ qua, không để
 * một dòng lạ làm hỏng cả việc đọc.
 */
function hangSo(html) {
  const ra = [];
  // Quét theo CẶP NGOẶC CÂN BẰNG, không theo dòng: bản 6-cach khai
  // `const N={…}` trải nhiều dòng, lọc theo dòng là bỏ sót rồi mảng LOP dùng
  // `N` sẽ nổ, và cả clip biến mất khỏi công cụ.
  for (const m of html.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)) {
    let i = m.index + m[0].length;
    let sau = 0, trongChuoi = null, xong = -1;
    while (i < html.length) {
      const c = html[i];
      if (trongChuoi) {
        if (c === '\\') i++;
        else if (c === trongChuoi) trongChuoi = null;
      } else if (c === '"' || c === "'" || c === '`') trongChuoi = c;
      else if ('[{('.includes(c)) sau++;
      else if (']})'.includes(c)) sau--;
      else if (c === ';' && sau === 0) { xong = i; break; }
      else if (c === '\n' && sau === 0 && /^\s*(const|let|var|function|\/\*)/.test(html.slice(i + 1, i + 12))) break;
      i++;
    }
    if (xong < 0) continue;
    const than = html.slice(m.index, xong + 1);
    // Đụng tới trình duyệt thì chạy trong hộp cát không nổi — bỏ luôn cho nhanh.
    if (/=>|\bfunction\b|document|location|window|require|await/.test(than)) continue;
    ra.push(than.replace(/^const/, 'var'));
  }
  return ra;
}

/**
 * Bắt một mảng khai bằng `const TEN=[...]` rồi chạy trong hộp cát.
 *
 * `moi` là biến mồi, đặt TRƯỚC hằng số của file — dùng để ép `V` theo từng bản
 * (dọc/ngang), vì trong file `V` suy từ `location.search` nên không nạp được.
 */
function batMang(html, ten, moi = {}) {
  const m = html.match(new RegExp(`const ${ten}\\s*=\\s*\\[[\\s\\S]*?\\];`));
  if (!m) return null;
  try {
    const s = { ...moi };
    vm.createContext(s);
    // Hằng số của file chạy trước, nhưng KHÔNG đè biến mồi.
    for (const d of hangSo(html)) {
      const ten2 = d.match(/^var\s+([A-Za-z_$][\w$]*)/)?.[1];
      if (!ten2 || ten2 in moi || ten2 === ten) continue;
      try { vm.runInContext(d, s); } catch { /* khai lạ thì bỏ, đừng hỏng cả */ }
    }
    vm.runInContext(`${m[0].replace(`const ${ten}`, `var ${ten}`)}\nthis.__r = ${ten};`, s);
    return { giaTri: s.__r, khoi: m[0], viTri: m.index };
  } catch (e) {
    return { giaTri: null, khoi: m[0], viTri: m.index, loi: e.message };
  }
}

const chuoi = (html, ten) => (html.match(new RegExp(`const ${ten}\\s*=\\s*'([^']*)'`)) || [])[1] || null;

/**
 * Mọi biến thể của một clip. Ghép theo hậu tố: `LOP_N` đi với `ANH_N`, `MK_N`.
 * Hậu tố rỗng nghĩa là clip chỉ có một bản.
 */
function bienThe(html) {
  const ra = [];
  // Chỉ nhận khai báo mảng thật; `const LOP=V?LOP_D:LOP_N` không lọt vào đây.
  for (const m of html.matchAll(/const (LOP(_[A-Z0-9]+)?)\s*=\s*\[/g)) {
    const hau = m[2] || '';
    const lop = batMang(html, m[1]);
    // Đọc không ra thì BỎ QUA HẲN. Trước đây vẫn đẩy vào rồi lát sau
    // `.forEach` trên null làm văng cả đường dẫn — clip biến mất kèm một câu
    // lỗi JavaScript trần trụi thay vì lời giải thích.
    if (!lop || !Array.isArray(lop.giaTri)) continue;
    const mk = chuoi(html, `MK${hau}`) ?? chuoi(html, 'MK');
    const anh = batMang(html, `ANH${hau}`) ?? batMang(html, 'ANH');
    ra.push({
      hau,
      ten: hau === '_D' ? 'Bản dọc 9:16' : hau === '_N' ? 'Bản ngang 16:9' : 'Bản duy nhất',
      tenLOP: m[1], tenXOA: batMang(html, `XOA${hau}`) ? `XOA${hau}` : (batMang(html, 'XOA') ? 'XOA' : null),
      lop, mk, anh: anh?.giaTri || [],
    });
  }
  return ra;
}

/** Clip đời cũ nào sửa được khung. Tự phát hiện, vì đội vẫn đang dựng thêm. */
export function timClipKhung() {
  const ra = {};
  for (const ten of readdirSync(PROJ)) {
    if (!ten.endsWith('.html') || ten.includes('.bak') || BO_QUA.has(ten)) continue;
    let html;
    try { html = readFileSync(path.join(PROJ, ten), 'utf8'); } catch { continue; }
    if (!/const LOP/.test(html)) continue;
    const bt = bienThe(html);
    if (!bt.length) continue;
    ra[ten.replace(/\.html$/, '')] = { file: ten, soBan: bt.length };
  }
  return ra;
}

const TEN_LOAI = {
  vong: 'Vòng sáng', xoa: 'Miếng che logo', tep: 'Gói tin bay',
  che: 'Hé từ trái sang', cheD: 'Hé từ đáy lên', cheU: 'Hé từ trên xuống',
  mo: 'Mờ dần hiện ra', chu: 'Miếng vá chữ', ma: 'Khung mã HTML',
  sang: 'Quầng sáng thở',
};

/*
 * LUẬT KÉO ĐƯỢC — theo HÌNH HỌC, không theo tên loại.
 *
 * Bản đầu tôi dùng danh sách trắng tên loại (vong/che/xoa). Sai: clip CEO đẻ
 * thêm sáu tên mới — cheD, cheU, mo, chu, ma, sang — mà tất cả đều chỉ là hộp
 * chữ nhật trong cùng hệ toạ độ ảnh, chỉ khác nhau ở CÁCH HÉ LỘ chứ không khác
 * hình học. Danh sách trắng khoá oan 75/89 lớp, và mỗi clip mới lại khoá oan
 * tiếp. Đội làm clip vẫn đang nghĩ thêm cách hé lộ mới.
 *
 * Luật đúng: hễ là hộp bốn số có diện tích dương thì kéo được. Thứ duy nhất
 * phải loại là lớp mà `box` KHÔNG phải hình chữ nhật — như `tep` (gói tin bay:
 * `box` chỉ là điểm xuất phát, đường đi nằm ở `tu`/`den`). Loại đó tự lộ ra vì
 * diện tích bằng 0 và có `tu`/`den` là mảng.
 */
function laDuongBay(el) {
  return Array.isArray(el?.tu) || Array.isArray(el?.den);
}

/** Lớp này có kéo được không, và nếu không thì vì sao. */
function danhGia(loai, box, el) {
  if (!Array.isArray(box) || box.length !== 4 || box.some((n) => !Number.isFinite(n))) {
    return { suaDuoc: false, viSao: 'Lớp này không khai toạ độ kiểu hộp bốn số.' };
  }
  if (laDuongBay(el)) {
    return { suaDuoc: false,
      viSao: `"${TEN_LOAI[loai] || loai}" bay theo đường chứ không đứng một chỗ — `
        + 'hộp chỉ là điểm xuất phát, chưa kéo được.' };
  }
  if (box[2] <= box[0] || box[3] <= box[1]) {
    return { suaDuoc: false, viSao: 'Hộp này rộng hoặc cao bằng 0 — không phải khung để kéo.' };
  }
  return { suaDuoc: true, viSao: null };
}

/** Chú thích cuối mỗi dòng có `box:` — nhãn người viết đã đặt sẵn. */
function ghiChu(khoi) {
  const ra = [];
  for (const d of (khoi || '').split('\n')) {
    if (!/box\s*:\s*\[/.test(d)) continue;
    ra.push((d.match(/\/\*\s*(.*?)\s*\*\//) || [])[1] || null);
  }
  return ra;
}

/**
 * VÌ SAO CLIP NÀY KHÔNG CHỈNH ĐƯỢC KHUNG.
 *
 * Trước đây clip không hợp quy ước thì lặng lẽ không hiện thẻ "Khung nhấn", và
 * người dùng phải đi hỏi mới biết vì sao. Giờ nó tự nói ra thiếu đúng cái gì,
 * đối chiếu với docs/QUY-UOC-CLIP.md.
 */
export function chanDoan(slug) {
  const ten = `${slug}.html`;
  const f = path.join(PROJ, ten);
  if (!existsSync(f)) return ['Không thấy file clip.'];
  const html = readFileSync(f, 'utf8');
  const thieu = [];

  /*
   * ĐIỀU KIỆN GỐC là có ảnh storyboard. Không có ảnh thì không có gì để bày ra
   * cho người dùng kéo khung lên trên — mọi quy ước còn lại thành vô nghĩa.
   * Nên nói cái này TRƯỚC, và nói cho rõ.
   */
  const coAnh = /const MK[A-Z0-9_]*\s*=\s*'/.test(html)
    && /const ANH[A-Z0-9_]*\s*=\s*\[/.test(html);
  if (!coAnh) {
    thieu.push('Clip này không dựng trên ảnh storyboard (thiếu MK và ANH) — '
      + 'không có tấm ảnh nào để bày ra cho kéo khung lên trên. Đây là điều kiện gốc.');
  }

  const coLOP = /const LOP[A-Z0-9_]*\s*=\s*\[/.test(html);
  if (coLOP) {
    const bt = bienThe(html);
    if (!bt.length) thieu.push('Có mảng LOP nhưng đọc không ra — cú pháp lạ.');
    else if (!bt.some((b) => b.lop.giaTri?.some((l) => Array.isArray(l?.box)))) {
      thieu.push('Các mục trong LOP không có trường `box` — quy ước là '
        + '{sc, box:[trái,trên,phải,dưới], …}, không phải mảng vị trí.');
    }
  } else if (coAnh) {
    /*
     * Chỉ gợi ý đổi tên khi clip CÓ ảnh mà lại đặt mảng tên khác. Nếu không có
     * ảnh thì mảng kia gần như chắc chắn làm việc khác — bản tao-database có
     * `KHUNG=[[từ,tới,hệ-số,tâm-x,tâm-y]]` là KHUNG NGẮM của máy quay, khuyên
     * đổi tên thành LOP là khuyên họ làm hỏng clip. Đã suýt khuyên sai một lần.
     */
    const khac = [...html.matchAll(/const ([A-Z][A-Z0-9_]{2,})\s*=\s*\[/g)]
      .map((m) => m[1]).filter((t) => /VONG|KHUNG|BOX|HIGH/.test(t));
    thieu.push(khac.length
      ? `Mảng khung đang đặt tên "${khac[0]}" — quy ước là LOP (miếng che là XOA).`
      : 'Không có mảng LOP nào — clip này không khai khung nhấn thành dữ liệu.');
  }

  return thieu.length ? thieu : null;
}

export function docKhung(slug) {
  const ct = timClipKhung()[slug];
  if (!ct) return null;
  const html = readFileSync(path.join(PROJ, ct.file), 'utf8');
  const bt = bienThe(html);

  const ban = bt.map((b) => {
    // `V` là cờ bản dọc trong chính trang đó. Phải mồi đúng cho từng bản, vì
    // `SC[]` dùng nó để chọn khung ngắm.
    const SC = batMang(html, 'SC', { V: b.hau === '_D' });
    const anh0 = b.anh[0] && b.mk ? path.join(PROJ, b.mk, b.anh[0]) : null;
    const co = anh0 && existsSync(anh0) ? coAnh(anh0) : null;
    const anhCuaCanh = (sc) => {
      const canh = SC?.giaTri?.[sc];
      const i = canh?.src;
      return typeof i === 'number' && b.anh[i] ? b.mk + b.anh[i] : null;
    };

    const chuL = ghiChu(b.lop.khoi);
    const xoa = b.tenXOA ? batMang(html, b.tenXOA) : null;
    const chuX = ghiChu(xoa?.khoi);
    const lop = [];

    b.lop.giaTri.forEach((l, i) => {
      // `k` có thể vắng hẳn — bản văn phòng dựng thẳng `div.vong` cho mọi mục.
      const loai = l.k || 'vong';
      lop.push({
        kho: b.tenLOP, chiSo: i, canh: l.sc, loai,
        ten: chuL[i] || TEN_LOAI[loai] || loai, loaiTen: TEN_LOAI[loai] || loai,
        box: l.box, tu: l.a, den: l.b, anh: anhCuaCanh(l.sc),
        ...danhGia(loai, l.box, l),
      });
    });

    /*
     * XOA có hai dạng khai: object `{sc, box:[...]}` một mục một dòng, hoặc mảng
     * phẳng `[sc,x0,y0,x1,y1]` HAI mục một dòng. Dạng mảng phẳng thì cách vá
     * theo dòng ở dưới không lần ra đúng mục — nên chỉ CHO XEM. Liều vá bừa vào
     * một video đã giao thì hỏng nặng hơn nhiều so với thiếu một tính năng.
     */
    (xoa?.giaTri || []).forEach((x, i) => {
      const phang = Array.isArray(x);
      const canh = phang ? x[0] : x.sc;
      lop.push({
        kho: b.tenXOA, chiSo: i, canh, loai: 'xoa',
        ten: (phang ? null : chuX[i]) || TEN_LOAI.xoa, loaiTen: TEN_LOAI.xoa,
        box: phang ? x.slice(1, 5) : x.box, tu: null, den: null,
        anh: anhCuaCanh(canh),
        ...danhGia('xoa', phang ? x.slice(1, 5) : x.box, phang ? null : x),
      });
    });

    lop.sort((a, c) => a.canh - c.canh || (a.tu ?? 99) - (c.tu ?? 99));
    return {
      hau: b.hau, ten: b.ten, kho: b.tenLOP,
      rong: co?.rong ?? null, cao: co?.cao ?? null,
      thieuAnh: !co, lop,
    };
  });

  return { slug, file: ct.file, ban };
}

/** Sửa toạ độ một lớp: [trái, trên, phải, dưới] theo pixel ảnh mockup. */
export function suaKhung(slug, kho, chiSo, box) {
  const ct = timClipKhung()[slug];
  if (!ct) return { ok: false, vanDe: ['Clip này không có khung nhấn để sửa.'] };
  if (!/^(LOP|XOA)(_[A-Z0-9]+)?$/.test(String(kho))) {
    return { ok: false, vanDe: ['Tên mảng không hợp lệ.'] };
  }
  if (!Array.isArray(box) || box.length !== 4 || box.some((n) => !Number.isFinite(n))) {
    return { ok: false, vanDe: ['Toạ độ phải là bốn con số.'] };
  }
  const [x0, y0, x1, y1] = box.map(Math.round);
  if (x1 <= x0 || y1 <= y0) {
    return { ok: false, vanDe: ['Cạnh phải phải lớn hơn cạnh trái, cạnh dưới lớn hơn cạnh trên.'] };
  }

  const duongDan = path.join(PROJ, ct.file);
  const html = readFileSync(duongDan, 'utf8');
  const mang = batMang(html, kho);
  if (!mang) return { ok: false, vanDe: [`Không đọc được mảng ${kho}.`] };
  if (chiSo < 0 || chiSo >= mang.giaTri.length) return { ok: false, vanDe: ['Không có lớp này.'] };
  const muc = mang.giaTri[chiSo];
  const phangKhong = Array.isArray(muc);
  const hopCu = phangKhong ? muc.slice(1, 5) : muc.box;
  const dg = danhGia(muc.k || (kho.startsWith('XOA') ? 'xoa' : 'vong'), hopCu,
    phangKhong ? null : muc);
  if (!dg.suaDuoc) return { ok: false, vanDe: [dg.viSao] };

  /*
   * GIỮ NGUYÊN CĂN LỀ TAY ở cả hai cách: ép từng số về đúng bề rộng ô cũ, để
   * một sửa đổi hai con số không thành cái diff nhìn như viết lại cả file.
   */
  const depSo = (soMoi, oCu) => soMoi
    .map((n, i) => String(n).padStart((oCu[i] ?? '').length, ' ')).join(',');

  let khoiMoi;
  if (phangKhong) {
    /*
     * Mảng phẳng `[sc,x0,y0,x1,y1]`, có khi HAI mục chung một dòng — đếm theo
     * dòng là trật. Đếm theo CẶP NGOẶC trong cùng: các mục này toàn số nên
     * không lồng nhau, `[^[\]]*` bắt đúng từng mục một.
     */
    let dem = -1;
    khoiMoi = mang.khoi.replace(/\[[^[\]]*\]/g, (khop) => {
      if (++dem !== chiSo) return khop;
      const o = khop.slice(1, -1).split(',');
      /*
       * Ô 0 là số cảnh, ô 1..4 là toạ độ — nhưng CÓ THỂ CÒN Ô PHÍA SAU: bản dọc
       * khai `[0, 0, 0, 941, 122, null,'#f8f9fd']`, bảy ô, hai ô cuối là cờ và
       * mã màu. Dựng lại đúng năm ô là nuốt mất chúng, miếng che mất màu mà
       * không ai biết cho tới lúc xem video. Nên giữ nguyên xi phần đuôi.
       */
      const dau = depSo([o[0].trim(), x0, y0, x1, y1], o);
      const duoi = o.slice(5).join(',');
      return `[${dau}${duoi ? ',' + duoi : ''}]`;
    });
    if (dem < chiSo) return { ok: false, vanDe: ['Không tìm được mục của lớp này.'] };
  } else {
    const dong = mang.khoi.split('\n');
    let dem = -1, canSua = -1;
    for (let i = 0; i < dong.length; i++) {
      if (/box\s*:\s*\[/.test(dong[i]) && ++dem === chiSo) { canSua = i; break; }
    }
    if (canSua < 0) return { ok: false, vanDe: ['Không tìm được dòng của lớp này.'] };
    const cu = dong[canSua];
    const oCu = cu.match(/box\s*:\s*\[([^\]]*)\]/)[1].split(',');
    dong[canSua] = cu.replace(/box\s*:\s*\[[^\]]*\]/,
      `box:[${depSo([x0, y0, x1, y1], oCu)}]`);
    khoiMoi = dong.join('\n');
  }

  const htmlMoi = html.slice(0, mang.viTri) + khoiMoi
    + html.slice(mang.viTri + mang.khoi.length);

  // Cất nguyên cả file TRƯỚC — đây là video đã giao và dự án không có git.
  mkdirSync(path.join(KHO, slug), { recursive: true });
  const dau = new Date().toISOString().replace(/[:.]/g, '-');
  copyFileSync(duongDan, path.join(KHO, slug, `${dau}.html`));

  const tam = `${duongDan}.tmp-${process.pid}`;
  writeFileSync(tam, htmlMoi, 'utf8');
  renameSync(tam, duongDan);

  const lai = batMang(readFileSync(duongDan, 'utf8'), kho);
  const hopLai = lai && (phangKhong
    ? lai.giaTri[chiSo]?.slice(1, 5) : lai.giaTri[chiSo]?.box);
  if (!lai || lai.giaTri.length !== mang.giaTri.length
      || String(hopLai) !== String([x0, y0, x1, y1])) {
    copyFileSync(path.join(KHO, slug, `${dau}.html`), duongDan);
    return { ok: false, vanDe: ['Ghi xong đọc lại không khớp — đã trả lại bản cũ.'] };
  }
  return { ok: true, vanDe: [], box: [x0, y0, x1, y1], banCu: dau };
}
