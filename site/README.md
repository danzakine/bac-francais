# Bibliothèque du bac

Site de révision du bac de français : bibliothèque des œuvres étudiées au lycée, liseuse pour les textes du domaine public, fiches de révision détaillées, méthodes de l'écrit et de l'oral, quiz, cartes mémoire et suivi de progression.

## Lancer le site en local

Il faut seulement Python 3 (déjà installé sur macOS). Aucune installation de dépendance.

```bash
cd site
python3 outils/serveur.py
```

Puis ouvrir http://localhost:8000. On peut aussi choisir un autre port : `python3 outils/serveur.py 8080`.

Ouvrir `index.html` directement depuis le Finder **ne fonctionne pas** : le site charge ses données en JSON et utilise des adresses propres (`/oeuvres/candide`), il faut donc un serveur. `outils/serveur.py` renvoie toutes les adresses de pages vers `index.html`.

## Contrôler les données

```bash
python3 outils/verifier.py          # contrôles locaux (quelques secondes)
python3 outils/verifier.py --web    # vérifie en plus que les liens externes répondent
```

Le script signale les fiches manquantes ou incomplètes, les citations sans référence ou sans statut de vérification, les citations marquées « vérifiées » introuvables dans le texte intégral du site, les œuvres sans source ou sans statut de droits, les textes d'œuvres protégées, les références cassées (auteurs, mouvements, méthodes, programme), les liens internes vers des pages inexistantes, les doublons et les quiz mal formés. Il renvoie un code d'erreur s'il trouve une erreur bloquante.

## Architecture

Application monopage en JavaScript natif (modules ES), sans framework ni étape de compilation : rien à installer, rien à construire.

| Emplacement | Rôle |
|---|---|
| `index.html` | Point d'entrée unique |
| `assets/css/app.css` | Feuille de style (thèmes clair et sombre, liseuse, impression) |
| `assets/js/main.js` | Mise en page, navigation, routeur, recherche globale |
| `assets/js/data.js` | Chargement des données JSON |
| `assets/js/store.js` | Données personnelles de l'élève (stockage local) |
| `assets/js/ui.js` | Composants réutilisables (cartes d'œuvres, boutons, états vides…) |
| `assets/js/pages/*.js` | Une page par fichier |
| `data/*.json` | Toutes les données, séparées du code (format décrit dans `data/SCHEMA.md`) |
| `outils/` | Serveur local et contrôle des données |
| `vercel.json` | Réécriture des adresses pour un hébergement statique (Vercel) |

Pages : `/` accueil · `/bibliotheque` · `/oeuvres/<id>` · `/oeuvres/<id>/fiche` · `/lire/<id>` · `/fiches` · `/revision` · `/cartes` · `/methodes` · `/methodes/<id>` · `/programme` · `/mouvements` · `/mouvements/<id>` · `/auteurs/<id>` · `/notions` · `/favoris` · `/progression` · `/a-propos`.

## Données

| Fichier | Contenu |
|---|---|
| `data/oeuvres.json` | Catalogue : métadonnées, droits et provenance de chaque texte |
| `data/programme.json` | Œuvres officielles par session et par voie, objets d'étude, sources du BO |
| `data/epreuves.json` | Modalités officielles des épreuves, sources et points à vérifier |
| `data/fiches/<id>.json` | Fiche de révision (sections A à H) |
| `data/textes/<id>.json` | Texte intégral (domaine public uniquement) |
| `data/auteurs.json`, `mouvements.json`, `notions.json`, `methodes.json` | Contenus de référence |

### Ajouter une œuvre

1. Ajouter une entrée dans `data/oeuvres.json` (voir `data/SCHEMA.md`), avec le statut des droits.
2. Si l'œuvre est au programme d'une session, l'ajouter dans `data/programme.json`.
3. Créer `data/fiches/<id>.json` et, seulement pour une œuvre du domaine public, `data/textes/<id>.json`.
4. Lancer `python3 outils/verifier.py`.

L'application n'a pas besoin d'être modifiée. Pour une nouvelle session du bac, ajouter une session dans `programme.json` et passer l'ancienne à `"actuelle": false`.

### Règles de contenu

- Aucune citation inventée : une citation est `verifiee` seulement si elle a été retrouvée mot pour mot dans la source indiquée ; sinon `a-verifier` (le site l'affiche comme non vérifiée).
- Les œuvres protégées (Ponge, Dorion, Schwarz-Bart, Sarraute) ne sont pas reproduites : fiche originale, citations brèves, indications pour se procurer le livre.
- Toute information sur le programme porte sa source et sa date de vérification.

## Données de l'élève : limites

Sans compte, les favoris, la progression de lecture, les signets, surlignages, annotations, statuts des fiches, scores de quiz et cartes mémoire sont enregistrés dans le **stockage local du navigateur** (`localStorage`, clés préfixées `bacbiblio.v1.`). Conséquences :

- les données restent sur cet appareil et dans ce navigateur, sans synchronisation ;
- elles disparaissent si l'on efface les données du site, et ne sont pas conservées en navigation privée ;
- la page Progression permet d'exporter une sauvegarde JSON et de l'importer ailleurs.

Toute la persistance passe par l'objet `backend` de `assets/js/store.js` : pour ajouter plus tard un compte et une synchronisation, il suffit de remplacer ce module.

## Mise en ligne

Le dossier `site/` est un site statique : il peut être déposé sur Vercel (règles dans `vercel.json`) ou tout hébergeur capable de renvoyer les adresses inconnues vers `index.html`.
