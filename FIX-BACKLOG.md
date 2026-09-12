# FIX-BACKLOG.md — matbao-hub-video

> Soát ngày 11/09/2026, trên commit `9aa1887` (38 commit).
> Mỗi mục có **chỗ sửa** và **nghiệm thu**. Làm xong mục nào tick mục đó.
> Dùng với Claude Code: `Đọc FIX-BACKLOG.md, làm F2, chỉ F2, rồi dừng lại báo cáo.`

**Thứ tự bắt buộc:** F2 → F3 → F1 → F4 → F5 → F6 → F7
F2/F3 rẻ và mở đường cho CI. F1 khó nhất nhưng mọi thứ về sau dựa lên nó.

---

## F1 · Xuất video: bỏ quay-màn-hình-thời-gian-thật `[P0]`

**Vấn đề.** `server/jobs.js:12` tự khai: *"nó chạy đúng bằng thời lượng phim — cách hứng hình là quay màn hình theo thời gian thật"*.
→ 3 phút phim = tối thiểu 3 phút xuất, mỗi lần.
→ Không song song được (`.export-frames` dùng chung cwd → đã phải khoá một-slot).
→ **Không deterministic**: máy bận là rớt frame. Cache theo hash vô nghĩa.

**Chỗ sửa.** `tools/export-video.mjs` (nằm ở repo clipVibehost), `server/jobs.js`.

**Cách làm.**

1. Bộ dựng phải phơi ra một hàm seek thuần:
   ```js
   window.__seek = (t) => { /* đặt toàn bộ scene về đúng thời điểm t giây */ }
   ```
   Điều kiện: mọi animation là **hàm thuần của `t`**. Cấm `requestAnimationFrame` tự chạy, cấm CSS `animation`/`transition`, cấm `Date.now()`, cấm `Math.random()` không seed.

2. Đổi vòng lặp hứng hình:
   ```js
   for (let i = from; i < to; i++) {
     await page.evaluate((t) => window.__seek(t), i / fps)
     await page.evaluate(() => document.fonts.ready)
     await page.screenshot({ path: `${frameDir}/${String(i).padStart(6,'0')}.png` })
   }
   ```

3. Nhận `--from --to --out` → chạy N worker song song trên N dải frame.
   Mỗi worker có `frameDir` riêng, **bỏ thư mục dùng chung**.

4. `jobs.js`: bỏ khoá một-slot cho việc xuất (giữ cho việc kiểm bố cục).
   Tiến độ = `framesDone / framesTotal`, thôi suy từ đồng hồ.

**Nghiệm thu.**
- [ ] Xuất cùng một clip 2 lần, **cùng cách chia dải worker** → 2 file byte-identical
      (xem "Đã đo" #4: byte-identical giữa *hai cách chia khác nhau* là bất khả thi)
- [ ] Clip 15s xuất xong < 20s với 4 worker
- [ ] Số frame ra đúng `round(duration * fps)`, không lệch 1
- [ ] `vibe-host` cảnh 3: dừng tại một giây, chụp 3 lần cách nhau 0,5s → 3 ảnh y hệt

---

### Đã đo trên máy, 11/09/2026 — trước khi làm

Chạy thật trên `scene-player.html` với Chromium. Năm điều cần sửa trong bản kế hoạch trên:

**1. Điều kiện tiên quyết ĐÃ ĐẠT SẴN — đây không phải "thay đổi sâu nhất".**
`render(t)` đã là hàm thuần của `t`; `requestAnimationFrame` chỉ chạy khi đang phát;
`Math.random` **không xuất hiện lần nào** trong 1584 dòng. Tác giả đã cố ý dựng cho
bước-frame — chú thích ngay trong file: *"Lái bằng CHÍNH `t` của clip, tuyệt đối
không dùng animation của CSS — bộ xuất video nhảy thẳng tới từng mốc giây"*.

**2. `window.__seek` không tồn tại.** Đã có sẵn `window.__clip.seek(t)` và
`window.__clip.step(t)` — và `__clip` là **giao kèo đã ghi** với `tools/export-video.mjs`,
`shots-18s.mjs`, `scan-sfx-cues.mjs`. Thêm `__seek` là dựng cửa thứ hai vào cùng một
phòng. Dùng cái đã có.

**3. Đúng MỘT chỗ phạm luật thuần — đã bắt được tận tay.**
`.k-chat .go::after { animation: nhay 1s steps(2) infinite }` (dòng 216), dùng trong
`vibe-host.json`. Dừng ở giây 11,25 rồi chụp ba lần cách nhau 0,5s ra **ba ảnh khác
nhau**. Phải lái con trỏ nháy bằng `t`, hoặc tắt hẳn lúc xuất.

**4. "Byte-identical" theo nghĩa mạnh là bất khả thi — đổi tiêu chí nghiệm thu.**

| Phép thử | Kết quả |
|---|---|
| Hai tiến trình riêng, **cùng đường seek** | ✅ byte-identical |
| Cùng tiến trình, seek xuôi rồi ngược | ❌ lệch **0,74% điểm ảnh** |
| Worker bắt đầu ở frame 60 vs render một lượt từ 0 | ❌ 3/4 mốc lệch |

Nhìn hai ảnh thì **không phân biệt được** — lệch nằm ở khử răng cưa của chữ, đổi theo
việc trình duyệt đã dựng những tầng ảnh nào trước đó. Tắt GPU không cứu được
(6802/921600 điểm, y như cũ), mồi trước bằng cách quét hết cảnh cũng không.

→ Hệ quả: cache phải hash **đầu vào** (đúng như §11.5 của `ARCHITECTURE.md` đã nói),
tuyệt đối không hash file ảnh ra. Và vết nối giữa hai dải worker chỉ khác nhau ở mức
khử răng cưa — H.264 nuốt mất, không thành vệt nhìn thấy.

**5. "3 phút xuất trong 30–45 giây" — đo ra chưa tới.** Chụp hình mới là chỗ nghẽn,
không phải seek:

| Cách hứng hình | ms/khung | 3 phút ÷ 4 worker |
|---|---|---|
| chỉ seek, không chụp | **8,3** | 11s |
| `page.screenshot()` png | 111,0 | 150s |
| CDP `Page.captureScreenshot` png | 90,2 | 122s |
| CDP jpeg q90 | 64,3 | 87s |
| CDP jpeg q90 `optimizeForSpeed` | **57,0** | **77s** |

Seek chỉ tốn 8,3ms → bộ dựng không phải vấn đề. Muốn xuống 45s thì phải **8 worker**
(≈38s), hoặc bơm thẳng khung hình vào `ffmpeg` qua stdin thay vì ghi PNG ra đĩa.
Clip 15s với 4 worker: ≈**6,4s** — mục nghiệm thu "< 20s" thừa sức đạt.

**6. Video nền phải chờ `seeked`.** `TICK.video` đã ghim `currentTime` đúng khung khi
đang dừng — rất tốt — nhưng gán `currentTime` là **bất đồng bộ**. Chụp ngay sau đó là
bắt phải khung cũ. Phải `await` sự kiện `seeked` trước khi chụp.

**7. `document.fonts.ready` mỗi khung là thừa.** Nó đã được chờ trong `__clip.ready()`.
Gọi lại 5400 lần chỉ tốn thêm một vòng gọi qua CDP mỗi khung.

---

## F2 · Chặn schema drift giữa hai repo `[P0 · nửa ngày]`

**Vấn đề.** `web/inspector/schema.js:11` — *"Đối chiếu với: clipvibe-studio/src/scene/types.ts"*.
500 dòng, 24 loại element, đối chiếu **bằng mắt** qua ranh giới repo. Đây là nguồn của phần lớn "lỗi lặt vặt".

**Chỗ sửa.** Thêm mới `tools/kiem-schema.mjs`.

**Cách làm.**

```js
// tools/kiem-schema.mjs
// Đọc types.ts của clipvibe-studio, đối chiếu tên kind + tên field với schema.js.
// Lệch → in ra bảng thiếu/thừa → exit 1.
```

Bắt 3 loại lệch:
- `kind` có trong `types.ts` nhưng thiếu trong `schema.js` (inspector không sửa được)
- `kind` có trong `schema.js` nhưng bộ dựng không còn đọc (núm ma)
- Field lệch tên trong cùng một `kind`

Thêm vào `package.json`:
```json
"scripts": { "kiem:schema": "node tools/kiem-schema.mjs" }
```

**Nghiệm thu.**
- [ ] Chạy trên repo hiện tại → in ra danh sách lệch thật (nếu sạch thì exit 0)
- [ ] Cố tình xoá 1 field trong `schema.js` → exit 1, báo đúng tên field

**Ghi chú.** Giữ nguyên phần câu chữ tiếng Việt (`KHO_VAO`, `KHO_CHO`…) — phần đó viết rất tốt. Chỉ đối chiếu phần **cấu trúc**.

---

## F3 · Bỏ đường dẫn tuyệt đối `[P0 · nửa ngày]`

**Vấn đề.** Hardcode `/home/coder/workspace/projects/clipVibehost/hosting-animatic-production` trong `tools/chup-ttindex.mjs:16`, `tools/kiem-canh.mjs:29` và vài chỗ khác. Repo khoá cứng vào một máy → không chạy được CI, không ai khác chạy được.

**Cách làm.**

```js
// server/proj.js — một chỗ duy nhất
export const CLIPVIBE_ROOT =
  process.env.CLIPVIBE_ROOT ||
  path.resolve(GOC, '../clipVibehost/hosting-animatic-production')

if (!existsSync(CLIPVIBE_ROOT))
  chetSom(`Không thấy dự án clip. Đặt CLIPVIBE_ROOT=... rồi chạy lại.`)
```

Mọi file trong `tools/` import từ đây, không tự viết đường dẫn.
Thêm `.env.example` ghi rõ biến cần đặt.

**Nghiệm thu.**
- [ ] `grep -rn "/home/coder" tools/ server/` → không ra kết quả nào
- [ ] Đổi tên thư mục clipVibehost → server báo lỗi rõ ràng, không crash khó hiểu

---

## F4 · Tách validator: cấu trúc vs bố cục `[P1 · 1–2 ngày]`

**Vấn đề.** Commit `07bcce1` gỡ phép kiểm "thò ra ngoài mép" vì báo oan 9 lần. **Lý do bạn ghi là đúng** — `w/h` khai trong data không phải kích thước lúc vẽ (image co theo `fit`, theo `measureFit()`). Nhưng kết luận đúng không phải là bỏ phép kiểm.

**Nguyên tắc.** Validator hình học phải chạy trên **geometry đã resolve**, không phải số khai trong data.

**Cách làm.** Tách làm hai, đừng gộp:

| | Chạy khi | Đo cái gì | Yêu cầu |
|---|---|---|---|
| `soat-cautruc` | mỗi lần sửa | schema, id trùng, timing, token tồn tại, `in.dur ≤ duration` | < 5ms, thuần data |
| `soat-boccuc` | lúc lưu / trước khi xuất | tràn mép, đè nhau, contrast | mở Chromium, đo `getBoundingClientRect()` |

`/api/check-layout` đã làm đúng việc thứ hai — dựng lại phần đó thành `soat-boccuc`, và **trả về phép kiểm tràn mép** nhưng đo trên rect thật.

**Nghiệm thu.**
- [ ] `thu-trien-khai-doc` → 0 lỗi tràn mép giả, vẫn giữ lỗi contrast thật (`#22c55e` trên `#dcfce7`, 2,1:1)
- [ ] `soat-cautruc` chạy < 5ms trên file 245KB
- [ ] Chạy đủ 11 clip, không có báo oan

---

## F5 · Chunk hoá scene JSON `[P1 · 2–3 ngày]`

**Vấn đề.** `thu-trien-khai-html.json` = **429 element / 13,6 giây / 245KB**.
Ngoại suy 3 phút → ~5.700 element, ~3MB một file. Load / validate / save / backup đều O(n) trên cả file.

**Cách làm.** Theo §11.3 của `ARCHITECTURE.md`:

```
scenes/
  cta.json            → manifest: meta, tokens, danh sách chunk (KHÔNG chứa element)
  cta/
    ck_001.json       → element của chunk
    ck_002.json
```

- Chunk tối đa **300 frame**. Cảnh dài hơn phải cắt.
- Chunk có `hash` (chỉ hash token nó thật sự dùng — xem §11.5, đây là chỗ dễ sai nhất).
- Viết `tools/chuyen-sang-chunk.mjs` di trú 11 clip hiện có, **có bước kiểm ngược**: gộp chunk lại phải ra JSON y hệt bản gốc.

**Nghiệm thu.**
- [ ] 11/11 clip di trú xong, gộp ngược ra file trùng khớp bản gốc
- [ ] Sửa 1 chunk → đúng chunk đó + 2 transition kề chuyển `stale`, còn lại `fresh`
- [ ] Mở clip 3 phút < 1s (chỉ load manifest)

---

## F6 · Nút "Rã ra để sửa" `[P1 · 2–3 ngày]`

**Vấn đề.** 24 `kind` là hộp đen do code vẽ. Bấm vào `quydao` chỉ chỉnh được 4 núm (`core`, `label`, `logo`, `warm`). Muốn dời một chấm bên trong → phải sửa Python. Đây là than phiền gốc "nhiều thành phần không edit được".

Thêm nữa, mỗi `kind` mới tốn 3 chỗ sửa (bộ dựng + `schema.js` + `fields.js`) → chi phí tăng tuyến tính, sẽ nghẽn quanh 30 loại.

**Cách làm.** Hai tầng:

- **Nguyên thuỷ:** `rect`, `text`, `image`, `path`, `group` — sửa tới từng thuộc tính.
- **Tổng hợp:** 24 kind hiện tại, giữ nguyên để dựng nhanh.
- **Nút "Rã ra để sửa"**: `quydao` → `group` chứa các nguyên thuỷ. Một chiều, cảnh báo trước. Giống *Detach component* của Figma.

Cần: mỗi kind tổng hợp phải có hàm `raRa(el, tokens) → Element[]` trả về đúng thứ nó vẽ.

**Nghiệm thu.**
- [ ] Rã `quydao` → render ra khung hình **giống hệt** trước khi rã (so pixel, sai lệch < 1%)
- [ ] Sau khi rã, sửa một con của nó trong inspector → preview đổi đúng
- [ ] Rã rồi hoàn tác → về đúng nguyên trạng

---

## F7 · `text.runs` thay markup trong chuỗi `[P2 · 1–2 ngày]`

**Vấn đề.**
```
"Tìm tên miền [[public/icu-logo.svg]] | **của riêng bạn**"
```
DSL mini nhét trong string: `[[…]]` = ảnh, `|` = xuống dòng, `**…**` = đậm.
Không validate được, không sửa được trong inspector. Bằng chứng nó là gánh nặng: đã phải viết `kiem_sao()` chỉ để chặn cặp `*…*` bắc qua dấu `|`.

**Cách làm.**
```jsonc
"runs": [
  { "t": "Tìm tên miền" },
  { "img": "public/icu-logo.svg" },
  { "br": true },
  { "t": "của riêng bạn", "bold": true }
]
```
Giữ `text` cũ đọc được (đọc xong parse sang `runs` ngay). Viết `tools/chuyen-runs.mjs` di trú.
Sau khi xong, **xoá `kiem_sao()`** — nó không còn lý do tồn tại.

**Nghiệm thu.**
- [ ] 11 clip di trú, render ra khung hình không đổi
- [ ] Inspector sửa được từng đoạn riêng (đổi chữ, bật/tắt đậm, thay ảnh)
- [ ] `kiem_sao()` đã xoá

---

## F8 · Lưới an toàn `[P2 · 1 ngày]`

Làm sau khi F3 xong (cần hết đường dẫn tuyệt đối).

```
.github/workflows/ci.yml   → kiem:schema → soat-cautruc trên 11 clip → xuat-thu
tests/
  determinism.test.mjs     → xuất 2 lần, sha256 phải trùng   (bảo vệ F1)
  chunk-hash.test.mjs      → sửa chunk N → đúng N + 2 kề stale (bảo vệ F5)
  ra-ra.test.mjs           → rã rồi render, so pixel          (bảo vệ F6)
```

`xuat-thu`: xuất `clip-15s` ra segment, assert đúng số frame + duration + hash.
Bắt được mọi hồi quy của bộ dựng trước khi bạn phát hiện bằng mắt.

---

## F9 · Backup → inverse patch `[P3]`

`.hub-video-backups` giữ 50 bản/clip theo **file**. Với clip 3 phút (3MB × 11 clip × 50) = **1,6 GB**, và chỉ khôi phục được cả file, không lùi được một thao tác.

Đổi sang inverse patch theo §11.10 của `ARCHITECTURE.md`: nhẹ hơn vài trăm lần, và đúng thứ người dùng cần (Ctrl+Z).
Giữ `chupBanGoc()` một bản/ngày làm phao cuối — phần đó hợp lý, không bỏ.

---

## Thêm vào CLAUDE.md

```
Chỉ đọc và sửa: server/, web/, tools/, docs/, tests/
Bỏ qua hoàn toàn: .drafts/, .kiem/, .hub-video-backups/, clip-15s/*.mp4, __pycache__/
Nếu grep ra file trong nhóm bỏ qua, coi như không tồn tại — đó là dữ liệu chạy, không phải mã nguồn.

Không sửa web/inspector/schema.js mà không chạy `npm run kiem:schema`.
Không thêm kind mới mà không có hàm raRa() đi kèm.
Mọi animation phải là hàm thuần của t. Cấm rAF tự chạy, CSS animation, Date.now(), random không seed.
```
