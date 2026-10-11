# Modèle de données — Bibliothèque numérique du bac de français (v2)

Toutes les données sont des fichiers **JSON** (UTF-8) dans `site/data/`, séparés du code d'affichage.
Un contrôle automatique (`python3 outils/verifier.py`) valide ces fichiers.

Conventions :
- `id` : minuscules, chiffres et tirets (`pot-bouille`, `zola`, `naturalisme`).
- Texte simple partout ; dans les champs longs, les paragraphes sont séparés par `\n\n`. Pas de HTML dans les fiches.
- Toute information incertaine porte un champ `aVerifier: true` ou est formulée comme telle. Rien n'est inventé.

---

## `oeuvres.json` — catalogue

```json
[{
  "id": "pot-bouille",
  "titre": "Pot-Bouille",
  "titreComplet": "Pot-Bouille (Les Rougon-Macquart, t. X)",
  "auteur": "zola",                       // id dans auteurs.json
  "date": "1882",                         // date de publication (texte libre court)
  "siecle": 19,                           // nombre
  "genre": "Roman",                       // genre littéraire précis : Roman, Roman de chevalerie, Recueil poétique, Comédie, Tragédie, Drame romantique, Essai, Dialogue philosophique, Roman épistolaire, Conte philosophique, Nouvelle, Article de presse…
  "objet": "roman",                       // roman | poesie | theatre | idees (objet d'étude)
  "mouvements": ["naturalisme"],          // ids dans mouvements.json
  "classe": "1re",                        // "1re" | "2nde"
  "statut": "programme",                  // "programme" (œuvre officielle d'une session) | "complementaire" (culture littéraire, non imposée)
  "texte": {
    "disponible": true,
    "droits": "domaine-public",           // "domaine-public" | "protege"
    "droitsDetail": "Auteur mort en 1902 : œuvre dans le domaine public.",
    "edition": "…", "source": "Project Gutenberg n° 8907", "url": "https://…",
    "consulte": "2026-10-11",
    "restrictions": "Aucune (licence Gutenberg retirée du texte)."
  },
  "sansMouvement": "facultatif : explication quand aucun mouvement n'est pertinent (ex. article de presse)",
  "acquerir": "Pour les œuvres protégées : éditions de poche disponibles, CDI, bibliothèques, extraits légaux…",
  "fiche": true
}]
```

## `programme.json` — programme officiel, par session

```json
{
  "sessions": [{
    "id": "eaf-2027",
    "libelle": "Épreuves anticipées de français — juin 2027",
    "public": "Élèves de 1re en 2026-2027 (bac 2028)",
    "actuelle": true,
    "source": { "titre": "Bulletin officiel n° 30 du 24 juillet 2025", "url": "https://…", "verifie": "2026-10-11" },
    "voies": {
      "generale": [ { "objet": "roman", "oeuvre": "pot-bouille", "parcours": "Dévoiler les rouages de la société", "precisions": "" } ],
      "technologique": [ … ]
    },
    "notes": ["…"]
  }],
  "seconde": { "objets": [ { "objet": "poesie", "intitule": "La poésie du Moyen Âge au XVIIIe siècle", "attendus": "…" } ], "source": { … } },
  "premiere": { "objets": [ … ], "source": { … } }
}
```

## `epreuves.json` — modalités des épreuves (sourcées)

```json
{ "session": "eaf-2027", "verifie": "2026-10-11", "sources": [ { "titre": "…", "url": "…" } ],
  "ecrit": { "duree": "4 h", "coefficient": 5, "voies": { "generale": "…", "technologique": "…" } },
  "oral": { "duree": "20 min", "preparation": "30 min", "coefficient": 5, "parties": [ { "titre": "…", "duree": "…", "points": 12, "contenu": "…" } ] },
  "aVerifier": [ "…" ] }
```

## `auteurs.json`

```json
[{ "id": "zola", "nom": "Émile Zola", "dates": "1840-1902", "mouvements": ["naturalisme"],
   "bio": "3 à 5 phrases utiles pour le bac.", "aRetenir": ["…"] }]
```

## `mouvements.json`

```json
[{ "id": "naturalisme", "nom": "Le naturalisme", "periode": "1870-1890", "siecle": 19,
   "resume": "…", "caracteristiques": ["…"], "contexte": "…",
   "auteurs": ["zola", "maupassant"], "oeuvresCles": ["L'Assommoir (Zola, 1877)", "…"] }]
```

## `notions.json` — notions et procédés

```json
[{ "id": "metaphore", "terme": "Métaphore", "categorie": "figures",   // figures | versification | recit | theatre | argumentation | grammaire | genres | registres
   "definition": "…", "exemple": "…", "source": "…" }]
```

## `methodes.json` — fiches méthode

```json
[{ "id": "commentaire", "titre": "Le commentaire de texte", "epreuve": "ecrit", "resume": "…",
   "sections": [ { "titre": "…", "etapes": [ { "titre": "…", "texte": "…" } ], "encadre": { "titre": "…", "texte": "…" },
                   "exemple": { "titre": "…", "texte": "…", "commentaire": "…" },
                   "tableau": { "titre": "…", "colonnes": ["…"], "lignes": [["…"]] } } ],     // encadré et tableau facultatifs
   "duree": "facultatif", "sources": [ { "titre": "…", "url": "…" } ],
   "erreurs": ["…"], "entrainement": [ { "question": "…", "reponse": "…" } ] }]
```

---

## `fiches/<id>.json` — fiche de révision d'une œuvre

Sections A à H du cahier des charges. Les champs historiques (v1) sont conservés.

```json
{
  "id": "pot-bouille",
  "accroche": "≤ 160 caractères",

  "identite": {                                   // A. Carte d'identité
    "auteur": "Éléments biographiques utiles (paragraphe)",
    "contexte": "Contexte historique, culturel et littéraire",
    "mouvement": "Le mouvement et le genre : caractéristiques et place de l'œuvre",
    "circonstances": "Circonstances de composition et de publication",
    "carriere": "Place de l'œuvre dans la carrière de l'auteur"
  },

  "resumeCourt": "Résumé général",                // B. Résumé et compréhension
  "resume": [ { "titre": "Partie / acte / chapitres", "texte": "…" } ],
  "structure": "Organisation de l'œuvre",
  "personnages": [ { "nom": "…", "role": "…", "relations": "…" } ],
  "evolution": "Évolution des personnages / idées / situations",

  "themes": [ { "titre": "…", "texte": "…" } ],   // C. Analyse littéraire
  "analyse": {
    "enjeux": ["Problématiques de l'œuvre"],
    "intentions": "Intentions documentées de l'auteur (préface, correspondance…) — en citant la source",
    "procedes": [ { "nom": "…", "explication": "…", "exemple": "…" } ],
    "style": "Particularités du style",
    "registres": [ { "nom": "Comique", "explication": "…" } ],
    "interpretations": [ { "texte": "…", "nature": "fait" | "hypothese" | "debat" } ],
    "liens": "Liens avec le mouvement et le contexte"
  },

  "citations": [ {                                 // D. Citations
    "texte": "Texte exact",
    "locuteur": "Qui parle (si pertinent)",
    "reference": "Acte II, scène 3 / chapitre IV / titre du poème",
    "situation": "Contexte du passage",
    "sens": "Ce qu'elle dit",
    "procedes": "Procédés utiles",
    "demontre": "Ce qu'elle permet de démontrer",
    "usage": "Intérêt pour la dissertation / l'oral",
    "verification": {
      "statut": "verifiee" | "a-verifier",
      "source": "Édition / texte utilisé pour la vérification. Commencer par « Texte intégral du site » quand la citation a été vérifiée dans data/textes : le contrôle automatique la recherche alors dans le texte, et la fiche propose le lien « Voir dans le texte » (ex. texte intégral du site, Gutenberg n° …, ressource Eduscol …)",
      "note": "Orthographe modernisée, etc."
    }
  } ],

  "parcours": { "intitule": "…", "explication": "…",
                "textesComplementaires": [ { "titre": "…", "auteur": "…", "interet": "…" } ] },

  "ecrit": {                                       // E. Préparer l'écrit
    "idees": ["Idées essentielles"],
    "axes": ["Axes d'analyse possibles"],
    "problematiques": ["…"],
    "exemples": [ { "exemple": "Passage / scène précis", "utilisation": "Pour démontrer quoi" } ],
    "liens": "Liens thèmes / personnages / procédés",
    "sujetsCommentaire": [ { "passage": "Référence de l'extrait", "pistes": "Pistes de lecture" } ],
    "erreurs": ["Erreurs d'interprétation fréquentes"]
  },
  "dissertations": [ { "sujet": "…", "analyse": "…", "problematique": "…",
                       "plan": [ { "titre": "I. …", "arguments": ["A. …", "B. …", "C. …"] } ],
                       "introduction": "…", "conclusion": "…" } ],

  "oral": {                                        // F. Préparer l'oral
    "presentation": "Présentation synthétique (≈ 1 minute à l'oral)",
    "essentiels": ["Éléments pour l'entretien"],
    "questions": [ { "question": "Question possible de l'examinateur", "reponse": "Exemple de réponse argumentée" } ],
    "liens": "Liens avec le parcours, l'objet d'étude, d'autres œuvres",
    "reflexion": [ { "question": "Question personnelle", "pistes": "Pistes (ne remplacent pas l'avis du candidat)" } ]
  },
  "extraits": [ { "titre": "…", "reference": "…", "enjeu": "Projet de lecture", "mouvements": ["…"] } ],

  "express": {                                     // G. Résumé express
    "idees": ["5 à 10 idées"],
    "citations": [0, 3, 5],                        // index dans "citations" (uniquement des citations vérifiées)
    "pieges": ["…"],
    "synthese": "Synthèse de dernière minute (5-8 lignes)"
  },
  "vocabulaire": [ { "terme": "…", "definition": "…" } ],
  "quiz": [ { "question": "…", "choix": ["…", "…", "…", "…"], "reponse": 0, "explication": "…" } ],   // H. Auto-évaluation
  "sources": [ { "titre": "…", "url": "…" } ],     // ressources consultées pour établir la fiche
  "aVerifier": ["Points signalés comme incertains"]
}
```

## `textes/<id>.json` — texte intégral (domaine public uniquement)

```json
{ "id": "pot-bouille", "edition": "…", "source": "…",
  "chapitres": [ { "titre": "Chapitre I", "html": "<p>…</p>", "original": "<p>…</p> (facultatif : texte d'origine pour une traduction)" } ],
  "editionOriginal": "facultatif" }
```
HTML autorisé : `<p>`, `<h3>`, `<em>`, `<br>`, `<div class="strophe">`, `<p class="vers|didascalie|personnage">`, `<span class="vn">`.
Les métadonnées de provenance et de droits sont dans `oeuvres.json` (`texte`).
