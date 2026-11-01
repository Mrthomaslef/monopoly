#!/usr/bin/env python3
"""
Script de génération des textures et portraits de Pirate's Plunder via l'API Higgsfield (https://api.higgsfield.ai).
Usage :
  export HIGGSFIELD_API_KEY="votre_key_id:votre_key_secret"
  python3 scripts/higgsfield_generate_assets.py
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request

API_BASE = "https://api.higgsfield.ai"
IMAGE_MODEL_PATH = "/higgsfield-ai/soul/v2/standard"

PROMPTS = {
    "sand_beach.jpg": (
        "Seamless top-down game texture of warm golden Caribbean beach sand with subtle wind ripples, "
        "tiny colorful seashells, coral fragments, and warm tropical sunlight, stylized hand-painted "
        "pirate adventure game art style like Sea of Thieves, ultra-crisp details, vibrant golden-yellow tones."
    ),
    "coastal_rock.jpg": (
        "Seamless top-down game texture of stylized weathered coastal slate rock and jagged sea cliff stone "
        "with subtle emerald moss and tide-worn crevices, hand-painted pirate adventure game art style like "
        "Sea of Thieves, high contrast, rich slate grey and warm stone tones."
    ),
    "wood_planks.jpg": (
        "Seamless top-down game texture of warm weathered pirate ship mahogany and oak wooden deck planks, "
        "rich golden-amber wood grain, subtle brass nail heads at plank ends, stylized hand-painted pirate "
        "game art like Sea of Thieves, warm inviting tavern wood."
    ),
    "compass_emblem.jpg": (
        "Top-down circular medallion illustration of an ornate golden pirate compass rose and skull emblem "
        "carved into warm ancient sandstone and mahogany wood, surrounded by gleaming golden doubloons and "
        "nautical map markings, vibrant hand-painted Sea of Thieves art style, centered composition."
    ),
    "captains_sheet.jpg": (
        "2x2 grid of 4 square character portrait illustrations of charismatic pirate captains in stylized "
        "hand-painted Sea of Thieves art style: top-left fearless red-coat pirate captain with tricorn hat; "
        "top-right clever female pirate navigator with turquoise bandana and spyglass; bottom-left rugged "
        "corsair gunner with emerald bandana and golden beard rings; bottom-right mysterious voodoo pirate "
        "queen with purple feathered hat and glowing amulet. Clean 2x2 split."
    ),
}


def generate_single_asset(api_key: str, filename: str, prompt: str) -> str:
    headers = {
        "Authorization": f"Key {api_key}" if not api_key.lower().startswith("key ") else api_key,
        "Content-Type": "application/json",
        "User-Agent": "PiratesPlunder/1.0",
    }
    print(f"[Higgsfield] Lancement de {filename}...")
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
                pub_path = os.path.join("public/assets", filename)
                src_path = os.path.join("src/assets", filename)
                dl_req = urllib.request.Request(img_url, headers={"User-Agent": "PiratesPlunder/1.0"})
                with urllib.request.urlopen(dl_req, timeout=45) as img_resp, open(pub_path, "wb") as out_f:
                    out_f.write(img_resp.read())
                shutil.copyfile(pub_path, src_path)
                print(f"  -> {filename} téléchargé et enregistré ({os.path.getsize(pub_path)} octets)")
                return pub_path
            raise RuntimeError(f"Réponse terminée sans URL d'image pour {filename}: {status_data}")
        if status in ("failed", "canceled", "error"):
            raise RuntimeError(f"Échec de génération Higgsfield pour {filename}: {status_data}")


def main() -> int:
    api_key = os.environ.get("HIGGSFIELD_API_KEY", "").strip()
    if not api_key:
        print("Erreur : définissez HIGGSFIELD_API_KEY='key_id:key_secret'", file=sys.stderr)
        return 1

    os.makedirs("public/assets", exist_ok=True)
    os.makedirs("src/assets", exist_ok=True)

    errors = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {
            pool.submit(generate_single_asset, api_key, fname, prompt): fname
            for fname, prompt in PROMPTS.items()
        }
        for fut in as_completed(futures):
            fname = futures[fut]
            try:
                fut.result()
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="replace")
                print(f"Erreur HTTP {e.code} sur {fname} : {err_body}", file=sys.stderr)
                errors.append(fname)
            except Exception as e:
                print(f"Erreur sur {fname} : {e}", file=sys.stderr)
                errors.append(fname)

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
