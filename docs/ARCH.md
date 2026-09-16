# ARCH — Kiến trúc triển khai

> Kiến trúc **sản phẩm** (luồng dữ liệu, các tầng, quy ước) nằm ở
> [`../ARCHITECTURE.md`](../ARCHITECTURE.md) và [`../CLAUDE.md`](../CLAUDE.md).
> File này chỉ nói phần **triển khai**.

## Hình dạng

```
Trình duyệt ──► Node (node:http, không framework)
                 ├── web/        giao diện, ESM thuần, không bước dựng
                 ├── server/     API + phục vụ file tĩnh
                 └── clip/       DỮ LIỆU CLIP gói kèm  ← PROJ_ROOT trỏ vào đây
                      ├── scene-player.html     bộ dựng
                      ├── scenes/*.json         11 kịch bản
                      ├── public/               5 tệp ảnh các clip thật sự dùng
                      └── clipvibe-studio/…/types.ts
```

## Vì sao phải gói `clip/` vào ảnh Docker

Trình sửa là **cửa sổ nhìn vào một dự án khác**. `server/proj.js` kiểm 5 thứ
ngay lúc khởi động và **ném lỗi** nếu thiếu — cố ý, để hỏng thì hỏng ở chỗ nói
được câu tử tế, chứ không chạy què rồi trống trơn.

Ở máy, dự án clip nằm ở thư mục khác. Trên mạng thì không có — nên phải mang theo.

**Chỉ mang thứ thật sự dùng.** Cả `public/` của dự án gốc nặng **147 MB**, nhưng
đo ra thì 11 clip chỉ chạm tới **5 tệp, 1,6 MB**; phần còn lại là video nguồn
chưa clip nào dùng. Thư mục `clip/` gói kèm nặng **2,3 MB**.

## Ảnh Docker

- Nền `node:22-alpine`, **không `npm install`** — ứng dụng không có gói phụ thuộc nào.
- Chạy bằng người dùng `node`, không phải root.
- `.hub-video-backups/` và `.drafts/` được tạo sẵn và `chown` cho `node`.
  **Thiếu bước này container chết ngay lúc khởi động** với `EACCES: mkdir` —
  vì ứng dụng chụp một bản gốc kịch bản mỗi lần khởi động.
- `HEALTHCHECK` gọi `/health` — rẻ, không chạm đĩa.
- Cỡ ảnh ≈ 237 MB.

## Biến môi trường

| Biến | Mặc định | Việc |
|---|---|---|
| `PORT` | `3000` | cổng lắng nghe (`0.0.0.0`) |
| `PROJ_ROOT` | `/app/clip` | chỗ chứa dữ liệu clip |

## Giới hạn đã biết của bản triển khai

- **Không xuất được video.** Cần `ffmpeg` + Chromium; ảnh này không có, để nhẹ.
- **Không có 12 clip đời cũ** (`.html` rời) — chúng không nằm trong repo.
- **Không thêm được nền video** — thư mục video nguồn không gói kèm.
- **Sửa trên bản triển khai không về máy**, và ngược lại. Hai bản độc lập.
