#!/usr/bin/env node
/**
 * KIỂM NÚM "ĐỆM TRONG" và "KHE HỞ BÊN TRONG".
 *
 * Lỗi đã vấp — lặng lẽ cả hai chiều:
 *
 *   1. NÚM CHẾT. Bảng thuộc tính bày "Đệm trong" cho cả 24 loại, mà bộ dựng chỉ
 *      đọc `pad` ở 8 loại. Mười sáu núm còn lại bấm vào thì số trong kịch bản có
 *      đổi, khung hình đứng im. Trông như đang chạy — kiểu hỏng tệ nhất.
 *   2. NĂNG LỰC BỊ GIẤU. `gap` chạy được ở 11 loại nhưng chỉ `group` được bày
 *      núm. Khe hở giữa các dòng trong một tấm thẻ là thứ có thật mà không ai
 *      chỉnh tới được.
 *   3. SỐ MẶC ĐỊNH NÓI DỐI. Núm luôn hiện bậc 0 khi kịch bản chưa khai, trong
 *      khi tấm thẻ thật đang đệm bậc 5. Bấm vào bậc 0 tưởng "giữ nguyên" thì
 *      thẻ co lại.
 *
 * Nên phép kiểm này ĐO THẬT bằng Chromium, không đọc code mà đoán: dựng một
 * cảnh có đủ 24 loại, vặn bậc 0 → 7 rồi đo lại `padding`/`gap` của từng nút.
 * Bộ dựng đổi hành vi là mục này rớt ngay.
 *
 * Không đụng vào clip nào — cảnh thử nạp thẳng bằng `__clip.load()`.
 *
 *   node tools/kiem-dem-khe.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { DEM_TRONG, KHE_HO, TEN_BAC } = await import(new URL('../web/inspector/schema.js', import.meta.url));

/* Địa chỉ máy chủ: biến môi trường THẮNG tham số. `npm run kiem` dựng một máy
   chủ riêng không mật khẩu ở cổng khác rồi truyền qua `MOTION_GOC` — truyền qua
   tham số thì đụng với những bài nhận tham số khác (kiem-canh nhận TÊN CLIP). */
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';
/* Thang bậc của bộ dựng. Giữ bản sao ở đây CÓ CHỦ Ý: lệch với bộ dựng thì mục
   "bậc mặc định khớp số đo thật" rớt, đúng thứ ta muốn biết. */
const STEP = [0, 4, 8, 12, 16, 24, 32, 48];
const LOAI = ['group', 'panel', 'text', 'card', 'form', 'calendar', 'chip', 'phone',
  'timeline', 'logo', 'video', 'image', 'wheel', 'chat', 'shield', 'upload', 'table',
  'browser', 'sweep', 'nen', 'quydao', 'nut', 'huyhieu', 'hangnhan'];

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const canhThu = (dat2) => ({
  version: 2,
  meta: { name: 'thu dem khe', width: 1280, height: 720, density: 1, bg: '#ffffff', ink: '#111111' },
  scenes: [{
    id: 'c1',
    duration: 6,
    elements: LOAI.map((k, i) => ({
      id: `m-${k}`, kind: k,
      x: 20 + (i % 6) * 200, y: 20 + Math.floor(i / 6) * 160, w: 180, h: 140,
      ...dat2,
      text: 'Chữ', title: 'Tiêu đề', label: 'Nhãn', name: 'Tên', rows: 2, button: 'Xong',
      fill: '#dddddd',
      children: [{ id: `${k}-con`, kind: 'text', x: 0, y: 0, w: 80, text: 'a' }],
      in: { kind: 'none', dur: 0.001 },
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

  const doNen = async (dat2, thuoc) => {
    await trang.evaluate((x) => { window.__clip.load(x); window.__clip.seek(3); }, canhThu(dat2));
    await trang.waitForTimeout(320);
    return trang.evaluate(([ds, t]) => Object.fromEntries(ds.map((k) => {
      const n = document.querySelector(`.el[data-el="m-${k}"]`);
      return [k, n ? getComputedStyle(n)[t] : null];
    })), [LOAI, thuoc]);
  };

  /* ---------- 1. loại nào THẬT SỰ nghe ---------- */
  console.log('\n1. Đo thật: loại nào nghe núm, loại nào điếc');
  const padA = await doNen({ pad: 0 }, 'padding');
  const padB = await doNen({ pad: 7 }, 'padding');
  const gapA = await doNen({ gap: 0 }, 'gap');
  const gapB = await doNen({ gap: 7 }, 'gap');
  const nghePad = LOAI.filter((k) => padA[k] !== padB[k]);
  const ngheGap = LOAI.filter((k) => gapA[k] !== gapB[k]);
  dat('có loại nghe đệm trong', nghePad.length > 0, `${nghePad.length}/${LOAI.length}`);
  dat('có loại nghe khe hở', ngheGap.length > 0, `${ngheGap.length}/${LOAI.length}`);

  /* ---------- 2. bảng trong schema khớp phép đo ---------- */
  console.log('\n2. Bảng trong schema.js khớp đúng phép đo — không núm chết, không năng lực bị giấu');
  const thieuPad = nghePad.filter((k) => DEM_TRONG[k] == null);
  const thuaPad = Object.keys(DEM_TRONG).filter((k) => !nghePad.includes(k));
  dat('DEM_TRONG không GIẤU loại nào nghe được', thieuPad.length === 0,
    thieuPad.join(', ') || `đủ ${nghePad.length} loại`);
  dat('DEM_TRONG không bày NÚM CHẾT', thuaPad.length === 0,
    thuaPad.join(', ') || 'không loại điếc nào lọt vào');

  const thieuGap = ngheGap.filter((k) => KHE_HO[k] == null);
  const thuaGap = Object.keys(KHE_HO).filter((k) => !ngheGap.includes(k));
  dat('KHE_HO không GIẤU loại nào nghe được', thieuGap.length === 0,
    thieuGap.join(', ') || `đủ ${ngheGap.length} loại`);
  dat('KHE_HO không bày NÚM CHẾT', thuaGap.length === 0,
    thuaGap.join(', ') || 'không loại điếc nào lọt vào');

  /* ---------- 3. bậc mặc định phải ĐÚNG ---------- */
  console.log('\n3. Bậc mặc định trong schema khớp số đo thật của bộ dựng');
  const khongKhai = await doNen({}, 'padding');
  const khongKhaiG = await doNen({}, 'gap');
  const px = (v) => Number.parseFloat(String(v)) || 0;
  const saiPad = nghePad.filter((k) => px(khongKhai[k]) !== STEP[DEM_TRONG[k] ?? 0]);
  dat('bậc mặc định của ĐỆM TRONG khớp', saiPad.length === 0,
    saiPad.map((k) => `${k}: đo ${khongKhai[k]} nhưng bảng ghi bậc ${DEM_TRONG[k]} = ${STEP[DEM_TRONG[k]]}px`).join(' · ')
      || nghePad.map((k) => `${k}=${TEN_BAC[DEM_TRONG[k]]}`).join(', '));
  const saiGap = ngheGap.filter((k) => px(khongKhaiG[k]) !== STEP[KHE_HO[k] ?? 0]);
  dat('bậc mặc định của KHE HỞ khớp', saiGap.length === 0,
    saiGap.map((k) => `${k}: đo ${khongKhaiG[k]} nhưng bảng ghi bậc ${KHE_HO[k]} = ${STEP[KHE_HO[k]]}px`).join(' · ')
      || `đủ ${ngheGap.length} loại`);

  /* ---------- 4. bảng thuộc tính bày đúng núm ---------- */
  console.log('\n4. Bảng thuộc tính bày đúng núm, và vặn thì khung hình đổi thật');
  await trang.goto(`${GOC}/sua`, { waitUntil: 'domcontentloaded' });
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.selectOption('#chon-clip', 'kich-ban-thu');
  await trang.waitForSelector('#app[data-trang-thai="san-sang"]', { timeout: 40000 });
  await trang.waitForTimeout(900);
  await trang.evaluate(() => [...document.querySelectorAll('#ds-canh li')][2]?.click());
  await trang.waitForTimeout(600);

  for (const [mon, loai] of [['card-3-0', 'card'], ['chip-3-1', 'chip'], ['nhom-hinh-3', 'group']]) {
    const co = await trang.evaluate((id) => {
      const h = [...document.querySelectorAll('.lop-hang')].find((x) => x.dataset.mon === id);
      if (!h) return false; h.click(); return true;
    }, mon);
    if (!co) { dat(`tìm thấy "${mon}" trong danh sách`, false); continue; }
    await trang.waitForTimeout(450);

    const bay = await trang.evaluate(() => {
      const ten = (n) => n.querySelector('.num-nhan, .cong-tac span')?.textContent?.replace(/\s*\?$/, '').trim();
      return [...document.querySelectorAll('#bang-thuoc-tinh .num')].map(ten).filter(Boolean);
    });
    dat(`${loai}: có núm Đệm trong`, bay.some((x) => /Đệm trong/.test(x)) === (DEM_TRONG[loai] != null));
    dat(`${loai}: có núm khe hở`, bay.some((x) => /Khe hở|Khoảng cách giữa/.test(x)) === (KHE_HO[loai] != null));

    for (const [nhan, thuoc] of [[/Đệm trong/, 'padding'], [/Khe hở|Khoảng cách giữa/, 'gap']]) {
      const truoc = await trang.evaluate(([id, t]) => {
        const n = document.getElementById('khung').contentWindow.document.querySelector(`.el[data-el="${id}"]`);
        return n ? getComputedStyle(n)[t] : null;
      }, [mon, thuoc]);
      const bam = await trang.evaluate((re) => {
        const num = [...document.querySelectorAll('#bang-thuoc-tinh .num')]
          .find((n) => new RegExp(re).test(n.textContent));
        const o = num && [...num.querySelectorAll('.nac-o')];
        if (!o?.length) return false;
        o[7].click(); return true;
      }, nhan.source);
      if (!bam) continue;
      await trang.waitForTimeout(600);
      const sau = await trang.evaluate(([id, t]) => {
        const n = document.getElementById('khung').contentWindow.document.querySelector(`.el[data-el="${id}"]`);
        return n ? getComputedStyle(n)[t] : null;
      }, [mon, thuoc]);
      dat(`${loai}: vặn ${thuoc === 'padding' ? 'đệm trong' : 'khe hở'} thì khung hình đổi thật`,
        truoc !== sau, `${truoc} → ${sau}`);
    }
    // trả về như cũ, khỏi lưu nhầm
    await trang.evaluate(() => document.getElementById('nut-lui')?.click());
    await trang.evaluate(() => document.getElementById('nut-lui')?.click());
    await trang.waitForTimeout(250);
  }

  console.log('\n5. Lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await trang.screenshot({ path: path.join(M, '.kiem', 'dem-khe.png'), scale: 'css' });
} finally {
  await trinh.close();
  /*
   * Mục 4 có vặn núm trên clip THẬT `kich-ban-thu` rồi hoàn tác lại. Hoàn tác
   * trả kịch bản về đúng cũ, nhưng kho vẫn kịp ghi một bản nháp — mà nháp thì
   * lần sau mở clip sẽ bị HỎI "có bản đang sửa dở". Bài kiểm không được để lại
   * câu hỏi cho người dùng, nên dọn luôn. Clip thật không hề bị ghi đè: cả bài
   * không gọi Lưu lần nào.
   */
  rmSync(path.join(M, '.drafts', 'kich-ban-thu.json'), { force: true });
}

console.log(hong === 0 ? '\n✅ Đệm trong / khe hở: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
