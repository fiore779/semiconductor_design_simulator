# ノート PC 冷却クラス別 CPU MT 持続電力(2026-11-12 調査)

目的: 筐体の冷却クラス(薄型軽量 / 標準 / 薄型 dGPU / ゲーミング / 大型ゲーミング・モバイルWS)ごとに、「CPU が MT 持続負荷で維持できるパッケージ電力(W)」の分布を、出典付きの値だけで作る。調査のみで、コードは変更していない。

## 0. 方法とデータ区分

- データ源は **Notebookcheck(NBC)の英語版レビュー 79 本**(取得は 2026-11-12)。各ページの原 HTML を取得し、本文から該当する文をスクリプトで抜き出して読んだ。値はすべて原ページの文から取り、推測や補間はしていない。
- 区分は次の 3 つ。
  - **[実測]**: レビュー機で測った CPU パッケージ電力。Prime95 の CPU 単独負荷、Cinebench R15 ループ表の「TDP at end of run」、または「multi-core 負荷で X W に落ち着いた」という記述の持続値。
  - **[複合]**: CPU と GPU を同時に負荷(Prime95+FurMark)したときの CPU 側の電力。GPU に電力枠を取られるため、CPU 単独 MT より低く出る。参考値として別表にした。
  - **[設定]**: NBC のスペック欄にある「X W PL2 / Short Burst, Y W PL1 / Sustained」と、テスト条件表の電力モード別 PL1。これはレビュー機の実設定で、OEM の公称値ではない。ユーザー指定の「[公表]」に近いが別物として扱う。
- **OEM 公式の PL1 公称([公表])は今回集めていない。** Ultrabookreview / Hardware Unboxed / Gamers Nexus / Tom's Hardware も未調査で、後述の残課題に入れた。
- 範囲で書かれた値(例「66〜90 W を行き来」)は、統計には**下限**を使った。持続を保証できる側を採るという規則で、全件に同じように適用した。
- 統計には最大性能モード(Performance / Turbo / Custom 等)の値を使う。バランス等しか値がない機種は統計から外し、表にだけ載せた。
- 「原ページ確認」の列: ✓ は NBC 原ページの本文に該当の文があることを確認したもの。

### 筐体クラスの定義(実寸による客観ルール)
厚みと重量は各レビューのスペック欄の実測値を使う。

| クラス | 条件 |
|---|---|
| T1 薄型軽量 | dGPU なし、厚さ 17 mm 以下(タブレット型を含む) |
| T2 標準 | dGPU なし、厚さ 17 mm 超 |
| T3 薄型 dGPU(薄型ゲーミング/クリエイター) | dGPU あり、厚さ 21.5 mm 以下 |
| T4 ゲーミング標準 | dGPU あり、厚さ 21.5〜28.5 mm かつ 3.0 kg 未満 |
| T5a 大型ゲーミング | dGPU あり、厚さ 28.5 mm 以上または 3.0 kg 以上で、ゲーミング機 |
| T5b 厚型モバイルワークステーション | T5 の条件を満たすビジネス/WS 機(ZBook Fury、ThinkPad P16/T16g) |

---

## 1. 機種別データ(レビュー 79 本)

列: 機種 / CPU / 厚さ・重量 / モード / [実測] CPU 持続 W(負荷) / [設定] PL2/PL1 / 出典 / 原ページ確認

### T1 薄型軽量(iGPU、17 mm 以下)
| 機種 | CPU | 厚さ / 重量 | モード | [実測] 持続 W | [設定] PL2/PL1 | 出典 | 確認 |
|---|---|---|---|---|---|---|---|
| Asus Zenbook S 14 UX5406 | 258V | 13 mm / 1.18 kg | Standard | **17**(multi-core で 17 W に収束。複合負荷も 17) | 37/17(Full speed 37/28) | [NBC](https://www.notebookcheck.net/Asus-Zenbook-S-14-UX5406-laptop-review-Excellent-everyday-laptop-with-Intel-Lunar-Lake.892978.0.html) | ✓ |
| Lenovo ThinkPad X1 Carbon Gen 13 | 258V | 16 mm / 0.98 kg | Best performance | **20〜25**(持続ベンチで 20〜25 W を波状に推移) | 37/20 | [NBC](https://www.notebookcheck.net/Lenovo-ThinkPad-X1-Carbon-Gen-13-Aura-Edition-laptop-review-The-X1-Carbon-is-finally-back.924998.0.html) | ✓ |
| Asus Zenbook S 16 UM5606 | HX 370 | 12.9 mm / 1.52 kg | Performance | (CPU 単体の値なし) | 33/28 | [NBC](https://www.notebookcheck.net/Asus-Zenbook-S-16-laptop-review-The-first-Copilot-laptop-with-AMD-Zen-5-inside-a-1-3-cm-thick-case.868219.0.html) | ✓ |
| Framework Laptop 13.5 | HX 370 | 15.85 mm / 1.34 kg | Performance | **33**(Prime95: 46 → 33 W) | 46/28 | [NBC](https://www.notebookcheck.net/Framework-Laptop-13-5-Ryzen-AI-9-review-Skip-the-Intel-version-for-better-performance.997363.0.html) | ✓ |
| HP OmniBook Ultra 14 | X9 388H | 10.7 mm / 1.28 kg | Performance | **26**(Prime95: 43 → 26 W) | 43/26 | [NBC](https://www.notebookcheck.net/HP-OmniBook-Ultra-14-Core-Ultra-X9-review-Fully-redesigned-and-so-much-better-than-before.1317970.0.html) | ✓ |
| Huawei MateBook X Pro 2024 | 185H | 13.5 mm / 0.98 kg | Performance | [複合] 40(80 → 40 W)。Balanced の複合は 25 | 80/45(Balanced 36) | [NBC](https://www.notebookcheck.net/Huawei-MateBook-X-Pro-2024-laptop-review-The-980-gram-magnesium-ultrabook-with-an-impressive-OLED-panel.844630.0.html) | ✓ |
| MSI Prestige 13 AI+ A3MG | 386H | 15.9 mm | — | (値なし) | 34/24 | [NBC](https://www.notebookcheck.net/MSI-Prestige-13-AI-laptop-review-The-perfect-companion-for-on-the-go.1318523.0.html) | ✓ |
| Asus ZenBook S14 UX5406AA (2026) | 386H | 12.9 mm / 1.21 kg | — | **28**(ストレス: 57 → 28 W) | 57/28 | [NBC](https://www.notebookcheck.net/Asus-ZenBook-S14-2026-Laptop-Review-Brighter-OLED-but-a-slow-Panther-Lake-iGPU.1342874.0.html) | ✓ |
| Lenovo Yoga Slim 9 14 Gen 10 | 258V | 14.55 mm / 1.24 kg | — | **39**(Prime95 で 39 W、目立った低下なし) | 40/35 | [NBC](https://www.notebookcheck.net/Lenovo-Yoga-Slim-9-14-Gen-10-review-First-laptop-with-a-32-MP-under-display-webcam.959267.0.html) | ✓ |
| MSI Prestige 13 AI Plus Evo | 258V | 16.9 mm | — | **27**(Prime95: 40 → 27 W) | 40/27 | [NBC](https://www.notebookcheck.net/MSI-Prestige-13-AI-Plus-Evo-laptop-review-Great-graphics-performance-for-under-1-kg.922023.0.html) | ✓ |
| Asus ROG Flow Z13 GZ302EA(タブレット) | AI Max+ 395 | 14.9 mm / 1.62 kg | — | **70**(multi-core: 86 → 70 W)。[複合] 62 | 86/70 | [NBC](https://www.notebookcheck.net/Asus-ROG-Flow-Z13-GZ302EA-Convertible-Review-AMD-s-Strix-Halo-GPU-is-neck-and-neck-with-the-RTX-4070-Laptop.963266.0.html) | ✓ |
| Lenovo Yoga Pro 7 14APH8 | 7840HS | 15.6 mm / 1.47 kg | — | **≈50**(ストレスで「50 W 弱」に安定) | 60/54 | [NBC](https://www.notebookcheck.net/Lenovo-Yoga-Pro-7-14-G8-laptop-review-AMD-Zen4-isn-t-automatically-better.787943.0.html) | ✓ |
| Lenovo IdeaPad Slim 5 15ARP10 | 7735HS | 15.6 mm / 1.58 kg | — | **30**(30 W に収束し安定) | 45/30 | [NBC](https://www.notebookcheck.net/Lenovo-IdeaPad-Slim-5-15-laptop-review-Great-value-for-money-with-an-AMD-SoC-and-an-aluminum-case.945877.0.html) | ✓ |
| Asus Vivobook S 14 OLED M5406WA | HX 370 | 15.9 mm / 1.31 kg | — | (値なし) | 65/54 | [NBC](https://www.notebookcheck.net/Asus-VivoBook-S-14-OLED-laptop-review-Successful-performance-of-the-Ryzen-AI-9-HX-370.880476.0.html) | ✓ |

### T2 標準(iGPU、17 mm 超)
| 機種 | CPU | 厚さ / 重量 | モード | [実測] 持続 W | [設定] PL2/PL1 | 出典 | 確認 |
|---|---|---|---|---|---|---|---|
| Lenovo ThinkPad T14 Gen 6 | 258V | 22 mm(ページ記載)/ 1.46 kg | Best Performance | (値なし) | 37/22.5 | [NBC](https://www.notebookcheck.net/This-is-how-Intel-beats-AMD-Lenovo-ThinkPad-T14-Gen-6-laptop-review.1144489.0.html) | ✓ |
| Microsoft Surface Laptop 7 15 | 268V | 18.3 mm / 1.66 kg | — | [複合] 約 25 | 37/30 | [NBC](https://www.notebookcheck.net/Microsoft-Surface-Laptop-7-15-Lunar-Lake-review-A-slap-in-the-face-for-Windows-on-ARM.985263.0.html) | ✓ |
| Asus ProArt PX13 HN7306EA | AI Max+ 395 | 17.7 mm / 1.39 kg | — | [複合] 70 W を約 8 分 → 約 61 | 85/70 | [NBC](https://www.notebookcheck.net/AMD-Strix-Halo-128-GB-RAM-in-a-13-inch-convertible-Asus-ProArt-PX13-GoPro-Edition-Review.1232755.0.html) | ✓ |
| HP ZBook Ultra G1a 14 | AI Max+ PRO 395 | 18.5 mm / 1.59 kg | — | **66**(Prime95: 81 → 66 W) | 81/66 | [NBC](https://www.notebookcheck.net/HP-ZBook-Ultra-G1a-14-review-Powerful-MacBook-Pro-alternative-for-work-and-game.994758.0.html) | ✓ |
| Asus ZenBook Duo UX8407AA | X9 388H | 23.4 mm / 1.7 kg(2 画面) | — | **48**(ストレス: 66 → 48 W) | 64/46 | [NBC](https://www.notebookcheck.net/Asus-ZenBook-Duo-UX8407-convertible-review-Intel-Panther-Lake-is-a-game-changer.1212285.0.html) | ✓ |
| Asus Zenbook Duo UX8406CA | 285H | 19.9 mm / 1.76 kg | — | **24**(60 → 35 W を数分 → 約 24 W) | 60/35 | [NBC](https://www.notebookcheck.net/Asus-Zenbook-Duo-OLED-review-The-multi-screen-convertible-now-with-Intel-Arrow-Lake.958842.0.html) | ✓ |
| MSI Prestige 16 AI Evo | 285H | 18.95 mm / 1.56 kg | Balanced(既定) | **45**(115 → 45 W) | 115/45(Extreme 115/55) | [NBC](https://www.notebookcheck.net/MSI-Prestige-16-AI-Evo-review-The-multimedia-laptop-with-a-speedy-Arrow-Lake-CPU-and-impressive-runtimes.958869.0.html) | ✓ |
| Lenovo Yoga Pro 7 14IAH10(Arc 140T) | 285H | 18.9 mm / 1.55 kg | — | **75**(115 → 75 W)。[複合] 30 | 115/75 | [NBC](https://www.notebookcheck.net/Lenovo-Yoga-Pro-7i-Gen-10-Aura-Edition-review-Multimedia-laptop-with-a-great-OLED-touchscreen.1158702.0.html) | ✓ |
| Tuxedo Pulse 14 Gen3 | 7840HS | 18 mm / 1.39 kg | — | **45**(ストレス: 65 → 45 W) | 65/45 | [NBC](https://www.notebookcheck.net/Tuxedo-Pulse-14-Gen3-review-The-Linux-Ultrabook-with-AMD-Zen4-and-a-120-Hz-display.795476.0.html) | ✓ |
| Lenovo ThinkPad E14 Gen 6 AMD | 7735HS | 21.5 mm / 1.56 kg | — | (値なし) | 35/30 | [NBC](https://www.notebookcheck.net/Highly-upgradeable-and-affordable-Lenovo-ThinkPad-E14-Gen-6-AMD-laptop-review.953041.0.html) | ✓ |

### T3 薄型 dGPU(21.5 mm 以下)
| 機種 | CPU | 厚さ / 重量 | モード | [実測] 持続 W | [設定] PL2/PL1 | 出典 | 確認 |
|---|---|---|---|---|---|---|---|
| Lenovo Yoga Pro 9i 16 G9(RTX 4070) | 185H | 18.3 mm / 2.07 kg | — | [複合] 42 | 115/80 | [NBC](https://www.notebookcheck.net/Lenovo-Yoga-Pro-9i-16-G9-laptop-review-MiniLED-with-1200-nits-and-Core-Ultra-9.829380.0.html) | ✓ |
| Dell Precision 5490(RTX 3000 Ada) | 185H | 18.95 mm / 1.64 kg | — | **55**(Prime95: 92 → 平均 55 W、101 °C) | 92/55 | [NBC](https://www.notebookcheck.net/Dell-Precision-5490-workstation-review-Now-with-Intel-Meteor-Lake-H-vPro.829082.0.html) | ✓ |
| HP ZBook Studio 16 G11(RTX 3000 Ada) | 185H | 19 mm / 1.81 kg | — | **70**(Prime95: 89 → 70 W) | 91/58 | [NBC](https://www.notebookcheck.net/HP-ZBook-Studio-16-G11-workstation-review-Light-with-performance-done-right.923179.0.html) | ✓ |
| Lenovo Slim Pro 7 14ARP8(RTX 3050) | 7735HS | 15.6 mm / 1.62 kg | — | **52**(Prime95 で 52 W、時間とともにわずかに低下) | 54/52 | [NBC](https://www.notebookcheck.net/New-CPU-name-old-CPU-performance-Lenovo-Slim-7-Pro-Ryzen-7-7735HS-laptop-review.707452.0.html) | ✓ |
| Lenovo ThinkPad T1g Gen 8(dGPU) | 285H | 15.8 mm / 1.91 kg | — | [複合] 35 | 105/74 | [NBC](https://www.notebookcheck.net/A-worthy-successor-to-the-ThinkPad-X1-Extreme-Lenovo-ThinkPad-T1g-Gen-8-review.1210033.0.html) | ✓ |
| Lenovo Pro 9i 16 G11(RTX 5060) | 386H | 17.3 mm / 1.93 kg | — | **62**(Prime95: 86 → 62 W) | 86/62 | [NBC](https://www.notebookcheck.net/Lenovo-Pro-9i-16-G11-Aura-Edition-review-A-direct-counter-to-the-Dell-XPS-16.1282769.0.html) | ✓ |
| Asus ROG Zephyrus G16 GA605WV | HX 370 | 17.2 mm / 1.81 kg | — | [複合] 30 | 70/65 | [NBC](https://www.notebookcheck.net/Asus-ROG-Zephyrus-G16-2024-review-The-slim-gaming-laptop-now-with-AMD-Zen-5.877382.0.html) | ✓ |
| Asus ROG Zephyrus G16 GU605CX(2025) | 285H | 17.4 mm / 1.88 kg | — | [複合] 35 | 100/80 | [NBC](https://www.notebookcheck.net/A-slim-gaming-laptop-now-with-an-RTX-5090-and-64-GB-of-RAM-Asus-ROG-Zephyrus-G16-2025-review.993365.0.html) | ✓ |
| Asus ROG Zephyrus G14 GA403WW(2025) | HX 370 | 18.3 mm / 1.58 kg | Turbo | [複合] 35 | 80/80(Perf 65/45, Quiet 65/35) | [NBC](https://www.notebookcheck.net/14-inches-with-the-GeForce-RTX-5080-Laptop-Asus-ROG-Zephyrus-G14-2025-review.1014019.0.html) | ✓ |
| Asus ROG Zephyrus G14 GU405AR(2026) | 386H | 16.3 mm / 1.57 kg | Turbo | [複合] 35 | 70/70(Perf/Silent 65/50) | [NBC](https://www.notebookcheck.net/One-of-the-best-compact-gaming-laptops-gets-a-brighter-OLED-Asus-ROG-Zephyrus-G14-2026-Review.1321952.0.html) | ✓ |
| Razer Blade 16 2025(RTX 5090) | HX 370 | 17.4 mm / 2.09 kg | Performance | (CPU 単体の値なし) | 78/75(Balanced 55/46, Silent 35) | [NBC](https://www.notebookcheck.net/Razer-Blade-16-2025-review-Gaming-laptop-now-with-GeForce-RTX-5090-Laptop-and-an-even-slimmer-case.988251.0.html) | ✓ |
| HP Omen Transcend 16 (2024) | 14900HX | 20 mm / 2.28 kg | — | (値なし) | 130/55 | [NBC](https://www.notebookcheck.net/HP-Omen-Transcend-16-2024-laptop-review-An-RTX-4070-gaming-machine-with-an-OLED-display.802778.0.html) | ✓ |
| Lenovo Legion Slim 5 14APH8 | 7840HS | 20.79 mm / 1.73 kg | Performance | **84**(Prime95: 92 → 84 W) | 92/83 | [NBC](https://www.notebookcheck.net/Lenovo-Legion-Slim-5-14APH8-laptop-review-120-Hz-2-5K-OLED-sweet-spot.753466.0.html) | ✓ |
| Asus TUF Gaming A14 FA401WV | HX 370 | 19.9 mm / 1.46 kg | Turbo | **80**(Prime95 で 80 W を維持) | 80/80 | [NBC](https://www.notebookcheck.net/Asus-TUF-Gaming-A14-FA401WV-review-Zen-5-Ryzen-9-continues-to-impress.876994.0.html) | ✓ |
| Razer Blade 16 (386H) | 386H | 17.4 mm / 2.12 kg | — | **56**(Prime95: 81 → 56 W) | 85/55 | [NBC](https://www.notebookcheck.net/Razer-Blade-16-review-Intel-Core-Ultra-delivers-faster-frame-rates.1303661.0.html) | ✓ |
| MSI Stealth 16 AI B3WH | 386H | 19.99 mm / 2.03 kg | — | **88**(Prime95 で 88 W に安定) | 97/88 | [NBC](https://www.notebookcheck.net/MSI-Stealth-16-AI-B3WH-review-Part-Gamer-Part-Creator-All-Professional.1411238.0.html) | ✓ |
| Asus ProArt PX13 HN7306(RTX 4070) | HX 370 | 17.7 mm / 1.39 kg | Performance | **65**(80 → 65 W)。[複合] 25 | 80/65(Std 80/55, Whisper 80/50) | [NBC](https://www.notebookcheck.net/Asus-ProArt-PX13-review-The-world-s-fastest-13-3-inch-2-in-1-thanks-to-AMD-Zen-5-and-RTX-4070-laptop.868429.0.html) | ✓ |
| Acer Predator Helios Neo 14 (2024) | 185H | 20.9 mm / 1.95 kg | — | (値なし) | 157/90 | [NBC](https://www.notebookcheck.net/Acer-Predator-Helios-Neo-14-2024-review-The-portable-RTX-4070-laptop-with-long-runtimes.875682.0.html) | ✓ |
| Acer Predator Helios Neo 16S AI | 275HX | 19.9 mm / 2.19 kg | — | (値なし) | 140/75 | [NBC](https://www.notebookcheck.net/Shooting-star-or-flop-Acer-Predator-Helios-Neo-16S-AI-gaming-laptop-review.1201655.0.html) | ✓ |

### T4 ゲーミング標準(dGPU、21.5〜28.5 mm、3.0 kg 未満)
| 機種 | CPU | 厚さ / 重量 | モード | [実測] 持続 W | [設定] PL2/PL1 | 出典 | 確認 |
|---|---|---|---|---|---|---|---|
| Razer Blade 16 2024(RTX 4090) | 14900HX | 22 mm / 2.45 kg | User-defined | **135**(CB R15 ループ: 139 → 135)。Turbo 126 / Balanced 54 / Silent 35 | 140/60 | [NBC](https://www.notebookcheck.net/Razer-Blade-16-2024-laptop-review-Now-with-super-fast-Samsung-OLED.804677.0.html) | ✓ |
| Lenovo Legion Pro 7 16IRX9H | 14900HX | 21.95 mm / 2.66 kg | — | (値なし) | 185/130 | [NBC](https://www.notebookcheck.net/Lenovo-Legion-Pro-7-16-2024-review-Cream-of-the-crop-amongst-RTX-4080-laptops.819046.0.html) | ✓ |
| MSI Stealth 18 HX AI | 275HX | 23.99 mm / 2.96 kg | — | **101**(Prime95 で約 101 W) | 111/101 | [NBC](https://www.notebookcheck.net/MSI-Stealth-18-HX-AI-laptop-review-Most-portable-18-inch-gamer-yet.1153374.0.html) | ✓ |
| HP Victus 16 (2024) | 14700HX | 23.9 mm / 2.37 kg | — | (値なし) | 130/130 | [NBC](https://www.notebookcheck.net/HP-Victus-16-2024-laptop-review-RTX-4060-power-paired-with-long-runtimes.838561.0.html) | ✓ |
| MSI Sword 16 HX B14VGKG | 14700HX | 27.7 mm / 2.3 kg | Balanced | Balanced で 85 → 55 W。Extreme はピーク 96 W のみ記載(持続値なし) | 120/100 | [NBC](https://www.notebookcheck.net/MSI-Sword-16-HX-Laptop-Review-Gaming-powerhouse-stifled-by-an-unimpressive-screen.888247.0.html) | ✓ |
| Lenovo Legion Pro 5i 16IRX9 | 14700HX | 26.55 mm / 2.46 kg | — | (値なし) | 190/130 | [NBC](https://www.notebookcheck.net/Lenovo-Legion-Pro-5i-laptop-review-Super-powerful-i7-14700HX-and-RTX-4060-performance.856842.0.html) | ✓ |
| Acer Predator Helios Neo 16 (2024) | 14700HX | 25.95 mm / 2.62 kg | — | (値なし) | 157/95(Turbo 157/115) | [NBC](https://www.notebookcheck.net/Acer-Predator-Helios-Neo-16-2024-review-Gaming-laptop-with-RTX-4070-and-DCI-P3-panel.834996.0.html) | ✓ |
| Asus TUF Gaming A16 FA617 | 7735HS | 27 mm / 2.19 kg | — | (値なし) | 114/105 | [NBC](https://www.notebookcheck.net/Asus-TUF-Gaming-A16-Advantage-Edition-in-review-AMD-notebook-under-the-auspices-of-the-7.694033.0.html) | ✓ |
| Acer Nitro 16 AN16-41 | 7735HS | 27.9 mm / 2.7 kg | — | (値なし) | 100/75 | [NBC](https://www.notebookcheck.net/Acer-Nitro-16-AN16-41-review-An-RTX-4070-gaming-laptop-with-good-battery-life.726387.0.html) | ✓ |
| Lenovo LOQ 15APH8 | 7840HS | 25.2 mm / 2.45 kg | — | Prime95 開始時の 58 W のみ記載(持続値なし) | 73/58 | [NBC](https://www.notebookcheck.net/Lenovo-LOQ-15-Ryzen-7-7840HS-laptop-review-Don-t-call-it-a-Legion.735495.0.html) | ✓ |
| HP Omen 16 (2024) | 14900HX | 23.5 mm / 2.37 kg | — | (値なし) | 130/130 | [NBC](https://www.notebookcheck.net/HP-Omen-16-2024-review-QHD-gaming-notebook-with-Core-i9-and-RTX-4080-for-EUR3-200.804952.0.html) | ✓ |
| Lenovo Legion Pro 7i 16 Gen 10 | 275HX | 26.65 mm / 2.64 kg | — | **156**(Prime95 で約 156 W に安定) | 201/156 | [NBC](https://www.notebookcheck.net/Lenovo-Legion-Pro-7i-16-Gen-10-laptop-review-400-W-power-supply-with-almost-no-compromises.999828.0.html) | ✓ |
| Schenker XMG Neo 16 (E24) | 14900HX | 26.6 mm / 2.52 kg | — | (値なし) | 205/205 | [NBC](https://www.notebookcheck.net/XMG-Neo-16-Early-24-review-Full-RTX-4090-power-in-a-compact-gaming-laptop.851243.0.html) | ✓ |
| Lenovo Legion Pro 5 16IRX9 | 14900HX | 26.95 mm / 2.46 kg | — | **104**(Prime95: 187 → 104 W、97 °C 到達後) | 187/104 | [NBC](https://www.notebookcheck.net/Lenovo-Legion-Pro-5-16IRX9-laptop-review-Great-performance-but-a-little-heavy.817404.0.html) | ✓ |
| Asus TUF Gaming A15 FA507 | 7735HS | 24.9 mm / 2.15 kg | — | [複合] 35 | 80/65 | [NBC](https://www.notebookcheck.net/Asus-TUF-Gaming-A15-laptop-review-A-budget-gamer-with-an-RTX-4050-and-a-144-Hz-screen.725720.0.html) | ✓ |
| Asus ROG Strix Scar 17 G733PY | 7945HX | 28.3 mm / 2.94 kg | — | **114〜128**(Prime95 で 114〜128 W を行き来) | 128/128 | [NBC](https://www.notebookcheck.net/Asus-ROG-Strix-Scar-17-G733PY-laptop-review-Intel-is-no-longer-king.706291.0.html) | ✓ |
| Lenovo Legion 9i 16IRX8 | 13980HX | 22.7 mm / 2.55 kg(液冷併用) | — | **125**(Prime95: 138 → 125 W) | 145/125 | [NBC](https://www.notebookcheck.net/Legion-9i-Gen-8-16IRX8-review-Lenovo-s-most-ambitious-gaming-laptop-yet.758310.0.html) | ✓ |
| Asus ProArt Studiobook 16 OLED H7604 | 13980HX | 23.9 mm / 2.43 kg | — | **130**(約 170 → 130 W)。[複合] 約 55 | 170/130 | [NBC](https://www.notebookcheck.net/Asus-ProArt-Studiobook-16-OLED-review-Multimedia-laptop-with-extreme-CPU-performance.728757.0.html) | ✓ |

### T5a 大型ゲーミング(28.5 mm 以上または 3.0 kg 以上)
| 機種 | CPU | 厚さ / 重量 | モード | [実測] 持続 W | [設定] PL2/PL1 | 出典 | 確認 |
|---|---|---|---|---|---|---|---|
| Asus ROG Strix G17 G713PI | 7945HX | 30.7 mm / 2.78 kg | — | (CPU 単体の値なし) | 120/90(Turbo 125/125) | [NBC](https://www.notebookcheck.net/Asus-ROG-Strix-G17-G713PI-Gaming-laptop-impresses-in-the-test-with-the-new-Ryzen-9.701633.0.html) | ✓ |
| Asus ROG Strix G16 G614JZ | 13980HX | 30.4 mm / 2.38 kg | Turbo | (CPU 単体の値なし) | 175/130 | [NBC](https://www.notebookcheck.net/Asus-ROG-Strix-G16-G614JZ-laptop-review-Clear-the-stage-for-the-RTX-4080.701775.0.html) | ✓ |
| Asus ROG Strix Scar 16 (2025) | 275HX | 30.8 mm / 2.78 kg | — | [複合] 50 | 165/145 | [NBC](https://www.notebookcheck.net/The-RTX-5090-Laptop-and-mini-LED-inside-a-gaming-laptop-Asus-ROG-Strix-SCAR-16-2025-review.1012778.0.html) | ✓ |
| MSI Vector 16 HX A14V | 14900HX | 28.55 mm / 2.66 kg | — | **140**(Prime95: 180 → 約 140 W) | 184/131 | [NBC](https://www.notebookcheck.net/MSI-Vector-16-HX-laptop-review-Titan-performance-without-the-Titan-price.797217.0.html) | ✓ |
| MSI Titan 18 HX A14VIG | 14900HX | 32.1 mm / 3.63 kg | — | (値なし) | 238/176 | [NBC](https://www.notebookcheck.net/MSI-Titan-18-HX-A14VIG-laptop-review-Year-of-the-dragon.794953.0.html) | ✓ |
| Alienware m18 R2 | 14900HX | 26.7 mm / 3.96 kg | — | (値なし。システム電力のみ) | 180/144 | [NBC](https://www.notebookcheck.net/Alienware-m18-R2-laptop-review-Jumping-from-Core-i9-13980HX-to-i9-14900HX.812957.0.html) | ✓ |
| Alienware 18 Area-51 | 275HX | 24.32 mm / 4.18 kg | Overdrive / Performance | **165**(Overdrive)/ 145(Performance: 165 → 145 W) | 182/140 | [NBC](https://www.notebookcheck.net/Alienware-18-Area-51-laptop-review-Performance-above-all-else.1039640.0.html) | ✓ |
| Lenovo Legion 9 18IAX10 | 275HX | 27.95 mm / 3.53 kg | — | **171**(Prime95: 204 → 171 W) | 205/171 | [NBC](https://www.notebookcheck.net/Legion-9-18IAX10-review-Lenovo-s-first-18-inch-gaming-laptop-is-almost-a-home-run.1110106.0.html) | ✓ |
| Asus ROG Strix Scar 18 (2024) | 14900HX | 30.8 mm / 3.1 kg | — | (値なし) | 120/110(Turbo 175/175) | [NBC](https://www.notebookcheck.net/Asus-ROG-Strix-Scar-18-2024-review-Gaming-laptop-with-RTX-4090-and-mini-LED-panel.801312.0.html) | ✓ |
| Alienware m18 R1 AMD | 7945HX | 26.7 mm / 3.89 kg | — | **145**(Prime95 でパッケージ約 145 W) | 159/148 | [NBC](https://www.notebookcheck.net/AMD-Radeon-RX-7900M-performance-debut-Alienware-m18-R1-laptop-review.771237.0.html) | ✓ |
| MSI Raider 18 HX A14V | 14900HX | 32 mm / 3.56 kg | — | **145**(Prime95 で 145 W、低下なし) | 154/145 | [NBC](https://www.notebookcheck.net/MSI-Raider-18-HX-A14V-review-Titan-performance-without-the-Titan-price.881018.0.html) | ✓ |
| Acer Predator Helios 18 AI | 275HX | 29.55 mm / 3.5 kg | — | (値なし) | 115/75 | [NBC](https://www.notebookcheck.net/Acer-Predator-Helios-18-AI-review-Finally-a-quieter-gaming-laptop-but-at-what-cost.1054468.0.html) | ✓ |
| Asus ROG Strix Scar 18 (2023) G834JY | 13980HX | 30.8 mm / 3.1 kg | — | **135**(ベンチ中に 175 W → 96 °C の熱制限で 135 W)。Silent は 100/65 | 175/170 | [NBC](https://www.notebookcheck.net/Asus-ROG-Strix-Scar-18-2023-G834JY-review-Gaming-laptop-with-RTX-4090.696622.0.html) | ✓ |
| Medion Erazer Beast 18 X1 | 275HX | 30.4 mm / 3.6 kg | — | (値なし) | 210/150 | [NBC](https://www.notebookcheck.net/Medion-Erazer-Beast-18-X1-laptop-review-How-does-the-RTX-5080-perform-in-the-gaming-giant.1022307.0.html) | ✓ |

### T5b 厚型モバイルワークステーション
| 機種 | CPU | 厚さ / 重量 | モード | [実測] 持続 W | [設定] PL2/PL1 | 出典 | 確認 |
|---|---|---|---|---|---|---|---|
| HP ZBook Fury 16 G11 | 14900HX | 28.5 mm / 2.55 kg | — | **69**(Prime95: 139 → 69 W、82 °C) | 139/69 | [NBC](https://www.notebookcheck.net/Nvidia-RTX-3500-Ada-performance-debut-HP-ZBook-Fury-16-G11-workstation-review.870630.0.html) | ✓ |
| Lenovo ThinkPad P16 Gen 2 | 14700HX | 30.23 mm / 3.07 kg | — | **66〜90**(温度に応じて変動) | 144/67 | [NBC](https://www.notebookcheck.net/Lenovo-ThinkPad-P16-Gen-2-workstation-review-Heavy-with-supercharged-graphics.903804.0.html) | ✓ |
| Lenovo ThinkPad T16g Gen 3 | 275HX | 29.8 mm / 2.59 kg | — | **65〜90**(160 → 110 → 1 分後 65、以後 65〜90)。[複合] 25 | 160/65 | [NBC](https://www.notebookcheck.net/A-mobile-workstation-with-disappointing-performance-Lenovo-ThinkPad-T16g-Gen-3-review.1220451.0.html) | ✓ |

---

## 2. クラス別分布

### 2-1. [実測] CPU 単独 MT の持続電力(最大性能モード。範囲は下限)
| クラス | 件数 | 最小 | 中央値 | 最大 | 値(昇順) |
|---|---|---|---|---|---|
| T1 薄型軽量(iGPU ≤17 mm) | 10 | 17 | **29** | 70 | 17, 20, 26, 27, 28, 30, 33, 39, 50, 70 |
| T1(Strix Halo の Flow Z13 を除く) | 9 | 17 | **28** | 50 | |
| T2 標準(iGPU >17 mm) | 6 | 24 | **46.5** | 75 | 24, 45, 45, 48, 66, 75 |
| T3 薄型 dGPU(≤21.5 mm) | 9 | 52 | **65** | 88 | 52, 55, 56, 62, 65, 70, 80, 84, 88 |
| T4 ゲーミング標準(21.5〜28.5 mm) | 7 | 101 | **125** | 156 | 101, 104, 114, 125, 130, 135, 156 |
| T5a 大型ゲーミング | 6 | 135 | **145** | 171 | 135, 140, 145, 145, 165, 171 |
| T5b 厚型モバイル WS | 3 | 65 | **66** | 69 | 65, 66, 69 |

注:
- T1 の Zenbook S14(17 W)は Standard モードの値。同じ機種の Full speed モードは PL1 が 28 W。
- T2 の Zenbook Duo 285H(24 W)は、35 W を数分保った後の長期値。

### 2-2. [複合] CPU+GPU 同時負荷時の CPU 側電力(参考)
| クラス | 件数 | 値 | 中央値 |
|---|---|---|---|
| T1 | 3 | 17, 40, 62 | 40 |
| T2 | 3 | 25, 30, 61 | 30 |
| T3 | 7 | 25, 30, 35, 35, 35, 35, 42 | **35** |
| T4 | 2 | 35, 55 | 45 |
| T5a/b | 2 | 25, 50 | — |

dGPU 機では、複合負荷になると多くが CPU を 25〜55 W まで絞り、GPU 側を優先する。シミュレーターの「ゲーム中の CPU 電力」として使うなら、2-1 ではなくこちらが近い。

### 2-3. [設定] レビュー機の PL1(NBC スペック欄、レビュー 79 本のうち値があるもの)
| クラス | 件数 | 最小 | 中央値 | 最大 |
|---|---|---|---|---|
| T1 | 14 | 17 | **28** | 70 |
| T2 | 10 | 22.5 | **45** | 75 |
| T3 | 19 | 52 | **74** | 90 |
| T4 | 18 | 58 | **115** | 205 |
| T5a | 14 | 75 | **144.5** | 176 |
| T5b | 3 | 65 | **67** | 69 |

**実測と PL1 設定の関係**: 両方がそろう 33 件のうち約 27 件では、実測の持続値が PL1 の ±10% 以内に収まった(例: Legion 9 18 は 171/171、Raider 18 は 145/145、TUF A14 は 80/80)。大きく外れたのは次の 2 種類。
- 熱で PL1 を下回るもの: Zenbook Duo 285H は 35 → 24、Scar 18 2023 は 170 → 135。
- PL1 欄が既定モードの値で、上位モードがそれを超えるもの: Blade 16 2024 は欄が 60 で、Custom モードの実測が 135。

したがって PL1 欄は持続電力の代理値として概ね使える。ただし T4 の下側(58〜75 W)には、Blade 16 のように既定モードの値だけが載っている機種が混じっている。

---

## 3. クラス区切りの提案(CPU MT 持続電力)

上の実測の中央値と幅から決めた。T3 の最大(88 W)と T4 の最小(101 W)の間には明確な切れ目がある。

| クラス | 提案レンジ | 代表値(中央値) | 根拠 |
|---|---|---|---|
| 薄型軽量 | **15〜35 W** | 28 W | 実測 17〜39 W(10 件中 8 件)、PL1 中央値 28 |
| 標準(iGPU、厚め / 2 画面 / 14〜16" クリエイター) | **35〜60 W** | 45 W | 実測 24〜75 W、中央値 46.5。PL1 中央値 45 |
| 薄型 dGPU(薄型ゲーミング / クリエイター) | **50〜90 W** | 65 W | 実測 52〜88 W、中央値 65。PL1 中央値 74 |
| ゲーミング標準(22〜28 mm) | **95〜160 W** | 125 W | 実測 101〜156 W、中央値 125 |
| 大型ゲーミング(18"、28 mm 超または 3 kg 超) | **130〜175 W** | 145 W | 実測 135〜171 W、中央値 145。PL1 中央値 144.5 |
| 厚型モバイル WS | **60〜90 W** | 66 W | 実測 65〜69 W(ここから 90 W まで変動)。静音と熱を優先する設定で、厚みの割に低い |

外れ値として次を扱う。
- Strix Halo(AI Max+ 395)は薄型でも 66〜70 W を持続する(Flow Z13、ZBook Ultra)。
- Razer Blade 16 2024 は 22 mm で 135 W を持続する(Custom モード)。

シミュレーターでは「筐体クラス × CPU 上限(PL1 の範囲)」の min を取る形にすると、こうした例も扱える。

---

## 4. CPU 別の搭載機の分布

### 4-1. NBC の CPU ページに載る搭載ノート機の PL1 設定分布
ミニ PC、携帯ゲーム機、Mini-ITX ボードは除き、1 機種 1 件で数えた(既定モードの値)。ビンは上の区切りに合わせ、≤35 / 36〜60 / 61〜90 / 91〜130 / ≥131 W とした。各 CPU ページの先頭約 100k 字ぶんを読んだので、全件ではない。

| CPU | 件数 | ≤35 | 36–60 | 61–90 | 91–130 | ≥131 | PL1 中央値 | 主な搭載クラス |
|---|---|---|---|---|---|---|---|---|
| Core i9-14900HX | 24 | 0 | 3 | 4 | 7 | 10 | 130 | ゲーミング標準〜大型(薄型の Blade 16 / Omen Transcend は 55〜60) |
| Core i7-14700HX | 7 | 0 | 1 | 2 | 4 | 0 | 95 | ゲーミング標準(Victus / Sword / Legion Pro 5)、WS の P16 |
| Core i9-13980HX | 6 | 0 | 0 | 1 | 3 | 2 | 130 | ゲーミング標準〜大型、クリエイター |
| Core Ultra 9 275HX | 27 | 0 | 0 | 4 | 10 | 13 | 130 | ゲーミング標準〜大型(Helios 系 / T16g は 65〜90) |
| Ryzen 9 7945HX | 5 | 0 | 0 | 2 | 2 | 1 | 120 | ゲーミング標準〜大型 |
| Core Ultra 9 185H | 13 | 2 | 4 | 6 | 1 | 0 | 65 | 薄型 dGPU / 標準(MateBook、Precision 5490、Yoga Pro 9) |
| Core Ultra 9 285H | 7 | 1 | 1 | 5 | 0 | 0 | 74 | 薄型 dGPU / 標準(Zephyrus G16、Yoga Pro、T1g) |
| Core Ultra X9 388H | 2 | 1 | 1 | 0 | 0 | 0 | — | 薄型軽量(OmniBook Ultra 14: 26)、標準(Zenbook Duo: 46) |
| Core Ultra 9 386H | 10 | 2 | 2 | 6 | 0 | 0 | 66 | 薄型 dGPU(G14 / G16 / Blade 16 / Stealth 16)、薄型軽量(Prestige 13 / Zenbook S14) |
| Core Ultra 7 258V | 18 | 18 | 0 | 0 | 0 | 0 | 26.5 | 薄型軽量のみ(17〜35 W) |
| Core Ultra 7 268V | 4 | 3 | 1 | 0 | 0 | 0 | 30.5 | 薄型軽量 / 標準(Surface、Dell Pro 14) |
| Ryzen AI 9 HX 370 | 11 | 2 | 1 | 8 | 0 | 0 | 65 | 薄型 dGPU(Zephyrus、TUF A14、ProArt、Blade 16)、薄型軽量(Zenbook S16、Framework: 28) |
| Ryzen AI Max+ 395 | 3 | 0 | 0 | 3 | 0 | 0 | 70 | 薄型・標準(Flow Z13、ProArt PX13、ZBook Ultra)。ミニ PC では 100〜120 |
| Ryzen 7 7840HS | 8 | 0 | 6 | 2 | 0 | 0 | 54.5 | 標準〜ゲーミング入門(Yoga Pro 7、XMG Apex、LOQ、Legion Slim 5: 82〜83) |
| Ryzen 7 7735HS | 8 | 2 | 2 | 3 | 1 | 0 | 59.5 | 薄型(IdeaPad / E14: 30)からゲーミング入門(TUF A16: 105) |

各 CPU ページの URL:
- [14900HX](https://www.notebookcheck.net/Intel-Core-i9-14900HX-Processor-Benchmarks-and-Specs.790520.0.html)
- [14700HX](https://www.notebookcheck.net/Intel-Core-i7-14700HX-Processor-Benchmarks-and-Specs.790522.0.html)
- [13980HX](https://www.notebookcheck.net/Intel-Core-i9-13980HX-Processor-Benchmarks-and-Specs.675757.0.html)
- [275HX](https://www.notebookcheck.net/Intel-Core-Ultra-9-275HX-Processor-Benchmarks-and-Specs.943094.0.html)
- [7945HX](https://www.notebookcheck.net/AMD-Ryzen-9-7945HX-Processor-Benchmarks-and-Specs.679953.0.html)
- [185H](https://www.notebookcheck.net/Intel-Core-Ultra-9-185H-Processor-Benchmarks-and-Specs.783353.0.html)
- [285H](https://www.notebookcheck.net/Intel-Core-Ultra-9-285H-Processor-Benchmarks-and-Specs.944114.0.html)
- [388H](https://www.notebookcheck.net/Intel-Core-Ultra-X9-388H-Processor-Benchmarks-and-Specs.1148259.0.html)
- [386H](https://www.notebookcheck.net/Intel-Core-Ultra-9-386H-Processor-Benchmarks-and-Specs.1196560.0.html)
- [258V](https://www.notebookcheck.net/Intel-Core-Ultra-7-258V-Processor-Benchmarks-and-Specs.892883.0.html)
- [268V](https://www.notebookcheck.net/Intel-Core-Ultra-7-268V-Processor-Benchmarks-and-Specs.883668.0.html)
- [HX 370](https://www.notebookcheck.net/AMD-Ryzen-AI-9-HX-370-Processor-Benchmarks-and-Specs.836729.0.html)
- [AI Max+ 395](https://www.notebookcheck.net/AMD-Ryzen-AI-Max-395-Processor-Benchmarks-and-Specs.942323.0.html)
- [7840HS](https://www.notebookcheck.net/AMD-Ryzen-7-7840HS-Processor-Benchmarks-and-Specs.680876.0.html)
- [7735HS](https://www.notebookcheck.net/AMD-Ryzen-7-7735HS-Processor-Benchmarks-and-Specs.681410.0.html)

各 CPU ページの付記:
- 388H と 386H のページには Intel 仕様として base 25 W / PL2 80 W / 最低保証 15 W が載っている。
- 14900HX のページには base 55 W / PL2 157 W が載っている。

### 4-2. 本調査のレビュー機での CPU × 筐体クラス(厚さ・重量による分類)
| CPU | T1 | T2 | T3 | T4 | T5a | T5b |
|---|---|---|---|---|---|---|
| 14900HX | | | 1 | 5 | 5 | 1 |
| 14700HX | | | | 4 | | 1 |
| 13980HX | | | | 2 | 2 | |
| 275HX | | | 1 | 2 | 5 | 1 |
| 7945HX | | | | 1 | 2 | |
| 185H | 1 | | 4 | | | |
| 285H | | 3 | 2 | | | |
| 388H | 1 | 1 | | | | |
| 386H | 2 | | 4 | | | |
| 258V | 4 | 1 | | | | |
| 268V | | 1 | | | | |
| HX 370 | 3 | | 5 | | | |
| AI Max+ 395 | 1 | 2 | | | | |
| 7840HS | 1 | 1 | 1 | 1 | | |
| 7735HS | 1 | 1 | 1 | 3 | | |

---

## 5. 限界と残課題

- 出典は NBC の 1 系統だけ。Ultrabookreview / Hardware Unboxed / Gamers Nexus / Tom's Hardware と、OEM 公式の PL1([公表])は未調査。
- CPU ページの機種一覧は、各ページの先頭約 100k 字(Cinebench 系の表)までしか読んでいない。全件ではない。
- NBC はレビューによって、CPU 単独 MT の持続値ではなく CPU+GPU 複合負荷の値やシステム全体の電力しか書いていない(とくにゲーミング機)。そのため [実測] の件数は 43 件(CPU 単独 MT 41 件と、統計に使わない参考値 2 件)にとどまり、ほかに [複合] が 17 件ある。T4 の 7 件と T2 の 6 件は件数が少ない。
- 筐体クラスは厚さと重量の機械的なルールで決めた。冷却方式(ベイパーチャンバー、液冷併用など)は、Legion 9i 16 の液冷併用のようにページに記載があるものだけ注記した。
- 第 11 世代以前の CPU は対象外。
