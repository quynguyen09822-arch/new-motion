# TIEP-THEO.md — matbao-hub-video

> Soạn ngày 18/09/2026, sau khi đọc `FIX-BACKLOG.md` (F1–F9) và mã nguồn bản deploy.
>
> `FIX-BACKLOG.md` lo phần **máy móc bên trong** (xuất video, schema, chunk hoá).
> File này lo phần **người khác dùng được**: ai sửa gì, tạo clip mới, số liệu báo cáo.
> Hai file chạy song song, không đè lên nhau.
>
> Thứ tự khuyến nghị: **M1 → M2 → M3 → M4 → M5**.
> M1/M2 rẻ và cho kết quả thấy ngay. M3 là nền của M4.

---

## Cách làm việc với Claude Code

Bốn luật, vi phạm là mất thời gian nhiều hơn tiết kiệm:

1. **Một mục một lần.** Gõ đúng câu này, không thêm bớt:
   `Đọc TIEP-THEO.md, làm M2, chỉ M2, rồi dừng lại báo cáo.`
   Gộp hai mục là AI tự ý đụng vào chỗ thứ ba mà không ai kịp nhìn.

2. **Commit trước khi bắt đầu mỗi mục.** Có `git status` sạch thì lúc hỏng còn `git checkout` được. Dự án clip không có git — đó chính là lý do M3 tồn tại.

3. **Chạy nghiệm thu bằng tay, đừng tin lời báo cáo.** Mỗi mục dưới đây có phần **Nghiệm thu**. AI nói xong thì tự mở app bấm thử đúng các bước đó.

4. **Đừng cho sửa `web/inspector/schema.js` mà không chạy `npm run kiem:schema`** — luật này đã có trong `CLAUDE.md`, nhắc lại vì ba mục dưới đây đi sát nó.

**Trước khi làm bất cứ mục nào:** gắn volume cho `clip/scenes` và `.hub-video-backups` trên vibehost, rồi restart container kiểm tra clip vừa sửa còn không. Chưa chắc chuyện đó thì mọi thứ làm thêm đều đang xây trên cát.

---

## M1 · Đếm lượt dùng `[P0 · nửa ngày]`

**Vấn đề.** Không có số nào để trả lời "công cụ này có ai dùng không". Đây là câu hỏi quyết định số phận dự án, và hiện không ai trả lời được bằng dữ liệu.

**Chỗ sửa.** `server/save.js` (cửa ghi duy nhất), `server/main.js` (thêm một route đọc).

**Cách làm.** Mỗi lần `luuClip` thành công thì nối một dòng JSON vào `.nhat-ky/dung.jsonl`: thời điểm, email từ `aiDangVao(req)`, slug, số cảnh. Nối thêm chứ không đọc-sửa-ghi — file này có thể bị ghi đồng thời. Thêm `GET /api/thong-ke` trả về tổng lượt, số người, số clip trong 7/30 ngày.

**Nghiệm thu.**
- [ ] Sửa 3 clip bằng 2 tài khoản khác nhau → `/api/thong-ke` đếm đúng 3 lượt, 2 người
- [ ] Xoá `.nhat-ky/` đi thì app vẫn lưu clip bình thường, không văng lỗi
- [ ] `.nhat-ky/` đã nằm trong `.gitignore` và `.dockerignore`

---

## M2 · Báo khi file đã đổi từ lúc mở `[P0 · nửa ngày]`

**Vấn đề.** Hai người mở cùng một clip rồi cùng bấm lưu thì người sau đè người trước, không một lời cảnh báo. Bản cũ vẫn nằm trong kho sao lưu nên chưa mất hẳn, nhưng người bị đè không hề biết mình vừa bị đè.

**Chỗ sửa.** `server/main.js` (`POST /api/clip/:slug`), `web/store.js`.

**Cách làm.** `docClip()` đã trả sẵn `suaLuc` — dùng đúng cái đó, đừng thêm hash mới. Giao diện nhớ `suaLuc` lúc mở, gửi kèm lúc lưu. Lệch thì server trả 409 kèm `suaLuc` hiện tại; giao diện hỏi người dùng: *đè lên* hay *mở bản mới ra xem trước*. **Không tự chọn hộ.**

**Nghiệm thu.**
- [ ] Mở clip ở 2 tab, lưu tab A, rồi lưu tab B → tab B hiện câu hỏi, không lặng lẽ đè
- [ ] Chọn "đè lên" thì lưu được thật, và bản của A vẫn nằm trong `/api/history`
- [ ] Một tab duy nhất, lưu 5 lần liên tiếp → không lần nào bị hỏi

---

## M3 · `clip/scenes` vào git, mỗi lần lưu là một commit `[P1 · 1–2 ngày]`

**Vấn đề.** Ba chuyện riêng lẻ hoá ra cùng một chuyện: không biết ai sửa gì; muốn lùi thì chỉ lùi được nguyên file chứ không lùi từng thao tác (F9 định giải bằng inverse patch); và kho sao lưu giữ 50 bản mỗi clip đang phình tới ~1,6 GB.

Git giải cả ba, và vốn **đã là** inverse patch.

**Chỗ sửa.** `server/save.js`, `server/backup.js`, `server/main.js` (`/api/history`).

**Cách làm.**

1. `git init` trong `clip/scenes` nếu chưa có — đây là repo riêng của kịch bản, không đụng tới dự án clip 447 MB bên ngoài.
2. Sau bước ghi nguyên khối trong `luuClip`, commit file vừa ghi. Tác giả lấy từ email đăng nhập, lời commit dạng `sửa <slug> — <email>`.
3. `/api/history/:slug` đọc từ `git log` thay vì đọc thư mục sao lưu. Giữ nguyên hình dạng dữ liệu trả về để giao diện không phải sửa.
4. **Giữ `chupBanGoc()`** — một bản chụp mỗi ngày làm phao cuối, phòng khi chính git hỏng. Chỉ hạ `GIU_BAN` từ 50 xuống 5.

**Nghiệm thu.**
- [ ] Sửa 1 clip bằng 2 tài khoản → `git log` trong `clip/scenes` hiện đúng 2 tác giả
- [ ] `/api/history` và nút quay lại trên giao diện vẫn chạy y như trước
- [ ] Git chết (đổi tên thư mục `.git`) → app vẫn **lưu clip được**, chỉ mất phần lịch sử
- [ ] Kho `.hub-video-backups` sau một tuần dùng thật nhẹ hơn rõ rệt

---

## M4 · Tạo clip mới từ mẫu `[P1 · 2–3 ngày]`

**Vấn đề.** `server/main.js` chỉ có `/api/clip/:slug` GET và POST — sửa được clip đã có, **không tạo được clip mới**. Motion đang là công cụ sửa 11 clip cũ; sửa hết là hết việc. Đây là khoảng cách giữa "công cụ vá clip" và "chỗ làm clip mới mà không cần designer".

**Chỗ sửa.** `server/main.js`, `server/clips.js`, `web/app.js`.

**Cách làm.** Chọn một clip đời mới làm mẫu → nhập slug và tiêu đề → nhân bản thành `scenes/<slug-moi>.json`. Phần lõi đã chạy tốt ở cấp cảnh và thành phần (`nhanBanCanh`, `nhanBanMon` trong `web/app.js`), chỉ cần nâng lên cấp clip. Slug phải qua `locSlug`; trùng tên thì từ chối, **không bao giờ đè**. Clip đời cũ (file HTML) không làm mẫu được — chặn ngay trên giao diện, đừng để người dùng bấm rồi mới báo lỗi.

**Nghiệm thu.**
- [ ] Tạo clip mới từ `vibe-host` → mở ra sửa và lưu được ngay
- [ ] Đặt trùng slug có sẵn → bị từ chối, file cũ nguyên vẹn từng byte
- [ ] Slug có dấu, khoảng trắng, `../` → bị từ chối
- [ ] Clip mới hiện trong danh sách, xem trước được, và nằm trong nhật ký M1

---

## M5 · Đường thoát cho việc xuất video trên bản deploy `[P2 · 1 ngày]`

**Vấn đề.** Bản trên vibehost không xuất được video (ảnh Docker không có `ffmpeg` và Chromium — đã ghi rõ trong `TRIEN-KHAI.md`). Câu báo lỗi đã viết tử tế, nhưng người dùng vẫn đi vào ngõ cụt: họ muốn cái video, và công cụ chỉ nói "hãy mở dự án trên máy làm việc".

**Chỗ sửa.** `web/exportpanel.js`, `server/main.js`.

**Cách làm.** Khi bản chạy không xuất được, thay chỗ báo lỗi bằng nút **"Tải kịch bản về máy"** — tải đúng file `<slug>.json`, kèm một dòng chỉ rõ lệnh cần chạy ở máy. Người dùng có đường đi tiếp thay vì một bức tường.

Chuyện ảnh Docker kèm Chromium (~90 MB → ~1 GB) để sau F1, khi việc xuất đã song song và nhanh. Đừng làm bây giờ.

**Nghiệm thu.**
- [ ] Trên bản deploy, bấm "Xuất video" → hiện nút tải kịch bản, tải về đúng file
- [ ] Trên máy làm việc → nút xuất vẫn xuất video như cũ, không đổi gì
- [ ] File tải về mở lại bằng Motion ở máy được ngay

---

## Sau năm mục này

Quay lại `FIX-BACKLOG.md` theo đúng thứ tự cũ: **F3 → F1 → F4**. F1 nặng nhất nhưng mở đường cho việc xuất video trên bản deploy, và lúc đó M5 mới có chỗ đi tiếp.

**F9 thì xoá khỏi backlog được** — M3 đã giải bằng git, không cần viết inverse patch nữa.
