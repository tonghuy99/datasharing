# Aang vs Korra — phim 3D ngắn (HTML)

Mở `index.html` (một file tự chứa, ~730 KB, không cần mạng) rồi chạm **"Chạm để chiếu phim"**. Dài 84 giây.

## Võ thuật ứng với từng kiểu bending

| Nguyên tố | Môn võ gốc | Thể hiện trong phim |
|---|---|---|
| Khí | Bát Quái Chưởng (Baguazhang) | Aang bước vòng tròn, xoay người né cầu lửa, chưởng mở |
| Thủy | Thái Cực Quyền (Tai Chi) | Korra chuyển trọng tâm dẫn nước; Aang đón, xoay vòng, hóa băng |
| Thổ | Hồng Gia Quyền (Hung Gar) | Giậm chân, tấn mã bộ thấp, đấm thẳng phóng đá, dựng tường |
| Hỏa | Bắc Thiếu Lâm (Northern Shaolin) | Đấm tay dài, đá cao, phi cước, đấu luồng lửa |

Nguồn: [Wikipedia – World of Avatar](https://en.wikipedia.org/wiki/World_of_Avatar:_The_Last_Airbender),
[Martial Journal](https://www.martialjournal.com/the-martial-arts-in-avatar-the-last-airbender/),
[Combat Museum](https://combatmuseum.com/what-martial-arts-are-used-in-avatar-the-last-airbender/),
[Netflix Tudum](https://www.netflix.com/tudum/articles/what-is-bending-avatar-last-airbender).

## Mô hình 3D

Không tìm được mô hình Aang/Korra giấy phép mở (CC0/CC-BY) tải tự động được: các kết quả là hàng trả phí
hoặc "editorial only", còn Sketchfab cần đăng nhập. Vì vậy hai nhân vật là mô hình low-poly có khớp xương,
dựng thủ tục bằng [three.js](https://threejs.org) (MIT) ngay trong `src/film.js`.

## Âm thanh trên iPhone

Nhạc và hiệu ứng được tổng hợp trực tiếp bằng Web Audio (không có file âm thanh). `AudioContext` chỉ được tạo
trong sự kiện chạm nút bắt đầu; `navigator.audioSession.type = 'playback'` (iOS 16.4+) cùng một thẻ `<audio>`
im lặng lặp lại (iOS cũ hơn) giúp vẫn có tiếng khi gạt nút im lặng. Nếu iOS treo âm thanh, chạm màn hình để phát lại.

## Build

```
npm install && npm run build   # gộp three.js + src/film.js + src/template.html -> index.html
```

Phim fan-made phi thương mại; nhân vật thuộc bản quyền Nickelodeon / Viacom.
