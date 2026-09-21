# Không gian làm việc — chữa cảm giác "bí bách"

> Soạn 20/09/2026, sau khi Quý nói: *"vào giao diện luôn tạo cho tôi một cảm
> giác khó chịu và bị bí bách mỗi lần làm việc trong đó."*
>
> **Đây là bản HƯỚNG ĐI, chưa làm gì.** Mỗi việc có sẵn prompt để chạy sau.
>
> **Một điều nói trước cho sòng phẳng:** tôi **đo** giao diện chứ chưa **nhìn**
> nó — Chromium trong workspace đang thiếu 24 thư viện hệ thống nên chưa chụp
> được màn hình. Số đo dưới đây chắc chắn đúng, nhưng trước khi làm thì nên vá
> Chromium rồi chụp một tấm, để đối chiếu chẩn đoán với mắt thật.

---

## Chốt lại đã: đây là công cụ NỘI BỘ

Quý chốt 20/09: nội bộ, nhưng **tối ưu thật cho người dùng chính là chính anh**.

Điều này đổi hẳn cách chữa, và đổi theo hướng **dễ hơn**:

- **Không phải cắt tính năng.** 25 loại thành phần và 90 núm không phải là vấn
  đề với người dùng hằng ngày — người dùng hằng ngày thuộc chúng. Cắt đi là lấy
  mất công cụ của chính mình.
- **Không cần màn hình đón, không cần dạy dỗ.** Bỏ hẳn ý onboarding tôi nêu hôm
  trước.
- **Đổi lại, tiêu chuẩn về sự THOẢI MÁI phải cao hơn hẳn.** Công cụ dùng 15 phút
  một tháng thì chật một chút không sao. Công cụ ngồi trong đó vài tiếng mỗi ngày
  thì chật là mệt thật, mỏi mắt thật.

Nên thước đo của đợt này không phải "ít núm hơn", mà: **ngồi trong đó hai tiếng
không thấy tức ngực.**

---

## Bí bách đến từ đâu — ba con số

Đo trên `web/app.css` và `web/index.html`, không phải cảm tính:

### ① Hai cột chiếm 588px và KHÔNG ẩn được

```
.cot-trai   272px
.cot-phai   316px
           ─────
            588px  cố định, luôn mở
```

`web/cot.js` chỉ đặt bề rộng (kéo được), **không có nút thu hay ẩn**. Nghĩa là
dù đang làm gì, 588px màn hình luôn thuộc về bảng điều khiển.

Màn 1440 → clip còn ~850px. Màn laptop 1280 → clip còn **~690px**, tức là **chưa
tới một nửa màn hình** dành cho thứ duy nhất anh thật sự đang nhìn.

### ② Thêm 110px chiều dọc, chưa kể hàng thẻ và thanh AI

```
.thanh-tren   48px
.thanh-duoi   62px
             ─────
              110px  + hàng thẻ + thanh AI ở đáy
```

Màn cao 900 → khung clip còn khoảng 700px trừ đệm. Clip ngang 16:9 vừa vào đó
thì nhỏ; clip dọc 9:16 thì càng ngộp.

### ③ 57 trên 74 khai cỡ chữ nằm trong khoảng 10–12px

| Cỡ | Số lần khai |
|---|---|
| 10px | 9 |
| 11px | 23 |
| 12px | 25 |
| 13px | 16 |
| 15px | **1** |

Gần như **không có chữ nào thoải mái để đọc**. Mắt phải căng ở mọi chỗ, suốt cả
buổi. Đây nhiều khả năng là nguồn "khó chịu" lớn nhất, và cũng là chỗ sửa rẻ
nhất.

**Gộp lại:** mọi thứ luôn hiện ra cùng lúc, chữ nhỏ ở mọi chỗ, còn thứ đáng nhìn
nhất thì bị ép vào giữa. Đó chính là định nghĩa của bí bách.

---

## Ba nguyên tắc đề nghị cho đợt này

1. **Clip là nhân vật chính, mọi thứ khác là khách.** Mặc định clip được nhiều
   chỗ nhất; bảng nào không dùng tới thì biến đi.
2. **Một phím về trạng thái trống.** Lúc xem lại thành quả, anh không cần núm
   nào cả — cần đúng một phím dọn sạch màn hình.
3. **Chữ đủ lớn để đọc cả buổi.** Nâng nền cỡ chữ lên, kể cả khi phải bớt vài
   dòng thông tin.

---

## Việc 1 · Một phím dọn sạch màn hình `[P0 · ĐÃ LÀM 22/09/2026]`

> **Đã làm.** Phím gạch ngược bật/tắt chế độ trống; hai nút ở thanh trên thu
> riêng từng cột; nhớ qua `localStorage` cùng chỗ với bề rộng; chọn một món khi
> đang dọn màn hình thì cột phải tự mở lại.
>
> Không dùng `Tab` như bản nháp đề nghị: Tab là đường đi giữa các ô nhập của
> bảng chỉnh, cướp nó là mất luôn cách dùng bằng bàn phím.
>
> Đo ở cửa sổ 1280×900 với clip ngang: hai cột hiện thì khung xem chiếm **48%**
> bề ngang, dọn sạch thì **97%**. Bấm lại về đúng 272/316.


**Vì sao trước nhất.** Rẻ nhất, mà đổi cảm giác nhiều nhất. Không phải dựng lại
gì — chỉ thêm một trạng thái ẩn hai cột.

**Cách làm.** Phím `Tab` (hoặc `\`) bật/tắt chế độ trống: hai cột trượt đi, các
thanh mờ dần, clip nở ra chiếm gần cả màn hình. Bấm lại thì trả về đúng bề rộng
cũ. Nhớ trạng thái qua `localStorage`.

Thêm: cho **thu riêng từng cột** (nút mũi tên ở đầu cột), vì nhiều lúc chỉ cần
giấu bảng lớp mà vẫn giữ bảng chỉnh.

**Nghiệm thu.**
- [ ] Bấm một phím → clip chiếm ≥90% bề ngang, không phải tải lại trang
- [ ] Bấm lại → hai cột về đúng bề rộng đã kéo trước đó, không nhảy
- [ ] Đóng tab mở lại → vẫn ở chế độ lần trước
- [ ] Đang ở chế độ trống mà bấm chọn món trên khung hình → tự mở lại bảng chỉnh

**Prompt:**
```
Đọc docs/KHONG-GIAN-LAM-VIEC.md và CLAUDE.md. Làm Việc 1, chỉ Việc 1, rồi
dừng báo cáo.

Thêm chế độ màn hình trống: một phím ẩn cả hai cột để clip nở ra gần hết màn
hình, bấm lại thì trả về đúng bề rộng cũ, nhớ qua localStorage. Thêm nút thu
riêng từng cột.
KHÔNG đụng scene-player.html. KHÔNG đổi bề rộng mặc định của cột — đây là
thêm một trạng thái, không phải đổi bố cục.
Trước khi code, cho anh biết định gán phím nào và vì sao.
```

---

## Việc 2 · Nâng nền cỡ chữ `[P0 · ĐÃ LÀM 22/09/2026]`

> **Đã làm.** Thang ba bậc trong `:root` (`--chu-nho` 12 · `--chu-vua` 14 ·
> `--chu-to` 16), thay cho **92** chỗ khai cỡ chữ rời. Không còn một `font-size`
> viết cứng nào trong `web/app.css`.
>
> Soi tràn bằng máy chứ không bằng mắt: mở bảng chỉnh cho cả 9 loại thành phần
> của một clip, rồi cả bốn thẻ bên phải — **không một phần tử nào có
> `scrollWidth` vượt `clientWidth`**. Cột phải ở bề rộng mặc định 316px không vỡ
> hàng, không tràn chữ.


**Cách làm.** Dựng một thang cỡ chữ trong `:root` thay cho 74 chỗ khai rời:

```css
--chu-nho:   12px   /* nhãn phụ, đơn vị — thứ liếc qua */
--chu-vua:   14px   /* MẶC ĐỊNH: nhãn núm, tên lớp, nút */
--chu-to:    16px   /* tiêu đề bảng, tên clip */
```

Rồi thay 10px và 11px bằng `--chu-nho`, 12–13px bằng `--chu-vua`. Chỗ nào chật
thì **nới ô chứa ra**, đừng hạ cỡ chữ xuống lại — chật thì nới, đó là cả điểm
của việc này.

**Điểm phải cẩn thận.** Chữ to lên thì bảng chỉnh dài ra, một số hàng hai cột sẽ
vỡ. Phải soát lại `.cap` và `.khung-so` (đang `grid-template-columns: 1fr 1fr`)
— có thể phải cho xuống một cột ở bảng hẹp.

**Nghiệm thu.**
- [ ] Không còn chỗ nào dưới 12px
- [ ] Bảng chỉnh ở bề rộng mặc định 316px không vỡ hàng, không tràn chữ
- [ ] Chụp trước/sau cùng một clip để so

**Prompt:**
```
Đọc docs/KHONG-GIAN-LAM-VIEC.md. Làm Việc 2, chỉ Việc 2, rồi dừng báo cáo.

Dựng thang cỡ chữ 3 bậc trong :root của web/app.css, thay hết 74 chỗ khai
rời. Sàn là 12px, mặc định 14px. Chỗ nào chật thì NỚI Ô CHỨA, tuyệt đối
không hạ cỡ chữ xuống lại.
Soát kỹ .cap và .khung-so (grid 1fr 1fr) — chữ to lên dễ vỡ hàng ở cột 316px.
Chụp màn hình trước/sau cùng một clip để đối chiếu.
```

---

## Việc 3 · Bảng chỉnh chỉ hiện thứ đang cần `[P1 · 1–2 ngày]`

**Cái này TRÙNG với `BANG-CHINH-V2.md` — cố ý.** Nguyên tắc 2 của tài liệu đó
("Chỉ hiện thứ đang cần") chính là thuốc cho bí bách. Khác biệt: ở đây mục tiêu
không phải dạy người mới, mà là **bớt thứ đập vào mắt** cho người dùng hằng ngày.

**Đề nghị điều chỉnh thứ tự.** Hạ tầng ô xem thử đã xong. Nhưng nếu phải chọn,
làm **phần "gấp lại phần Nâng cao"** trước phần dải thẻ xem thử — gấp lại là
việc nhỏ, ăn ngay vào cảm giác chật; dải thẻ đẹp hơn nhưng không làm bớt chật.

---

## Việc 4 · Trả chiều dọc lại cho clip `[P1 · nửa ngày]`

Hai thanh 48 + 62 = 110px. Thanh dưới cao 62px cho một hàng nút — rộng rãi hơn
mức cần.

**Cách làm.** Hạ thanh dưới xuống ~48px cho bằng thanh trên; gộp những nút ít
dùng vào một menu "…"; ở chế độ màn hình trống (Việc 1) thì ẩn luôn cả hai.

**Nghiệm thu.**
- [ ] Khung clip cao thêm ít nhất 20px ở màn 900px
- [ ] Không nút nào biến mất — chỉ dời vào menu
- [ ] Clip dọc 9:16 hiện được cao hơn trước, đo bằng pixel

---

## Thứ tự đề nghị

**Việc 1 → Việc 2** trước đã, rồi ngồi làm thật vài buổi xem còn bí không.

Hai việc đó cộng lại chưa tới một ngày, không đụng `scene-player.html`, không
đụng dữ liệu, sai thì lùi trong một phút. Nếu sau đó vẫn thấy chật thì mới tính
Việc 3 và 4 — lúc ấy anh đã biết rõ hơn chật ở chỗ nào.

Ngược lại, nếu làm Việc 3 trước thì mất 1–2 ngày mà cảm giác chật gần như không
đổi, vì nguồn chính là **588px không ẩn được** và **chữ 11px**, không phải số
lượng núm.

---

## Một chỗ cần sửa lại trong tài liệu cũ

`docs/GIAO-DIEN.md` vẫn ghi *"Ứng dụng **không có âm thanh**"* và lấy đó làm lý
do không dựng timeline nhiều rãnh. Câu đó đã sai từ 17/09 — rãnh tiếng đã làm
xong. Nên rà lại khi đụng tới giao diện.
