# Kéo đổi bề rộng hai cột

Cột trái và cột phải trước đây khoá cứng 272px và 316px. Với một cảnh có 156
thành phần thì tên món bị cắt gần hết (`Chữ · Tìm tên miền của riêng ...`), còn
lúc soi bảng thuộc tính thì cột phải lại chật. Chỗ nào rộng hẹp bao nhiêu là
việc của người đang làm, không phải của người viết CSS.

Kéo tay nắm giữa hai cột. Bấm đúp để về mặc định. Mũi tên trái/phải xê từng bước
16px khi tay nắm đang được chọn.

## Bốn điều không được bỏ

| Điều | Vì sao |
|---|---|
| **Nhớ lấy** | Kéo xong mà tải lại trang là về như cũ thì thà đừng có. Ghi vào máy, một bộ cho cả ứng dụng |
| **Bàn phím dùng được** | Tay nắm là `separator` có `tabindex` + `aria-label`. Chuột không phải đường duy nhất |
| **Chặn hai đầu** | Mỗi cột 190–560px, và luôn chừa cho khung xem ở giữa ít nhất 420px — kéo tới mức khung hình còn một sợi chỉ thì không có đường quay lại |
| **Vẽ lại lớp phủ** | Xem dưới đây |

## Bẫy: khung chọn lệch khỏi món

Lớp phủ vẽ khung chọn nằm ở **trang cha** và dùng thẳng toạ độ đọc được bên trong
iframe. Khung xem hẹp đi thì bộ dựng bên trong tự thu lại cho vừa, toạ độ ấy đổi
hết — không vẽ lại là khung xanh đứng nguyên chỗ cũ, lệch khỏi món.

Chỗ tinh vi: **gọi vẽ lại ngay lúc kéo là chưa đủ.** Bộ dựng trong iframe chỉ thu
lại khi *chính nó* nhận sự kiện đổi cỡ, và việc đó xảy ra **sau** nhịp hình của
trang cha. Gọi ngay là đo phải cỡ cũ — đo thật ra **lệch 4,3×1,7px**, đủ để nhìn
thấy mà không đủ để ngờ. Nay dùng `ResizeObserver` trên khung xem rồi chờ hai
nhịp hình cho bên trong lắng xuống mới đo.

## Bẫy thứ hai, nằm trong chính bài kiểm

Mục "kéo xong khung chọn vẫn ôm đúng món" lúc đầu chạy trên clip `cta` — và nó
**báo qua kể cả khi gỡ hẳn lời gọi vẽ lại**. Lý do: `cta` là clip **dọc**
720×1280, trong khung xem nó vừa theo *chiều cao*; bóp hẹp cột giữa thì hệ số thu
không đổi, nên khung chọn đứng yên vẫn đúng.

Nay mục đó chạy trên `thu-ve-lai-s02` (1280×720, vừa theo *chiều ngang*). Gỡ lời
gọi vẽ lại ra thì lệch ngay **2,4×21,2px** — phép kiểm bắt đúng lỗi sinh ra nó.

Bài học chung: **chọn dữ liệu thử sao cho lỗi CÓ THỂ hiện ra.** Một phép kiểm
chạy trên ca mà lỗi không thể xảy ra thì chỉ là một dòng xanh cho vui.

## Kiểm

```bash
node tools/kiem-keo-cot.mjs
```
