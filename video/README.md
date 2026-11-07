# Video demo MUSUH

Video 2 menit 33 detik, 1920×1080: suara narasi berbahasa Inggris, subtitle berbahasa Indonesia yang ditanam (juga `.srt`). Semua gambar aplikasi diambil dari program MUSUH sungguhan; tidak ada layar tiruan.

| Langkah | Perintah | Hasil |
|---|---|---|
| 1. Ambil gambar | `node video/capture.mjs` | `out/shots/*.png` (3840×2160) dan posisi setiap elemen yang disorot |
| 2. Narasi | `python video/tts.py` | `out/vo/*.wav`, satu berkas per kalimat; waktu tiap kata (faster-whisper) agar sorotan kamera jatuh tepat pada kata yang diucapkan |
| 3. Susun video | `node video/render.mjs` | `out/MUSUH-demo.mp4` dan `out/MUSUH-demo.srt` |

- `narration.json`: per kalimat, `en` (diucapkan) dan `id` (subtitle), plus cara baca istilah untuk suara.
- `plan.mjs`: apa yang disorot kamera pada setiap kalimat (perbesar, lingkaran, keterangan, klik).
- `stage.html` / `stage.js`: menggambar satu bingkai pada waktu t; `render.mjs` merekam bingkai demi bingkai.
- Suara: Kokoro TTS (model terbuka, Apache 2.0), suara `af_heart`, berjalan di laptop tanpa internet. Berkas model `kokoro-v1.0.onnx` dan `voices-v1.0.bin` (github.com/thewh1teagle/kokoro-onnx, rilis model-files-v1.0) diletakkan di `video/models/`. Untuk memakai suara sendiri: rekam setiap kalimat sebagai `out/vo/<adegan>-<n>.wav`, lalu jalankan langkah 3.
- Kebutuhan: Node 20+, Chrome, ffmpeg, Python 3 dengan `pip install kokoro-onnx soundfile faster-whisper`.
