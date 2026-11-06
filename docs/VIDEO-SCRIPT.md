# Naskah video presentasi (2 menit 22 detik)

Video tanpa suara dibuat otomatis: `node test/record.mjs` merekam program sungguhan, lalu `node test/video.mjs` menyusun `dist/video/MUSUH-demo.mp4`. Waktu tiap adegan dihitung dari panjang narasinya (sekitar 2,3 kata per detik). Fery membaca narasi sambil menonton video, lalu suara digabungkan.
Panjang video yang diizinkan panitia belum diumumkan. Bila narasi diubah, jalankan ulang `node test/video.mjs` agar waktunya ikut menyesuaikan.

| # | Detik | Layar | Narasi (Bahasa Indonesia) |
|---|---|---|---|
| 1 | 0:00-0:11 | Slide 1 (judul) | "Saya Fery. Ini MUSUH, Mesin Uji Serangan dan Ketahanan: lawan tanding siber untuk satuan TNI AD, di satu laptop, tanpa internet." |
| 2 | 0:11-0:26 | Slide 2 (masalah) | "Latihan siber seperti Keris Woomera 2026 membutuhkan tim merah, tim biru, dan EXCON yang menilai GO atau NO-GO. Karena butuh tiga tim, latihan seperti ini terikat pada acara besar." |
| 3 | 0:26-0:44 | Rekaman: SIAPKAN | "MUSUH menggantikan tim merah dan EXCON. Pelatih memilih skenario dan kode latihan. Skenarionya rekaan, tetapi setiap langkah musuh bersumber dari insiden publik: pola Red Team Keris Woomera, kronologi BSSN atas PDNS 2, dan serangan jaringan listrik Ukraina." |
| 4 | 0:44-1:00 | Rekaman: OPERASI, peringatan pertama | "Peserta hanya melihat apa yang dilihat petugas siber sungguhan: peta jaringan, peringatan dari aturan deteksi, dan log. Saya memilih peringatan, lalu memblokir alamat proksi musuh. Setiap tindakan menampilkan sasarannya dulu sebelum dijalankan." |
| 5 | 1:00-1:17 | Rekaman: tampilan pelatih, MUSUH beralih jalur | "Di layar pelatih terlihat pikiran MUSUH: jalurnya diputus, ia membuka terowongan cadangan. Musuh beradaptasi, tetapi adil: kode latihan yang sama dan tindakan yang sama selalu memberi musuh yang sama, jadi dua prajurit bisa dibandingkan." |
| 6 | 1:17-1:29 | Rekaman: blokir kedua, serahkan konsol | "Saya memblokir terowongan itu dan menyerahkan konsol. Sisa waktu tetap dijalankan sampai skenario selesai, sehingga tidak ada nilai GO karena berhenti lebih awal." |
| 7 | 1:29-1:45 | Rekaman: EVALUASI | "Evaluasi menampilkan nilai, sasaran GO atau NO-GO, rantai serangan musuh, dan garis waktu musuh lawan peserta. Setiap langkah musuh bisa dibuka untuk melihat sumbernya." |
| 8 | 1:45-2:02 | Rekaman: RAPOR, verifikasi SAH lalu berkas yang diubah | "Rapor Prestasi Siber bisa diperiksa ulang. Konsol tidak bisa mengubah nilai. Bila berkas rapor diubah di luar MUSUH, misalnya nilainya jadi 98, MUSUH memutar ulang latihan dan langsung menunjukkan nilai aslinya: rapor tidak sah." |
| 9 | 2:02-2:12 | Rekaman: skenario genset | "Skenario lain mencakup OT: musuh mematikan genset lewat Modbus, dan genset hanya bisa dinyalakan lagi setelah perintah tulis diblokir." |
| 10 | 2:12-2:22 | Slide 10 (penutup) | "MUSUH: satu program, tanpa internet, bisa dipakai di setiap satuan. Lawannya adil, nilainya bisa diperiksa ulang. Terima kasih." |

Catatan:
- Nama di rekaman: "Peserta Satu". Ganti bila ingin memakai nama sendiri (`NAMA=... node test/record.mjs`).
- Batasan dinyatakan terbuka di `LIMITS.md`; video tidak mengklaim MUSUH sudah dipakai TNI.

## Menggabungkan suara
1. Putar `MUSUH-demo.mp4` dan rekam suara Anda membaca narasi (misalnya dengan Voice Recorder Windows atau ponsel), simpan sebagai `suara.m4a`.
2. Gabungkan: `ffmpeg -i MUSUH-demo.mp4 -i suara.m4a -c:v copy -c:a aac -shortest MUSUH-video.mp4`
3. Cara lain: buka video di Clipchamp (bawaan Windows 11), tekan rekam suara, lalu ekspor 1080p.
