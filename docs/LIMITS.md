# Batasan MUSUH (dinyatakan terbuka)

1. **Jaringan latihan adalah model.** Host, layanan dan akun disimulasikan di dalam program dan memancarkan telemetri berformat asli (Sysmon, Windows Security, System, PowerShell, Zeek). Tidak ada mesin virtual atau serangan sungguhan.
2. **Skenario rekaan berbasis insiden nyata.** Nama host, akun, alamat IP dan genset rekaan. Alamat luar memakai rentang dokumentasi RFC 5737. Urutan dan teknik diambil dari sumber publik yang disitir (lihat `SOURCES.md`).
3. **Titik masuk ransomware tidak dipublikasikan BSSN.** Skenario 2 dimulai dari akun admin yang sudah dicuri, dan ini dinyatakan di skenario.
4. **Aturan deteksi disederhanakan.** S01 sampai S20 meniru inti seleksi aturan SigmaHQ (commit c68bb91) dan menyebut bagian yang ditinggalkan. M01 sampai M03 aturan MUSUH sendiri karena SigmaHQ tidak punya aturan Modbus.
5. **Tiga celah deteksi disengaja**: dua kanal kendali HTTPS terenkripsi pada skenario ransomware dan keylogger dalam proses pada skenario listrik. Peserta harus menemukannya dari log atau tanda berikutnya.
6. **Bobot nilai 25/40/25/10 adalah usulan perancang**, bukan standar TNI. GO/NO-GO mengikuti kosakata EXCON Keris Woomera 2026.
7. **Rapor membuktikan konsistensi, bukan identitas.** Verifikasi menunjukkan nilai cocok dengan rekaman tindakan pada versi mesin yang sama. Siapa yang duduk di depan konsol dibuktikan oleh tanda tangan pelatih.
8. **Pikiran MUSUH** di purwarupa ditulis per rute dan memparafrasekan catatan sumbernya. Model bahasa lokal (rencana) hanya menulis narasi; tidak memutuskan langkah atau nilai.
9. **Satu latihan per laptop.** Tidak ada multi-pemain, akun pengguna, atau basis data.
10. **Belum diuji oleh personel TNI AD.** Kesesuaian dengan kebutuhan satuan perlu dibuktikan lewat uji coba.
11. **Belum diuji**: pembaca layar, proyektor fisik di ruang final, Windows 7/8, peramban selain Chrome/Edge.
