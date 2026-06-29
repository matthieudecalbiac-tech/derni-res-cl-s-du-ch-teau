# -*- coding: utf-8 -*-
"""
detour_home.py — Detourage du fond creme de l'illustration home (homedessin14.png)
par flood-fill depuis les BORDS (composantes connexes touchant un bord uniquement).

Meme methode que detour_rose.py :
  1. Ouvre public/homedessin14.png en RGBA.
  2. Couleur de fond = moyenne des 4 coins (COIN x COIN px).
  3. Masque "pixel proche du fond" : distance euclidienne RGB < SEUIL.
  4. Etiquette les composantes connexes (4-connexite) du masque.
  5. Rend transparent UNIQUEMENT les composantes qui TOUCHENT un bord
     => les elements dessines (chateaux bleus, routes dorees, noms, riviere),
        loin du creme, sont PRESERVES ; le fond creme continu (qui touche les
        bords) devient transparent.
  6. Sauve dans un NOUVEAU fichier public/homedessin14-detouree.png (original intact).

Sortie : dimensions, % transparent, alpha coins (=0) vs centre (=255).
"""

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "public/homedessin14.png"
DST = "public/homedessin14-detouree.png"
SEUIL = 25          # distance euclidienne RGB max au fond pour etre considere "fond"
COIN = 14           # taille (px) du carre echantillonne a chaque coin

def couleur_fond(rgb):
    h, w, _ = rgb.shape
    blocs = [
        rgb[0:COIN, 0:COIN],
        rgb[0:COIN, w - COIN:w],
        rgb[h - COIN:h, 0:COIN],
        rgb[h - COIN:h, w - COIN:w],
    ]
    ech = np.concatenate([b.reshape(-1, 3) for b in blocs], axis=0)
    return ech.mean(axis=0)

def main():
    im = Image.open(SRC).convert("RGBA")
    arr = np.asarray(im).astype(np.int16)
    rgb = arr[:, :, :3]
    h, w, _ = rgb.shape

    fond = couleur_fond(rgb)
    dist = np.sqrt(((rgb - fond) ** 2).sum(axis=2))
    masque_proche = dist < SEUIL

    structure = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    labels, n = ndimage.label(masque_proche, structure=structure)

    bord = np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    labels_bord = np.unique(bord)
    labels_bord = labels_bord[labels_bord != 0]

    a_effacer = np.isin(labels, labels_bord)

    out = arr.copy()
    out[a_effacer, 3] = 0
    Image.fromarray(out.astype(np.uint8), "RGBA").save(DST)

    n_transp = int(a_effacer.sum())
    total = h * w
    a = out[:, :, 3]
    print(f"Source        : {SRC} ({w}x{h}, mode RGBA)")
    print(f"Couleur fond  : RGB({fond[0]:.0f}, {fond[1]:.0f}, {fond[2]:.0f})  seuil={SEUIL}")
    print(f"Composantes   : {n} (dont {len(labels_bord)} touchant un bord)")
    print(f"Transparents  : {n_transp} px / {total} px  ({100.0 * n_transp / total:.1f}%)")
    print(f"alpha coin TL : {a[0, 0]}   coin BR : {a[-1, -1]}   centre : {a[h // 2, w // 2]}")
    print(f"Sortie        : {DST}")

if __name__ == "__main__":
    main()
