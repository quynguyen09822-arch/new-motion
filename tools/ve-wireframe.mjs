#!/usr/bin/env node
/**
 * SINH CLIP MẪU "WIREFRAME → MOCKUP".
 *
 * Clip thử nghiệm, kể đúng cái nghề mình đang làm: từ mấy khung xám trống tới
 * màn hình có nội dung. Và nó cũng là bản mẫu cho cách dựng clip MỚI trong repo
 * này, nên có hai điều cố ý:
 *
 *  1. MỌI MÓN NGOÀI CÙNG ĐỀU KHAI `place`, không khai toạ độ.
 *     Nhờ vậy clip này đổi 16:9 ↔ 9:16 ↔ 1:1 đều tự xếp lại — khác 96,8% số món
 *     trong các clip cũ. Xem `docs/DOI-KHO-HINH.md`.
 *  2. BẢNG MÀU TOÀN XÁM.
 *     Wireframe là lúc CHƯA quyết màu. Để nguyên bộ màu thương hiệu thì nó
 *     thành bản demo sản phẩm, không còn là wireframe nữa.
 *
 *   node tools/ve-wireframe.mjs [--ghi]
 */
import { writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJ = process.env.PROJ_ROOT
  || '/home/coder/workspace/projects/clipVibehost/hosting-animatic-production';
const M = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RA = path.join(PROJ, 'scenes', 'wireframe-thu.json');
const GHI = process.argv.includes('--ghi');

/* Xám hết — wireframe là lúc chưa quyết màu. */
const meta = {
  name: 'Wireframe → Mockup (thử nghiệm)',
  width: 1280, height: 720, density: 1,
  bg: '#f1f2f4', ink: '#39404d',
  accent: '#7b8492', accent2: '#a7aeba',
  hot: '#5f6873', hot2: '#8d95a1',
};

/* Khuôn chung, lấy từ `KIT` — cụm đặt giữa, chữ dẫn rồi tới món khoe. */
const chu = (id, text, size = 64) => ({
  kind: 'text', id, x: 0, y: 0, w: 560, text, size, align: 'left', gap: 3,
  in: { kind: 'rise', ease: 'out', dur: 0.55 },
});
const khoe = (el) => ({ ...el, x: 0, y: 0, at: 0, in: { kind: 'rise', ease: 'out', dur: 0.6 } });
const cum = (id, con) => ({
  kind: 'group', id, x: 0, y: 0, place: 'giua',
  dir: 'doc', align: 'giua', justify: 'giua', gap: 5, children: con,
});
/* Lưới chấm mảnh — đúng chất giấy kẻ ô của bản vẽ tay. */
const luoi = (id) => ({
  kind: 'nen', id, x: 0, y: 0, place: 'day', parts: ['cham'],
  in: { kind: 'fade', ease: 'out', dur: 0.5 },
});

const scenes = [
  { id: 'c1-khung-trong', duration: 4, stagger: 0.12, elements: [
    luoi('luoi-1'),
    cum('nhom-1', [
      chu('chu-1', 'Bắt đầu từ *khung xám*', 72),
      khoe({ kind: 'browser', id: 'tr-1', w: 560, h: 340, url: 'chua-dat-ten.vn' }),
    ]),
  ] },
  { id: 'c2-dat-khoi', duration: 4, stagger: 0.12, elements: [
    luoi('luoi-2'),
    cum('nhom-2', [
      chu('chu-2', 'Đặt khối trước, *chữ sau*'),
      khoe({ kind: 'card', id: 'the-2', w: 520, title: 'Tiêu đề chưa viết', rows: 3,
        button: 'Nút chưa đặt tên' }),
    ]),
  ] },
  { id: 'c3-dien-noi-dung', duration: 4.4, stagger: 0.12, elements: [
    luoi('luoi-3'),
    cum('nhom-3', [
      chu('chu-3', 'Điền nội dung *thật vào*'),
      khoe({ kind: 'form', id: 'bieu-3', w: 480, title: 'Tạo dự án',
        fields: [
          { label: 'Tên dự án', value: 'wireframe-thu' },
          { label: 'Khổ hình', value: '1280 × 720' },
          { label: 'Số cảnh', value: '6' },
        ] }),
    ]),
  ] },
  { id: 'c4-doi-khung', duration: 4, stagger: 0.12, elements: [
    luoi('luoi-4'),
    cum('nhom-4', [
      chu('chu-4', 'Đổi khung, *bố cục tự theo*'),
      { kind: 'group', id: 'hang-4', x: 0, y: 0, dir: 'ngang', align: 'giua',
        justify: 'giua', gap: 4, children: [
          khoe({ kind: 'phone', id: 'dt-4', w: 200, h: 420, src: '' }),
          khoe({ kind: 'browser', id: 'tr-4', w: 400, h: 250, url: 'chua-dat-ten.vn' }),
        ] },
    ]),
  ] },
  { id: 'c5-nhip', duration: 4, stagger: 0.12, elements: [
    luoi('luoi-5'),
    cum('nhom-5', [
      chu('chu-5', 'Rồi mới tính *nhịp*'),
      khoe({ kind: 'timeline', id: 'dong-5', w: 900,
        labels: ['Khung xám', 'Đặt khối', 'Nội dung', 'Nhịp', 'Xong'] }),
    ]),
  ] },
  { id: 'c6-ket', duration: 3.6, stagger: 0.12, elements: [
    luoi('luoi-6'),
    cum('nhom-6', [
      chu('chu-6', 'Wireframe xong, *mới tô màu*', 72),
      khoe({ kind: 'logo', id: 'logo-6', name: 'Bản thử', mark: '◻', w: 300, size: 44 }),
    ]),
  ] },
];

const doc = { version: 1, meta, scenes };

/* Soát bằng chính thẩm quyền của dự án clip, đừng tự phán. */
const { validateScene } = await import(path.join(PROJ, 'clipvibe-studio/src/scene/types.ts'));
const loi = [];
for (const [i, s] of scenes.entries()) {
  const r = validateScene?.({ ...doc, scenes: [s] }) ?? null;
  if (r && r.length) loi.push(`cảnh ${i + 1}: ${JSON.stringify(r).slice(0, 160)}`);
}
console.log(loi.length ? `✗ validateScene kêu:\n  ${loi.join('\n  ')}` : '✓ validateScene: hợp lệ');

const { soatChatLuong } = await import(new URL('../web/soat.js', import.meta.url));
const q = soatChatLuong(doc);
console.log(`✓ soát chất lượng: ${q.loi.length} lời báo (${q.soNang} nặng, ${q.soNhe} nhẹ)`);
for (const l of q.loi.slice(0, 5)) console.log(`   · ${l.cau}`);

const giay = scenes.reduce((a, s) => a + s.duration, 0);
console.log(`\nClip: ${scenes.length} cảnh · ${giay.toFixed(1)}s · ${meta.width}×${meta.height}`);

if (!GHI) { console.log('\n(chỉ thử — thêm --ghi để ghi ra scenes/wireframe-thu.json)'); process.exit(loi.length ? 1 : 0); }
if (existsSync(RA)) {
  const kho = path.join(M, '.hub-video-backups', 've-wireframe');
  mkdirSync(kho, { recursive: true });
  copyFileSync(RA, path.join(kho, `wireframe-thu-${Date.now()}.json`));
}
writeFileSync(RA, JSON.stringify(doc, null, 2));
console.log(`\n✓ Đã ghi ${RA}`);
