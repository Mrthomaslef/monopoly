#!/usr/bin/env python3
"""
Génère les 3 niveaux de forteresses pirates via l'API Higgsfield Soul V2 :
1. fort_wood.png : Petite forteresse en bois (palissade en rondins, plateforme de guet en bois, canon)
2. fort_stone.png : Forteresse en pierre brute (remparts en moellons de pierre grise, créneaux, canons)
3. fort_carved_stone.png : Forteresse en pierre taillée (citadelle en pierre de taille sculptée, arches, ornements dorés, canons)
"""
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
import io
import json
import os
import shutil
import sys
import time
import urllib.request
from PIL import Image, ImageFilter

API_BASE = "https://api.higgsfield.ai"
IMAGE_MODEL_PATH = "/higgsfield-ai/soul/v2/standard"

FORTRESS_PROMPTS = {
    "fort_wood.png": (
        "Single isolated 3D isometric game asset render of a small pirate wooden fortress outpost built from "
        "sharpened timber log palisades, rough oak planks, rope lashings, and a sturdy wooden watchtower platform "
        "with a brass cannon and warm lantern, Sea of Thieves stylized hand-painted 3D game model, front 3/4 "
        "isometric board game camera angle, centered, completely isolated on a pure solid white background #FFFFFF, "
        "no sky, no water, clean crisp outer silhouette."
    ),
    "fort_stone.png": (
        "Single isolated 3D isometric game asset render of a rugged pirate stone fortress bastion built from "
        "rough-hewn grey fieldstone and mortar boulders, sturdy crenelated stone battlements, iron-bound wooden gate, "
        "and two iron cannons in stone embrasures, Sea of Thieves stylized hand-painted 3D game model, front 3/4 "
        "isometric board game camera angle, centered, completely isolated on a pure solid white background #FFFFFF, "
        "no sky, no water, clean crisp outer silhouette."
    ),
    "fort_carved_stone.png": (
        "Single isolated 3D isometric game asset render of a grand imperial pirate citadel fortress built from "
        "finely carved ashlar dressed limestone blocks, precision sculpted stone arches, octagonal turret battlements "
        "with golden bronze trim, carved skull relief keystone, and gleaming brass cannons, Sea of Thieves stylized "
        "hand-painted 3D game model, front 3/4 isometric board game camera angle, centered, completely isolated on "
        "a pure solid white background #FFFFFF, no sky, no water, clean crisp outer silhouette."
    ),
}


def cutout_fortress(img: Image.Image) -> Image.Image:
    """
    Détoure le fond blanc externe par flood-fill depuis les bords tout en préservant
    les détails internes de la forteresse (pierres claires, reflets métalliques).
    """
    img = img.convert("RGBA")
    img.thumbnail((640, 640), Image.Resampling.LANCZOS)
    w, h = img.size
    pixels = img.load()

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
        lum = (r + g + b) / 3.0
        sat = max(r, g, b) - min(r, g, b)
        return lum > 224 and sat < 34

    while q:
        cx, cy = q.popleft()
        r, g, b, _ = pixels[cx, cy]
        if is_bg(r, g, b):
            mask_px[cx, cy] = 0
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                    visited[nx][ny] = True
                    q.append((nx, ny))

    smooth_mask = bg_mask.filter(ImageFilter.GaussianBlur(radius=1.1))
    s_px = smooth_mask.load()
    for x in range(w):
        for y in range(h):
            r, g, b, _ = pixels[x, y]
            a = s_px[x, y]
            if a < 28:
                a = 0
            pixels[x, y] = (r, g, b, a)

    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        cw, ch = cropped.size
        side = int(max(cw, ch) * 1.08)
        out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        # Ancrer la base de la forteresse en bas du canevas
        out.paste(cropped, ((side - cw) // 2, side - ch - int(side * 0.03)))
        out = out.resize((512, 512), Image.Resampling.LANCZOS)
        return out
    return img


def generate_one_fortress(filename: str, prompt: str, headers: dict) -> str:
    print(f"[Higgsfield Fortress] Lancement de {filename}...")
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
                cutout_img = cutout_fortress(pil_img)

                pub_path = os.path.join("public/assets", filename)
                dist_path = os.path.join("dist/assets", filename)
                cutout_img.save(pub_path, format="PNG", optimize=True)
                if os.path.exists("dist/assets"):
                    shutil.copyfile(pub_path, dist_path)
                print(f"  -> Enregistré : {pub_path} ({os.path.getsize(pub_path) // 1024} Ko)")
                return pub_path
        if status in ("failed", "canceled", "nsfw"):
            raise RuntimeError(f"Échec Higgsfield pour {filename}: {status_data}")


def main() -> None:
    secret_file = "/Users/thomaslefevre/.t3/userdata/secrets/files/30ebb9d31262376b1af419af42f33440"
    api_key = os.environ.get("HIGGSFIELD_API_KEY", "").strip()
    if not api_key and os.path.exists(secret_file):
        with open(secret_file, "r", encoding="utf-8") as f:
            api_key = f.read().strip()

    if not api_key:
        print("Erreur : Clé API Higgsfield introuvable.", file=sys.stderr)
        sys.exit(1)

    os.makedirs("public/assets", exist_ok=True)
    os.makedirs("dist/assets", exist_ok=True)

    headers = {
        "Authorization": f"Key {api_key}" if not api_key.lower().startswith("key ") else api_key,
        "Content-Type": "application/json",
        "User-Agent": "PiratesPlunder/1.0",
    }

    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {
            pool.submit(generate_one_fortress, fname, prompt, headers): fname
            for fname, prompt in FORTRESS_PROMPTS.items()
        }
        for fut in as_completed(futures):
            fname = futures[fut]
            fut.result()
            print(f"[OK] {fname} terminé.")


if __name__ == "__main__":
    main()
