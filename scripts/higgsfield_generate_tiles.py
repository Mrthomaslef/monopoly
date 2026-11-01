#!/usr/bin/env python3
"""
Génère les 10 illustrations d'îles de cases (terrains distincts) via l'API Higgsfield Soul V2.
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

TILE_PROMPTS = {
    "tile_plage.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of a sunny Caribbean sandy beach cove, "
        "golden sand shore with gentle turquoise waves and white sea foam around a circular island, "
        "two leaning coconut palm trees, a small weathered wooden pirate shipwreck hull on the sand, "
        "stylized hand-painted video game art like Sea of Thieves, vibrant colors, clean uncluttered composition, no text."
    ),
    "tile_lagon.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of a tropical coral atoll island, "
        "golden ring of sand enclosing a glowing crystal-clear turquoise inner lagoon pool, vibrant pink and "
        "cyan coral reefs, a giant open clam shell with a glowing white pearl, surrounded by turquoise sea foam, "
        "stylized hand-painted Sea of Thieves game art, clean uncluttered composition, no text."
    ),
    "tile_falaise.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of a rugged dark slate rocky cliff island, "
        "jagged coastal boulders and sea stacks battered by white ocean surf, a weathered stone pirate bastion "
        "with iron cannons on the cliff top, stylized hand-painted Sea of Thieves game art, dramatic lighting, "
        "clean uncluttered composition, no text."
    ),
    "tile_temple.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of a lush tropical jungle island with "
        "a stepped ancient moss-covered jade stone temple sanctuary in the center, glowing golden brazier, "
        "tropical palm fronds and exotic ferns, sandy and rocky shore surrounded by turquoise water, "
        "stylized hand-painted Sea of Thieves game art, clean uncluttered composition, no text."
    ),
    "tile_volcan.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of a dark basalt volcanic island, "
        "a dramatic volcano cone in the center with a glowing emerald-green lava crater and fissures, "
        "black volcanic rock coastline surrounded by steaming turquoise sea foam, stylized hand-painted "
        "Sea of Thieves game art, clean uncluttered composition, no text."
    ),
    "tile_eldorado.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of a legendary El Dorado golden citadel island, "
        "an ornate stepped golden pyramid temple gleaming in warm sunlight, piles of gold doubloons and red rubies, "
        "golden palm trees on a sandy cove with rocky headlands, stylized hand-painted Sea of Thieves game art, "
        "clean uncluttered composition, no text."
    ),
    "tile_port.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of Port Royal pirate harbor island, "
        "a classic red-and-white striped stone lighthouse with a glowing golden beacon, cobblestone quay, "
        "wooden pier and harbor arch on a sandy bay, stylized hand-painted Sea of Thieves game art, "
        "clean uncluttered composition, no text."
    ),
    "tile_taverne.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of Tortuga pirate tavern island, "
        "a warm wooden timber pirate inn with glowing amber tavern windows, oak rum barrels on a wooden deck, "
        "coconut palms on a golden sandy beach surrounded by turquoise water, stylized hand-painted "
        "Sea of Thieves game art, clean uncluttered composition, no text."
    ),
    "tile_tresor.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of a small Caribbean treasure islet, "
        "a single large ornate wooden and brass pirate treasure chest wide open and overflowing with gleaming "
        "gold coins and jewels in the center of a clean golden sandbank with one palm tree, "
        "stylized hand-painted Sea of Thieves game art, clean uncluttered composition, no text."
    ),
    "tile_malediction.jpg": (
        "Top-down 3/4 isometric board game island tile illustration of a mysterious cursed sea reef island, "
        "dark jagged obsidian rocks rising from swirling purple and turquoise water, a glowing levitating "
        "violet voodoo crystal monolith and giant purple Kraken tentacles coiling around the rocky shore, "
        "stylized hand-painted Sea of Thieves game art, clean uncluttered composition, no text."
    ),
}


def generate_single_tile(api_key: str, filename: str, prompt: str) -> str:
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
                print(f"  -> {filename} enregistré ({os.path.getsize(pub_path)} octets)")
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
            pool.submit(generate_single_tile, api_key, fname, prompt): fname
            for fname, prompt in TILE_PROMPTS.items()
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
