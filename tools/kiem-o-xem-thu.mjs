#!/usr/bin/env node
/**
 * KIỂM Ô XEM THỬ — ba mốc nghiệm thu trong `BANG-CHINH-V2.md`, cộng bốn chỗ
 * dễ hỏng ngầm.
 *
 * Ba phép mạnh nhất:
 *
 *  ② Ô xem thử phải diễn bằng CHÍNH bộ dựng thật. Kiểm bằng cách hỏi vào trong
 *    iframe xem có `window.__clip` không, chứ không kiểm bằng cách tìm chuỗi
 *    'scene-player' trong mã — mã trỏ đúng mà trang không lên thì vẫn hỏng.
 *
 *  ③ Hai gói khác nhau phải cho hai quỹ đạo khác nhau. Không có phép này thì
 *    một ô đứng im cũng "đạt": nó vẫn là bộ dựng thật, vẫn nạp đúng cảnh, chỉ
 *    là chẳng diễn gì.
 *
 *  ⑦ Lệch pha. Đây là điều Quý chốt thay cho "bỏ lặp": mười ô cùng nhúc nhích
 *    một nhịp thì rối, nên chúng phải vào lệch nhau. Đo thời điểm từng ô bắt
 *    đầu, không đọc mã mà tin.
 *
 *   node tools/kiem-o-xem-thu.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const { KHO_VAO } = await import(new URL('../web/inspector/schema.js', import.meta.url));
const { buocLech } = await import(new URL('../web/inspector/o-xem-thu.js', import.meta.url));

const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 900 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

/* ① Cảnh mẫu dùng ĐÚNG gói trong kho */
console.log('\n① Cảnh mẫu sinh ra đúng');
const canh = async (q) => (await trang.request.get(`${GOC}/api/canh-mau?${q}`)).json();
await trang.goto(GOC, { waitUntil: 'load' });

const c1 = await canh('mau=the&vao=truot-len');
const goi = KHO_VAO.find((g) => g.id === 'truot-len');
dat('lấy đúng gói trong KHO_VAO',
  JSON.stringify(c1.scenes[0].elements[0].in) === JSON.stringify(goi.m),
  JSON.stringify(c1.scenes[0].elements[0].in));
dat('chữ mẫu cố định, KHÔNG phải tên gói',
  c1.scenes[0].elements[0].text === 'Mắt Bão', c1.scenes[0].elements[0].text);

const c2 = await canh('mau=khung&push=3');
dat('mẫu khung có nhiều món (đẩy máy mới thấy được)',
  c2.scenes[0].elements.length >= 3, `${c2.scenes[0].elements.length} món`);
dat('có đẩy máy thì cảnh dài hơn', c2.scenes[0].duration > c1.scenes[0].duration,
  `${c2.scenes[0].duration}s so với ${c1.scenes[0].duration}s`);

const c3 = await canh('mau=the&vao=khong-co-that&soft=999&linhtinh=1');
dat('gói bịa thì bỏ qua, không nhét vào cảnh', !c3.scenes[0].elements[0].in);
dat('số ngoài thang bị kẹp lại', c3.scenes[0].elements[0].soft === 5,
  `soft=${c3.scenes[0].elements[0].soft}`);
dat('tham số lạ không lọt vào kịch bản',
  !('linhtinh' in c3.scenes[0].elements[0]));

/* Dựng một dải ô thật trong trang */
const dungDai = (ds, chung = {}) => trang.evaluate(async ([ds, chung]) => {
  document.querySelector('#thu-xem')?.remove();
  const m = await import('/inspector/o-xem-thu.js');
  const hop = document.createElement('div');
  hop.id = 'thu-xem';
  hop.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#111;overflow:auto;padding:8px';
  document.body.append(hop);
  window.__thu = m.taoDaiXemThu(ds, chung);
  for (const o of window.__thu) {
    o.phanTu.style.cssText = 'display:inline-block;width:220px;height:124px;margin:4px;background:#000';
    hop.append(o.phanTu);
  }
  return window.__thu.length;
}, [ds, chung]);

const doTrong = (i, js) => trang.evaluate(([i, js]) => {
  const f = window.__thu[i].phanTu.querySelector('iframe');
  // eslint-disable-next-line no-new-func
  return f?.contentWindow ? new Function('w', 'd', js)(f.contentWindow, f.contentDocument) : null;
}, [i, js]);

/* ② Diễn bằng bộ dựng thật */
console.log('\n② Diễn bằng chính bộ dựng thật');
await dungDai([{ vao: 'truot-len', nhan: 'Trượt lên nhẹ' }]);
await trang.waitForTimeout(2500);
dat('ô nạp đúng scene-player, không phải trang khác',
  /scene-player\.html/.test(await trang.evaluate(
    () => window.__thu[0].phanTu.querySelector('iframe')?.src || '')));
dat('bên trong iframe có bộ dựng thật (window.__clip)',
  (await doTrong(0, 'return Boolean(w.__clip)')) === true);

/* ③ Có chuyển động thật, và hai gói cho hai quỹ đạo khác nhau */
console.log('\n③ Diễn đúng chuyển động, không phải ảnh đứng');
/* Đo trên nút MÓN (`#stage .el`), không đo trên `#cam`.
   `#cam` là khung máy quay bọc ngoài: `textContent` của nó cũng ra "Mắt Bão"
   nên tìm theo chữ là trúng nó, mà nó thì đứng yên và không mang `filter` —
   phép kiểm sẽ báo "không có chuyển động" dù ô đang chạy đúng. Em đã dính. */
const bam = async (i) => doTrong(i, `
  const e = d.querySelector('#stage .el');
  const s = e ? getComputedStyle(e) : null;
  return s ? s.transform + '|' + s.opacity : null;`);

await dungDai([{ vao: 'truot-len' }, { vao: 'vao-tu-trai' }], { lech: 0 });
await trang.waitForTimeout(900);
/* Lấy mẫu qua TRỌN MỘT VÒNG diễn. Cảnh dài 1.6s + nghỉ 0.25s, mà chuyển động
   vào chỉ chiếm 0.55s đầu — cửa sổ ngắn rơi trúng đoạn món đã đứng yên thì đếm
   ra "1 trạng thái" và phép kiểm báo oan là ô không chạy. Em đã báo oan một lần
   đúng như vậy. */
const mau = [];
for (let k = 0; k < 30; k++) { mau.push([await bam(0), await bam(1)]); await trang.waitForTimeout(80); }
const doi0 = new Set(mau.map((x) => x[0])).size;
const doi1 = new Set(mau.map((x) => x[1])).size;
dat('ô có chuyển động thật (khung hình đổi theo thời gian)', doi0 > 1, `${doi0} trạng thái khác nhau`);
dat('hai gói khác nhau cho hai quỹ đạo khác nhau',
  mau.some(([a, b]) => a && b && a !== b));
void doi1;

/* ④ Mười ô cùng lúc không giật */
console.log('\n④ Mười ô cùng lúc');
const so = await dungDai(KHO_VAO.slice(0, 10).map((g) => ({ vao: g.id, nhan: g.ten })));
dat('dựng đủ 10 ô', so === 10, `${so} ô`);
await trang.waitForTimeout(2500);
const nhip = await trang.evaluate(() => new Promise((xong) => {
  let d = 0; const t0 = performance.now();
  const v = () => { d++; if (performance.now() - t0 < 3000) requestAnimationFrame(v); else xong(d / 3); };
  requestAnimationFrame(v);
}));
dat('trang cha vẫn mượt (≥30 nhịp/giây)', nhip >= 30, `${nhip.toFixed(1)} nhịp/giây`);

/* ⑤ Đổi giá trị thì ô đổi theo trong nửa giây */
console.log('\n⑤ Đổi giá trị thì ô đổi theo');
await dungDai([{ vao: 'hien-dan', hieuUng: { soft: 0 } }]);
await trang.waitForTimeout(2200);
/* Đo bằng thứ bộ dựng ĐANG GIỮ, không đo bằng `iframe.src`: đổi giá trị thì ô
   nạp thẳng kịch bản mới vào bộ dựng đang sống, src giữ nguyên. Bám vào src là
   phép kiểm sẽ xanh cả khi chẳng có gì đổi. */
const mucNhoe = () => doTrong(0, `
  const e = d.querySelector('#stage .el');
  return e ? getComputedStyle(e).filter : null;`);
const nhoeTruoc = await mucNhoe();
const t0 = Date.now();
await trang.evaluate(() => window.__thu[0].dat({ hieuUng: { soft: 5 } }));
await trang.waitForFunction(() => {
  const f = window.__thu[0].phanTu.querySelector('iframe');
  const e = f?.contentDocument?.querySelector('#stage .el');
  return Boolean(e) && /blur\(/.test(getComputedStyle(e).filter || '');
}, null, { timeout: 3000 });
const mat = Date.now() - t0;
dat('ô đổi theo trong khoảng nửa giây', mat <= 500, `${mat}ms`);
const nhoeSau = await mucNhoe();
dat('mức nhoè thật sự đổi trên khung hình', nhoeTruoc !== nhoeSau,
  `${nhoeTruoc || 'không'} → ${nhoeSau || 'không'}`);

/* ⑥ Ra khỏi tầm nhìn thì dừng; huỷ thì gỡ sạch */
console.log('\n⑥ Dừng khi khuất, gỡ sạch khi huỷ');
await dungDai([{ vao: 'truot-len' }]);
await trang.waitForTimeout(2200);
dat('đang thấy thì có iframe',
  (await trang.evaluate(() => Boolean(window.__thu[0].phanTu.querySelector('iframe')))) === true);
await trang.evaluate(() => {
  const o = window.__thu[0].phanTu;
  o.parentElement.style.height = '200px';
  o.style.marginTop = '2400px';               // đẩy ra ngoài tầm nhìn
  o.parentElement.scrollTop = 0;
});
await trang.waitForTimeout(900);
dat('khuất thì bộ dựng đứng lại',
  (await doTrong(0, 'return w.__clip ? w.__clip.paused === true : null')) !== false);
await trang.evaluate(() => window.__thu[0].huy());
await trang.waitForTimeout(200);
dat('huỷ thì gỡ hẳn khỏi trang',
  (await trang.evaluate(() => document.querySelectorAll('#thu-xem iframe').length)) === 0);

/* ⑦ Lệch pha */
console.log('\n⑦ Lệch pha — dải chuyển động, không phải nhịp giật đồng loạt');
await dungDai(KHO_VAO.slice(0, 6).map((g) => ({ vao: g.id })));
await trang.waitForTimeout(3000);
const bd = await trang.evaluate(() => window.__thu.map((_, i) => {
  const f = window.__thu[i].phanTu.querySelector('iframe');
  return f?.contentWindow?.__clip ? Number(f.contentWindow.__clip.at().toFixed(2)) : null;
}));
const co = bd.filter((x) => x != null).sort((a, b) => a - b);
/* Ngưỡng 0.6s nằm giữa hai số ĐO ĐƯỢC, không đặt bừa: sáu ô có rải thì trải
   rộng 1.27 giây, bỏ rải thì chỉ 0.16 giây (lệch còn lại là do nạp xong không
   cùng lúc). Chỉ hỏi "các ô có khác nhau không" thì phép kiểm xanh cả khi đã bỏ
   hẳn lệch pha — em đã thử phá và nó không bắt được. */
const trai = co.length ? co[co.length - 1] - co[0] : 0;
dat('các ô trải ra cả vòng diễn, không dồn một chỗ', trai >= 0.6,
  `trải rộng ${trai.toFixed(2)}s · giây: ${co.join(', ')}`);

/* Và kiểm thẳng phép tính, vì phép đo lúc chạy còn nhiễu. */
const l6 = buocLech(6, 1.8);
dat('phép rải cho 6 mốc khác nhau, đều tay, gọn trong một vòng',
  new Set(l6).size === 6 && Math.abs(l6[1] - l6[0] - 0.3) < 1e-9 && l6[5] < 1.8,
  l6.map((x) => x.toFixed(2)).join(', '));
dat('một ô thì không lệch gì', JSON.stringify(buocLech(1)) === '[0]');

dat('không có lỗi JavaScript nào', loiJS.length === 0, loiJS[0] || 'sạch');

await trinh.close();
console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Ô xem thử đạt hết.\n');
process.exit(hong ? 1 : 0);
