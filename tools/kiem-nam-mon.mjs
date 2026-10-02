#!/usr/bin/env node
/**
 * KIỂM "NẮM BẮT MÓN" — bấm có trúng món không, và cầm có chắc không.
 *
 * LỜI THAN SINH RA BÀI NÀY: "nên có một tính năng nắm giữ nhân vật đàng hoàng,
 * nhiều lúc tôi cũng không chọn trúng cái nhân vật đó được."
 *
 * NGUYÊN NHÂN. Xưởng chọn món bằng cách hỏi trình duyệt "thẻ nào nằm dưới ngón
 * tay". Chính xác khi trúng — nhưng con linh vật là 60 MẢNH RỜI, giữa chúng là
 * khe hở, và bấm vào khe là trúng nền nên cả xưởng quay máy thay vì chọn. Thu
 * nhỏ cảnh thì khe chiếm tỉ lệ càng lớn, càng khó bấm.
 *
 * VÌ SAO PHẢI KIỂM BẰNG TRÌNH DUYỆT THẬT. Chỗ hỏng nằm đúng giữa phép toán và
 * cách trình duyệt dựng hình: toán tính khung đúng mà hình dựng lệch, hoặc
 * ngược lại, thì vẫn trượt. Mục ① đo thẳng: tìm một điểm mà trình duyệt KHÔNG
 * thấy thẻ nào, rồi bấm chuột THẬT vào đó.
 *
 * NĂM ĐIỀU BÀI NÀY GIỮ:
 *   ① Bấm vào KHE giữa hai mảnh vẫn chọn trúng món.
 *   ② Bấm ra nền trống thì vẫn là XOAY MÁY — khung bắt không được ăn cả cảnh.
 *   ③ Chọn xong thì THẤY mình đang cầm gì (khung + núm hiện đúng chỗ).
 *   ④ Núm nắm kéo được, và kéo đúng hướng.
 *   ⑤ Chuột phải LUÔN xoay máy, kể cả khi đang trỏ vào giữa vật — cảnh kín vật
 *     thì đây là đường thoát duy nhất.
 *
 *   node tools/kiem-nam-mon.mjs [http://127.0.0.1:7803]
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
const trang = await trinh.newPage({ viewport: { width: 1320, height: 900 } });
const loi = [];
trang.on('pageerror', (e) => loi.push(e.message));
try {
  await trang.goto(GOC + '/ba-chieu/', { waitUntil: 'domcontentloaded' });
  await trang.waitForFunction(() => window.__bachieu, null, { timeout: 20000 });

  /* Một con linh vật giữa cảnh, thu vừa khung. Đây đúng là ca người dùng gặp. */
  await trang.evaluate(() => {
    const B = window.__bachieu;
    B.canh.mon.length = 0;
    B.them('nhan-vat');
    B.vuaKhung();
  });
  await trang.waitForTimeout(120);

  const id = await trang.evaluate(() => window.__bachieu.chonId);

  console.log('① Bấm vào KHE giữa hai mảnh vẫn chọn trúng');
  {
    /* Tìm một điểm NẰM TRONG khung món mà trình duyệt lại không thấy thẻ nào —
       đó chính là cái khe. Không tìm thấy khe nào thì bài này vô nghĩa, nên
       phải báo chứ đừng lặng lẽ cho qua. */
    const cho = await trang.evaluate(() => {
      const B = window.__bachieu;
      const san = document.getElementById('san').getBoundingClientRect();
      const n = document.getElementById('num-nam').getBoundingClientRect();
      const k = document.getElementById('khung-nam').getBoundingClientRect();
      const ds = [];
      for (let i = 0; i <= 26; i++) for (let j = 0; j <= 26; j++) {
        const x = k.left + (k.width * i) / 26, y = k.top + (k.height * j) / 26;
        if (x < san.left + 2 || x > san.right - 2 || y < san.top + 2 || y > san.bottom - 2) continue;
        /* Tránh chính cái núm — nó vốn luôn bấm trúng, không chứng minh gì. */
        if (x > n.left - 6 && x < n.right + 6 && y > n.top - 6 && y < n.bottom + 6) continue;
        const e = document.elementFromPoint(x, y);
        if (!e || e.closest('[data-mon]')) continue;
        ds.push([x, y]);
      }
      return { ds, tong: 27 * 27 };
    });
    dat('có khe thật để mà thử', cho.ds.length > 0,
      `${cho.ds.length}/${cho.tong} điểm trong khung rơi vào khe`);

    let trung = 0;
    for (const [x, y] of cho.ds.slice(0, 8)) {
      await trang.evaluate(() => { window.__bachieu.chon(null); });
      await trang.mouse.move(x, y);
      await trang.mouse.down(); await trang.mouse.up();
      if (await trang.evaluate(() => window.__bachieu.chonId) === id) trung++;
    }
    const thu = Math.min(8, cho.ds.length);
    dat('bấm vào khe là chọn được món', thu > 0 && trung === thu, `${trung}/${thu} lần`);
  }

  console.log('\n② Bấm ra nền trống thì vẫn XOAY MÁY, không tóm nhầm');
  {
    const truoc = await trang.evaluate(() => ({ ...window.__bachieu.canh.may }));
    /* Góc trên bên trái khung nhìn — xa món, chắc chắn là nền. */
    const san = await trang.evaluate(() => {
      const r = document.getElementById('san').getBoundingClientRect();
      return { x: r.left + 26, y: r.top + 26 };
    });
    const laNen = await trang.evaluate(([x, y]) =>
      !document.elementFromPoint(x, y)?.closest('[data-mon]'), [san.x, san.y]);
    dat('chỗ thử đúng là nền', laNen);
    const viTruoc = await trang.evaluate((i) =>
      ({ ...window.__bachieu.canh.mon.find((m) => m.id === i).vi }), id);
    await trang.mouse.move(san.x, san.y);
    await trang.mouse.down();
    await trang.mouse.move(san.x + 90, san.y + 10, { steps: 6 });
    await trang.mouse.up();
    const sau = await trang.evaluate(() => ({ ...window.__bachieu.canh.may }));
    dat('kéo nền thì máy quay xoay', Math.abs(sau.ngang - truoc.ngang) > 10,
      `ngang ${truoc.ngang.toFixed(0)}° → ${sau.ngang.toFixed(0)}°`);
    const vi = await trang.evaluate((i) =>
      ({ ...window.__bachieu.canh.mon.find((m) => m.id === i).vi }), id);
    dat('và món KHÔNG bị dời theo',
      vi.x === viTruoc.x && vi.y === viTruoc.y && vi.z === viTruoc.z,
      `${JSON.stringify(viTruoc)} → ${JSON.stringify(vi)}`);
  }

  console.log('\n③ Chọn xong thì thấy mình đang cầm gì');
  {
    await trang.evaluate((i) => window.__bachieu.chon(i), id);
    const r = await trang.evaluate(() => {
      const B = window.__bachieu;
      const nam = document.getElementById('nam');
      const k = document.getElementById('khung-nam').getBoundingClientRect();
      const n = document.getElementById('num-nam').getBoundingClientRect();
      const mat = [...document.querySelectorAll('[data-mon] .bc-mat, [data-mon] .bc-cau')];
      let tr = 1e9, pha = -1e9, tren = 1e9, duoi = -1e9;
      for (const e of mat) { const b = e.getBoundingClientRect();
        tr = Math.min(tr, b.left); pha = Math.max(pha, b.right);
        tren = Math.min(tren, b.top); duoi = Math.max(duoi, b.bottom); }
      return { an: nam.hidden, k: { tr: k.left, pha: k.right, tren: k.top, duoi: k.bottom },
        n: { x: (n.left + n.right) / 2, y: (n.top + n.bottom) / 2 },
        hinh: { tr, pha, tren, duoi }, soMat: mat.length };
    });
    dat('khung chọn hiện ra', !r.an);
    /* So TÂM VỚI TÂM, không chỉ hỏi "khung có bao trùm hình không".
       Bản đầu của bài này chỉ hỏi bao trùm, với dung sai 10% cỡ món — mà linh
       vật rộng 450px nên 10% là 45px, đủ cho một khung LỆCH HẲN 40px vẫn lọt.
       Đã thử đột biến đúng kiểu đó và bài kiểm im lặng cho qua. */
    const tamK = [(r.k.tr + r.k.pha) / 2, (r.k.tren + r.k.duoi) / 2];
    const tamH = [(r.hinh.tr + r.hinh.pha) / 2, (r.hinh.tren + r.hinh.duoi) / 2];
    const lech = Math.max(Math.abs(tamK[0] - tamH[0]), Math.abs(tamK[1] - tamH[1]));
    dat('tâm khung trùng tâm hình', lech <= 16, `lệch ${lech.toFixed(1)}px`);
    const coK = [r.k.pha - r.k.tr, r.k.duoi - r.k.tren];
    const coH = [r.hinh.pha - r.hinh.tr, r.hinh.duoi - r.hinh.tren];
    const ti = Math.max(coK[0] / coH[0], coK[1] / coH[1], coH[0] / coK[0], coH[1] / coK[1]);
    dat('khung đúng cỡ với hình', ti <= 1.2,
      `khung ${coK.map((n) => n.toFixed(0)).join('×')} · hình ${coH.map((n) => n.toFixed(0)).join('×')}`);
    dat('núm nằm TRONG khung',
      r.n.x > r.k.tr && r.n.x < r.k.pha && r.n.y > r.k.tren && r.n.y < r.k.duoi);
  }

  console.log('\n④ Núm nắm kéo được và kéo đúng hướng');
  {
    await trang.evaluate(() => { const B = window.__bachieu;
      B.canh.may.ngang = 0; B.canh.may.doc = 28; B.lamLai(); });
    const truoc = await trang.evaluate((i) => ({ ...window.__bachieu.canh.mon.find((m) => m.id === i).vi }), id);
    const n = await trang.evaluate(() => {
      const b = document.getElementById('num-nam').getBoundingClientRect();
      return { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 };
    });
    await trang.mouse.move(n.x, n.y);
    await trang.mouse.down();
    await trang.mouse.move(n.x + 140, n.y, { steps: 8 });
    await trang.mouse.up();
    const sau = await trang.evaluate((i) => ({ ...window.__bachieu.canh.mon.find((m) => m.id === i).vi }), id);
    dat('kéo núm sang phải thì món đi sang phải', sau.x - truoc.x > 60,
      `x ${truoc.x} → ${sau.x}`);
    dat('và không bị nhấc bổng lên', Math.abs(sau.y - truoc.y) < 2, `y ${truoc.y} → ${sau.y}`);

    /* Giữ Shift thì NÂNG HẠ chứ không trườn trên sàn. */
    const t2 = await trang.evaluate((i) => ({ ...window.__bachieu.canh.mon.find((m) => m.id === i).vi }), id);
    const n2 = await trang.evaluate(() => {
      const b = document.getElementById('num-nam').getBoundingClientRect();
      return { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 };
    });
    await trang.keyboard.down('Shift');
    await trang.mouse.move(n2.x, n2.y);
    await trang.mouse.down();
    await trang.mouse.move(n2.x, n2.y - 100, { steps: 8 });
    await trang.mouse.up();
    await trang.keyboard.up('Shift');
    const s2 = await trang.evaluate((i) => ({ ...window.__bachieu.canh.mon.find((m) => m.id === i).vi }), id);
    dat('giữ Shift kéo lên thì món bay lên', s2.y - t2.y > 40, `y ${t2.y} → ${s2.y}`);
  }

  console.log('\n⑤ Chuột phải LUÔN xoay máy, kể cả khi trỏ vào giữa vật');
  {
    await trang.evaluate(() => { window.__bachieu.vuaKhung(); });
    await trang.waitForTimeout(80);
    const truoc = await trang.evaluate(() => ({ ...window.__bachieu.canh.may }));
    const viTruoc = await trang.evaluate((i) => ({ ...window.__bachieu.canh.mon.find((m) => m.id === i).vi }), id);
    const n = await trang.evaluate(() => {
      const b = document.getElementById('num-nam').getBoundingClientRect();
      return { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 };
    });
    await trang.mouse.move(n.x, n.y);
    await trang.mouse.down({ button: 'right' });
    await trang.mouse.move(n.x + 100, n.y, { steps: 6 });
    await trang.mouse.up({ button: 'right' });
    const sau = await trang.evaluate(() => ({ ...window.__bachieu.canh.may }));
    const viSau = await trang.evaluate((i) => ({ ...window.__bachieu.canh.mon.find((m) => m.id === i).vi }), id);
    dat('chuột phải trên vật vẫn xoay máy', Math.abs(sau.ngang - truoc.ngang) > 10,
      `ngang ${truoc.ngang.toFixed(0)}° → ${sau.ngang.toFixed(0)}°`);
    dat('và KHÔNG dời vật', viSau.x === viTruoc.x && viSau.z === viTruoc.z);
  }

  console.log('\n⑥ Hai món chồng nhau thì tóm món ĐỨNG TRƯỚC');
  {
    /* Vì sao phải có mục này: bản đầu của phép tìm món lấy MÓN GẦN MÁY NHẤT,
       nhưng cả bài kiểm chỉ có đúng một món nên đổi thành "lấy món đầu danh
       sách" vẫn xanh hết. Đã thử đột biến đúng vậy và không bắt được.
       Dựng hẳn hai món chồng khít nhau, chỉ khác chiều sâu. */
    const ds = await trang.evaluate(() => {
      const B = window.__bachieu;
      B.canh.mon.length = 0;
      B.them('nhan-vat'); B.them('nhan-vat');
      const [a, b] = B.canh.mon;
      a.ten = 'Đằng sau'; b.ten = 'Đằng trước';
      a.vi = { x: 0, y: a.vi.y, z: -400 };
      b.vi = { x: 0, y: b.vi.y, z: 400 };
      /* Nhìn thẳng mặt, không ngả: lúc ấy "z lớn hơn là gần máy hơn" đúng
         hiển nhiên, không phải tin vào phép toán nào cả. */
      Object.assign(B.canh.may, { ngang: 0, doc: 0, ti: 0.5, tamX: 0, tamY: 0 });
      B.lamLai();
      return [a.id, b.id];
    });
    await trang.waitForTimeout(80);

    const diem = await trang.evaluate(() => {
      const san = document.getElementById('san').getBoundingClientRect();
      const cx = san.left + san.width / 2, cy = san.top + san.height / 2;
      for (let r = 10; r < 150; r += 7) for (let g = 0; g < 360; g += 23) {
        const x = cx + r * Math.cos((g * Math.PI) / 180);
        const y = cy + r * Math.sin((g * Math.PI) / 180);
        if (x < san.left + 2 || x > san.right - 2 || y < san.top + 2 || y > san.bottom - 2) continue;
        const e = document.elementFromPoint(x, y);
        if (e && !e.closest('[data-mon]') && !e.closest('#nam')) return { x, y };
      }
      return null;
    });
    dat('tìm được chỗ chồng nhau mà hụt thẻ', !!diem);
    if (diem) {
      await trang.evaluate(() => window.__bachieu.chon(null));
      await trang.mouse.move(diem.x, diem.y);
      await trang.mouse.down(); await trang.mouse.up();
      const c1 = await trang.evaluate(() => window.__bachieu.chonId);
      dat('tóm món đứng trước (z lớn hơn)', c1 === ds[1],
        c1 === ds[0] ? 'tóm nhầm món bị che' : c1 ? 'đúng' : 'không tóm được gì');

      /* Quay máy 180°: món vừa bị che giờ ra đứng trước. Không đổi kết quả thì
         phép tìm đang bỏ qua chiều sâu. */
      await trang.evaluate(() => { window.__bachieu.canh.may.ngang = 180; window.__bachieu.lamLai(); });
      await trang.waitForTimeout(80);
      await trang.evaluate(() => window.__bachieu.chon(null));
      await trang.mouse.move(diem.x, diem.y);
      await trang.mouse.down(); await trang.mouse.up();
      const c2 = await trang.evaluate(() => window.__bachieu.chonId);
      dat('quay 180° thì tóm món kia', c2 === ds[0],
        c2 === ds[1] ? 'vẫn tóm món cũ — đang bỏ qua chiều sâu' : 'đúng');
    }
  }

  dat('không có lỗi JS nào trên trang', loi.length === 0, loi[0] || '');
} finally {
  await trinh.close();
}
console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Nắm bắt món đạt hết.\n');
process.exit(hong ? 1 : 0);
