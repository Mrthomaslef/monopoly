#!/usr/bin/env python3
"""
Génère les assets des cases du plateau :
  - textures de sol (Higgsfield Soul V2) -> public/assets/tile_<thème>.jpg
  - images d'objets (Higgsfield Recraft V4.1 Pro) -> <work>/concept_<thème>.png
  - maillages GLB bruts (Atlas Cloud, Hunyuan 3D Pro) -> <work>/raw_<thème>.glb

Variables requises : HIGGSFIELD_API_KEY, ATLASCLOUD_API_KEY.
Les fichiers déjà présents sont conservés, donc relancer le script ne repaie pas ce qui existe.
Pour régénérer un élément, supprimer son fichier.

Usage : generate_tile_models.py [--work DIR] [--only temple,port] [--stage textures,concepts,meshes]
L'optimisation des GLB pour le jeu est faite ensuite par scripts/optimize_tile_models.sh.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse
import base64
import io
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request

from PIL import Image, ImageOps

HF_API = "https://api.higgsfield.ai"
HF_OBJECT_MODEL = "/recraft/v4.1/pro/text-to-image"
HF_GROUND_MODEL = "/higgsfield-ai/soul/v2/standard"
ATLAS_API = "https://api.atlascloud.ai/api/v1/model"
ATLAS_MESH_MODEL = "tencent/hunyuan3d-pro/image-to-3d"
USER_AGENT = "PiratesPlunder/1.0"
POLL_TIMEOUT_S = 900

OBJECT_STYLE = (
    "Stylized hand-painted 3D game asset in the style of Sea of Thieves, chunky readable shapes, rich saturated "
    "colors, three-quarter view from slightly above, the entire object visible and centered, filling most of the "
    "frame, single compact object with a small natural base, on a pure plain white background, soft even studio "
    "lighting, no cast shadow, no floor, no text."
)

OBJECT_PROMPTS = {
    "plage": "Two leaning coconut palm trees growing from a small golden sand mound, with a weathered wooden signpost and a red crab.",
    "lagon": "A giant open clam shell holding a glowing white pearl, flanked by pink and turquoise coral branches on a small reef rock.",
    "falaise": "A dark slate stone pirate watchtower standing on a wide, massive jagged coastal rock that sits flat on the ground and is wider at the bottom than at the top, with two brass cannons pointing outward.",
    "temple": "An ancient stepped mossy jade stone Mayan temple with a central staircase and a golden fire brazier on top.",
    "volcan": "A small dramatic dark basalt volcano cone with glowing emerald-green lava in its crater and bright green fissures down its sides.",
    "eldorado": "A gleaming stepped golden El Dorado pyramid topped with a large red ruby crystal, with piles of gold coins at its base.",
    "port": "A pirate harbor lighthouse with red and cream stripes, a glowing golden lantern room, on a stone quay base with a coiled rope and a mooring post.",
    "taverne": "A cozy small wooden pirate tavern with a red shingle roof, warm glowing amber windows, a hanging sign without lettering, and two rum barrels by the door.",
    "tresor": "An ornate wooden and brass pirate treasure chest, wide open and overflowing with gold doubloons and jewels.",
    "malediction": "Purple kraken tentacles coiling around a glowing violet crystal obelisk on a dark rock.",
}

GROUND_STYLE = (
    "Deep rich saturated colors. Top-down orthographic seamless ground material texture for a video game, even "
    "lighting, flat surface filling the frame edge to edge, uniform detail, no perspective, no border, no large "
    "objects, no text."
)

GROUND_PROMPTS = {
    "plage": "Warm golden beach sand with soft wind ripples, small scattered seashells and fine pebbles.",
    "lagon": "Shallow turquoise water over pale coral sand, with soft sunlight caustics and tiny pink and teal coral pebbles.",
    "falaise": "Weathered blue-grey slate rock slabs with natural cracks and small coastal gravel.",
    "temple": "Ancient jade-green irregular flagstones with moss growing in the joints.",
    "volcan": "Cracked black basalt plates with thin glowing emerald-green magma veins between them.",
    "eldorado": "Sun-warmed sandstone pavers with carved geometric gold inlays and golden dust in the joints.",
    "port": "Rounded grey harbor cobblestones with worn joints and patches of damp sand.",
    "taverne": "Weathered warm oak deck planks running in one direction, with brass nails and sand in the seams.",
    "tresor": "Rich amber-gold sand with a few half-buried gold doubloons lying flat and tiny shells.",
    "malediction": "Dark obsidian reef rock with faint glowing violet cracks and fine purple mineral specks.",
}


def fetch_json(req: urllib.request.Request, timeout: int = 60) -> dict:
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", "replace")[:600]
        raise RuntimeError(f"HTTP {err.code} sur {req.full_url}: {body}") from err


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=300) as resp:
        return resp.read()


def higgsfield_image(model_path: str, body: dict) -> bytes:
    key = os.environ["HIGGSFIELD_API_KEY"].strip()
    headers = {
        "Authorization": key if key.lower().startswith("key ") else f"Key {key}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    }
    job = fetch_json(
        urllib.request.Request(
            f"{HF_API}{model_path}", data=json.dumps(body).encode(), headers=headers, method="POST"
        )
    )
    status_url = job.get("status_url") or f"{HF_API}/requests/{job['request_id']}/status"
    deadline = time.time() + POLL_TIMEOUT_S
    while time.time() < deadline:
        time.sleep(4)
        state = fetch_json(urllib.request.Request(status_url, headers=headers))
        status = state.get("status")
        if status in ("completed", "succeeded"):
            images = state.get("images") or state.get("output", {}).get("images", [])
            if not images:
                raise RuntimeError(f"Réponse Higgsfield sans image : {state}")
            first = images[0]
            return download(first["url"] if isinstance(first, dict) else first)
        if status in ("failed", "canceled", "error", "nsfw"):
            raise RuntimeError(f"Échec Higgsfield : {state}")
    raise TimeoutError("Higgsfield : délai dépassé")


def atlas_mesh(image_png: bytes) -> tuple[bytes, bytes | None]:
    headers = {
        "Authorization": f"Bearer {os.environ['ATLASCLOUD_API_KEY'].strip()}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    }
    body = {
        "model": ATLAS_MESH_MODEL,
        "image": "data:image/png;base64," + base64.b64encode(image_png).decode(),
        "generate_type": "Normal",
        "enable_pbr": False,
        "face_count": 40000,
    }
    job = fetch_json(
        urllib.request.Request(
            f"{ATLAS_API}/generateImage", data=json.dumps(body).encode(), headers=headers, method="POST"
        )
    )
    prediction_id = job.get("data", job)["id"]
    deadline = time.time() + POLL_TIMEOUT_S
    while time.time() < deadline:
        time.sleep(8)
        state = fetch_json(urllib.request.Request(f"{ATLAS_API}/prediction/{prediction_id}", headers=headers))
        state = state.get("data", state)
        status = state.get("status")
        if status in ("completed", "succeeded"):
            files = state.get("files") or []
            glb = next((f["url"] for f in files if str(f.get("type", "")).upper() == "GLB"), None)
            glb = glb or next((u for u in state.get("outputs", []) if ".glb" in u.lower()), None)
            if not glb:
                raise RuntimeError(f"Réponse Atlas sans GLB : {json.dumps(state)[:600]}")
            thumb = state.get("thumbnail")
            return download(glb), download(thumb) if thumb else None
        if status == "failed":
            raise RuntimeError(f"Échec Atlas : {json.dumps(state)[:600]}")
    raise TimeoutError("Atlas : délai dépassé")


def make_texture(theme: str, _work: str) -> str:
    out = f"public/assets/tile_{theme}.jpg"
    marker = os.path.join(_work, f"ground_{theme}.done")
    if os.path.exists(marker):
        return f"{out} (déjà générée)"
    raw = higgsfield_image(HF_GROUND_MODEL, {"prompt": f"{GROUND_PROMPTS[theme]} {GROUND_STYLE}"})
    # Soul V2 renvoie du 4:3 : on recadre au centre pour garder des proportions justes sur la case.
    img = ImageOps.fit(Image.open(io.BytesIO(raw)).convert("RGB"), (1024, 1024), Image.Resampling.LANCZOS)
    img.save(out, format="JPEG", quality=85, optimize=True)
    shutil.copyfile(out, f"src/assets/tile_{theme}.jpg")
    open(marker, "w").close()
    return out


def make_concept(theme: str, work: str) -> str:
    out = os.path.join(work, f"concept_{theme}.png")
    if os.path.exists(out):
        return f"{out} (déjà générée)"
    raw = higgsfield_image(
        HF_OBJECT_MODEL,
        {
            "prompt": f"{OBJECT_PROMPTS[theme]} {OBJECT_STYLE}",
            "resolution": "2k",
            "aspect_ratio": "1:1",
            "output_format": "png",
        },
    )
    img = Image.open(io.BytesIO(raw)).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    img.save(out, format="PNG", optimize=True)
    return out


def make_mesh(theme: str, work: str) -> str:
    out = os.path.join(work, f"raw_{theme}.glb")
    if os.path.exists(out):
        return f"{out} (déjà généré)"
    with open(os.path.join(work, f"concept_{theme}.png"), "rb") as f:
        glb, thumb = atlas_mesh(f.read())
    with open(out, "wb") as f:
        f.write(glb)
    if thumb:
        with open(os.path.join(work, f"thumb_{theme}.img"), "wb") as f:
            f.write(thumb)
    return out


STAGES = {"textures": make_texture, "concepts": make_concept, "meshes": make_mesh}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--work", default="/tmp/tilegen")
    parser.add_argument("--only", default=",".join(OBJECT_PROMPTS))
    parser.add_argument("--stage", default="textures,concepts,meshes")
    args = parser.parse_args()
    themes = args.only.split(",")
    os.makedirs(args.work, exist_ok=True)

    failed = 0
    for stage in args.stage.split(","):
        with ThreadPoolExecutor(max_workers=5) as pool:
            futures = {pool.submit(STAGES[stage], t, args.work): t for t in themes}
            for fut in as_completed(futures):
                try:
                    print(f"[{stage}] {futures[fut]}: {fut.result()}", flush=True)
                except Exception as err:
                    failed += 1
                    print(f"[{stage}] {futures[fut]}: ERREUR {err}", file=sys.stderr, flush=True)
        if failed:
            break
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
