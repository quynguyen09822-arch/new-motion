# Trình sửa clip — KHÔNG có gói phụ thuộc nào.
#
# Cả ứng dụng chạy bằng `node:http` trần, không Express, không bundler, không
# `node_modules`. Nên ở đây KHÔNG có `npm install`: thêm nó vào chỉ tổ làm chậm
# lần dựng và mở đường cho lỗi mạng ở nơi không cần mạng.
FROM node:22-alpine

WORKDIR /app

# Mã nguồn.
COPY package.json ./
COPY server/ ./server/
COPY web/ ./web/

# Hai công cụ bản chạy thật cần. `.dockerignore` bỏ cả `tools/` rồi mở lại đúng
# hai file này — chép cả thư mục là mang theo 28 bài kiểm Playwright vô dụng.
COPY tools/xuat-nhanh.mjs tools/dat-mat-khau.mjs ./tools/

# SỐ LIỆU LƯỢT DÙNG đã gộp. Phải mang theo: container không giữ file giữa hai
# lần triển khai (vibehost không có chỗ gắn ổ lưu), nên thiếu thư mục này là
# mỗi lần deploy lại con số "có ai dùng không" về 0.
COPY so-lieu/ ./so-lieu/

# DỮ LIỆU CLIP gói kèm.
#
# Trình sửa là một cửa sổ nhìn vào dự án clip — thiếu nó thì server chết ngay
# lúc khởi động chứ không chạy què. Ở máy, dự án ấy nằm ở thư mục khác; trên
# mạng thì không có, nên phải mang theo.
#
# Chỉ mang thứ 11 clip THỰC SỰ dùng: bộ dựng, kịch bản, và đúng 5 tệp ảnh.
# Cả thư mục `public/` của dự án gốc nặng 147 MB, nhưng đo ra thì các clip chỉ
# chạm tới 1,6 MB trong đó — phần còn lại là video nguồn chưa clip nào dùng.
COPY clip/ ./clip/
ENV PROJ_ROOT=/app/clip

# HAI THƯ MỤC PHẢI GHI ĐƯỢC.
#
# Ứng dụng chụp một bản gốc của kịch bản ngay lúc khởi động (`chupBanGoc`) và
# ghi bản nháp mỗi khi người dùng sửa dở. `COPY` tạo file thuộc quyền root, mà
# ta chạy bằng người dùng `node` — thiếu bước này thì container CHẾT NGAY lúc
# khởi động với `EACCES: mkdir '/app/.hub-video-backups/...'`. Đã vấp thật.
#
# Cố ý KHÔNG tắt phần sao lưu đi cho tiện: đó là lưới an toàn của dữ liệu clip,
# và một bản deploy cho sửa được thì càng cần nó.
#
# `/app/kho` là kho riêng của từng tài khoản (xem docs/KHO-RIENG.md). Phải tạo
# sẵn và chown ở đây vì cùng lý do: `COPY` để lại quyền root, mà app chạy bằng
# người dùng `node`. Thiếu bước này thì người đầu tiên KHÔNG phải chủ kho bấm
# "Tạo dự án mới" sẽ nhận EACCES.
RUN mkdir -p /app/.hub-video-backups /app/.drafts /app/kho \
 && chown -R node:node /app/.hub-video-backups /app/.drafts /app/kho /app/clip

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Chạy bằng người dùng thường, không phải root.
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/main.js"]
