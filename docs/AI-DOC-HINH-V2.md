# AI đọc hình → dựng cảnh — làm lại cho ra sản phẩm dùng được

> Soạn 21/09/2026, sau khi Quý nói: *"con AI nó đọc hình phân tích ra bị quá dở,
> không sát với hình gốc, như là làm ra sản phẩm không đạt chất lượng 80%."*
>
> **Bản HƯỚNG ĐI, chưa sửa gì.** Mỗi việc có prompt sẵn để chạy sau.

---

## Tin tốt: phần lớn chỗ dở nằm trong LỜI NHẮC, không phải ở model

Em đọc `server/dungcanh.js` (173 dòng). Có **ba câu trong lời nhắc đang cấm AI
làm đúng cái Quý muốn** — không phải model kém, mà mình dặn nó làm khác.

### ① Lời nhắc CẤM dùng màu của ảnh

```
MÀU CỦA CLIP (dùng lại, đừng chế màu mới):
  nền #f3f4f7 · chữ #161f3c · nhấn #2f6bff
```

AI đang bị bắt **bỏ qua màu trong ảnh** và dùng bảng màu của clip. Nên kết quả
không bao giờ giống ảnh gốc về màu — đúng hai gạch đầu dòng *"màu sắc tương
đồng"* và *"màu nền tương tự nội dung trong hình"* của Quý.

Đây là **một câu**, và nó là nguyên nhân lớn nhất.

### ② Lời nhắc CẤM dùng ảnh

```
6. Ảnh: chỉ dùng `image` khi CHẮC CHẮN có file đó trong dự án. Không đoán tên
   file. Không chắc thì thay bằng `panel` hoặc `huyhieu`.
```

Mà AI thì **không bao giờ chắc**, nên mọi tấm hình trong ảnh gốc đều bị hạ thành
một khối màu phẳng. Đây là lý do bản dựng ra "trông không giống" dù bố cục đúng.

Luật này không sai lúc viết — đoán tên file thì ra món hỏng. Nhưng cách chữa là
**cho AI một kho ảnh có thật để chọn**, chứ không phải cấm nó dùng ảnh.

### ③ Padding: bắt quy đổi mà không đưa bảng quy đổi

```
3. `pad` và `gap` là BẬC THANG 0..7, KHÔNG phải pixel. Viết 24 vào đó là sai.
```

Lời nhắc nói "không phải pixel" nhưng **không hề nói bậc nào là bao nhiêu pixel**.
AI phải đoán. Bảng thật nằm trong bộ dựng:

```js
const STEP = [0, 4, 8, 12, 16, 24, 32, 48];   // bậc 0..7
```

Đưa bảng này vào lời nhắc là AI đo pixel trong ảnh rồi chọn được đúng bậc — đúng
gạch đầu dòng *"đúng các padding có trong hình"*.

---

## Hai chỗ hổng về cấu trúc, không chữa bằng lời nhắc được

### ④ Sinh xong KHÔNG ai đối chiếu lại với ảnh

Vòng lặp hiện tại chỉ sửa khi **sai định dạng** (`validateScene`):

```
sinh → soát định dạng → sai thì sửa MỘT lượt → trả về
```

Không có bước nào **dựng cảnh ra hình rồi so với ảnh gốc**. Nên AI không bao giờ
biết mình vẽ lệch — nó đoán một phát rồi thôi. Đây là lý do chất lượng đứng yên
ở mức "tàm tạm", sửa lời nhắc mấy cũng chỉ lên được một đoạn.

### ⑤ Không có bài kiểm nào cho việc này

`tools/` có 34 bài kiểm, **không bài nào đo chất lượng dựng cảnh**. Nên "dở" là
một cảm giác, không phải một con số — và không có cách nào biết sửa xong có khá
hơn thật không, hay chỉ khác đi.

**Đây là chỗ em đề nghị làm TRƯỚC TIÊN.** Không có thước thì mọi việc sau là đoán.

---

## Thứ tự đề nghị

### Việc 0 · Thước đo `[P0 · 1 ngày]` — làm trước, không bỏ qua

Dựng `tools/kiem-dung-canh.mjs`: đưa vào một bộ ảnh mẫu, để AI dựng, **dựng cảnh
đó ra hình bằng chính bộ dựng**, rồi đo so với ảnh gốc:

| Đo cái gì | Bằng cách nào |
|---|---|
| Giống nhau về bố cục | SSIM giữa ảnh gốc và khung hình dựng ra |
| Giống nhau về màu | so biểu đồ màu, và so 5 màu nổi nhất |
| Đủ chữ | bóc chữ trong ảnh gốc, đối chiếu với chữ trong cảnh sinh ra |
| Padding đúng | đo khoảng cách thật trong khung hình dựng, so với ảnh gốc |

Ra một **điểm phần trăm**. Lúc đó "80%" của Quý thành thứ đo được, và mỗi lần
sửa đều biết lên hay xuống.

**Prompt:**
```
Đọc docs/AI-DOC-HINH-V2.md và CLAUDE.md. Làm Việc 0, chỉ Việc 0, rồi dừng báo cáo.

Dựng tools/kiem-dung-canh.mjs: cho AI dựng cảnh từ một bộ ảnh mẫu, dựng cảnh
ra hình bằng scene-player thật, rồi chấm điểm so với ảnh gốc (bố cục, màu,
đủ chữ, padding). In ra điểm từng mục và điểm tổng.
Bộ ảnh mẫu để trong tools/anh-mau/, chọn 3-5 ảnh đại diện.
Bài kiểm này TỐN TIỀN (gọi AI) nên KHÔNG đưa vào `npm run kiem` mặc định —
chạy riêng khi cần đo.
Trước khi code, cho anh xem cách chấm điểm từng mục.
```

### Việc 1 · Gỡ ba chỗ cấm sai trong lời nhắc `[P0 · nửa ngày]`

- **Màu:** đổi từ "dùng màu clip, đừng chế màu mới" sang "**đọc màu từ ảnh**;
  màu của clip chỉ là gợi ý khi ảnh không rõ".
- **Padding:** đưa bảng `STEP = [0,4,8,12,16,24,32,48]` vào lời nhắc, dặn đo
  pixel trong ảnh rồi chọn bậc gần nhất.
- **Chữ:** dặn rõ **chép đủ chữ thấy trong ảnh**, không tóm tắt, không bịa thêm.

Làm sau Việc 0 để **đo được** nó lên bao nhiêu.

### Việc 2 · Vòng đối chiếu với ảnh gốc `[P0 · 1–2 ngày]` — chỗ ăn điểm lớn nhất

Đổi vòng lặp thành:

```
sinh → soát định dạng → DỰNG RA HÌNH → đưa AI xem CẢ HAI ảnh
     → "chỗ nào lệch, sửa lại" → tối đa 2 lượt
```

Hạ tầng đã có sẵn gần hết: `/api/canh-mau` biết biến một cảnh thành trang cho bộ
dựng, và `tools/xuat-nhanh.mjs` biết chụp khung hình. Chỉ cần nối lại.

Đây là thứ đưa chất lượng từ "đoán một phát" lên "vẽ rồi sửa" — cách người thật
làm việc.

### Việc 3 · Kho ảnh cho AI chọn `[P1 · 1 ngày]`

Thay vì cấm AI dùng ảnh, **đưa nó danh sách ảnh có thật** trong dự án kèm mô tả
ngắn, cho nó chọn theo nội dung. Đúng ý *"hình ảnh đi theo phải mô tả được với
text trong khung"*.

Ba bậc, làm từ dễ tới khó:
1. **Chọn trong kho có sẵn** — liệt kê `public/image/`, AI chọn theo tên + nội dung
2. **Chỗ chờ ảnh** — AI đánh dấu "ở đây cần một tấm ảnh về X", người dùng thả vào
3. **Sinh ảnh** — gọi AI sinh ảnh cho đúng ô đó (tốn tiền, để sau cùng)

### Việc 4 · Đồng bộ chuyển động giữa các cảnh `[P1 · 1 ngày]`

`dungCanh()` hiện chỉ nhận **một cảnh**, không biết gì về các cảnh khác trong
clip. Nên nhịp vào/ra mỗi cảnh một kiểu. Cách chữa: đưa thêm **nhịp của các cảnh
đã có** vào lời nhắc, và dặn giữ cùng một bộ `in`/`ease`/`dur`.

### Việc 5 · Tách lớp từ ảnh `[P2 · nghiên cứu trước, chưa hẹn]`

Quý muốn thử tách từng thành phần trong hình ra thành lớp riêng, như Canva.

Cần **tìm hiểu trước rồi mới ước lượng** — đây là bài toán thị giác máy tính
thật, không phải một lời nhắc. Ba hướng đáng thử, xếp theo mức khả thi:

1. **Gemini trả về khung bao (bounding box)** cho từng món. Model hiện đã làm
   được việc này; rẻ nhất, và hợp với app vì mình cần **toạ độ**, không cần cắt
   ảnh ra thật.
2. **Cắt ảnh theo khung bao** rồi để từng mảnh làm `image` riêng — ra đúng "lớp"
   theo nghĩa Canva, nhưng sinh ra hàng chục file ảnh mỗi cảnh.
3. **Tách nền bằng mô hình chuyên dụng** (SAM, rembg…) — mạnh nhất, nhưng cần
   gói phụ thuộc nặng, đi ngược luật "không gói phụ thuộc" của repo này.

Em nghiêng về **hướng 1**: mình đang dựng lại bố cục bằng thành phần có sẵn, nên
cái cần là biết *món gì nằm ở đâu, to bằng nào* — chứ không phải mảnh ảnh cắt rời.

---

## Gộp lại

| | Việc | Vì sao |
|---|---|---|
| 0 | Thước đo | Không có số thì mọi việc sau là đoán |
| 1 | Gỡ 3 chỗ cấm sai trong lời nhắc | Rẻ nhất, và đang chặn đúng thứ Quý cần |
| 2 | Vòng đối chiếu với ảnh gốc | Ăn điểm lớn nhất, đổi cách làm chứ không chỉnh lời |
| 3 | Kho ảnh cho AI chọn | "Hình ảnh mô tả được nội dung" |
| 4 | Đồng bộ chuyển cảnh | Nhịp thống nhất cả clip |
| 5 | Tách lớp | Nghiên cứu trước, chưa hẹn |

**Làm 0 rồi 1 trước.** Cộng lại khoảng một ngày rưỡi, và xong là có con số để
biết mình đang ở đâu so với mốc 80% Quý đặt ra.
