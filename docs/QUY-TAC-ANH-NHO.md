# Quy tắc ảnh nhỏ — áp cho mọi clip

Bảng lớp bên trái hiện một ô ảnh 34px cho từng thành phần, như bảng lớp của
Photoshop. Ô đó phải cho thấy **món này trông thế nào lúc trình chiếu** —
đúng màu, đúng nền, đúng dáng — chứ không chỉ chứng minh là "có dựng gì đó".

Quy tắc nằm trong [`web/anhnho.js`](../web/anhnho.js) và áp **tự động cho mọi
clip**: mở clip nào, đổi cảnh nào, cũng đi qua đúng một đường là
`layers.js → anhNho.datKichBan(doc)`. Không có clip nào được miễn, không có
danh sách ngoại lệ.

## Vì sao phải có quy tắc

Trước đây mỗi ô tự xoay xở, và kết quả là **156 ô trắng y hệt nhau** trên
`thu-ve-lai-s02` — trong khi mọi phép kiểm đều qua: ô CÓ nội dung, ảnh CÓ tải
được, tỉ lệ ĐÚNG là thu nhỏ. Đó là kiểu hỏng tệ nhất: trông như đã chạy.

Lỗi thật không phải ở màu hay ở cỡ, mà ở **chỗ đặt**. Bản sao giữ nguyên
`left/top` nội tuyến của bộ dựng, nên nó nằm ở đúng chỗ của nó trong khung
1280×720 — tức là ngoài hẳn cái ô 34px rồi bị cắt mất. Clip `cta` trông vẫn ổn
chỉ vì mọi món của nó khai `x:0, y:0` và để bộ dựng tự xếp chỗ.

## Bảy điều

| # | Điều | Lỗi thật nó chặn |
|---|------|------------------|
| 1 | **Đặt giữa ô bằng `style` nội tuyến** | Lớp `.giua{left:50%}` không thắng nổi `style="left:72px"` → bản sao nằm ngoài ô |
| 2 | **Nền theo thứ tự vẽ, không theo `--bg`** | `--bg` không tồn tại → rơi về màu nền của chính trang sửa; chữ trắng trong thanh điều hướng đen bị xem trên nền sáng |
| 3 | **Chữ thu theo chiều cao, cắt bề ngang** | Chữ 112×12 thu vừa cả hai chiều còn 3,5px — một vệt xám |
| 4 | **Sợi mảnh dày ít nhất 2px** | Đường kẻ 585×4 thu vừa ô còn 0,2px — trình duyệt vẽ ra hư không |
| 5 | **Không bao giờ trả về ô trống** | Món trong suốt (nền sinh hoạ tiết, vệt sáng, cụm rỗng) được viền nét đứt |
| 6 | **Chữ neo theo chiều đọc** | "Trang chủ" nằm trong ô rộng 112px căn trái; neo giữa ô là ống kính rơi vào nửa sau — trống trơn |
| 7 | **Đo bản gốc, không đo bản sao** | Cụm ra 0×0 (con nằm tuyệt đối) → phóng gấp 4 tràn ra ngoài; ảnh chưa tải xong ra kích thước chỗ giữ → hai logo `cta` phóng gấp đôi |

## Nền dưới một món: dùng chung với phép soát

Điều 2 gọi `banDoNen()` của [`web/soat.js`](../web/soat.js) — **cùng một hàm**
mà phép soát chất lượng dùng để bắt lỗi "chữ chìm vào nền". Hai nơi không bao
giờ được nói khác nhau: bảng soát kêu chữ nằm trên khối đen thì ô ảnh cũng phải
vẽ chữ đó trên nền đen.

Nền của một món = khối màu vẽ **ngay trước** nó và **bao lấy** nó, theo đúng
thứ tự trong mảng. Khối đứng *sau* là vật che, không phải nền — lẫn hai thứ này
là báo sai hàng loạt (xem chú thích trong `soat.js`).

Tách hàm này ra không đổi một chữ nào trong kết quả soát: đối chiếu 216 lời báo
trên cả 11 clip, bản mới y hệt bản cũ.

## Kiểm

```bash
node tools/kiem-anh-nho.mjs
```

Mục 5 là chốt chặn của quy tắc, chạy trên ba clip (`cta`, `thu-ve-lai-s02`,
`thu-trien-khai-html`) và đo **chỗ đặt**, không đo sự tồn tại:

- phần bản sao lọt vào trong ô phải ≥ 80% phần *lẽ ra* lọt được;
- không ô nào phóng quá trần 4×;
- màu nền của ô phải khớp `banDoNen` từng món.

Bỏ riêng điều 1 ra rồi chạy lại thì **42/46 ô rớt** — phép kiểm này bắt đúng
lỗi đã sinh ra nó.

## Clip đời cũ không có bảng lớp

12 trong 23 mục của ô chọn clip là file `.html` rời, không phải kịch bản JSON.
Chúng không có `scenes` nên bảng lớp trống — đó không phải lỗi của quy tắc này,
và cũng chưa sửa trực tiếp được.
