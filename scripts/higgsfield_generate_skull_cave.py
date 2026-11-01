#!/usr/bin/env python3
"""
Génère la Grotte en Crâne 3D (Skull Cave) pour l'île centrale du trésor via l'API Higgsfield Soul V2
et la détourne en PNG transparent haute définition (public/assets/center_skull_cave.png).
"""
from collections import deque
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

SKULL_CAVE_PROMPT = (
    "Single isolated 3D isometric game asset render of a monumental pirate Skull Cave carved into a craggy "
    "tropical cliff rock on a treasure island, giant ancient stone skull cavern entrance with glowing golden "
    "torchlight and overflowing pirate treasure chests and gold doubloons inside the open jaw mouth, a few "
    "tropical vines and palm fronds on top of the rock, Sea of Thieves stylized hand-painted 3D game model, "
    "front 3/4 isometric board game camera angle, centered, completely isolated on a pure solid white "
    "background #FFFFFF, no sky, no ocean plane, clean crisp outer silhouette."
)


def cutout_skull_cave(img: Image.Image) -> Image.Image:
    """
    Détoure le fond blanc externe par flood-fill depuis les bords tout en préservant
    les détails internes (dents du crâne, reflets d'or, torches).
    """
    img = img.convert("RGBA")
    img.thumbnail((896, 896), Image.Resampling.LANCZOS)
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

    smooth_mask = bg_mask.filter(ImageFilter.GaussianBlur(radius=1.2))
    s_px = smooth_mask.load()
    for x in range(w):
        for y in range(h):
            r, g, b, _ = pixels[x, y]
            a = s_px[x, y]
            if a < 32:
                a = 0
            pixels[x, y] = (r, g, b, a)

    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        cw, ch = cropped.size
        side = int(max(cw, ch) * 1.08)
        out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        # Ancrer la base de la grotte en bas du canevas pour qu'elle repose bien sur l'île centrale
        out.paste(cropped, ((side - cw) // 2, side - ch - int(side * 0.03)))
        out = out.resize((768, 768), Image.Resampling.LANCZOS)
        return out
    return img


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

    print("[Higgsfield Skull Cave] Génération de center_skull_cave.png via Soul V2...")
    req = urllib.request.Request(
        f"{API_BASE}{IMAGE_MODEL_PATH}",
        data=json.dumps({"prompt": SKULL_CAVE_PROMPT}).encode("utf-8"),
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
        print(f"  [center_skull_cave.png] statut : {status}")
        if status in ("completed", "succeeded"):
            images = status_data.get("images") or status_data.get("output", {}).get("images", [])
            if images:
                img_url = images[0].get("url") if isinstance(images[0], dict) else images[0]
                dl_req = urllib.request.Request(img_url, headers={"User-Agent": "PiratesPlunder/1.0"})
                with urllib.request.urlopen(dl_req, timeout=45) as img_resp:
                    raw_bytes = img_resp.read()

                pil_img = Image.open(io.BytesIO(raw_bytes))
                cutout_img = cutout_skull_cave(pil_img)

                pub_path = os.path.join("public/assets", "center_skull_cave.png")
                dist_path = os.path.join("dist/assets", "center_skull_cave.png")
                cutout_img.save(pub_path, format="PNG", optimize=True)
                shutil.copyfile(pub_path, dist_path)
                print(f"  -> Enregistré : {pub_path} ({os.path.getsize(pub_path) // 1024} Ko)")
                break
        if status in ("failed", "canceled", "nsfw"):
            raise RuntimeError(f"Échec Higgsfield pour center_skull_cave.png: {status_data}")


if __name__ == "__main__":
    main()
