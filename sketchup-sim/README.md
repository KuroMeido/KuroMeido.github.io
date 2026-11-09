# SketchUp Sim

Trang tĩnh để kiểm tra file `.rb` do lệnh **CmdCadToSketchUp** (pyKuro CAD) xuất ra mà không cần cài SketchUp.

Địa chỉ: https://kuromeido.github.io/sketchup-sim/ (mở thẳng `index.html` từ ổ đĩa cũng chạy được, không cần mạng).

## Trang làm gì

1. Đọc script: thư viện `module PyKuroCad2Su` (so với chữ ký hàm chuẩn) và phần chính
   (`PyKuroCad2Su.layer(...)`, `PyKuroCad2Su.trees(...)`, begin / rescue / commit). Lệnh khác bị báo "chưa giả lập" và **không** chạy.
2. Giả lập theo quy tắc của SketchUp: `add_face` cần ≥ 3 điểm khác nhau, không thẳng hàng, không tự cắt; lỗ chỉ khoét khi
   nằm trong đường bao; `pushpull` chỉ khi cao > 0,5 mm; cây làm tròn bán kính 250 mm và dùng chung định nghĩa theo kích thước;
   vật liệu dùng chung theo tên tag. Lỗi kiểu dữ liệu trong `trees` hoặc ngoài `solid` làm dừng cả script (abort_operation).
3. Hiển thị: mô hình 3D (xoay / zoom / bấm chọn), bảng **CAD xuất / Dựng / Bỏ qua** theo tag kèm lớp CAD nguồn,
   cao độ và diện tích, Ruby Console giả lập (`pyKuro: done (N objects, M skipped)`), danh sách lỗi / cảnh báo theo dòng.

Đây là kết quả gần đúng; SketchUp thật vẫn là bước kiểm tra cuối cùng.

## File

| File | Nội dung |
|---|---|
| `index.html`, `style.css`, `viewer.js` | Giao diện và khung 3D |
| `rb-sim.js` | Bộ đọc Ruby + giả lập (chạy được cả trong Node để test) |
| `samples/` | `sample_quyhoach.rb` (khu quy hoạch mẫu: bó vỉa bo góc R8, lô đất vát góc 5 m), `sample_loi.rb` (các lỗi cố ý), `sample_nga4.rb` (ngã 4: mép đường bo góc, vỉa hè vát góc, ), `sample_thuc.rb` (bản vẽ `samples/sample.dxf`), ba file này do exporter thật sinh ra từ project test C#, `samples.js` |
| `make_sample.py` | Sinh lại file mẫu, lấy thư viện Ruby trực tiếp từ `SketchUpRubyWriter.cs` |
| `lib/` | three.js r147 (MIT) để trang chạy offline |

Sinh lại mẫu khi exporter thay đổi:

```
python sketchup-sim/make_sample.py <pyKuro_CAD_Command>/pyKuro_CAD_Command/Utils/Civil/CadToSketchUp/SketchUpRubyWriter.cs
```

`sample_nga4.rb` được sinh bằng exporter C# thật (đọc line hở + cung bo góc, khép đầu đường, dựng mặt đường và vỉa hè):

```
dotnet run --project <pyKuro_CAD_Command>/pyKuro_CAD_Command.Tests -- --write-rb sketchup-sim/samples/sample_nga4.rb \
    --write-planning-rb sketchup-sim/samples/sample_quyhoach.rb --write-real-rb sketchup-sim/samples/sample_thuc.rb
python sketchup-sim/make_sample.py <...>/SketchUpRubyWriter.cs
```

Mở mẫu trực tiếp: `?sample=ok`, `?sample=loi`, `?sample=nga4` hoặc `?sample=thuc`.
