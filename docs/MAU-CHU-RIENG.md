# Màu chữ riêng cho từng khối (`ink`)

**Ngày 09/09/2026 — có sửa một chỗ trong `scene-player.html` của dự án chung.**
Ghi lại ở đây để không ai mất dấu, và để khôi phục được trong một lệnh.

## Vấn đề

Định dạng clip đời mới cho mỗi khối màu (`panel`) một màu nền riêng qua `fill`,
nhưng **chữ thì không**. Mọi chữ trong clip lấy đúng một màu:

```css
.k-text .t { color: var(--ink) }     /* --ink đặt một lần trên body, từ meta.ink */
```

Hệ quả: **một clip không thể vừa có chữ đen trên nền sáng vừa có chữ trắng trên
nền tối.** Mà giao diện thật nào cũng có cả hai — thanh bên tối cạnh khung nội
dung trắng là bố cục phổ biến nhất của phần mềm.

Đã tìm hết đường vòng, không có đường nào:

| Thử | Vì sao không được |
|---|---|
| Nhét thẻ `<span style>` vào chữ | `rich()` thoát `< > &` ngay dòng đầu |
| Nhét CSS vào `fill` của `panel` | `style.background = …` chỉ nhận giá trị nền |
| Bọc chữ trong một khối có màu | chỉ `kind: 'group'` mới có con, mà `group` không có nền |
| Dùng `*chữ*` / `**chữ**` | ra màu nhấn của thương hiệu, không phải màu tuỳ ý |

## Thay đổi

Trong `scene-player.html`, hàm dựng phần tử (`make`), ngay trước khi gọi `BUILD`:

```js
if (el.ink) {
  node.style.setProperty('--ink', el.ink);
  node.style.setProperty('--ink-mo',   el.inkSoft  || `color-mix(in srgb, ${el.ink} 74%, transparent)`);
  node.style.setProperty('--ink-nhat', el.inkFaint || `color-mix(in srgb, ${el.ink} 50%, transparent)`);
}
```

Biến CSS đặt trên nút thì con cháu thừa hưởng, nên một khối và mọi thứ bên trong
nó đổi màu chữ cùng lúc.

**Có điều kiện — clip không khai `ink` thì không đặt gì.** Đã kiểm: chụp 9 clip
đời mới trước và sau khi sửa, so từng pixel, **9/9 y hệt**.

## Dùng

```json
{ "id": "menu1", "kind": "text", "x": 72, "y": 200,
  "text": "Triển khai website", "size": 11, "ink": "#e9ecf3" }
```

Ba trường, đều không bắt buộc: `ink` (chữ chính), `inkSoft` (dòng phụ `sub`),
`inkFaint` (nhãn mờ). Khai mỗi `ink` thì hai cái kia tự suy ra.

`validateScene` không chặn trường lạ nên kịch bản vẫn hợp lệ.

## Khôi phục

Bản gốc nằm ở `.hub-video-backups/scene-player/2026-09-09T145117/`.

```bash
cp projects/matbao-hub-video/.hub-video-backups/scene-player/2026-09-09T145117/scene-player.html \
   projects/clipVibehost/hosting-animatic-production/scene-player.html
```

## Chỗ dễ mất

`scene-player.html` là file của dự án chung và có người sửa hằng ngày. Nếu ai đó
thay cả file, đoạn trên biến mất và **clip nào khai `ink` sẽ lặng lẽ trở về chữ
một màu** — không báo lỗi, chỉ là chữ trên nền tối chìm đi. Gặp triệu chứng đó
thì đọc lại file này rồi dán lại đoạn code.

Clip đang dùng: `scenes/thu-ve-lai-s02.json` (dựng bởi `tools/ve-s02.py`).
