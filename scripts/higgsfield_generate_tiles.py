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
        "Pure top-down 90-degree overhead game ground texture of a sunny Caribbean sandy beach terrain, "
        "warm golden sand with soft wind ripples, a few tiny seashells and wet sand at the edges, "
        "flat walkable ground surface filling the entire frame, Sea of Thieves stylized hand-painted texture, "
        "NO buildings, NO palm trees, NO objects, NO ships, NO text."
    ),
    "tile_lagon.jpg": (
        "Pure top-down 90-degree overhead game ground texture of a shallow tropical coral lagoon floor, "
        "crystal-clear turquoise shallow water over white coral sand, small colorful pink and cyan coral pebbles, "
        "caustic sunlight ripples, flat walkable ground surface filling the entire frame, Sea of Thieves stylized "
        "hand-painted texture, NO giant clam, NO buildings, NO objects, NO text."
    ),
    "tile_falaise.jpg": (
        "Pure top-down 90-degree overhead game ground texture of rugged dark slate coastal cliff rock terrain, "
        "weathered grey-blue stone slabs, natural rock cracks and coastal pebbles, flat walkable rock surface "
        "filling the entire frame, Sea of Thieves stylized hand-painted texture, NO buildings, NO towers, "
        "NO cannons, NO objects, NO text."
    ),
    "tile_temple.jpg": (
        "Pure top-down 90-degree overhead game ground texture of ancient jungle temple courtyard flagstones, "
        "weathered jade-green stone floor tiles overgrown with lush green moss and small tropical fern leaves "
        "in the cracks, flat walkable ground surface filling the entire frame, Sea of Thieves stylized "
        "hand-painted texture, NO pyramid, NO buildings, NO objects, NO text."
    ),
    "tile_volcan.jpg": (
        "Pure top-down 90-degree overhead game ground texture of dark volcanic basalt ground terrain, "
        "cracked black obsidian and charcoal lava rock surface with subtle glowing emerald-green magma fissures "
        "in the cracks, flat walkable ground surface filling the entire frame, Sea of Thieves stylized "
        "hand-painted texture, NO volcano cone, NO buildings, NO objects, NO text."
    ),
    "tile_eldorado.jpg": (
        "Pure top-down 90-degree overhead game ground texture of legendary El Dorado golden courtyard pavement, "
        "ornate sun-warmed sandstone and carved golden floor flagstones with ancient geometric gold inlays "
        "and golden sand dust, flat walkable ground surface filling the entire frame, Sea of Thieves stylized "
        "hand-painted texture, NO pyramid, NO buildings, NO chests, NO objects, NO text."
    ),
    "tile_port.jpg": (
        "Pure top-down 90-degree overhead game ground texture of Port Royal pirate harbor quay ground, "
        "weathered colonial stone cobblestones blended with aged oak harbor pier planks, flat walkable ground "
        "surface filling the entire frame, Sea of Thieves stylized hand-painted texture, NO lighthouse, "
        "NO buildings, NO boats, NO objects, NO text."
    ),
    "tile_taverne.jpg": (
        "Pure top-down 90-degree overhead game ground texture of a pirate tavern boardwalk deck floor, "
        "warm weathered mahogany and oak wooden planks with brass nails and golden sand in the seams, "
        "flat walkable floor surface filling the entire frame, Sea of Thieves stylized hand-painted texture, "
        "NO buildings, NO barrels, NO furniture, NO objects, NO text."
    ),
    "tile_tresor.jpg": (
        "Pure top-down 90-degree overhead game ground texture of a golden Caribbean treasure island sandbank, "
        "warm shimmering amber-gold beach sand with a few tiny half-buried gold doubloons and small shells "
        "scattered flat in the sand, flat walkable ground surface filling the entire frame, Sea of Thieves "
        "stylized hand-painted texture, NO treasure chest, NO palm trees, NO large objects, NO text."
    ),
    "tile_malediction.jpg": (
        "Pure top-down 90-degree overhead game ground texture of a cursed dark abyssal reef rock floor, "
        "dark jagged obsidian stone ground etched with faint glowing violet mystic cracks and eerie purple mist, "
        "flat walkable ground surface filling the entire frame, Sea of Thieves stylized hand-painted texture, "
        "NO monolith, NO tentacles, NO buildings, NO objects, NO text."
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
