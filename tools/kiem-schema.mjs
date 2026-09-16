#!/usr/bin/env node
/**
 * CHẶN LỆCH SCHEMA GIỮA BA NƠI.
 *
 * Một trường của clip sống ở ba chỗ, nằm trong HAI repo khác nhau:
 *
 *   1. `clipvibe-studio/src/scene/types.ts`  — bản khai hợp đồng
 *   2. `web/inspector/schema.js`             — núm bày ra cho người dùng vặn
 *   3. `scene-player.html`                   — nơi THẬT SỰ vẽ ra hình
 *
 * Lệch nhau thì không ai báo gì cả, và hỏng theo hai chiều, cả hai đều lặng lẽ:
 *
 *   · NÚM MA — bày núm cho một trường bộ dựng không đọc. Bấm vào thì kịch bản
 *     đổi, khung hình đứng im. Đã gặp THẬT: 16 núm "Đệm trong" chết.
 *   · NĂNG LỰC BỊ GIẤU — bộ dựng đọc một trường mà không có núm nào. Đã gặp
 *     THẬT: `gap` chạy ở 11 loại, chỉ 1 loại được bày núm.
 *
 * KỶ LUẬT: chỉ báo khi CHẮC. Phép dò bộ dựng là dò chữ `el.<tên>` trong khối
 * dựng của từng loại — đó là phép ĐOÁN, không phải phép chứng minh. Nên chỗ nào
 * không chắc thì xếp vào mục "xem lại" chứ không đánh rớt, và có `BO_QUA` cho
 * những ca đã soi tận nơi. Một lời báo sai là một lần người dùng học được rằng
 * bảng này nói nhảm.
 *
 *   node tools/kiem-schema.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const TYPES = path.join(PROJ, 'clipvibe-studio/src/scene/types.ts');
const BO_DUNG = path.join(PROJ, 'scene-player.html');
const { NUM_RIENG, TEN_LOAI, DEM_TRONG, KHE_HO, NUM_HIEU_UNG } =
  await import(new URL('../web/inspector/schema.js', import.meta.url));

/** Trường hệ thống / hình học — sửa bằng chuột hoặc do bộ dựng tự lo. */
const HE_THONG = new Set(['id', 'kind', 'children', 'x', 'y', 'w', 'h',
  'at', 'for', 'in', 'out', 'place', 'margin', 'rotate', 'opacity', 'pad', 'gap',
  'soft', 'softIn', 'shadow', 'push', 'pushOut', 'ink']);

/**
 * Ca đã soi tận nơi, cố ý bỏ qua. Mỗi dòng phải kèm LÝ DO — danh sách bỏ qua
 * không có lý do là chỗ để giấu lỗi.
 */
const BO_QUA = {
  'video.blur': 'px trên thẻ <video> bên trong, khác `soft` (bậc) của cả nút',
  'video.dim': 'lớp tối phủ lên, bộ dựng đọc trong BUILD.video',
  'video.rate': 'tốc độ phát, đọc trong TICK.video',
  'video.start': 'giây bắt đầu trong file, đọc trong TICK.video',
  'video.loop': 'đọc trong BUILD.video và TICK.video',
  'phone.loop': 'chuyền xuống `khePhim`, không đọc thẳng bằng `el.loop`',
  'browser.loop': 'chuyền xuống `khePhim`, không đọc thẳng bằng `el.loop`',
  'calendar.offset': 'có trong types.ts, bộ dựng chưa dùng — ghi nhận, chưa bỏ',
  'sweep.angle': 'vệt sáng vẽ bằng CSS, đọc gián tiếp',
  'sweep.width': 'vệt sáng vẽ bằng CSS, đọc gián tiếp',
  'sweep.color': 'vệt sáng vẽ bằng CSS, đọc gián tiếp',
  'form.value': 'không phải trường của `form` — nó nằm TRONG từng ô của `fields`',
  'form.label': 'nt',
};

/*
 * NỢ ĐÃ GHI NHẬN — lệch THẬT, đã biết, đang xếp hàng chờ làm.
 *
 * Khác hẳn `BO_QUA`: `BO_QUA` là "soi rồi, không phải lỗi"; còn đây là "đúng là
 * lỗi, chưa làm". Tách hai thứ ra vì gộp lại là cách êm ái nhất để một cái lỗi
 * biến thành một dòng chú thích rồi nằm đó mãi.
 *
 * Và danh sách này KHÔNG được mục rữa: sửa xong một mục mà quên xoá khỏi đây
 * thì phép kiểm ĐÁNH RỚT. Một danh sách nợ không ai dọn thì chẳng mấy chốc
 * thành nghĩa địa, và người đọc sẽ bỏ qua cả những dòng còn đúng.
 */
const NO_GHI_NHAN = {
  'quydao.chips': 'danh sách con — chờ Lát 2 (UI sửa danh sách trong món)',
  'pointer.path': 'danh sách con — chờ Lát 2',
  'pointer.clicks': 'danh sách con — chờ Lát 2',
  'form.fields': 'danh sách con — chờ Lát 2',
};

let hong = 0, xemLai = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};
const luuY = (cau) => { console.log(`  · ${cau}`); xemLai++; };

/* ---------- đọc types.ts ---------- */
const ts = readFileSync(TYPES, 'utf8');
const loaiTS = new Map();          // kind → Set(trường)
{
  // Mỗi interface là một khối `interface X extends Base { ... }` — cắt theo ngoặc.
  const re = /interface\s+\w+\s+extends\s+Base\s*\{/g;
  let m;
  while ((m = re.exec(ts))) {
    let i = re.lastIndex, sau = 1;
    while (i < ts.length && sau > 0) { if (ts[i] === '{') sau++; else if (ts[i] === '}') sau--; i++; }
    const than = ts.slice(re.lastIndex, i - 1);
    const kind = (/kind:\s*'([^']+)'/.exec(than) || [])[1];
    if (!kind) continue;
    const truong = new Set();
    /*
     * Cắt theo CẢ dấu chấm phẩy lẫn xuống dòng.
     *
     * Phần lớn interface trong `types.ts` viết gọn trên MỘT dòng:
     *   `interface BrowserEl extends Base { kind: 'browser'; url?: string }`
     * Chỉ dò theo đầu dòng thì mỗi loại chỉ nhặt được đúng trường đầu tiên, và
     * phép kiểm "năng lực bị giấu" im lặng yếu đi — nó đòi trường phải có trong
     * `types.ts` mới tính. Đã mắc: xoá núm `browser.url` mà phép kiểm vẫn xanh.
     */
    const sach = than.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    for (const dong of sach.split(/[;\n]/)) {
      const t = /^\s*(\w+)\??\s*:/.exec(dong);
      if (t && t[1] !== 'kind') truong.add(t[1]);
    }
    loaiTS.set(kind, truong);
  }
}

/* ---------- đọc bộ dựng ---------- */
const bo = readFileSync(BO_DUNG, 'utf8');
const loaiBoDung = new Map();      // kind → Set(trường bộ dựng ĐỌC)

/** Thân của một hàm khai kiểu `function ten(` — để đi theo một tầng gọi nhờ. */
function thanHam(ten) {
  const i = bo.search(new RegExp(`function\\s+${ten}\\s*\\(`));
  if (i < 0) return '';
  let j = bo.indexOf('{', i) + 1, sau = 1, k = j;
  while (k < bo.length && sau > 0) { if (bo[k] === '{') sau++; else if (bo[k] === '}') sau--; k++; }
  return bo.slice(j, k - 1);
}

/*
 * ĐI THEO MỘT TẦNG GỌI NHỜ.
 *
 * `quydao` không đọc trường nào trong khối dựng của nó — nó gọi `veQuyDao(el)`
 * rồi đọc hết ở trong đó. Chỉ dò khối dựng thì sáu núm của `quydao` bị kêu oan
 * là núm ma. Đây đúng là thứ phải sửa ở PHÉP DÒ, không phải nhét vào danh sách
 * bỏ qua — nhét vào đó là giấu lỗi chứ không phải hết lỗi.
 */
function moRong(doan) {
  const them = new Set();
  for (const g of doan.matchAll(/\b([a-zA-Z_]\w*)\s*\(\s*el\b/g)) them.add(g[1]);
  let ra = doan;
  for (const ten of them) ra += '\n' + thanHam(ten);
  return ra;
}
for (const bang of ['BUILD', 'TICK']) {
  const i = bo.indexOf(`const ${bang} = {`);
  if (i < 0) continue;
  let j = bo.indexOf('{', i) + 1, sau = 1, k = j;
  while (k < bo.length && sau > 0) { if (bo[k] === '{') sau++; else if (bo[k] === '}') sau--; k++; }
  const than = bo.slice(j, k - 1);
  const re = /\n {2}(\w+)\(el, n/g;
  const moc = [];
  let m2;
  while ((m2 = re.exec(than))) moc.push({ kind: m2[1], i: m2.index });
  moc.forEach((x, n) => {
    const doan = moRong(than.slice(x.i, n + 1 < moc.length ? moc[n + 1].i : undefined));
    const t = loaiBoDung.get(x.kind) || new Set();
    for (const f of doan.matchAll(/\bel\.(\w+)/g)) t.add(f[1]);
    loaiBoDung.set(x.kind, t);
  });
}

/*
 * Con trỏ chuột KHÔNG dựng bằng BUILD/TICK — nó có một lớp riêng vẽ ở
 * `applyPointer`, vì chỉ có MỘT con trỏ cho cả clip chứ không phải mỗi phần tử
 * một cái. Đọc thẳng hàm đó, đừng kêu là "bộ dựng không dựng loại này".
 */
{
  const than = thanHam('applyPointer');
  const t = new Set();
  for (const f of than.matchAll(/\bel\.(\w+)/g)) t.add(f[1]);
  if (t.size) loaiBoDung.set('pointer', t);
}

/* ---------- 1. danh sách loại ---------- */
console.log('\n1. Ba nơi có cùng một danh sách loại phần tử');
const loaiSchema = new Set(Object.keys(TEN_LOAI));
const thieuSchema = [...loaiTS.keys()].filter((k) => !loaiSchema.has(k));
const thuaSchema = [...loaiSchema].filter((k) => !loaiTS.has(k));
dat('loại nào types.ts khai thì schema.js cũng có', thieuSchema.length === 0,
  thieuSchema.join(', ') || `đủ ${loaiTS.size} loại`);
dat('schema.js không bày loại types.ts không có', thuaSchema.length === 0,
  thuaSchema.join(', ') || 'không loại lạ');
const thieuBo = [...loaiTS.keys()].filter((k) => !loaiBoDung.has(k));
dat('loại nào khai thì bộ dựng cũng dựng', thieuBo.length === 0,
  thieuBo.join(', ') || `${loaiBoDung.size} khối dựng`);

/* ---------- 2. núm ma ---------- */
console.log('\n2. Núm MA — bày ra mà bộ dựng không đọc');
const ma = [];
for (const [kind, ds] of Object.entries(NUM_RIENG)) {
  const doc2 = loaiBoDung.get(kind);
  if (!doc2) continue;
  for (const n of ds) {
    if (HE_THONG.has(n.id) || BO_QUA[`${kind}.${n.id}`]) continue;
    if (!doc2.has(n.id)) ma.push(`${kind}.${n.id}`);
  }
}
dat('không núm nào bấm vào mà khung hình đứng im', ma.length === 0,
  ma.join(', ') || `soi ${Object.values(NUM_RIENG).flat().length} núm`);

/* ---------- 3. năng lực bị giấu ---------- */
console.log('\n3. NĂNG LỰC BỊ GIẤU — bộ dựng đọc mà không có núm');
const giau = [];
for (const [kind, ds] of loaiBoDung) {
  const bay = new Set((NUM_RIENG[kind] || []).map((n) => n.id));
  if (DEM_TRONG[kind] != null) bay.add('pad');
  if (KHE_HO[kind] != null) bay.add('gap');
  for (const n of NUM_HIEU_UNG) bay.add(n.id);
  for (const f of ds) {
    if (HE_THONG.has(f) || bay.has(f) || BO_QUA[`${kind}.${f}`]) continue;
    // Chỉ tính trường types.ts có khai — bộ dựng đọc trường lạ thì là việc khác.
    if (!loaiTS.get(kind)?.has(f)) continue;
    giau.push(`${kind}.${f}`);
  }
}
const giauMoi = giau.filter((k) => !NO_GHI_NHAN[k]);
dat('không có LỆCH MỚI nào', giauMoi.length === 0, giauMoi.join(', ') || 'không có');
for (const k of giau.filter((x) => NO_GHI_NHAN[x])) {
  console.log(`  · nợ đã ghi: ${k} — ${NO_GHI_NHAN[k]}`);
}
// Danh sách nợ phải sạch: sửa xong mà quên xoá khỏi đây là đánh rớt.
const noMuc = Object.keys(NO_GHI_NHAN).filter((k) => !giau.includes(k));
dat('danh sách nợ không mục rữa', noMuc.length === 0,
  noMuc.length ? `${noMuc.join(', ')} — đã hết lệch, xoá khỏi NO_GHI_NHAN đi` : `${giau.length} mục còn nợ`);

/* ---------- 4. trường types.ts khai mà không ai dùng ---------- */
console.log('\n4. Trường khai trong types.ts mà cả hai bên đều không dùng');
for (const [kind, ds] of loaiTS) {
  const doc2 = loaiBoDung.get(kind) || new Set();
  const bay = new Set((NUM_RIENG[kind] || []).map((n) => n.id));
  for (const f of ds) {
    if (HE_THONG.has(f) || BO_QUA[`${kind}.${f}`]) continue;
    if (!doc2.has(f) && !bay.has(f)) luuY(`${kind}.${f} — khai rồi nhưng chưa ai dùng`);
  }
}
if (xemLai === 0) console.log('  ✓ không có');

console.log(`\nSoi: ${loaiTS.size} loại trong types.ts · ${loaiBoDung.size} khối dựng · `
  + `${Object.values(NUM_RIENG).flat().length} núm riêng · ${Object.keys(BO_QUA).length} ca bỏ qua có lý do`);
console.log(hong === 0
  ? `\n✅ Schema khớp nhau.${xemLai ? ` (${xemLai} mục ghi nhận, không đánh rớt)` : ''}\n`
  : `\n❌ ${hong} mục lệch.\n`);
process.exit(hong === 0 ? 0 : 1);
