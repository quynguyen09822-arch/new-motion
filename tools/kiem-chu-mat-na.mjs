#!/usr/bin/env node
/**
 * KIỂM LÁT 1 — đường cong tốc độ tuỳ ý, hoà trộn, mặt nạ, chữ chạy từng ký tự.
 *
 * Bốn thứ này nằm ở HAI repo: câu chữ và núm ở đây, phần vẽ nằm trong
 * `scene-player.html` của dự án chung — file KHÔNG có git. Nên không kiểm bằng
 * cách tìm chuỗi trong mã: phải DỰNG CẢNH THẬT rồi đo bằng Chromium, để nếu ai
 * đó khôi phục bộ dựng từ bản sao lưu cũ thì phép kiểm gãy ngay.
 *
 * Phép đo mạnh nhất ở đây là mục 1c: đường cong bốn số [0,0,1,1] phải cho ra
 * ĐÚNG cùng kết quả với tên `linear` có sẵn. Hai đường đi qua hai nhánh mã khác
 * hẳn nhau, khớp nhau tới từng phần trăm pixel thì mới là bộ giải Bézier đúng —
 * chứ không phải "có gọi hàm là được".
 *
 *   node tools/kiem-chu-mat-na.mjs [http://127.0.0.1:7803]
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const { chromium } = createRequire(path.join(PROJ, 'tools/'))('playwright');
const { KHO_HOA, KHO_MAT_NA, KHO_CHU_CHAY, KHO_DA } =
  await import(new URL('../web/inspector/schema.js', import.meta.url));

const GOC = process.argv[2] || 'http://127.0.0.1:7803';
let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/** Một cảnh chỉ có đúng những món phép kiểm cần, không lẫn thứ khác vào phép đo. */
const canh = (mon) => ({
  version: 2,
  meta: { name: 'thu lat 1', width: 1280, height: 720, density: 1, bg: '#ffffff', ink: '#111111' },
  scenes: [{ id: 'c1', duration: 8, stagger: 0, elements: mon }],
});

const trinh = await chromium.launch();
const trang = await trinh.newPage({ viewport: { width: 1280, height: 720 } });
const loiJS = [];
trang.on('pageerror', (e) => loiJS.push(String(e)));

try {
  await trang.goto(`${GOC}/clip/scene-player.html?scene=cta`, { waitUntil: 'domcontentloaded' });
  await trang.waitForFunction(() => window.__clip, null, { timeout: 30000 });
  await trang.evaluate(() => window.__clip.ready());

  /** Nạp cảnh, tua tới giây, rồi đọc kiểu đã tính của từng món. */
  const doc = async (mon, giay, ids) => {
    await trang.evaluate(([c, g]) => { window.__clip.load(c); window.__clip.seek(g); },
      [canh(mon), giay]);
    await trang.waitForTimeout(220);
    return trang.evaluate((ds) => Object.fromEntries(ds.map((k) => {
      const n = document.querySelector(`.el[data-el="${k}"]`);
      if (!n) return [k, null];
      const cs = getComputedStyle(n);
      const m = /matrix\(([^)]+)\)/.exec(cs.transform);
      const so = m ? m[1].split(',').map(Number) : null;
      return [k, {
        dy: so ? so[5] : null,
        hoa: cs.mixBlendMode,
        na: cs.maskImage || cs.webkitMaskImage || 'none',
      }];
    })), ids);
  };

  const oNen = (them) => ({
    id: 'o', kind: 'panel', x: 400, y: 200, w: 300, h: 200, fill: '#3366cc', ...them,
  });

  /* ===================== 1. Đường cong tốc độ ===================== */
  console.log('\n1. Đường cong tốc độ tuỳ ý');

  const DAI = 2;
  const canhDa = (ease, id) => ({ ...oNen({ in: { kind: 'rise', ease, dur: DAI, dist: 200 } }), id });

  // 1a — đường mới phải cho kết quả KHÁC đường cũ, chứ không âm thầm rơi về `out`
  {
    const m = [canhDa('linear', 'thang'), canhDa('nay', 'nay'), canhDa('manh', 'manh')];
    const r = await doc(m, 0.6, ['thang', 'nay', 'manh']);
    const lech = (a, b) => Math.abs(r[a].dy - r[b].dy);
    dat('tên đường cong mới cho ra chuyển động khác hẳn',
      lech('thang', 'nay') > 8 && lech('thang', 'manh') > 8,
      `nay lệch ${lech('thang', 'nay').toFixed(1)}px · manh lệch ${lech('thang', 'manh').toFixed(1)}px`);
  }

  // 1b — `nay` phải VỌT QUÁ đích rồi lùi về: có lúc lệch ngược dấu
  {
    const m = [canhDa('nay', 'nay')];
    let vuot = 0, thut = 0;
    for (const g of [0.1, 0.3, 0.9, 1.4, 1.7, 1.9]) {
      const r = await doc(m, g, ['nay']);
      if (r.nay.dy < -0.5) vuot++;        // qua đích rồi (đích là dy = 0)
      if (r.nay.dy > 200.5) thut++;       // nhún ngược, lùi xa hơn cả điểm xuất phát
    }
    dat('"nhún ngược rồi vọt qua" có cả nhún lẫn vọt', vuot > 0 && thut > 0,
      `vọt quá đích ${vuot} lần · nhún ngược ${thut} lần`);
  }

  // 1c — PHÉP ĐO MẠNH NHẤT: bốn số [0,0,1,1] phải trùng khít với tên `linear`
  {
    const m = [canhDa('linear', 'thang'), canhDa([0, 0, 1, 1], 'bon-so')];
    let max = 0;
    for (const g of [0.2, 0.5, 0.9, 1.3, 1.6, 1.95]) {
      const r = await doc(m, g, ['thang', 'bon-so']);
      max = Math.max(max, Math.abs(r.thang.dy - r['bon-so'].dy));
    }
    dat('Bézier [0,0,1,1] trùng khít với "đều tay"', max < 0.05,
      `lệch tối đa ${max.toFixed(4)}px trên 6 mốc`);
  }

  // 1d — tên lạ thì lùi về mặc định, không được vỡ
  {
    const m = [canhDa('out', 'chuan'), canhDa('khong-he-co-ten-nay', 'la')];
    const r = await doc(m, 0.7, ['chuan', 'la']);
    dat('tên đường cong lạ thì lùi về mặc định, không vỡ',
      Math.abs(r.chuan.dy - r.la.dy) < 0.05, `lệch ${Math.abs(r.chuan.dy - r.la.dy).toFixed(4)}px`);
  }

  // 1e — mọi tên khai trong bảng chọn đều phải có thật trong bộ dựng
  {
    const m = KHO_DA.map((d, i) => canhDa(d.v, `d${i}`));
    const r = await doc(m, 0.7, KHO_DA.map((_, i) => `d${i}`));
    const chet = KHO_DA.filter((_, i) => r[`d${i}`] == null || r[`d${i}`].dy == null);
    dat(`cả ${KHO_DA.length} kiểu đà trong bảng chọn đều dựng được`, chet.length === 0,
      chet.map((d) => d.v).join(', ') || `${KHO_DA.length}/${KHO_DA.length}`);
  }

  /* ===================== 2. Hoà trộn ===================== */
  console.log('\n2. Hoà vào nền');
  {
    const m = KHO_HOA.map((h, i) => oNen({ id: `h${i}`, blend: h.v, in: { kind: 'none', dur: 0.001 } }));
    const r = await doc(m, 4, KHO_HOA.map((_, i) => `h${i}`));
    const sai = KHO_HOA.filter((h, i) => {
      const co = r[`h${i}`]?.hoa;
      return h.v === 'thuong' ? co !== 'normal' : (!co || co === 'normal');
    });
    dat(`cả ${KHO_HOA.length} kiểu hoà trộn đều ăn vào khung hình`, sai.length === 0,
      sai.map((h) => h.v).join(', ') || KHO_HOA.map((_, i) => r[`h${i}`].hoa).join(' · '));
  }

  /* ===================== 3. Mặt nạ ===================== */
  console.log('\n3. Hiện ra theo hình');
  const phanTram = (s) => {
    const ds = [...String(s).matchAll(/([\d.]+)%/g)].map((x) => Number(x[1]));
    return ds.length ? Math.max(...ds) : null;
  };

  // 3a — quét phải: vệt phải LỚN DẦN theo thời gian
  {
    const m = [oNen({ id: 'q', mask: 'quet-phai', in: { kind: 'fade', dur: 3 } })];
    const moc = [];
    for (const g of [0.3, 1.2, 2.4]) {
      const r = await doc(m, g, ['q']);
      moc.push(phanTram(r.q.na));
    }
    const tang = moc.every((v, i) => v != null && (i === 0 || v > moc[i - 1] + 1));
    dat('quét sang phải lớn dần theo thời gian', tang, moc.map((v) => v == null ? '—' : `${v}%`).join(' → '));

    const xong = await doc(m, 6, ['q']);
    dat('quét xong thì bỏ mặt nạ cho mép sắc lại', xong.q.na === 'none', xong.q.na.slice(0, 40));
  }

  // 3b — cắt tròn thì che MÃI, không bỏ như quét
  {
    const m = [oNen({ id: 't', mask: 'tron', in: { kind: 'fade', dur: 1 } })];
    const r = await doc(m, 6, ['t']);
    dat('"cắt tròn" giữ mặt nạ cả cảnh', /radial-gradient/.test(r.t.na), r.t.na.slice(0, 44));
  }

  // 3c — mọi kiểu trong bảng chọn đều dựng ra mặt nạ thật
  {
    const chay = KHO_MAT_NA.filter((k) => k.v !== 'khong');
    const m = chay.map((k, i) => oNen({ id: `n${i}`, mask: k.v, in: { kind: 'fade', dur: 4 } }));
    const r = await doc(m, 1.2, chay.map((_, i) => `n${i}`));
    const thieu = chay.filter((_, i) => !/gradient/.test(r[`n${i}`]?.na || ''));
    dat(`cả ${chay.length} kiểu mặt nạ đều ra hình thật`, thieu.length === 0,
      thieu.map((k) => k.v).join(', ') || `${chay.length}/${chay.length}`);
  }

  // 3d — không khai thì KHÔNG đụng vào, clip cũ giữ nguyên từng pixel
  {
    const r = await doc([oNen({ id: 'k', in: { kind: 'fade', dur: 1 } })], 3, ['k']);
    dat('không khai mặt nạ thì không che gì', r.k.na === 'none', r.k.na.slice(0, 30));
  }

  /* ===================== 4. Chữ chạy từng ký tự ===================== */
  console.log('\n4. Chữ chạy từng ký tự');
  const chuThu = (them) => [{
    id: 'c', kind: 'text', x: 200, y: 260, w: 800,
    text: 'Xin chao *ban*', size: 64, in: { kind: 'none', dur: 0.001 }, ...them,
  }];

  const soi = async (them, giay) => {
    await trang.evaluate(([c, g]) => { window.__clip.load(c); window.__clip.seek(g); },
      [canh(chuThu(them)), giay]);
    await trang.waitForTimeout(220);
    return trang.evaluate(() => {
      const n = document.querySelector('.el[data-el="c"]');
      if (!n) return null;
      const k = [...n.querySelectorAll('.k')];
      return {
        so: k.length,
        nhan: n.querySelectorAll('.t i .k').length,
        mo: k.map((x) => Number(getComputedStyle(x).opacity)),
        tu: n.querySelectorAll('.tu').length,
      };
    });
  };

  {
    const r = await soi({ charStagger: 0.06, charIn: 'rise' }, 0.25);
    // "Xin chao ban" = 3 + 4 + 3 = 10 ký tự, không kể dấu cách
    dat('mỗi ký tự thành một mảnh riêng', r.so === 10, `${r.so} mảnh · ${r.tu} từ`);
    dat('chữ mang màu nhấn không bị xé mất', r.nhan === 3, `${r.nhan} ký tự trong dấu sao`);
    dat('ký tự đầu hiện trước ký tự cuối', r.mo[0] > r.mo[r.mo.length - 1] + 0.2,
      `đầu ${r.mo[0].toFixed(2)} · cuối ${r.mo[r.mo.length - 1].toFixed(2)}`);
  }
  {
    const r = await soi({ charStagger: 0.06, charIn: 'rise' }, 5);
    dat('chạy xong thì mọi ký tự hiện đủ', r.mo.every((v) => v > 0.99),
      `thấp nhất ${Math.min(...r.mo).toFixed(2)}`);
  }
  {
    const r = await soi({ charStagger: 0.08, charIn: 'go' }, 0.45);
    const nhiPhan = r.mo.every((v) => v < 0.01 || v > 0.99);
    dat('"gõ như máy đánh chữ" hiện dứt khoát, không mờ dần', nhiPhan,
      `${r.mo.filter((v) => v > 0.99).length}/${r.so} ký tự đã hiện`);
  }
  {
    const r = await soi({}, 3);
    dat('không bật thì không bọc ký tự — clip cũ không tốn gì', r.so === 0, `${r.so} mảnh`);
  }
  {
    const m = KHO_CHU_CHAY.map((k) => k.v);
    let loi = [];
    for (const k of m) {
      const r = await soi({ charStagger: 0.05, charIn: k }, 0.3);
      if (!r || r.so !== 10) loi.push(k);
    }
    dat(`cả ${m.length} kiểu chạy chữ đều dựng được`, loi.length === 0,
      loi.join(', ') || `${m.length}/${m.length}`);
  }

  /* ===================== 5. Sạch ===================== */
  console.log('\n5. Không có lỗi trên trang');
  dat('không có lỗi JS', loiJS.length === 0, loiJS.slice(0, 2).join(' | ') || 'sạch');
} finally {
  await trinh.close();
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Lát 1 đạt hết.\n');
process.exit(hong ? 1 : 0);
