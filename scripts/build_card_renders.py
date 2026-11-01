#!/usr/bin/env python3
"""
Remplace les images des cartes (prop_<thème>.png) par les rendus des modèles 3D Hunyuan
(thumb_<thème>.img écrits par generate_tile_models.py), recadrés sur l'objet.
Usage : build_card_renders.py [dossier de travail]
"""
import io
import shutil
import sys

from PIL import Image

THEMES = "plage lagon falaise temple volcan eldorado port taverne tresor malediction".split()
WORK = sys.argv[1] if len(sys.argv) > 1 else "/tmp/tilegen"

for theme in THEMES:
    with open(f"{WORK}/thumb_{theme}.img", "rb") as f:
        img = Image.open(io.BytesIO(f.read())).convert("RGBA")
    img = img.crop(img.getchannel("A").getbbox())
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side))
    canvas.paste(img, ((side - img.width) // 2, side - img.height))
    out = f"public/assets/prop_{theme}.png"
    canvas.save(out, optimize=True)
    shutil.copyfile(out, f"src/assets/prop_{theme}.png")
