# Tiền công chăm thỏ

Trang theo dõi việc hằng ngày, mỗi việc 10.000đ. Bé chụp ảnh nộp, mụ phù thủy nghiệm thu bằng PIN, tiền tính theo tháng. Dữ liệu lưu trong Google Sheet.

## Hai trang, hai địa chỉ

| Trang | Địa chỉ | Dùng cho |
| --- | --- | --- |
| `index.html` | `/tho/` | Bé tick việc bằng cách chụp ảnh, xem tiền. Không chứa mã PIN hay giao diện nghiệm thu |
| `duyet/index.html` | `/tho/duyet/` | Mụ phù thủy nhập PIN, xem ảnh, duyệt, trả tiền theo tháng, đổi PIN |

Trang của bé không có liên kết nào tới trang nghiệm thu, nên chỉ gửi địa chỉ `/tho/duyet/` cho người cần dùng. Trang đặt `noindex` để công cụ tìm kiếm không liệt kê. Địa chỉ không phải là bí mật tuyệt đối, vì mọi thao tác duyệt và trả tiền đều được máy chủ kiểm tra PIN.

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `css/style.css` | Giao diện, màu sắc, chế độ sáng/tối, dùng chung cho hai trang |
| `js/config.js` | Cấu hình: `apiUrl` của Apps Script. Đổi Sheet thì chỉ sửa file này |
| `js/core.js` | Dùng chung: dữ liệu, kết nối Google Sheet, tính tiền theo ngày và tháng, ảnh |
| `js/kid.js` | Chỉ trang của bé: vẽ danh sách việc, nộp ảnh |
| `js/duyet.js` | Chỉ trang nghiệm thu: PIN, hàng đợi duyệt, trả tiền |
| `apps-script/Code.gs` | Máy chủ chạy trong Google Sheet. Không được GitHub Pages dùng, chỉ lưu ở đây để quản lý phiên bản |

## Side quest: điểm 10 đổi thưởng

Bé nộp ảnh bài kiểm tra được điểm 10 để đổi thưởng, qua cùng quy trình nghiệm thu với việc hằng ngày.

| Cấp | Bài | Thưởng |
| --- | --- | --- |
| `q15` | Kiểm tra 15 phút | 5.000đ |
| `q45` | Kiểm tra 1 tiết | 10.000đ |
| `qhk` | Thi học kì | 20.000đ |

- Mỗi lần được điểm 10 là một lần nộp riêng. Nộp nhiều bài cùng cấp trong một ngày thì mã thành `q15`, `q15-2`, `q15-3`...
- Trang của bé có ghi chú: ảnh phải thể hiện rõ ngày tháng để kiểm tra. Trang nghiệm thu nhắc người duyệt đối chiếu ngày tháng trên bài với giờ nộp.
- Side quest không tính vào "x/4 việc" của ngày, nhưng tiền được cộng vào tháng như việc thường.
- Đổi tiền thưởng hoặc tên cấp: sửa `QUESTS` trong `js/core.js` và `QUESTS` trong `apps-script/Code.gs` (hai nơi phải giống nhau), rồi triển khai lại script.

## Sửa thường gặp

- **Sau mỗi lần sửa CSS hoặc JS:** đổi số trong `?v=3` ở các thẻ `<link>` và `<script>` của `index.html` và `duyet/index.html` (ví dụ thành `?v=4`). Nếu không, trình duyệt có thể giữ bản cũ vài phút đến vài giờ và trang bị lỗi vì HTML mới chạy với JS cũ.

- **Đổi giá mỗi việc:** sửa `RATE` trong `js/core.js` và `RATE` ở đầu `apps-script/Code.gs`, rồi triển khai lại script.
- **Thêm hoặc đổi việc:** sửa danh sách `TASKS` trong `js/core.js` và `TASKS` ở `apps-script/Code.gs` (hai nơi phải giống nhau).
- **Đổi màu:** sửa các biến ở đầu `css/style.css`.
- **Chữ:** trang chỉ dùng 2 font (Fredoka cho tiêu đề và số, Be Vietnam Pro cho nội dung) và 3 cỡ chữ: `--fs-s` 13px, `--fs-m` 16px, `--fs-l` 32px. Khi thêm phần tử mới, chỉ dùng 3 biến này, đừng ghi số px trực tiếp.

## Cập nhật máy chủ Apps Script

Sau khi sửa `apps-script/Code.gs`, dán lại vào Apps Script rồi chọn Triển khai, Quản lý triển khai, Chỉnh sửa, Phiên bản mới. URL `/exec` giữ nguyên.
