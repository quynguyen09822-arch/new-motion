#!/usr/bin/env node
/**
 * KIỂM ĐỔI MÀU NỀN — nền riêng từng cảnh và nền cả clip.
 *
 * VÌ SAO. Núm "Nền" của cả clip có từ lâu, nhưng chỉ hiện khi KHÔNG chọn gì —
 * anh Quý đang chọn một món thì không thấy nó đâu, và hỏi "thêm tính năng đổi màu
 * Background" (28/09). Nay mục "Màu nền" có ở mọi bảng, và đổi được nền riêng
 * từng cảnh bằng một tấm `panel` kín khung nằm dưới cùng (`web/nencanh.js`).
 *
 * Canh:
 *   ① hàm thuần: thêm / đổi / bỏ, và nền luôn nằm DƯỚI CÙNG.
 *   ② trình duyệt: đang chọn một MÓN vẫn thấy mục nền; đổi màu thì khung hình
 *      đổi thật (đọc màu vẽ ra, không đọc kịch bản); cảnh khác không bị lây;
 *      bấm chỗ trống không chọn trúng tấm nền; hoàn tác trả lại như cũ.
 *
 *   node tools/kiem-nen-canh.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* ---------- ① hàm thuần ---------- */
console.log('\n① Thêm, đổi, bỏ nền riêng của cảnh');
{
  const { datNenCanh, layNenCanh, NEN_CANH_ID } = await import(path.join(M, 'web', 'nencanh.js'));
  const canh = { id: 'c1', elements: [{ kind: 'text', id: 'a' }, { kind: 'card', id: 'b' }] };
  dat('cảnh chưa có nền riêng → null', layNenCanh(canh) === null);
  datNenCanh(canh, '#ffffff');
  dat('thêm vào ĐẦU danh sách (vẽ dưới cùng)', canh.elements[0].id === NEN_CANH_ID);
  dat('phủ kín khung, không bo góc', canh.elements[0].place === 'day' && canh.elements[0].radius === 0);
  dat('đọc lại đúng màu', layNenCanh(canh) === '#ffffff');
  datNenCanh(canh, '#000000');
  dat('đổi màu lần hai KHÔNG thêm tấm thứ hai',
    canh.elements.filter((e) => e.id === NEN_CANH_ID).length === 1 && layNenCanh(canh) === '#000000');
  /* Ai kéo tấm nền lên trên trong danh sách lớp thì nó che hết món khác. */
  canh.elements.push(canh.elements.shift());
  datNenCanh(canh, '#111111');
  dat('tấm nền bị kéo lên trên thì đổi màu xong nó về lại đáy', canh.elements[0].id === NEN_CANH_ID);
  datNenCanh(canh, null);
  dat('bỏ nền riêng → gỡ hẳn, món khác còn nguyên',
    layNenCanh(canh) === null && canh.elements.map((e) => e.id).join() === 'a,b');
  const rong = { id: 'c2' };
  datNenCanh(rong, '#123456');
  dat('cảnh không có `elements` vẫn đặt được', layNenCanh(rong) === '#123456');
}

/* ---------- ② trình duyệt ---------- */
console.log('\n② Đổi nền thật trên khung hình');
const trinh = await chromium.launch();
try {
  const tr = await trinh.newPage({ viewport: { width: 1500, height: 980 } });
  const loiJS = [];
  tr.on('pageerror', (e) => loiJS.push(String(e)));
  await tr.goto(`${GOC}/sua?clip=cta`, { waitUntil: 'load' });
  await tr.waitForTimeout(4500);

  /* Chọn một MÓN — đúng tình huống trong ảnh chụp của anh Quý. */
  await tr.evaluate(() => [...document.querySelectorAll('.lop-hang')]
    .find((h) => !h.textContent.includes('Nền'))?.click());
  await tr.waitForTimeout(500);

  const timO = (nhan) => tr.evaluate((n) => {
    const o = [...document.querySelectorAll('#bang-thuoc-tinh .num')]
      .find((x) => x.querySelector('.num-nhan')?.textContent.replace(/\?$/, '') === n);
    return o ? o.querySelector('.o-ma')?.value ?? '' : null;
  }, nhan);
  dat('đang chọn một món vẫn thấy ô "Nền cảnh này"', await timO('Nền cảnh này') !== null);
  dat('và ô "Nền cả clip"', await timO('Nền cả clip') !== null);

  /** Màu VẼ RA ở một điểm gần góc khung của cảnh đang xem. */
  const mauGoc = () => tr.evaluate(() => {
    const d = document.querySelector('#khung')?.contentDocument;
    const canh = d?.querySelector('.el.k-panel[data-el="nen-canh"]');
    const st = d?.getElementById('stage');
    return {
      tam: canh ? getComputedStyle(canh).backgroundColor : null,
      soTam: d ? d.querySelectorAll('.el[data-el="nen-canh"]').length : -1,
      stage: st ? getComputedStyle(st).backgroundColor : null,
    };
  });
  const truoc = await mauGoc();

  await tr.evaluate(() => {
    const o = [...document.querySelectorAll('#bang-thuoc-tinh .num')]
      .find((x) => x.querySelector('.num-nhan')?.textContent.startsWith('Nền cảnh này'));
    const ma = o.querySelector('.o-ma');
    ma.value = '#ffffff';
    ma.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await tr.waitForTimeout(1200);
  const sau = await mauGoc();
  dat('đổi nền cảnh → khung hình vẽ ra đúng màu trắng', sau.tam === 'rgb(255, 255, 255)',
    `${sau.tam}`);
  dat('chỉ đúng MỘT tấm nền được thêm (cảnh khác không lây)', sau.soTam === 1, `${sau.soTam} tấm`);
  dat('nền cả clip đứng yên', sau.stage === truoc.stage, `${truoc.stage} → ${sau.stage}`);
  dat('danh sách lớp có "Nền cảnh"',
    await tr.evaluate(() => [...document.querySelectorAll('.lop-hang')].some((h) => h.textContent.includes('Nền cảnh'))));
  dat('hiện nút "Bỏ nền riêng"',
    await tr.evaluate(() => [...document.querySelectorAll('#bang-thuoc-tinh button')]
      .some((b) => b.textContent.startsWith('Bỏ nền riêng'))));

  /* Bấm chỗ trống gần góc khung — chỗ chỉ có tấm nền. Chọn trúng nó thì bảng bên
     phải nhảy sang "Nền cảnh" mỗi lần người ta muốn bỏ chọn. */
  const hop = await tr.evaluate(() => {
    const r = document.getElementById('khung').getBoundingClientRect();
    return { x: r.left + 12, y: r.top + 12 };
  });
  await tr.mouse.click(hop.x, hop.y);
  await tr.waitForTimeout(500);
  dat('bấm chỗ trống KHÔNG chọn trúng tấm nền',
    !(await tr.evaluate(() => document.querySelector('#bang-thuoc-tinh .chi-duong')?.textContent || ''))
      .includes('Nền cảnh'));

  /* Nền cả clip đổi được từ bảng của cảnh — không phải bỏ chọn mới thấy. */
  await tr.evaluate(() => [...document.querySelectorAll('.lop-hang')]
    .find((h) => !h.textContent.includes('Nền'))?.click());
  await tr.waitForTimeout(400);
  await tr.evaluate(() => {
    const o = [...document.querySelectorAll('#bang-thuoc-tinh .num')]
      .find((x) => x.querySelector('.num-nhan')?.textContent.startsWith('Nền cả clip'));
    const ma = o.querySelector('.o-ma');
    ma.value = '#123456';
    ma.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await tr.waitForTimeout(1200);
  dat('đổi nền cả clip từ bảng của món → khung đổi màu',
    (await mauGoc()).stage === 'rgb(18, 52, 86)', (await mauGoc()).stage);

  /* Hoàn tác hết — vừa trả clip mẫu về nguyên trạng, vừa kiểm lối lui. */
  for (let i = 0; i < 6; i++) {
    await tr.evaluate(() => document.getElementById('nut-lui')?.click());
    await tr.waitForTimeout(250);
  }
  await tr.waitForTimeout(800);
  const cuoi = await mauGoc();
  dat('hoàn tác trả lại nền cũ và gỡ tấm nền', cuoi.soTam === 0 && cuoi.stage === truoc.stage,
    `${cuoi.soTam} tấm, ${cuoi.stage}`);

  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await tr.close();
} finally {
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Đổi màu nền đạt hết.\n');
process.exit(hong ? 1 : 0);
