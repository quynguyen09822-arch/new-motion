# Triển khai Motion

## Cần gì

Chỉ cần **Docker**. Ứng dụng **không có gói phụ thuộc nào** — chạy bằng `node:http`
trần, không Express, không bundler, không `node_modules`. Nên không có bước
`npm install`, và cũng không có kiểu hỏng "cài gói thất bại".

## Dựng và chạy

```bash
docker build -t motion .
docker run -d --name motion -p 3000:3000 \
  -e MOTION_DUOI_EMAIL='@matbao.com' \
  -e MOTION_MAT_KHAU_HASH='<băm — xem bên dưới>' \
  -e MOTION_KHOA_PHIEN='<chuỗi ngẫu nhiên 64 ký tự>' \
  motion
```

Mở `http://máy-chủ:3000`.

## Ba biến môi trường của đăng nhập

| Biến | |
|---|---|
| `MOTION_DUOI_EMAIL` | chỉ email đuôi này vào được. Bỏ trống = nhận mọi email. |
| `MOTION_MAT_KHAU_HASH` | mật khẩu **dạng băm**. **Để trống = KHÔNG hỏi mật khẩu**, ai có đường dẫn cũng vào sửa clip. |
| `MOTION_KHOA_PHIEN` | khoá ký vé đăng nhập. |

**Sinh băm mật khẩu** (chạy ở máy, trong thư mục dự án):

```bash
npm run dat-mat-khau        # gõ mật khẩu 2 lần → ghi vào .env
grep MOTION_MAT_KHAU_HASH .env   # chép giá trị sang nơi triển khai
```

**Sinh khoá phiên:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **`MOTION_KHOA_PHIEN` trong container là BẮT BUỘC.** Để trống thì máy chủ tự sinh
> rồi ghi vào `.env` — mà container không giữ file giữa hai lần khởi động, nên mỗi
> lần restart là **mọi người bị đá ra** và phải đăng nhập lại.

> **Đừng đóng `.env` vào ảnh.** `.dockerignore` đã chặn. Khai bằng biến môi trường
> của nơi triển khai — ảnh Docker thì ai kéo về cũng đọc được từng lớp.

## Bản triển khai làm được gì, KHÔNG làm được gì

| | |
|---|---|
| ✅ | mở/sửa/lưu clip · hoàn tác · soát chất lượng · rãnh tiếng · mốc chuyển động |
| ✅ | đăng nhập · toàn bộ khung AI (hỏi AI · giọng đọc · dựng hình · sửa món) |
| ❌ | **xuất video** — cần `ffmpeg` và Chromium, ảnh này không có |

Bấm "Xuất video" trên bản triển khai sẽ nhận câu báo rõ ràng: *"Bản này không dựng
video được — thiếu ffmpeg và trình duyệt Chromium. Hãy mở dự án trên máy làm việc
rồi xuất ở đó."* — không phải một lỗi khó hiểu.

**Muốn xuất được video trên bản triển khai** thì đổi dòng đầu Dockerfile sang một
ảnh nền có sẵn Chromium và thêm ffmpeg. Ảnh sẽ **phình từ ~90 MB lên khoảng 1 GB**,
và mỗi lần xuất chiếm 4 luồng máy trong vài phút. Cân nhắc trước khi làm.

## Khoá AI (không bắt buộc)

Khung AI cần khoá đặt trong `.env` của **dự án clip** (`$PROJ_ROOT/.env`):

```
ELEVENLABS_API_KEY=sk_...          # giọng đọc
gooogle_Ai_studio_API_key=...      # viết lời · hỏi AI · dựng hình · sửa món
```

Thiếu khoá thì khung AI hiện lời hướng dẫn, phần còn lại của app vẫn chạy bình
thường.

## Dữ liệu clip đi kèm

`clip/` (17 MB) là bản đóng gói của dự án clip: bộ dựng, kịch bản, và đúng những
tệp ảnh mà 11 clip thật sự chạm tới. Thư mục `public/` của dự án gốc nặng 147 MB
nhưng đo ra các clip chỉ dùng 1,6 MB — phần còn lại là video nguồn chưa clip nào dùng.

**Clip sửa trong container sẽ mất khi container bị xoá.** Muốn giữ thì gắn một
named volume vào `/app/clip/scenes`:

```bash
docker run -d --name motion -p 3000:3000 \
  -v motion-scenes:/app/clip/scenes \
  ... motion
```

## Kiểm tra sau khi triển khai

```bash
curl -I  http://máy-chủ:3000/health      # 200
curl -I  http://máy-chủ:3000/            # 302 → /dang-nhap  (nếu đã đặt mật khẩu)
curl -I  http://máy-chủ:3000/dang-nhap   # 200
```

`/health` cố ý **không** qua cửa đăng nhập, để máy khác biết app còn sống.
