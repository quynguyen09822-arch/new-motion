#!/usr/bin/env node
/**
 * KIỂM KHO THÀNH PHẦN — menu "Thêm thành phần".
 *
 * Lỗi đã vấp: bộ dựng vẽ được **25 loại**, menu chỉ bày **13**. Mười hai loại
 * còn lại có thật, chạy được, mà không có đường nào thêm vào — muốn dùng phải
 * sửa tay file JSON. Cùng một kiểu "năng lực bị giấu" mà `kiem-schema.mjs` sinh
 * ra để chặn, chỉ khác là lần này nằm ở menu chứ không nằm ở bảng thuộc tính.
 *
 * Và một món mới thả vào mà ra khung hình TRỐNG TRƠN thì người dùng tưởng bấm
 * hỏng. Nên mục 3 dựng thật từng món bằng đúng giá trị mặc định trong `MAU_MON`
 * rồi ĐO xem nó có vẽ ra cái gì không.
 *
 *   node tools/kiem-kho-mon.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const { BO_KIT, BO_MON, KIT, MAU_MON, themKit } = await import(new URL('../web/them.js', import.meta.url));
const { TEN_LOAI } = await import(new URL('../web/inspector/schema.js', import.meta.url));
const { hinhKit, hinhMon } = await import(new URL('../web/hinhmon.js', import.meta.url));

/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';

/**
 * Loại cố ý KHÔNG bày trong menu — phải kèm lý do, và phải kiểm rằng nó thật sự
 * vắng mặt: hết lý do mà quên bỏ khỏi đây thì danh sách này mục rữa.
 */
const KHONG_BAY = {
  pointer: 'cả clip chỉ có MỘT con trỏ, và nó cần một đường đi nhiều mốc — '
    + 'thêm bằng một cú bấm sẽ ra con trỏ đứng im giữa khung, vô nghĩa',
};

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* ---------- 1. phủ hết loại ---------- */
console.log('\n1. Menu bày đủ mọi loại bộ dựng vẽ được');
const menu = MAU_MON.map((m) => m.kind);
const moi = Object.keys(TEN_LOAI);
const thieu = moi.filter((k) => !menu.includes(k) && !KHONG_BAY[k]);
dat('không loại nào bị giấu khỏi menu', thieu.length === 0,
  thieu.join(', ') || `${menu.length}/${moi.length} loại`);
const thuaKhongBay = Object.keys(KHONG_BAY).filter((k) => menu.includes(k));
dat('danh sách "cố ý không bày" không mục rữa', thuaKhongBay.length === 0,
  thuaKhongBay.length ? `${thuaKhongBay.join(', ')} — đã bày rồi, xoá khỏi KHONG_BAY` : 'sạch');
const la = menu.filter((k) => !moi.includes(k));
dat('menu không bày loại bộ dựng không biết', la.length === 0, la.join(', ') || 'không có');
dat('không trùng loại', new Set(menu).size === menu.length);

/* ---------- 2. khai báo đủ ---------- */
console.log('\n2. Mỗi món khai đủ tên, bộ, và một dòng tả');
const boId = new Set(BO_MON.map((b) => b.id));
const saiBo = MAU_MON.filter((m) => !boId.has(m.bo));
dat('món nào cũng thuộc một bộ có thật', saiBo.length === 0,
  saiBo.map((m) => m.kind).join(', ') || `${BO_MON.length} bộ`);
const thieuMo = MAU_MON.filter((m) => !m.mo || !m.ten);
dat('món nào cũng có tên và dòng tả', thieuMo.length === 0,
  thieuMo.map((m) => m.kind).join(', ') || 'đủ cả');
const boTrong = BO_MON.filter((b) => !MAU_MON.some((m) => m.bo === b.id));
dat('không bộ nào rỗng', boTrong.length === 0, boTrong.map((b) => b.ten).join(', ') || 'đủ');

/* ---------- 3. thả vào là THẤY ĐƯỢC ---------- */
console.log('\n3. Mỗi món dựng bằng giá trị mặc định đều VẼ RA được');
const canh = {
  version: 2,
  meta: { name: 'thu kho', width: 1280, height: 720, density: 1, bg: '#ffffff', ink: '#111111' },
  scenes: [{
    id: 'c1', duration: 8, stagger: 0,
    elements: MAU_MON.map((m, i) => ({
      id: `m-${m.kind}`, kind: m.kind,
      x: 20 + (i % 6) * 200, y: 20 + Math.floor(i / 6) * 170, w: 170, h: 150,
      ...m.mau,
      in: { kind: 'none', dur: 0.001 },
    })),
  }],
};

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));
try {
  await trang.goto(`${GOC}/clip/scene-player.html?scene=cta`, { waitUntil: 'domcontentloaded' });
  await trang.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await trang.evaluate(() => window.__clip.ready());
  await trang.evaluate((c) => { window.__clip.load(c); window.__clip.seek(4); }, canh);
  await trang.waitForTimeout(700);

  const kq = await trang.evaluate((ds) => Object.fromEntries(ds.map((k) => {
    const n = document.querySelector(`.el[data-el="m-${k}"]`);
    if (!n) return [k, { co: false }];
    const cs = getComputedStyle(n);
    // "Vẽ ra được" = có chữ, có thẻ con, có nền, hoặc có viền. Món trong suốt
    // hoàn toàn mà không có con nào thì thả vào chỉ ra một khoảng trống.
    return [k, {
      co: true,
      chu: Boolean(n.textContent.trim()),
      // Đếm thẻ con CÓ VẼ RA CÁI GÌ. Một `<img>` chưa chọn file vẫn là một thẻ
      // con, nhưng nó hiện ra đúng khoảng trống — đếm nó là tự lừa mình.
      con: [...n.querySelectorAll('*')].filter((c) => {
        if (c.matches('img, video, source')) return Boolean(c.getAttribute('src'));
        return true;
      }).length,
      nen: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent',
      // Khung điện thoại vẽ bằng VIỀN, không có nền — bỏ sót viền là kêu oan nó.
      vien: parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0,
      anh: [...n.querySelectorAll('img, svg, video, canvas')]
        .filter((c) => c.tagName === 'svg' || c.tagName === 'CANVAS' || c.getAttribute('src')).length,
      rong: n.offsetWidth, cao: n.offsetHeight,
    }];
  })), MAU_MON.map((m) => m.kind));

  const khongDung = MAU_MON.map((m) => m.kind).filter((k) => !kq[k]?.co);
  dat('bộ dựng dựng được mọi món trong menu', khongDung.length === 0,
    khongDung.join(', ') || `${MAU_MON.length} món`);

  /*
   * Ba nhóm được phép rỗng, mỗi nhóm một lý do THẬT — không phải chỗ để nhét
   * cho hết đỏ:
   *   · image  — chưa chọn file thì đúng là một khoảng trống. Bảng thuộc tính
   *              bắt chọn ngay ở núm đầu tiên.
   *              (`video` KHÔNG nằm đây: mặc định của nó có lớp tối `dim`, nên
   *               chưa chọn file vẫn hiện ra một mảng tối — phép kiểm tự bắt
   *               được điều đó và bắt bỏ `video` khỏi danh sách này.)
   *   · group       — cụm rỗng đúng là rỗng; thêm cụm rồi mới bỏ món vào.
   *   · sweep       — vệt sáng là một cú loé, đứng ở một giây bất kỳ thì không
   *                   thấy gì là đúng bản chất của nó.
   */
  const choPhepRong = new Set(['image', 'group', 'sweep']);
  const trong = MAU_MON.map((m) => m.kind).filter((k) => {
    if (choPhepRong.has(k)) return false;
    const r = kq[k];
    return r?.co && !r.chu && !r.con && !r.nen && !r.anh && !r.vien;
  });
  dat('thả vào là THẤY ĐƯỢC ngay, không ra khoảng trống', trong.length === 0,
    trong.join(', ') || `${MAU_MON.length - choPhepRong.size} món đều hiện ra`);
  // Danh sách "được phép rỗng" cũng không được mục rữa.
  const hetRong = [...choPhepRong].filter((k) => {
    const r = kq[k];
    return r?.co && (r.chu || r.con || r.nen || r.anh || r.vien);
  });
  dat('danh sách "được phép rỗng" còn đúng', hetRong.length === 0,
    hetRong.length ? `${hetRong.join(', ')} — nay đã hiện ra, bỏ khỏi choPhepRong` : `${choPhepRong.size} món`);

  const beTeo = MAU_MON.map((m) => m.kind).filter((k) => kq[k]?.co && (kq[k].rong < 4 || kq[k].cao < 4));
  dat('không món nào dựng ra bé tí', beTeo.length === 0, beTeo.join(', ') || 'đều có kích thước thật');

  dat('không có lỗi JS khi dựng', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
}

/* ---------- 4. bộ dựng sẵn ---------- */
console.log('\n4. Bộ dựng sẵn — bấm một cái ra nguyên một cụm đã bày');
const boId2 = new Set(BO_KIT.map((b) => b.id));
dat('bộ nào cũng thuộc một nhóm có thật', KIT.every((k) => boId2.has(k.bo)),
  KIT.filter((k) => !boId2.has(k.bo)).map((k) => k.id).join(', ') || `${KIT.length} bộ`);
dat('bộ nào cũng có tên và dòng tả', KIT.every((k) => k.ten && k.mo));

/*
 * ID KHÔNG ĐƯỢC TRÙNG, kể cả khi thêm cùng một bộ HAI LẦN — chuyện rất thường.
 * Trùng id thì `validateScene` chặn không cho lưu, mà lỗi chỉ hiện ra tận lúc
 * bấm Lưu nên rất khó lần ngược.
 */
{
  const doc = { meta: { width: 1280, height: 720 }, scenes: [{ id: 'c1', duration: 6, elements: [] }] };
  for (let v = 0; v < 2; v++) for (const k of KIT) themKit(doc, 'c1', k.id);
  const ids = [];
  const di = (ds) => { for (const e of ds || []) { ids.push(e.id); di(e.children); } };
  di(doc.scenes[0].elements);
  dat('thêm cả kho hai lượt vẫn không trùng id', new Set(ids).size === ids.length,
    `${ids.length} món · trùng ${ids.length - new Set(ids).size}`);
  dat('món ngoài cùng của bộ đều khai `place`',
    doc.scenes[0].elements.every((e) => e.place),
    'nhờ vậy bộ tự xếp lại khi đổi khổ clip');
  const thieuXY = ids.length && (() => {
    let sai = 0;
    const d2 = (ds) => { for (const e of ds || []) { if (typeof e.x !== 'number' || typeof e.y !== 'number') sai++; d2(e.children); } };
    d2(doc.scenes[0].elements); return sai;
  })();
  dat('mọi món trong bộ đều có x/y là SỐ', thieuXY === 0,
    thieuXY ? `${thieuXY} món thiếu` : 'validateScene sẽ nhận');
}

/* ---------- 5. hình minh hoạ ---------- */
/*
 * Bảng chọn có 40 mục. Chỉ có tên thì phải ĐỌC từng dòng mới biết món nào là
 * món nào — mà người mở bảng ra là đang muốn LƯỚT. Nên mỗi mục phải có hình.
 *
 * Hình là SƠ ĐỒ vẽ tay bằng SVG, không phải ảnh chụp: món trong bảng chọn CHƯA
 * TỒN TẠI trong cảnh nên không có gì để chụp, và dựng thử 40 món mỗi lần mở
 * bảng thì giật cả giao diện.
 */
console.log('\n5. Mỗi mục trong bảng chọn đều có hình minh hoạ');
const khongHinh = MAU_MON.filter((m) => hinhMon(m.kind).includes('class="ch"'));
dat('mọi món lẻ đều có hình riêng', khongHinh.length === 0,
  khongHinh.map((m) => m.kind).join(', ') || `${MAU_MON.length} món`);

/* Bộ nào chưa vẽ riêng thì rơi về hình mặc định — chấp nhận được về mặt chạy,
   nhưng là "chưa vẽ", nên phải kêu lên chứ đừng im. */
const hinhMacDinh = hinhKit('__khong-co-that__');
const kitMacDinh = KIT.filter((k) => hinhKit(k.id) === hinhMacDinh);
dat('mọi bộ đều có hình riêng, không dùng hình mặc định', kitMacDinh.length === 0,
  kitMacDinh.map((k) => k.id).join(', ') || `${KIT.length} bộ`);

const trungHinh = (() => {
  const m = new Map();
  for (const x of MAU_MON) {
    const h = hinhMon(x.kind);
    m.set(h, [...(m.get(h) || []), x.kind]);
  }
  return [...m.values()].filter((v) => v.length > 1);
})();
dat('không hai món nào dùng chung một hình', trungHinh.length === 0,
  trungHinh.map((v) => v.join('=')).join(' · ') || 'mỗi món một hình');

console.log(hong === 0 ? '\n✅ Kho thành phần: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
