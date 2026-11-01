#!/usr/bin/env python3
"""
Construit un vrai modèle 3D de Crâne Pirate (Grotte du Crâne) en 3D complète (X, Y, Z)
pour l'île centrale du trésor :
1. Extrait le maillage 3D anatomique haute précision du crâne (POSITION, NORMAL, TEXCOORD_0)
   ainsi que sa carte d'Ambient Occlusion 3D (AO-thickness).
2. Simplifie/optimise le maillage par clustering spatial 3D (grille fine) avec recalcul
   des normales lissées pour un fichier .glb léger (~850 Ko) et ultra-fluide sur mobile.
3. Génère la texture UV PBR du crâne (public/assets/skull_3d_albedo.jpg) en fusionnant
   la carte d'Ambient Occlusion 3D du crâne avec la texture de pierre/roche pirate générée par Higgsfield.
"""
import io
import json
import math
import os
import shutil
import struct
from PIL import Image, ImageChops, ImageEnhance

SOURCE_GLB = "/tmp/ScatteringSkull.glb"


def normalize_v3(vx: float, vy: float, vz: float) -> tuple[float, float, float]:
    l = math.sqrt(vx * vx + vy * vy + vz * vz)
    if l < 1e-8:
        return (0.0, 1.0, 0.0)
    return (vx / l, vy / l, vz / l)


def build_glb_bytes(
    positions: list[tuple[float, float, float]],
    normals: list[tuple[float, float, float]],
    uvs: list[tuple[float, float]],
    indices: list[int],
) -> bytes:
    pos_bin = bytearray()
    min_x = min_y = min_z = 1e9
    max_x = max_y = max_z = -1e9
    for px, py, pz in positions:
        pos_bin.extend(struct.pack("<fff", px, py, pz))
        if px < min_x:
            min_x = px
        if py < min_y:
            min_y = py
        if pz < min_z:
            min_z = pz
        if px > max_x:
            max_x = px
        if py > max_y:
            max_y = py
        if pz > max_z:
            max_z = pz

    norm_bin = bytearray()
    for nx, ny, nz in normals:
        norm_bin.extend(struct.pack("<fff", nx, ny, nz))

    uv_bin = bytearray()
    for u, v in uvs:
        uv_bin.extend(struct.pack("<ff", u, v))

    idx_bin = bytearray()
    for idx in indices:
        idx_bin.extend(struct.pack("<I", idx))

    def pad4(b: bytearray) -> bytes:
        rem = len(b) % 4
        if rem:
            b.extend(b"\x00" * (4 - rem))
        return bytes(b)

    pos_bytes = pad4(pos_bin)
    norm_bytes = pad4(norm_bin)
    uv_bytes = pad4(uv_bin)
    idx_bytes = pad4(idx_bin)

    offset_pos = 0
    offset_norm = offset_pos + len(pos_bytes)
    offset_uv = offset_norm + len(norm_bytes)
    offset_idx = offset_uv + len(uv_bytes)
    total_bin_len = offset_idx + len(idx_bytes)

    bin_chunk_data = pos_bytes + norm_bytes + uv_bytes + idx_bytes

    gltf_dict = {
        "asset": {"version": "2.0", "generator": "PiratesPlunder3DSkullBuilder"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "HiggsfieldSkullCave3D"}],
        "meshes": [
            {
                "name": "HiggsfieldSkullCave3D",
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": 0,
                            "NORMAL": 1,
                            "TEXCOORD_0": 2,
                        },
                        "indices": 3,
                        "mode": 4,
                    }
                ],
            }
        ],
        "buffers": [{"byteLength": total_bin_len}],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": offset_pos,
                "byteLength": len(pos_bytes),
                "target": 34962,
            },
            {
                "buffer": 0,
                "byteOffset": offset_norm,
                "byteLength": len(norm_bytes),
                "target": 34962,
            },
            {
                "buffer": 0,
                "byteOffset": offset_uv,
                "byteLength": len(uv_bytes),
                "target": 34962,
            },
            {
                "buffer": 0,
                "byteOffset": offset_idx,
                "byteLength": len(idx_bytes),
                "target": 34963,
            },
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(positions),
                "type": "VEC3",
                "min": [min_x, min_y, min_z],
                "max": [max_x, max_y, max_z],
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(normals),
                "type": "VEC3",
            },
            {
                "bufferView": 2,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(uvs),
                "type": "VEC2",
            },
            {
                "bufferView": 3,
                "byteOffset": 0,
                "componentType": 5125,
                "count": len(indices),
                "type": "SCALAR",
            },
        ],
    }

    json_bytes = json.dumps(gltf_dict, separators=(",", ":")).encode("utf-8")
    rem = len(json_bytes) % 4
    if rem:
        json_bytes += b" " * (4 - rem)

    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_chunk_data)
    header = struct.pack("<III", 0x46546C67, 2, total_length)
    json_chunk_header = struct.pack("<II", len(json_bytes), 0x4E4F534A)
    bin_chunk_header = struct.pack("<II", len(bin_chunk_data), 0x004E4942)

    return header + json_chunk_header + json_bytes + bin_chunk_header + bin_chunk_data


def main() -> None:
    with open(SOURCE_GLB, "rb") as f:
        magic, ver, length = struct.unpack("<III", f.read(12))
        jlen, jtype = struct.unpack("<II", f.read(8))
        jdata = json.loads(f.read(jlen).decode("utf-8"))
        blen, btype = struct.unpack("<II", f.read(8))
        bdata = f.read(blen)

    prim = jdata["meshes"][0]["primitives"][0]
    acc_pos = jdata["accessors"][prim["attributes"]["POSITION"]]
    acc_norm = jdata["accessors"][prim["attributes"]["NORMAL"]]
    acc_uv = jdata["accessors"][prim["attributes"]["TEXCOORD_0"]]
    acc_idx = jdata["accessors"][prim["indices"]]

    bv_pos = jdata["bufferViews"][acc_pos["bufferView"]]
    bv_norm = jdata["bufferViews"][acc_norm["bufferView"]]
    bv_uv = jdata["bufferViews"][acc_uv["bufferView"]]
    bv_idx = jdata["bufferViews"][acc_idx["bufferView"]]

    v_count = acc_pos["count"]
    raw_pos = []
    raw_norm = []
    raw_uv = []

    pos_off = bv_pos.get("byteOffset", 0)
    norm_off = bv_norm.get("byteOffset", 0)
    uv_off = bv_uv.get("byteOffset", 0)

    for i in range(v_count):
        raw_pos.append(struct.unpack_from("<fff", bdata, pos_off + i * 12))
        raw_norm.append(struct.unpack_from("<fff", bdata, norm_off + i * 12))
        raw_uv.append(struct.unpack_from("<ff", bdata, uv_off + i * 8))

    idx_off = bv_idx.get("byteOffset", 0)
    i_count = acc_idx["count"]
    raw_indices = [
        struct.unpack_from("<I", bdata, idx_off + i * 4)[0] for i in range(i_count)
    ]

    # 1. Extraire la carte d'Ambient Occlusion 3D intégrée (bv 5) et créer la texture PBR pierre/os doré
    bv_img = jdata["bufferViews"][jdata["images"][0]["bufferView"]]
    img_bytes = bdata[bv_img["byteOffset"] : bv_img["byteOffset"] + bv_img["byteLength"]]
    ao_img = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    # Le canal R contient l'Ambient Occlusion cuite du crâne 3D
    r_ch, g_ch, _ = ao_img.split()
    ao_enh = ImageEnhance.Contrast(r_ch).enhance(1.35)

    # Mélanger avec la texture de pierre côtière / sable doré Higgsfield pour un aspect crâne de pierre pirate
    rock_img = Image.open("public/assets/coastal_rock.jpg").convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    sand_img = Image.open("public/assets/sand_beach.jpg").convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    stone_base = Image.blend(sand_img, rock_img, 0.38)
    stone_base = ImageEnhance.Brightness(stone_base).enhance(1.18)

    ao_rgb = Image.merge("RGB", (ao_enh, ao_enh, ao_enh))
    skull_albedo = ImageChops.multiply(stone_base, ao_rgb)
    skull_albedo = ImageEnhance.Contrast(skull_albedo).enhance(1.15)

    os.makedirs("public/assets", exist_ok=True)
    os.makedirs("dist/assets", exist_ok=True)
    albedo_pub = "public/assets/skull_3d_albedo.jpg"
    albedo_dist = "dist/assets/skull_3d_albedo.jpg"
    skull_albedo.save(albedo_pub, format="JPEG", quality=90, optimize=True)
    shutil.copyfile(albedo_pub, albedo_dist)

    # 2. Normaliser et centrer les coordonnées 3D (X, Y, Z) du crâne
    xs = [p[0] for p in raw_pos]
    ys = [p[1] for p in raw_pos]
    zs = [p[2] for p in raw_pos]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    min_z, max_z = min(zs), max(zs)

    cx = (min_x + max_x) * 0.5
    cy = min_y  # Poser la base de la mâchoire du crâne exactement à Y = 0
    cz = (min_z + max_z) * 0.5
    span = max(max_x - min_x, max_y - min_y, max_z - min_z)
    target_scale = 2.05 / span

    # 3. Décimation par clustering sur grille 3D fine + UV pour conserver chaque détail
    #    (orbites, cavité nasale, dents, pommettes, sutures) tout en réduisant le poids du .glb
    CELL_RES = 88.0
    cluster_map: dict[tuple[int, int, int, int, int], int] = {}
    cluster_pos_sum: list[list[float]] = []
    cluster_norm_sum: list[list[float]] = []
    cluster_uv: list[tuple[float, float]] = []
    vertex_remap = [0] * v_count

    for i in range(v_count):
        px, py, pz = raw_pos[i]
        nx, ny, nz = raw_norm[i]
        u, v = raw_uv[i]

        sx = (px - cx) * target_scale
        sy = (py - cy) * target_scale
        sz = (pz - cz) * target_scale

        gx = int(round((px - min_x) / span * CELL_RES))
        gy = int(round((py - min_y) / span * CELL_RES))
        gz = int(round((pz - min_z) / span * CELL_RES))
        # Séparer les coutures UV éventuelles
        gu = int(round(u * 12.0))
        gv = int(round(v * 12.0))
        key = (gx, gy, gz, gu, gv)

        c_idx = cluster_map.get(key)
        if c_idx is None:
            c_idx = len(cluster_pos_sum)
            cluster_map[key] = c_idx
            cluster_pos_sum.append([sx, sy, sz, 1.0])
            cluster_norm_sum.append([nx, ny, nz])
            # Inverser V pour correspondre à Three.js TextureLoader (flipY=true par défaut)
            cluster_uv.append((u, 1.0 - v))
        else:
            cluster_pos_sum[c_idx][0] += sx
            cluster_pos_sum[c_idx][1] += sy
            cluster_pos_sum[c_idx][2] += sz
            cluster_pos_sum[c_idx][3] += 1.0
            cluster_norm_sum[c_idx][0] += nx
            cluster_norm_sum[c_idx][1] += ny
            cluster_norm_sum[c_idx][2] += nz

        vertex_remap[i] = c_idx

    out_positions: list[tuple[float, float, float]] = []
    out_normals: list[tuple[float, float, float]] = []
    for c_idx in range(len(cluster_pos_sum)):
        sx, sy, sz, cnt = cluster_pos_sum[c_idx]
        out_positions.append((sx / cnt, sy / cnt, sz / cnt))
        nx, ny, nz = cluster_norm_sum[c_idx]
        out_normals.append(normalize_v3(nx, ny, nz))

    out_indices: list[int] = []
    for t in range(0, i_count, 3):
        i0 = vertex_remap[raw_indices[t]]
        i1 = vertex_remap[raw_indices[t + 1]]
        i2 = vertex_remap[raw_indices[t + 2]]
        if i0 != i1 and i1 != i2 and i2 != i0:
            out_indices.extend([i0, i1, i2])

    glb_bytes = build_glb_bytes(out_positions, out_normals, cluster_uv, out_indices)
    pub_glb = "public/assets/center_skull_cave.glb"
    dist_glb = "dist/assets/center_skull_cave.glb"
    with open(pub_glb, "wb") as f:
        f.write(glb_bytes)
    shutil.copyfile(pub_glb, dist_glb)

    print(
        f"[Real 3D Skull GLB] Généré : {pub_glb} "
        f"({len(out_positions)} sommets 3D, {len(out_indices) // 3} triangles, {len(glb_bytes) // 1024} Ko)"
    )


if __name__ == "__main__":
    main()
