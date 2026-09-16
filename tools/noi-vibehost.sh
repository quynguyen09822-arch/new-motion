#!/usr/bin/env bash
# Nối Claude Code với Vibe Host (MCP).
#
# Khoá KHÔNG đi qua khung chat, KHÔNG nằm trong lịch sử lệnh, KHÔNG lộ ra
# `ps`/`/proc` — nó chỉ sống trong một biến của chính tiến trình này rồi được
# ghi thẳng vào tệp cấu hình.
#
#   bash tools/noi-vibehost.sh
set -euo pipefail

TEP="${1:-/home/coder/workspace/.mcp.json}"
URL="https://vibehost.matbao.ai/api/agent/mcp"

printf 'Dán KHOÁ Vibe Host rồi Enter (gõ vào sẽ không hiện chữ): '
read -rs KHOA
printf '\n'

[ -n "${KHOA//[[:space:]]/}" ] || { echo "✗ Khoá rỗng — chưa làm gì cả."; exit 1; }

KHOA="$KHOA" TEP="$TEP" URL="$URL" python3 - <<'PY'
import json, os, shutil, sys

tep, url, khoa = os.environ['TEP'], os.environ['URL'], os.environ['KHOA'].strip()

d = {}
if os.path.exists(tep):
    shutil.copy(tep, tep + '.bak')          # giữ bản cũ, phòng khi cần lùi
    try:
        d = json.load(open(tep, encoding='utf-8'))
    except Exception as e:
        sys.exit(f'✗ {tep} không phải JSON hợp lệ ({e}) — dừng, không ghi đè.')

# THÊM vào `mcpServers`, tuyệt đối không ghi đè cả tệp: ở đây đã có
# `ai-factory` và `stitch`, xoá nhầm là mất luôn hai cổng đang dùng.
may = d.setdefault('mcpServers', {})
may['vibehost'] = {
    'type': 'http',                          # Claude Code dùng `type`+`url`,
    'url': url,                              # KHÔNG phải `serverUrl` như Antigravity
    'headers': {'Authorization': f'Bearer {khoa}'},
}
json.dump(d, open(tep, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open(tep, 'a', encoding='utf-8').write('\n')
print(f'✓ Đã thêm cổng "vibehost" vào {tep}')
print('  Các cổng hiện có:', ', '.join(may))
print(f'  Bản cũ giữ ở: {tep}.bak')
PY

echo
echo "Việc còn lại: KHỞI ĐỘNG LẠI Claude Code (thoát rồi mở lại) — nó chỉ đọc"
echo "tệp cấu hình lúc khởi động, sửa xong mà không mở lại thì không thấy cổng."
