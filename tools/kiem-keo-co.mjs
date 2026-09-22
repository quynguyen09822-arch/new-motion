#!/usr/bin/env node
/**
 * KIỂM KÉO CO GIÃN — tám tay nắm ở mép khung chọn.
 *
 * HAI TẦNG, cố ý:
 *
 *   ① Hàm thuần `coMoi()` — tám tay nắm nhân giữ-tỉ-lệ nhân có-dịch-được là
 *      mười sáu lối đi. Dò tay từng lối trên trình duyệt thì vừa lâu vừa sót,
 *      mà đây lại đúng là chỗ dễ sai dấu nhất (kéo mép trái phải làm `x` LÙI,
 *      không phải tiến).
 *
 *   ② Trình duyệt — chứng minh mấy con số ấy thật sự đi được từ cú chuột vào
 *      kịch bản. Tầng ① xanh mà dây nối đứt thì người dùng vẫn không kéo được
 *      gì.
 *
 * ĐIỀU CANH GẮT NHẤT: món dùng VÙNG ĐẶT SẴN không được có tay nắm. `place()`
 * của bộ dựng tính bề rộng bằng `calc(100% - …)`; ghi một con số cứng đè lên là
 * món thôi co theo khung, và khổ 16:9 với 9:16 lại lệch nhau — đúng cái vừa mất
 * công sửa xong.
 *
 *   node tools/kiem-keo-co.mjs [http://127.0.0.1:7803]
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
console.log('\n① Phép tính cỡ mới — tám tay nắm');
{
  const { coMoi } = await import(path.join(M, 'web', 'keoco.js'));
  const dau = { x: 100, y: 50, w: 200, h: 100 };
  const T = (nam, dx, dy, o) => coMoi(nam, dau, { dx, dy }, o);
  const la = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  dat('góc dưới-phải: to ra, neo đứng yên',
    la(T('dp', 40, 20), { x: 100, y: 50, w: 240, h: 120 }), JSON.stringify(T('dp', 40, 20)));
  dat('góc trên-trái: nhỏ lại VÀ dời neo theo',
    la(T('tt', 40, 20), { x: 140, y: 70, w: 160, h: 80 }), JSON.stringify(T('tt', 40, 20)));
  /* Dấu ở đây là chỗ dễ sai nhất: kéo mép trái SANG TRÁI (dx âm) thì món RỘNG
     ra và `x` LÙI lại. Làm ngược dấu thì món co vào trong lúc tay đang kéo ra. */
  dat('kéo mép trái sang trái: rộng thêm, `x` lùi',
    la(T('gt', -30, 0), { x: 70, y: 50, w: 230, h: 100 }), JSON.stringify(T('gt', -30, 0)));
  dat('kéo mép trên lên: cao thêm, `y` lùi',
    la(T('tg', 0, -25), { x: 100, y: 25, w: 200, h: 125 }), JSON.stringify(T('tg', 0, -25)));

  dat('giữ Shift ở GÓC thì giữ đúng tỉ lệ 2:1',
    la(T('dp', 100, 0, { tiLe: true }), { x: 100, y: 50, w: 300, h: 150 }));
  /* Ở cạnh, người ta đang cố ý đổi đúng một chiều — kéo theo chiều kia là làm
     trái điều họ vừa làm. */
  dat('giữ Shift ở CẠNH thì KHÔNG áp tỉ lệ',
    T('gp', 100, 0, { tiLe: true }).h === 100);

  dat('món trong cụm: đổi cỡ nhưng `x`/`y` đứng yên (flex giữ chỗ)',
    la(T('tt', 40, 20, { dichDuoc: false }), { x: 100, y: 50, w: 160, h: 80 }));

  dat('kéo quá tay thì dừng ở cỡ tối thiểu, không âm',
    T('dp', -9999, -9999).w === 8 && T('dp', -9999, -9999).h === 8);
  /* Chạm đáy rồi mà `x` vẫn tính từ `dx` thì món trôi tiếp ra ngoài màn hình
     trong khi cỡ đã đứng yên. Phải tính từ `w` ĐÃ CHỐT. */
  const day = T('tt', 9999, 9999);
  dat('chạm cỡ tối thiểu thì neo cũng dừng, không trôi tiếp',
    day.x === 292 && day.y === 142, JSON.stringify(day));
}

/* ---------- ② trình duyệt ---------- */
console.log('\n② Kéo thật trên khung hình');
const trinh = await chromium.launch();
try {
  const tr = await trinh.newPage({ viewport: { width: 1500, height: 980 } });
  const loiJS = [];
  tr.on('pageerror', (e) => loiJS.push(String(e)));
  await tr.goto(`${GOC}/sua?clip=cta`, { waitUntil: 'load' });
  await tr.waitForTimeout(4500);

  /** Chọn hàng thứ `i` trong danh sách lớp, trả về kiểu chỗ đặt của nó. */
  const chonHang = async (i) => {
    await tr.evaluate((n) => document.querySelectorAll('.lop-hang')[n]?.click(), i);
    await tr.waitForTimeout(500);
    return tr.evaluate(() => document.querySelector('.khung-chon')?.dataset.kieu);
  };

  /** Đếm tay nắm ĐANG NHÌN THẤY (CSS giấu bớt tuỳ kiểu và tuỳ cỡ hộp). */
  const demNam = () => tr.evaluate(() => [...document.querySelectorAll('.khung-nam')]
    .filter((n) => getComputedStyle(n).display !== 'none').length);

  /** Tìm hàng đầu tiên có kiểu chỗ đặt mong muốn. */
  const timKieu = async (muon) => {
    const n = await tr.evaluate(() => document.querySelectorAll('.lop-hang').length);
    for (let i = 0; i < n; i++) if (await chonHang(i) === muon) return i;
    return -1;
  };

  let iTu = await timKieu('tu');
  if (iTu < 0) {
    /* Clip mẫu không có sẵn món tự đặt chỗ nào. Bấm đúng nút "Tự đặt" ở bảng
       bên phải để dựng một món như thế — vừa có cái để thử, vừa đi qua đúng
       con đường người dùng thật đi khi họ muốn kéo cỡ một món. */
    const iDatTruoc = await timKieu('dat');
    if (iDatTruoc >= 0) {
      await tr.evaluate(() => [...document.querySelectorAll('#bang-thuoc-tinh .doan-o')]
        .find((b) => b.textContent === 'Tự đặt')?.click());
      await tr.waitForTimeout(700);
      if (await tr.evaluate(() => document.querySelector('.khung-chon')?.dataset.kieu) === 'tu') {
        iTu = iDatTruoc;
      }
    }
  }
  dat('có một món TỰ ĐẶT CHỖ để thử', iTu >= 0, `hàng ${iTu}`);

  if (iTu >= 0) {
    dat('món tự đặt chỗ có đủ tám tay nắm', await demNam() === 8, `${await demNam()} cái`);

    /* Đọc ô "Rộng" ở bảng bên phải chứ không đọc bề rộng trên màn hình: ô đó
       lấy thẳng từ `el.w` trong kịch bản, nên nó xanh nghĩa là con số đã đi
       trọn đường từ cú chuột vào dữ liệu — chứ không phải chỉ nằm trên style
       tạm của node. */
    const oRong = () => tr.evaluate(() => {
      const o = [...document.querySelectorAll('#bang-thuoc-tinh .num')]
        .find((n) => n.querySelector('.num-nhan')?.textContent === 'Rộng');
      return o?.querySelector('input')?.value ?? null;
    });
    const truoc = await oRong();

    const hop = await tr.evaluate(() => {
      const r = document.querySelector('.khung-nam[data-nam="dp"]').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await tr.mouse.move(hop.x, hop.y);
    await tr.mouse.down();
    await tr.mouse.move(hop.x + 60, hop.y + 30, { steps: 8 });
    await tr.mouse.up();
    await tr.waitForTimeout(700);

    const sau = await oRong();
    dat('kéo góc dưới-phải thì ô "Rộng" trong kịch bản tăng theo',
      sau !== null && truoc !== sau && Number(sau) > Number(truoc || 0),
      `${truoc ?? '(tự)'} → ${sau}`);

    /* Cú thả sau khi kéo KHÔNG được biến thành một cú chọn món khác — nếu thành
       thì bảng bên phải nhảy sang món khác ngay lúc người ta vừa chỉnh xong. */
    dat('kéo xong vẫn đang chọn đúng món đó',
      await tr.evaluate(() => document.querySelector('.khung-chon')?.dataset.kieu) === 'tu');

    dat('hoàn tác một nhịp là trả lại cỡ cũ',
      await tr.evaluate(async () => {
        document.getElementById('nut-lui')?.click();
        await new Promise((r) => setTimeout(r, 500));
        const o = [...document.querySelectorAll('#bang-thuoc-tinh .num')]
          .find((n) => n.querySelector('.num-nhan')?.textContent === 'Rộng');
        return o?.querySelector('input')?.value ?? null;
      }) === truoc, `về lại ${truoc ?? '(tự)'}`);
  }

  const iDat = await timKieu('dat');
  if (iDat >= 0) {
    dat('món dùng VÙNG ĐẶT SẴN thì không có tay nắm nào', await demNam() === 0,
      `${await demNam()} cái`);
  } else {
    console.log('  — clip này không có món nào dùng vùng đặt sẵn, bỏ qua.');
  }

  const iCon = await timKieu('con');
  if (iCon >= 0) {
    dat('món nằm trong cụm VẪN kéo cỡ được', await demNam() === 8, `${await demNam()} cái`);
  } else {
    console.log('  — clip này không có món nào nằm trong cụm, bỏ qua.');
  }

  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
  await tr.close();
} finally {
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Kéo co giãn đạt hết.\n');
process.exit(hong ? 1 : 0);
