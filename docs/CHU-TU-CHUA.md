# Bộ chữ tự chứa

Từ **19/09/2026**, mọi chữ trong dự án dùng **Be Vietnam Pro**, file nằm ngay
trong repo. Không tải gì qua mạng nữa.

## Vì sao phải làm

Ba chỗ hỏng khác nhau, cùng một gốc: chữ không đi kèm dự án.

1. **`scene-player.html` — chỗ nặng nhất.** Nó khai
   `font-family: Roboto,"Noto Sans","Liberation Sans",Arial` mà **không nạp file
   nào**. Máy chủ nào thiếu mấy phông đó là chữ rơi về mặt khác — và **không có
   gì báo**. Đây là trang mà `export-video.mjs` đem đi quay thành phim, nên chữ
   sai ở đây là **video giao cho khách bị sai mặt chữ**.
2. **12 clip đời cũ và giao diện** nạp Be Vietnam Pro từ `fonts.googleapis.com`.
   Lúc xuất video mà mạng chập là khung hình ra một mặt chữ khác.
3. Ba họ chữ **Space Grotesk, Poppins, Inter** được khai trong CSS nhưng
   **chưa bao giờ có file** — luôn luôn rơi về phông hệ thống.

## Đang có gì

```
clip/public/fonts/
  chu.css                          khai @font-face + biến --bo-chu
  be-vietnam-pro-{400,500,600,700,800}-{latin,latin-ext,vietnamese}.woff2
  jetbrains-mono-{400,500}-{latin,latin-ext,vietnamese}.woff2
  OFL-bevietnampro.txt             giấy phép
  OFL-jetbrainsmono.txt
```

21 file, **328 KB**. Là file tĩnh cam kết vào git — **không phải gói npm, không
có bước dựng**, đúng luật trong `CLAUDE.md`.

Tải lại (chỉ khi cần thêm nét chữ):

```bash
node tools/tai-font.mjs
```

## Bốn quyết định và lý do

**① Đặt ở `clip/public/fonts/`, không phải `web/`.**
`static.js` đã cho phục vụ `public/`, nên không phải thêm đường mới. Quan trọng
hơn: `scene-player.html` và 12 clip đời cũ nằm bên dự án clip, trỏ **tương đối**
là chạy được ở cả hai chỗ phục vụ (`/clip/…` qua trình sửa, `/…` nếu ai đó phục
vụ thẳng gốc dự án clip). Giao diện trình sửa trỏ tuyệt đối
`/clip/public/fonts/chu.css` vào **cùng một bản** — không nhân đôi file, không có
chuyện hai bản trôi khỏi nhau.

**② `font-display: block`, không phải `swap`.**
`swap` cho vẽ tạm bằng phông hệ thống rồi mới đổi. Lúc xuất, Playwright chụp
khung hình đầu ngay sau khi trang tải xong → dễ chụp trúng lúc chữ **chưa** đúng
mặt. `block` giữ chữ vô hình tới khi phông sẵn sàng: thà chậm một nhịp.

**③ Biến CSS tên `--bo-chu`, KHÔNG phải `--chu`.**
Giao diện đã dùng `--chu` làm **màu chữ** ở 52 chỗ. Trùng tên là màu chữ biến
thành một chuỗi tên phông, trình duyệt bỏ qua, chữ rơi về màu mặc định — hỏng im
lặng.

**④ CSP đóng hẳn nguồn phông ngoài.**
Trước phải mở `fonts.googleapis.com`. Nay đóng. Không phải cho gọn: chừng nào CSP
còn mở, một thẻ `<link>` lọt lại vào clip nào đó vẫn **chạy ngon trên máy có
mạng** và chỉ gãy đúng lúc máy chủ mất mạng. Đóng lại thì nó gãy **ngay ở bài
kiểm**. Bài kiểm trong `tools/kiem-dang-nhap.mjs` đã đổi sang khẳng định chiều
ngược lại.

## Đã sửa `scene-player.html` — cách trả về như cũ

`scene-player.html` là **bộ dựng của dự án clip chung**, luật trong `CLAUDE.md`
bắt sao lưu trước khi sửa. Bản gốc đã cất:

```
.hub-video-backups/scene-player-truoc-doi-chu-2026-09-19/
  scene-player.html
  van-tay.txt      sha256 của bản gốc
```

Khôi phục:

```bash
cd projects/matbao-hub-video
cp .hub-video-backups/scene-player-truoc-doi-chu-2026-09-19/scene-player.html clip/scene-player.html
sha256sum -c <<< "$(cut -d' ' -f1 .hub-video-backups/scene-player-truoc-doi-chu-2026-09-19/van-tay.txt)  clip/scene-player.html"
```

Đã sửa **ba** chỗ: thêm thẻ `<link>` nạp `public/fonts/chu.css`, đổi
`font-family` của `body` thành `"Be Vietnam Pro",system-ui,sans-serif`, và trong
`__clip.ready()` nạp cưỡng bức mọi nét chữ đã khai:

```js
await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
```

Chỗ thứ ba là bắt buộc. Bộ chữ chia theo dải mã, trình duyệt chỉ tải một dải khi
màn hình xuất hiện ký tự thuộc dải đó — cảnh sau mới có chữ có dấu thì file
`vietnamese` tải **giữa lúc đang quay**. `document.fonts.ready` không đủ: nó chỉ
chờ những lượt tải đang chờ, không kéo về dải chưa ai cần.

### Dự án chung không có git — bản gốc cất ở đâu

Đợt này đụng **15 file** của dự án chung. Mười ba file có bản sinh đôi trong
`clip/` của repo này, trùng khít từng byte, nên lấy lại được bằng
`git show <commit>:clip/<tên>`. Hai file `econtract-20s*` chỉ có ở dự án chung,
nên bản gốc đã chép vào `docs/ban-goc-du-an-chung/` — **có git**, khác với
`.hub-video-backups/` vốn bị git bỏ qua.

## Mặt chữ có đổi ở 4 clip đời cũ

Gom về một bộ nghĩa là ba họ chữ kia biến mất. Thật ra **hai trong ba chưa bao
giờ hiện lên** (không có file, luôn rơi về phông hệ thống), nên chỉ những chỗ
dùng **Space Grotesk** là đổi mặt thấy được:

| Clip | Trước | Sau |
|---|---|---|
| `vibe-hosting-animatic-90s` | Space Grotesk (tiêu đề) | Be Vietnam Pro |
| `vibe-hosting-animatic-18s` | Space Grotesk | Be Vietnam Pro |
| `vibe-host-marketer` | Space Grotesk | Be Vietnam Pro |
| `vibe-host-ceo` | Poppins (miếng vá chữ) | Be Vietnam Pro |

Đây là **đổi có chủ đích**, không phải tác dụng phụ. Muốn giữ Space Grotesk thì
phải tải thêm họ chữ đó về `clip/public/fonts/` rồi khai lại.

## Cái giá phải trả: bản xuất không còn trùng tới từng byte

Đây là hậu quả duy nhất đáng kể, và nó đã làm đỏ bài kiểm `xuat-nhanh`.

Phông hệ thống (Arial/Liberation) được Chromium dựng hình theo một đường đã
tối ưu sẵn; phông web thì không, và **khi máy đang tải nặng thì việc khử răng
cưa con chữ không lặp lại y hệt giữa hai tiến trình**. Đo trên chính clip của
bài kiểm:

| Tình huống | Khung lệch byte | SSIM khung tệ nhất |
|---|---|---|
| Máy rảnh | 0/30 | 1.000000 |
| Ép tải 4 nhân | 7–8/30 | 0.9988 – 0.9996 |
| **Phông SAI thật** (cất bộ chữ đi rồi xuất) | 30/30 | **0.956** |

Nhìn bằng mắt hai bản lệch byte là **một**; chỗ khác nhau chỉ là viền con chữ.

**Đã thử ghim lại bằng cờ Chromium trước khi chịu nới:**

| Cờ | Kết quả |
|---|---|
| `--font-render-hinting=none` + `--disable-lcd-text` + `--disable-font-subpixel-positioning` | **tệ hơn** — 17/30 lệch |
| `--run-all-compositor-stages-before-draw` (+ tắt hoạt hình luồng riêng) | không đổi — 8/30 |
| `--disable-gpu` | 7/30 |
| `--deterministic-mode` | **treo trang** — hết giờ ở `waitForFunction` chờ `window.__clip` |

Không cờ nào dùng được, nên `tools/kiem-xuat-nhanh.mjs` đổi từ "giống nhau tới
từng byte" sang **"giống nhau tới mức nhìn không ra"**: mọi khung phải đạt
SSIM ≥ **0.998**. Khoảng cách giữa 0.9988 (răng cưa) và 0.956 (sai phông) đủ
rộng để ngưỡng này không lẫn. Sai phông, rơi khung, lệch bố cục, sai màu đều
vẫn bị bắt.

`tools/xuat-nhanh.mjs` **không bị sửa** — cả bốn bộ cờ thử nghiệm đều đã gỡ bỏ.

> Một bài học trong lúc làm: có lúc `--deterministic-mode` cho "0 khung lệch" và
> em suýt tin. Thật ra nó làm trang treo nên **không sinh ra video nào**, và phép
> so đang trừ hai file rỗng. Đo tính tất định thì phải kiểm là **có kết quả để mà
> so** trước đã.

## Một chỗ còn tải qua mạng, cố ý

`stitch_d_n_kh_i_nghi_p/code.html` còn nạp **Material Symbols** — đó là bộ **biểu
tượng**, không phải chữ. File này là mockup thiết kế, **không nằm trong đường
chạy của ứng dụng**, máy chủ không phục vụ nó. Mất mạng thì mockup thiếu biểu
tượng, không ảnh hưởng clip hay bản xuất. Phần **chữ** của nó đã trỏ về bộ tự
chứa.

## Tự kiểm

```bash
npm run kiem chu        # bài kiểm riêng cho bộ chữ
npm run kiem            # cả bộ
```
