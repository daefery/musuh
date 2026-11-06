# Video demo MUSUH

Video 2 menit 21 detik, 1920×1080, dengan suara narasi Bahasa Indonesia dan subtitle yang ditanam. Semua gambar aplikasi diambil dari program MUSUH sungguhan; tidak ada layar tiruan.

| Langkah | Perintah | Hasil |
|---|---|---|
| 1. Ambil gambar | `node video/capture.mjs` | `out/shots/*.png` (3840×2160) dan posisi setiap elemen yang disorot |
| 2. Narasi | `python video/tts.py` | `out/vo/*.wav`, satu berkas per kalimat, dengan waktu tiap kata |
| 3. Susun video | `node video/render.mjs` | `out/MUSUH-demo.mp4` dan `out/MUSUH-demo.srt` |

- `narration.json`: naskah per adegan dan cara baca istilah (misalnya "EXCON" dibaca "ekskon"). Subtitle memakai tulisan aslinya.
- `plan.mjs`: apa yang disorot kamera pada setiap kalimat (perbesar, lingkaran, keterangan, klik).
- `stage.html` / `stage.js`: menggambar satu bingkai pada waktu t; `render.mjs` merekam bingkai demi bingkai.
- Suara: Microsoft Edge neural voice `id-ID-ArdiNeural` lewat paket `edge-tts` (butuh internet saat membuat narasi). Untuk memakai suara sendiri: rekam setiap kalimat sebagai `out/vo/<adegan>-<n>.wav`, lalu jalankan langkah 3.
- Kebutuhan: Node 20+, Chrome, ffmpeg, Python 3 dengan `pip install edge-tts`.
