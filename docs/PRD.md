# PRD — Trình sửa clip Mắt Bão (matbao-hub-video)

## Vấn đề

Clip quảng bá của Mắt Bão dựng bằng **kịch bản JSON** rồi cho một bộ dựng
(`scene-player.html`) diễn ra hình. Sửa một chữ, dời một khối, đổi một màu —
tất cả đều phải **mở file JSON ra gõ tay**. Người viết nội dung không làm được;
mỗi lần đổi một dòng chữ lại phải nhờ người kỹ thuật.

## Mục tiêu

Cho người **không chuyên kỹ thuật** sửa clip bằng chuột: bấm vào thành phần
trên khung hình rồi chỉnh thẳng, thấy kết quả ngay, hoàn tác được, không bao giờ
phải nhìn thấy JSON.

## Người dùng

| Ai | Dùng để làm gì |
|---|---|
| Marketing / nội dung | sửa chữ, đổi màu, đổi ảnh, đổi nhịp, xuất video |
| Thiết kế | căn chỉnh bố cục, hiệu ứng, khổ hình |
| Kỹ thuật | thêm loại thành phần mới, sửa bộ dựng |

## Phạm vi

**Có:**
- Xem clip, chạy/dừng/tua; phóng to khung làm việc bằng Ctrl+lăn
- Chọn thành phần trên khung hình hoặc trong bảng lớp (có ảnh nhỏ từng món)
- Sửa ~86 thuộc tính riêng + núm chung, mỗi núm có hướng dẫn tại chỗ
- Chuyển động vào/ra, nhịp, khoảng cách, màu, hiệu ứng hình (nhoè, bóng đổ, đẩy máy)
- Nền ảnh và **nền video**; thả ảnh/phim vào màn hình điện thoại và cửa sổ trình duyệt
- Đổi khổ hình cùng tỉ lệ (720p ↔ 4K)
- Soát chất lượng: chữ chìm nền, nhịp sai, video chưa chọn file
- Xuất video, xem lại kho video đã xuất
- Clip đời cũ (`.html`): chỉ xem, nhưng chạy và tua được

**Không có:**
- Âm thanh (bộ dựng không có)
- Chỉnh màu chuyên sâu (LUT, vòng Lift/Gamma/Gain)
- Đổi khổ khác tỉ lệ — xem `docs/DOI-KHO-HINH.md` để biết vì sao
- Nhiều người sửa cùng lúc

## Đo thành công

1. Người không rành kỹ thuật sửa xong một clip mà không mở file JSON lần nào.
2. Mọi thao tác hoàn tác được; không thao tác nào làm hỏng clip vĩnh viễn.
3. Bảng soát không báo oan — báo sai một lần là người dùng bỏ qua cả lời báo đúng.

## Ràng buộc

- **Không gói phụ thuộc, không bước dựng.** Vanilla ESM + `node:http`.
- **Bộ dựng `scene-player.html` là của dự án chung** — sửa phải sao lưu trước và
  ghi lại trong `docs/`, kèm lệnh khôi phục.
- Câu chữ tiếng Việt đời thường, không từ kỹ thuật.
