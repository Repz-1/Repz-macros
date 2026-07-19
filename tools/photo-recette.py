#!/usr/bin/env python3
"""
Prepare une photo de recette pour la fiche : recadrage 3:2, 1200x800,
WebP sous 150 Ko. Le nom de fichier est deduit du nom de la recette,
exactement comme le fait l'application.

Usage : python3 tools/photo-recette.py <source> "<nom de la recette>"
"""
import sys, unicodedata, re
from PIL import Image

CIBLE = (1200, 800)
POIDS_MAX = 150 * 1024


def nom_fichier(nom):
    s = unicodedata.normalize('NFD', nom.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s + '.webp'


def preparer(source, nom_recette):
    im = Image.open(source).convert('RGB')

    # Recadrage centre au ratio 3:2 : mieux vaut couper que deformer.
    l, h = im.size
    ratio_cible = CIBLE[0] / CIBLE[1]
    if l / h > ratio_cible:
        nouvelle_l = int(h * ratio_cible)
        gauche = (l - nouvelle_l) // 2
        im = im.crop((gauche, 0, gauche + nouvelle_l, h))
    else:
        nouvelle_h = int(l / ratio_cible)
        haut = (h - nouvelle_h) // 2
        im = im.crop((0, haut, l, haut + nouvelle_h))

    im = im.resize(CIBLE, Image.LANCZOS)

    # Qualite descendante jusqu'a passer sous la limite de poids.
    cible = 'img/recettes/' + nom_fichier(nom_recette)
    for q in (86, 80, 74, 68, 62):
        im.save(cible, 'WEBP', quality=q, method=6)
        import os
        poids = os.path.getsize(cible)
        if poids <= POIDS_MAX:
            print(f'{cible} — {CIBLE[0]}x{CIBLE[1]}, {poids // 1024} Ko, qualite {q}')
            return
    print(f'{cible} — {poids // 1024} Ko (limite depassee, a verifier)')


if __name__ == '__main__':
    preparer(sys.argv[1], sys.argv[2])
