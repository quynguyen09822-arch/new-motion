# Nút AI ở thanh dưới

Bấm nút **AI** ở góc phải thanh phát → bảng AI nổi lên ngay trên đó, có hai thẻ:
**Hỏi AI** và **Giọng đọc**.

## Vì sao ở dưới chứ không phải cột phải

Cột phải là chỗ **sửa một món đang chọn** — mọi thứ trong đó thuộc về một thành
phần cụ thể. Hỏi AI thì không: câu hỏi thường về **cả clip**, và người ta hỏi trong
lúc đang *xem*, không phải đang *chỉnh*. Nhét vào cột phải là bắt người dùng rời khỏi
việc đang làm để đi tìm chỗ hỏi.

Thanh hỏi **không đè lên thanh phát** — nút Chạy và thanh tua phải còn bấm được
trong lúc đang hỏi, vì người ta hay vừa tua vừa hỏi.

## Mọi việc AI ở một chỗ

Trước đây giọng đọc nằm ở một **thẻ riêng bên cột phải**. Hai cửa cho cùng một thứ
là người dùng phải nhớ cái nào ở đâu, và bao giờ cũng mở nhầm cái kia. Đã gộp làm
hai thẻ con ngay trong bảng này; thẻ AI ở cột phải **đã bỏ**.

Thẻ **Giọng đọc** chia hai cột: gõ brief và lời bên trái, chọn giọng bên phải. Xếp
dọc hết thì danh sách 28 giọng bị đẩy xuống đáy bảng và chỉ còn thấy hai dòng — mà
chọn giọng mới là việc chính ở đây.

## Phần hỏi: thanh ngang, không phải khung chat

**Không giữ lịch sử hội thoại.** Một câu hỏi, một câu trả lời, xong.

Giữ lịch sử thì phải có chỗ cuộn, có chỗ xoá, và người dùng bắt đầu chờ đợi nó nhớ
được mọi thứ — mà nó thì không. Hứa ít, giữ đúng lời.

Bốn gợi ý sẵn, là bốn câu hỏi có thật người dùng hay hỏi. Ô trống không có gợi ý là
ô trống người ta không biết gõ gì vào. Riêng **"Viết lời đọc…"** không trả lời tại chỗ
mà chuyển sang thẻ con **Giọng đọc** — việc đó có brief, chọn giọng và nghe thử,
trả lời nửa vời bằng một đoạn chữ thì tệ hơn. Bảng **không đóng rồi mở lại**, chỉ đổi
thẻ con: đóng mở là thừa một nhịp.

## Trả lời dựa trên clip thật

Lời nhắc đưa vào **toàn bộ số liệu clip**: từng cảnh dài bao lâu, có món gì, chữ gì,
rãnh tiếng nào, món nào có mốc chuyển động. Kèm theo **danh sách app làm được** và
**danh sách app không làm được**.

Không có danh sách thứ hai thì model sẽ hướng dẫn người dùng bấm những nút không tồn
tại — kiểu hỏng tệ nhất, vì nghe rất thuyết phục.

## Cái bẫy token, và vì sao phải có phép kiểm canh

Model Gemini 3.x tiêu token để **"nghĩ"** trước khi trả lời, và phần nghĩ ăn **chung
hạn mức** với phần trả lời. Đo được trên `gemini-3.6-flash`:

| Cấu hình | Nghĩ | Trả lời | Kết quả |
|---|---|---|---|
| 700 token | **671** | **25** | ❌ cắt ngang, và thứ lọt ra là *dòng suy nghĩ nội bộ* |
| 2000 token | 533 | 89 | ✅ |
| 700 token, **tắt nghĩ** | 0 | 92 | ✅ nhanh nhất, rẻ nhất |

Khi chạm trần, thứ hiện ra cho người dùng không phải câu trả lời mà là đoạn suy nghĩ
của model cắt ngang giữa chừng — kiểu `**Output Generation:** (Matches V…`. Trông y
như app hỏng, mà **không có ngoại lệ nào bắn ra, không có mã lỗi nào**.

Hai cửa chặn:
1. **Tắt phần nghĩ** cho câu trả lời ngắn (`nghi: false`). Việc sáng tác như viết lời
   đọc thì vẫn để nghĩ — ở đó chất lượng đáng giá hơn.
2. `finishReason === 'MAX_TOKENS'` thì **coi lượt đó là trượt** và tụt sang model kế,
   không trả đoạn cụt cho người dùng.

## Chạy kiểm

```bash
node tools/kiem-thanh-ai.mjs
```

> **Một chuyện về chính phép kiểm này.** Lần đầu em đặt câu hỏi thử là *"Clip này dài
> bao nhiêu giây?"* — model trả lời gọn trong một câu, không bao giờ chạm trần token.
> Phép phá thử gỡ **hẳn** cả hai cửa chặn mà bài kiểm vẫn xanh: nó đang canh một thứ
> không bao giờ xảy ra. Đổi sang câu hỏi cần phân tích thật (*"clip có vấn đề gì, nên
> sửa gì trước khi xuất"*) thì phép phá bị bắt ngay.
>
> Bài học: **phép phá thử cũng phải kiểm lại.** Một phép phá không phá được gì thì nó
> đang chứng minh nhầm rằng phép kiểm vô dụng.
