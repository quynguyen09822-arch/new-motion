# TASKS

## Xong

- [x] Xem clip, chạy/dừng/tua · nút Dừng thật (`docs/DUNG-CHAY.md`)
- [x] Bấm chọn trên khung hình, kéo thả, khung chọn có chấm kéo
- [x] Bảng thuộc tính ~86 núm riêng + núm chung
- [x] Hướng dẫn tại chỗ cho 105 núm (`docs/HUONG-DAN-TAI-CHO.md`)
- [x] Bảng lớp kiểu Photoshop + ảnh nhỏ từng món (`docs/QUY-TAC-ANH-NHO.md`)
- [x] Lọc thành phần theo tên (gõ không dấu cũng ra)
- [x] Nền video trong clip (`docs/VIDEO-TRONG-CLIP.md`)
- [x] Khe media: ảnh/phim trong màn hình điện thoại và cửa sổ trình duyệt
- [x] Hiệu ứng hình: nhoè, nét dần, bóng đổ, đẩy máy chậm (`docs/HIEU-UNG-HINH.md`)
- [x] Đệm trong / khe hở — bỏ 16 núm chết, mở 10 núm bị giấu (`docs/DEM-KHE.md`)
- [x] Ctrl + lăn chuột phóng khung làm việc
- [x] Kéo đổi bề rộng hai cột (`docs/KEO-COT.md`)
- [x] Dựng lại giao diện theo bản Stitch (`docs/GIAO-DIEN.md`)
- [x] Clip đời cũ: chỉ xem nhưng chạy và tua được
- [x] Đổi khổ hình cùng tỉ lệ (`docs/DOI-KHO-HINH.md`)
- [x] Chặn lệch schema giữa ba nơi (`docs/CHAN-LECH-SCHEMA.md`)
- [x] Soát chất lượng + xuất video + kho video
- [x] **Đóng gói triển khai**: Dockerfile, dữ liệu clip gói kèm, `/health`

## Đang xếp hàng

- [ ] **Lát 1** — bảng dữ liệu cho cả cảnh: lọc, sửa ô, sửa hàng loạt *(4,8h AI)*
- [ ] **Lát 2** — sửa 4 trường danh sách con: `form.fields`, `quydao.chips`,
      `pointer.path`, `pointer.clicks` *(2,4h AI)* — đang là nợ trong `kiem-schema`
- [ ] **Lát 3** — bảng soi ràng buộc *(4h AI)*
- [ ] **B1** — chuyển clip dựng tay sang `place` để đổi tỉ lệ nào cũng chạy *(4h AI)*
- [ ] Xuất video trên bản triển khai (cần `ffmpeg` + Chromium trong ảnh)

## Nợ kỹ thuật

Xem [`../FIX-BACKLOG.md`](../FIX-BACKLOG.md). F2 đã xong; F1 (bước-frame khi xuất)
đã đo sẵn bảy điểm, chưa làm.
