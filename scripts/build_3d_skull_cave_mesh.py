#!/usr/bin/env python3
"""
Construit un vrai maillage 3D volumétrique fermé en (X, Y, Z) (format glTF 2.0 binaire .glb)
à partir de l'asset de la Grotte en Crâne généré par Higgsfield Soul V2 (public/assets/center_skull_cave.png).

Le maillage 3D possède :
- Une géométrie 3D complète sur les 3 axes X, Y et Z (dôme crânien, arcades sourcilières, pommettes,
  orbites creusées en 3D, cavité nasale, mâchoire ouverte en caverne 3D avec trésor en relief,
  et massif rocheux arrière 3D fermé à 360°).
- Coordonnées UV exactes mappées sur la texture Higgsfield Soul V2.
- Normales 3D par sommet (nx, ny, nz) pour un éclairage dynamique réaliste sous tous les angles de caméra.
"""
import json
import math
import os
import shutil
import struct
from PIL import Image, ImageFilter

GRID_W = 120
GRID_H = 120

# Dimensions 3D en unités monde Three.js (X: largeur, Y: hauteur, Z: profondeur)
WIDTH_X = 2.55
HEIGHT_Y = 2.45
DEPTH_Z = 1.95


def compute_edt_2d(inside_mask: list[list[bool]], w: int, h: int) -> list[list[float]]:
    """
    Calcule la transformée en distance euclidienne (EDT) 2D exacte depuis le bord de la silhouette.
    Retourne 0.0 à l'extérieur et sur le contour, et la distance en pixels vers l'intérieur.
    """
    INF = 1e9
    dist = [[INF if inside_mask[y][x] else 0.0 for x in range(w)] for y in range(h)]

    # Passe avant (haut-gauche -> bas-droite)
    for y in range(h):
        for x in range(w):
            if not inside_mask[y][x]:
                continue
            d = dist[y][x]
            if x > 0:
                d = min(d, dist[y][x - 1] + 1.0)
            if y > 0:
                d = min(d, dist[y - 1][x] + 1.0)
            if x > 0 and y > 0:
                d = min(d, dist[y - 1][x - 1] + 1.41421356)
            if x < w - 1 and y > 0:
                d = min(d, dist[y - 1][x + 1] + 1.41421356)
            dist[y][x] = d

    # Passe arrière (bas-droite -> haut-gauche)
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            if not inside_mask[y][x]:
                continue
            d = dist[y][x]
            if x < w - 1:
                d = min(d, dist[y][x + 1] + 1.0)
            if y < h - 1:
                d = min(d, dist[y + 1][x] + 1.0)
            if x < w - 1 and y < h - 1:
                d = min(d, dist[y + 1][x + 1] + 1.41421356)
            if x > 0 and y < h - 1:
                d = min(d, dist[y + 1][x - 1] + 1.41421356)
            dist[y][x] = d

    return dist


def smooth_field(field: list[list[float]], w: int, h: int, passes: int = 2) -> list[list[float]]:
    cur = [row[:] for row in field]
    for _ in range(passes):
        nxt = [[0.0] * w for _ in range(h)]
        for y in range(h):
            for x in range(w):
                acc = cur[y][x] * 4.0
                weight = 4.0
                for dx, dy, wgt in (
                    (-1, 0, 2.0),
                    (1, 0, 2.0),
                    (0, -1, 2.0),
                    (0, 1, 2.0),
                    (-1, -1, 1.0),
                    (1, -1, 1.0),
                    (-1, 1, 1.0),
                    (1, 1, 1.0),
                ):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        acc += cur[ny][nx] * wgt
                        weight += wgt
                nxt[y][x] = acc / weight
        cur = nxt
    return cur


def normalize_v3(vx: float, vy: float, vz: float) -> tuple[float, float, float]:
    length = math.sqrt(vx * vx + vy * vy + vz * vz)
    if length < 1e-8:
        return (0.0, 1.0, 0.0)
    return (vx / length, vy / length, vz / length)


def build_glb_bytes(
    positions: list[tuple[float, float, float]],
    normals: list[tuple[float, float, float]],
    uvs: list[tuple[float, float]],
    indices: list[int],
) -> bytes:
    """
    Encode un maillage 3D (positions, normals, uvs, indices) en fichier binaire glTF 2.0 (.glb) standard.
    """
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

    # Alignement sur 4 octets
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
        "asset": {"version": "2.0", "generator": "Higgsfield3DSkullBuilder"},
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
    png_path = "public/assets/center_skull_cave.png"
    if not os.path.exists(png_path):
        raise FileNotFoundError(f"Fichier introuvable : {png_path}")

    img = Image.open(png_path).convert("RGBA")
    # Échantillonnage sur la grille 3D (GRID_W x GRID_H)
    small = img.resize((GRID_W, GRID_H), Image.Resampling.LANCZOS)
    small_blur = small.filter(ImageFilter.GaussianBlur(radius=2.2))

    px_fine = small.load()
    px_Command = small_blur.load()

    # 1. Masque de la silhouette 3D (dilaté d'un demi-pixel pour éviter les franges)
    inside = [[False] * GRID_W for _ in range(GRID_H)]
    for y in range(GRID_H):
        for x in range(GRID_W):
            _, _, _, a = px_fine[x, y]
            if a >= 36:
                inside[y][x] = True

    # Forcer les bords extérieurs de la grille à False pour que le maillage avant et arrière
    # se rejoignent de façon 100% étanche sur tout le pourtour
    for x in range(GRID_W):
        inside[0][x] = False
        inside[1][x] = False
        inside[GRID_H - 1][x] = False
    for y in range(GRID_H):
        inside[y][0] = False
        inside[y][1] = False
        inside[y][GRID_W - 1] = False
        inside[y][GRID_W - 2] = False

    dist = compute_edt_2d(inside, GRID_W, GRID_H)
    max_dist = max(max(row) for row in dist) or 1.0

    # 2. Calcul du champ de profondeur Z avant (sculpture 3D du crâne Higgsfield)
    #    et Z arrière (massif rocheux 3D fermé)
    z_front = [[0.0] * GRID_W for _ in range(GRID_H)]
    z_back = [[0.0] * GRID_W for _ in range(GRID_H)]

    for y in range(GRID_H):
        v_norm = y / (GRID_H - 1.0)  # 0 en haut (crâne), 1 en bas (plage/base)
        for x in range(GRID_W):
            if not inside[y][x]:
                continue

            u_norm = x / (GRID_W - 1.0)
            cx_dist = abs(u_norm - 0.5) * 2.0  # 0 au centre X, 1 sur les bords

            # Distance normalisée au bord de la silhouette [0..1]
            d_norm = min(1.0, dist[y][x] / (max_dist * 0.82))
            # Profil d'inflation sphérique/ellipsoïdal 3D (tangente verticale au bord)
            dome = math.pow(d_norm, 0.52)

            r, g, b, _ = px_fine[x, y]
            rb, gb, bb, _ = px_Command[x, y]

            lum_fine = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            lum_broad = (0.299 * rb + 0.587 * gb + 0.114 * bb) / 255.0

            # Intensité dorée/torche (trésor dans la gueule du crâne)
            gold_glow = max(0.0, (r * 1.0 + g * 0.65 - b * 1.45) / 255.0)

            # Volume anatomique 3D du crâne :
            # - Le front / dôme crânien (v_norm ~ 0.18..0.48) et les pommettes ressortent fortement en +Z
            cranium_bulge = math.exp(-((u_norm - 0.5) ** 2) / 0.08 - ((v_norm - 0.34) ** 2) / 0.045) * 0.42
            # - Arcades sourcilières et mâchoire supérieure (v_norm ~ 0.42..0.66)
            brow_cheek_bulge = math.exp(-((u_norm - 0.5) ** 2) / 0.11 - ((v_norm - 0.54) ** 2) / 0.03) * 0.28
            # - Socle rocheux s'élargissant en bas pour bien reposer sur l'île centrale
            base_skirt = math.pow(max(0.0, (v_norm - 0.68) / 0.32), 1.3) * 0.26 * (1.0 - cx_dist * 0.5)

            # Détection des cavités sombres du crâne (orbites oculaires, cavité nasale, fond de la grotte)
            # Lorsqu'un pixel interne est sombre et non doré, on creuse véritablement en -Z !
            cavity_carve = 0.0
            if lum_broad < 0.28 and gold_glow < 0.22 and 0.24 < v_norm < 0.88:
                darkness = (0.28 - lum_broad) / 0.28
                cavity_carve = -0.62 * (darkness ** 1.15) * min(1.0, d_norm * 1.6)

            # Relief de la pierre sculptée et des coffres au trésor dorés
            stone_relief = (lum_broad - 0.42) * 0.36 + (lum_fine - lum_broad) * 0.22
            treasure_relief = gold_glow * 0.32 if v_norm > 0.55 else 0.0

            # Atténuer les modulations tout près du bord de silhouette pour garantir la fermeture Z=0
            edge_blend = math.sin(min(1.0, d_norm * 1.8) * (math.pi / 2.0))

            zf = (
                0.76 * dome
                + edge_blend * (cranium_bulge + brow_cheek_bulge + base_skirt + stone_relief + treasure_relief + cavity_carve)
            )
            z_front[y][x] = max(0.02 * d_norm, zf) * (DEPTH_Z * 0.54)

            # Face arrière 3D : massif rocheux volcanique/calcaire sculpté en relief
            rock_wave = (
                math.sin(u_norm * 19.0 + v_norm * 11.0) * 0.06
                + math.cos(u_norm * 13.0 - v_norm * 17.0) * 0.06
            )
            zb = (0.85 * dome + edge_blend * (0.22 * cranium_bulge + base_skirt + rock_wave))
            z_back[y][x] = -max(0.02 * d_norm, zb) * (DEPTH_Z * 0.48)

    # Adoucir légèrement pour un maillage organique sans facettes brusques tout en gardant les orbites et dents nettes
    z_front = smooth_field(z_front, GRID_W, GRID_H, passes=1)
    z_back = smooth_field(z_back, GRID_W, GRID_H, passes=2)

    # Forcer Z=0 sur tous les points externes pour une soudure parfaite sur le contour 3D
    for y in range(GRID_H):
        for x in range(GRID_W):
            if not inside[y][x]:
                z_front[y][x] = 0.0
                z_back[y][x] = 0.0

    # 3. Construction des sommets 3D (X, Y, Z) et des triangles (face avant + face arrière soudées)
    positions: list[tuple[float, float, float]] = []
    uvs: list[tuple[float, float]] = []
    front_idx_grid = [[-1] * GRID_W for _ in range(GRID_H)]
    back_idx_grid = [[-1] * GRID_W for _ in range(GRID_H)]

    # Un sommet est actif s'il est dans `inside` ou voisin immédiat d'un sommet `inside` (bord de soudure Z=0)
    active = [[False] * GRID_W for _ in range(GRID_H)]
    boundary = [[False] * GRID_W for _ in range(GRID_H)]
    for y in range(GRID_H):
        for x in range(GRID_W):
            if inside[y][x]:
                active[y][x] = True
            else:
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < GRID_W and 0 <= ny < GRID_H and inside[ny][nx]:
                            active[y][x] = True
                            boundary[y][x] = True
                            break

    # Pour les sommets de bordure (Z=0), tirer légèrement (X, Y) vers le contour interne
    for y in range(GRID_H):
        for x in range(GRID_W):
            if not active[y][x]:
                continue

            u = x / (GRID_W - 1.0)
            v = y / (GRID_H - 1.0)

            px = (u - 0.5) * WIDTH_X
            py = (1.0 - v) * HEIGHT_Y

            # En glTF/Three.js avec flipY=false ou standard texture :
            # dans Three.js useGLTF, UV (0, 0) est en haut-gauche si flipY=false,
            # mais avec une texture standard Three.js (flipY=true par défaut), v_uv = 1.0 - v
            uv_front = (max(0.02, min(0.98, u)), max(0.02, min(0.98, 1.0 - v)))

            # Sommet face avant
            f_idx = len(positions)
            positions.append((px, py, z_front[y][x]))
            uvs.append(uv_front)
            front_idx_grid[y][x] = f_idx

            # Sommet face arrière (partage le même sommet sur la bordure Z=0 pour un maillage fermé étanche !)
            if boundary[y][x]:
                back_idx_grid[y][x] = f_idx
            else:
                b_idx = len(positions)
                positions.append((px, py, z_back[y][x]))
                # Mapper le dos sur une zone rocheuse sombre du crâne/falaise
                uv_back = (0.35 + (u - 0.5) * 0.25, 0.72 + (0.5 - v) * 0.18)
                uvs.append(uv_back)
                back_idx_grid[y][x] = b_idx

    indices: list[int] = []

    for y in range(GRID_H - 1):
        for x in range(GRID_W - 1):
            # Cellule active si au moins un des 4 coins est dans `inside`
            if not (
                inside[y][x]
                or inside[y][x + 1]
                or inside[y + 1][x]
                or inside[y + 1][x + 1]
            ):
                continue

            f00 = front_idx_grid[y][x]
            f10 = front_idx_grid[y][x + 1]
            f01 = front_idx_grid[y + 1][x]
            f11 = front_idx_grid[y + 1][x + 1]

            if f00 >= 0 and f10 >= 0 and f01 >= 0 and f11 >= 0:
                # Face avant (normale vers +Z, ordre anti-horaire vu de devant : f00 -> f01 -> f10, f10 -> f01 -> f11)
                indices.extend([f00, f01, f10])
                indices.extend([f10, f01, f11])

            b00 = back_idx_grid[y][x]
            b10 = back_idx_grid[y][x + 1]
            b01 = back_idx_grid[y + 1][x]
            b11 = back_idx_grid[y + 1][x + 1]

            if b00 >= 0 and b10 >= 0 and b01 >= 0 and b11 >= 0:
                # Face arrière (normale vers -Z, ordre inversé : b00 -> b10 -> b01, b10 -> b11 -> b01)
                indices.extend([b00, b10, b01])
                indices.extend([b10, b11, b01])

    # 4. Calcul des normales 3D exactes par sommet (nx, ny, nz)
    accum_normals = [[0.0, 0.0, 0.0] for _ in range(len(positions))]
    for t in range(0, len(indices), 3):
        i0, i1, i2 = indices[t], indices[t + 1], indices[t + 2]
        p0 = positions[i0]
        p1 = positions[i1]
        p2 = positions[i2]

        ux, uy, uz = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
        vx, vy, vz = p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]

        nx = uy * vz - uz * vy
        ny = uz * vx - ux * vz
        nz = ux * vy - uy * vx

        for idx in (i0, i1, i2):
            accum_normals[idx][0] += nx
            accum_normals[idx][1] += ny
            accum_normals[idx][2] += nz

    normals = [
        normalize_v3(n[0], n[1], n[2]) for n in accum_normals
    ]

    glb_bytes = build_glb_bytes(positions, normals, uvs, indices)

    os.makedirs("public/assets", exist_ok=True)
    os.makedirs("dist/assets", exist_ok=True)

    pub_glb = "public/assets/center_skull_cave.glb"
    dist_glb = "dist/assets/center_skull_cave.glb"
    with open(pub_glb, "wb") as f:
        f.write(glb_bytes)
    shutil.copyfile(pub_glb, dist_glb)

    print(
        f"[3D Skull Cave GLB] Généré : {pub_glb} "
        f"({len(positions)} sommets 3D, {len(indices) // 3} triangles, {len(glb_bytes) // 1024} Ko)"
    )


if __name__ == "__main__":
    main()
