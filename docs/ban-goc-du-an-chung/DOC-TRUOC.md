# Bản gốc hai clip của dự án chung

Hai file này là **bản trước khi đổi sang bộ chữ tự chứa (19/09/2026)**, chép từ
dự án clip chung `clipVibehost/hosting-animatic-production`.

## Vì sao phải cất ở đây

Luật cứng trong `CLAUDE.md`: *"Dự án clip KHÔNG có git. Ghi đè sai một lần là
mất hẳn."*

Mười ba file còn lại của đợt sửa đó **có bản sinh đôi trong `clip/` của repo
này**, trùng khít tới từng byte, nên lấy lại được bằng git:

```bash
git show <commit-trước-19/09>:clip/scene-player.html > /đường/dẫn/dự-án-chung/scene-player.html
```

Riêng hai file `econtract-20s*` **chỉ có ở dự án chung**, không có bản sinh đôi.
Bản sao trong `.hub-video-backups/` thì **bị git bỏ qua** — mất máy là mất luôn.
Nên chép vào đây, nơi có git.

## Khôi phục

```bash
P=~/workspace/projects/clipVibehost/hosting-animatic-production
cp docs/ban-goc-du-an-chung/econtract-20s.html     $P/
cp docs/ban-goc-du-an-chung/econtract-20s-doc.html $P/
( cd docs/ban-goc-du-an-chung && sha256sum -c van-tay.txt )
```

Xem `docs/CHU-TU-CHUA.md` để biết đã đổi những gì.
