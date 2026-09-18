#!/usr/bin/env node
/**
 * KIỂM HIỆU ỨNG HÌNH — nhoè, nét dần, bóng đổ, đẩy máy chậm.
 *
 * Bốn núm này nằm ở HAI repo: núm và câu chữ ở đây, còn phần vẽ nằm trong
 * `scene-player.html` của dự án chung — file KHÔNG có git. Nguy cơ thật là ai đó
 * khôi phục file ấy từ một bản sao lưu cũ; lúc đó núm vẫn còn, kịch bản vẫn ghi
 * số, mà khung hình không còn hiệu ứng nào. Hỏng lặng lẽ, không báo gì.
 *
 * Nên phép kiểm này soi CẢ HAI đầu:
 *   · đọc thẳng `scene-player.html` xem ba thang bậc còn đó và dài đúng bằng
 *     tên bậc khai trong `schema.js`;
 *   · dựng cảnh thật rồi ĐO `filter` và `transform` qua Chromium.
 *
 * Và một điều nữa phải giữ: mọi hiệu ứng là HÀM THUẦN CỦA `t`. Nhảy tới cùng
 * một giây bằng hai đường khác nhau phải ra đúng một kết quả — không thì bộ xuất
 * video bước theo khung sẽ ra mỗi lần một khác.
 *
 *   node tools/kiem-hieu-ung.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { BAC_BONG, BAC_DAY, BAC_NHOE, KHO_VAO, NUM_HIEU_UNG } =
  await import(new URL('../web/inspector/schema.js', import.meta.url));

/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
const LOAI = ['group', 'panel', 'text', 'card', 'form', 'calendar', 'chip', 'phone',
  'timeline', 'logo', 'video', 'image', 'wheel', 'chat', 'shield', 'upload', 'table',
  'browser', 'sweep', 'nen', 'quydao', 'nut', 'huyhieu', 'hangnhan'];

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* ---------- 1. bộ dựng còn giữ phần vá không ---------- */
console.log('\n1. `scene-player.html` còn giữ phần vẽ hiệu ứng');
const bo = readFileSync(path.join(PROJ, 'scene-player.html'), 'utf8');
/* Đếm phần tử của một mảng hằng trong bộ dựng. KHÔNG tách bằng dấu phẩy: thang
   bóng đổ toàn chuỗi `rgba(0,0,0,.2)`, tách kiểu đó ra 21 thay vì 6. Mảng chuỗi
   thì đếm chuỗi, mảng số thì đếm số. */
const thang = (ten) => {
  const m = new RegExp(`const ${ten} = \\[([\\s\\S]*?)\\];`).exec(bo);
  if (!m) return -1;
  const than = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const chuoi = than.match(/'[^']*'/g);
  if (chuoi) return chuoi.length;
  return than.split(',').filter((x) => x.trim() !== '').length;
};
dat('có hàm `locHinh`', bo.includes('function locHinh('));
dat('có nhân `day` vào phép phóng', /scale\(\$\{\(sc \* fit \* dap \* day\)/.test(bo));
dat('thang nhoè dài đúng bằng tên bậc', thang('MO') === BAC_NHOE.length,
  `bộ dựng ${thang('MO')} · schema ${BAC_NHOE.length}`);
dat('thang bóng đổ dài đúng bằng tên bậc', thang('BONG') === BAC_BONG.length,
  `bộ dựng ${thang('BONG')} · schema ${BAC_BONG.length}`);
dat('thang đẩy máy dài đúng bằng tên bậc', thang('DAY') === BAC_DAY.length,
  `bộ dựng ${thang('DAY')} · schema ${BAC_DAY.length}`);
dat('có kiểu vào "nen" (thu lại từ lớn)', /\bnen:\s*\(\)\s*=>/.test(bo));
dat('kho chuyển động vào có mục dùng kiểu đó',
  KHO_VAO.some((k) => k.m.kind === 'nen'), KHO_VAO.find((k) => k.m.kind === 'nen')?.ten || '—');

/* ---------- dựng cảnh thử ---------- */
const canhThu = (dat2, loai = LOAI) => ({
  version: 2,
  meta: { name: 'thu hieu ung', width: 1280, height: 720, density: 1, bg: '#ffffff', ink: '#111111' },
  scenes: [{
    id: 'c1', duration: 6, stagger: 0,
    elements: loai.map((k, i) => ({
      id: `m-${k}`, kind: k,
      x: 20 + (i % 6) * 200, y: 20 + Math.floor(i / 6) * 160, w: 180, h: 140,
      text: 'Chữ', title: 'Tiêu đề', label: 'Nhãn', name: 'Tên', rows: 2, button: 'Xong',
      fill: '#888888', in: { kind: 'none', dur: 0.001 },
      // `...dat2` phải nằm CUỐI: để trước thì cái `in` mặc định ngay dưới đè mất
      // chuyển động vào mà phép kiểm vừa khai, và mục "nét dần" đo phải số 0.
      ...dat2,
    })),
  }],
});

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

try {
  await trang.goto(`${GOC}/clip/scene-player.html?scene=cta`, { waitUntil: 'domcontentloaded' });
  await trang.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await trang.evaluate(() => window.__clip.ready());

  const do_ = async (dat2, giay, loai) => {
    await trang.evaluate(([c, g]) => { window.__clip.load(c); window.__clip.seek(g); },
      [canhThu(dat2, loai), giay]);
    await trang.waitForTimeout(300);
    return trang.evaluate((ds) => Object.fromEntries(ds.map((k) => {
      const n = document.querySelector(`.el[data-el="m-${k}"]`);
      if (!n) return [k, null];
      const cs = getComputedStyle(n);
      const m = /matrix\(([\d.\-]+)/.exec(cs.transform);
      return [k, { loc: cs.filter, sc: m ? Number(m[1]) : null }];
    })), loai);
  };

  /* ---------- 2. mọi loại đều nhận ---------- */
  console.log('\n2. Hiệu ứng áp được cho MỌI loại phần tử');
  const nhoe = await do_({ soft: 3 }, 3, LOAI);
  const thieuNhoe = LOAI.filter((k) => !/blur\(/.test(nhoe[k]?.loc || ''));
  dat('cả 24 loại đều nhoè được', thieuNhoe.length === 0, thieuNhoe.join(', ') || `${LOAI.length}/${LOAI.length}`);

  const bong = await do_({ shadow: 4 }, 3, LOAI);
  const thieuBong = LOAI.filter((k) => !/drop-shadow/.test(bong[k]?.loc || ''));
  dat('cả 24 loại đều đổ bóng được', thieuBong.length === 0, thieuBong.join(', ') || `${LOAI.length}/${LOAI.length}`);

  /* ---------- 3. nét dần khi vào ---------- */
  console.log('\n3. Nét dần khi vào — nhoè lúc mới vào, hết nhoè khi vào xong');
  const mot = ['panel'];
  const dau = await do_({ softIn: 5, in: { kind: 'fade', dur: 2 } }, 0.05, mot);
  const cuoi = await do_({ softIn: 5, in: { kind: 'fade', dur: 2 } }, 5.5, mot);
  const px = (s) => Number.parseFloat((/blur\(([\d.]+)px\)/.exec(s || '') || [])[1]) || 0;
  dat('mới vào thì nhoè rõ', px(dau.panel?.loc) > 5, `${px(dau.panel?.loc).toFixed(1)}px`);
  dat('vào xong thì hết nhoè', px(cuoi.panel?.loc) < 0.2, `${px(cuoi.panel?.loc).toFixed(2)}px`);

  /* ---------- 4. đẩy máy chậm ---------- */
  console.log('\n4. Đẩy máy chậm — phóng dần suốt cảnh, đổi chiều được');
  const vaoA = await do_({ push: 4 }, 0.1, mot);
  const vaoB = await do_({ push: 4 }, 5.8, mot);
  dat('đẩy vào: càng về cuối càng lớn', vaoB.panel.sc > vaoA.panel.sc + 0.05,
    `${vaoA.panel.sc.toFixed(3)} → ${vaoB.panel.sc.toFixed(3)}`);
  const raA = await do_({ push: 4, pushOut: true }, 0.1, mot);
  const raB = await do_({ push: 4, pushOut: true }, 5.8, mot);
  dat('đẩy ra: càng về cuối càng nhỏ', raB.panel.sc < raA.panel.sc - 0.05,
    `${raA.panel.sc.toFixed(3)} → ${raB.panel.sc.toFixed(3)}`);
  dat('không đẩy thì không phóng thêm',
    Math.abs((await do_({}, 3, mot)).panel.sc - 1) < 0.001);

  /* ---------- 5. hàm thuần của t ---------- */
  console.log('\n5. Hiệu ứng là hàm THUẦN của t — bước theo khung mới dùng được');
  const d2 = { soft: 2, softIn: 4, shadow: 3, push: 3, in: { kind: 'fade', dur: 1.5 } };
  await trang.evaluate((c) => window.__clip.load(c), canhThu(d2, mot));
  const tai = async (duong) => {
    for (const g of duong) { await trang.evaluate((x) => window.__clip.seek(x), g); await trang.waitForTimeout(60); }
    await trang.waitForTimeout(220);
    return trang.evaluate(() => {
      const n = document.querySelector('.el[data-el="m-panel"]');
      const cs = getComputedStyle(n);
      return cs.filter + ' | ' + cs.transform;
    });
  };
  const xuoi = await tai([0, 0.5, 1, 1.5, 2]);
  const nguoc = await tai([5.9, 4, 2]);
  dat('tới giây 2 bằng hai đường khác nhau ra y hệt', xuoi === nguoc,
    xuoi === nguoc ? xuoi.slice(0, 58) : `${xuoi.slice(0, 40)}\n        ≠ ${nguoc.slice(0, 40)}`);

  /* ---------- 6. bảng thuộc tính ---------- */
  console.log('\n6. Bảng thuộc tính bày đủ núm, và vặn thì khung hình đổi thật');
  await trang.goto(GOC, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.selectOption('#chon-clip', 'cta');
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.waitForTimeout(1100);
  await trang.evaluate(() =>
    [...document.querySelectorAll('.lop-hang')].find((x) => /Huy hiệu/.test(x.textContent))?.click());
  await trang.waitForTimeout(600);

  const bay = await trang.evaluate(() => [...document.querySelectorAll('#bang-thuoc-tinh .num')]
    .map((n) => n.querySelector('.num-nhan, .cong-tac span')?.textContent?.replace(/\s*\?$/, '').trim())
    .filter(Boolean));
  const thieuNum = NUM_HIEU_UNG.filter((n) => !bay.includes(n.nhan));
  dat('có đủ 5 núm hiệu ứng', thieuNum.length === 0, thieuNum.map((n) => n.nhan).join(', ') || bay.slice(-5).join(' | '));

  const doHuy = () => trang.evaluate(() => {
    const n = document.getElementById('khung').contentWindow.document
      .querySelector('.el[data-el="huyhieu-1-0"]');
    const cs = getComputedStyle(n);
    return cs.filter + ' | ' + cs.transform;
  });
  for (const [nhan, bac] of [['Làm nhoè', 3], ['Bóng đổ', 4], ['Đẩy máy chậm', 4]]) {
    const truoc = await doHuy();
    const bam = await trang.evaluate(([re, i]) => {
      const n = [...document.querySelectorAll('#bang-thuoc-tinh .num')].find((x) => x.textContent.includes(re));
      const o = n && [...n.querySelectorAll('.nac-o')];
      if (!o?.length) return false; o[i].click(); return true;
    }, [nhan, bac]);
    await trang.waitForTimeout(650);
    const sau = await doHuy();
    dat(`vặn "${nhan}" thì khung hình đổi thật`, bam && truoc !== sau);
  }
  // trả clip về nguyên trạng — bài kiểm không được để lại dấu vết
  for (let i = 0; i < 4; i++) {
    await trang.evaluate(() => document.getElementById('nut-lui')?.click());
    await trang.waitForTimeout(120);
  }

  console.log('\n7. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
  const { rmSync } = await import('node:fs');
  rmSync(path.join(M, '.drafts', 'cta.json'), { force: true });
}

console.log(hong === 0 ? '\n✅ Hiệu ứng hình: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
