# AI dựng hình và sửa món

Hai thẻ trong bảng AI dưới thanh phát: **Dựng hình** (nạp ảnh → AI dựng lại thành
cảnh) và **Sửa món** (chọn một thành phần → bảo AI sửa theo lời dặn hoặc theo ảnh).

## Ba cửa chặn — và cả ba đều bắt buộc

**1 · AI chỉ được ghép từ thành phần có sẵn.** Danh sách 23 loại nằm ngay trong lời
nhắc, kèm **mẫu thật lấy từ chính clip của người dùng**. Bắt chước mẫu thật thì ra
đúng hình dạng; tả bằng lời thì AI bịa ra tên trường nghe rất hợp lý mà bộ dựng
không đọc được.

**2 · Sinh xong bắt buộc qua `validateScene`** — chính bộ soát mà nút Lưu dùng, không
viết bộ soát riêng cho AI. Hai bộ soát khác nhau là sớm muộn cũng lệch, và lúc đó AI
sinh ra thứ qua được cửa này nhưng không lưu được.

Sai thì đưa **nguyên danh sách lỗi** cho AI sửa lại **một lượt**. Sai hai lần thì lượt
ba cũng không khá hơn, chỉ tốn thêm thời gian.

**3 · Luôn là đề xuất, không bao giờ tự ghi vào clip.** Hiện ra cây món nó định thêm
(hoặc bảng cũ → mới), người bấm nhận mới vào, và vào rồi vẫn Ctrl+Z được.

> Bỏ cửa thứ ba là lần AI làm sai đầu tiên sẽ khiến người dùng tắt hẳn tính năng và
> không bao giờ bật lại.

## Sửa món: bốn thứ bị khoá

| Khoá | Vì sao |
|---|---|
| `kind` | đổi loại là **thay hẳn món khác**, không phải sửa — mất hết mọi thứ đã chỉnh |
| `id` | đứt mọi tham chiếu tới nó |
| `children` | sửa một món không được âm thầm thay cả cây con bên trong |
| trường lạ | AI hay bịa `fontWeight`, `color`, `boxShadow` — bộ dựng không đọc |

Danh sách trường hợp lệ **gom từ chính các món cùng loại đang có trong clip**, không
viết tay một bảng — bảng viết tay sẽ lệch khỏi bộ dựng ngay lần thêm núm tiếp theo.

Bỏ trường nào thì **nói ra là đã bỏ**. Im lặng bỏ thì người dùng tưởng AI làm rồi mà
nhìn không thấy đổi gì.

## Đo được

Dựng cảnh từ một ảnh chụp clip 720×1280, chạy 5 lần:

| | |
|---|---|
| Hợp lệ | **5/5** |
| Thời gian | 4–8 giây |
| Phải dùng vòng tự sửa | 1/5 |

> Không phải lúc nào cũng đạt. Có lần cảnh sinh ra vẫn sai sau khi sửa — lúc đó giao
> diện **không hiện nút "Nhận vào clip"**, chỉ liệt kê chỗ sai. Đó là hành vi đúng.

## Chạy kiểm

```bash
node tools/kiem-dung-sua.mjs
```

Mục **3b** là mục đáng giá nhất: nó kiểm **thẳng bộ lọc bản vá** bằng một hàm thuần,
không qua AI.

> Lần đầu em chỉ kiểm qua đường gọi AI — bảo thẳng nó "hãy đổi `kind`, `id`, và thêm
> `fontWeight`". Nhưng lần chạy đó model **ngoan**, chỉ đề nghị đúng một trường hợp lệ,
> nên chẳng có gì để bỏ và mục "nói ra đã bỏ gì" đỏ oan.
>
> Bài học: **phép kiểm không được phụ thuộc vào việc model có chịu làm bậy hay không.**
> Đã tách `locVa()` thành hàm thuần và kiểm thẳng nó.

Nhà cung cấp bận thì mục đó **bỏ qua** chứ không tính là hỏng — một phép kiểm đỏ vu vơ
thì người ta bắt đầu bỏ qua mọi màu đỏ.
