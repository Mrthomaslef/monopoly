#!/usr/bin/env python3
"""
Génère 10 éléments 3D isolés via l'API Higgsfield Soul V2 et les détourne automatiquement
en PNG transparents (flood-fill depuis les bords) pour les afficher en relief 3D sur les cases.
"""
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
import io
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
from PIL import Image, ImageFilter

API_BASE = "https://api.higgsfield.ai"
IMAGE_MODEL_PATH = "/higgsfield-ai/soul/v2/standard"

PROP_PROMPTS = {
    "prop_plage.png": (
        "Single isolated 3D game asset render of two leaning tropical coconut palm trees on a small "
        "golden sand mound with a weathered wooden pirate sign and a red beach crab, isometric 3D diorama prop, "
        "Sea of Thieves stylized 3D art style, centered, completely isolated on a pure solid white background #FFFFFF, "
        "no horizon, no water, clean outer silhouette."
    ),
    "prop_lagon.png": (
        "Single isolated 3D game asset render of a giant open clam shell holding a glowing white pearl "
        "flanked by vibrant pink and turquoise coral branches on a small reef rock, isometric 3D diorama prop, "
        "Sea of Thieves stylized 3D art style, centered, completely isolated on a pure solid white background #FFFFFF, "
        "no horizon, no water, clean outer silhouette."
    ),
    "prop_falaise.png": (
        "Single isolated 3D game asset render of a dark slate pirate fortress watchtower carved into a jagged "
        "coastal rock cliff with two brass cannons, isometric 3D diorama prop, Sea of Thieves stylized 3D art style, "
        "centered, completely isolated on a pure solid white background #FFFFFF, no horizon, clean outer silhouette."
    ),
    "prop_temple.png": (
        "Single isolated 3D game asset render of an ancient stepped mossy jade stone Mayan temple sanctuary "
        "with a golden fire brazier on top and a tropical palm tree beside it, isometric 3D diorama prop, "
        "Sea of Thieves stylized 3D art style, centered, completely isolated on a pure solid white background #FFFFFF, "
        "no horizon, clean outer silhouette."
    ),
    "prop_volcan.png": (
        "Single isolated 3D game asset render of a dramatic dark basalt volcano cone with glowing emerald-green "
        "lava in its crater and glowing green fissures, isometric 3D diorama prop, Sea of Thieves stylized 3D art style, "
        "centered, completely isolated on a pure solid white background #FFFFFF, no horizon, clean outer silhouette."
    ),
    "prop_eldorado.png": (
        "Single isolated 3D game asset render of a gleaming stepped golden El Dorado pyramid temple topped with "
        "a glowing red ruby crystal and surrounded by gold coins, isometric 3D diorama prop, Sea of Thieves stylized "
        "3D art style, centered, completely isolated on a pure solid white background #FFFFFF, clean outer silhouette."
    ),
    "prop_port.png": (
        "Single isolated 3D game asset render of a pirate harbor stone lighthouse with red and cream stripes, "
        "a glowing golden lantern dome, and a stone quay base, isometric 3D diorama prop, Sea of Thieves stylized "
        "3D art style, centered, completely isolated on a pure solid white background #FFFFFF, clean outer silhouette."
    ),
    "prop_taverne.png": (
        "Single isolated 3D game asset render of a cozy wooden pirate tavern inn with a red shingle roof, "
        "glowing warm amber windows, and two oak rum barrels outside, isometric 3D diorama prop, Sea of Thieves "
        "stylized 3D art style, centered, completely isolated on a pure solid white background #FFFFFF, clean outer silhouette."
    ),
    "prop_tresor.png": (
        "Single isolated 3D game asset render of an ornate wooden and brass pirate treasure chest wide open "
        "and overflowing with gleaming gold doubloons and jewels, isometric 3D diorama prop, Sea of Thieves "
        "stylized 3D art style, centered, completely isolated on a pure solid white background #FFFFFF, clean outer silhouette."
    ),
    "prop_malediction.png": (
        "Single isolated 3D game asset render of giant purple Kraken tentacles coiling around a glowing "
        "levitating violet voodoo crystal obelisk on dark rock, isometric 3D diorama prop, Sea of Thieves "
        "stylized 3D art style, centered, completely isolated on a pure solid white background #FFFFFF, clean outer silhouette."
    ),
}


def remove_white_background_floodfill(img: Image.Image) -> Image.Image:
    """
    Removes the outer white/light background connected to the image borders using BFS flood-fill,
    preserving interior light pixels (like lighthouse stripes or pearls) and feathering the alpha edge.
    """
    img = img.convert("RGBA")
    img.thumbnail((512, 512), Image.Resampling.LANCZOS)
    w, h = img.size
    pixels = img.load()

    # Sample background color from corners
    visited = [[False] * h for _ in range(w)]
    bg_mask = Image.new("L", (w, h), 255)
    mask_px = bg_mask.load()

    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
        visited[x][0] = True
        visited[x][h - 1] = True
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
        visited[0][y] = True
        visited[w - 1][y] = True

    def is_bg(r: int, g: int, b: int) -> bool:
        # Near-white / very light neutral background
        lum = (r + g + b) / 3.0
        sat = max(r, g, b) - min(r, g, b)
        return lum > 226 and sat < 32

    while q:
        cx, cy = q.popleft()
        r, g, b, _ = pixels[cx, cy]
        if is_bg(r, g, b):
            mask_px[cx, cy] = 0
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                    visited[nx][ny] = True
                    q.append((nx, ny))

    # Smooth the mask slightly to anti-alias edges
    smooth_mask = bg_mask.filter(ImageFilter.GaussianBlur(radius=1.1))
    s_px = smooth_mask.load()
    for x in range(w):
        for y in range(h):
            r, g, b, _ = pixels[x, y]
            a = s_px[x, y]
            if a < 35:
                a = 0
            pixels[x, y] = (r, g, b, a)

    # Auto-crop transparent padding and pad cleanly to square
    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        cw, ch = cropped.size
        side = int(max(cw, ch) * 1.08)
        out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        out.paste(cropped, ((side - cw) // 2, side - ch - int(side * 0.03)))
        out = out.resize((512, 512), Image.Resampling.LANCZOS)
        return out
    return img


def generate_single_prop(api_key: str, filename: str, prompt: str) -> str:
    headers = {
        "Authorization": f"Key {api_key}" if not api_key.lower().startswith("key ") else api_key,
        "Content-Type": "application/json",
        "User-Agent": "PiratesPlunder/1.0",
    }
    print(f"[Higgsfield 3D Prop] Lancement de {filename}...")
    req = urllib.request.Request(
        f"{API_BASE}{IMAGE_MODEL_PATH}",
        data=json.dumps({"prompt": prompt}).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    status_url = data.get("status_url") or f"{API_BASE}/requests/{data['request_id']}/status"
    while True:
        time.sleep(3)
        poll_req = urllib.request.Request(status_url, headers=headers, method="GET")
        with urllib.request.urlopen(poll_req, timeout=30) as poll_resp:
            status_data = json.loads(poll_resp.read().decode("utf-8"))
        status = status_data.get("status")
        print(f"  [{filename}] statut : {status}")
        if status in ("completed", "succeeded"):
            images = status_data.get("images") or status_data.get("output", {}).get("images", [])
            if images:
                img_url = images[0].get("url") if isinstance(images[0], dict) else images[0]
                dl_req = urllib.request.Request(img_url, headers={"User-Agent": "PiratesPlunder/1.0"})
                with urllib.request.urlopen(dl_req, timeout=45) as img_resp:
                    raw_bytes = img_resp.read()

                pil_img = Image.open(io.BytesIO(raw_bytes))
                cutout_img = remove_white_background_floodfill(pil_img)

                pub_path = os.path.join("public/assets", filename)
                src_path = os.path.join("src/assets", filename)
                cutout_img.save(pub_path, format="PNG", optimize=True)
                shutil.copyfile(pub_path, src_path)
                print(f"  -> {filename} détouré et enregistré ({os.path.getsize(pub_path)} octets)")
                return pub_path
            raise RuntimeError(f"Réponse sans image pour {filename}: {status_data}")
        if status in ("failed", "canceled", "error"):
            raise RuntimeError(f"Échec Higgsfield pour {filename}: {status_data}")


def main() -> int:
    api_key = os.environ.get("HIGGSFIELD_API_KEY", "").strip()
    if not api_key:
        print("Erreur : HIGGSFIELD_API_KEY manquant", file=sys.stderr)
        return 1

    os.makedirs("public/assets", exist_ok=True)
    os.makedirs("src/assets", exist_ok=True)

    errors = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {
            pool.submit(generate_single_prop, api_key, fname, prompt): fname
            for fname, prompt in PROP_PROMPTS.items()
        }
        for fut in as_completed(futures):
            fname = futures[fut]
            try:
                fut.result()
            except Exception as e:
                print(f"Erreur sur {fname}: {e}", file=sys.stderr)
                errors.append(fname)

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
