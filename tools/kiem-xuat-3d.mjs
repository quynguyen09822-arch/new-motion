#!/usr/bin/env node
/**
 * KIỂM ĐƯỜNG XUẤT ẢNH THAM CHIẾU (`/api/chup-3d`).
 *
 * ĐÂY LÀ LÝ DO TỒN TẠI CỦA CẢ XƯỞNG. Bày bối cảnh, chốt góc máy — rồi phải
 * đưa được ra ngoài cho công cụ dựng phim bằng AI. Đứt đoạn ở đây thì mọi thứ
 * phía trước chỉ chạy quanh trong một cái tab.
 *
 * KHÔNG CÓ CÁCH NÀO KIỂM BẰNG HÀM THUẦN. Ảnh do Chromium thật dựng từ CSS ba
 * chiều; cái sai hay gặp nhất lại là *chụp đúng lúc trang chưa dựng xong* —
 * ra một tấm ảnh xám trống mà mã nguồn không có lỗi nào. Nên bài này gọi thật
 * rồi SOI TỪNG BYTE của ảnh: đúng cỡ chưa, có màu gì trong đó chưa, và những
 * thứ chỉ-dành-cho-người (vạch ba phần, khung chọn, núm nắm) đã biến mất chưa.
 *
 *   node tools/kiem-xuat-3d.mjs [http://127.0.0.1:7803]
 */
import path from 'node:path';
import zlib from 'node:zlib';

const M = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const GOC = process.env.MOTION_GOC || process.argv[2] || 'http://127.0.0.1:7803';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const C = await import(path.join(M, 'bachieu', 'canh.js'));
const K = await import(path.join(M, 'bachieu', 'khoi.js'));

/** Đọc cỡ ảnh từ IHDR của chính tệp PNG — không tin con số máy chủ tự khai. */
function doPNG(b) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { rong: b.readUInt32BE(16), cao: b.readUInt32BE(20) };
}

/**
 * Giải nén PNG ra pixel. Chỉ đỡ đúng dạng Chromium sinh ra (8 bit, RGBA,
 * không xen kẽ) — đủ cho việc đếm màu, mà không phải kéo thêm thư viện vào
 * một dự án cố ý không có gói phụ thuộc nào.
 */
function docPixel(b) {
  let i = 8, rong = 0, cao = 0, kieu = -1, sau = 0;
  const idat = [];
  while (i + 8 <= b.length) {
    const dai = b.readUInt32BE(i);
    const ten = b.toString('ascii', i + 4, i + 8);
    const than = b.subarray(i + 8, i + 8 + dai);
    if (ten === 'IHDR') {
      rong = than.readUInt32BE(0); cao = than.readUInt32BE(4);
      sau = than[8]; kieu = than[9];
    } else if (ten === 'IDAT') idat.push(than);
    else if (ten === 'IEND') break;
    i += 12 + dai;
  }
  if (sau !== 8 || (kieu !== 6 && kieu !== 2)) return null;
  const kenh = kieu === 6 ? 4 : 3;
  const tho = zlib.inflateSync(Buffer.concat(idat));
  const buoc = rong * kenh;
  const ra = Buffer.alloc(cao * buoc);
  let p = 0;
  for (let y = 0; y < cao; y++) {
    const loc = tho[p++];
    const dong = tho.subarray(p, p + buoc); p += buoc;
    const truoc = y > 0 ? ra.subarray((y - 1) * buoc, y * buoc) : Buffer.alloc(buoc);
    const nay = ra.subarray(y * buoc, (y + 1) * buoc);
    for (let x = 0; x < buoc; x++) {
      const a = x >= kenh ? nay[x - kenh] : 0, bb = truoc[x], c = x >= kenh ? truoc[x - kenh] : 0;
      const v = dong[x];
      nay[x] = loc === 0 ? v : loc === 1 ? v + a : loc === 2 ? v + bb
        : loc === 3 ? v + ((a + bb) >> 1)
          : (() => { const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
            return v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c); })();
    }
  }
  return { rong, cao, kenh, px: ra };
}

function canhThu(tiId = '16-9') {
  const c = C.canhMoi(); c.mon.length = 0;
  C.themMon(c, 'nhan-vat'); C.themMon(c, 'hop');
  c.may.khung = tiId;
  const k = C.khungTrong(1472, 828, tiId);
  C.dongBoOng(c.may, k.rong);
  Object.assign(c.may, C.thuPhongVua(c, K.boCuc, k.rong, k.cao));
  return c;
}

const goi = (canh) => fetch(GOC + '/api/chup-3d', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ canh }),
});

console.log('① Chụp được ảnh thật, đúng khung hình');
let anh169 = null;
{
  const t0 = Date.now();
  const r = await goi(canhThu('16-9'));
  const giay = (Date.now() - t0) / 1000;
  dat('máy chủ trả về ảnh', r.ok, `mã ${r.status} · ${giay.toFixed(1)}s`);
  if (!r.ok) {
    console.log('   ' + (await r.text()).slice(0, 200));
    console.log(`\n❌ ${++hong} mục không đạt.\n`); process.exit(1);
  }
  dat('đúng kiểu PNG', (r.headers.get('content-type') || '').includes('image/png'));
  dat('gợi ý tải về kèm tên tệp', /attachment; *filename=/.test(r.headers.get('content-disposition') || ''));
  const b = Buffer.from(await r.arrayBuffer());
  anh169 = b;
  const co = doPNG(b);
  dat('tệp đúng là PNG, đọc được đầu tệp', !!co);
  /* Tỉ lệ ảnh PHẢI khớp khung đã chọn. Lệch nghĩa là máy chủ cắt sai chỗ, và
     AI sẽ dựng phim theo một khuôn khác với thứ người dùng vừa chốt. */
  dat('ảnh đúng tỉ lệ 16:9', co && Math.abs(co.rong / co.cao - 16 / 9) < 0.01,
    co ? `${co.rong}×${co.cao}` : '');
  dat('ảnh đủ to để dùng', co && co.rong >= 1000, co ? co.rong + 'px' : '');

  const taV = decodeURIComponent(r.headers.get('x-ta-goc-may') || '');
  const taA = decodeURIComponent(r.headers.get('x-ta-goc-may-en') || '');
  dat('gửi kèm câu tả tiếng Việt', /[àáạảãăâêôơưđèéẹẻíìỉòóõốồổúùụưứừử]/i.test(taV), taV.slice(0, 70));
  dat('gửi kèm câu tả tiếng Anh', /lens/.test(taA) && /aspect ratio/.test(taA));
}

console.log('\n② Trong ảnh có BỐI CẢNH, không phải một tấm xám trống');
{
  const d = docPixel(anh169);
  dat('giải nén được pixel', !!d, d ? `${d.rong}×${d.cao}·${d.kenh} kênh` : '');
  if (d) {
    /* Chụp sớm một nhịp là ra tấm nền trơn mà KHÔNG có lỗi nào. Bắt bằng cách
       đếm màu ĐỎ CHÓT của con linh vật.
       Ngưỡng phải CHẶT. Bản đầu viết `R > G*1.7` — màu cam của khối mặc định
       (232,135,42) cũng lọt, nên bỏ hẳn bước nạp cảnh mà bài kiểm vẫn xanh.
       Đã thử đột biến đúng vậy và nó cho qua. */
    let doTuoi = 0; const soMau = new Set();
    for (let i = 0; i < d.px.length; i += d.kenh * 37) {
      const R = d.px[i], G2 = d.px[i + 1], B = d.px[i + 2];
      if (R > 120 && G2 < R * 0.45 && B < R * 0.45) doTuoi++;
      soMau.add((R >> 4) * 256 + (G2 >> 4) * 16 + (B >> 4));
    }
    dat('có pixel ĐỎ CHÓT — tức đã nạp cảnh rồi mới bấm máy',
      doTuoi > 150, `${doTuoi} điểm đỏ`);
    dat('ảnh có nhiều sắc độ, không phải nền trơn', soMau.size > 25, `${soMau.size} sắc`);

    /* ĐỒ NGHỀ PHẢI BIẾN MẤT. Vạch ba phần, viền khung, trục toạ độ — AI nhìn
       vào sẽ tưởng là vật thể thật rồi dựng chúng vào phim.
       ĐO BẰNG ĐỘ CHÊNH, không đo bằng độ sáng tuyệt đối. Vạch vẽ bằng trắng
       14% trên nền xám chỉ lên tới mức sáng 88 — bản đầu đòi "trên 150" nên
       bỏ hẳn lệnh giấu đồ nghề mà bài kiểm vẫn xanh. Vạch kẻ thì MẢNH: nó
       sáng hơn hẳn mấy dòng ngay trên và ngay dưới nó, và đó mới là dấu hiệu
       không lẫn vào đâu được. */
    const sangDong = (y) => {
      let t = 0;
      for (let x = 0; x < d.rong; x++) {
        const i = (y * d.rong + x) * d.kenh;
        t += (d.px[i] + d.px[i + 1] + d.px[i + 2]) / 3;
      }
      return t / d.rong;
    };
    const sangCot = (x) => {
      let t = 0;
      for (let y = 0; y < d.cao; y++) {
        const i = (y * d.rong + x) * d.kenh;
        t += (d.px[i] + d.px[i + 1] + d.px[i + 2]) / 3;
      }
      return t / d.cao;
    };
    const vachNgang = (y) => sangDong(y) - (sangDong(y - 4) + sangDong(y + 4)) / 2;
    const vachDoc = (x) => sangCot(x) - (sangCot(x - 4) + sangCot(x + 4)) / 2;

    const ba = Math.round(d.cao / 3), hai = Math.round((d.cao * 2) / 3);
    const bax = Math.round(d.rong / 3), haix = Math.round((d.rong * 2) / 3);
    /* Vạch thật chênh cỡ +20. Lấy mốc 6 để chừa chỗ cho hình thật tình cờ
       sáng hơn một chút ở đúng dòng ấy. */
    dat('không còn vạch ba phần nằm ngang',
      vachNgang(ba) < 6 && vachNgang(hai) < 6,
      `chênh ${vachNgang(ba).toFixed(1)} · ${vachNgang(hai).toFixed(1)}`);
    dat('không còn vạch ba phần dựng đứng',
      vachDoc(bax) < 6 && vachDoc(haix) < 6,
      `chênh ${vachDoc(bax).toFixed(1)} · ${vachDoc(haix).toFixed(1)}`);
    /* Viền khung chạy sát mép. Còn nó nghĩa là quên giấu lớp phủ, hoặc cắt lệch. */
    dat('không còn viền khung ở mép', vachNgang(5) < 6 && vachDoc(5) < 6,
      `chênh ${vachNgang(5).toFixed(1)} · ${vachDoc(5).toFixed(1)}`);
  }
}

console.log('\n③ Đổi khung hình thì ảnh đổi theo');
{
  const r = await goi(canhThu('9-16'));
  dat('chụp được khung dọc', r.ok, `mã ${r.status}`);
  if (r.ok) {
    const co = doPNG(Buffer.from(await r.arrayBuffer()));
    dat('ảnh dọc đúng tỉ lệ 9:16', co && Math.abs(co.rong / co.cao - 9 / 16) < 0.01,
      co ? `${co.rong}×${co.cao}` : '');
    dat('và nó CAO hơn rộng', co && co.cao > co.rong);
  }
}

console.log('\n④ Cảnh hỏng thì chặn ở cửa, đừng mở Chromium cho tốn');
{
  const r1 = await goi({ mon: [] });
  dat('cảnh trống bị từ chối', r1.status === 400);
  const c1 = await r1.json().catch(() => ({}));
  dat('và nói rõ phải làm gì', /thêm ít nhất một món/i.test(c1.loi || ''), c1.loi);

  const r2 = await fetch(GOC + '/api/chup-3d', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  dat('không gửi cảnh thì cũng bị từ chối', r2.status === 400);

  /* Đường này chỉ nhận POST. Mở bằng GET được nghĩa là ai dán địa chỉ vào
     thanh trình duyệt cũng bắt máy chủ dựng một Chromium. */
  const r3 = await fetch(GOC + '/api/chup-3d');
  dat('gọi bằng GET thì không chạy', r3.status === 404 || r3.status === 405,
    `mã ${r3.status}`);
}

console.log(hong ? `\n❌ ${hong} mục không đạt.\n` : '\n✅ Xuất ảnh tham chiếu đạt hết.\n');
process.exit(hong ? 1 : 0);
