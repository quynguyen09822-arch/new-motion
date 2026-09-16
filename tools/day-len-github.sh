#!/usr/bin/env bash
# Đẩy bản ở máy lên GitHub — chạy MỘT LẦN, sau đó chỉ cần `git push`.
#
# Khoá KHÔNG đi qua khung chat, KHÔNG nằm trong lịch sử lệnh, KHÔNG lộ ra `ps`.
#
#   bash tools/day-len-github.sh
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="https://github.com/quynguyen09822-arch/motion.git"

if ! grep -q 'github.com' ~/.git-credentials 2>/dev/null; then
  echo "Chưa có khoá GitHub trong máy. Tạo Personal Access Token (fine-grained,"
  echo "quyền Contents: Read and write cho repo motion) rồi dán vào đây."
  printf 'Tên đăng nhập GitHub: '; read -r TEN
  printf 'Dán TOKEN rồi Enter (gõ vào sẽ không hiện chữ): '; read -rs TOK; printf '\n'
  [ -n "${TOK//[[:space:]]/}" ] || { echo "✗ Token rỗng — dừng."; exit 1; }
  umask 077
  printf 'https://%s:%s@github.com\n' "$TEN" "$TOK" >> ~/.git-credentials
  git config --global credential.helper 'store --file=~/.git-credentials'
  unset TOK
  echo "✓ Đã lưu khoá."
fi

git remote get-url origin >/dev/null 2>&1 || git remote add origin "$REPO"
git remote set-url origin "$REPO"

echo
echo "Sắp ghi đè nhánh 'main' trên GitHub bằng $(git rev-list --count HEAD) commit ở máy."
echo "Hai commit cũ trên đó ('Initial commit' + 'Add files via upload') sẽ MẤT."
printf 'Đồng ý? (gõ "co" rồi Enter): '; read -r OK
[ "$OK" = "co" ] || { echo "Đã dừng, chưa đẩy gì."; exit 0; }

git push --force origin HEAD:main
echo
echo "✓ Xong. Giờ nhắn Claude: \"đã đẩy xong\" để nó triển khai lại trên Vibe Host."
