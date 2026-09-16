# Chặn lệch schema (Lát 0 · F2)

Một trường của clip sống ở **ba chỗ, trong hai repo**:

| # | Nơi | Vai |
|---|---|---|
| 1 | `clipvibe-studio/src/scene/types.ts` | bản khai hợp đồng |
| 2 | `web/inspector/schema.js` | núm bày ra cho người dùng vặn |
| 3 | `scene-player.html` | nơi **thật sự** vẽ ra hình |

Lệch nhau thì **không ai báo gì cả**, và hỏng theo hai chiều — cả hai đều lặng lẽ:

- **Núm ma** — bày núm cho một trường bộ dựng không đọc. Bấm vào thì kịch bản
  đổi, khung hình đứng im. *Đã gặp thật: 16 núm "Đệm trong" chết.*
- **Năng lực bị giấu** — bộ dựng đọc một trường mà không có núm nào.
  *Đã gặp thật: `gap` chạy ở 11 loại, chỉ 1 loại được bày núm.*

```bash
npm run kiem:schema
```

## Bốn mục nó soi

1. Ba nơi có cùng một danh sách loại phần tử.
2. **Núm ma** — có núm mà bộ dựng không đọc.
3. **Năng lực bị giấu** — bộ dựng đọc mà không có núm.
4. Trường khai trong `types.ts` mà cả hai bên đều không dùng *(ghi nhận, không đánh rớt)*.

## Ba cái bẫy trong chính phép kiểm

Phép dò bộ dựng là dò chữ `el.<tên>` — đó là **phép đoán**, không phải phép
chứng minh. Ba lần nó đoán sai, và cả ba đều phải sửa ở **phép dò**, không phải
nhét vào danh sách bỏ qua:

**1. Gọi nhờ một tầng.** `quydao` không đọc trường nào trong khối dựng của nó —
nó gọi `veQuyDao(el)` rồi đọc hết ở trong đó. Kết quả: **6 núm bị kêu oan**.
Nay phép dò đi theo một tầng gọi nhờ.

**2. Con trỏ không dựng bằng `BUILD`.** Nó có lớp riêng vẽ ở `applyPointer`, vì
cả clip chỉ có **một** con trỏ. Bị kêu là "bộ dựng không dựng loại này".

**3. Interface viết gọn một dòng.** Đây là cái nguy nhất vì nó làm phép kiểm
**im lặng yếu đi** chứ không kêu oan:

```ts
interface BrowserEl extends Base { kind: 'browser'; url?: string }
```

Chỉ dò theo đầu dòng thì mỗi loại chỉ nhặt được **đúng trường đầu tiên**. Thử
xoá núm `browser.url` — phép kiểm **vẫn xanh**. Nay cắt theo cả dấu chấm phẩy.
Sửa xong nó tìm ra thêm `form.fields` mà trước đó bỏ sót.

## Hai danh sách, đừng gộp

- **`BO_QUA`** = "soi tận nơi rồi, **không phải lỗi**" (13 mục, mỗi mục kèm lý do).
- **`NO_GHI_NHAN`** = "**đúng là lỗi**, chưa làm" (4 mục, đều chờ Lát 2).

Gộp hai thứ này là cách êm ái nhất để một cái lỗi biến thành một dòng chú thích
rồi nằm đó mãi. Và danh sách nợ **không được mục rữa**: sửa xong một mục mà quên
xoá khỏi đó thì phép kiểm **đánh rớt** — một danh sách nợ không ai dọn thì chẳng
mấy chốc thành nghĩa địa.

## Lệch có thật đã tìm ra và sửa ngay

**`video` không có trong `types.ts`.** Loại `video` được thêm vào bộ dựng và
`schema.js` nhưng chưa bao giờ khai trong hợp đồng — lệch do chính đợt làm nền
động sinh ra. Đã bổ sung `VideoEl`, kèm cảnh báo HEVC ngay trong chú thích.

Sao lưu `types.ts` trước khi sửa (dự án chung, **không có git**):
`.hub-video-backups/types-ts/2026-09-15T122333/` — md5 `0a3e414c24135cf199c104d553f88717`.

## Bốn món nợ còn lại

`form.fields` · `quydao.chips` · `pointer.path` · `pointer.clicks` — **cả bốn
đều là danh sách con nằm trong món**, và đúng bằng bốn trường mà phép đo độc lập
trước đó đã chỉ ra là chưa có núm. Đây là việc của **Lát 2**.
