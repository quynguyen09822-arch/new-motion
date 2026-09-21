#!/usr/bin/env node
/**
 * KIỂM CO THEO KHỔ — bộ dựng sẵn và món lẻ phải vừa khổ clip đang mở.
 *
 * Chạy bằng Node trần, vài trăm mili giây.
 *
 * VÌ SAO PHẢI CÓ. Mọi con số px trong kho mẫu của `them.js` viết theo đúng một
 * khổ: 720×1280 (đo ra chứ không chọn — `chuDan` khai `w: 374, size: 96`, trùng
 * từng số với `vibe-host`). Thả nguyên si vào clip 1280×720 là chữ 96 trong
 * khung cao 720, tức bộ dựng sẵn không dựng sẵn được gì.
 *
 * Kiểu hỏng ở đây KHÔNG làm gãy gì: kịch bản vẫn hợp lệ, clip vẫn chạy, chỉ sai
 * cỡ. Không có bài kiểm thì nó cứ thế trôi.
 *
 *   node tools/kiem-co-kho.mjs
 */
import { KHUNG_MAU, coTheoKho, heSoKho, heSoRong, themKit, themMon } from '../web/them.js';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

const lam = (rong, cao) => ({
  version: 1,
  meta: { name: 'kiem', width: rong, height: cao, density: 1,
    bg: '#101010', ink: '#f0f0f0', accent: '#ff6a1f' },
  scenes: [{ id: 'c1', duration: 4, stagger: 0.16, elements: [] }],
});

/** Mọi món trong cảnh, phẳng ra. */
const phang = (doc) => {
  const ra = [];
  const dao = (e) => { ra.push(e); (e.children || []).forEach(dao); };
  doc.scenes[0].elements.forEach(dao);
  return ra;
};
const tim = (doc, kind) => phang(doc).find((e) => e.kind === kind);

console.log('\n1. Hệ số lấy theo cạnh nào chạm trước');
{
  dat('đúng khổ mẫu thì hệ số là 1',
    heSoKho({ width: KHUNG_MAU.rong, height: KHUNG_MAU.cao }) === 1);
  dat('dọc → ngang cho 0,5625', heSoKho({ width: 1280, height: 720 }).toFixed(4) === '0.5625');
  dat('dọc to gấp rưỡi cho 1,5', heSoKho({ width: 1080, height: 1920 }) === 1.5);
  /* Vuông thì cạnh cao bó lại trước — lấy theo bề ngang là món tràn khỏi khung
     theo chiều dọc mà không ai báo. */
  dat('vuông lấy theo cạnh bó hơn',
    heSoKho({ width: 1080, height: 1080 }).toFixed(4) === (1080 / 1280).toFixed(4));
  dat('meta hỏng thì trả 1, không trả NaN', heSoKho({}) === 1 && heSoKho(null) === 1);
}

console.log('\n2. Chỉ nhân số px, không đụng thứ khác');
{
  const mon = {
    kind: 'text', id: 'x', w: 100, h: 50, x: 10, y: 20, size: 40,
    pad: 3, gap: 5, at: 0.4, slices: 10, subScale: 0.6,
    in: { kind: 'rise', ease: 'out', dur: 0.55 },
  };
  const ra = coTheoKho(mon, 0.5);
  dat('w · h · x · y · size đều co',
    ra.w === 50 && ra.h === 25 && ra.x === 5 && ra.y === 10 && ra.size === 20);
  /* `pad`/`gap` là BẬC 0..7 chứ không phải px. Nhân lên là núm nhảy khỏi thang
     và bộ dựng bỏ qua im lặng — xem `DEM_TRONG`/`KHE_HO` trong schema.js. */
  dat('pad · gap là BẬC, giữ nguyên', ra.pad === 3 && ra.gap === 5);
  dat('at là giây, giữ nguyên', ra.at === 0.4);
  dat('slices là số lượng, giữ nguyên', ra.slices === 10);
  dat('subScale là tỉ lệ, giữ nguyên', ra.subScale === 0.6);
  dat('tokens chuyển động giữ nguyên', ra.in.dur === 0.55 && ra.in.kind === 'rise');
  dat('cỡ chữ không bao giờ rơi xuống 0', coTheoKho({ size: 3 }, 0.01).size === 1);
  dat('hệ số 1 thì trả về y nguyên', coTheoKho(mon, 1) === mon);
}

console.log('\n3. Bộ dựng sẵn vừa khổ');
{
  const doc = lam(1280, 720);
  themKit(doc, 'c1', 'khoe-web');
  const chu = tim(doc, 'text');
  const web = tim(doc, 'browser');
  /* 96 × 0,5625 = 54 — TRÙNG ĐÚNG cỡ chữ lớn nhất của `kich-ban-thu` và
     `thu-nghiem`, hai clip ngang dựng tay. Đây là chỗ công thức tự chứng minh. */
  dat('cỡ chữ 96 → 54, đúng cỡ clip ngang dựng tay', chu?.size === 54, String(chu?.size));
  /* Bề ngang của CHỮ đi theo bề ngang khung, không co đều: `w` của chữ là bề
     ngang NGẮT DÒNG, nên thứ đáng giữ là phần trăm khung nó chiếm. Co đều thì
     374 (52% khung dọc) thành 210 trong khung ngang, tức 16%, và một câu dẫn
     bảy chữ gãy làm bốn dòng — đã nhìn thấy tận mắt trước khi sửa. */
  dat('bề ngang chữ giữ đúng 52% khung', chu?.w === 665, String(chu?.w));
  dat('đúng bằng tỉ lệ bề ngang',
    chu?.w === Math.round(374 * heSoRong({ width: 1280 })), String(chu?.w));
  dat('cửa sổ trình duyệt co theo', web?.w === 251 && web?.h === 181, `${web?.w}×${web?.h}`);
  /* Không món nào được rộng hơn khung — tràn ra là cắt cụt mà bộ soát không kêu,
     vì `w` khai trong dữ liệu không phải cỡ lúc vẽ. */
  dat('không món nào rộng quá khung',
    phang(doc).every((e) => typeof e.w !== 'number' || e.w <= 1280));
}

console.log('\n4. Đúng khổ mẫu thì KHÔNG đổi một số nào');
{
  /* Chín clip đang có đều dựng quanh khổ này. Nếu hệ số đụng vào chúng thì bản
     vá này tự nó là một lần đổi khổ hàng loạt — thứ không ai yêu cầu. */
  const doc = lam(KHUNG_MAU.rong, KHUNG_MAU.cao);
  themKit(doc, 'c1', 'khoe-web');
  const chu = tim(doc, 'text');
  const web = tim(doc, 'browser');
  dat('chữ giữ nguyên 374 / 96', chu?.w === 374 && chu?.size === 96, `${chu?.w} / ${chu?.size}`);
  dat('cửa sổ giữ nguyên 446×321', web?.w === 446 && web?.h === 321, `${web?.w}×${web?.h}`);
}

console.log('\n5. Món CÓ HÌNH DẠNG thì không được co lệch');
{
  /* Cửa sổ trình duyệt, khung điện thoại, biểu mẫu đều có tỉ lệ hình riêng. Áp
     ngoại lệ "theo bề ngang" cho chúng là cái khung điện thoại bẹp thành hình
     chữ nhật nằm ngang — hỏng thấy ngay, nhưng chỉ ở khổ khác khổ mẫu. */
  const doc = lam(1280, 720);
  themKit(doc, 'c1', 'khoe-web');
  const web = tim(doc, 'browser');
  /* So có DUNG SAI, không so bằng nhau: px phải là số nguyên nên 446×321 co
     xuống thành 251×181, tỉ lệ 1,387 thay vì 1,389. Đòi khớp tuyệt đối là bài
     kiểm đỏ vì phép làm tròn, và người sau sẽ đi sửa mã cho vừa bài kiểm. */
  const tiLeGoc = 446 / 321;
  const lech = Math.abs(web.w / web.h - tiLeGoc);
  dat('cửa sổ giữ nguyên tỉ lệ hình', lech < 0.02,
    `${(web.w / web.h).toFixed(3)} so với ${tiLeGoc.toFixed(3)}`);
  themMon(doc, 'c1', 'phone');
  const dt = tim(doc, 'phone');
  dat('khung điện thoại vẫn cao hơn rộng', dt.h > dt.w, `${dt.w}×${dt.h}`);
}

console.log('\n6. Món lẻ cũng co, không chỉ bộ dựng sẵn');
{
  const doc = lam(1280, 720);
  themMon(doc, 'c1', 'browser');
  const web = tim(doc, 'browser');
  const goc = lam(KHUNG_MAU.rong, KHUNG_MAU.cao);
  themMon(goc, 'c1', 'browser');
  const webGoc = tim(goc, 'browser');
  dat('món lẻ ở khổ ngang nhỏ hơn ở khổ mẫu', web.w < webGoc.w, `${web.w} < ${webGoc.w}`);
  dat('đúng bằng hệ số', web.w === Math.round(webGoc.w * 0.5625), `${web.w}`);
  /* `place` do `themMon` đặt, không phải số px — co giãn không được nuốt mất nó. */
  dat('vẫn giữ `place` để tự xếp chỗ', Boolean(web.place), web.place);
}

console.log(hong ? `\n❌ ${hong} mục hỏng.` : '\n✅ Co theo khổ: tất cả các mục đều qua.');
process.exit(hong ? 1 : 0);
