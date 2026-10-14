# Tiền công chăm thỏ

Trang theo dõi việc hằng ngày, mỗi việc 10.000đ. Bé chụp ảnh nộp, mụ phù thủy nghiệm thu bằng PIN, tiền tính theo tháng. Dữ liệu lưu trong Google Sheet.

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `index.html` | Khung trang, không chứa logic |
| `css/style.css` | Giao diện, màu sắc, chế độ sáng/tối |
| `js/config.js` | Cấu hình: `apiUrl` của Apps Script. Đổi Sheet thì chỉ sửa file này |
| `js/app.js` | Toàn bộ logic: gọi API, vẽ trang, PIN, nghiệm thu, tiền theo tháng |
| `apps-script/Code.gs` | Máy chủ chạy trong Google Sheet. Không được GitHub Pages dùng, chỉ lưu ở đây để quản lý phiên bản |

## Sửa thường gặp

- **Đổi giá mỗi việc:** sửa `RATE` ở đầu `js/app.js` và `RATE` ở đầu `apps-script/Code.gs`, rồi triển khai lại script.
- **Thêm hoặc đổi việc:** sửa danh sách `TASKS` ở `js/app.js` và `TASKS` ở `apps-script/Code.gs` (hai nơi phải giống nhau).
- **Đổi màu:** sửa các biến ở đầu `css/style.css`.

## Cập nhật máy chủ Apps Script

Sau khi sửa `apps-script/Code.gs`, dán lại vào Apps Script rồi chọn Triển khai, Quản lý triển khai, Chỉnh sửa, Phiên bản mới. URL `/exec` giữ nguyên.
