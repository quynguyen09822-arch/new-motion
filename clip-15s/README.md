# Video hub Mắt Bão — 15 giây, 16:9

Motion graphic 1920×1080, 15.0 giây, 24fps, có hiệu ứng âm thanh (không nhạc).
Đây là **Scene 3** của brief `ORDER_VIDEO_MATBAO_v2.md` (video 2:20, 5 scene) —
tương ứng khung số 6 trong storyboard.

## Cách dựng: lai ghép AI + code

AI video không viết được chữ tiếng Việt có dấu và không vẽ lại được logo thật.
Nên chia vai rạch ròi:

| Phần | Công cụ |
|---|---|
| Nền: lưới số, tia quang học, hạt sáng, chiều sâu | Seedance 2.0 (Higgsfield) |
| Toàn bộ sơ đồ: logo, 4 node, icon, đường nối, gói dữ liệu, chữ | Python + Pillow (`diagram.py`) |
| Hiệu ứng âm thanh | Mirelo Text to Audio, cắt và trộn bằng ffmpeg |

Nhờ tách bạch, nhãn chữ luôn khớp đúng vị trí node — không gặp bài toán canh
nhãn theo hình AI vẽ ra.

## Nội dung

Nhãn 4 nhánh lấy tên tiếng Việt theo brief; tên sản phẩm để dòng nhỏ bên dưới.

| Nhánh | Vị trí | Nhãn | Sản phẩm |
|---|---|---|---|
| 1 | trên-trái | Định danh thương hiệu | Tên miền · SSL |
| 2 | trên-phải | Hạ tầng lưu trữ | Cloud Server · Hosting |
| 3 | dưới-trái | Tối ưu vận hành | Email · Workspace |
| 4 | dưới-phải | Ứng dụng AI | Vibe Hosting · Sale AI |

Nhánh 4 dùng màu cam nổi hơn 3 nhánh xanh — brief yêu cầu nhấn mạnh mảng AI.

## Nhịp 15 giây

| Giây | Hình | Tiếng |
|---|---|---|
| 0–3 | Logo hiện và đập sáng, vòng sáng lan ra từ tâm | tiếng ù nền |
| 3–8 | 4 nhánh vươn ra lần lượt, node bật vào có độ nảy | 4 tiếng whoosh |
| 8–12 | Đường nối sáng theo chiều kim đồng hồ, gói dữ liệu chạy hub → node | tiếng click dữ liệu |
| 12–15 | Lắng lại, logo sáng hơn, slogan hiện | tiếng chuông nhẹ |

## Màu

Lấy trực tiếp từ file logo `.claude/public/image.png` để mọi thứ khớp nhau:

| Vai trò | Mã |
|---|---|
| Đỏ thương hiệu (chữ MATBAO) | `#E3272C` |
| Cam thương hiệu (vòng xoáy, nhánh AI) | `#ED7225` |
| Nền navy | `#0A1F3C` |
| Đường nối / 3 nhánh còn lại | `#00A3FF` |

⚠️ Brand Guidelines trong brief ghi `#D42020` / `#E07020` — **lệch nhẹ với màu
thật trong file logo**. Đã ưu tiên file logo.

## File

- `matbao-hub-15s.mp4` — bản hoàn chỉnh
- `diagram.py` — script vẽ lớp sơ đồ (sửa chữ, màu, nhịp ở đây rồi chạy lại)

## Sửa lại

Lớp sơ đồ và chữ **không tốn credit** — đổi câu chữ, cỡ chữ, vị trí, màu, thời
điểm xuất hiện đều chỉ cần sửa `diagram.py` rồi render lại. Chỉ khi muốn đổi
**nền** mới phải gọi lại Seedance (135 credit).

## Điểm còn khuyết

**Nền AI có lõi sáng rất mạnh ở tâm** — đặt logo lên là chữ bị nuốt. Đã xử lý
bằng lớp phủ navy mỏng toàn khung + đĩa tối ở tâm + nền mờ sau mỗi nhãn. Nếu
muốn nền dịu hơn nữa thì tăng alpha trong `_build_scrims()`.

**Logo là ảnh bitmap 609×206 px**, không phải vector. Ở khung 1080p thì nét (logo
chỉ rộng ~430px), nhưng làm bản 4K thì nên xin file `.svg`/`.ai` gốc — brief cũng
ghi phải dùng file vector gốc.

**Slogan đang một dòng** "ĐƠN GIẢN HÓA CÔNG NGHỆ" theo đơn đặt. Slogan chính thức
có hai dòng (thêm "TỐI ĐA HÓA THÀNH CÔNG") — muốn thêm thì sửa hằng `SLOGAN`.
