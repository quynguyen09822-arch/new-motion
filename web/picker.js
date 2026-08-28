/**
 * DÒ XEM ĐANG BẤM VÀO MÓN NÀO.
 *
 * iframe nuốt hết sự kiện chuột của nó, nên trang cha phủ một lớp bắt sự kiện
 * lên trên rồi tự dò xuống bằng `elementFromPoint`. Làm được vì cùng origin, và
 * vì lớp bắt nằm chồng khít lên iframe nên toạ độ khớp 1-1, không phải quy đổi.
 *
 * Cách chọn: bấm lần đầu trúng món SÂU NHẤT — đúng cái mắt nhìn thấy. Bấm lại
 * vào món đang chọn thì ĐI LÊN cụm cha. Kiểu Figma, không cần phím phụ.
 *
 * Nền (`k-nen`) và vệt sáng (`k-sweep`) đã được bộ dựng đặt `pointer-events:none`
 * sẵn, nên không bao giờ bấm nhầm phải chúng. Muốn chọn hai thứ đó thì dùng
 * danh sách thành phần bên trái.
 */

export function taoDo(player) {
  return {
    /**
     * @param x,y toạ độ trong khung nhìn của iframe (trùng với lớp bắt)
     * @param dangChon món đang chọn, để biết có phải cú bấm thứ hai không
     */
    do(x, y, dangChon) {
      const d = player.tai();
      if (!d) return null;
      const trung = d.elementFromPoint(x, y);
      const mon = trung?.closest?.('.el');
      if (!mon) return null;

      const canhId = mon.dataset.scene;
      const monId = mon.dataset.el;

      // Bấm lại đúng món đang chọn → leo lên cụm cha. Hết cha thì quay vòng lại
      // chính nó, để bấm mãi không bị kẹt cứng.
      if (dangChon && dangChon.canhId === canhId && dangChon.monId === monId) {
        const cha = mon.parentElement?.closest?.('.el');
        if (cha?.dataset.el) return { canhId: cha.dataset.scene, monId: cha.dataset.el };
      }
      return { canhId, monId };
    },

    /** Món ngoài cùng chứa điểm này — dùng cho Alt+bấm. */
    doNgoaiCung(x, y) {
      const d = player.tai();
      const trung = d?.elementFromPoint(x, y);
      let mon = trung?.closest?.('.el');
      if (!mon) return null;
      let tren = mon.parentElement?.closest?.('.el');
      while (tren) { mon = tren; tren = mon.parentElement?.closest?.('.el'); }
      return { canhId: mon.dataset.scene, monId: mon.dataset.el };
    },
  };
}
