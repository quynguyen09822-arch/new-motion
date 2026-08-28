/**
 * KHUNG NHẤN TRÊN CLIP ĐỜI CŨ — đọc và sửa toạ độ các lớp vẽ đè.
 *
 * VÌ SAO ĐÂY LÀ NGOẠI LỆ. Nguyên tắc chung của trình sửa là không đụng vào clip
 * đời cũ, vì ở đó vị trí do code TÍNH RA lúc chạy nên không có gì để sửa. Nhưng
 * mấy lớp vẽ đè thì khác hẳn: toạ độ của chúng là SỐ VIẾT THẲNG trong mảng
 * `LOP[]`/`XOA[]`, tính theo pixel của ảnh mockup 941×1672 — đúng bằng kích
 * thước thật của sáu file ảnh. Người ta đo tay trên ảnh rồi gõ số vào, nên lệch
 * là chuyện thường. Đây chính là ca mà sửa số có nghĩa.
 *
 * Cách đọc mượn của `tools/long-tieng.mjs`: bắt mảng bằng biểu thức chính quy
 * rồi chạy trong hộp cát `node:vm`. Cách này đã chạy thật trong dự án nhiều
 * tháng với `VO[]`, không phải sáng kiến mới.
 *
 * Cách ghi: CHỈ thay đúng đoạn `box:[...]` trên đúng dòng của lớp đó. Không
 * dựng lại cả mảng — dựng lại là mất hết căn lề tay và mấy dòng chú thích
 * bên phải, biến một sửa đổi hai con số thành một diff khổng lồ.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { PROJ } from './proj.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KHO = path.join(GOC, '.hub-video-backups', 'doi-cu');

/**
 * TỰ PHÁT HIỆN clip nào sửa được khung, thay vì khai tay từng cái.
 *
 * Đội làm clip đang dựng thêm (VH-03…VH-06 đã có kịch bản chờ sẵn), và mỗi clip
 * mới lại có cỡ ảnh storyboard riêng — bản marketer dọc 941×1672, bản văn phòng
 * ngang 1672×941. Khai tay là chắc chắn quên, và quên thì tính năng lặng lẽ
 * không áp dụng cho clip mới mà chẳng ai biết.
 */
export function timClipKhung() {
  const ra = {};
  for (const ten of readdirSync(PROJ)) {
    if (!ten.endsWith('.html') || ten.includes('.bak')) continue;
    if (['scene-player.html', 'index.html', 'tai-ve.html'].includes(ten)) continue;
    let html;
    try { html = readFileSync(path.join(PROJ, ten), 'utf8'); } catch { continue; }
    if (!/const LOP\s*=\s*\[/.test(html)) continue;
    const rong = Number((html.match(/IMG_W\s*=\s*(\d+)/) || [])[1]);
    const cao = Number((html.match(/IMG_H\s*=\s*(\d+)/) || [])[1]);
    if (!rong || !cao) continue;
    ra[ten.replace(/\.html$/, '')] = { file: ten, rong, cao };
  }
  return ra;
}

function batMang(html, ten) {
  // Dừng ở `];` đầu tiên — `ANH` kết thúc ngay cuối dòng chứ không xuống dòng,
  // đòi `\n];` là chạy lố sang phần mã bên dưới rồi nổ vì thiếu `document`.
  const m = html.match(new RegExp(`const ${ten}\\s*=\\s*\\[[\\s\\S]*?\\];`));
  if (!m) return null;
  const s = {};
  vm.createContext(s);
  vm.runInContext(`${m[0].replace(`const ${ten}`, `var ${ten}`)}\nthis.__r = ${ten};`, s);
  return { giaTri: s.__r, khoi: m[0], viTri: m.index };
}

/** Đọc mọi lớp vẽ đè của một clip đời cũ, kèm ảnh mockup tương ứng. */
export function docKhung(slug) {
  const ct = timClipKhung()[slug];
  if (!ct) return null;
  const html = readFileSync(path.join(PROJ, ct.file), 'utf8');

  const LOP = batMang(html, 'LOP');
  const XOA = batMang(html, 'XOA');
  const ANH = batMang(html, 'ANH');
  const SC = batMang(html, 'SC');
  if (!LOP || !ANH) return null;

  const mk = (html.match(/const MK\s*=\s*'([^']+)'/) || [])[1] || '';
  const anhCuaCanh = (sc) => {
    const canh = SC?.giaTri?.[sc];
    if (!canh || canh.src == null) return null;   // cảnh dùng giao diện thật, không có mockup
    if (typeof canh.src === 'number') return mk + ANH.giaTri[canh.src];
    return null;
  };

  const TEN = { vong: 'Vòng sáng', che: 'Miếng hé lộ', xoa: 'Miếng che logo' };

  // Chú thích cuối dòng trong file là nhãn người viết đã đặt sẵn — "ô vừa khoá",
  // "khung gõ yêu cầu". Hữu ích hơn hẳn nhãn máy sinh, nên lôi ra dùng.
  const ghiChu = (khoi) => {
    const ra = [];
    for (const d of khoi.split('\n')) {
      if (!/box\s*:\s*\[/.test(d)) continue;
      ra.push((d.match(/\/\*\s*(.*?)\s*\*\//) || [])[1] || null);
    }
    return ra;
  };
  const chuLOP = ghiChu(LOP.khoi);
  const chuXOA = XOA ? ghiChu(XOA.khoi) : [];

  const lop = [];
  LOP.giaTri.forEach((l, i) => {
    // eslint-disable-next-line no-unused-vars
    // `k` có thể vắng hẳn: bản văn phòng dựng thẳng `div.vong` cho mọi mục nên
    // không khai loại. Vắng thì mặc định là vòng sáng, đúng như bộ dựng làm.
    const loai = l.k || 'vong';
    lop.push({
      kho: 'LOP', chiSo: i, canh: l.sc, loai, ten: chuLOP[i] || TEN[loai] || loai,
      loaiTen: TEN[loai] || loai,
      box: l.box, tu: l.a, den: l.b, mau: l.mau || null,
      anh: anhCuaCanh(l.sc),
      suaDuoc: true, viSao: null,
    });
  });
  /*
   * XOA có HAI dạng khai khác nhau giữa hai clip:
   *   marketer  → {sc, box:[...], mau}   một mục một dòng, có `box:`
   *   văn phòng → [sc, x0,y0,x1,y1]      mảng phẳng, HAI mục một dòng
   *
   * Dạng mảng phẳng thì cách vá theo dòng ở dưới không lần ra được đúng mục —
   * hai mục chung một dòng, lại chẳng có chữ `box:` nào để đếm. Nên dạng đó chỉ
   * CHO XEM, khoá không cho sửa. Liều vá bừa vào một video đã giao thì hỏng
   * nặng hơn nhiều so với việc thiếu một tính năng.
   */
  (XOA?.giaTri || []).forEach((x, i) => {
    const mangPhang = Array.isArray(x);
    const canh = mangPhang ? x[0] : x.sc;
    const box = mangPhang ? x.slice(1, 5) : x.box;
    lop.push({
      kho: 'XOA', chiSo: i, canh, loai: 'xoa',
      ten: (mangPhang ? null : chuXOA[i]) || TEN.xoa,
      loaiTen: TEN.xoa,
      box, tu: null, den: null, mau: mangPhang ? null : (x.mau || null),
      anh: anhCuaCanh(canh),
      suaDuoc: !mangPhang,
      viSao: mangPhang ? 'Miếng che ở clip này khai kiểu mảng gọn, chưa sửa an toàn được.' : null,
    });
  });

  lop.sort((a, b) => a.canh - b.canh || (a.tu ?? 99) - (b.tu ?? 99));
  return { slug, file: ct.file, rong: ct.rong, cao: ct.cao, lop };
}

/**
 * Sửa toạ độ một lớp. Bốn số là [trái, trên, phải, dưới] theo pixel ảnh mockup.
 * Cất bản cũ → thay đúng một đoạn trên đúng một dòng → đọc lại kiểm chứng.
 */
export function suaKhung(slug, kho, chiSo, box) {
  const ct = timClipKhung()[slug];
  if (!ct) return { ok: false, vanDe: ['Clip này không có khung nhấn để sửa.'] };
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
  if (chiSo < 0 || chiSo >= mang.giaTri.length) {
    return { ok: false, vanDe: ['Không có lớp này.'] };
  }
  if (Array.isArray(mang.giaTri[chiSo])) {
    return { ok: false, vanDe: ['Lớp này khai kiểu mảng gọn, chưa sửa an toàn được.'] };
  }

  // Trong khối mảng, mỗi mục nằm gọn một dòng. Đếm theo dòng có `box:` để tìm
  // đúng dòng của mục thứ `chiSo`, rồi chỉ thay mỗi đoạn `box:[...]` ở đó.
  const dong = mang.khoi.split('\n');
  let dem = -1, dongCanSua = -1;
  for (let i = 0; i < dong.length; i++) {
    if (/box\s*:\s*\[/.test(dong[i]) && ++dem === chiSo) { dongCanSua = i; break; }
  }
  if (dongCanSua < 0) return { ok: false, vanDe: ['Không tìm được dòng của lớp này.'] };

  // GIỮ NGUYÊN CĂN LỀ TAY. Trong file, các số được đệm khoảng trắng cho thẳng
  // cột — `box:[  84, 296, 504, 462]`. Ghi đè bằng số sát nhau là cả khối mảng
  // xô lệch, biến một sửa đổi hai con số thành một diff nhìn như viết lại file.
  // Nên ép từng số về đúng bề rộng ô cũ của nó.
  const cu = dong[dongCanSua];
  const khopBox = cu.match(/box\s*:\s*\[([^\]]*)\]/);
  const oCu = khopBox[1].split(',');
  const soMoi = [x0, y0, x1, y1]
    .map((n, i) => String(n).padStart((oCu[i] ?? '').length, ' '))
    .join(',');
  dong[dongCanSua] = cu.replace(/box\s*:\s*\[[^\]]*\]/, `box:[${soMoi}]`);

  const khoiMoi = dong.join('\n');
  const htmlMoi = html.slice(0, mang.viTri) + khoiMoi + html.slice(mang.viTri + mang.khoi.length);

  // Cất bản cũ TRƯỚC. File này là một video đã giao và dự án không có git.
  mkdirSync(path.join(KHO, slug), { recursive: true });
  const dau = new Date().toISOString().replace(/[:.]/g, '-');
  copyFileSync(duongDan, path.join(KHO, slug, `${dau}.html`));

  const tam = `${duongDan}.tmp-${process.pid}`;
  writeFileSync(tam, htmlMoi, 'utf8');
  renameSync(tam, duongDan);

  // Đọc lại kiểm chứng: mảng phải còn nguyên số mục và mục kia phải mang số mới.
  const lai = batMang(readFileSync(duongDan, 'utf8'), kho);
  if (!lai || lai.giaTri.length !== mang.giaTri.length
      || String(lai.giaTri[chiSo].box) !== String([x0, y0, x1, y1])) {
    copyFileSync(path.join(KHO, slug, `${dau}.html`), duongDan);
    return { ok: false, vanDe: ['Ghi xong đọc lại không khớp — đã trả lại bản cũ.'] };
  }
  return { ok: true, vanDe: [], box: [x0, y0, x1, y1], banCu: dau };
}
