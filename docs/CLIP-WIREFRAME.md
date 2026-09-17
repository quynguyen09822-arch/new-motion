# Clip mẫu `wireframe-thu`

Clip thử nghiệm dựng theo lối **wireframe → mockup**: kể đúng cái nghề mình đang
làm, từ mấy khung xám trống tới màn hình có nội dung.

```bash
node tools/ve-wireframe.mjs          # chỉ soát, không ghi
node tools/ve-wireframe.mjs --ghi    # ghi ra scenes/wireframe-thu.json
```

**6 cảnh · 24 giây · 1280×720**

| Cảnh | Nội dung |
|---|---|
| 1 | Bắt đầu từ *khung xám* — cửa sổ trình duyệt trống, chỉ có vạch giả |
| 2 | Đặt khối trước, *chữ sau* — thẻ có tiêu đề chưa viết |
| 3 | Điền nội dung *thật vào* — biểu mẫu có giá trị thật |
| 4 | Đổi khung, *bố cục tự theo* — điện thoại + trình duyệt cạnh nhau |
| 5 | Rồi mới tính *nhịp* — dòng thời gian 5 mốc |
| 6 | Wireframe xong, *mới tô màu* — logo kết |

## Hai điều cố ý

**1. Mọi món ngoài cùng khai `place`, không khai toạ độ.**
Nên clip này **đổi khổ nào cũng chạy** — đo thật ở ba khổ:

| Khổ | Kết quả |
|---|---|
| 16:9 · 1280×720 | 26 món · **0 món thò ra ngoài** |
| 9:16 · 1080×1920 | 26 món · **0 món thò ra ngoài** |
| 1:1 · 1080×1080 | 26 món · **0 món thò ra ngoài** |

Khác hẳn 96,8% số món trong các clip cũ đang khai toạ độ cứng
(`docs/DOI-KHO-HINH.md`). Đây là bản mẫu cho cách dựng clip **mới** trong repo.

**2. Bảng màu toàn xám.**
Wireframe là lúc **chưa** quyết màu. Để nguyên bộ màu thương hiệu thì nó thành
bản demo sản phẩm, không còn là wireframe nữa.

## Đã soát bằng thẩm quyền thật

- `validateScene` của `clipvibe-studio/src/scene/types.ts`: **hợp lệ, 0 lỗi**
  *(kiểm luôn rằng hàm ấy có thật và thật sự chê được — thử một tài liệu hỏng
  cố ý thì nó kêu đúng 4 lỗi meta)*
- `soatChatLuong`: **0 lời báo**, không nặng không nhẹ
- Dựng thật 6 cảnh bằng Chromium: **0 lỗi JS**

Clip cũng được gói vào `clip/scenes/` nên bản triển khai trên mạng thấy được.
