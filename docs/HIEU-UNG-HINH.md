# Hiệu ứng hình — nhoè, bóng đổ, đẩy máy chậm

**Ngày 11/09/2026 — có sửa `scene-player.html` của dự án chung.**
Ghi lại ở đây để không ai mất dấu, và để khôi phục được trong một lệnh.
Đọc kèm `MAU-CHU-RIENG.md`, `DUNG-CHAY.md`, `VIDEO-TRONG-CLIP.md`.

## Bốn núm

| Núm | Khoá trong kịch bản | Thang | Làm gì |
|---|---|---|---|
| Làm nhoè | `soft` | 0–5 | Đẩy món ra sau bằng cách làm nó nhoè. Hậu cảnh nhoè thì mắt dính vào thứ còn nét ở trước |
| Nét dần khi vào | `softIn` | 0–5 | Vào khung còn nhoè rồi rõ dần — như ống kính vừa lấy nét xong |
| Bóng đổ | `shadow` | 0–5 | Nâng món lên khỏi nền. Bóng bám theo **hình thật** của món nên logo khoét nền vẫn đúng viền |
| Đẩy máy chậm | `push` + `pushOut` | 0–4 | Phóng rất chậm suốt cảnh. Đây là thứ tách một đoạn phim khỏi một tấm ảnh đứng yên |

Thêm một kiểu vào mới: **"Thu lại từ lớn"** (`in.kind = "nen"`) — món vào bằng
cách thu lại từ cỡ lớn hơn, cú đẩy máy quen thuộc của phim. Khác hẳn "Nở ra êm"
(nở từ nhỏ lên).

Cả bốn **áp được cho mọi loại phần tử** — `filter` của trình duyệt không kén
loại, phép nhân vào `scale` cũng vậy. Nên ở đây không có bảng "loại nào nghe"
như `pad`/`gap`; `tools/kiem-hieu-ung.mjs` đo lại điều đó trên cả 24 loại.

## Hai điều cố ý làm cho chặt

**1. Tất cả là BẬC, không phải điểm ảnh.** Cùng lối với khoảng cách: đổi khổ
clip thì hiệu ứng giãn theo chứ không giữ nguyên số px rồi lệch. Thang nằm trong
`scene-player.html` (`MO`, `BONG`, `DAY`), tên bậc nằm trong `schema.js`
(`BAC_NHOE`, `BAC_BONG`, `BAC_DAY`).

**2. Lái bằng `t` của clip, TUYỆT ĐỐI không bằng animation của CSS.** Bộ xuất
video nhảy thẳng tới từng mốc giây, còn animation CSS chạy theo đồng hồ thật —
dùng CSS là cùng một giây mỗi lần xuất lại ra một khung khác nhau. Đây là luật
có sẵn của bộ dựng, phần vá này giữ đúng. `kiem-hieu-ung.mjs` mục 5 canh điều đó
bằng cách nhảy tới cùng một giây theo hai đường khác nhau rồi so kết quả.

## Thay đổi trong `scene-player.html`

Thuần bổ sung — **kiểm chứng bằng phép đo, không bằng lời hứa**: dựng lại cả 11
clip ở ba mốc giây bằng bản cũ và bản mới, **11/11 ra khung hình y hệt từng byte**.

1. Ba thang bậc + hàm `locHinh()` đặt ngay sau `sp`.
2. Trong `applyEl`: nhân thêm `day` vào phép phóng, và chỉ ghi `filter` khi phần
   tử **có khai** hiệu ứng — cảnh nặng nhất có 229 phần tử, ghi chuỗi rỗng vào cả
   229 nút mỗi khung hình là phí không cần.
3. Thêm `nen` vào bảng `MOTION`.

Bốn khoá `soft` / `softIn` / `shadow` / `push` đã kiểm: **chưa clip nào dùng**,
nên không đụng dữ liệu của ai. Khoá `blur` cũ của món video giữ nguyên, không
liên quan — nó là px trên thẻ `<video>` bên trong, còn `soft` là bậc trên cả nút.

## Khôi phục

```bash
cp .hub-video-backups/scene-player/2026-09-11T165520/scene-player.html \
   /home/coder/workspace/projects/clipVibehost/hosting-animatic-production/scene-player.html
```

Bản gốc md5 `4dd3af38227bc5bb22fa451a9aeaa1af`.

Khôi phục xong thì **núm vẫn còn trong bảng thuộc tính mà hiệu ứng biến mất** —
hỏng lặng lẽ, không báo gì. `tools/kiem-hieu-ung.mjs` mục 1 đọc thẳng
`scene-player.html` để bắt đúng ca đó.

## Kiểm

```bash
node tools/kiem-hieu-ung.mjs
```

Soi cả hai đầu: đọc bộ dựng xem ba thang bậc còn đó và **dài đúng bằng** tên bậc
khai trong schema; rồi dựng cảnh thật và đo `filter`/`transform` qua Chromium
trên cả 24 loại.

## Chi phí lúc xuất video

`drop-shadow` là phép lọc tốn máy. Đổ bóng cho vài món thì không thấy gì, nhưng
đừng bật cho hàng trăm phần tử trong một cảnh — bộ xuất chụp từng khung, nên chi
phí nhân lên theo số khung. Chưa đo con số cụ thể; nếu thấy xuất chậm hẳn thì đó
là chỗ đầu tiên nên ngó.
