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


def moyenne_coins(im, taille=40):
    """Couleur dominante du decor, prise aux quatre coins."""
    l, h = im.size
    zones = [
        im.crop((0, 0, taille, taille)),
        im.crop((l - taille, 0, l, taille)),
        im.crop((0, h - taille, taille, h)),
        im.crop((l - taille, h - taille, l, h)),
    ]
    pixels = [p for z in zones for p in list(z.convert("RGB").getdata())]
    n = len(pixels)
    return tuple(sum(c[i] for c in pixels) // n for i in range(3))


def fondre_bords(cadre, image, fond, largeur=24):
    """Adoucit la jointure entre l'image et le fond ajoute."""
    from PIL import ImageFilter
    flou = cadre.filter(ImageFilter.GaussianBlur(radius=18))
    masque = Image.new('L', cadre.size, 0)
    x = (cadre.width - image.width) // 2
    y = (cadre.height - image.height) // 2
    # Zone a conserver nette : l'image d'origine, moins une bordure
    from PIL import ImageDraw
    d = ImageDraw.Draw(masque)
    d.rectangle([x + largeur, y + largeur,
                 x + image.width - largeur, y + image.height - largeur], fill=255)
    masque = masque.filter(ImageFilter.GaussianBlur(radius=largeur))
    return Image.composite(cadre, flou, masque)


def preparer(source, nom_recette):
    im = Image.open(source).convert('RGB')

    # L'assiette doit rester entiere : on n'ampute jamais l'image.
    # Si le ratio ne correspond pas, on etend le fond au lieu de couper.
    # Le decor etant un beton gris uni, l'ajout est invisible.
    l, h = im.size
    ratio_cible = CIBLE[0] / CIBLE[1]
    ratio_source = l / h

    if abs(ratio_source - ratio_cible) < 0.02:
        im = im.resize(CIBLE, Image.LANCZOS)
    else:
        # Reduire pour que l'image tienne entierement dans le cadre
        echelle = min(CIBLE[0] / l, CIBLE[1] / h)
        nouvelle = im.resize((int(l * echelle), int(h * echelle)), Image.LANCZOS)

        # Couleur de fond : moyenne des quatre coins, donc le decor
        fond = moyenne_coins(nouvelle)
        cadre = Image.new('RGB', CIBLE, fond)
        cadre.paste(nouvelle, ((CIBLE[0] - nouvelle.width) // 2,
                               (CIBLE[1] - nouvelle.height) // 2))

        # Fondu des bords pour effacer la jointure
        cadre = fondre_bords(cadre, nouvelle, fond)
        im = cadre

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
