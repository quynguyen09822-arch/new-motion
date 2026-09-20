# Ô xem thử dùng chung — API và ghi chép khi làm

> **19/09: đã duyệt và đã làm xong.** Ba câu hỏi bên dưới Quý đã chốt; phần
> "Ba chỗ cần anh quyết" giữ lại nguyên văn kèm câu trả lời, để sau này còn biết
> vì sao lại thế. Việc đã xong: `server/canhmau.js`, `web/inspector/o-xem-thu.js`,
> `tools/kiem-o-xem-thu.mjs` (20 phép), trang thử `/thu-o-xem-thu.html`.

> Theo `BANG-CHINH-V2.md`, phần **Hạ tầng**: *"Trước khi code, cho anh xem API
> của thành phần này (nhận gì, trả gì)."* Đây là bản đó. **Chưa viết dòng mã
> nào.**

## Ba điều đã đo, quyết định cả thiết kế

**① Không phải đụng `scene-player.html`.** Tham số `?scene=` của bộ dựng nhận cả
**đường dẫn tuyệt đối**, không chỉ tên clip:

```js
const url = /^https?:|^\//.test(name) ? name : `scenes/${name}.json`;
```

Nên chỉ cần trỏ nó vào một đường sinh cảnh mẫu là xong. Bộ dựng của dự án chung
**giữ nguyên** — đúng ràng buộc trong tài liệu của anh.

**② Không phải phá luật "chỉ `player.js` được chạm `window.__clip`".**
`player.js` vốn đã xuất ra `taoPlayer(iframe)` — một nhà máy nhận iframe và trả
về `san() · nap() · tua() · chay() · dung() · giay · thoiLuong`. Ô xem thử gọi
đúng hàm đó cho iframe của mình. Không thêm một đường chạm `__clip` nào.

**③ Mở nhiều ô cùng lúc chịu được.** Đo thật trong Chromium, mỗi ô là một iframe
bộ dựng đầy đủ:

| Số ô | Nạp xong | Nhịp vẽ của trang cha |
|---|---|---|
| 1 | 348ms | 55,3 /giây |
| 4 | 179ms | 55,3 /giây |
| 10 | 328ms | **52,3 /giây** |
| 16 | 355ms | 50,7 /giây |

Mốc nghiệm thu "10 ô cùng lúc không giật" — đạt. **Nhưng đây là máy lúc rảnh.**
Máy đang xuất video thì chậm hơn nhiều, nên vẫn phải dừng ô khi nó ra khỏi tầm
nhìn, đúng như tài liệu yêu cầu.

## API đề xuất

```js
import { taoOXemThu } from './o-xem-thu.js';

const o = taoOXemThu({
  hop,                      // phần tử DOM để gắn ô vào
  mon: 'text',              // món mẫu: 'text' | 'anh' | 'nut' | 'huyhieu'
  nhan: 'Trượt lên nhẹ',    // chữ hiện trong món mẫu
  vao: 'truot-len',         // id một gói trong KHO_VAO — hoặc null
  ra: null,                 // id một gói trong KHO_RA — hoặc null
  hieuUng: { soft: 3 },     // các núm hiệu ứng đang đặt
  lap: true,                // diễn xong thì diễn lại
});
```

Trả về:

```js
o.phanTu        // phần tử gốc, để xếp vào lưới thẻ
o.dat({ hieuUng: { soft: 5 } })   // đổi giá trị rồi diễn lại (gộp nhịp ~150ms)
o.chay()        // diễn
o.dung()        // đứng
o.huy()         // gỡ iframe, ngắt theo dõi — BẮT BUỘC gọi khi đóng bảng
```

Tự lo ba việc, người gọi không phải nghĩ:

- **Chỉ dựng iframe khi ô lọt vào tầm nhìn**, và `dung()` khi ra khỏi. Mười thẻ
  trong dải cuộn thì chỉ mấy thẻ đang thấy là chạy.
- **Gộp nhịp `dat()`** khoảng 150ms — kéo thanh trượt bắn ra vài chục lần một
  giây, không gộp thì mỗi lần là một lượt nạp lại.
- **Diễn lặp** bằng `tua(0)` + `chay()`, nghỉ ~250ms giữa hai lượt cho mắt kịp.

## Cảnh mẫu lấy ở đâu

Thêm một đường đọc: `GET /api/canh-mau?mon=text&vao=truot-len&soft=3`, trả về
một kịch bản **một món** đúng định dạng.

Vì sao dựng ở máy chủ chứ không ở trình duyệt:

- **Dùng lại `validateScene`**, không chép nó ra bản thứ hai (luật 7 trong
  `CLAUDE.md`: mượn, không chép). Cảnh mẫu sai định dạng thì ô xem thử nói dối,
  mà nói dối thì tệ hơn không có.
- Bộ dựng chỉ `fetch` được **đường dẫn**. `blob:` và `data:` **không lọt** qua
  phép thử `/^https?:|^\//` của nó — đã đọc kỹ chỗ đó.
- Một chỗ duy nhất định nghĩa món mẫu, thay vì rải trong giao diện.

Đã cân nhắc và **bỏ**: ghi file cảnh mẫu vào `clip/scenes/`. Làm vậy thì chúng
hiện lên trong danh sách clip của người dùng như clip thật.

## Ba chỗ cần anh quyết — đã chốt 19/09

> **① Món mẫu:** chữ cố định **"Mắt Bão"** ở mọi ô, KHÔNG phải tên gói — tên gói
> dài ngắn khác nhau thì mỗi thẻ một hình dạng, mắt hết so được chuyển động, mà
> cả việc này sinh ra để so chuyển động. Riêng `push` dùng **mẫu khung** nhiều
> món.
> **② Lặp:** lặp liên tục nhưng **lệch pha** — mỗi ô vào một lúc để thành làn
> sóng chứ không phải một nhịp giật đồng loạt. Công tắc một dòng giữ nguyên.
> **③ `push`:** đổi nốt sang thanh kéo (Việc 1), giữ 5 nấc `BAC_DAY` làm điểm
> bám và **chặn trần đúng bằng nấc cao nhất hiện tại**.

<details><summary>Nguyên văn ba câu hỏi lúc trình</summary>


**① Món mẫu trông ra sao.** Em định: một thẻ chữ trên nền xám nhạt, chữ là tên
gói đang xem (vd "Trượt lên nhẹ"). Với hiệu ứng ảnh thì dùng một ô ảnh giả.
Anh muốn khác thì nói trước khi em code.

**② Diễn lặp liên tục hay rê chuột mới diễn.** Em đề nghị **lặp liên tục các ô
đang thấy** — số đo ở trên cho thấy chịu được, và "thấy trước khi chọn" thì phải
thấy mà không cần thao tác. Nếu anh thấy 10 thứ nhúc nhích cùng lúc là rối thì
đổi sang rê-chuột-mới-diễn, sửa một dòng.

**③ Ô xem thử có cần nghe được không.** Em định **không** — xem mặt chuyển động
thôi, không tiếng. Mở 10 ô mà mỗi ô một tiếng thì thành ồn.

</details>

## Bốn chỗ vấp khi làm — ghi lại để khỏi vấp lại

**① Đặt thẳng `iframe.src` là ô đứng im mà không báo gì.** `taoPlayer` chỉ gán
được `clip` khi đi qua `may.mo()` — nó chờ `__clip` hiện ra bên trong rồi mới gọi
`ready()`. Bỏ qua bước đó thì `san()` mãi false, `chay()` thành lệnh rỗng. Triệu
chứng: sáu ô cùng đứng ở giây 0.

**② `place: 'giua'` KHÔNG căn giữa.** Nó chỉ đặt khối phủ khung trừ lề; chữ vẫn
nằm sát mép trên khối. Trong ô cao 110px trông như chữ bị đẩy lên góc. Phải đặt
`y` tay.

**③ Ô lệch tỉ lệ cảnh thì lòi hai dải màu nền của bộ dựng** — trông như ô hỏng.
Đã ghim `aspect-ratio: 16 / 9` vào `.o-xem-thu` để chỗ gọi chỉ đặt bề ngang.

**④ Phép kiểm lệch pha đầu tiên của em là bù nhìn.** Nó hỏi "các ô có khác nhau
không" — mà các ô vốn nạp xong lệch nhau sẵn, nên nó **xanh cả khi đã bỏ hẳn lệch
pha**. Phát hiện được là nhờ thử phá thật. Đã đo lại: có rải thì sáu ô trải rộng
**1.27s**, bỏ rải chỉ **0.16s**; ngưỡng đặt ở 0.6s, và tách `buocLech()` thành hàm
thuần để kiểm thẳng phép tính.

Hai chỗ nữa cũng do phá mà lòi: đo trên `#cam` thay vì `#stage .el` (khung máy
quay đứng yên và không mang `filter`, nên báo oan là "ô không chạy"), và cửa sổ
lấy mẫu ngắn hơn một vòng diễn (rơi trúng đoạn món đã đứng yên).

## Hai chỗ trong `BANG-CHINH-V2.md` cần sửa lại cho khớp mã

Không phải lỗi lớn, nhưng để nguyên thì prompt giao cho người khác sẽ dẫn sai:

**① Tên mảng.** Tài liệu ghi *"mảng `VAO` và `RA` trong schema.js"* và prompt
Việc 2 ghi *"mỗi thẻ một gói trong mảng VAO"*. Tên thật là **`KHO_VAO`** và
**`KHO_RA`**. Không có mảng nào tên trần là `VAO`.

**② Việc 1 nhắc 4 hiệu ứng, thực tế có 5 cái kiểu `bac`.** Tài liệu liệt kê
`soft`, `softIn`, `shadow`, `maskSoft`. Còn một cái nữa cùng kiểu:

```js
{ id: 'push', nhan: 'Đẩy máy chậm', kieu: 'bac', bac: BAC_DAY },
```

`push` dùng thang `BAC_DAY` (5 nấc: Không…Rõ), khác ba cái kia (`BAC_NHOE`,
`BAC_BONG`, 6 nấc). Anh quyết: đổi nốt `push` sang thanh kéo cho đồng bộ, hay
cố ý để yên vì nó là *tốc độ đẩy máy* chứ không phải *độ đậm*?

## Việc sẽ làm sau khi anh duyệt

1. `server/canhmau.js` + đường `GET /api/canh-mau`, mượn `validateScene`
2. `web/inspector/o-xem-thu.js` theo đúng API trên
3. `tools/kiem-o-xem-thu.mjs` — ba mốc nghiệm thu trong `BANG-CHINH-V2.md`:
   cùng token thì ô xem thử và clip thật **trùng chuyển động**, 10 ô không giật,
   đổi giá trị thì ô đổi theo trong nửa giây
