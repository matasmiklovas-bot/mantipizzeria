#!/usr/bin/env python3
"""Refresh the tyre offers embedded in public/autoservisai/naujospadangos/index.html
from naujospadangosinternetu.lt.

Usage:
    python3 atnaujinti_padangas.py              # scrape the live shop, then update index.html
    python3 atnaujinti_padangas.py --from raw.json   # reuse a previous scrape

For every popular size and season it keeps the 12 cheapest and 6 most
expensive offers, so customers see both budget and premium brands.
"""
import argparse, datetime, html, http.cookiejar, json, os, re, sys, time, urllib.parse, urllib.request

BASE = 'https://www.naujospadangosinternetu.lt/padangos.htm'
SIZES = {
    13: ['155/70', '155/80', '165/70', '175/70'],
    14: ['165/65', '165/70', '175/65', '175/70', '185/60', '185/65', '185/70'],
    15: ['185/55', '185/60', '185/65', '195/50', '195/55', '195/60', '195/65', '205/60', '205/65', '215/65'],
    16: ['195/55', '195/60', '205/55', '205/60', '215/55', '215/60', '215/65', '225/55', '225/60', '235/60'],
    17: ['205/50', '215/45', '215/50', '215/55', '215/60', '225/45', '225/50', '225/55', '225/60', '225/65', '235/45', '235/55', '235/60', '235/65'],
    18: ['225/40', '225/45', '225/55', '225/60', '235/40', '235/45', '235/50', '235/55', '235/60', '245/40', '245/45', '255/55', '255/60'],
    19: ['235/50', '235/55', '245/40', '245/45', '255/50', '255/55'],
    20: ['255/45', '265/50', '275/40'],
}
SEASONS = {'winter': '2', 'summer': '1', 'all': '3'}
HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, '..', '..', 'public', 'autoservisai', 'naujospadangos', 'index.html')


def parse_list(page):
    out = []
    for li in re.findall(r'<li class="product clearfix">(.*?)</form>', page, re.S):
        def g(p):
            m = re.search(p, li, re.S)
            return m.group(1) if m else None
        pid, title, price = g(r'name="addcart"\s+value="(\d+)"'), g(r'class="title">\s*<a[^>]*>([^<]+)'), g(r'class="price">\s*([\d.]+)')
        if not (pid and title and price):
            continue
        noise, stock = g(r'class="noise"><i>([^<]*)'), g(r'Sandėlyje yra (\d+)')
        out.append(dict(
            id=pid, title=html.unescape(title).strip(), alt=html.unescape(g(r'<img[^>]*alt="([^"]*)"') or '').strip(),
            det=' '.join((g(r'class="details">\s*([^<]+)') or '').split()), price=float(price),
            fuel=(g(r'class="fuel"><i>([^<]*)') or '').upper(), wet=(g(r'class="rain"><i>([^<]*)') or '').upper(),
            noise=int(noise) if noise and noise.isdigit() else None, stock=int(stock) if stock else None,
            days=' '.join((g(r'</i>\s*([^<]*?d\.d\.?)\s*</span>') or '').split())))
    return out


def scrape():
    data = {}
    for rim, sizes in SIZES.items():
        for wh in sizes:
            w, h = wh.split('/')
            for season, code in SEASONS.items():
                opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
                fetch = lambda url: opener.open(url, timeout=40).read().decode('utf-8', 'ignore')
                query = urllib.parse.urlencode({'filter[plotis]': w, 'filter[aukstis]': h, 'filter[diametras]': f'R{rim}', 'filter[sezonas]': code})
                cheap = parse_list(fetch(f'{BASE}?{query}'))
                # The shop keeps filters in the session, so sorting reuses the same opener.
                premium = parse_list(fetch(f'{BASE}?sort=1')) if len(cheap) >= 10 else []
                data[f'{w}/{h}/{rim}/{season}'] = cheap[:12] + premium[:6]
                print(w, h, rim, season, len(data[f'{w}/{h}/{rim}/{season}']), file=sys.stderr)
                time.sleep(.3)
    return data


SIZE_RE = re.compile(r'\b\d{3}/\d{2}\s?Z?R\s?\d{2}(?:\.\d)?C?\b', re.I)
IDX_RE = re.compile(r'\b(\d{2,3}(?:/\d{2,3})?)\s?([A-Z])\b')
JUNK_RE = re.compile(r'(?<!\S)(vasarinės|žieminės|universalios|dygliuotos|all-season|XL|FP|RF|MFS|M\+S|3PMSF|DOT\s?\d{2,4}|\(\d{4}\))(?=\s|$)', re.I)
BRANDS = ['BF Goodrich', 'Road Rider', 'Ling Long', 'GT Radial', 'King Meiler', 'Green Max', 'Momo Tires', 'Tri Ace', 'Royal Black', 'Double Star']


def nice(word):
    # Keep codes such as DW02 or FM805+ as they are; soften ALL-CAPS words.
    return word.capitalize() if word.isupper() and word.isalpha() and len(word) > 2 else word


def clean(item):
    title = item['title']
    brand = next((b for b in BRANDS if title.lower().startswith(b.lower() + ' ')), title.split()[0])
    m = IDX_RE.search(item['det']) or IDX_RE.search(SIZE_RE.sub(' ', title))
    idx = m.group(1) + m.group(2) if m else ''
    rest = re.sub(r'\(\s*\d{4}\s*\)|tik\s+\d+\s*vnt\.?|DOT\s?\d{2,4}|^\s*padangos\b|\(\s*[A-G](?:\s+[A-G]){1,2}\s+\d+\s*dB\s*\)', ' ', title[len(brand):], flags=re.I)
    rest = SIZE_RE.sub(' ', rest)
    rest = IDX_RE.sub(' ', rest)
    rest = JUNK_RE.sub(' ', rest)
    words = [w for w in rest.split() if w.lower() != brand.lower()]
    model = ' '.join(nice(w) for w in words).strip(' -') or SIZE_RE.sub('', item['alt']).strip()
    days = re.findall(r'\d+', item['days'])
    days = '–'.join(days[:2]) if days else '1–3'
    return [item['id'], brand, model, idx, item['price'], item['fuel'][:1], item['wet'][:1], item['noise'], item['stock'] or 0, days]


def build(raw):
    out = {}
    for key, items in raw.items():
        rows, seen = [], set()
        for it in items:
            # The site promises new tyres only, so retreads stay out.
            if it['id'] in seen or 'RESTAURUOTA' in it['title'].upper():
                continue
            seen.add(it['id'])
            rows.append(clean(it))
        if rows:
            out[key] = sorted(rows, key=lambda r: r[4])
    return out


def inject(data):
    page = open(PAGE, encoding='utf-8').read()
    blob = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    stamp = datetime.date.today().isoformat()
    new = f"/*TIRES*/const TIRES_UPDATED = '{stamp}';\nconst TIRES = {blob};\n/*/TIRES*/"
    page, n = re.subn(r'/\*TIRES\*/.*?/\*/TIRES\*/', lambda _: new, page, flags=re.S)
    if n != 1:
        sys.exit('Could not find the /*TIRES*/ block in index.html')
    open(PAGE, 'w', encoding='utf-8').write(page)
    print(f'{len(data)} sizes, {sum(map(len, data.values()))} offers, updated {stamp}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', help='raw JSON from a previous scrape')
    a = ap.parse_args()
    inject(build(json.load(open(a.src, encoding='utf-8')) if a.src else scrape()))
