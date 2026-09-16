# Triển khai lên Vibe Host

## Lỗi ban đầu và vì sao

Lần deploy đầu chết ở **`[01] Source Validation`**:

> Không nhận diện được ứng dụng ở gốc repo… chọn "Thư mục con" là một trong: `matbao-hub-video`.

Repo `quynguyen09822-arch/motion` trên GitHub chỉ có `README.md` + thư mục
`matbao-hub-video/`. Vibe Host quét gốc, không thấy `package.json`, nên dừng.

Repo ấy được tạo bằng **"Add files via upload"** (kéo thả trên web), không phải
`git push` — nên **48 commit ở máy chưa hề lên đó**.

## Lỗi thứ hai, chưa kịp hiện ra

Chỉnh "Thư mục con" chỉ đổi **chỗ chết**, không cứu được. Trình sửa là cửa sổ
nhìn vào dự án clip; `server/proj.js` kiểm 5 thứ lúc khởi động và ném lỗi nếu
thiếu. Repo không có `scenes/`, `scene-player.html`, `public/` — nên nó sẽ qua
được `[01]`–`[08]` rồi chết ở `[11] Health Check`.

## Cách sửa

**Đẩy repo ở máy lên** — repo ấy vốn đã có `package.json` **ở đúng gốc**, nên
không phải chọn thư mục con nữa, và 48 commit lên theo.

Kèm ba thứ mới:

1. **`clip/` — dữ liệu clip gói kèm, 2,3 MB.** Chỉ mang thứ 11 clip thật sự
   dùng. `public/` của dự án gốc nặng 147 MB, nhưng **đo ra thì các clip chỉ
   chạm tới 5 tệp, 1,6 MB** — phần còn lại là video nguồn chưa clip nào dùng.
2. **`Dockerfile`** — `node:22-alpine`, **không `npm install`** (ứng dụng không
   có gói phụ thuộc nào), chạy bằng người dùng `node`.
3. **`/health`** — nhịp tim rẻ cho bước `[11]`, không chạm đĩa.

## Bẫy đã vấp khi dựng ảnh Docker

Ảnh dựng xong, chạy lên là **chết ngay**:

```
Error: EACCES: permission denied, mkdir '/app/.hub-video-backups/_ban-goc-2026-09-16'
```

`COPY` tạo file thuộc quyền root, mà ta chạy bằng `node`. Ứng dụng **chụp một
bản gốc kịch bản ngay lúc khởi động** — đó là lưới an toàn của dữ liệu clip, và
một bản cho sửa được thì càng cần. Nên cách sửa đúng là **tạo sẵn hai thư mục
ghi được** (`.hub-video-backups/`, `.drafts/`) rồi `chown` cho `node`, chứ không
phải tắt phần sao lưu đi cho tiện.

## Đã kiểm tận nơi

| Việc | Kết quả |
|---|---|
| `docker build` | xong, ảnh **237 MB** |
| `docker run` + `HEALTHCHECK` | **healthy** |
| `/health` · `/api/clips` · `/` · bộ dựng · ảnh | **200** cả năm |
| Số clip đọc được | **11/11** |
| Mở bằng trình duyệt thật | clip hiện đúng, bảng lớp 9 dòng, **0 lỗi JS** |

## Giới hạn của bản triển khai

- **Không xuất được video** — cần `ffmpeg` + Chromium, cố ý không gói để ảnh nhẹ.
- **Không có 12 clip đời cũ** (`.html` rời) — không nằm trong repo.
- **Không thêm được nền video mới** — thư mục video nguồn không gói kèm.
- **Hai bản độc lập**: sửa trên mạng không về máy, sửa ở máy không lên mạng.

## Lần thứ hai: tải zip lên, chết ở `[11]` đúng như dự đoán

Vibe Host **có nhận tải file zip** — kiểu nguồn này không phơi ra ở cổng MCP nên
lúc đầu tưởng chỉ có Git và HTML tĩnh. Nhưng bản zip đầu là bản **chưa có
`clip/`**, nên:

```
[Health Check] ✗ Ngắt mạch: candidate restart ≥ 3 (crash-loop)
cause=restart=5 — App khởi động rồi chết lặp lại
    at .../server/proj.js:38:26
```

Dòng 38 chính là `if (!existsSync(SCENES)) chetSom('thư mục scenes/')`. Trợ lý
của Vibe Host chẩn đoán đúng: *"app khởi động đòi thư mục dự án ngoài repo
(`/home/coder/...`) — cần làm cho app tự chứa được"*. Nhưng nó **không tự sửa
được**, và phải thôi: thiếu **dữ liệu**, không phải sai **mã**.

## Sửa gốc: ứng dụng TỰ TÌM lấy dữ liệu

Không chỉ đặt biến môi trường trong `Dockerfile` — nơi triển khai có thể **tự
sinh lấy cách chạy**, không dùng `Dockerfile` mình viết, lúc đó biến môi trường
mình khai không tới được. Nên `server/proj.js` tự dò theo ba bậc:

| Bậc | Chỗ tìm | Khi nào trúng |
|---|---|---|
| 1 | `PROJ_ROOT` | người dùng nói rõ |
| 2 | dự án thật ở máy làm việc | đang phát triển |
| 3 | **`clip/` ngay trong ứng dụng** | đã đem lên máy chủ |

**Thứ tự 2 trước 3 là cố ý.** Ở máy có cả hai, mà dự án thật mới là bản đầy đủ
(23 clip kể cả clip đời cũ, toàn bộ video nguồn); bản gói kèm chỉ có 11 clip.
Đảo thứ tự là mở máy lên thấy mất quá nửa số clip.

Đã kiểm cả hai chiều: ở máy vẫn trỏ về dự án thật; trong container không có
`/home/coder/...` thì **tự tìm ra `/app/clip` và chạy được, không cần
`PROJ_ROOT`, không cần cả `Dockerfile` của mình**.

## Một bẫy nữa: cổng

Không khai `PORT` thì ứng dụng nghe **7803** (quy ước của skill `/port` ở máy),
trong khi máy chủ chờ **3000** → kiểm tra sức khoẻ trượt dù ứng dụng vẫn sống.
`Dockerfile` đã đặt `ENV PORT=3000`, và đã đặt thêm biến `PORT=3000` trên chính
dự án Vibe Host cho chắc — phòng khi nền tảng tự sinh cách chạy riêng.

## Việc còn lại

Hai đường, chọn một:

- **Tải zip lên** (không cần Git): `matbao-hub-video-deploy.zip` — **1,8 MB**,
  gồm `server/ web/ clip/ package.json Dockerfile`. Đã thử: giải nén ra chỗ
  trống, chạy bằng `node:22-alpine` trần → **200, đọc đủ 11 clip**.
- **Đẩy lên GitHub**: `bash tools/day-len-github.sh` — khoá không đi qua khung chat.
