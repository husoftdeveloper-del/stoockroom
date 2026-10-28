# د اپ نصبولو لارښود (How to install on your laptop)

د Stoockroom اپ په خپل لپ‌ټاپ کې نصبولو لپاره دوه کارونه کول پکار دي:
**(۱)** فایلونه راوړل او سرور چلول، **(۲)** د براوزر له لارې اپ نصبول.

---

## ۱. فایلونه راوړل (Download)

**لار الف — د Git له لارې:**

```bash
git clone https://github.com/husoftdeveloper-del/stoockroom.git
cd stoockroom
git checkout arena/20252ded-stoockroom
```

**لار ب — ZIP:** د GitHub په پاڼه کې **Code → Download ZIP** کېکاږه او فایلونه خلاص کړه.

> اړتیا: **Python 3** (ویندوز، مک، لینکس ټولو کې شته یا وړیا نصبېږي — <https://www.python.org/downloads/>).
> په ویندوز کې د نصب پر مهال **"Add Python to PATH"** ته ټیک ورکړه.

---

## ۲. سرور چلول

**ویندوز:** په فولډر کې دوه ځله پر `start.bat` کېکاږه (یا `start.bat` په CMD کې چلوه).

**مک / لینکس:**

```bash
bash start.sh
```

بیا به براوزر پخپله پرانیستل شي: **http://localhost:5173**

که پخپله نه پرانیستل شو، براوزر پرانیزه او `http://localhost:5173` ولیکه.

> مهم: پاڼه باید د **localhost** له لارې پرانیزل شي. که `index.html` په مستقیم ډول (file://) پرانیزې، پاڼه ښکاري خو اپ **نه نصبېږي**، ځکه نصب یوازې پر `localhost` یا `HTTPS` کار کوي.

---

## ۳. اپ نصبول (PWA)

### Chrome / Edge (ویندوز، مک، لینکس)
1. `http://localhost:5173` پرانیزه.
2. د آدرس پټۍ ښي خوا کې د **نصب آیکون** (مانېټر سره کمپیوټر) یا پاڼې پورتنۍ ښي خوا **Install app** تڼۍ کېکاږه.
3. **Install** تایید کړه.

اپ به په خپل جلا کړکۍ کې پرانیستل شي او آیکون به یې په **Start Menu / Applications / Dock** کې ښکاره شي — له هماغه ځایه یې هر وخت پرانیستلای شې.

### Safari (مک)
د `Safari → File → Add to Dock` له لارې (macOS Sonoma یا نوی).

### موبایل (که غواړې په تلیفون کې هم وي)
1. لپ‌ټاپ او تلیفون دواړه پر یوه WiFi وي.
2. د لپ‌ټاپ IP پیدا کړه: ویندوز `ipconfig` / مک `ifconfig | grep inet` — مثلاً `192.168.1.5`.
3. په تلیفون کې `http://192.168.1.5:5173` پرانیزه.
4. Android: ⋮ → **Add to Home screen**. iPhone: Share → **Add to Home Screen**.

> په تلیفون کې د نصب لپاره HTTPS اړین دی. د دې لپاره چې په رښتیني ډول یې وګوري، اپ دې ته ځای پر ځای کړه:
> Netlify / Vercel / GitHub Pages (ټول وړیا او اتومات HTTPS لري).

---

## ۴. بدلونونه راوستل (Update)

```bash
cd stoockroom
git pull origin arena/20252ded-stoockroom
```

بیا اپ پرانیزه او **Ctrl + Shift + R** (سخت reload) ووهه، تر څو نوی نسخه راشي.
کېش نسخه په `sw.js` کې ده (`CACHE = "stoockroom-v2"`) — هر ځل چې بدلون راوړې، دا نسخه پورته کړه.

---

## ۵. ستونزې

| ستونزه | حل |
| --- | --- |
| `Install app` تڼۍ نه ښکاري | پاڼه دې `localhost` وي، نه `file://`. کروم/اېج وکاروه. |
| `python` نه پېژندل کېږي | Python 3 نصب کړه او "Add to PATH" ټیک کړه، بیا CMD بند/پرانیزه. |
| پورټ بوخت دی | بل پورټ: `bash start.sh 8080` یا `start.bat 8080` |
| زاړه رنګونه ښکاري | Ctrl + Shift + R، یا د براوزر کېش پاک کړه. |
| منیفست نه لودېږي | `serve.py` وکاروه (نه `python -m http.server`) — سم MIME ورکوي. |
