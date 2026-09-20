# PRD — Trình sửa clip Mắt Bão (matbao-hub-video)

> Phần từ đây tới hết mục **Ràng buộc** là bản đầu, viết **16/09/2026**.
> Những gì dựng thêm sau đó ghi ở mục **Đã mở rộng** cuối tài liệu — cố ý
> không sửa đè, để sau này còn đối chiếu dự án phình ra từ đâu.

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
- ~~Âm thanh~~ → đã dựng 17/09, xem phần mở rộng bên dưới
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

---

# Đã mở rộng (17–18/09/2026)

Bản đầu chỉ nhắm một việc: sửa clip bằng chuột thay vì gõ JSON. Việc đó xong thì
dự án đi tiếp hai hướng không có trong bản đầu — **clip có tiếng**, và **AI đỡ
tay cho người dùng** — rồi thành công cụ nhiều người dùng chung trên mạng.

## Âm thanh (17/09)

Trước đó 0/22 clip có tiếng, ghép tiếng phải làm ở phần mềm khác rồi canh khớp
bằng mắt.

- Ba loại rãnh: **lời đọc, nhạc nền, tiếng động**; khai ở gốc kịch bản vì tiếng
  chạy xuyên nhiều cảnh, không thuộc cảnh nào
- Vẽ **sóng âm** để canh khớp bằng mắt
- Trộn tiếng lúc xuất video

Chi tiết: `RANH-TIENG.md`.

## Mốc chuyển động (17/09)

Trước đó mỗi món chỉ có một hiệu ứng vào và một hiệu ứng ra, chọn từ danh sách
có sẵn. Giờ tự đặt mốc cho từng thời điểm — vị trí, độ mờ, độ phóng.

Chi tiết: `MOC-CHUYEN-DONG.md`.

## AI hỗ trợ (18/09)

Đặt ở **thanh dưới đáy màn hình**, không chiếm cột bên phải. AI ở đây là người
phụ việc, không phải nhân vật chính — người dùng vẫn quyết mọi thứ.

| Việc | Dùng để |
|---|---|
| Hỏi về clip đang mở | "cảnh 3 dài quá phải không" |
| Dựng cảnh từ một tấm hình | ném ảnh vào, AI dựng lại thành cảnh sửa được |
| Sửa món đang chọn | theo lời dặn, hoặc theo một ảnh minh hoạ |
| Viết lời đọc | cho clip đã dựng xong |
| Giọng đọc | chọn giọng, **nghe thử**, đọc lời thành file tiếng |

Chi tiết: `THANH-AI.md`, `THIET-KE-AI.md`, `AI-DUNG-SUA.md`, `GIONG-DOC-AI.md`.

## Nhiều người dùng chung (18/09)

- **Đăng nhập** bằng email công ty + một mật khẩu chung. Danh sách tài khoản
  khai thẳng — trước đây cứ đuôi `@matbao.com` là vào được, đó là lỗi, đã vá.
- **Trần chi tiêu ngày** cho những việc tốn tiền (gọi AI, đọc giọng, xuất video)
- **Đếm lượt dùng** — trả lời được "công cụ này có ai dùng không, ai dùng nhiều"
- Logo và trang đăng nhập riêng

Chi tiết: `DANG-NHAP.md`.

## Đưa lên mạng (18/09)

Chạy bằng Docker, đang ở `motion.n1.tinhgon.xyz`. Chi tiết: `TRIEN-KHAI.md`.

## Đo thành công — thêm hai câu

4. **Việc phụ hỏng không được làm hỏng việc chính.** Ghi thống kê lỗi, gọi AI
   hỏng, mạng đứt — việc **lưu clip vẫn phải thành công**. Người dùng mất công
   sửa nửa tiếng, không được mất vì một cái log.
5. **AI không được tự ý đổi thứ người dùng không nhờ.** Sửa món nào thì đúng món
   đó; không đụng tới loại món, mã món, hay các món con.

## Còn chưa có

| Chưa có | Hậu quả hôm nay | Đã xếp lịch |
|---|---|---|
| Hai người sửa **cùng lúc** một clip | đè lên nhau, người lưu sau thắng | M2 |
| Lấy lại bản cũ theo **từng lần sửa** | chỉ có kho sao lưu, không lần ngược từng bước được | M3 |
| **Tạo clip mới** ngay trên web | phải tạo file bằng tay, người không rành không làm được | M4 |
| Xuất video trên bản chạy thật | máy chủ mạng không xuất được, chưa có đường thoát | M5 |
| Chỗ lưu trên bản chạy thật | sửa clip trên mạng xong, triển khai lại là mất phần sửa | — |
| Dòng thời gian nhiều lớp | canh nhiều món chồng nhau vẫn khó | — |
| Chỉnh màu chuyên sâu, đổi khổ khác tỉ lệ | giữ nguyên như bản đầu, cố ý không làm | không làm |

Cột cuối trỏ sang `TIEP-THEO.md`. **M1 (đếm lượt dùng) đã xong 18/09.**

Hai dòng ghi `—` chưa có trong lộ trình nào. Riêng **chỗ lưu** là điều kiện đứng
trước cả M2–M5: chừng nào phần sửa trên mạng còn mất, mấy mục kia làm cũng ít
tác dụng. `TIEP-THEO.md` có nêu ở đầu ("gắn volume") nhưng nhà cung cấp hiện
không cho gắn ổ lưu — đang chờ mở cơ sở dữ liệu thay thế.

## Một điều cần nói thẳng

**Âm thanh và mốc chuyển động đã dựng xong nhưng chưa clip nào dùng** — cả 9 clip
hiện có đều là bản `version 1`, không khai rãnh tiếng, không có mốc. Nghĩa là hai
tính năng này **chạy được nhưng chưa được kiểm chứng bằng việc thật**. Cần dựng ít
nhất một clip có tiếng và có mốc rồi mới coi là xong hẳn.

## Cách tự kiểm

```bash
npm run kiem          # 29 bài, tự dựng máy chủ riêng, không đụng bản đang chạy
```
