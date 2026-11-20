# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## Dự án: Webapp Mô phỏng Hình học Trực quan 2D & 3D (GeoSim)

---

### 1. TỔNG QUAN DỰ ÁN

#### 1.1. Mục tiêu
Xây dựng một ứng dụng web (Webapp) hoạt động mượt mà trên trình duyệt, đóng vai trò là công cụ học tập trực quan hỗ trợ học sinh phổ thông (THCS & THPT) khám phá hình học phẳng (2D) và hình học không gian (3D). Người dùng có thể dễ dàng khởi tạo, thao tác kéo thả và quan sát các hiện tượng giao tuyến, thiết diện theo thời gian thực.

#### 1.2. Đối tượng sử dụng
*   **Học sinh (Cấp 2, Cấp 3):** Tự học, trực quan hóa các bài toán hình học không gian khó tưởng tượng (tìm giao tuyến của hai mặt phẳng, thiết diện của hình chóp/hình trụ cắt bởi mặt phẳng...).
*   **Giáo viên:** Sử dụng làm giáo cụ trực quan sinh động trên lớp học.

---

### 2. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

#### 2.1. Khởi tạo đối tượng hình học (Creation)
Hệ thống cung cấp thanh công cụ trực quan cho phép tạo đối tượng bằng 1-2 cú nhấp chuột:
*   **Chế độ 2D (Hình học phẳng):**
    *   *Cơ bản:* Điểm ($A, B, C...$), Đoạn thẳng, Đường thẳng, Tia, Góc, Đường tròn.
    *   *Đa giác:* Tam giác (thường, vuông, cân, đều), Hình vuông, Hình chữ nhật, Hình thang (thường, vuông, cân), Hình bình hành, Hình thoi, Đa giác tùy ý.
*   **Chế độ 3D (Hình học không gian):**
    *   *Cơ bản:* Điểm trong không gian, Đường thẳng, Mặt phẳng vô hạn (hiển thị dạng lưới giới hạn).
    *   *Khối đa diện:* Hình chóp (tam giác, tứ giác đều...), Hình lăng trụ đứng/xiên, Hình hộp chữ nhật, Hình lập phương, Tứ diện đều.
    *   *Khối tròn xoay:* Hình trụ, Hình nón, Hình cầu.
*   **Tùy chỉnh nhanh khi tạo:** Nhập kích thước cụ thể (độ dài cạnh, bán kính, chiều cao) hoặc kéo chuột trực tiếp trên không gian làm việc để định kích thước.

#### 2.2. Quản lý & Xóa đối tượng (Management & Deletion)
*   **Chọn đối tượng:** Click chuột trái vào đối tượng (đối tượng được chọn sẽ phát sáng viền hoặc đổi màu nhẹ). Hỗ trợ giữ `Shift` + Click để chọn nhiều đối tượng cùng lúc.
*   **Xóa đối tượng:**
    *   Chọn đối tượng và nhấn phím `Delete` hoặc `Backspace` trên bàn phím.
    *   Click vào biểu tượng "Thùng rác" trên thanh công cụ nổi cạnh đối tượng.
    *   **Danh sách quản lý (Layer/Object Tree):** Một bảng điều khiển bên cạnh liệt kê tất cả các hình đang có trên màn hình, cho phép ẩn/hiện (icon con mắt) hoặc xóa từng hình riêng lẻ, hoặc nút "Xóa tất cả" (Clear Canvas).
*   **Hoàn tác / Làm lại (Undo / Redo):** Hỗ trợ `Ctrl + Z` và `Ctrl + Y` để khôi phục thao tác lỡ xóa nhầm.

#### 2.3. Thao tác Kéo thả & Biến đổi (Manipulation)
*   **Kéo thả (Drag & Drop):**
    *   Trong 2D: Kéo thả tự do theo trục $Ox, Oy$.
    *   Trong 3D: Khi chọn một hình, hiển thị hệ trục tọa độ cục bộ (Gizmo 3 mũi tên X, Y, Z) giúp học sinh kéo tịnh tiến hình theo đúng phương mong muốn trong không gian 3 chiều mà không bị lệch góc nhìn.
*   **Thay đổi hình dáng/kích thước:** Kéo các điểm nút (đỉnh của đa giác, tâm/bán kính đường tròn) để thay đổi kích thước theo thời gian thực.
*   **Xoay (Rotate):** Xoay mặt phẳng hoặc khối 3D theo các góc nghiêng khác nhau để tạo các góc cắt đa dạng.
*   **Điều khiển góc nhìn (Camera):** Cuộn chuột để Zoom (phóng to/thu nhỏ), giữ chuột phải (hoặc chuột giữa) để xoay góc nhìn 360 độ quanh không gian 3D.

#### 2.4. Tính toán & Hiển thị Giao tuyến / Thiết diện Thời gian thực (Real-time Intersection) - *Tính năng cốt lõi*
Khi người dùng kéo một hình di chuyển xuyên qua hoặc chạm vào một hình khác, hệ thống tự động tính toán bằng thuật toán hình học giải tích / CSG (Constructive Solid Geometry) và hiển thị ngay lập tức:
*   **Trong 2D:**
    *   Đường thẳng cắt đường thẳng/đa giác/đường tròn $\rightarrow$ Hiển thị **Giao điểm** (chấm đỏ nổi bật kèm tọa độ nếu cần).
    *   Hai đa giác chồng lên nhau $\rightarrow$ Tô màu nổi bật **Phần diện tích giao nhau**.
*   **Trong 3D:**
    *   Đường thẳng cắt mặt phẳng/khối 3D $\rightarrow$ Hiển thị **Giao điểm** xuyên qua.
    *   Mặt phẳng cắt mặt phẳng $\rightarrow$ Hiển thị **Đường thẳng giao tuyến** (nét đứt ở phần bị khuất, nét liền ở phần nhìn thấy).
    *   Mặt phẳng cắt khối 3D (ví dụ: mặt phẳng cắt hình chóp, hình trụ, hình lập phương) $\rightarrow$ Tự động vẽ và tô màu nổi bật **Mặt cắt (Thiết diện)** ngay trên bề mặt khối. Khi học sinh kéo mặt phẳng lên/xuống hoặc nghiêng đi, hình dạng thiết diện (tam giác, hình thang, lục giác, elip...) biến đổi mượt mà theo thời gian thực.

---

### 3. GIAO DIỆN NGƯỜI DÙNG (UI/UX DESIGN)

Giao diện được thiết kế theo phong cách tối giản, hiện đại, tập trung tối đa diện tích cho vùng vẽ (Canvas):

1.  **Thanh công cụ trên cùng (Top Bar):**
    *   Nút chuyển đổi nhanh giữa không gian **2D** và **3D**.
    *   Các nhóm công cụ tạo hình (Điểm/Đường, Hình phẳng 2D, Hình khối 3D).
    *   Nút Undo, Redo, Xóa tất cả, Xuất ảnh màn hình (Export PNG).
2.  **Vùng làm việc chính (Main Canvas - 80% màn hình):**
    *   Nền sáng hoặc tối dịu mắt, có hệ lưới tọa độ (Grid) và trục tọa độ $Oxyz$ (có thể bật/tắt).
    *   Hiệu ứng đổ bóng và độ trong suốt (Opacity ~ 60-70%) cho các khối 3D để học sinh nhìn xuyên thấu được các nét khuất bên trong và phần giao tuyến.
3.  **Bảng quản lý đối tượng (Right Sidebar - 20% màn hình):**
    *   Danh sách các đối tượng đang hiển thị (kèm nút Ẩn/Hiện, Xóa).
    *   Bảng thuộc tính nhanh của đối tượng đang chọn: Đổi màu sắc, điều chỉnh độ trong suốt, bật/tắt hiển thị tên đỉnh ($A, B, C, S...$), bật/tắt chế độ tự động tính giao tuyến.

---

### 4. KIẾN TRÚC CÔNG NGHỆ ĐỀ XUẤT (TECH STACK)

Để đảm bảo hiệu năng tính toán giao tuyến 3D theo thời gian thực (60 FPS) mà không cần cài đặt phần mềm nặng:

*   **Frontend Framework:** React.js hoặc Vue.js (quản lý trạng thái UI và danh sách đối tượng).
*   **Đồ họa 3D & 2D WebGL:** **Three.js** (kết hợp `@react-three/fiber` nếu dùng React) - Thư viện mạnh mẽ nhất hiện nay để dựng hình 3D trên trình duyệt, hỗ trợ sẵn hệ trục Gizmo (`TransformControls`) và điều khiển góc nhìn (`OrbitControls`).
*   **Thư viện tính toán Hình học & Giao tuyến (CSG):**
    *   `three-bvh-csg` hoặc `manifold-3d`: Các thư viện chuyên dụng để tính toán phép giao (Intersection) giữa các lưới đa giác 3D với tốc độ cực nhanh, đảm bảo kéo thả mượt mà không giật lag.
    *   `mathjs`: Hỗ trợ các phép tính giải tích vector, phương trình mặt phẳng, đường thẳng.
*   **Styling:** Tailwind CSS (xây dựng giao diện thanh công cụ gọn nhẹ, responsive).

---

### 5. KỊCH BẢN SỬ DỤNG MẪU (USER FLOW)

**Bài toán: Tìm thiết diện của hình chóp tứ giác đều khi cắt bởi một mặt phẳng.**
1. Học sinh mở webapp, chọn chế độ **3D**.
2. Click chọn công cụ **Hình chóp tứ giác** $\rightarrow$ Khối chóp $S.ABCD$ xuất hiện tại tâm tọa độ với các mặt bán trong suốt.
3. Học sinh click chọn công cụ **Mặt phẳng** $\rightarrow$ Một mặt phẳng $(P)$ xuất hiện.
4. Học sinh dùng chuột kéo các mũi tên điều hướng (Gizmo) để di chuyển mặt phẳng $(P)$ cắt ngang qua hình chóp, và xoay nghiêng mặt phẳng một góc tùy ý.
5. **Kết quả:** Ngay khi mặt phẳng chạm vào hình chóp, một đa giác màu đỏ rực (thiết diện) tự động hiện lên trên các mặt của hình chóp. Học sinh tiếp tục kéo mặt phẳng lên gần đỉnh $S$, hình dạng thiết diện tự động thu nhỏ lại theo thời gian thực.
6. Học sinh click vào mặt phẳng $(P)$ trên danh sách bên phải và nhấn icon **Thùng rác** để xóa mặt phẳng, giữ lại hình chóp cho bài thực hành tiếp theo.