#!/usr/bin/env node
/**
 * KIỂM BỘ CHỮ TỰ CHỨA.
 *
 * Câu hỏi thật: **rút mạng thì chữ có còn đúng mặt không**, nhất là trên trang
 * mà bộ xuất đem đi quay phim. Nên không kiểm bằng cách tìm chuỗi trong mã —
 * phải CHẶN THẬT mọi đường ra Internet trong Chromium rồi đo phông đã tải.
 *
 * Ba phép mạnh nhất:
 *
 *  ② `document.fonts.check` sau khi CHẶN mạng — hỏi đúng thứ trình duyệt thật
 *    sự dùng để vẽ, chứ `getComputedStyle` chỉ trả lại cái CSS đã khai. Khai
 *    "Be Vietnam Pro" mà file hỏng thì computed vẫn đẹp, còn chữ thì rơi về
 *    phông hệ thống — đúng kiểu hỏng im lặng mà cả việc này sinh ra để diệt.
 *
 *  ③ Dấu tiếng Việt: vẽ cùng một ký tự bằng `"Be Vietnam Pro", monospace` rồi
 *    bằng `monospace`. Khác bề rộng = glyph lấy từ Be Vietnam Pro; TRÙNG bề
 *    rộng = Be Vietnam Pro không có ký tự đó nên rơi xuống monospace.
 *    Cách đầu của em — so với ô vuông `.notdef` — sai: "Đ" rộng 50.0px mà ô
 *    vuông 49.8px, trùng nhau tình cờ nên phép kiểm đỏ oan. Phải so với thứ
 *    mình ĐIỀU KHIỂN được thì mới kết luận được.
 *
 *  ⑤ So mặt chữ trên MÀN HÌNH với mặt chữ lúc XUẤT (`?export=1`). Đây là cặp
 *    duy nhất người dùng nhìn thấy lệch: xem thì đúng, video giao khách thì sai.
 *
 *   node tools/kiem-chu.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');

const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });

/* CHẶN THẬT: mọi request ra ngoài máy chủ đang kiểm đều bị huỷ. Giống hệt cảnh
   máy chủ không có Internet — và mạnh hơn `offline: true` vì vẫn cho gọi máy
   chủ nội bộ, nên đo được đúng phần "tự chứa". */
const raNgoai = [];
await trang.route('**/*', (tuyen) => {
  const u = tuyen.request().url();
  if (u.startsWith(GOC) || u.startsWith('data:') || u.startsWith('blob:')) return tuyen.continue();
  raNgoai.push(u);
  return tuyen.abort();
});

/* `document.fonts.check` MỘT MÌNH thì không đủ: trang không khai @font-face nào
   vẫn trả `true` (không có phông nào cần tải thì coi như xong). Em đã dính đúng
   bẫy này — gỡ thẻ nạp khỏi `scene-player.html` mà phép kiểm vẫn xanh. Nên đo
   thêm bằng tay: cùng một chữ, vẽ bằng `"Be Vietnam Pro", monospace` rồi bằng
   `monospace`; trùng bề rộng nghĩa là phông không có thật. */
const doPhong = () => trang.evaluate(async () => {
  await document.fonts.ready;
  const than = getComputedStyle(document.body).fontFamily;
  const nap = [...document.fonts].filter((f) => f.status === 'loaded')
    .map((f) => `${f.family} ${f.weight}`);
  const o = document.createElement('span');
  o.style.cssText = 'position:fixed;left:-9999px;font-size:64px;white-space:pre';
  o.textContent = 'Mắt Bão dựng clip';
  document.body.append(o);
  const rong = (ho) => { o.style.fontFamily = ho; return o.getBoundingClientRect().width; };
  const bvp = rong('"Be Vietnam Pro", monospace');
  const phao = rong('monospace');
  o.remove();
  return { than, co: Math.abs(bvp - phao) > 0.5, bvp, phao, soNap: nap.length, nap: nap.slice(0, 3) };
});

/* ① Giao diện trình sửa */
console.log('\n① Giao diện trình sửa, mạng đã bị chặn');
await trang.goto(GOC, { waitUntil: 'networkidle' });
let p = await doPhong();
dat('CSS khai Be Vietnam Pro', /Be Vietnam Pro/.test(p.than), p.than.slice(0, 48));
dat('phông THẬT SỰ được dùng để vẽ (không rơi phông hệ thống)', p.co === true,
  `${p.bvp.toFixed(1)}px vs phao ${p.phao.toFixed(1)}px`);
dat('có nét chữ đã nạp', p.soNap > 0, `${p.soNap} nét — ${p.nap.join(', ')}`);

/* ② Bộ dựng cảnh — trang mà bộ xuất đem đi quay */
console.log('\n② Bộ dựng cảnh (trang dùng để xuất video)');
await trang.goto(`${GOC}/clip/scene-player.html?scene=cta`, { waitUntil: 'networkidle' });
p = await doPhong();
dat('CSS khai Be Vietnam Pro đứng đầu', /^["']?Be Vietnam Pro/.test(p.than), p.than.slice(0, 48));
dat('phông THẬT SỰ được dùng để vẽ', p.co === true,
  `${p.bvp.toFixed(1)}px vs phao ${p.phao.toFixed(1)}px`);
dat('có nét chữ đã nạp trên chính trang này', p.soNap > 0, `${p.soNap} nét`);

/* ③ Dấu tiếng Việt: đo bề rộng, không phải nhìn thấy chữ */
console.log('\n③ Dấu tiếng Việt lấy đúng từ Be Vietnam Pro');
const dau = await trang.evaluate(async () => {
  await document.fonts.ready;
  const o = document.createElement('span');
  o.style.cssText = 'position:fixed;left:-9999px;font-size:64px;white-space:pre';
  document.body.append(o);
  const rong = (t, ho) => { o.style.fontFamily = ho; o.textContent = t; return o.getBoundingClientRect().width; };
  const so = (c) => ({ bvp: rong(c, '"Be Vietnam Pro", monospace'), phao: rong(c, 'monospace') });
  const kq = Object.fromEntries(['a', 'ầ', 'ữ', 'ợ', 'ẳ', 'Đ', 'ă'].map((c) => [c, so(c)]));
  o.remove();
  return kq;
});
for (const [c, w] of Object.entries(dau)) {
  const tu = Math.abs(w.bvp - w.phao) > 0.5;      // khác monospace = glyph của Be Vietnam Pro
  dat(`"${c}" lấy glyph từ Be Vietnam Pro`, tu,
    `${w.bvp.toFixed(1)}px vs phao ${w.phao.toFixed(1)}px` + (tu ? '' : ' → RƠI xuống phao'));
}

/* ④ Không một request nào ra ngoài */
console.log('\n④ Không gọi ra ngoài máy chủ');
dat('không có request nào bị chặn', raNgoai.length === 0,
  raNgoai.length ? raNgoai.slice(0, 2).join(' · ') : 'sạch');

/* ⑤ Mặt chữ lúc XEM và lúc XUẤT phải khớp */
console.log('\n⑤ Mặt chữ lúc xem và lúc xuất khớp nhau');
const doChu = async (url) => {
  await trang.goto(url, { waitUntil: 'networkidle' });
  return trang.evaluate(async () => {
    await document.fonts.ready;
    const o = document.createElement('span');
    o.style.cssText = 'position:fixed;left:-9999px;font-size:64px;white-space:pre';
    o.style.fontFamily = getComputedStyle(document.body).fontFamily;
    o.textContent = 'Mắt Bão — dựng clip ầ ữ ợ ẳ';
    document.body.append(o);
    const r = o.getBoundingClientRect().width;
    o.remove();
    return r;
  });
};
const wXem = await doChu(`${GOC}/clip/scene-player.html?scene=cta`);
const wXuat = await doChu(`${GOC}/clip/scene-player.html?scene=cta&export=1`);
dat('bề rộng cùng một câu khớp nhau', Math.abs(wXem - wXuat) < 0.5,
  `xem ${wXem.toFixed(1)}px · xuất ${wXuat.toFixed(1)}px`);

/* ⑥ Clip đời cũ cũng tự chứa */
console.log('\n⑥ Clip đời cũ');
await trang.goto(`${GOC}/clip/vibe-hosting-animatic-90s.html`, { waitUntil: 'networkidle' });
const cu = await doPhong();
dat('phông được dùng để vẽ khi mạng bị chặn', cu.co === true,
  `${cu.bvp.toFixed(1)}px vs phao ${cu.phao.toFixed(1)}px, ${cu.soNap} nét đã nạp`);

await trinh.close();
console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Bộ chữ tự chứa đạt hết.\n');
process.exit(hong ? 1 : 0);
