#!/usr/bin/env python3
"""Instala los íconos nuevos, actualiza manifest.json y cambia el nombre a Monte Carpooling. Idempotente."""
from pathlib import Path
import shutil, json, sys

root = Path.cwd()
here = Path(__file__).resolve().parent
if not (root / "artifacts" / "carpool").exists():
    sys.exit("❌ Ejecutalo desde la raíz del repo (~/Monte-Carpooling)")

pub = root / "artifacts/carpool/public"

# 1. Copiar íconos
icons_src = here / "icons"
copies = {
    "icon-512.png": pub / "icon-512.png",
    "icon-192.png": pub / "icon-192.png",
    "icon-maskable-512.png": pub / "icon-maskable-512.png",
    "icon-maskable-192.png": pub / "icon-maskable-192.png",
    "apple-touch-icon.png": pub / "apple-touch-icon.png",
    "favicon.ico": pub / "favicon.ico",
    "google-brand-logo.png": pub / "images" / "google-brand-logo.png",
}

for src_name, dst in copies.items():
    src = icons_src / src_name
    if not src.exists():
        sys.exit(f"❌ No encontré {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    print(f"  {src_name} → {dst.relative_to(root)}")

# También copiar el 1024 como logo-mark
icon1024 = here / "icon-1024.png"
if icon1024.exists():
    shutil.copyfile(icon1024, pub / "images" / "logo-mark.png")
    print(f"  icon-1024.png → artifacts/carpool/public/images/logo-mark.png")

# Copiar el cuadrado 1024
shutil.copyfile(here / "icon-1024.png", pub / "images" / "logo-mark.png")
print("✅ Íconos copiados")

# 2. Actualizar manifest.json
mf = pub / "manifest.json"
m = json.loads(mf.read_text())
m["name"] = "Monte Carpooling"
m["short_name"] = "Monte Carpooling"
m["icons"] = [
    {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
    {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
]
mf.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
print("✅ manifest.json actualizado (nombre + íconos)")


def patch(rel, marker, old, new):
    p = root / rel
    s = p.read_text()
    if marker in s:
        return
    assert s.count(old) == 1, f"{rel}: no encontré el lugar exacto:\n{old}"
    p.write_text(s.replace(old, new, 1))


# 3. Nombre bajo el ícono en iPhone
idx = pub / "index.html"
html = idx.read_text()
if 'content="Carpooling Monte"' in html:
    html = html.replace('content="Carpooling Monte"', 'content="Monte Carpooling"')
    idx.write_text(html)
    print("✅ apple-mobile-web-app-title → Monte Carpooling")
elif 'content="Monte Carpooling"' in html:
    print("✅ apple-mobile-web-app-title ya estaba bien")
else:
    print("⚠️  No encontré apple-mobile-web-app-title en index.html")

# 4. Favicon en index.html
if 'href="/favicon.ico"' not in html:
    html = idx.read_text()
    if '<link rel="icon"' in html:
        # Reemplazar el existente
        import re
        html = re.sub(r'<link rel="icon"[^>]*>', '<link rel="icon" type="image/x-icon" href="/favicon.ico">', html, count=1)
    elif '</head>' in html:
        html = html.replace('</head>', '  <link rel="icon" type="image/x-icon" href="/favicon.ico">\n  </head>')
    idx.write_text(html)
    print("✅ Favicon añadido a index.html")
else:
    print("✅ Favicon ya estaba en index.html")

# 5. Apple touch icon en index.html
if 'href="/apple-touch-icon.png"' not in html:
    html = idx.read_text()
    if '</head>' in html:
        html = html.replace('</head>', '  <link rel="apple-touch-icon" href="/apple-touch-icon.png">\n  </head>')
    idx.write_text(html)
    print("✅ apple-touch-icon añadido a index.html")
else:
    print("✅ apple-touch-icon ya estaba en index.html")

print("\nListo. Ahora compilá y subí.")
