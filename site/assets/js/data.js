/* Accès aux données JSON du site (mise en cache en mémoire). */

const cache = new Map();

export class DataError extends Error {}

export function load(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch("/data/" + path, { cache: "no-cache" }).then(r => {
      if (!r.ok) throw new DataError(r.status === 404 ? "introuvable" : "erreur " + r.status);
      return r.json();
    }).catch(e => { cache.delete(path); throw e instanceof DataError ? e : new DataError("réseau"); }));
  }
  return cache.get(path);
}

/* Fichiers facultatifs : renvoient une valeur par défaut s'ils n'existent pas encore */
const optional = (path, fallback) => load(path).catch(() => fallback);

export const data = {
  oeuvres: () => load("oeuvres.json"),
  auteurs: () => optional("auteurs.json", []),
  mouvements: () => optional("mouvements.json", []),
  notions: () => optional("notions.json", []),
  methodes: () => optional("methodes.json", []),
  programme: () => optional("programme.json", null),
  epreuves: () => optional("epreuves.json", null),
  fiche: id => load(`fiches/${id}.json`),
  texte: id => load(`textes/${id}.json`),

  /* Tout le nécessaire pour les listes : œuvres enrichies de leur auteur et de leur statut au programme */
  async catalogue() {
    const [oeuvres, auteurs, mouvements, programme] = await Promise.all([this.oeuvres(), this.auteurs(), this.mouvements(), this.programme()]);
    const A = Object.fromEntries(auteurs.map(a => [a.id, a]));
    const M = Object.fromEntries(mouvements.map(m => [m.id, m]));
    const sessions = programme?.sessions || [];
    const list = oeuvres.map(o => {
      const prog = [];
      sessions.forEach(s => Object.entries(s.voies || {}).forEach(([voie, items]) => items.forEach(it => {
        if (it.oeuvre === o.id) prog.push({ session: s.id, libelle: s.libelle, actuelle: !!s.actuelle, voie, parcours: it.parcours, precisions: it.precisions || "" });
      })));
      return { ...o, auteurObj: A[o.auteur] || { id: o.auteur, nom: o.auteur }, mouvementsObj: (o.mouvements || []).map(id => M[id]).filter(Boolean), programme: prog };
    });
    return { list, byId: Object.fromEntries(list.map(o => [o.id, o])), auteurs, A, mouvements, M, programme, sessions };
  }
};

export const OBJETS = {
  roman: { nom: "Roman et récit", court: "Roman", couleur: "var(--c-roman)", cover: "#8e3d22" },
  poesie: { nom: "Poésie", court: "Poésie", couleur: "var(--c-poesie)", cover: "#4b3d85" },
  idees: { nom: "Littérature d'idées", court: "Idées", couleur: "var(--c-idees)", cover: "#1b5d55" },
  theatre: { nom: "Théâtre", court: "Théâtre", couleur: "var(--c-theatre)", cover: "#8c2840" }
};

export const VOIES = { generale: "Voie générale", technologique: "Voie technologique" };

export function siecleRomain(n) {
  const R = { 12: "XIIe", 13: "XIIIe", 14: "XIVe", 15: "XVe", 16: "XVIe", 17: "XVIIe", 18: "XVIIIe", 19: "XIXe", 20: "XXe", 21: "XXIe" };
  return (R[n] || n + "e") + " siècle";
}

export function norm(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").toLowerCase();
}
