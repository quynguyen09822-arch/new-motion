# BANG-CHINH-V2.md — Thiết kế lại bảng chỉnh (inspector)

> Soạn 18/09/2026. Dựa trên góp ý của Quý (3 ảnh chụp bảng chỉnh) và đọc
> `web/inspector/schema.js`, `fields.js`.
>
> **Điều quan trọng nhất, đọc trước:** phần lớn việc này là **trình bày
> lại** một schema vốn đã khai bằng dữ liệu, KHÔNG phải viết lại động cơ.
> - Gói chuyển động đã có sẵn: mảng `KHO_VAO` và `KHO_RA` trong schema.js, mỗi
>   gói có `id`, `ten`, `m` (tokens kind/ease/dur), `goi` (gợi ý dùng cho gì).
>   Hiện bị bày dưới dạng ô sổ xuống — chỉ cần đổi cách bày.
> - Thanh kéo đã có sẵn: `kieu: 'so'` (min/max/buoc). Hiệu ứng hình hiện
>   dùng `kieu: 'bac'` (bậc rời rạc) — đổi sang thanh kéo là đổi kiểu, không
>   phải thêm khái niệm mới.
>
> Vì vậy đây là dự án **giao diện**, không phải dự án engine. Đừng để ai
> trong team biến nó thành cớ viết lại renderer.

---

## Vấn đề gốc (một câu)

Bảng chỉnh bắt người dùng **đọc chữ để hình dung kết quả** — "Vừa" nhoè là
nhoè bao nhiêu? "Hiện dần" trông ra sao? Người rành clip còn đoán sai, người
không rành thì bỏ cuộc.

## Ba nguyên tắc cho cả đợt này

1. **Thấy trước khi chọn.** Mỗi gói chuyển động, mỗi hiệu ứng phải có ô xem
   thử động ngay tại chỗ. Người dùng nhìn, không đọc.
2. **Chỉ hiện thứ đang cần.** Chọn thành phần nào thì bày đúng núm của loại
   đó; chọn hiệu ứng nào mới mở tinh chỉnh của hiệu ứng đó. Phần còn lại nằm
   sau "Nâng cao".
3. **Kéo, đừng đoán.** Thay bậc rời rạc và ô sổ xuống bằng thanh kéo có số %
   hiện rõ. Người dùng chỉnh liên tục và thấy con số mình đang đặt.

## Ràng buộc chung (áp cho mọi prompt bên dưới)

- Sửa `schema.js` là phải chạy `npm run kiem:schema` — file này soi lệch với
  `clipvibe-studio/types.ts`, lệch là hỏng thật (luật F2 trong CLAUDE.md).
- **Ô xem thử phải chạy bằng chính renderer thật**, dựng một cảnh tí hon một
  món rồi lặp — KHÔNG vẽ tay animation riêng. Xem thử mà nói dối thì tệ hơn
  không có.
- 9 clip hiện tại đều `version 1`. Không được làm chúng mở ra sai. Việc 3 đổi
  schema → bắt buộc có đường đọc ngược dữ liệu cũ.
- Không gói phụ thuộc, không bước dựng. Vanilla ESM như cũ.
- Đây là việc giao diện: **không đụng `scene-player.html`** trừ khi thật cần;
  nếu phải đụng thì sao lưu trước và ghi vào `docs/` kèm lệnh khôi phục.

**Thứ tự làm: Hạ tầng → Việc 1 → Việc 2 → Việc 3.**
Làm hạ tầng trước vì Việc 1 và 2 dùng chung nó. Việc 3 để cuối vì nó đụng
schema, rủi ro nhất.

---

## Hạ tầng · Ô xem thử dùng chung `[nền của mọi thứ · 1–2 ngày]`

**Vì sao làm trước.** Cả gói chuyển động (Việc 2) lẫn popup hiệu ứng (Việc 1)
đều cần một thứ: một ô nhỏ diễn lại một hiệu ứng để người dùng nhìn. Viết một
lần, hai chỗ xài. Viết hai lần là hai lần sai khác nhau.

**Cách làm.** Một thành phần `<o-xem-thu>` nhận vào: loại món mẫu (mặc định là
một thẻ chữ), một mảnh tokens (chuyển động hoặc hiệu ứng), và giá trị hiện
tại. Nó dựng một cảnh một-món bằng renderer thật, chạy lặp ~1.5 giây. Nhẹ:
một khung, không tiếng, tạm dừng khi ra khỏi tầm nhìn.

**Nghiệm thu.**
- [ ] Cho cùng một token vào ô xem thử và vào clip thật → chuyển động trùng khớp
- [ ] Mở bảng có 10 ô xem thử cùng lúc → không giật, không nóng máy
- [ ] Đổi giá trị (vd kéo mức nhoè) → ô xem thử đổi theo trong khoảng nửa giây

> **Trạng thái 19/09:** đã khảo sát và trình API trong `docs/O-XEM-THU.md`.
> Chưa viết mã, đang chờ Quý duyệt ba câu hỏi trong đó.

**Prompt:**
```
Đọc BANG-CHINH-V2.md và CLAUDE.md. Làm phần "Hạ tầng · Ô xem thử dùng
chung", chỉ phần này, rồi dừng báo cáo.

Ô xem thử BẮT BUỘC dùng renderer thật (dựng cảnh một-món), không được vẽ
tay animation riêng — nếu không hai chỗ sẽ diễn khác clip thật. Tối ưu để
mở nhiều ô cùng lúc không giật: dừng ô khi nó ra khỏi màn hình.
Trước khi code, cho anh xem API của thành phần này (nhận gì, trả gì).
```

---

## Việc 1 · Bảng hiệu ứng theo thành phần `[P0 · 2–3 ngày]` (ảnh 3, 4)

**Góp ý của anh.** Các nút "Lề quanh mép" (Sát…Tối đa) trình bày rối và không
thấy hiệu quả. Hiệu ứng hình bày thành hàng nút bậc (Không/Rất nhẹ/…/Rất đậm)
và ô sổ xuống, khó hình dung. Muốn: chọn thành phần → hiện thanh kéo riêng của
từng thứ (làm nhoè / nét dần khi vào / bóng đổ…), mức 1–100%, và mở ra thành
một bảng popup có nút mô phỏng chứ không phải ô sổ xuống.

**Chỗ đụng.** `schema.js` (đổi `kieu` của `soft`, `softIn`, `shadow`,
`maskSoft` từ `bac` sang thanh kéo), `fields.js`, `index.js`.

> **Ghi chú 19/09:** còn một núm thứ năm cùng kiểu `bac` mà tài liệu chưa nhắc:
> `push` ("Đẩy máy chậm", thang `BAC_DAY`, 5 nấc). Cần Quý quyết đổi nốt hay
> để yên — xem `docs/O-XEM-THU.md`.

**Cách làm thông minh.**
- Đổi 4 hiệu ứng hình từ bậc rời rạc sang **thanh kéo 0–100%** có số hiện rõ.
  Giữ lại các nấc cũ (`BAC_NHOE`, `BAC_BONG`) làm **điểm bám mềm** trên thanh
  kéo, để clip cũ dựng lại vẫn ra đúng mặt như trước — đây là điểm dễ sai nhất,
  xem phần dưới.
- Mỗi hiệu ứng mở ra một **popup nhỏ** (không phải sổ xuống): trong đó có ô xem
  thử (dùng hạ tầng trên) đang áp đúng mức thanh kéo, để vừa kéo vừa thấy.
- **Chỉ bày hiệu ứng hợp với loại món đang chọn.** Chữ thì có nhoè/bóng; ảnh
  thì thêm nhoè-mép-chỗ-cắt. Đừng bày cái không dùng được.
- "Lề quanh mép": gộp về **một thanh kéo duy nhất** có xem thử, bỏ bớt 8 nút
  bậc. Cân nhắc thêm: nếu để thẳng tay kéo lề ngay trên khung hình thì còn tốt
  hơn — đề xuất với anh, đừng tự quyết.

**Điểm phải cẩn thận (nói rõ để khỏi sai).** Nấc cũ ('Vừa', 'Đậm'…) ứng với
giá trị nội bộ cụ thể (số px nhoè, độ bóng). Khi đổi sang %, phải có bảng quy
đổi % ↔ giá trị thật sao cho: (a) mức cũ rơi đúng vào một mốc % xác định, (b)
clip `version 1` mở lên hiển thị đúng như cũ, không nhảy. Kéo phải là chỉnh
mượt giữa các mốc đó, không phải một dải tuyến tính đặt bừa.

**Nghiệm thu.**
- [ ] Mở 1 clip cũ → mọi hiệu ứng hiện đúng mức như trước, không nhảy
- [ ] Chọn chữ vs chọn ảnh → danh sách hiệu ứng khác nhau, đúng loại
- [ ] Kéo mức nhoè → popup xem thử đổi theo, xuất video ra đúng mức đã kéo
- [ ] `npm run kiem` và `npm run kiem:schema` đều qua

**Prompt:**
```
Đọc BANG-CHINH-V2.md, CLAUDE.md. Làm Việc 1, chỉ Việc 1, rồi dừng báo cáo.
Cần "Hạ tầng · Ô xem thử" đã xong trước.

Đổi soft/softIn/shadow/maskSoft trong schema.js từ kieu:'bac' sang thanh
kéo 0–100% có số hiện rõ, mỗi hiệu ứng mở popup có ô xem thử. Chỉ bày hiệu
ứng hợp loại món đang chọn.

TRƯỚC KHI SỬA, làm việc này và cho anh duyệt: lập bảng quy đổi % ↔ giá trị
thật, sao cho mọi nấc cũ (Rất nhẹ…Rất đậm) rơi đúng một mốc %, và clip
version 1 mở lên KHÔNG đổi mặt. Đây là chỗ dễ làm hỏng clip cũ nhất.
Sửa schema.js xong phải chạy npm run kiem:schema.
"Lề quanh mép": gộp về một thanh kéo; nếu anh thấy nên kéo lề thẳng trên
khung hình thì đề xuất, đừng tự đổi.
```

---

## Việc 2 · Gói chuyển động có xem thử `[P1 · 2–3 ngày]` (ảnh 2)

**Góp ý của anh.** Phần chuyển động quá phức tạp, khó hiểu với cả chính anh.
Muốn: gói chuyển động thành các thẻ riêng, chọn và xem thử dễ dàng; và khi
chọn một hiệu ứng thì mới hiện tinh chỉnh riêng của hiệu ứng đó.

**Chỗ đụng.** `fields.js`, `index.js`. **Không cần đổi schema** — presets đã
có sẵn trong mảng `KHO_VAO`/`KHO_RA`.

**Cách làm thông minh.**
- Thay ô sổ xuống "Bay vào" bằng **dải thẻ**, mỗi thẻ là một gói trong
  `KHO_VAO`, trên thẻ là ô xem thử đang diễn gói đó (dùng hạ tầng). Người dùng
  lướt, thấy cái nào ưng thì bấm. `goi` (gợi ý dùng cho gì) hiện thành dòng mô
  tả nhỏ.
- **Sau khi chọn mới hiện tinh chỉnh**, và chỉ những núm hợp gói đó: hầu hết
  gói chỉ cần "Nhanh/chậm"; gói vào-ngang thêm "vào từ đâu". Cái nào không liên
  quan thì giấu.
- "Nâng cao", "Bay ra" giữ nguyên logic, xếp gọn lại, mặc định thu.
- Chia nhóm nhẹ cho dễ tìm: *Trượt · Bật/Nở · Hiện dần · Đẩy máy* — dựa theo
  `kind` của token, không phải bịa nhóm mới.

**Nghiệm thu.**
- [ ] Dải thẻ hiện đủ các gói trong `KHO_VAO`, mỗi thẻ xem thử đúng chuyển động
- [ ] Chọn "Vào từ trái" → hiện núm "vào từ đâu"; chọn "Hiện dần" → không hiện núm thừa
- [ ] Clip cũ mở lên → gói đang dùng được đánh dấu đúng là đang chọn
- [ ] Không thêm/bớt gói nào trong schema — chỉ đổi cách bày

**Prompt:**
```
Đọc BANG-CHINH-V2.md. Làm Việc 2, chỉ Việc 2, rồi dừng báo cáo.
Cần "Hạ tầng · Ô xem thử" đã xong.

Thay ô sổ xuống chọn chuyển động bằng dải thẻ, mỗi thẻ một gói trong mảng
KHO_VAO của schema.js, có ô xem thử diễn gói đó. KHÔNG sửa schema, KHÔNG
thêm bớt gói — chỉ đổi cách trình bày. Chọn gói xong mới hiện tinh chỉnh,
và chỉ núm hợp với gói đó.
Trước khi code, liệt kê cho anh: mỗi kind token cần lộ ra những núm nào.
```

---

## Việc 3 · Nền thành các lớp `[P1 · 2–3 ngày]` (ảnh 1)

**Góp ý của anh.** Cụm ô tích "Bật những món" (Lưới chấm, Nét mảnh, Khối mềm,
Sóng đáy, Đường tăng trưởng, Chồng tiền) không liên quan nhau và không thật sự
kiểm soát được. Muốn biến chúng thành các layer riêng cho dễ quản.

**Chỗ đụng.** `schema.js`, renderer nền, bảng lớp, **và có đổi schema** →
cần đường đọc ngược.

**Cách làm thông minh.** Đừng nổ tung thành 6 lớp trôi tự do — mấy "món" này là
lớp trang trí phủ khung, không phải món đặt được chỗ. Cách gọn hơn:
- Nền vẫn là **một lớp**, nhưng các món của nó **hiện ra trong bảng lớp** như
  các lớp con: tắt/bật, đổi độ mờ, đổi thứ tự trên–dưới ngay tại đó, cùng chỗ
  với mọi lớp khác. Bỏ cụm ô tích rời trong bảng chỉnh.
- Nhờ vậy người dùng có đúng "kiểm soát như một lớp" mà không phải học một mô
  hình mới, và không phá vị trí phủ khung.
- **Đọc ngược:** clip cũ khai `parts: ["cham","net",...]` phải tự hiểu thành
  danh sách lớp con bật sẵn. Không được bắt sửa tay 9 clip cũ.
- Món nào "không khả thi / không liên quan" (anh nhắc tới một cái) thì rà lại:
  bỏ hẳn khỏi danh sách hay giữ nhưng ẩn — hỏi anh trước khi xoá.

**Nghiệm thu.**
- [ ] Mở clip cũ có `parts` → các món hiện đúng trong bảng lớp, bật đúng cái đang bật
- [ ] Tắt một món trong bảng lớp → xuất video không còn món đó; bật lại thì có lại
- [ ] Đổi độ mờ / thứ tự một món → ăn ngay, lưu lại mở ra vẫn đúng
- [ ] `npm run kiem:schema` qua; clip cũ dựng lại giống hệt bản gốc từng pixel

**Prompt:**
```
Đọc BANG-CHINH-V2.md, CLAUDE.md. Làm Việc 3, chỉ Việc 3, rồi dừng báo cáo.

Cụm ô tích "Bật những món" của nền → chuyển các món thành lớp con hiện
trong BẢNG LỚP (tắt/bật, độ mờ, thứ tự tại đó), nền vẫn là một lớp phủ
khung, KHÔNG cho món trôi tự do.
BẮT BUỘC đọc ngược: clip cũ khai mảng parts phải tự hiểu, không sửa tay
clip nào. Nghiệm thu bằng cách dựng lại một clip cũ và so từng pixel với
bản gốc — khác một pixel là chưa đạt.
Sửa schema thì chạy npm run kiem:schema. Trước khi xoá bất kỳ "món" nào,
hỏi anh.
```

---

## Gộp lại cho anh khi trình bày / giao team

- Đây là **một đợt cải giao diện**, không phải viết lại. Rủi ro thấp vì presets
  và thanh kéo đã có sẵn; phần lớn là bày lại cho người dùng nhìn thấy kết quả.
- Một nguyên tắc xuyên suốt: **thấy trước khi chọn**. Ô xem thử làm một lần,
  dùng cho cả ba việc.
- Chỗ duy nhất động vào dữ liệu là Việc 3 (nền → lớp), và nó có đường đọc ngược
  nên 9 clip cũ không phải sửa tay.
- Thước đo đợt này không phải "thêm được bao nhiêu núm", mà: **một người mới
  chỉnh xong một hiệu ứng mà không cần hỏi ai.** Đưa cho bạn còn lại trong
  phòng thử, xem có tự làm được không — đó là bài kiểm thật.
