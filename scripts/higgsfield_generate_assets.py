#!/usr/bin/env python3
"""
Script de génération des textures et portraits de Pirate's Plunder via l'API Higgsfield (https://api.higgsfield.ai).
Usage :
  export HIGGSFIELD_API_KEY="votre_key_id:votre_key_secret"
  python3 scripts/higgsfield_generate_assets.py
"""
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
        "tiny seashells, and warm sunlight, stylized hand-painted 3D game art style like Sea of Thieves, "
        "high resolution, vibrant warm yellow-gold tones, no shadows at edges."
    ),
    "coastal_rock.jpg": (
        "Seamless top-down game texture of stylized weathered coastal slate rock and sea cliff stone "
        "with subtle moss and tide-worn crevices, hand-painted 3D pirate game art style like Sea of Thieves, "
        "high resolution, slate grey and warm stone tones."
    ),
    "wood_planks.jpg": (
        "Seamless top-down game texture of warm weathered pirate ship mahogany and oak wooden deck planks, "
        "rich golden-amber wood grain, stylized hand-painted 3D game art like Sea of Thieves, high resolution."
    ),
    "compass_emblem.jpg": (
        "Top-down circular medallion illustration of an ornate golden pirate compass rose carved into warm "
        "ancient sandstone and mahogany wood, surrounded by golden doubloons, Sea of Thieves art style."
    ),
}


def generate_image(api_key: str, prompt: str) -> str:
    headers = {
        "Authorization": f"Key {api_key}" if not api_key.lower().startswith("key ") else api_key,
        "Content-Type": "application/json",
        "User-Agent": "PiratesPlunder/1.0",
    }
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
        print(f"  Statut Higgsfield : {status}")
        if status in ("completed", "succeeded"):
            images = status_data.get("images") or status_data.get("output", {}).get("images", [])
            if images:
                return images[0].get("url") if isinstance(images[0], dict) else images[0]
            raise RuntimeError(f"Réponse terminée sans URL d'image : {status_data}")
        if status in ("failed", "canceled", "error"):
            raise RuntimeError(f"Échec de génération Higgsfield : {status_data}")


def main() -> int:
    api_key = os.environ.get("HIGGSFIELD_API_KEY", "").strip()
    if not api_key:
        print("Erreur : définissez HIGGSFIELD_API_KEY='key_id:key_secret'", file=sys.stderr)
        return 1

    os.makedirs("public/assets", exist_ok=True)
    os.makedirs("src/assets", exist_ok=True)
    for filename, prompt in PROMPTS.items():
        print(f"Génération de {filename} sur Higgsfield Soul V2...")
        try:
            img_url = generate_image(api_key, prompt)
            pub_path = os.path.join("public/assets", filename)
            src_path = os.path.join("src/assets", filename)
            urllib.request.urlretrieve(img_url, pub_path)
            shutil.copyfile(pub_path, src_path)
            print(f"  -> Enregistré dans {pub_path} et {src_path}")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            print(f"Erreur HTTP {e.code} depuis api.higgsfield.ai : {err_body}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
