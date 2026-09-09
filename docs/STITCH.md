# Stitch — dựng màn hình UI cho clip

MCP Stitch đã cắm vào `.mcp.json` (15 công cụ). Gõ tiếng Việt là dùng được.

## Nó giải bài toán gì của mình

Storyboard các clip VH đang sinh bằng ChatGPT Image — mỗi tấm một lần sinh, nên
**padding, cỡ chữ, màu nút giữa các tấm không khớp nhau**. Ai dựng clip cũng
phải ngồi vá lại bằng miếng che.

Stitch làm khác: khai **một bộ design system** cho cả dự án rồi mọi màn hình
đều theo đúng bộ đó. Đây chính là chỗ nó ăn tiền với mình, không phải chỗ
"sinh ảnh đẹp".

## Trình tự cho một clip mới

1. **Tạo dự án** — mỗi clip một dự án
   > tạo dự án Stitch tên "VH-04 Designer Portfolio"

2. **Khai bộ design system TRƯỚC khi sinh màn nào.** Đây là bước quyết định
   padding và element có đồng nhất hay không.
   > tạo design system cho dự án đó: nền #F6F7F9, chữ gần đen (không dùng
   > #000), màu nhấn tím/indigo cho nút, xanh lá cho trạng thái thành công,
   > đỏ cam chỉ dùng cho cảnh lỗi, font Be Vietnam Pro

3. **Sinh từng màn theo kịch bản** — mỗi cảnh trong file `.md` một màn
   > sinh màn "danh sách dự án, có nút Tạo mới ở góc phải trên"

4. **Ép tất cả về cùng một bộ** sau khi sinh xong — bước hay bị quên
   > áp design system cho toàn bộ màn trong dự án

5. **Chụp màn về** rồi bỏ vào `public/image/hinh-kich-ban-<mã>/`

6. **Dựng clip** theo `QUY-UOC-CLIP.md` để còn chỉnh khung bằng chuột được.

## Vài điều đã biết

- `deviceType` phải khớp khổ clip. Clip ngang thì đặt desktop, clip dọc thì
  mobile — sinh nhầm khổ là phải sinh lại từ đầu.
- Sinh màn **mất vài phút**. Công cụ tự dặn "đừng bấm lại" — cứ chờ.
- `generate_variants` để lấy vài phương án cho một màn, đỡ phải tả lại từ đầu.
- `upload_design_md` + `create_design_system_from_design_md` nếu muốn khai bộ
  màu bằng file thay vì gõ tay — hợp khi cần dùng lại giữa các clip.

## Ranh giới

Stitch dựng **màn hình giao diện**. Nó không dựng chuyển động, không dựng vòng
sáng, không xuất video. Phần đó vẫn là clip HTML + `export-video.mjs` như cũ.

Và theo `STYLE-Motion-VO.md`: một cảnh chỉ một màu nhấn, chữ ít và to, không
gradient chạy, không lấp lánh. Nhắc Stitch điều đó ngay trong design system,
đừng để nó tự do.

## Khoá

Khoá nằm trong `~/workspace/.mcp.json` (quyền 600). **Đừng để trong `.env` của
dự án clip** — `serve.py` phơi thẳng file đó ra HTTP.
