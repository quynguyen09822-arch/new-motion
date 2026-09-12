# Thành phần `video` — nền động đặt thẳng trong clip

**Ngày 10/09/2026 — có sửa `scene-player.html` của dự án chung.** Đọc kèm
`MAU-CHU-RIENG.md` và `DUNG-CHAY.md`; cả ba cùng một kiểu và cùng một rủi ro.

## Vấn đề

Định dạng kịch bản không có kiểu `video`, nên nền động không đặt vào clip được.
Đường vòng trước đây (`tools/ghep-bg.mjs`): clip vẽ nền bằng **màu khoá** hồng
cánh sen `#ff00ff`, xuất video xong thì ffmpeg cắt màu đó ra và lồng `BG.mp4`
vào chỗ trống. Chạy được, nhưng phải nhớ chạy thêm một lệnh sau mỗi lần xuất,
và trong trình sửa thì không bao giờ nhìn thấy nền thật.

Có **hai** thứ chặn, không phải một — và thứ hai mới là thứ âm thầm:

| Chặn | Biểu hiện |
|---|---|
| Không có kiểu `video` | không đặt được vào kịch bản |
| `public/video/BG.mp4` là **HEVC (H.265)** | Chromium KHÔNG giải mã được → ô đen, không lỗi, không báo gì |

Cái thứ hai làm mọi thứ trông như "trình sửa không hỗ trợ video". Kể cả có kiểu
`video` thì thả đúng file ấy vào vẫn ra ô đen. Đã đo bằng `canPlayType` trên
chính Chromium mà bộ xuất dùng:

```
HEVC → KHÔNG   ·   H.264 → được   ·   VP8/VP9 → được   ·   AV1 → được
```

Ba file trong `public/video/` đang là HEVC: `BG.mp4`, `intro.mp4`, `outro.mp4`.

## Vì sao làm thẳng được, không cần khoá màu nữa

`tools/export-video.mjs` hứng hình bằng **quay màn hình theo thời gian thật**
(`Page.startScreencast` + `__clip.play()`), chứ không nhảy từng khung rồi chụp.
Nên một thẻ `<video>` đang phát sẽ vào phim y như mọi chuyển động CSS khác. Đã
chứng minh bằng `tools/kiem-nen-video.mjs`: xuất ra rồi lấy ba khung ở ba mốc,
so vân tay dải nền — ba khung khác nhau, độ sáng 18/255 (không phải ô đen).

## Thay đổi trong `scene-player.html`

Bốn chỗ, đều thuần bổ sung:

1. **CSS** `.k-video` — bọc, `object-fit`, lớp phủ tối `.toi`.
2. **`BUILD.video`** — dựng `<video muted playsinline preload="auto" loop>`.
   `muted` là **bắt buộc**: trình duyệt chặn tự phát mọi video có tiếng, thiếu
   nó là khung hình đứng im ở giây 0 mà không báo lỗi.
3. **`TICK.video`** — đồng bộ với đồng hồ clip, hai chế độ:
   - đang **dừng** (kể cả lúc kéo thanh tua) → ghim `currentTime` đúng khung;
   - đang **chạy** → để video tự phát cho mượt, chỉ kéo lại khi trôi quá 0,3s.
     Gán `currentTime` mỗi khung lúc đang chạy làm video giật cục.
4. **`__clip.ready()`** — chờ thêm `readyState >= 2` của mọi `<video>`, tối đa
   8 giây. Bộ xuất quay NGAY sau `ready()`, thiếu bước này thì mấy giây đầu
   phim ra khung đen mà chỉ phát hiện lúc xem lại.

## Dùng

Cột trái → **Thành phần trong cảnh** → dấu **+** → **Video**. Mặc định đã là
nền động: kín cả khung, mờ 8, tối 0,25, lặp lại.

```jsonc
{ "id": "nen-dong", "kind": "video", "x": 0, "y": 0, "place": "day",
  "src": "public/video/BG-web.mp4",
  "fit": "cover",     // "contain" nếu muốn vừa khung, giữ tỉ lệ
  "blur": 10,         // mờ nền đi cho chữ phía trên nổi lên
  "dim": 0.2,         // phủ một lớp đen mỏng
  "loop": true,       // video ngắn hơn cảnh thì bật, không thì nó đứng ở khung cuối
  "start": 0,         // cắt bỏ đoạn đầu của file
  "rate": 1 }         // tốc độ phát
```

**Thứ tự vẽ = thứ tự trong danh sách thành phần.** Làm nền thì kéo món video
lên đầu, không thì nó đè lên mọi thứ.

Thu nhỏ lại (bỏ `place`, đặt `x`/`y`/`w`/`h`) thì lồng được vào màn hình điện
thoại hay khung trình duyệt.

## Chọn file — và chuyện đổi định dạng

Núm **"File video"** liệt kê mọi file trong `public/video/`, ghi rõ file nào
trình duyệt không mở được. Gặp file như vậy thì có nút **"Chuyển sang định dạng
xem được"**: máy chủ chạy ffmpeg đổi sang H.264 (`BG.mp4` → `BG-web.mp4`), xong
tự trỏ clip sang bản mới. Chạy một lần cho mỗi file, dùng mãi.

Việc chuyển đi qua **cùng hàng đợi một slot** với xuất video — hai thứ đều ăn
CPU, chạy song song thì cả hai cùng chậm.

Bản đã chuyển: `BG.mp4` 4,6 MB HEVC → `BG-web.mp4` 1,07 MB H.264, vẫn
1080×1920 / 8,04 giây.

## `tools/ghep-bg.mjs` giờ thế nào

**Không xoá.** Nó vẫn chạy được và vẫn cần cho những clip đã dựng theo lối khoá
màu. Nhưng clip mới thì không nên dùng nữa — đặt thẳng món `video` vào kịch bản
thì thấy được nền ngay trong trình sửa, và không phải nhớ chạy thêm lệnh nào
sau khi xuất.

## Khôi phục

Bản `scene-player.html` trước khi thêm video nằm ở
`.hub-video-backups/scene-player/2026-09-10T163213/` (md5 `6310a426a423…`).

```bash
cp projects/matbao-hub-video/.hub-video-backups/scene-player/2026-09-10T163213/scene-player.html \
   projects/clipVibehost/hosting-animatic-production/scene-player.html
```

⚠ Bản đó **đã có** `pause()`/`paused` của `DUNG-CHAY.md` nhưng **chưa có** phần
video. Khôi phục về nó là mọi clip dùng món `video` mất nền, im lặng.
`tools/kiem-nen-video.mjs` sẽ báo ngay.

---

# Khe media — thả ảnh hoặc phim vào màn hình điện thoại và cửa sổ trình duyệt

**Ngày 12/09/2026 — có sửa thêm `scene-player.html` của dự án chung.**

## Vấn đề

Hai chỗ đáng lẽ là "màn hình" lại là ngõ cụt:

- **Màn hình điện thoại** chỉ nhận **ảnh** (`<img>` viết cứng trong bộ dựng).
- **Cửa sổ trình duyệt** không nhận gì cả — thân nó là ba vạch xám giả, không có
  chỗ đặt hình thật.

Muốn khoe một đoạn quay màn hình thì phải đặt món `video` rời đè lên rồi căn tay
cho khớp khung máy — sai một chút là lòi ra ngoài viền.

## Cách làm

Một hàm `khePhim(src, lap)` dựng `<img>` hay `<video>` tuỳ **đuôi file**. Không
bắt người dùng khai thêm núm "đây là ảnh hay phim" — thêm một núm là thêm một
chỗ khai sai.

| Khe | Bỏ trống | Có file |
|---|---|---|
| Màn hình điện thoại | đen | ảnh hoặc phim lấp đầy màn |
| Cửa sổ trình duyệt | ba vạch xám như trang đang tải | ảnh hoặc phim lấp đầy thân |

Món **Điện thoại** cũng được thêm vào menu "Thêm thành phần" — trước đây nó có
trong bộ dựng nhưng không có trong menu, muốn dùng phải sửa tay JSON.

## Bẫy lớn nhất: ĐỒNG HỒ, không phải thẻ video

Dựng được thẻ `<video>` là phần dễ. Phần khó là thẻ video **tự phát theo đồng hồ
thật**. Xem trong trình sửa thì tưởng đúng, nhưng:

- tua tới giây nào thì phim bên trong vẫn đứng ở giây 0;
- mỗi lần xuất video lại ra một khung khác nhau.

Bộ dựng đã có `TICK.video` ghim `currentTime` theo đồng hồ clip, nhưng nó chỉ
chạy cho món `kind: 'video'`. Nay `applyEl` gọi thêm cho **mọi món khác có chứa
một thẻ video**:

```js
if (el.kind !== 'video' && el.src && node.querySelector('video')) {
  TICK.video(el, node, local, at);
}
```

`tools/kiem-khe-media.mjs` mục 3 đo đúng chuyện đó: tua tới giây nào thì phim
bên trong phải đứng ở giây đó — và phim ngắn hơn cảnh thì so theo
`giây % độ dài phim`, vì nó chạy vòng.

## Vẫn là bẫy cũ: HEVC

Khe media hỏi luôn máy chủ xem trình duyệt mở được file không. Đây không phải
cẩn thận thừa — `intro.mp4`, `outro.mp4` và `BG.mp4` của chính dự án đều là
HEVC, Chromium không giải được, đặt vào clip ra đúng một ô **đen** mà không báo
lỗi gì. Núm hiện thẳng dòng cảnh báo và chỉ sang mục Video để chuyển định dạng.

## Khôi phục

```bash
cp .hub-video-backups/scene-player/2026-09-12T092216/scene-player.html \
   /home/coder/workspace/projects/clipVibehost/hosting-animatic-production/scene-player.html
```

Bản trước khi vá md5 `98455f50bc41dcfec56bcceb61443aff`. Khôi phục là mất luôn
cả khe media lẫn hiệu ứng hình — `kiem-khe-media.mjs` và `kiem-hieu-ung.mjs` mục
1 đọc thẳng file ấy để bắt đúng ca đó.

Thuần bổ sung, kiểm chứng bằng phép đo: dựng lại cả 11 clip ở ba mốc giây bằng
bản cũ và bản mới — **11/11 ra khung hình y hệt từng byte**.
