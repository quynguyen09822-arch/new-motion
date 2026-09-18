# so-lieu/

Nhật ký lượt dùng đã gộp, **có vào git** — khác với `.nhat-ky/` là dữ liệu chạy
trong máy và bị `.gitignore` chặn.

Sinh ra vì bản chạy trên vibehost nằm trong container mà nền tảng **không có chỗ
gắn ổ lưu**: `.nhat-ky/dung.jsonl` mất sạch mỗi lần triển khai lại, nên con số
"có ai dùng công cụ này không" cứ về 0. Repo là chỗ bền duy nhất đang có.

```bash
npm run day-so-lieu            # xem thử, không đẩy
npm run day-so-lieu -- --ghi   # gộp + commit + push
```

Gộp chứ không đè: file này là bản gom của mọi lần đẩy trước, còn file trong máy
chỉ có phần từ lần khởi động gần nhất.

`/api/thong-ke` đọc **cả hai** rồi bỏ trùng, nên số liệu liền mạch qua các lần
triển khai.
