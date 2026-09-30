# Rãnh tiếng — lời đọc, nhạc nền, tiếng động

Lát 3 của nhóm B. Trước đó app **không biết gì về tiếng**: 0/22 clip có âm thanh,
và mọi việc ghép tiếng phải làm bằng tay ở chỗ khác rồi canh khớp bằng mắt.

## Khai trong file clip

Nằm ở **gốc tài liệu**, ngang hàng với `meta` và `scenes` — tiếng chạy xuyên qua
nhiều cảnh nên không thuộc về cảnh nào.

```json
{
  "version": 2,
  "meta": { … },
  "audio": {
    "tracks": [
      { "id": "nhac", "src": "public/nhac/nen.mp3", "kind": "nhac",
        "at": 0, "gain": 0.35, "fadeIn": 0.8, "fadeOut": 1.2, "for": 24 },
      { "id": "vut-1", "src": "public/sfx/whoosh.mp3", "kind": "hieu-ung",
        "at": 0.4, "gain": 0.9 }
    ]
  },
  "scenes": [ … ]
}
```

| Núm | Nghĩa |
|---|---|
| `src` | đường dẫn trong dự án, tính từ gốc |
| `kind` | `tieng` (lời đọc) · `nhac` · `hieu-ung` |
| `at` | rãnh bắt đầu ở **giây thứ mấy của clip** |
| `from` | bỏ bao nhiêu giây **đầu file nguồn** |
| `for` | rãnh dài bao nhiêu · bỏ trống = hết file |
| `gain` | độ to `0`–`2` |
| `fadeIn` / `fadeOut` | mờ vào / mờ ra, tính bằng giây |

## Ba chỗ dễ làm sai

**Tiếng chạy theo đồng hồ của CLIP, không theo đồng hồ của thẻ `<audio>`.** Thả cho
thẻ tự phát thì tua tới giây 12 là hình nhảy tới ngay còn tiếng vẫn đọc từ đầu —
sai khớp mà không báo gì. Nên mỗi lần đổi mốc là ép lại `currentTime` từng rãnh.

**Chỉ ép khi lệch quá 0,12 giây, và chỉ soát 4 lần mỗi giây.** Ghi `currentTime` là
bắt trình duyệt tìm lại vị trí trong file nén; làm mỗi khung hình thì tiếng rè và
giật. 0,12 giây là dưới ngưỡng tai người nghe ra lệch môi.

**Lúc xuất video thì TẮT HẲN phần tiếng trong trang.** Bộ xuất nhảy từng khung,
không có "thời gian thật" để thu tiếng. ffmpeg ghép tiếng vào sau, từ chính danh
sách rãnh mà trang đang dùng (`window.__clip.tieng`). Quên bước này thì video vẫn
ra bình thường — chỉ chậm đi mà không ai biết vì sao.

## Ghép tiếng lúc xuất

Thứ tự bộ lọc có ý nghĩa:

```
cắt (-ss/-t) → đặt lại mốc → chỉnh to nhỏ → mờ vào/ra → RỒI MỚI đẩy lùi (adelay)
```

Đẩy lùi trước thì `afade` tính mốc theo thời gian đã lùi và vệt mờ rơi sai chỗ.

`amix` phải có **`normalize=0`**. Mặc định nó chia đều độ to cho số rãnh, nên thêm
một tiếng động nhỏ là cả lời đọc tụt xuống một nửa — nghe như hỏng máy.

Một bẫy đã dính: số thứ tự luồng vào của ffmpeg phải đếm riêng, **không** lấy độ dài
mảng tham số. Mỗi rãnh đẩy vào 6 phần tử (`-ss`, giá trị, `-t`, giá trị, `-i`, đường
dẫn) nên lấy độ dài mảng ra 1, 7, 13, 19 thay vì 1, 2, 3, 4 — và ffmpeg chỉ báo
`Invalid argument`, không nói sai ở đâu.

## Sóng âm

`/api/song-am?src=…&o=400` trả `{ giay, dinh[], to }`.

- Giải mã cả file ra PCM một kênh **8 kHz** — chỉ để vẽ hình, giữ 48 kHz hai kênh
  là tải gấp mười hai lần dữ liệu cho đúng một hình thù y hệt.
- Lấy **đỉnh** mỗi ô, không lấy trung bình. Trung bình làm tiếng gõ và tiếng vụt
  biến mất khỏi hình, mà đó lại đúng là thứ cần nhìn để đặt đúng chỗ.
- Nhớ lại theo (đường dẫn + lần sửa + cỡ file): đo một bản nhạc 3 phút tốn gần một
  giây, mà bảng vẽ lại sau mọi thao tác sửa.
- Trả kèm `to` (đỉnh lớn nhất) để giao diện tự chuẩn hoá. Kho tiếng vụt hiện tại chỉ
  to **4%** — vẽ thô ra một vạch phẳng, nhìn y như file hỏng.

Đường dẫn bị chặn y như `static.js`: không `..`, không đường tuyệt đối, không đoạn
bắt đầu bằng dấu chấm. Gốc dự án có `.env` chứa khoá ElevenLabs.

## Chạy kiểm

```bash
node tools/kiem-tieng.mjs
```

Phép đo mạnh nhất: dựng clip chỉ có **đúng một** tiếng động ở giây 2,0, xuất video,
rồi đo độ to theo từng ô 0,1 giây. Đỉnh phải rơi vào ô giây 2,0 và trước đó phải im.
"ffmpeg chạy xong mã 0" không chứng minh được gì — nó vẫn trả 0 khi ghép nhầm chỗ.

Đã thử phá:

| Gỡ | Số mục gãy |
|---|---|
| ghép tiếng khi xuất | 1 |
| đồng bộ tiếng khi tua | 3 |
| tắt tiếng lúc xuất | 1 |

> Bài kiểm mục 6 dựa vào clip `wireframe-thu` **có sẵn rãnh tiếng** làm bản mẫu.
> Gỡ tiếng khỏi clip đó thì mục này đỏ, mà không phải vì code hỏng.
