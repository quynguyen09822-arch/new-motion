# Lộ trình 3D cho Motion — bản để duyệt trước khi làm

> Trạng thái: **Giai đoạn 1 đã làm xong** (01/10/2026) — xem `bachieu/`, mở ở
> `/ba-chieu/`. Giai đoạn 2 trở đi còn chờ quyết ở mục 5.
> Mọi con số trong đây là đo thật trên chính máy chủ này, không phải ước lượng.

---

## 1. Việc đầu tiên: nói lại cho đúng cái mình cần

Ý thô là "dựng được model 3D như Blender". Nhưng Blender và Motion là hai nghề
khác nhau:

| | Blender | Thứ clip quảng bá cần |
|---|---|---|
| Việc chính | **Nặn ra hình** — kéo từng đỉnh, từng cạnh, từng mặt | **Bày hình ra rồi quay** |
| Người dùng | hoạ sĩ 3D, học vài tháng | người viết nội dung, có 20 phút |
| Một buổi làm ra | một cái ghế | một clip 30 giây |

Chưa có phần mềm dựng clip nào trên đời bắt người dùng nặn hình cả — Canva,
CapCut, After Effects đều **không** cho nặn. Chúng cho **chọn trong kho, đặt
vào, xoay, chiếu đèn**. Vì nặn hình là nghề riêng, mà người dựng clip thì không
làm nghề đó.

**Nên hướng đi là:** Motion không trở thành Blender. Motion trở thành **phim
trường 3D** — có sẵn kho vật thể, có bàn xoay, có đèn, có máy quay. Ai thật sự
cần nặn hình thì nặn bằng Blender thật rồi **mang file vào** (xem Giai đoạn 5).

Đổi lại, cái này làm được **thật**, trong vài tuần, chứ không phải vài năm.

---

## 2. Bốn con số đã đo — chúng quyết định toàn bộ thiết kế

Máy chủ không có card đồ hoạ. Chromium vẽ 3D bằng **CPU** (SwiftShader). Nên
trước khi vẽ lộ trình, phải biết nó chịu được tới đâu.

| Phép đo | Kết quả | Nghĩa là |
|---|---|---|
| 3D có vẽ ra được khi xuất video không? | **Có.** Màu `#FF7A2F` về đúng qua cả đường chụp ảnh lẫn đường quay phim thật (`Page.startScreencast`) | Hướng này **không chết từ đầu** |
| 3D phủ **kín** khung dọc 1080×1920 | **18,7 hình/giây** | Không đủ. Phim cần 30 → sẽ **giật** |
| 3D chiếm **một nửa** bề ngang khung | **60 hình/giây** | Thừa sức, mượt hoàn toàn |
| Vẽ từng khung một rồi chụp (không chạy thời gian thật) | **354 ms/khung** → phim 26 giây mất **4,6 phút** | Chậm nhưng **không bao giờ giật** |

*(Phép đo: 2.400 tam giác, có đổ bóng theo đèn — nặng hơn mọi thứ sẽ dùng thật.)*

### Ba luật rút ra, và chúng là xương sống của cả lộ trình

> **Luật 1 — 3D là một MÓN trong cảnh, không phải cái NỀN của cảnh.**
> Một vật thể xoay chiếm 1/3 khung thì chạy 60 hình/giây. Phủ kín khung thì giật.
> May là về mặt thẩm mỹ thì 3D phủ kín màn hình cũng là clip xấu — luật kỹ thuật
> và luật thẩm mỹ trùng nhau, hiếm khi được vậy.

> **Luật 2 — hình 3D phải vẽ được từ MỘT MỐC THỜI GIAN, không tự chạy.**
> Bộ dựng hiện tại đã theo luật này: `render(now)` vẽ ra cảnh tại giây `now`, và
> `seek(s)` chỉ là gọi `render(s)`. Lớp 3D phải y hệt — đưa giây nào vẽ giây đó.
> Nếu để nó tự quay bằng đồng hồ riêng thì **không tua được, không xuất chậm
> được, và hai lần xuất ra hai phim khác nhau.**

> **Luật 3 — ai muốn 3D phủ kín khung thì trả bằng thời gian, không trả bằng chất lượng.**
> Có một chế độ xuất riêng "vẽ kỹ", 4,6 phút cho phim 26 giây. Không có chuyện
> xuất ra phim giật rồi bảo người dùng tự chịu.

---

## 3. Cắm vào đâu trong dự án hiện tại

Tin tốt: **không phải đập đi xây lại cái gì.** Bộ dựng đã có sẵn hai bảng đăng ký.

```
clip/scene-player.html
  ├ BUILD[el.kind]   dòng 1010 — dựng khung DOM cho một món
  └ TICK[el.kind]    dòng 1559 — cập nhật món đó tại giây `at`
```

Thêm 3D = thêm **một ô** vào mỗi bảng. Mọi thứ còn lại — chọn món, kéo thả, hoàn
tác, keyframe, xuất video — chạy sẵn, không sửa.

| Chỗ sửa | Thêm gì |
|---|---|
| `clip/scene-player.html` | `BUILD['vat-the']` dựng thẻ canvas · `TICK['vat-the']` vẽ khung tại giây `at` |
| `web/inspector/schema.js` | tên các núm, **viết bằng tiếng người** (xem mục 6) |
| `web/them.js` → `KIT` | vài cảnh 3D pha sẵn, dùng là có ngay |
| `web/bachieu/` *(mới)* | máy vẽ 3D + kho vật thể |
| `tools/kiem-ba-chieu.mjs` *(mới)* | bài kiểm — canh đúng ba luật ở mục 2 |

---

## 4. Lộ trình — 5 giai đoạn, mỗi giai đoạn tự nó đã dùng được

Nguyên tắc xếp thứ tự: **giai đoạn rẻ và chắc ăn đi trước**, giai đoạn đắt và
rủi ro đi sau. Dừng ở bất kỳ giai đoạn nào thì phần đã làm vẫn có ích.

---

### GĐ 1 · 3D mà không cần máy vẽ 3D — "khối nổi" ✅ XONG

**Làm bằng gì:** `transform-style: preserve-3d` của chính trình duyệt. **Không
thêm một dòng thư viện nào.** Đây là thứ trình duyệt làm sẵn, dùng đúng đường
vẽ mà cả bộ dựng đang dùng.

**Ra được cái gì:**

- hộp vuông có 6 mặt, xoay được mọi hướng
- thẻ lật (mặt trước → lật → mặt sau) — rất hợp "trước / sau khi dùng dịch vụ"
- **chữ nổi có bề dày** (xếp chồng nhiều lớp chữ lệch nhau)
- **giá máy chủ xếp chéo** kiểu phối cảnh — đúng thứ Mắt Bão hay cần
- logo xoay thành khối lập phương

**Vì sao đặt lên đầu:** không phụ thuộc gì, không rủi ro, xuất video chạy **đúng
tốc độ cũ**, và nó phủ phải tới ~70% nhu cầu clip quảng bá thật. Rẻ nhất mà được
nhiều nhất.

**Giới hạn thật — đã co lại một nấc.** Ban đầu tôi tưởng chỉ ra được hình có mặt
phẳng. Hoá ra **tròn xoay cũng làm được**: ghép 28 mặt hẹp quanh một trục thì mắt
thấy tròn, nên có cột, đồng xu, vòng, biểu đồ — những thứ bản đầu của lộ trình
này xếp vào Giai đoạn 2.

Thứ **vẫn** chưa làm được là hình cong tự do: quả địa cầu có lục địa, xe cộ,
người thật. Mấy thứ đó mới thật sự cần máy vẽ 3D.

**Nhân vật thì nằm ở giữa.** Linh vật Mắt Bão ghép được từ cầu + trụ + hộp (25
bộ phận) và nhận ra ngay là ai — nhưng là bản *kiểu đồ chơi*, không phải bản sao
của hình gốc. Muốn đúng từng nếp áo choàng thì vẫn phải chờ Giai đoạn 5a: nặn
bằng Blender thật rồi mang `.glb` vào.

**Luồng người dùng:**
```
Thêm món  →  nhóm "Khối nổi"  →  chọn: Hộp · Thẻ lật · Chữ nổi · Giá máy chủ
          →  vặn núm: Xoay ngang · Xoay dọc · Bề dày · Hướng đèn
          →  bấm "Xoay một vòng" là xong chuyển động
```

**Đã làm xong 01/10/2026.** Nằm ở `bachieu/`, vào bằng nút “Mở xưởng” trên
trang chào Motion (đường dẫn `/ba-chieu/`), đứng tách hẳn
khỏi trình sửa clip (`bachieu/README.md` nói rõ vì sao và tách tới đâu). Có đủ
năm loại khối, năm kiểu chuyển động, bảng vặn đèn, và **vạch mốc 50% vẽ ngay
trên sân** để Luật ① thành thứ nhìn thấy được chứ không phải câu cảnh báo đọc
rồi quên.

Bài kiểm `tools/kiem-ba-chieu.mjs` — 8 mục, đã **thử bẻ gãy 10 kiểu** để chắc
không mục nào xanh dễ dãi. Lần thử ấy bắt được một chỗ xanh giả thật (mọi phép
thử pháp tuyến đều dùng vector có `x = 0`, nên lỗi đảo dấu ở số hạng chứa `x`
lọt qua hết).

Hai lỗi chỉ lòi ra khi **mở trình duyệt thật**, không phép kiểm nào bằng Node
thấy được: trang đặt ở `/ba-chieu` thiếu gạch chéo cuối nên mọi file con rơi về
gốc và trang trắng trơn; chữ nổi căn giữa bằng `margin-left:-50%` trong khi thẻ
cha bề ngang bằng 0 nên cả dòng chữ trôi sang phải. Cả hai đã sửa và ghi lại
nguyên nhân ngay tại chỗ sửa.

---

### GĐ 2 · Kho vật thể thật — "phim trường"

**Đây là chỗ phải quyết một việc** (xem mục 5): lấy máy vẽ 3D ở đâu.

**Kho này đã nhỏ đi.** Giai đoạn 1 nhận thêm ống trụ và biểu đồ cột, nên những
thứ tròn xoay (ổ cứng, đồng xu, vòng tiến trình, biểu đồ) **không cần** chờ máy
vẽ 3D nữa. Còn lại đúng những hình cong tự do:

**Ra được cái gì:** một kho vật thể dựng sẵn, đúng nghề của Mắt Bão:

> tủ máy chủ · đám mây · quả địa cầu · ổ cứng · lá chắn bảo mật · thùng hàng ·
> laptop · điện thoại · biển tên miền · ổ khoá · tên lửa · biểu đồ cột nổi

Người dùng **không nặn** — chỉ chọn, đặt, xoay, chiếu đèn, đổi màu theo bộ phối
màu của clip (dùng lại `web/phoimau.js`, không đẻ ra bảng màu thứ hai).

**Luồng người dùng:**
```
Thêm món  →  "Vật thể 3D"  →  kho hình (xem trước từng cái, xoay thử)
          →  chọn tủ máy chủ  →  đặt vào cảnh
          →  vặn: Góc nhìn · Độ lớn · Màu · Hướng đèn · Độ bóng
```

**Canh theo Luật 1:** bảng thuộc tính **cảnh báo ngay** khi vật thể bị kéo to quá
nửa khung — nói thẳng "to thế này thì lúc xuất phim sẽ giật, xuất kiểu vẽ kỹ mất
thêm ~5 phút", chứ không để tới lúc xuất mới biết.

---

### GĐ 3 · Máy quay và chuyển động 3D

Dùng lại **nguyên** bộ keyframe đang có (`web/inspector/keyframe.js`) — không
viết hệ chuyển động thứ hai.

Thêm vài chuyển động pha sẵn, đặt tên theo thứ mắt thấy:
- **Xoay một vòng** · **Lia quanh vật** · **Đẩy máy vào gần** · **Hạ xuống nhìn từ trên**

Mỗi cái là một công thức theo giây `at` — đúng Luật 2, nên tua tới đâu vẽ đúng tới đó.

---

### GĐ 4 · AI dựng cảnh 3D — lối vào thứ năm

App đang có 4 lối cho AI (ảnh · trang web · lời tả · sửa món). Thêm lối thứ năm:

> *"dựng cảnh một tủ máy chủ xoay chậm, có đám mây phía sau"*
> → AI **chọn trong kho** rồi **xếp đặt + chiếu đèn + đặt máy quay**

**Điều quan trọng nhất ở đây: AI KHÔNG nặn hình.** Nó chỉ chọn và bày. Lý do:
AI sinh hình 3D hiện vẫn ra hình méo, và một hình méo trong clip quảng bá thì
tệ hơn là không có 3D. Chọn trong kho thì **xấu nhất cũng vẫn là một hình đúng.**

---

### GĐ 5 · Hai cửa cuối: mang hình ngoài vào, và xuất kỹ

**a. Mang file từ Blender thật vào.** Ai cần hình riêng thì nặn bằng Blender
(hoặc thuê người nặn), xuất ra `.glb`, kéo thả vào Motion. Đây là chỗ chữ "hệ
sinh thái" thành thật: Motion **nối với** Blender thay vì cạnh tranh với nó.

**b. Chế độ xuất "vẽ kỹ".** Dành cho cảnh 3D phủ kín khung: vẽ từng khung rồi
chụp từng khung, 4,6 phút cho phim 26 giây, **không bao giờ giật**. Chạy được
là nhờ Luật 2.

---

## 5. Một việc cần anh quyết — lấy máy vẽ 3D ở đâu

Từ GĐ 2 trở đi cần thứ đọc được file hình 3D và vẽ ra. Dự án đang tự hào **"0 gói
phụ thuộc"** (README ghi rõ, và đó là lý do nó không bao giờ hỏng kiểu "cài gói
thất bại"). Có ba đường:

| Đường | Được | Mất |
|---|---|---|
| **A. Chép `three.js` vào `clip/` như một file tĩnh** | làm được ngay, chuẩn mực cả thế giới dùng, đọc `.glb` sẵn | thêm ~600 KB; `package.json` vẫn trống nhưng phải **nói thật trong README** là `clip/` có kèm máy vẽ 3D |
| **B. Tự viết máy vẽ nhỏ** | giữ đúng tinh thần "không mượn gì"; dự án đã tự viết Postgres, OAuth, điều khiển Chromium | chậm hơn **vài tuần**, và đây là món dễ sai mà sai thì hiện ra thành "hình nhìn kỳ kỳ" — khó truy |
| **C. Dừng ở GĐ 1** | không phải quyết gì cả, không rủi ro | chỉ có hình mặt phẳng, không có kho vật thể |

**Tôi nghiêng về A**, nhưng kèm điều kiện: sửa README nói thẳng ra. Lý do: `clip/`
vốn đã là nơi chứa đồ tĩnh (phông chữ, clip mẫu, 41 MB), thêm một file máy vẽ vào
đó **không** làm sống lại kiểu hỏng mà luật "0 gói" sinh ra để chặn — vì nó nằm
sẵn trong ảnh Docker, không có bước cài. Giấu đi mới là sai; khai ra thì vẫn thành thật.

---

## 6. Hai thứ dễ làm hỏng, phải chặn từ đầu

**① Câu chữ.** Thế giới 3D đầy từ kỹ thuật — *mesh, normal, PBR, roughness,
bake, UV*. `CLAUDE.md` §8 cấm để lọt những từ này ra giao diện. Bảng đổi:

| Đừng viết | Viết là |
|---|---|
| mesh / geometry | vật thể |
| roughness / metalness | độ bóng · độ nhám |
| directional light | hướng đèn |
| field of view | độ rộng ống kính |
| bake | vẽ sẵn ra ảnh |

**② Phép soát chất lượng chưa biết gì về 3D.** Ba tầng soát hiện tại
(`validateScene` → `soat.js` → `docanh.js`) đo chữ và màu. Chúng **không** biết
một vật thể 3D đang bị cắt mất nửa, quay lưng vào máy, hay chìm vào nền. Lớp 3D
phải mang theo phép soát riêng, nếu không nó sẽ là **thứ duy nhất trong app
không ai canh** — và đó đúng là cách clip bạc màu hôm 29/09 lọt lưới.

---

## 7. Những thứ tôi đề nghị KHÔNG làm

Nói trước cho khỏi kỳ vọng sai:

- **Nặn hình** (kéo đỉnh, cạnh, mặt), **đắp hình**, **trải UV** — mỗi món vài
  tháng, và người dựng clip 60 giây không ai dùng. Cửa thay thế là GĐ 5a.
- **Khung xương, nhân vật biết đi** — một ngành riêng.
- **Mô phỏng vật lý, khói lửa, nước** — máy chủ không có card đồ hoạ; chỉ riêng
  việc tính đã lâu hơn cả phim.
- **AI sinh hình 3D từ lời tả** — hiện vẫn ra hình méo. Xem lại GĐ 4.

---

## 8. Tóm tắt một bảng

| GĐ | Được gì | Phụ thuộc | Rủi ro |
|---|---|---|---|
| **1** ✅ | Khối nổi: hộp, thẻ lật, chữ nổi, giá máy chủ, logo khối, **ống trụ, biểu đồ cột, linh vật** | không | **xong 01/10** |
| **2** | Kho ~20 vật thể thật, chọn–đặt–chiếu đèn | **cần quyết mục 5** | vừa |
| **3** | Máy quay xoay/lia/đẩy, dùng lại keyframe cũ | GĐ 2 | thấp |
| **4** | AI tự bày cảnh 3D từ một câu | GĐ 2 | vừa |
| **5** | Mang `.glb` từ Blender vào · xuất "vẽ kỹ" | GĐ 2 | vừa |

**Tiếp theo:** GĐ 1 đã chạy được, mời xem ở `/ba-chieu/`. Đi tiếp GĐ 2 thì phải
quyết mục 5 trước — lấy máy vẽ 3D ở đâu.
