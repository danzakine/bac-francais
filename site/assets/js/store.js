/* Stockage des données personnelles de l'élève.
   Version 1 : stockage LOCAL du navigateur (localStorage), sans compte.
   Limites (affichées sur la page Progression) : propre à ce navigateur et à cet appareil,
   effacé si l'on vide les données du site, non synchronisé. L'export / import JSON permet une sauvegarde manuelle.
   Toute la persistance passe par `backend` : on pourra le remplacer par une synchronisation distante plus tard. */

const PREFIX = "bacbiblio.v1.";

const backend = {
  read(key) {
    try { const v = localStorage.getItem(PREFIX + key); return v == null ? undefined : JSON.parse(v); }
    catch (e) { return undefined; }
  },
  write(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  keys() {
    try { return Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length)); }
    catch (e) { return []; }
  },
  available() {
    try { localStorage.setItem(PREFIX + "_t", "1"); localStorage.removeItem(PREFIX + "_t"); return true; }
    catch (e) { return false; }
  }
};

const listeners = new Set();
function get(key, fallback) { const v = backend.read(key); return v === undefined ? fallback : v; }
function set(key, value) { const ok = backend.write(key, value); listeners.forEach(fn => fn(key)); return ok; }
function update(key, fallback, fn) { const v = fn(get(key, fallback)); set(key, v); return v; }

export const store = {
  available: backend.available(),
  get, set, onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /* Préférences */
  prefs() { return get("prefs", { theme: null, session: null }); },
  setPref(k, v) { return update("prefs", {}, p => ({ ...p, [k]: v })); },

  /* Favoris : clés « oeuvre:<id> », « fiche:<id> », « methode:<id> » */
  favorites() { return get("favorites", []); },
  isFav(key) { return this.favorites().includes(key); },
  toggleFav(key) {
    let on = false;
    update("favorites", [], f => { const i = f.indexOf(key); if (i >= 0) { f.splice(i, 1); } else { f.unshift(key); on = true; } return f; });
    return on;
  },

  /* Historique des consultations (fiches, lectures, méthodes) */
  history() { return get("history", []); },
  logVisit(type, id) {
    update("history", [], h => [{ type, id, t: Date.now() }, ...h.filter(x => !(x.type === type && x.id === id))].slice(0, 60));
  },

  /* Progression de lecture : { [oeuvreId]: { chap, ratio, total, t } } */
  reading() { return get("reading", {}); },
  saveReading(id, data) { update("reading", {}, r => ({ ...r, [id]: { ...r[id], ...data, t: Date.now() } })); },

  /* Signets, surlignages et notes : { [oeuvreId]: [ {id, kind, chap, start, end, text, color, note, t} ] } */
  marks(id) { return get("marks", {})[id] || []; },
  allMarks() { return get("marks", {}); },
  addMark(id, mark) {
    const m = { id: Math.random().toString(36).slice(2, 10), t: Date.now(), ...mark };
    update("marks", {}, all => ({ ...all, [id]: [...(all[id] || []), m] }));
    return m;
  },
  updateMark(id, markId, patch) { update("marks", {}, all => ({ ...all, [id]: (all[id] || []).map(m => m.id === markId ? { ...m, ...patch } : m) })); },
  removeMark(id, markId) { update("marks", {}, all => ({ ...all, [id]: (all[id] || []).filter(m => m.id !== markId) })); },

  /* Statut de révision d'une fiche : "a-revoir" | "maitrise" */
  sheetStatus(id) { return get("sheetStatus", {})[id] || null; },
  allSheetStatus() { return get("sheetStatus", {}); },
  setSheetStatus(id, s) { update("sheetStatus", {}, all => { const n = { ...all }; if (s) n[id] = s; else delete n[id]; return n; }); },

  /* Quiz : { [ficheId]: { best, last, total, t } } */
  quiz() { return get("quiz", {}); },
  saveQuiz(id, score, total) {
    update("quiz", {}, q => ({ ...q, [id]: { best: Math.max(score, q[id]?.best || 0), last: score, total, t: Date.now() } }));
  },

  /* Cartes mémoire (système de Leitner simplifié) : { [cardId]: { box: 1..5, due: timestamp } } */
  cards() { return get("cards", {}); },
  gradeCard(cardId, known) {
    const DAYS = [0, 1, 2, 4, 8, 16];
    update("cards", {}, c => {
      const box = known ? Math.min(5, (c[cardId]?.box || 0) + 1) : 1;
      return { ...c, [cardId]: { box, due: Date.now() + DAYS[box] * 864e5, t: Date.now() } };
    });
  },

  /* Filtres de la bibliothèque enregistrés : [{ name, url }] (url = adresse de la bibliothèque filtrée) */
  savedFilters() { return get("savedFilters", []).filter(x => typeof x.url === "string" && x.url.startsWith("/bibliotheque")); },
  saveFilter(name, url) { update("savedFilters", [], s => [{ name, url }, ...s.filter(x => x.name !== name)].slice(0, 12)); },
  removeFilter(name) { update("savedFilters", [], s => s.filter(x => x.name !== name)); },

  /* Sauvegarde manuelle */
  exportAll() {
    const out = {};
    backend.keys().forEach(k => { out[k] = backend.read(k); });
    return { format: "bacbiblio", version: 1, exporte: new Date().toISOString(), donnees: out };
  },
  importAll(obj) {
    if (!obj || obj.format !== "bacbiblio" || typeof obj.donnees !== "object") throw new Error("Fichier de sauvegarde non reconnu.");
    Object.entries(obj.donnees).forEach(([k, v]) => backend.write(k, v));
    listeners.forEach(fn => fn("*"));
  },
  clearAll() { backend.keys().forEach(k => { try { localStorage.removeItem(PREFIX + k); } catch (e) { /* rien */ } }); listeners.forEach(fn => fn("*")); }
};
