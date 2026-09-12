# Hướng dẫn tại chỗ — bong bóng trợ giúp trong bảng thuộc tính

## Vấn đề

Bảng thuộc tính có **105 núm**. Trước đây mỗi núm kèm một dòng chữ xám giải
thích, hiện thường trực. Hệ quả ngược đời: chính lời giải thích thành thứ gây
rối — cuộn mãi không hết, và người dùng vẫn không biết núm nào là núm cần vặn.

Mà 59 trong 83 núm riêng của từng loại phần tử (71%) **chưa có một chữ giải
thích nào**.

## Cách làm

Mỗi núm có một nút hỏi nhỏ cạnh nhãn. Rê chuột hoặc lia phím tới thì hiện bong
bóng: **tiêu đề** (tên + công dụng, dưới 6 từ) và **mô tả** (1–2 câu tả cơ chế,
dưới 35 từ).

Nhờ vậy bảng **gọn hơn trước** chứ không rậm thêm: dòng chữ xám đã chuyển vào
bong bóng. Chỉ còn hai loại được ở lại ngoài:

- **giá trị đang dùng** — `goiSong: true`, ví dụ "0,6 giây" dưới núm Nhanh/chậm;
- **gợi ý của lựa chọn đang chọn** — ví dụ "nền giữ nguyên khi sang cảnh".

## Nội dung nằm ở đâu

Trong `web/inspector/schema.js`, ba bảng:

| Bảng | Cho ai | Khoá |
|---|---|---|
| `HUONG_DAN` | núm riêng của từng loại phần tử | `text.size`, `video.blur`… |
| `HUONG_DAN_CHUNG` | núm bảng tự thêm cho mọi loại | `at`, `dur`, `pad`… |
| `HUONG_DAN_MAU` | sáu màu của cả clip | `bg`, `ink`, `accent`… |

**Thêm hướng dẫn cho một núm = viết thêm một dòng ở `schema.js`, không đụng UI
code.** Đây đúng là §6.1 của `ARCHITECTURE.md` ("Thêm property mới = sửa schema,
không đụng UI code"): `fields.js` tự dựng nút hỏi từ schema.

Khoá `HUONG_DAN` gõ sai tên sẽ **kêu lên trong console** chứ không trôi mất im
lặng, và `tools/kiem-huong-dan.mjs` bắt luôn lời kêu đó.

## Khuôn viết — có máy canh

`tools/kiem-huong-dan.mjs` chặn cứng ba luật, chạy được bằng Node trần:

1. **Mọi núm phải có hướng dẫn** — không núm nào bỏ sót.
2. **Tiêu đề dưới 6 từ, mô tả dưới 35 từ.** Bài kiểm này đã bắt đúng một lần
   người viết (chính tôi) lỡ viết 38 từ.
3. **Không lọt từ kỹ thuật** — `opacity`, `easing`, `padding`, `stagger`,
   `keyframe`, `transform`… Đây là lý do tồn tại của cả công cụ: người dùng
   chính không rành kỹ thuật. Lọt một chữ vào đây là hỏng đúng mục đích của nó.

Ngoài ra bài kiểm mở Chromium thật để chắc: mọi núm đều có nút hỏi **nhìn thấy
được**, bong bóng mở sang trái (bảng là cột hẹp sát mép phải), Escape đóng,
`aria-describedby` gắn vào rồi gỡ ra đúng lúc, và lia phím tới nút là bong bóng
mở.

## Hai cái bẫy đã vấp

1. **Núm bật/tắt ẩn nhãn đi.** Với `kieu: 'bat'`, chữ đã nằm cạnh ô đánh dấu nên
   nhãn trên bị ẩn — nút hỏi gắn ở đó cũng ẩn theo, chuột không thấy mà bàn phím
   cũng không tới được. Nay nó gắn vào cái nhãn đang nhìn thấy.
   Bài kiểm ban đầu **đếm suông** nên lọt; nay nó đòi `offsetParent` khác null.
2. **Núm dựng tay không tự có nút hỏi.** Ba chỗ không đi qua `taoNum` — hai ô
   chọn Bay vào/Bay ra, và ô Cách đặt — phải tự gọi `huongDanChung().gan(...)`.
   Thêm núm dựng tay mới thì nhớ việc này, hoặc bài kiểm mục 3 sẽ báo.

## Còn thiếu

Giai đoạn 3 theo kế hoạch: **micro-demo chạy thật** trong bong bóng cho chừng 12
núm khó nhất — dựng bằng chính bộ dựng (`__clip.load` một kịch bản tí hon) chứ
không quay video, để demo không bao giờ lệch khỏi sản phẩm. Khung `hd-demo`
trong `web/huongdan.js` đã chừa sẵn chỗ.
