# Nút Dừng — và hàm `pause()` thêm vào `scene-player.html`

**Ngày 10/09/2026 — có sửa một chỗ trong `scene-player.html` của dự án chung.**
Ghi lại ở đây để không ai mất dấu, và để khôi phục được trong một lệnh.
Cùng kiểu với `MAU-CHU-RIENG.md`, đọc kèm file đó.

## Vấn đề

Bộ dựng chỉ có ba nút điều khiển thời gian: `play()`, `seek()`, `at()`. Nó
**không có hàm dừng**. Trong `scene-player.html`, cờ `DUNG` chỉ bật lên ở đúng
hai chỗ:

```js
let t = 0, DUNG = true, last = 0;                                    // lúc khai báo
function loop(now) {
  if (!DUNG) { …; render(t + dt); if (t >= DUR) DUNG = true; }       // khi hết phim
}
```

`seek()` gọi `render()`, mà `render()` chỉ tính lại `t` rồi vẽ — **không đụng tới
`DUNG`**. Nhưng `web/player.js` lại dừng phim bằng `clip.seek(clip.at())`, kèm
một dòng ghi chú khẳng định "seek đặt `DUNG = true` trong bộ dựng". Không đúng.

Hậu quả, ba lỗi cùng lúc:

| Thao tác | Đáng lẽ | Thực tế |
|---|---|---|
| Bấm **Dừng** | phim đứng | nhãn đổi thành "▶ Chạy" mà phim **vẫn chạy tiếp** |
| Phim tự chạy hết | nút về "Chạy" | nút kẹt ở "❚❚ Dừng", đồng hồ đóng băng |
| Bấm **Chạy** ở cuối phim | chạy lại từ đầu | không có gì nhúc nhích |

Lỗi thứ hai và thứ ba là hệ quả của việc `player.js` tự giữ một lá cờ `dangChay`
riêng thay vì hỏi bộ dựng — cờ ấy lệch ngay lần đầu phim tự chạy hết.

## Thay đổi

Trong `scene-player.html`, ngay sau `play` trong khối `window.__clip`:

```js
    play: () => { DUNG = false; last = performance.now(); },
    pause: () => { DUNG = true; },
    get paused() { return DUNG; },
```

**Thuần bổ sung.** Không công cụ nào đang gọi `pause` hay đọc `paused`
(`export-video.mjs`, `check-layout.mjs`, `shots-18s.mjs`, `scan-sfx-cues.mjs`
chỉ dùng `ready`/`play`/`seek`/`at`/`duration`/`scenes`), nên không hành vi cũ
nào đổi. Đã kiểm: cả sáu bài kiểm của trình sửa vẫn qua, `kiem-khung.mjs` so
từng byte file video đã giao vẫn nguyên vẹn.

## Phía trình sửa

`web/player.js` nay:

- Hỏi `clip.paused` để biết đang chạy hay đứng, **không** tự giữ cờ riêng.
- `chay()` — đang đứng ở cuối phim thì `seek(0)` trước rồi mới `play()`.
- Vòng lặp của trang cha báo thêm **một nhịp** sau khi phim đứng lại, nếu không
  nhãn nút và đồng hồ đóng băng ở trạng thái cũ.

## Đường lùi nếu đoạn này biến mất

`scene-player.html` là file của dự án chung và có người sửa hằng ngày. Nếu ai đó
thay cả file, `pause` mất theo. `player.js` đã lường trước: thiếu `pause()` thì
nó chuyển sang **ghim chỗ** — mỗi nhịp hình lại `seek()` về đúng giây đang đứng.
Hơi rung một khung hình, nhưng vẫn đứng gần đúng chỗ, hơn hẳn việc phim chạy
tiếp trong khi nút ghi "Chạy".

Bài kiểm `tools/kiem-chay-dung.mjs` canh cả hai đường: mục 1 báo ngay nếu
`pause` biến mất, mục 7 dựng lại một `__clip` đời cũ để chắc đường lùi còn sống.

## Khôi phục

Bản gốc trước khi sửa nằm ở `.hub-video-backups/scene-player/2026-09-10T161531/`
(78.324 byte, md5 `0f7efc01120b8c10a973f5c379412e46`).

```bash
cp projects/matbao-hub-video/.hub-video-backups/scene-player/2026-09-10T161531/scene-player.html \
   projects/clipVibehost/hosting-animatic-production/scene-player.html
```

Khôi phục xong thì nút Dừng rơi về đường lùi ở trên — vẫn dùng được.
