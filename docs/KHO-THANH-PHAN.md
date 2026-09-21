# Kho thành phần — menu "Thêm thành phần"

## Lỗi: một nửa kho bị giấu

Bộ dựng vẽ được **25 loại**. Menu thêm chỉ bày **13**. Mười hai loại còn lại có
thật, chạy được, mà **không có đường nào thêm vào** — muốn dùng phải mở file
JSON ra gõ tay:

`form` · `calendar` · `timeline` · `logo` · `wheel` · `chat` · `shield` ·
`upload` · `sweep` · `nen` · `quydao` · `pointer`

Đây đúng kiểu **"năng lực bị giấu"** mà `tools/kiem-schema.mjs` sinh ra để chặn
ở bảng thuộc tính — chỉ khác là lần này nó nằm ở menu thêm.

## Nay: bảng chọn chia theo bộ

| Bộ | Món |
|---|---|
| **Chữ & nhãn** | Chữ · Nút bấm · Nhãn số · Hàng nhãn · Huy hiệu · Logo |
| **Khối & bố cục** | Khối màu · Thẻ · Bảng · Cụm · Dòng thời gian |
| **Hình & phim** | Ảnh · Video · Điện thoại · Trình duyệt |
| **Giao diện sản phẩm** | Biểu mẫu · Lịch · Ô kéo thả · Cửa sổ AI |
| **Trang trí** | Nền thương hiệu · Quỹ đạo · Vòng quay · Khiên bảo mật · Vệt sáng |

**24 món.** Mỗi món có một dòng tả ngắn, và có ô tìm — gõ không dấu cũng ra
(`bieu mau` → Biểu mẫu). Chỉ còn một món khớp thì Enter là thêm luôn.

Đổ 24 món ra một cột phẳng thì phải cuộn, mà cuộn một danh sách toàn chữ thì
không ai nhớ được món nào nằm đâu — nên chia bộ.

## `pointer` cố ý không bày

Cả clip chỉ có **một** con trỏ, và nó cần một **đường đi nhiều mốc thời gian**.
Thêm bằng một cú bấm sẽ ra con trỏ đứng im giữa khung — vô nghĩa. Muốn dùng thì
khai trong kịch bản.

## Giá trị mặc định lấy từ clip thật

Một món mới thả vào mà ra khung hình **trống trơn** thì người dùng tưởng bấm
hỏng. Nên `mau` của mỗi món lấy từ chính các clip đang chạy, không phải bịa.

Ba món **được phép rỗng**, mỗi món một lý do thật:

- `image` — chưa chọn file thì đúng là khoảng trống; bảng thuộc tính bắt chọn
  ngay ở núm đầu tiên.
- `group` — cụm rỗng đúng là rỗng; thêm cụm rồi mới bỏ món vào.
- `sweep` — vệt sáng là một cú loé; đứng ở một giây bất kỳ không thấy gì là
  đúng bản chất.

## Bộ dựng sẵn — bấm một cái ra nguyên một cụm

Thêm từng món thì ai cũng làm được. Bày cho **đẹp** mới là phần khó: câu dẫn đặt
đâu, cách món khoe bao xa, món nào vào trước món nào vào sau. Bộ gói sẵn những
quyết định đó — nên thẻ **"Bộ dựng sẵn"** đứng trước thẻ "Một món".

| Nhóm | Bộ |
|---|---|
| **Mở đầu & kết** | Mở đầu — logo · Kết — kêu gọi hành động · Nền thương hiệu |
| **Khoe sản phẩm** | Khoe trang web · Khoe trên điện thoại · Điền biểu mẫu · Hỏi trợ lý AI |
| **Số liệu & cam kết** | Ba con số · Bảng danh sách · Cam kết bảo mật |

### Khuôn lấy từ clip thật, không bịa

`vibe-host`, `nguon-toi`, `kich-ban-thu` đều dùng đúng **một** khuôn:

```
cụm (place 'giua', xếp dọc, căn giữa, khe 5)
  ├─ chữ dẫn      bay lên, 0,55s
  └─ món khoe     bay lên, 0,6s
```

Đổi dáng chữ dẫn ở một chỗ (`chuDan`) là mọi bộ đổi theo.

### Bộ tự xếp lại khi đổi khổ clip

Cụm ngoài cùng khai **`place`** chứ không khai toạ độ — nên đổi 16:9 sang 9:16 nó
tự bày lại đúng. Khác hẳn **96,8% số món trong các clip hiện nay đang khai toạ độ
cứng** (xem `docs/DOI-KHO-HINH.md`). Càng dựng bằng bộ thì clip càng dễ đổi khổ
về sau.

### Thêm hai lần cùng một bộ vẫn không trùng id

Mọi id trong bộ được đặt lại khi thêm. Trùng id thì `validateScene` **chặn không
cho lưu**, mà lỗi chỉ hiện ra tận lúc bấm Lưu nên rất khó lần ngược — nên bài
kiểm thêm cả kho **hai lượt** rồi đếm.

## Hình minh hoạ — vì sao vẽ sơ đồ chứ không chụp ảnh

Bảng chọn có **40 mục**. Chỉ có tên với một dòng tả thì phải **đọc** từng dòng
mới biết món nào là món nào — mà người mở bảng ra là đang muốn **lướt**. Mắt bắt
hình nhanh hơn bắt chữ.

Nên mỗi mục có một **sơ đồ vẽ bằng SVG** (`web/hinhmon.js`), xếp thành lưới hai
cột: hình trên, tên dưới, dòng tả nằm trong `title` — cần thì rê chuột, không
thì đừng chiếm chỗ.

**Ba lý do không chụp ảnh thật:**

1. **Món trong bảng chọn CHƯA TỒN TẠI** trong cảnh — không có gì để mà chụp.
2. **Chụp thật là dựng thật.** 40 lần dựng mỗi lần mở bảng thì giật cả giao diện.
   Bảng lớp đã phải dựng **lười** vì đúng lý do đó (`web/anhnho.js`), mà đó mới
   chỉ là ảnh của món **đã có** trong cảnh.
3. **Sơ đồ nói đúng thứ cần nói: hình DÁNG.** Ảnh thật của "Thẻ" sẽ đầy chữ mẫu,
   kéo mắt vào chữ chứ không vào dáng.

Nét vẽ theo lối wireframe: viền xám, **đúng một** mảng màu nhấn cho phần "ruột"
của món. Hình của **bộ** thì vẽ **bố cục** — một vạch câu dẫn ở trên, món khoe ở
dưới — chứ không vẽ từng phần tử.

## Kiểm

```bash
node tools/kiem-kho-mon.mjs
```

Mục 5 canh hình: mọi món và mọi bộ phải có hình **riêng**, không mục nào rơi
về hình mặc định, và **không hai món nào dùng chung một hình**.

Mục 3 **dựng thật từng món** bằng đúng giá trị mặc định rồi đo xem có vẽ ra gì
không. Ba lần phép đo này tự bắt lỗi của chính nó khi làm:

1. **Khung điện thoại vẽ bằng VIỀN**, không có nền — bỏ sót viền là kêu oan nó.
2. **`<img>` chưa chọn file vẫn là một thẻ con**, nhưng hiện ra đúng khoảng
   trống. Đếm nó là tự lừa mình.
3. Sửa xong hai điều trên thì phép kiểm **bắt bỏ `video` khỏi danh sách được
   phép rỗng** — vì mặc định của nó có lớp tối `dim`, chưa chọn file vẫn hiện ra
   một mảng tối. Danh sách được phép rỗng cũng có chốt chống mục rữa.

---

# Co theo khổ clip (20/09/2026)

**Vấn đề.** Quý báo: thả bộ dựng sẵn vào clip 16:9 thì ra sai cỡ, phải ngồi vặn
lại từng núm — tức bộ dựng sẵn không dựng sẵn được gì.

**Nguyên nhân, đo ra chứ không đoán.** Mọi con số px trong kho mẫu viết theo
đúng MỘT khổ: `chuDan` khai `w: 374, size: 96`, trùng từng số với `vibe-host`
(720×1280). Cả kho chép khuôn từ đấy.

**Cách chữa.** `themKit` và `themMon` nhân số px theo hệ số:

```
k = min(rộng/720, cao/1280)     — "vừa khung", cạnh nào chạm trước thì thắng
```

Kit xếp DỌC (`dir: 'doc'`), nên thứ bó nó lại khi sang khổ ngang là CHIỀU CAO —
đó là lý do cạnh ngắn thắng, không phải mẹo.

Số đo tự chứng minh công thức: 720×1280 → 1280×720 cho k = 0,5625, và cỡ chữ 96
thành **54** — trùng đúng cỡ chữ lớn nhất của `kich-ban-thu` và `thu-nghiem`,
hai clip ngang dựng tay. Lấy theo bề ngang thì ra 171, to gấp ba clip thật.

**Một ngoại lệ, và chỉ một:** `w` của **chữ** đi theo bề ngang khung
(`heSoRong`). `w` của chữ không phải kích thước hình, nó là **bề ngang ngắt
dòng** — thứ đáng giữ là phần trăm khung nó chiếm. Co đều thì khối chữ 374 (52%
khung dọc) thành 210 trong khung ngang 1280, tức 16%, và một câu dẫn bảy chữ gãy
làm bốn dòng; đã nhìn thấy tận mắt trước khi sửa. Theo bề ngang thì ra 665, vẫn
đúng 52%.

Ngoại lệ này KHÔNG áp cho món có hình dạng riêng (cửa sổ trình duyệt, khung điện
thoại, biểu mẫu): co lệch hai chiều là khung điện thoại bẹp thành hình chữ nhật
nằm ngang.

**Không đụng:** `pad`/`gap` là BẬC 0..7 chứ không phải px (nhân lên là núm nhảy
khỏi thang và bộ dựng bỏ qua im lặng), `at`/`dur` là giây, `slices` là số lượng,
`subScale` là tỉ lệ. Danh sách TRẮNG `['w','h','x','y','size']`, không phải danh
sách đen.

**Ở đúng khổ mẫu thì không đổi một số nào** (k = 1). Chín clip đang có đều dựng
quanh khổ đó, nên bản vá này không phải là một lần đổi khổ hàng loạt.

**Còn lại, nói thẳng:** cách này bảo đảm KHÔNG TRÀN KHUNG, và nó chọn phía an
toàn — ở khổ ngang, cửa sổ trình duyệt ra 20% bề ngang thay vì 62% như bản gốc
dọc. Muốn nó to như một tấm hero thì kéo tay, vì to hơn nữa là cụm dọc tràn
xuống dưới mép.

Canh bằng `tools/kiem-co-kho.mjs` — 22 mục, Node trần.
