# Đệm trong & khe hở — hai núm, hai lỗi lặng lẽ

Khoảng cách trong clip **không đo bằng điểm ảnh**. Bộ dựng khai theo **bậc 0..7**,
quy ra px qua thang `[0, 4, 8, 12, 16, 24, 32, 48]` rồi nhân với "độ thoáng cả
clip". Nhờ vậy một núm `density` giãn hết mọi khoảng thở mà bố cục không vỡ.

| Bậc | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Tên | Sát | Rất hẹp | Hẹp | Vừa | Thoáng | Rộng | Rất rộng | Tối đa |
| px (density 1) | 0 | 4 | 8 | 12 | 16 | 24 | 32 | 48 |

## Ba lỗi đã sửa

**1. Mười sáu núm chết.**
Bảng thuộc tính bày "Đệm trong" cho **cả 24 loại**, trong khi bộ dựng chỉ đọc
`pad` ở **8 loại**. Mười sáu núm còn lại bấm vào thì số trong kịch bản có đổi,
khung hình đứng im. Đây là kiểu hỏng tệ nhất — nó *trông như* đang chạy, và
người dùng mất lòng tin vào cả những núm thật.

**2. Năng lực bị giấu.**
`gap` chạy được ở **11 loại** nhưng chỉ `group` được bày núm. Khe hở giữa các
dòng trong một tấm thẻ là thứ **có thật** mà không ai chỉnh tới được.

**3. Số mặc định nói dối.**
Núm luôn hiện bậc 0 khi kịch bản chưa khai — trong khi tấm thẻ thật đang đệm bậc
5. Người dùng bấm vào bậc 0 tưởng "giữ nguyên" thì thẻ co lại.

## Bảng sự thật

Nằm trong [`web/inspector/schema.js`](../web/inspector/schema.js) — `DEM_TRONG`
và `KHE_HO`. Thêm núm cho loại mới = **viết thêm một dòng**, không đụng UI.

| Loại | Đệm trong | Khe hở |
|---|---|---|
| `group` Cụm | Sát (0) | Thoáng (4) |
| `card` Thẻ | Rộng (5) | Vừa (3) |
| `form` Biểu mẫu | Rộng (5) | Thoáng (4) |
| `calendar` Lịch | Rộng (5) | Vừa (3) |
| `chip` Nhãn số | Thoáng (4) | Rất hẹp (1) |
| `timeline` Dòng thời gian | Hẹp (2) | — |
| `chat` Cửa sổ AI | Thoáng (4) | Vừa (3) |
| `upload` Ô kéo thả | Rộng (5) | Vừa (3) |
| `text` Chữ | — | Vừa (3) |
| `logo` Logo | — | Vừa (3) |
| `shield` Khiên bảo mật | — | Thoáng (4) |
| `hangnhan` Hàng nhãn | — | Thoáng (4) |

Mười hai loại còn lại (`panel`, `image`, `video`, `nut`, `table`, `browser`,
`phone`, `wheel`, `quydao`, `huyhieu`, `sweep`, `nen`) **không nhận cả hai** —
và nay cũng không bày núm nào cho chúng nữa.

## Kiểm

```bash
node tools/kiem-dem-khe.mjs
```

Phép kiểm **ĐO THẬT**, không đọc code mà đoán: dựng một cảnh có đủ 24 loại, vặn
bậc 0 → 7 rồi đo lại `padding`/`gap` của từng nút bằng Chromium. Rồi đối chiếu
hai chiều:

- loại nào nghe được mà bảng **giấu** → rớt (năng lực bị giấu);
- loại nào bảng ghi mà đo ra **không nhúc nhích** → rớt (núm chết);
- bậc mặc định trong bảng phải khớp **đúng số px đo được** khi kịch bản chưa khai.

Nghĩa là bộ dựng của dự án chung đổi hành vi thì bài kiểm biết ngay, chứ không
đợi tới lúc người dùng vặn núm rồi ngơ ngác.

Bài kiểm có vặn núm trên clip thật `kich-ban-thu` rồi hoàn tác; nó **không gọi
Lưu lần nào** và tự xoá bản nháp nó lỡ sinh ra.
