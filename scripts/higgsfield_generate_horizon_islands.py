#!/usr/bin/env python3
"""
Génère 4 îles d'horizon distantes via l'API Higgsfield Soul V2 et les détourne en PNG transparents
pour donner l'impression d'avoir des îles au loin autour du plateau.
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

HORIZON_ISLAND_PROMPTS = {
    "horizon_island_volcano.png": (
        "Single isolated wide game asset render of a distant tropical volcanic pirate island seen from a low 3/4 "
        "horizon angle, twin misty volcanic peaks with a faint wisp of smoke, lush jungle slopes and a flat golden "
        "sandy shoreline base, Sea of Thieves stylized hand-painted 3D game art, centered, completely isolated on "
        "a pure solid white background #FFFFFF, no sky, no clouds, no ocean plane, clean outer silhouette."
    ),
    "horizon_island_arch.png": (
        "Single isolated wide game asset render of a distant Caribbean rock arch island seen from a low 3/4 "
        "horizon angle, dramatic natural limestone sea arch, tropical palm trees and a golden sandy beach base, "
        "Sea of Thieves stylized hand-painted 3D game art, centered, completely isolated on a pure solid white "
        "background #FFFFFF, no sky, no clouds, no ocean plane, clean outer silhouette."
    ),
    "horizon_island_fortress.png": (
        "Single isolated wide game asset render of a distant rugged pirate cliff island seen from a low 3/4 "
        "horizon angle, craggy dark slate sea cliffs, an old stone pirate lookout tower on the ridge and a rocky "
        "cove base, Sea of Thieves stylized hand-painted 3D game art, centered, completely isolated on a pure "
        "solid white background #FFFFFF, no sky, no clouds, no ocean plane, clean outer silhouette."
    ),
    "horizon_island_atoll.png": (
        "Single isolated wide game asset render of a distant lush tropical jungle island seen from a low 3/4 "
        "horizon angle, green mountain ridge with a small waterfall, coconut palm groves and a wide golden sandbar "
        "shoreline base, Sea of Thieves stylized hand-painted 3D game art, centered, completely isolated on a pure "
        "solid white background #FFFFFF, no sky, no clouds, no ocean plane, clean outer silhouette."
    ),
}


def cutout_horizon_island(img: Image.Image) -> Image.Image:
    """
    Removes the outer white/light background via border flood-fill and feathers the edges
    so the island blends seamlessly on the distant ocean horizon.
    """
    img = img.convert("RGBA")
    img.thumbnail((768, 768), Image.Resampling.LANCZOS)
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

    smooth_mask = bg_mask.filter(ImageFilter.GaussianBlur(radius=1.3))
    s_px = smooth_mask.load()
    for x in range(w):
        for y in range(h):
            r, g, b, _ = pixels[x, y]
            a = s_px[x, y]
            if a < 35:
                a = 0
            pixels[x, y] = (r, g, b, a)

    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        cw, ch = cropped.size
        out_w = int(max(cw, ch) * 1.1)
        out_h = int(out_w * 0.65)
        if ch > out_h - 16:
            out_h = ch + 20
        out = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
        # Anchor the island shoreline near the bottom of the canvas so it sits directly on the water
        out.paste(cropped, ((out_w - cw) // 2, out_h - ch - int(out_h * 0.02)))
        out = out.resize((768, 480), Image.Resampling.LANCZOS)
        return out
    return img


def generate_single_horizon_island(api_key: str, filename: str, prompt: str) -> str:
    headers = {
        "Authorization": f"Key {api_key}" if not api_key.lower().startswith("key ") else api_key,
        "Content-Type": "application/json",
        "User-Agent": "PiratesPlunder/1.0",
    }
    print(f"[Higgsfield Horizon Island] Lancement de {filename}...")
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
                cutout_img = cutout_horizon_island(pil_img)

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
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(generate_single_horizon_island, api_key, fname, prompt): fname
            for fname, prompt in HORIZON_ISLAND_PROMPTS.items()
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
