# CLAUDE.md — Trình sửa clip (matbao-hub-video)

Hướng dẫn cho AI agent làm việc trong repo này. Đọc hết trước khi sửa code.

## 1. Đây là cái gì

Một **trình sửa clip trực quan**, chạy trong trình duyệt: mở clip → bấm vào
thành phần trên khung hình → vặn thuộc tính ở cột phải → lưu → xuất video.
Người dùng chính là người **không rành kỹ thuật**, nên toàn bộ câu chữ trên giao
diện là tiếng Việt đời thường, không có từ kỹ thuật.

Repo này **không chứa clip**. Clip nằm ở một dự án khác:

```
projects/matbao-hub-video/                 ← repo này (có git)
projects/clipVibehost/hosting-animatic-production/   ← DỰ ÁN CLIP (447 MB, KHÔNG có git)
    scenes/*.json          kịch bản clip đời mới — thứ trình sửa này sửa
    scene-player.html      bộ dựng, chạy kịch bản thành hình
    vibe-host-*.html       clip đời cũ, mỗi clip một file HTML tự chứa
    out/                   video thành phẩm
    tools/export-video.mjs, check-layout.mjs, node_modules/playwright
    clipvibe-studio/src/scene/types.ts    validateScene / totalDuration
```

Trỏ chỗ khác bằng biến môi trường `PROJ_ROOT`.

## 2. Chạy

```bash
npm run dev                 # = node server/main.js, cổng 7803 (PORT ghi đè)
PROJ_ROOT=/đường/dẫn npm run dev
```

Skill `/port` của workspace truyền `PORT` vào và ghi `.port`, `.port.pid`,
`.port.log`. Cổng 7800/7801/7802/7810 đã có chủ — đừng chiếm.

**Zero dependency, không có bước build.** `package.json` không có `dependencies`,
`web/` là ESM nạp thẳng bằng `<script type="module">`. Đây là chủ ý (xem
`server/router.js`): một công cụ mà người không rành kỹ thuật phải dựa vào thì
không được có kiểu hỏng "cài gói thất bại". **Đừng thêm gói, đừng thêm bundler.**

`kiemTraDuAn()` chạy lúc khởi động và chết sớm kèm câu tiếng Việt nếu thiếu dự án
clip. Node 22 tự lột kiểu file `.ts` nên `types.ts` nạp thẳng được, không biên dịch.

## 3. Bố cục

**`server/`** — `node:http` trần, không Express.

| File | Việc |
|---|---|
| `main.js` | toàn bộ định tuyến + phục vụ file, một tiến trình duy nhất |
| `router.js` | `json` · `loi` · `docJson` · `khop` (path param) · `moSSE` |
| `proj.js` | **cửa DUY NHẤT sang dự án clip** — `PROJ`/`SCENES`/`OUT`/`TOOLS`, `soatKichBan` |
| `static.js` | phục vụ file tĩnh + **danh sách trắng** cho dự án clip, có `Range` |
| `clips.js` | liệt kê clip, phân biệt đời 1 / đời 2, lọc slug |
| `save.js` | đường ghi: soát → cất → ghi tạm+đổi tên → báo |
| `backup.js` | kho `.hub-video-backups/`, chụp bản gốc, lịch sử, dọn kho |
| `drafts.js` | nháp tự lưu trong `.drafts/`, không soát, không ghi sang dự án clip |
| `jobs.js` | hàng đợi **một slot**, chạy `export-video.mjs` / `check-layout.mjs`, SSE tiến độ |
| `khung.js` | đọc/sửa "khung nhấn" của clip **đời cũ** bằng `node:vm` |
| `videos.js` + `bo-video.js` | liệt kê `out/`, đo bằng `ffprobe`, xếp theo bộ dự án |
| `nguonvideo.js` | liệt kê `public/video/`, **đo codec** để biết file nào trình duyệt mở được |

`server/main.js` có một import đi ngược sang `web/`: `soatChatLuong` từ
`web/soat.js`. Cố ý — xem mục 5.1.

**`web/`** — không framework.

| File | Việc |
|---|---|
| `app.js` | khởi động và nối dây tất cả |
| `store.js` | kho trạng thái, undo/redo, nháp; `duyetMon`/`timCanh`/`timMon` |
| `player.js` | vòng đời iframe + quy đổi toạ độ |
| `picker.js` `overlay.js` `drag.js` `layers.js` | chọn · vẽ khung · kéo · cây thành phần |
| `them.js` | thêm/xoá/nhân bản cảnh & thành phần, `MAU_MON` |
| `inspector/schema.js` | **sổ câu chữ** — 24 loại phần tử, tên núm người dùng thấy |
| `inspector/index.js` `fields.js` | dựng bảng thuộc tính từ schema |
| `exportpanel.js` `videos.js` `khung.js` | ba thẻ còn lại của cột phải |
| `soat.js` | **soát chất lượng** — JS thuần, cả trình duyệt lẫn Node dùng chung |
| `zoom.js` | phóng khung làm việc bằng Ctrl+lăn, phóng quanh con trỏ |
| `anhnho.js` | ảnh nhỏ từng thành phần — **quy tắc 7 điều áp cho mọi clip**, xem `docs/QUY-TAC-ANH-NHO.md` |
| `huongdan.js` | bong bóng hướng dẫn tại chỗ; nội dung nằm ở `inspector/schema.js` |
| `hinhmon.js` | sơ đồ SVG cho 24 món + 16 bộ trong bảng chọn — vẽ tay, không chụp |

**Luồng dữ liệu một chiều, không ngoại lệ:**

```
kho (kịch bản) ──sửa──► apDung() ──► player.nap() ──► iframe
     ▲                                                  │
     └──── bảng thuộc tính / kéo thả ◄── lớp bắt ◄──────┘
```

Iframe là **cái để nhìn**, không bao giờ là nguồn sự thật. Chỉ đọc hình học từ
nó (`getBoundingClientRect`, hệ số phóng).

## 4. Luật cứng — vi phạm là hỏng thật

1. **Dự án clip KHÔNG có git.** Ghi đè sai một lần là mất hẳn. Mọi đường ghi
   (`save.js`, `khung.js`) đều phải: cất bản cũ vào `.hub-video-backups/` **trước**
   → ghi ra file tạm → `rename` (nguyên khối, bộ dựng có thể đang đọc).
   `save.js` **không** thêm xuống dòng cuối file — mở rồi lưu lại phải ra file y
   nguyên từng byte.
2. **Chỉ `player.js` được chạm `window.__clip`.** `__clip.load()` tua về giây 0,
   nên `nap()` luôn nhớ giây hiện tại rồi tua lại. **`seek()` KHÔNG dừng phim** —
   dừng phải gọi `pause()`, và trạng thái chạy/đứng phải hỏi `clip.paused` chứ
   đừng tự giữ cờ riêng (cờ riêng lệch ngay lần đầu phim tự chạy hết). Xem
   `docs/DUNG-CHAY.md`.
3. **Không bao giờ thêm `export=1`** vào URL iframe — tham số đó tắt `fit()`, mọi
   phép đo lệch hết.
   **Có BA tầng phóng giữa pixel màn hình và toạ độ sân khấu**, không phải hai:
   `#stage` (co cho vừa khung) × `#cam` (máy quay) × phóng của trang cha
   (Ctrl+lăn, `web/zoom.js`). `player.quyDoi` chia cho tầng thứ ba,
   `player.hesoPhong` nhân nó vào. Quên tầng nào là bấm một đằng trúng một nẻo.
4. **Không ghi vào DOM của iframe.** Chỉ ĐỌC thì thoải mái — `anhnho.js` nhân bản
   nút DOM và chép `<style>` của bộ dựng ra trang cha để vẽ ảnh nhỏ, không đụng
   gì vào bên trong. Khi chép ra nhớ ba việc: đổi đường dẫn ảnh sang tuyệt đối
   (gốc của iframe là `/clip/`, của trang cha là `/`), chép cả biến CSS và màu
   nền của clip, và gỡ `opacity`/`transform` của khoảnh khắc hiện tại — món chưa
   bay vào thì `opacity` bằng 0, chép ra được ô trống trơn. Lớp phủ vẽ ở trang cha. Ngoại lệ duy nhất là
   `drag.js` đặt tạm `left`/`top` trong lúc kéo, và xoá ngay khi thả. Chèn bậy là
   làm bẩn đúng cái trang mà `export-video.mjs` sẽ đem đi quay thành phim.
5. **Cùng origin là điều kiện sống còn.** Server này tự phục vụ file dự án clip
   dưới `/clip/*` chứ không trỏ sang cổng 7800 — khác origin là mất
   `contentDocument`, mất luôn khả năng bấm chọn.
6. **Mọi thay đổi kịch bản đi qua `kho.sua(nhãn, việc)`.** Đó là thứ khiến hoàn
   tác luôn đúng. `nhãn` là câu tiếng Việt tả việc vừa làm ("kéo đổi chỗ").
7. **`proj.js` là chỗ duy nhất biết dự án clip nằm đâu.** Đừng rải đường dẫn.
   `validateScene` thì **mượn**, không chép — hai bản sẽ trôi khỏi nhau.
8. **Một slot việc nặng, không bao giờ hai.** `export-video.mjs` để khung hình
   tạm ở `.export-frames` theo cwd; hai lệnh song song đẻ ra hai video hỏng, im
   lặng. Script trong `tools/` của dự án clip **bắt buộc chạy với cwd = `TOOLS`**.
9. **Danh sách trắng, không phải danh sách đen** (`static.js`). Gốc dự án clip có
   `.env` chứa khoá ElevenLabs. Mọi đoạn đường dẫn bắt đầu bằng dấu chấm đều bị chặn.
10. **Khổ xuất phải khớp hướng clip** (`khoHopLe`). Chọn khổ ngang cho clip dọc
    thì bộ xuất vẫn chạy và ra video cắt cụt mà không báo lỗi.

## 5. Định dạng kịch bản (clip đời 2)

`scenes/<slug>.json` — thẩm quyền hợp lệ là `validateScene` trong
`clipvibe-studio/src/scene/types.ts`, không phải file nào trong repo này.

```jsonc
{ "version": 1,
  "meta": { "name", "width", "height", "density",
            "bg", "ink", "accent", "accent2", "hot", "hot2" },   // màu cả clip
  "scenes": [ { "id", "duration", "stagger", "camera", "cameraMove", "cameraEase",
                "elements": [ { "id", "kind", "x", "y",
                                "place": "giua|trai|phai|tren|duoi|cao|day",
                                "at": 0.4,                       // tính từ ĐẦU CẢNH
                                "in":  { "kind", "ease", "dur" },
                                "out": { "kind", "ease", "dur" },
                                "children": []                   // chỉ kind:"group"
                              } ] } ] }
```

- 25 `kind`; tên tiếng Việt và núm của từng loại ở `web/inspector/schema.js`.
- `kind: "video"` — nền động hoặc phim lồng trong khung. **Chromium không giải mã
  HEVC**, mà `public/video/BG.mp4`/`intro.mp4`/`outro.mp4` đều là HEVC → thả vào
  là ô đen câm lặng. Núm chọn file có nút chuyển sang H.264. Xem
  `docs/VIDEO-TRONG-CLIP.md`.
- Món mới **bắt buộc** có `id` không trùng trong cảnh, `kind`, và `x`/`y` là số —
  kể cả khi nằm trong cụm và hai số đó vô nghĩa. Thiếu là không lưu được.
- `place` là **vùng** (đặt cả chỗ lẫn bề rộng), không phải điểm. Món có `place`
  thì không kéo tự do được; món trong `group` do flex xếp chỗ.
- Phần tử thuộc về **một** cảnh; sang cảnh khác là mất — khung ứng dụng dùng lại
  ở nhiều cảnh thì phải khai lại ở từng cảnh.
- **Bẫy đặt tên:** trong bộ dựng `in.kind = "left"` nghĩa là món CHẠY SANG TRÁI,
  tức VÀO TỪ BÊN PHẢI. `schema.js` đã đảo cho đúng mắt người xem — đừng "sửa lại
  cho khớp tên biến".

## 5.1 Soát hai tầng

Lưu một clip đi qua **hai** bộ soát khác nhau, đừng lẫn:

| | `validateScene` (mượn của studio) | `soatChatLuong` (`web/soat.js`) |
|---|---|---|
| Hỏi | kịch bản có **hợp lệ** không | clip có **xem được** không |
| Bắt | thiếu trường, sai kiểu, trùng id, `at` vượt cảnh | chữ chìm vào nền, bay vào chưa xong đã hết cảnh, thò ra ngoài mép |
| Hỏng thì | **KHÔNG lưu được** | vẫn lưu được, chỉ báo |

Tầng hai **không bao giờ được chặn lưu**. Một clip tương phản thấp vẫn là clip
hợp lệ, và người dùng có quyền cố tình làm vậy. Chặn lưu vì lời khuyên là cách
nhanh nhất biến công cụ thành thứ người ta tìm đường đi vòng.

`web/soat.js` nằm trong `web/` vì trình duyệt phải tải được nó; Node 22 import
thẳng cũng chạy vì nó không chạm `node:` lẫn `document`.

**Ba bài học đã trả giá, đừng lặp lại khi thêm phép kiểm mới:**

1. **Nền của một món chữ là khối màu vẽ NGAY TRƯỚC nó.** Khối vẽ *sau* là vật
   che, không phải nền — lẫn hai thứ này là báo sai hàng loạt (đã mắc cả hai
   chiều: lấy khối đầu tiên thì nền phủ kín khung luôn thắng, 150 lời báo sai
   trên một clip; lấy khối sau cùng thì cửa sổ trình duyệt bật ra ở cuối cảnh
   thắng).
2. **Chỉ báo khi CHẮC.** Món dùng `place`, màu viết bằng `color-mix` → im. Mỗi
   lời báo sai dạy người dùng rằng bảng này nói nhảm, và từ đó họ bỏ qua cả lời
   báo đúng.
3. **Bốn phép kiểm của §3.2 đã bị BỎ vì không tính được từ dữ liệu** — cỡ chữ
   tối thiểu, màu viết cứng, lề an toàn, và "thò ra ngoài mép".

   Ba phép đầu: mấy clip này *vẽ lại giao diện sản phẩm thật*, nên chữ 8px trong
   thanh bên giả lập và màu đọc thẳng từ ảnh chụp sản phẩm đều là **cố ý**. Ba
   phép ấy báo 1.474 lỗi trên 11 clip, không một lỗi nào đáng sửa.

   Phép thứ tư sai từ gốc: **với `image` và `video`, `w`/`h` khai trong dữ liệu
   KHÔNG phải kích thước lúc vẽ** — bộ dựng còn co theo tỉ lệ file, theo `fit`,
   và theo `measureFit()`. Ảnh nền của `thu-trien-khai-doc` khai `h: 1280` nhưng
   vẽ ra 1920, nên nó bị kêu "thò ra ngoài mép" 9 lần trong khi phủ khung hoàn
   toàn đúng ý. Phép ấy bắt được **0** lỗi thật.

   Muốn đo bố cục thật thì đã có `/api/check-layout` — nó mở Chromium đo trên
   khung hình đã dựng. Đừng đoán hình học từ JSON.

## 6. Clip đời cũ (đời 1)

Mỗi clip là một file HTML tự chứa ở gốc dự án clip, tự phát hiện (`timDoiCu`),
lọc file nhỏ hơn 2000 byte. Vị trí do code tính lúc chạy ⇒ **không sửa bằng chuột
được**, chỉ xem và xuất video.

Ngoại lệ: **khung nhấn** (`server/khung.js` + `web/khung.js`). Toạ độ của chúng
là số viết thẳng trong mảng `LOP`/`XOA` (hậu tố `_N` = ngang, `_D` = dọc), tính
theo pixel ảnh mockup — sửa được và sửa thì có nghĩa. Cách làm:

- Bắt mảng bằng regex rồi chạy trong `node:vm`; hằng số của chính file được gom
  và chạy trước (quét theo **cặp ngoặc cân bằng**, không theo dòng).
- Cỡ ảnh đọc từ **IHDR của chính file PNG**, không đọc `const IMG_W` trong code.
- Ghi: giữ nguyên căn lề tay, **giữ nguyên xi các ô phía sau ô toạ độ**, cất cả
  file trước, ghi xong **đọc lại đối chiếu**, không khớp thì trả bản cũ về.

## 7. Kiểm thử

Không có test framework. Các bài kiểm là script Playwright chạy thật, cần **server
đang chạy**:

**Chạy cả bộ bằng một lệnh:**

```bash
npm run kiem                # 28 bài, tự dựng máy chủ riêng ở cổng 7804
npm run kiem -- tieng       # chỉ bài có chữ "tieng" trong tên
```

Bộ chạy tự dựng máy chủ **không mật khẩu** ở cổng riêng và truyền địa chỉ qua
`MOTION_GOC`. Từ khi có đăng nhập, máy chủ thật đòi mật khẩu nên gọi thẳng vào
7803 là bài kiểm nhận 302. **Đừng mở cửa hậu "bỏ qua đăng nhập ở localhost"** —
cửa hậu nào rồi cũng có ngày bị bật nhầm trên bản chạy thật.

Chạy lẻ từng bài thì vẫn được, cần server đang chạy:

```bash
npm run dev &                       # cổng 7803
node tools/kiem-sua.mjs             # bấm chọn · vặn · hoàn tác · lưu
node tools/kiem-khung.mjs           # chỉnh khung nhấn trên clip đời cũ
node tools/kiem-canh.mjs [slug]     # đo bố cục một cảnh bằng trình duyệt thật
node tools/kiem-goi-a.mjs           # thêm/xoá/nhân bản, kéo bằng chuột thật, xuất video
node tools/kiem-khung-xem.mjs       # với được vào window.__clip trong iframe không
node tools/kiem-soat.mjs            # bảng soát chất lượng: bắt đúng, không bắt thừa
node tools/kiem-chay-dung.mjs       # nút Chạy/Dừng, kể cả đường lùi khi bộ dựng thiếu pause()
node tools/kiem-nen-video.mjs       # món video: chạy trong khung xem VÀ lọt vào video xuất ra
node tools/kiem-phong.mjs           # Ctrl+lăn phóng khung: bấm và kéo có còn trúng không
node tools/kiem-anh-nho.mjs         # ảnh nhỏ thành phần: ĐÚNG CHỖ ĐẶT, đúng nền, ảnh không vỡ, dựng lười
node tools/kiem-huong-dan.mjs       # hướng dẫn tại chỗ: đủ núm, đúng khuôn viết, bàn phím dùng được
node tools/kiem-doi-cu.mjs          # clip đời cũ: thấy được, chạy/tua được, vẫn KHÔNG sửa được
node tools/kiem-dem-khe.mjs         # đệm trong / khe hở: không núm chết, không năng lực bị giấu
node tools/kiem-hieu-ung.mjs        # nhoè / bóng đổ / đẩy máy chậm: bộ dựng còn phần vá không
node tools/kiem-khe-media.mjs       # ảnh/phim trong màn hình điện thoại & trình duyệt, và ĐỒNG HỒ
node tools/kiem-keo-cot.mjs         # kéo đổi bề rộng cột: nhớ, chặn, và khung chọn không lệch
node tools/kiem-kho-hinh.mjs        # đổi khổ hình: nhân đúng khoá px, từ chối khác tỉ lệ
node tools/soi-doi-kho.mjs          # (đo, không phải kiểm) đổi sang khổ nào thì hỏng bao nhiêu
node tools/tu-xep-lai.mjs           # (đo) clip nào đã đổi khổ được, món nào phải xếp tay
node tools/ve-wireframe.mjs         # sinh clip mẫu wireframe-thu (--ghi mới ghi thật)

node tools/kiem-kho-mon.mjs         # menu thêm: bày đủ 24 loại + 10 bộ dựng sẵn, thả vào là thấy ngay
npm run kiem:schema                 # CHẶN LỆCH SCHEMA giữa types.ts ↔ schema.js ↔ bộ dựng
```

Riêng **`node tools/kiem-lichsu.mjs`** chạy bằng Node trần — không cần server,
không cần Chromium, vài trăm mili giây. Nó giữ luật "mọi thay đổi đi qua
`kho.sua()`": làm 20 việc rồi hoàn tác 20 lần thì kịch bản phải về đúng từng
byte. **Bài này không được phép fail** — fail nghĩa là có đường sửa kịch bản lọt
ra ngoài sổ, và người dùng sẽ mất việc mà không hiểu vì sao.

Chromium cần thư viện hệ thống; workspace mới dựng có thể thiếu. Triệu chứng là
`error while loading shared libraries`. Vá một lần:

```bash
cd "$PROJ_ROOT/tools" && sudo node node_modules/playwright/cli.js install-deps chromium
```

Playwright **mượn** từ `node_modules` của dự án clip. Ảnh chụp ra `.kiem/`.
Thoát 0 = qua.

**Luật của bài kiểm:** không bao giờ đụng clip thật. `kiem-sua.mjs` tự tạo clip
tạm rồi tự xoá; `kiem-khung.mjs` chụp cả file trước, so từng byte sau, và `finally`
chép bản chụp đè lại. Giữ nguyên kỷ luật này khi viết bài kiểm mới.

`tools/ve-*.py` (+ `ve_chung.py`) là bộ **sinh** kịch bản bằng Python — dựng cảnh
từ khối hình học và chạy bốn phép kiểm bố cục (`kiem_trong`, `kiem_dong`,
`kiem_sao`, `kiem_camera`) trước khi ghi `scenes/*.json`. Chạy từ trong `tools/`.

## 8. Quy ước viết code

- **Tên hàm, biến, khoá dữ liệu bằng tiếng Việt không dấu** (`docClip`, `luuClip`,
  `vanDe`, `khungXem`). Giữ nguyên, đừng "dịch sang tiếng Anh cho chuẩn".
- **Comment giải thích VÌ SAO**, thường kèm sự cố có thật đã gặp. Đó là tài sản
  của repo này — khi sửa một chỗ có comment kiểu đó, đọc trước, và cập nhật
  comment nếu lý do đổi.
- Câu chữ hiện ra cho người dùng: tiếng Việt đời thường, nói rõ **thiếu cái gì**,
  không để lọt từ kỹ thuật (không "opacity", không "stagger", không "ease").
  `web/inspector/schema.js` là việc viết câu chữ, không phải viết code — cả núm
  lẫn **hướng dẫn tại chỗ** (`HUONG_DAN`, `HUONG_DAN_CHUNG`, `HUONG_DAN_MAU`).
  Khuôn: tiêu đề dưới 6 từ, mô tả dưới 35 từ, không từ kỹ thuật — có
  `tools/kiem-huong-dan.mjs` canh, không phải tự nhớ. Xem `docs/HUONG-DAN-TAI-CHO.md`.
- **Ảnh nhỏ trong bảng lớp có quy tắc riêng, áp cho mọi clip** — 7 điều trong
  `web/anhnho.js`, tài liệu ở `docs/QUY-TAC-ANH-NHO.md`. Nền dưới mỗi món dùng
  chung hàm `banDoNen()` của `soat.js` với phép soát chất lượng: hai nơi không
  được nói khác nhau. Sửa cách vẽ ô ảnh thì chạy `tools/kiem-anh-nho.mjs` mục 5 —
  nó đo **chỗ đặt**, vì lỗi cũ (156 ô trắng) qua được mọi phép kiểm "có nội dung".
- **Phim nằm TRONG món khác phải được ghim theo đồng hồ clip.** Thẻ `<video>` tự
  phát theo đồng hồ thật: xem trong trình sửa tưởng đúng, mà tua tới giây nào nền
  cũng đứng ở giây 0 và mỗi lần xuất ra một khung khác. `applyEl` gọi `TICK.video`
  cho mọi món có chứa thẻ video. Xem `docs/VIDEO-TRONG-CLIP.md`.
- **Hiệu ứng hình (`soft`/`softIn`/`shadow`/`push`) cần phần vá trong
  `scene-player.html`** — file của dự án chung, KHÔNG có git. Ai khôi phục file
  đó từ bản sao lưu cũ là núm vẫn còn mà hiệu ứng biến mất, không báo gì.
  `tools/kiem-hieu-ung.mjs` đọc thẳng file ấy để bắt ca đó. Xem `docs/HIEU-UNG-HINH.md`.
- **Sửa `web/inspector/schema.js` thì chạy `npm run kiem:schema`.** Nó đối soát
  ba nơi: `types.ts` (hợp đồng) ↔ `schema.js` (núm) ↔ `scene-player.html` (nơi
  thật sự vẽ). Bắt cả núm ma lẫn năng lực bị giấu. Xem `docs/CHAN-LECH-SCHEMA.md`.
- **Bộ dựng sẵn (`KIT` trong `them.js`) phải khai `place`, đừng khai toạ độ.**
  Cụm khai `place` thì tự xếp lại khi đổi khổ clip; khai toạ độ cứng là góp thêm
  vào 96,8% số món hiện không đổi khổ được. Khuôn lấy từ clip thật, không bịa.
- **Chỉ bày núm mà bộ dựng THẬT SỰ đọc.** `DEM_TRONG`/`KHE_HO` trong `schema.js`
  là bảng sự thật cho `pad`/`gap`, kèm bậc mặc định thật. Bày núm chết còn tệ hơn
  không bày — bấm vào thì kịch bản đổi mà khung hình đứng im. `tools/kiem-dem-khe.mjs`
  ĐO THẬT bằng Chromium rồi đối chiếu hai chiều. Xem `docs/DEM-KHE.md`.
- **Clip đời cũ nạp kèm `?export=1`, clip đời mới TUYỆT ĐỐI KHÔNG.** Tham số đó
  tắt `fit()` nên mọi phép đo lệch — clip đời mới sửa được nên phép đo phải đúng;
  clip đời cũ không sửa được nên không có gì để lệch, mà đổi lại thì có `__clip`
  (cả 12 clip đều phơi `duration/ready/play/at/seek`) nên chạy và tua được.
  `__clip` của clip đời cũ **không có `scenes()`** — hỏi trước rồi hãy gọi.
- **Giao diện theo bản dựng Stitch** (`stitch_d_n_kh_i_nghi_p/`) — bảng màu và
  nhịp nằm gọn trong `:root` của `web/app.css`, đừng viết màu thẳng vào rule.
  Nhấn là **xanh lá**, chữ trên nhấn là `var(--tren-nhan)`. Không dựng nút cho
  tính năng không có thật (vòng màu, LUT, track âm thanh, đồng bộ cloud) — xem
  bảng "KHÔNG được dựng" trong `docs/GIAO-DIEN.md`.
- Commit message tiếng Việt, mô tả việc thật.

## 9. Cạm bẫy đã biết

- `.drafts/`, `.hub-video-backups/`, `.kiem/`, `.port*` là **dữ liệu chạy**, đã
  `.gitignore`. Đừng commit.
- Nháp mới hơn file thật thì **HỎI**, tuyệt đối không tự áp.
- Bộ xuất hứng hình bằng cách quay màn hình theo thời gian thật ⇒ phim 26 giây
  mất ít nhất 26 giây. Đây là điều phải **báo trước**, không phải chỗ chậm cần giấu.
- `export-video.mjs` bắt buộc có `--every 1 --jpeg 92`, để mặc định là video vấp.
- SSE phải gửi `X-Accel-Buffering: no`, không thì Traefik gom đệm và tiến độ đứng hình.
- `out/` là kho chung, có script khác gán cứng đường dẫn trong đó
  (`ghep-map-domain.mjs`, `trang-tai-ve.mjs` đọc không đệ quy) — **đừng dời file**,
  chỉ xếp lại cách nhìn (`bo-video.js`).
- `nen` và `sweep` được đặt `pointer-events:none` ⇒ chỉ chọn được từ danh sách
  thành phần bên trái.

## 10. `ARCHITECTURE.md` — đã đối chiếu, đây là kết quả

`ARCHITECTURE.md` (chưa vào git) là bản thiết kế **chủ đích** của chủ dự án, viết
cho một hệ khác: 5 lớp, Remotion + React, Zod, JSON Patch, agent pipeline,
chunking video dài. Repo này là JS thuần không gói phụ thuộc, nên phần lớn tài
liệu ấy **không áp vào đây được** — nhưng nguyên tắc thì áp được, và đã áp.

Ngày 10/09/2026 đã soi từng mục. Kết quả:

| Mục | Trạng thái |
|---|---|
| R1 · AI sinh DATA không sinh HTML | **sẵn đúng** — trình sửa chỉ đụng `scenes/*.json` |
| R5 · một cổng duy nhất để đổi document | **sẵn đúng** — `kho.sua()`; nay có `kiem-lichsu.mjs` canh |
| §4 · gom nhóm undo theo cử chỉ | **sẵn đúng** — `moCuChi`/`dongCuChi`, 60 nhịp kéo = 1 bước |
| §6.1 · Inspector tự sinh từ schema | **sẵn đúng** — `inspector/schema.js` + `fields.js` |
| §6.2 · bố cục 3 vùng | **sẵn đúng** |
| §3.2 · **Validator** ("thiếu hoàn toàn và quan trọng nhất") | **đã làm** — `web/soat.js`, xem mục 5.1 |
| §9 · `history.test` ("không được fail") | **đã làm** — `tools/kiem-lichsu.mjs` |
| §6.4 · giấu núm nâng cao | **đã làm** — `<details class="nang-cao">` |
| §6.4 · slider Tốc độ / Độ trễ | **sẵn có** — "Nhanh / chậm" và "Chờ rồi mới hiện" |
| §6.3 · nhịp chung + nền mờ | **đã làm** — token `--nhip*`/`--da-*`, `backdrop-filter`, kèm `prefers-reduced-motion` |
| R2 · agent trả JSON Patch | **không áp** — ở đây không có agent nào ghi vào kịch bản |
| R3 · cấm màu viết cứng | **đã thử rồi bỏ** — xem mục 5.1, bài học 3 |
| R4/§5 · renderer thuần, Remotion | **không đụng được** — bộ dựng là `scene-player.html` của dự án khác |
| §2.5 · Zod | **không áp** — repo không có gói phụ thuộc, và `types.ts` mới là thẩm quyền |
| §3.2 · id duy nhất TOÀN document | **không áp** — id ở đây có phạm vi từng cảnh (`data-scene` + `data-el`); mọi cảnh đều có `chu-1` là chuyện bình thường |
| §11 · chunking video 3 phút | **không áp** — clip ở đây 15–30 giây |
| §6.3 · bottom sheet | **không áp** — đây là công cụ desktop ba cột, không phải app điện thoại |

Muốn đi tiếp theo tài liệu ấy (viết lại bằng React/Remotion) thì đó là **dự án
mới**, không phải sửa dần repo này — nói rõ với người dùng trước khi bắt đầu.

Tài liệu áp thẳng vào repo này nằm trong `docs/`: `QUY-UOC-CLIP.md` (dựng clip
sao cho sửa được bằng chuột), `STITCH.md` (MCP Stitch dựng màn hình UI),
`MAU-CHU-RIENG.md` (sửa đổi đã làm trong `scene-player.html` của dự án chung —
nay có núm "Màu chữ riêng" trong bảng thuộc tính, không phải sửa tay JSON nữa),
`QUY-TAC-ANH-NHO.md` (quy tắc ảnh nhỏ bảng lớp, áp cho mọi clip),
`GIAO-DIEN.md` (dựng lại giao diện theo bản Stitch, và những gì cố ý không dựng),
`KEO-COT.md` (kéo đổi bề rộng hai cột, và bẫy khung chọn lệch),
`DOI-KHO-HINH.md` (đổi khổ cùng tỉ lệ, và vì sao khác tỉ lệ phải xếp lại chứ không nhân được),
`CHAN-LECH-SCHEMA.md` (đối soát ba nơi khai trường, và ba cái bẫy trong chính phép kiểm),
`KHO-THANH-PHAN.md` (menu thêm chia theo bộ, 10 bộ dựng sẵn, và một nửa kho từng bị giấu),
`CLIP-WIREFRAME.md` (clip mẫu dựng toàn bằng `place`, đổi khổ nào cũng chạy),
`HIEU-UNG-HINH.md` (nhoè, bóng đổ, đẩy máy chậm — có sửa `scene-player.html`),
`DUNG-CHAY.md` (thêm `pause()`/`paused` vào `scene-player.html`, kèm đường lùi và
cách khôi phục), `VIDEO-TRONG-CLIP.md` (thành phần `video`, bẫy HEVC, cách đổi
định dạng).

**Ba file `docs/*.md` trên ghi các sửa đổi trong `scene-player.html` — file của
dự án chung, có người thay hằng ngày.** Thay cả file là hai đoạn ấy biến mất và
hỏng lặng lẽ. Mỗi file có mục "khôi phục" và có bài kiểm canh; đọc trước khi
đụng vào bộ dựng.
