#!/usr/bin/env node
/**
 * KIỂM KÉO ĐỔI CHỖ TRONG CÂY LỚP.
 *
 * Chạy bằng Node trần — không cần server, không cần Chromium, không đụng clip
 * thật. Cùng lối `kiem-lichsu.mjs`: thứ đáng canh ở đây là PHÉP BIẾN ĐỔI CÂY,
 * còn chuyện chuột kéo tới đâu thì trình duyệt lo.
 *
 * VÌ SAO PHẢI CÓ BÀI NÀY. Thứ tự trong mảng `elements` chính là thứ tự vẽ — món
 * đứng sau đè lên món đứng trước — và cũng là bậc trễ khi cảnh có `stagger`.
 * Một phép đổi chỗ sai không làm gãy gì cả: kịch bản vẫn hợp lệ, `validateScene`
 * vẫn sạch, clip vẫn chạy. Nó chỉ ra SAI HÌNH. Đó đúng là kiểu hỏng không ai bắt
 * được bằng mắt cho tới lúc xuất video.
 *
 *   node tools/kiem-keo-lop.mjs
 */
import { taoKho, timMon } from '../web/store.js';
import { doiChoHopLe, doiChoMon } from '../web/them.js';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* `store.js` tự lưu nháp bằng `fetch`. Ở đây không có server — chặn luôn, đừng
   để một lời than phiền của mạng làm bẩn kết quả. */
globalThis.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) });

const goc = () => ({
  version: 1,
  meta: { name: 'kiem', width: 1280, height: 720, density: 1,
    bg: '#101010', ink: '#f0f0f0', accent: '#ff6a1f' },
  scenes: [{ id: 'c1', duration: 4, stagger: 0.16, elements: [
    { id: 'a', kind: 'text', x: 0, y: 0, text: 'A' },
    { id: 'cum', kind: 'group', x: 0, y: 0, place: 'giua', dir: 'doc', children: [
      { id: 'b', kind: 'text', x: 0, y: 0, text: 'B' },
      { id: 'trong', kind: 'group', x: 0, y: 0, dir: 'ngang', children: [
        { id: 'c', kind: 'text', x: 0, y: 0, text: 'C' },
      ] },
    ] },
    { id: 'd', kind: 'text', x: 0, y: 0, text: 'D' },
  ] }],
});

/** Vẽ cây thành một dòng để so bằng mắt lẫn bằng máy. */
const hinh = (doc) => {
  const dao = (els) => (els || []).map((e) => (e.kind === 'group'
    ? `${e.id}(${dao(e.children)})` : e.id)).join(' ');
  return dao(doc.scenes[0].elements);
};

console.log('\n1. Đổi chỗ trong cùng một cấp');
{
  const d = goc();
  dat('bản đầu đúng như khai', hinh(d) === 'a cum(b trong(c)) d', hinh(d));
  doiChoMon(d, 'c1', 'd', 'a', 'truoc');
  dat('kéo "d" lên trước "a"', hinh(d) === 'd a cum(b trong(c))', hinh(d));
  doiChoMon(d, 'c1', 'd', 'cum', 'sau');
  dat('kéo "d" xuống sau cụm', hinh(d) === 'a cum(b trong(c)) d', hinh(d));
}

console.log('\n2. Vào cụm và ra khỏi cụm');
{
  const d = goc();
  doiChoMon(d, 'c1', 'a', 'cum', 'vao');
  dat('kéo "a" vào cụm → nằm cuối cụm', hinh(d) === 'cum(b trong(c) a) d', hinh(d));
  doiChoMon(d, 'c1', 'b', null, 'cuoi');
  dat('kéo "b" ra ngoài cùng', hinh(d) === 'cum(trong(c) a) d b', hinh(d));
  doiChoMon(d, 'c1', 'c', 'd', 'truoc');
  /* "c" nằm sâu hai tầng, kéo ra đứng TRƯỚC "d" ở ngoài cùng — nó chen vào giữa
     cụm và "d" chứ không nhảy ra cuối. Kỳ vọng đầu tiên tôi viết ở đây bỏ sót
     đúng chỗ đó, và bài kiểm bắt được. */
  dat('kéo "c" từ cụm lồng ra ngoài', hinh(d) === 'cum(trong() a) c d b', hinh(d));
}

console.log('\n3. Những cú thả PHẢI bị từ chối');
{
  const d = goc();
  /* Thả một cụm vào chính con cháu của nó thì cây tự ăn lấy mình: nhánh ấy biến
     mất khỏi cảnh mà `validateScene` không kêu, vì thứ nó soát là cái còn lại. */
  dat('cụm vào con của chính nó', doiChoHopLe(d, 'c1', 'cum', 'b', 'vao') === false);
  dat('cụm vào cháu của chính nó', doiChoHopLe(d, 'c1', 'cum', 'c', 'sau') === false);
  dat('cụm vào cụm lồng bên trong', doiChoHopLe(d, 'c1', 'cum', 'trong', 'vao') === false);
  dat('thả vào chính mình', doiChoHopLe(d, 'c1', 'a', 'a', 'sau') === false);
  /* "Vào trong" chỉ có nghĩa với cụm. Cho phép với món thường thì `children`
     mọc ra trên một loại không bao giờ được bộ dựng đọc tới — món biến mất. */
  dat('vào trong một món KHÔNG phải cụm', doiChoHopLe(d, 'c1', 'a', 'd', 'vao') === false);
  dat('món không có thật', doiChoHopLe(d, 'c1', 'khong-co', 'a', 'sau') === false);
  dat('đích không có thật', doiChoHopLe(d, 'c1', 'a', 'khong-co', 'sau') === false);
  dat('cây không đổi sau 7 cú thả hỏng', hinh(d) === 'a cum(b trong(c)) d', hinh(d));
}

console.log('\n4. Kéo xong hoàn tác thì về ĐÚNG TỪNG BYTE');
{
  const kho = taoKho();
  kho.nap('kiem', goc());
  const banDau = JSON.stringify(kho.doc());

  const viec = [
    ['d', 'a', 'truoc'], ['a', 'cum', 'vao'], ['b', null, 'cuoi'],
    ['c', 'd', 'sau'], ['trong', 'a', 'truoc'], ['cum', 'b', 'sau'],
  ];
  for (const [mon, dich, kieu] of viec) {
    if (!doiChoHopLe(kho.doc(), 'c1', mon, dich, kieu)) continue;
    kho.sua(`kéo ${mon}`, (d) => doiChoMon(d, 'c1', mon, dich, kieu));
  }
  dat('cây đã khác bản đầu', JSON.stringify(kho.doc()) !== banDau);

  let n = 0;
  while (kho.hoanTac()) n++;
  dat(`hoàn tác ${n} bước là hết sổ`, n === viec.length, `${n}/${viec.length}`);
  /* Đúng từng byte, không phải "trông giống". Lệch một ly ở đây nghĩa là có
     đường sửa kịch bản lọt ra ngoài sổ hoàn tác. */
  dat('về đúng từng byte', JSON.stringify(kho.doc()) === banDau);
}

console.log('\n5. Món kéo đi vẫn là CHÍNH NÓ, không phải bản sao');
{
  const d = goc();
  timMon(d, 'c1', 'b').el.text = 'B đã sửa';
  doiChoMon(d, 'c1', 'b', null, 'cuoi');
  const sau = timMon(d, 'c1', 'b');
  /* Chép ra bản mới thay vì dời chính nó thì mọi thứ trông vẫn đúng, cho tới
     lúc người dùng sửa món rồi kéo nó đi và thấy nội dung quay về bản cũ. */
  dat('giữ nguyên nội dung đã sửa', sau?.el.text === 'B đã sửa', sau?.el.text);
  dat('ra khỏi cụm thật', sau?.cha === null);
  dat('không đẻ thêm bản thứ hai',
    JSON.stringify(d).split('"id":"b"').length - 1 === 1);
}

console.log(hong ? `\n❌ ${hong} mục hỏng.` : '\n✅ Kéo đổi chỗ cây lớp: tất cả các mục đều qua.');
process.exit(hong ? 1 : 0);
