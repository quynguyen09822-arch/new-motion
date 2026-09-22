# Cơ sở dữ liệu — Motion

> Bản 2, soạn 22/09/2026. Thay hẳn bản 1 (21/09), vì **kết luận trung tâm của
> bản 1 đã sai**.
>
> Bản 1 kết luận: *"Thêm CSDL là phá luật zero-dependency của repo. Nếu mục tiêu
> chỉ là clip không bay khi dựng lại thì gắn ổ lưu là xong."*
>
> Chỗ sai: bản ấy chỉ xét đúng **một** loại CSDL — PostgreSQL, kéo theo trình
> điều khiển `pg` và `node_modules`. **Node 22 có sẵn `node:sqlite`.** Không cài
> gì, không dựng gì, không thêm một dòng nào vào `package.json`. Luật giữ
> nguyên, mà vẫn có SQL thật, giao dịch thật, ràng buộc thật.
>
> Bản này **có mã chạy được**: lược đồ ở `server/csdl/001-nen-mong.sql`, bộ mở
> và di trú ở `server/csdl.js`, 45 mục kiểm ở `tools/kiem-csdl.mjs`. App
> **chưa** dùng — đây là bước 1 trong bốn bước ở mục 6, và bước 1 lùi được bằng
> cách xoá một file.

---

## 1. Ba lỗ hổng có thật mà CSDL vá được

Không phải ba chuyện lý thuyết. Cả ba đều chỉ được ra đúng dòng mã hôm nay.

### 1.1 Hạn mức chi tiêu đếm trong RAM — lỗ TIỀN

`server/hanmuc.js:19` — `const so = new Map()`. Khởi động lại là bộ đếm về 0, ai
cũng được cấp lại 300 lượt AI và 20.000 ký tự đọc trong cùng một ngày.

Chính file ấy đã ghi lý do: *"Muốn chắc hơn thì phải ghi xuống đĩa, nhưng như
vậy cần chỗ ghi bền — mà bản chạy trong container thì chưa có."* Ngày 22/09 ta
gắn ổ lưu cho `kho/`, nên chướng ngại nó nêu đã hết.

**Và còn một chuyện bản 1 không thấy: trần đang đếm theo LƯỢT, không theo TIỀN.**
Một lượt hỏi 12 token và một lượt dựng cảnh từ ảnh 8.000 token đang được tính
**như nhau**. Trần "300 lượt/ngày" vì thế vừa quá chặt với việc rẻ vừa quá lỏng
với việc đắt. Bài kiểm mục 7 dựng đúng ca này: hai lượt, một lượt tốn gấp 80 lần
lượt kia.

### 1.2 Hàng đợi việc nằm trong RAM

`server/jobs.js:27` — `const viec = new Map()`. Khởi động lại giữa chừng một lượt
xuất video là việc biến mất, mà trình duyệt vẫn quay vòng chờ mãi không ai trả
lời.

Bảng `viec` dùng **hợp đồng thuê** (`thue_den`) chứ không dùng cờ "đang chạy": cờ
không bao giờ tự tắt khi tiến trình chết, còn hợp đồng thì tự hết hạn và việc
được nhặt lại. Kèm `lan_thu`/`toi_da_thu` để một việc luôn hỏng không thành vòng
lặp đốt tiền.

### 1.3 Không có bất kỳ phép kiểm xung đột nào — lỗ MẤT VIỆC

`server/save.js` — `luuClip()` ghi thẳng, không hỏi ai. Mở một clip trên hai tab,
sửa cả hai, bấm Lưu cả hai: **bản sau đè bản trước, im lặng**, và người mất bản
sửa không hề được báo. (`catBanCu` có cất bản cũ, nên lấy lại được — nhưng chỉ
khi người ta *biết* mình vừa mất và *biết* chỗ để tìm.)

Cột `du_an.phien_ban` vá đúng chỗ đó: ghi kèm phiên bản đã đọc, không dòng nào
đổi nghĩa là có người ghi trước → **hỏi người dùng**, đừng tự quyết hộ.

---

## 2. Ba thứ mới nó mở ra

Đây là phần "phát triển mạnh mẽ hơn" — không phải vá lỗi, mà là năng lực hôm nay
hoàn toàn chưa có.

| Bảng | Mở ra điều gì | Hôm nay đang ra sao |
|---|---|---|
| `chia_se` | Cho người khác xem / góp ý / sửa một dự án | Kho riêng **tuyệt đối**. Sếp muốn xem thì phải xuất video gửi đi |
| `gop_y` | Ghi chú neo vào **đúng cảnh, đúng món, đúng giây** | Góp ý qua chat: *"chữ ở đoạn giữa hơi nhỏ"* — không biết cảnh nào, món nào |
| `thanh_phan` + `the` | Thư viện thành phần tự cất, có thẻ, có nguồn gốc, đếm lượt dùng | `KIT` ghi **cứng** trong `web/them.js`; thêm một mẫu phải sửa mã rồi triển khai lại |

Cộng thêm hai thứ nhỏ hơn nhưng đáng kể:

- **`du_an.la_khuon`** — đánh dấu một dự án làm khuôn để nhân bản. Cờ trên chính
  bảng dự án, không phải bảng riêng: một khuôn **vẫn là** một dự án, mở ra sửa
  được y như mọi dự án khác.
- **`tep` + `tep_dung`** — tệp khử trùng theo vân tay (đúng cách `/api/anh` đang
  làm), cộng thêm thứ file thường không cho: **biết ai đang dùng tệp nào**, nên
  dọn rác được mà không xoá nhầm. Không có bảng này thì thư mục ảnh chỉ phình
  lên, không bao giờ nhỏ lại.

---

## 3. Sơ đồ

```
nguoi_dung ──< kho ──< du_an ──< ban_luu
     │          │        ├──── ban_nhap   (0..1 mỗi dự án)
     │          │        ├──< tep_dung >── tep
     │          │        ├──< chia_se >── nguoi_dung
     │          │        ├──< gop_y
     │          │        └──< viec
     │          └──< thanh_phan ──< the
     ├──< nhat_ky        (sổ cái — hạn mức CỘNG từ đây)
     └──< phien
```

14 bảng. DDL đầy đủ, kèm lý do từng quyết định, nằm ở
**`server/csdl/001-nen-mong.sql`** — không chép lại vào đây, vì hai bản sẽ trôi
khỏi nhau và rồi không ai biết bản nào đúng.

---

## 4. Bốn quyết định đáng tranh luận

### 4.1 Kịch bản clip vào MỘT cột JSON, không băm nhỏ thành bảng

Giữ nguyên từ bản 1, và vẫn đúng. Cây thành phần lồng nhau nhiều tầng, 25 loại
mỗi loại một bộ trường riêng. Băm thành `element` / `element_prop` là tự viết cho
mình một bộ ORM để rồi ghép lại y như cũ mỗi lần đọc — chậm hơn, và
**`validateScene` vẫn là thẩm quyền quyết định hợp lệ**, không phải ràng buộc của
bảng.

SQLite đọc được vào trong JSON (`json_extract`), nên `rong`/`cao`/`so_canh` là
**cột suy ra có lưu** — lọc và đếm không phải mở JSON.

### 4.2 KHÔNG có bảng `han_muc` riêng

Một bảng đếm sẵn bên cạnh sổ cái là **hai nguồn sự thật**, và sớm muộn chúng
lệch nhau — lúc ấy không ai biết tin cái nào. Hạn mức **cộng thẳng** từ `nhat_ky`;
chỉ mục `(nguoi_id, ngay_vn, don_vi)` lo phần tốc độ.

Bao giờ sổ cái lớn tới mức cộng chậm thì mới thêm bảng tổng theo ngày — và lúc
đó nó là **bộ nhớ đệm dựng lại được**, không phải nguồn sự thật thứ hai.

`ngay_vn` là cột suy ra: `date(luc, '+7 hours')`. "Hôm nay" của người dùng phải
là hôm nay của họ — theo UTC thì 7 giờ sáng mới sang ngày mới, và hạn mức reset
ngay giữa buổi làm việc. `hanmuc.js` đang cộng 7 tiếng bằng tay ở ba chỗ; cột tự
tính thì không có chỗ nào quên.

### 4.3 Tiền là SỐ NGUYÊN

`chi_phi_micro` — phần triệu của một đồng. Tiền để số thực thì cộng một triệu
dòng lại lệch, và lệch theo kiểu không ai truy ra được.

Giữ luôn `don_vi`/`so_don_vi` để mấy trần cũ (`kyTu`, `goiAI`, `xuat`) vẫn chạy
nguyên trong lúc chuyển dần sang trần tiền.

### 4.4 File nhị phân KHÔNG vào CSDL

Giữ nguyên từ bản 1. Video, ảnh, giọng đọc đi vào ổ lưu; CSDL chỉ giữ vân tay,
kiểu và kích thước. Nhét một video 30 MB vào cột blob là biến bản sao lưu CSDL
thành hàng chục GB, và mọi truy vấn chậm theo.

---

## 5. Cái giá, nói thẳng

**`node:sqlite` còn mang nhãn thử nghiệm.** Node in ra một dòng cảnh báo mỗi lần
chạy, và API có thể đổi ở bản Node sau. Giảm nhẹ: cả ứng dụng chỉ đụng thư viện
ở **đúng một file** (`server/csdl.js`) — API đổi thì sửa ở đó, không lan ra chỗ
khác.

**Một người ghi tại một thời điểm.** SQLite khoá theo file. Với công cụ nội bộ
vài người dùng thì thừa sức (và WAL cho người đọc không bị chặn); muốn hàng trăm
người ghi song song thì mới cần PostgreSQL. Lược đồ viết bằng SQL chuẩn nhất có
thể để lúc ấy chuyển đỡ đau — chỗ phải sửa là kiểu ngày tháng, `INTEGER PRIMARY
KEY` → `BIGSERIAL`, và `COLLATE NOCASE` → `CITEXT`.

**Đây là thêm một thứ để hỏng.** File CSDL cũng phải được ổ lưu che chở, cũng
phải sao lưu, cũng có thể hỏng. Đặt ở `kho/motion.db` nên nó dùng chung ổ lưu
`motion-kho` đã khai trong `docker-compose.yml` — không phải khai thêm ổ nào.

**Không nên làm nếu** mục tiêu chỉ là "clip không bay khi dựng lại". Cái đó ổ lưu
đã giải quyết xong hôm 22/09. CSDL đáng làm vì **ba lỗ ở mục 1** và **ba năng lực
ở mục 2**, không vì chuyện lưu trữ.

---

## 6. Đường di trú — bốn bước, không đi một bước

| Bước | Làm gì | Lùi được không |
|---|---|---|
| **1** | Dựng lược đồ + bộ di trú + bài kiểm. **App chưa đụng tới.** | có — xoá một file |
| 2 | **Ghi hai nơi**: file vẫn là chính, CSDL ghi theo. Đối chiếu hằng ngày. | có |
| 3 | Đọc từ CSDL, file thành bản lùi. | có — lật một cờ |
| 4 | Bỏ đường ghi file. | khó — chỉ làm sau khi bước 3 chạy êm vài tuần |

**Bước 1 đã xong** (22/09/2026): `server/csdl.js`, `server/csdl/001-nen-mong.sql`,
`tools/kiem-csdl.mjs`.

Bước 2 là bước người ta hay bỏ qua, và là bước **duy nhất** cho biết cấu trúc mới
có giữ đúng dữ liệu cũ hay không **trước khi** phụ thuộc vào nó.

### Thứ tự đề nghị cho bước 2

Đi từ chỗ **rủi ro thấp nhất, lợi ích rõ nhất**, không đi từ chỗ to nhất:

1. **`nhat_ky` + hạn mức** — chỉ ghi thêm, không đụng đường lưu clip. Vá xong lỗ
   tiền ở mục 1.1 mà không thể làm hỏng dữ liệu của ai.
2. **`viec`** — hàng đợi. Cũng không đụng clip.
3. **`nguoi_dung` + `phien`** — gỡ tài khoản khỏi biến môi trường.
4. **`du_an` + `ban_luu` + `phien_ban`** — chỗ đáng giá nhất nhưng cũng rủi ro
   nhất, để sau cùng và chạy song song với file ít nhất hai tuần.
5. `chia_se`, `gop_y`, `thanh_phan` — tính năng mới, dựng thẳng trên CSDL, không
   có dữ liệu cũ để di trú.

---

## 7. Lược đồ có được kiểm không

Có. `tools/kiem-csdl.mjs` — 45 mục, chạy bằng Node trần trên CSDL trong bộ nhớ,
chưa tới một giây, không đụng file thật.

Mọi ràng buộc đều được thử bằng cách **cố tình làm sai** rồi xem có bị chặn
không. Viết `UNIQUE` vào file rồi tin là nó chạy thì có ngày phát hiện **SQLite
mặc định TẮT khoá ngoại** — lúc dữ liệu đã hỏng. (Bài kiểm mục 1 canh đúng
`PRAGMA foreign_keys` cho ca đó.)

Mấy mục đáng chú ý:

- Dựng lại **đúng ca hai tab cùng lưu**, và kiểm rằng nội dung của tab A **vẫn
  còn nguyên** sau khi tab B bị chặn.
- Dựng lại ca **máy chủ chết giữa lúc xuất video**: hợp đồng thuê hết hạn thì
  việc được nhặt lại, và đếm đúng số lần đã thử.
- Kiểm rằng **xoá người dùng thì số liệu chi tiêu vẫn còn** — không thì một lần
  dọn tài khoản là mất hết số liệu để báo cáo.
- Kiểm rằng `ngay_vn` tính theo **giờ Việt Nam**, không theo UTC.
