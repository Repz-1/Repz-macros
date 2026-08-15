# Vectorise la planche de reference de Raci : chaque aplat devient des
# chemins SVG. Aucun trace a la main — c'est un decalque.
import numpy as np, cv2, json
from PIL import Image

PAL = [(254,254,253),(16,16,15),(250,194,37),(222,54,52),(136,91,164),
       (90,164,91),(43,125,203),(100,165,224),(181,215,242),(242,121,37),(248,184,127)]
FOND,TETE,JAUNE,ROUGE,VIOLET,VERT,BLEU,BLEUM,BLEUC,ORANGE,ORANGEC = range(11)
cols = np.array(PAL, dtype=np.int32)

# Usage : python3 tools/tracer.py <planche.jpg> [sortie.js]
# Ecrit app-v2/src/data/silhouette.js. La planche attendue est la
# reference de Raci : deux figures cote a cote (face puis dos), en
# aplats de couleur, sur fond blanc, legendes en bas.
import sys, os
PLANCHE = sys.argv[1] if len(sys.argv) > 1 else 'tools/planche-silhouette.jpg'
SORTIE = sys.argv[2] if len(sys.argv) > 2 else 'app-v2/src/data/silhouette.js'
im = np.array(Image.open(PLANCHE).convert('RGB')).astype(np.int32)[:1040]
q = ((im[:,:,None,:]-cols[None,None])**2).sum(3).argmin(2)
W = q.shape[1]

def net(m, mini=100, doux=3):
    """bruit JPEG enleve, PUIS arrondi des bords : un flou gaussien
    reseuille transforme les angles en courbes. C'est ce qui donne le
    volume organique aux bras et aux jambes."""
    m = (m.astype(np.uint8))*255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k)
    n,lab,st,_ = cv2.connectedComponentsWithStats(m, 8)
    out = np.zeros_like(m)
    for i in range(1,n):
        if st[i,cv2.CC_STAT_AREA] >= mini: out[lab==i] = 255
    out = cv2.GaussianBlur(out, (doux|1, doux|1), 0)
    # seuil a 127 : le flou arrondit les angles SANS eroder la piece,
    # donc la silhouette garde l'epaisseur exacte de la planche.
    return ((out > 127) * 255).astype(np.uint8)

def chaikin(p, n=2):
    """coupe les angles du polygone : chaque sommet devient deux points
    rapproches. Deux passes suffisent a supprimer l'aspect facette."""
    for _ in range(n):
        q=[]
        for i in range(len(p)):
            a,b = p[i], p[(i+1)%len(p)]
            q.append((0.75*a[0]+0.25*b[0], 0.75*a[1]+0.25*b[1]))
            q.append((0.25*a[0]+0.75*b[0], 0.25*a[1]+0.75*b[1]))
        p=q
    return p

def decimer(p, pas=2.4):
    """Chaikin quadruple le nombre de points ; on en retire l'exces.
    Les courbes de Bezier reconstituent le galbe entre deux points
    espaces, donc en garder un tous les 1,6 unites suffit — et divise
    le poids du fichier par pres de dix."""
    out=[p[0]]
    for q in p[1:]:
        a,b = out[-1]
        if (q[0]-a)**2 + (q[1]-b)**2 >= pas*pas: out.append(q)
    if len(out) < 4: return p
    return out

def bez(pts):
    n=len(pts); d=f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(n):
        p0,p1,p2,p3 = pts[(i-1)%n],pts[i],pts[(i+1)%n],pts[(i+2)%n]
        c1=(p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6)
        c2=(p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6)
        d+=f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d+"Z"

res={}
for vue,(x0,x1) in {'face':(0,W//2),'dos':(W//2,W)}.items():
    s = q[:, x0:x1]
    corps = net(s!=FOND, 3000, 3)
    ys,xs = np.where(corps>0)
    bx0,bx1,by0,by1 = xs.min(),xs.max(),ys.min(),ys.max()
    ech = min(114/(bx1-bx0), 294/(by1-by0))
    ox, oy = 60-(bx0+bx1)/2*ech, 3-by0*ech
    cx = (bx0+bx1)/2

    # reperes anatomiques mesures sur le masque, pas devines
    vert = net(s==VERT, 120, 3)
    yv = np.where(vert.any(1))[0]
    coude = yv.min() + int(0.50*(yv.max()-yv.min()))
    orange = net((s==ORANGE)|(s==ORANGEC))
    if orange.any():
        yo = np.where(orange.any(1))[0]
        bas_trap = yo.min() + int(0.27*(yo.max()-yo.min()))

    def coupe(mask, y, sens, amp=26):
        """decoupe le long d'un arc, pas d'une ligne droite : une coupe
        horizontale se lit comme une cassure nette sur un membre rond."""
        h,w = mask.shape
        xs = np.arange(w)
        front = y + amp*np.cos(np.pi*(xs-cx)/max(w*0.5,1))
        yy = np.arange(h)[:,None]
        garde = (yy <= front[None,:]+4) if sens=='haut' else (yy >= front[None,:]-4)
        return (mask * garde).astype(np.uint8)

    def sortir(mask, groupe, ton='plein', out=None):
        cs,_ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        for c in cs:
            if cv2.contourArea(c) < 55: continue
            p = cv2.approxPolyDP(c, 0.0016*cv2.arcLength(c,True), True).reshape(-1,2).astype(float)
            if len(p) < 4: continue
            pts = decimer(chaikin([(x*ech+ox, y*ech+oy) for x,y in p]))
            out.append({'g':groupe,'t':ton,'d':bez(pts)})

    ch=[]
    # tete
    sortir(net(s==TETE, 2000), 'tete','plein', ch)
    # jaune : pres du cou = trapezes, sur l'epaule = epaules
    mj = net(s==JAUNE)
    n,lab,st,cen = cv2.connectedComponentsWithStats(mj,8)
    for i in range(1,n):
        if st[i,cv2.CC_STAT_AREA] < 260: continue
        g = 'trapezes' if abs(cen[i][0]-cx) < 0.16*(bx1-bx0) else 'epaules'
        sortir((lab==i).astype(np.uint8)*255, g,'plein', ch)
    sortir(net(s==ROUGE), 'pecs','plein', ch)
    sortir(net(s==VIOLET, 120, 3), 'abdos','plein', ch)
    # bras : coupe au coude
    haut = coupe(vert, coude, 'haut', 9)
    bas  = coupe(vert, coude, 'bas', 9)
    sortir(haut, 'biceps' if vue=='face' else 'triceps','plein', ch)
    sortir(bas, 'avantBras','plein', ch)
    # dos : coupe entre trapezes et dorsaux
    if orange.any():
        for src,ton in ((net(s==ORANGE),'plein'), (net(s==ORANGEC),'clair')):
            h = coupe(src, bas_trap, 'haut', 14)
            b = coupe(src, bas_trap, 'bas', 14)
            sortir(h,'trapezes',ton, ch); sortir(b,'dos',ton, ch)
    # --- jambes ---------------------------------------------------
    # Pas de coupe au genou : c'est elle qui creait la fente et l'effet
    # articulation. On soude les entailles fines du tibia (ce sont elles
    # qui dessinaient un os) et on lisse, sans separer les masses.
    def souder(m, k=9):
        m=(np.asarray(m).astype(np.uint8))*255 if m.dtype==bool else m
        return cv2.morphologyEx(m, cv2.MORPH_CLOSE,
               cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))
    # Sous la cheville, ni soudure ni lissage : c'est la que se
    # trouvent les orteils, et ils disparaissent au moindre flou.
    yj = np.where(net((s==BLEU)|(s==BLEUM)|(s==BLEUC),300,3).any(1))[0]
    cheville = yj.min() + int(0.90*(yj.max()-yj.min()))
    def zone(m, sens):
        m = (np.asarray(m).astype(np.uint8))*255 if m.dtype==bool else m.copy()
        m = m.copy()
        if sens=='haut': m[cheville+2:] = 0
        else: m[:cheville-2] = 0
        return m
    # Sous le genou, la bande claire est le tibia. La soudure la
    # gonflait : elle se lisait comme un os pose sur le mollet. On
    # l'amincit la, et seulement la — au-dessus du genou (vaste
    # interne, rotule) le clair garde sa taille d'origine.
    genou = yj.min() + int(0.505*(yj.max()-yj.min()))
    def tranche(m, y0, y1):
        m = (np.asarray(m).astype(np.uint8))*255 if m.dtype==bool else m.copy()
        out = np.zeros_like(m); out[y0:y1] = m[y0:y1]; return out
    def amincir(m, k=7):
        return cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))

    plein = (s==BLEU)|(s==BLEUM)
    # Au-dessus du genou : les masses telles quelles.
    sortir(net(souder(tranche(plein, 0, genou+3), 7), 220, 5), 'jambes','plein', ch)
    # Entre genou et cheville : la jambe est pleine d'un bloc. Le clair
    # amincit ensuite le tibia PAR-DESSUS, il ne creuse plus un vide.
    tousbleus = (s==BLEU)|(s==BLEUM)|(s==BLEUC)
    sortir(net(souder(tranche(tousbleus, genou-3, cheville+2), 11), 220, 5),
           'jambes','plein', ch)
    sortir(net(tranche(plein, cheville-2, 10**4), 90, 3), 'jambes','plein', ch)

    cl = (np.asarray(s==BLEUC).astype(np.uint8))*255
    haut_genou = tranche(cl, 0, genou+3)
    tibia = amincir(tranche(cl, genou-3, cheville+2), 5)
    pied = tranche(cl, cheville-2, cl.shape[0])
    sortir(net(souder(haut_genou, 7), 220, 5), 'jambes','clair', ch)
    sortir(net(tibia, 260, 7), 'jambes','clair', ch)
    sortir(net(pied, 90, 3), 'jambes','clair', ch)
    res[vue]=ch
    print(vue, len(ch), 'chemins · coude', coude)


# ---- ecriture du module JS ---------------------------------------
def bloc(v):
    return ',\n'.join("  { g: '%s', t: '%s', d: '%s' }" % (p['g'], p['t'], p['d'].replace("'", "\\'"))
                      for p in res[v])
entete = '''// Chemins de la silhouette — FICHIER GENERE, ne pas editer a la main.
//
// Produit par tools/tracer.py depuis la planche de reference de Raci :
// l'image est quantifiee en aplats de couleur, chaque aplat devient des
// contours, convertis en courbes de Bezier. La silhouette n'est donc pas
// dessinee au juge, c'est un decalque.
//
// Chaque chemin porte :
//   g = groupe musculaire, qui decide de sa couleur (ou 'tete')
//   t = 'plein' ou 'clair' — le ton clair marque le relief interne
//   d = le trace, dans un viewBox 120x300
//
// Trois decoupes ne viennent PAS de la planche, qui ne distingue que
// cinq zones la ou l'app en compte huit :
//   - le bras est coupe au pli du coude (biceps/triceps vs avant-bras)
//   - le haut du dos est separe des dorsaux (trapezes)
//   - au dos, l'avant-bras suit la couleur du groupe travaille

export const SILHOUETTE_FACE = [
%s
];

export const SILHOUETTE_DOS = [
%s
];
'''
open(SORTIE, 'w').write(entete % (bloc('face'), bloc('dos')))
print('ecrit', SORTIE)
