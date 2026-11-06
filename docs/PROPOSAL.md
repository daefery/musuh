# MUSUH: lawan tanding siber untuk satuan TNI AD

**Kartika Cyber Hackathon 2026 · Kategori 03 Dukungan Teknologi**
Penyusun: Fery · Versi 0.4 · November 2026

## Ringkasan
MUSUH (Mesin Uji Serangan dan Ketahanan) adalah konsol latihan siber yang berjalan di satu laptop tanpa internet. Komputer berperan sebagai pasukan lawan: menyerang jaringan latihan, dan bila satu jalan diblokir, mencari jalan lain. Prajurit bertahan dari konsol, lalu mendapat nilai GO/NO-GO dan Rapor Prestasi Siber yang bisa diperiksa ulang oleh siapa pun dengan memutar ulang latihannya.

Tujuannya satu: latihan merah lawan biru seperti Keris Woomera bisa diulang di setiap satuan, kapan saja, tanpa menunggu tim penyerang dan tim penilai.

## 1. Masalah
- Latihan siber TNI berbentuk tim merah lawan tim biru yang dinilai tim EXCON dengan standar GO/NO-GO. Contoh: Keris Woomera 2026, 16 Oktober 2026 di Puslatpur 5 Baluran (Puspen TNI, korem072.tni-ad.mil.id).
- Format itu membutuhkan penyerang terlatih dan penilai. Karena itu latihan semacam ini terjadi dalam acara besar (Keris Woomera, CYBEREX Super Garuda Shield, turnamen WMS). Frekuensi latihan di tingkat satuan tidak kami ketahui; ini asumsi yang perlu dikonfirmasi.
- Pussiberad sudah membawa pelatihan ke daerah lewat MTT Siber (contoh: Sansidam V/Brawijaya, 27 sampai 30 April 2026, wartapos.id). Usulan kami: tim pelatih meninggalkan MUSUH di satuan agar latihan berlanjut setelah tim pulang.
- Arahan Presiden pada HUT ke-81 TNI (5 Oktober 2026): "belajar, belajar, belajar, dan berlatih, berlatih, berlatih" serta "sistem prestasi, bukan sistem sekadar senioritas" (detik.com).

## 2. Solusi
| Peran | Yang dilakukan |
|---|---|
| Peserta | Bertahan dari konsol: membaca peringatan dan log, mengisolasi host, memblokir alamat, mereset akun, memblokir perintah Modbus, menyatakan insiden |
| MUSUH | Menyerang jaringan latihan menurut graf serangan. Bila jalannya tertutup, memilih rute lain. Keputusan dibuat perencana deterministik, bukan model bahasa |
| Pelatih | Memberi kode latihan, memantau, membuka tampilan pelatih bila perlu (tercatat), menandatangani rapor |

Alur: SIAPKAN, OPERASI, EVALUASI, RAPOR.

## 3. Yang baru
1. **Musuh yang beradaptasi tetapi adil.** Kode latihan yang sama dan tindakan yang sama selalu menghasilkan musuh yang sama. Dua prajurit bisa dibandingkan. Penyerang berbasis model bahasa tidak bisa memberi jaminan ini karena keluarannya berubah antarputaran.
2. **Nilai yang bisa diperiksa ulang.** Rapor menyimpan kode, tindakan, dan sidik SHA-256. Verifikasi memutar ulang seluruh latihan. Nilai yang diubah gagal, walaupun sidiknya dihitung ulang.
3. **Konten bersumber.** Tiga skenario rekaan berbasis insiden nyata: pola Red Team Keris Woomera 2026, kronologi BSSN atas ransomware PDNS 2 (Juni 2024), serangan jaringan listrik Ukraina 2015 dan FrostyGoop 2024. Setiap langkah serangan menyitir halaman MITRE ATT&CK-nya. Aturan deteksi meniru aturan SigmaHQ yang nyata dan menautkannya.
4. **IT dan OT.** Skenario pasokan listrik markas berakhir dengan perintah Modbus yang mematikan genset; pemulihan hanya berhasil setelah perintah tulis diblokir.
5. **Satu berkas program, tanpa internet.** `musuh.exe` untuk Windows dan `musuh` untuk Linux. Tidak perlu instalasi, server, atau lisensi.

## 4. Kesesuaian dengan kriteria penilaian
| Bobot | Kriteria | Jawaban MUSUH |
|---|---|---|
| 25% | Relevansi dan Manfaat | Meniru format latihan TNI sendiri (red vs blue, GO/NO-GO). Skenario mencakup IT dan OT |
| 25% | Inovasi Teknis | Musuh adaptif yang deterministik dan rapor yang diverifikasi dengan putar ulang (bagian 3) |
| 25% | Fungsionalitas Purwarupa | Program Rust berjalan penuh tanpa internet; 14 uji mesin dan 72 uji alur di peramban lulus di 1366×768, 1440×900 dan 1920×1080; diuji di Windows sungguhan |
| 15% | Kelayakan Implementasi | Satu laptop yang sudah dimiliki satuan; rapor tersimpan sebagai berkas; skenario berupa data yang bisa ditambah |
| 10% | Kualitas Dokumentasi | Proposal, arsitektur, panduan operasi, sumber, batasan, naskah demo |

## 5. Implementasi
- Mesin: Rust, tanpa IO dan tanpa jam dinding, sehingga hasil sama di setiap mesin. Diuji setara baris demi baris dengan purwarupa sebelumnya.
- Konsol: peramban lokal di `127.0.0.1`, warna TNI (hijau zaitun dan emas). Setiap tahap tampil sebagai gambar: peta jaringan, garis waktu MUSUH lawan peserta, rantai serangan, skor bergambar, dan alur verifikasi. Bentuk simbol status mengikuti Astro UXDS (berlisensi; tidak ada dukungan resmi pemerintah AS).
- Tidak ada lalu lintas keluar. Permintaan dari situs lain ditolak.

## 6. Rencana lanjutan (usulan)
| Tahap | Isi | Ukuran keberhasilan |
|---|---|---|
| Uji coba | Satu satuan, satu laptop, satu minggu, satu kode latihan | Pelatih menilai skor MUSUH setara dengan penilaian EXCON manusia [perlu dikonfirmasi lewat uji] |
| Pustaka skenario | Pussiberad menyusun dan membagikan skenario dan kode latihan | Jumlah skenario yang dipakai satuan |
| Peta kelemahan | Rapor terverifikasi dari banyak satuan dikumpulkan per teknik serangan | Teknik yang paling sering lolos menjadi prioritas pelatihan |

## 7. Batasan
Lihat `LIMITS.md`. Ringkasnya: jaringan latihan adalah model yang memancarkan telemetri berformat asli, bukan mesin sungguhan; skenario rekaan; bobot nilai adalah usulan perancang; rapor membuktikan konsistensi nilai dengan rekaman tindakan, bukan identitas peserta.
