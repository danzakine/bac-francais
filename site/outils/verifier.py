"""Contrôle automatique des données du site (Python 3, bibliothèque standard uniquement).

Usage :  python3 outils/verifier.py            contrôles locaux
         python3 outils/verifier.py --web      + vérifie que les URL externes répondent (plus lent)

Détecte : JSON invalides, métadonnées obligatoires absentes, doublons, références cassées
(auteurs, mouvements, œuvres, méthodes), fiches manquantes ou incomplètes, citations sans
référence ou sans statut de vérification, citations « vérifiées » introuvables dans le texte
intégral du site, quiz mal formés, textes sans source, textes d'œuvres protégées, HTML non autorisé,
liens internes vers des pages inexistantes.
Code de sortie : 1 s'il y a des erreurs, 0 sinon (les avertissements ne bloquent pas).
"""
import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
DATA = SITE / "data"
errors, warnings = [], []
err = errors.append
warn = warnings.append


def load(path, default=None, required=True):
    p = DATA / path
    if not p.exists():
        (err if required else warn)(f"{path} : fichier absent")
        return default
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(f"{path} : JSON invalide ({e})")
        return default


def fold(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = s.replace("œ", "oe").replace("æ", "ae")
    return re.sub(r"[^a-z0-9]", "", s)


def strip_tags(h):
    return re.sub(r"<[^>]+>", " ", h or "")


ELLIPSIS = re.compile(r"\s*(?:\[\s*(?:…|\.\.\.)\s*\]|\(\s*(?:…|\.\.\.)\s*\)|…)\s*")

# ---------------------------------------------------------------- catalogue
oeuvres = load("oeuvres.json", [])
auteurs = load("auteurs.json", [], required=False)
mouvements = load("mouvements.json", [], required=False)
programme = load("programme.json", None, required=False)
epreuves = load("epreuves.json", None, required=False)
methodes = load("methodes.json", [], required=False)
notions = load("notions.json", [], required=False)

A = {a.get("id"): a for a in auteurs}
M = {m.get("id"): m for m in mouvements}
O = {}
OBJETS = {"roman", "poesie", "theatre", "idees"}


def dups(items, key, label):
    seen = {}
    for it in items:
        k = it.get(key) if isinstance(it, dict) else None
        if k is None:
            continue
        kk = fold(str(k))
        if kk in seen:
            err(f"{label} : doublon « {k} »")
        seen[kk] = True


dups(oeuvres, "id", "oeuvres.json (id)")
dups(oeuvres, "titre", "oeuvres.json (titre)")
dups(auteurs, "id", "auteurs.json (id)")
dups(mouvements, "id", "mouvements.json (id)")
dups(methodes, "id", "methodes.json (id)")
dups(notions, "id", "notions.json (id)")
dups(notions, "terme", "notions.json (terme)")

for o in oeuvres:
    oid = o.get("id", "?")
    O[oid] = o
    if not o.get("mouvements") and not o.get("sansMouvement"):
        warn(f"œuvre {oid} : aucun mouvement littéraire associé")
    for f in ("id", "titre", "titreComplet", "auteur", "date", "siecle", "genre", "objet", "classe", "statut", "texte"):
        if o.get(f) in (None, "", []):
            err(f"œuvre {oid} : champ obligatoire « {f} » absent")
    if not re.fullmatch(r"[a-z0-9-]+", oid):
        err(f"œuvre {oid} : id invalide")
    if o.get("objet") not in OBJETS:
        err(f"œuvre {oid} : objet d'étude inconnu « {o.get('objet')} »")
    if A and o.get("auteur") not in A:
        err(f"œuvre {oid} : auteur « {o.get('auteur')} » absent de auteurs.json")
    for m in o.get("mouvements", []):
        if M and m not in M:
            err(f"œuvre {oid} : mouvement « {m} » absent de mouvements.json")
    t = o.get("texte") or {}
    tfile = DATA / "textes" / f"{oid}.json"
    if t.get("droits") not in ("domaine-public", "protege"):
        err(f"œuvre {oid} : statut des droits non renseigné")
    if not t.get("droitsDetail"):
        warn(f"œuvre {oid} : justification des droits (droitsDetail) absente")
    if t.get("disponible"):
        if t.get("droits") != "domaine-public":
            err(f"œuvre {oid} : texte marqué disponible alors que l'œuvre n'est pas dans le domaine public")
        for f in ("edition", "source", "url", "consulte", "restrictions"):
            if not t.get(f):
                err(f"œuvre {oid} : métadonnée du texte « {f} » absente")
        if not tfile.exists():
            err(f"œuvre {oid} : texte annoncé disponible mais data/textes/{oid}.json absent")
    else:
        if tfile.exists():
            err(f"œuvre {oid} : data/textes/{oid}.json existe alors que le texte n'est pas déclaré disponible")
        if t.get("droits") == "protege" and not o.get("acquerir"):
            warn(f"œuvre {oid} : œuvre protégée sans indication pour se la procurer (acquerir)")
    if o.get("fiche") and not (DATA / "fiches" / f"{oid}.json").exists():
        err(f"œuvre {oid} : fiche annoncée mais data/fiches/{oid}.json absent")
    if not o.get("fiche"):
        warn(f"œuvre {oid} : pas de fiche de révision")

for a in auteurs:
    for f in ("id", "nom", "dates", "bio"):
        if not a.get(f):
            err(f"auteur {a.get('id')} : champ « {f} » absent")
    for m in a.get("mouvements", []):
        if m not in M:
            err(f"auteur {a.get('id')} : mouvement « {m} » inconnu")
for m in mouvements:
    for f in ("id", "nom", "periode", "siecle", "resume"):
        if m.get(f) in (None, ""):
            err(f"mouvement {m.get('id')} : champ « {f} » absent")
    for a in m.get("auteurs", []):
        if a not in A:
            err(f"mouvement {m.get('id')} : auteur « {a} » inconnu")
for n in notions:
    for f in ("id", "terme", "categorie", "definition"):
        if not n.get(f):
            err(f"notion {n.get('id')} : champ « {f} » absent")

for f in (DATA / "fiches").glob("*.json"):
    if f.stem not in O:
        err(f"fiches/{f.name} : aucune œuvre correspondante dans oeuvres.json")
for f in (DATA / "textes").glob("*.json"):
    if f.stem not in O:
        err(f"textes/{f.name} : aucune œuvre correspondante dans oeuvres.json")

# ---------------------------------------------------------------- programme
if programme:
    for s in programme.get("sessions", []):
        sid = s.get("id", "?")
        if not (s.get("source") or {}).get("url"):
            err(f"programme {sid} : source officielle absente")
        if not (s.get("source") or {}).get("verifie"):
            warn(f"programme {sid} : date de vérification absente")
        for voie, items in (s.get("voies") or {}).items():
            for it in items:
                if it.get("objet") not in OBJETS:
                    err(f"programme {sid}/{voie} : objet inconnu « {it.get('objet')} »")
                if it.get("oeuvre") and it["oeuvre"] not in O:
                    err(f"programme {sid}/{voie} : œuvre « {it['oeuvre']} » absente du catalogue")
                if not it.get("oeuvre") and s.get("actuelle"):
                    warn(f"programme {sid}/{voie} : « {it.get('titre')} » ({it.get('auteur')}) au programme mais pas encore dans la bibliothèque")
                if not it.get("parcours"):
                    err(f"programme {sid}/{voie} : parcours absent pour {it.get('oeuvre') or it.get('titre')}")
    current = {it.get("oeuvre") for s in programme.get("sessions", []) if s.get("actuelle") for its in (s.get("voies") or {}).values() for it in its}
    for oid, o in O.items():
        if o.get("statut") == "programme" and oid not in current:
            warn(f"œuvre {oid} : marquée « programme » mais absente de la session actuelle de programme.json")
if epreuves and not epreuves.get("sources"):
    err("epreuves.json : sources absentes")

# ---------------------------------------------------------------- méthodes
MIDS = {m.get("id") for m in methodes}
for m in methodes:
    for f in ("id", "titre", "epreuve", "resume", "sections"):
        if not m.get(f):
            err(f"méthode {m.get('id')} : champ « {f} » absent")
    if m.get("epreuve") not in ("ecrit", "oral", "revisions"):
        err(f"méthode {m.get('id')} : épreuve inconnue « {m.get('epreuve')} »")

# ---------------------------------------------------------------- textes
ALLOWED = {"p", "h3", "em", "br", "div", "span", "i", "b", "strong", "sup", "sub"}
TEXTS = {}
for f in sorted((DATA / "textes").glob("*.json")):
    t = load(f"textes/{f.name}", {})
    if not t:
        continue
    ch = t.get("chapitres") or []
    if not ch:
        err(f"textes/{f.name} : aucun chapitre")
    if not t.get("edition") or not t.get("source"):
        err(f"textes/{f.name} : édition ou source absente")
    bad = set()
    for c in ch:
        if not c.get("titre") or not strip_tags(c.get("html")).strip():
            err(f"textes/{f.name} : chapitre vide ou sans titre ({c.get('titre')})")
        bad |= {tag for tag in re.findall(r"</?([a-zA-Z0-9]+)", (c.get("html") or "") + (c.get("original") or "")) if tag.lower() not in ALLOWED}
    if bad:
        err(f"textes/{f.name} : balises HTML non autorisées : {', '.join(sorted(bad))}")
    TEXTS[f.stem] = fold(" ".join(strip_tags(c.get("html")) + " " + strip_tags(c.get("original")) for c in ch))

# ---------------------------------------------------------------- fiches
V2 = ["accroche", "identite", "resumeCourt", "resume", "structure", "personnages", "themes", "analyse", "citations",
      "ecrit", "dissertations", "oral", "extraits", "express", "quiz", "sources"]
stats = {"fiches": 0, "v2": 0, "cit": 0, "verifiee": 0, "a-verifier": 0, "sans-statut": 0}
for oid, o in O.items():
    p = DATA / "fiches" / f"{oid}.json"
    if not p.exists():
        continue
    fi = load(f"fiches/{oid}.json", {})
    if not fi:
        continue
    stats["fiches"] += 1
    if fi.get("id") != oid:
        err(f"fiche {oid} : champ id incohérent ({fi.get('id')})")
    missing = [k for k in V2 if fi.get(k) in (None, "", [], {})]
    if missing:
        warn(f"fiche {oid} : sections absentes ou vides : {', '.join(missing)}")
    else:
        stats["v2"] += 1
    cits = fi.get("citations") or []
    text = TEXTS.get(oid)
    for i, c in enumerate(cits):
        stats["cit"] += 1
        label = f"fiche {oid}, citation {i} « {(c.get('texte') or '')[:40]}… »"
        if not c.get("texte"):
            err(f"{label} : texte vide")
        if not c.get("reference"):
            err(f"{label} : référence absente")
        st = (c.get("verification") or {}).get("statut")
        if st not in ("verifiee", "a-verifier"):
            stats["sans-statut"] += 1
            warn(f"{label} : statut de vérification absent")
            continue
        stats[st] += 1
        if st == "verifiee":
            if not (c.get("verification") or {}).get("source"):
                err(f"{label} : vérifiée mais source de vérification absente")
            if text and o.get("texte", {}).get("disponible"):
                parts = [fold(x) for x in ELLIPSIS.split(c.get("texte") or "") if len(fold(x)) >= 8]
                note = fold((c.get("verification") or {}).get("note", ""))
                vsrc = (c.get("verification") or {}).get("source", "")
                fs = fold(vsrc)                                              # contrôle local seulement si la source déclarée est le texte du site
                external = not ("dusite" in fs and "nestpas" not in fs)
                if parts and not external and not all(pp in text for pp in parts) and "moderni" not in note and "tradu" not in note:
                    err(f"{label} : marquée vérifiée mais introuvable mot pour mot dans le texte du site")
    for i in (fi.get("express") or {}).get("citations", []):
        if not isinstance(i, int) or i >= len(cits) or i < 0:
            err(f"fiche {oid} : express.citations pointe vers un index inexistant ({i})")
        elif (cits[i].get("verification") or {}).get("statut") != "verifiee":
            err(f"fiche {oid} : express.citations contient une citation non vérifiée ({i})")
    for j, q in enumerate(fi.get("quiz") or []):
        ch = q.get("choix") or []
        if len(ch) < 2 or not isinstance(q.get("reponse"), int) or not 0 <= q["reponse"] < len(ch):
            err(f"fiche {oid}, quiz {j} : choix ou réponse invalides")
        if not q.get("explication"):
            warn(f"fiche {oid}, quiz {j} : explication absente")
    for j, d in enumerate(fi.get("dissertations") or []):
        if len(d.get("plan") or []) < 2:
            err(f"fiche {oid}, dissertation {j} : plan incomplet")

# ---------------------------------------------------------------- liens internes dans le code
ROUTES = [r"/", r"/bibliotheque", r"/oeuvres/[a-z0-9-]+", r"/oeuvres/[a-z0-9-]+/fiche", r"/lire/[a-z0-9-]+", r"/fiches", r"/revision",
          r"/cartes", r"/methodes", r"/methodes/[a-z0-9-]+", r"/programme", r"/mouvements", r"/mouvements/[a-z0-9-]+",
          r"/auteurs/[a-z0-9-]+", r"/notions", r"/favoris", r"/progression", r"/a-propos"]
for js in (SITE / "assets" / "js").rglob("*.js"):
    src = js.read_text(encoding="utf-8")
    for href in re.findall(r'href="(/[^"$]*)"', src):
        path = href.split("?")[0].split("#")[0]
        if path.startswith("/assets") or path.startswith("/data"):
            continue
        if not any(re.fullmatch(r, path) for r in ROUTES):
            err(f"{js.relative_to(SITE)} : lien interne vers une page inexistante « {href} »")
        m = re.fullmatch(r"/methodes/([a-z0-9-]+)", path)
        if m and methodes and m.group(1) not in MIDS:
            err(f"{js.relative_to(SITE)} : lien vers la méthode inexistante « {m.group(1)} »")

# ---------------------------------------------------------------- liens externes (facultatif)
if "--web" in sys.argv:
    urls = set()
    for o in oeuvres:
        if (o.get("texte") or {}).get("url"):
            urls.add(o["texte"]["url"])
    def collect(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == "url" and isinstance(v, str) and v.startswith("http"):
                    urls.add(v)
                else:
                    collect(v)
        elif isinstance(x, list):
            for v in x:
                collect(v)
    collect([programme, epreuves, methodes])
    for f in (DATA / "fiches").glob("*.json"):
        collect(json.loads(f.read_text(encoding="utf-8")).get("sources"))
    for u in sorted(urls):
        try:
            req = urllib.request.Request(u, method="GET", headers={"User-Agent": "Mozilla/5.0 (verification de liens)"})
            with urllib.request.urlopen(req, timeout=15) as r:
                if r.status >= 400:
                    warn(f"lien externe {u} : HTTP {r.status}")
        except Exception as e:
            warn(f"lien externe {u} : {getattr(e, 'code', '') or e}")

# ---------------------------------------------------------------- bilan
for w in warnings:
    print("  avertissement :", w)
for e in errors:
    print("  ERREUR :", e)
print(f"\n{len(oeuvres)} œuvres · {sum(1 for o in oeuvres if (o.get('texte') or {}).get('disponible'))} textes intégraux · "
      f"{stats['fiches']} fiches ({stats['v2']} complètes) · {stats['cit']} citations : {stats['verifiee']} vérifiées, "
      f"{stats['a-verifier']} à vérifier, {stats['sans-statut']} sans statut · {len(auteurs)} auteurs · {len(mouvements)} mouvements · "
      f"{len(notions)} notions · {len(methodes)} méthodes")
print(f"{len(errors)} erreur(s), {len(warnings)} avertissement(s)")
sys.exit(1 if errors else 0)
