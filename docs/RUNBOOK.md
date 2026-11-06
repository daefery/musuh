# Panduan operasi MUSUH

Untuk pelatih dan peserta. Tidak perlu internet, akun, atau instalasi.

## Menjalankan
1. Salin `musuh.exe` (Windows) atau `musuh` (Linux) ke sebuah folder, misalnya `C:\MUSUH`.
2. Klik dua kali `musuh.exe`. Jendela hitam muncul dan peramban terbuka ke `http://127.0.0.1:8090/`.
3. Bila port dipakai program lain: jalankan dari Command Prompt `musuh.exe --port 9000`.
5. Bila Windows menampilkan "Windows protected your PC": klik More info, lalu Run anyway. Program belum ditandatangani sertifikat digital; program tidak memakai internet.
4. Untuk berhenti: tutup jendela hitam atau tekan Ctrl+C.

Rapor tersimpan di folder `rapor\` di samping tempat program dijalankan.

## Pelatih: menyiapkan latihan
1. Tentukan kode latihan, misalnya `MSH-7Q2K`. Semua peserta dengan kode yang sama menghadapi musuh yang sama.
2. Pilih mode:
   - **Latih**: saran tindakan tampil, boleh jeda (Spasi) dan ubah kecepatan. Untuk belajar.
   - **Uji**: tanpa saran, tanpa jeda, kecepatan dikunci 4×. Untuk rapor yang dibandingkan.
3. Tampilan pelatih (ikon mata) menampilkan pikiran dan jejak MUSUH. Pembukaannya tercatat di rapor.

## Peserta: bertahan
| Tombol | Fungsi |
|---|---|
| ↑ ↓ | Pilih peringatan. Peringatan baru tidak mengubah pilihan Anda |
| 1 sampai 4 | Tindakan pada peringatan terpilih (mode Latih) |
| N | Nyatakan insiden |
| Enter / Esc | Jalankan / batalkan tindakan yang ditampilkan |
| ? | Bantuan |

Setiap tindakan menampilkan kata kerja dan sasarannya dulu. Di panel Detail tersedia: isolasi aset, blokir alamat luar yang teramati, reset akun yang teramati, dan untuk pengendali genset: blokir tulis Modbus lalu nyalakan genset.

**Serahkan konsol** bila selesai bertindak. Sisa waktu tetap dijalankan sampai skenario selesai agar semua sasaran benar-benar diuji, lalu rapor terbit. **Batalkan** (mode Latih) mengakhiri tanpa rapor.

## Memeriksa rapor
- Di konsol: layar RAPOR, panel Verifikasi, pilih berkas, tekan Verifikasi.
- Di Command Prompt: `musuh.exe verify rapor\NAMA-BERKAS.json` (keluar 0 = SAH, 1 = TIDAK SAH).
- Arti SAH: nilai konsisten dengan rekaman tindakan. Identitas peserta dibuktikan oleh tanda tangan pelatih, bukan oleh berkas.

## Bila ada masalah
| Gejala | Tindakan |
|---|---|
| Bar merah TERPUTUS | Mesin berhenti. Jalankan lagi `musuh.exe`; konsol tersambung sendiri. Latihan yang sedang berjalan hilang bila program ditutup |
| Peramban tidak terbuka | Buka manual `http://127.0.0.1:8090/` |
| Layar proyektor terlalu kecil | Tombol layar di kanan atas: mode presentasi (perbesar) |
