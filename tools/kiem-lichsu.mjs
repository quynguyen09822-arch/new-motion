#!/usr/bin/env node
/**
 * KIỂM SỔ HOÀN TÁC — §9 của ARCHITECTURE.md ("history.test", không được fail).
 *
 * Luật R5 nói mọi thay đổi đi qua một cổng duy nhất. Thứ chứng minh luật ấy còn
 * đứng vững là: làm N việc rồi hoàn tác N lần thì kịch bản phải về ĐÚNG TỪNG
 * BYTE như lúc đầu. Sai một ly ở đây nghĩa là có đường sửa kịch bản nào đó lọt
 * ra ngoài sổ — và người dùng sẽ mất việc mà không hiểu vì sao.
 *
 * Chạy được bằng Node trần, KHÔNG cần server, KHÔNG cần Chromium, KHÔNG đụng
 * vào clip thật — dựng kịch bản trong bộ nhớ. Vài trăm mili giây.
 *
 *   node tools/kiem-lichsu.mjs
 */
import { taoKho, timMon } from '../web/store.js';
import { nhanBanCanh, nhanBanMon, themCanh, themMon, xoaCanh, xoaMon } from '../web/them.js';

let hong = 0;
const dat = (ten, ok, them = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${ten}${them ? ` — ${them}` : ''}`);
  if (!ok) hong++;
};

/* `store.js` tự lưu nháp bằng `fetch` sau 5 giây rảnh. Ở đây không có server,
   mà bài kiểm cũng xong trước lúc đó — chặn luôn cho chắc, đừng để một lời than
   phiền của mạng làm bẩn kết quả. */
globalThis.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) });

const goc = () => ({
  version: 1,
  meta: { name: 'kiem', width: 1280, height: 720, density: 1,
    bg: '#101010', ink: '#f0f0f0', accent: '#ff6a1f' },
  scenes: [
    { id: 'c1', duration: 4, stagger: 0.16, elements: [
      { id: 'chu-1', kind: 'text', x: 0, y: 0, place: 'giua', text: 'Một', size: 56 },
      { id: 'nhom-1', kind: 'group', x: 0, y: 0, place: 'duoi', dir: 'ngang',
        children: [{ id: 'chip-1', kind: 'chip', x: 0, y: 0, value: '99%' }] },
    ] },
    { id: 'c2', duration: 3, stagger: 0.16, elements: [
      { id: 'chu-2', kind: 'text', x: 40, y: 60, text: 'Hai', size: 40 },
    ] },
  ],
});

const chuoi = (d) => JSON.stringify(d);

console.log('\n1. Hoàn tác N bước thì về đúng bản đầu');
{
  const kho = taoKho();
  const dau = goc();
  kho.nap('kiem', dau);
  const banDau = chuoi(kho.doc());

  /* Hai mươi việc, đủ mọi kiểu: sửa trường, thêm, xoá, nhân bản, đụng cả vào
     con nằm trong cụm — chỗ dễ sai nhất vì `structuredClone` phải chép sâu. */
  const viec = [
    ['đổi chữ', (d) => { timMon(d, 'c1', 'chu-1').el.text = 'Một đã sửa'; }],
    ['đổi cỡ', (d) => { timMon(d, 'c1', 'chu-1').el.size = 72; }],
    ['kéo đổi chỗ', (d) => { const t = timMon(d, 'c2', 'chu-2').el; t.x = 123; t.y = 456; }],
    ['thêm chữ', (d) => themMon(d, 'c1', 'text')],
    ['thêm vào trong cụm', (d) => themMon(d, 'c1', 'text', 'nhom-1')],
    ['nhân bản món', (d) => nhanBanMon(d, 'c1', 'chu-1')],
    ['nhân bản cụm', (d) => nhanBanMon(d, 'c1', 'nhom-1')],
    ['xoá món trong cụm', (d) => xoaMon(d, 'c1', 'chip-1')],
    ['thêm cảnh', (d) => themCanh(d, 'c1')],
    ['nhân bản cảnh', (d) => nhanBanCanh(d, 'c2')],
    ['xoá cảnh', (d) => xoaCanh(d, 'c2')],
    ['đổi thời lượng', (d) => { d.scenes[0].duration = 9; }],
    ['đổi màu clip', (d) => { d.meta.accent = '#00ff00'; }],
    ['đặt chuyển động', (d) => { timMon(d, 'c1', 'chu-1').el.in = { kind: 'pop', ease: 'back', dur: 0.6 }; }],
    ['đặt màu chữ riêng', (d) => { timMon(d, 'c1', 'chu-1').el.ink = '#ff0000'; }],
    ['xoá món vừa thêm', (d) => xoaMon(d, 'c1', 'text-1')],
    ['đổi vùng đặt', (d) => { timMon(d, 'c1', 'chu-1').el.place = 'cao'; }],
    ['đổi tên clip', (d) => { d.meta.name = 'tên khác'; }],
    ['đổi nhịp lệch', (d) => { d.scenes[0].stagger = 0.4; }],
    ['thêm khối màu', (d) => themMon(d, 'c1', 'panel')],
  ];

  for (const [nhan, lam] of viec) kho.sua(nhan, lam);
  dat(`làm ${viec.length} việc thì kịch bản có đổi`, chuoi(kho.doc()) !== banDau);

  let dem = 0;
  while (kho.hoanTac()) dem++;
  dat(`hoàn tác đúng ${viec.length} lần`, dem === viec.length, `đếm được ${dem}`);
  dat('kịch bản về ĐÚNG bản đầu, từng byte', chuoi(kho.doc()) === banDau);
  dat('bản gốc truyền vào KHÔNG bị sửa', chuoi(dau) === banDau);

  /* Làm lại hết rồi hoàn tác hết lần nữa — bắt lỗi ngăn `toi` giữ tham chiếu
     dùng chung với ngăn `lui`, kiểu bug chỉ lộ ra ở vòng thứ hai. */
  let lam = 0;
  while (kho.lamLai()) lam++;
  dat(`làm lại đủ ${viec.length} lần`, lam === viec.length, `đếm được ${lam}`);
  while (kho.hoanTac());
  dat('vòng hai vẫn về đúng bản đầu', chuoi(kho.doc()) === banDau);
}

console.log('\n2. Một cử chỉ (kéo chuột) chỉ tốn MỘT bước hoàn tác');
{
  const kho = taoKho();
  kho.nap('kiem', goc());
  const truoc = chuoi(kho.doc());

  // Kéo chuột thật sinh ra hàng chục nhịp `sua()` liên tiếp.
  kho.moCuChi('kéo đổi chỗ');
  for (let i = 0; i < 60; i++) {
    kho.sua('kéo đổi chỗ', (d) => { const t = timMon(d, 'c2', 'chu-2').el; t.x = i; t.y = i * 2; });
  }
  kho.dongCuChi();

  dat('60 nhịp kéo = 1 bước hoàn tác', kho.hoanTac() === 'kéo đổi chỗ');
  dat('hoàn tác một lần là về chỗ cũ', chuoi(kho.doc()) === truoc);
  dat('không còn bước nào để hoàn tác', kho.hoanTac() === null);
}

console.log('\n3. Sổ có trần, và tràn trần thì không nói dối');
{
  const kho = taoKho();
  kho.nap('kiem', goc());
  for (let i = 0; i < 200; i++) kho.sua(`việc ${i}`, (d) => { d.meta.name = `tên ${i}`; });
  let dem = 0;
  while (kho.hoanTac()) dem++;
  // Trần là 120 bước. Quá trần thì bước cũ nhất rụng — chấp nhận được, miễn là
  // không có bước nào SAI, và nút hoàn tác phải tắt đúng lúc hết bước.
  dat('giữ đúng 120 bước gần nhất', dem === 120, `đếm được ${dem}`);
  dat('hết bước thì nhãn hoàn tác là null', kho.nhanLui() === null);
}

console.log('\n4. Cờ "chưa lưu" nói đúng sự thật');
{
  const kho = taoKho();
  kho.nap('kiem', goc());
  dat('vừa mở thì sạch', kho.ban() === false);
  kho.sua('đổi chữ', (d) => { timMon(d, 'c1', 'chu-1').el.text = 'khác'; });
  dat('sửa xong thì bẩn', kho.ban() === true);
  kho.hoanTac();
  dat('hoàn tác về chỗ cũ thì sạch trở lại', kho.ban() === false);
}

console.log(hong === 0 ? '\n✅ Sổ hoàn tác: qua.\n' : `\n❌ ${hong} mục không đạt.\n`);
process.exit(hong === 0 ? 0 : 1);
