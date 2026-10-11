import { data, OBJETS, VOIES, siecleRomain, norm } from "../data.js";
import { store } from "../store.js";
import { esc, icon, bookCard, emptyState, toast } from "../ui.js";

const PER_PAGE = 24;

/* Filtres disponibles : clé d'URL -> libellé */
const FILTERS = ["classe", "session", "objet", "genre", "mouvement", "siecle", "auteur", "texte", "fiche"];

/* Genre « simplifié » pour le filtre (le champ genre est parfois détaillé) */
function genreSimple(g) {
  const s = norm(g);
  if (s.includes("roman")) return "Roman";
  if (s.includes("nouvelle") || s.includes("conte")) return "Conte et nouvelle";
  if (s.includes("poe") || s.includes("recueil") || s.includes("sonnet") || s.includes("fable")) return "Poésie";
  if (s.includes("comedie") || s.includes("tragedie") || s.includes("drame") || s.includes("theatre") || s.includes("piece")) return "Théâtre";
  if (s.includes("essai") || s.includes("discours") || s.includes("dialogue") || s.includes("entretien") || s.includes("article") || s.includes("lettre") || s.includes("traite")) return "Essai, discours et dialogue";
  return g;
}

export default async function bibliotheque({ query, navigate }) {
  const cat = await data.catalogue();
  const list = cat.list.map(o => ({ ...o, genreS: genreSimple(o.genre) }));
  const sessions = cat.sessions;
  const missing = [];
  sessions.filter(s => s.actuelle).forEach(s => Object.entries(s.voies || {}).forEach(([voie, items]) => items.forEach(it => {
    if (!it.oeuvre || !cat.byId[it.oeuvre]) missing.push({ ...it, voie, session: s.libelle });
  })));

  /* État lu dans l'URL */
  const state = { q: query.get("q") || "", tri: query.get("tri") || "pertinence", page: Math.max(1, parseInt(query.get("page") || "1", 10) || 1) };
  FILTERS.forEach(k => { state[k] = query.get(k) || ""; });

  const uniq = arr => [...new Set(arr)].filter(Boolean);
  const opts = {
    classe: [["1re", "Première"], ["2nde", "Seconde"]],
    session: [...sessions.map(s => [s.id, s.libelle + (s.actuelle ? "" : " (passée)")]), ["hors", "Hors programme officiel (culture littéraire)"]],
    objet: Object.entries(OBJETS).map(([k, v]) => [k, v.nom]),
    genre: uniq(list.map(o => o.genreS)).sort().map(g => [g, g]),
    mouvement: cat.mouvements.filter(m => list.some(o => o.mouvements.includes(m.id))).map(m => [m.id, m.nom]),
    siecle: uniq(list.map(o => o.siecle)).sort((a, b) => a - b).map(s => [String(s), siecleRomain(s)]),
    auteur: uniq(list.map(o => o.auteur)).map(id => [id, cat.A[id]?.nom || id]).sort((a, b) => a[1].localeCompare(b[1], "fr")),
    texte: [["oui", "Texte intégral à lire"], ["non", "Texte non reproduit (œuvre protégée)"]],
    fiche: [["oui", "Avec fiche de révision"], ["non", "Sans fiche"]]
  };
  const LABELS = { classe: "Classe", session: "Session du bac", objet: "Objet d'étude", genre: "Genre", mouvement: "Mouvement", siecle: "Siècle", auteur: "Auteur", texte: "Texte intégral", fiche: "Fiche de révision" };

  function matches(o) {
    if (state.classe && o.classe !== state.classe) return false;
    if (state.session === "hors" && o.programme.length) return false;
    if (state.session && state.session !== "hors" && !o.programme.some(p => p.session === state.session)) return false;
    if (state.objet && o.objet !== state.objet) return false;
    if (state.genre && o.genreS !== state.genre) return false;
    if (state.mouvement && !o.mouvements.includes(state.mouvement)) return false;
    if (state.siecle && String(o.siecle) !== state.siecle) return false;
    if (state.auteur && o.auteur !== state.auteur) return false;
    if (state.texte === "oui" && !o.texte?.disponible) return false;
    if (state.texte === "non" && o.texte?.disponible) return false;
    if (state.fiche === "oui" && !o.fiche) return false;
    if (state.fiche === "non" && o.fiche) return false;
    return true;
  }
  function score(o, words) {
    const hay = norm([o.titre, o.titreComplet, o.auteurObj.nom, o.genre, OBJETS[o.objet]?.nom, ...o.mouvementsObj.map(m => m.nom), ...o.programme.map(p => p.parcours), o.date].join(" "));
    if (!words.every(w => hay.includes(w))) return -1;
    return (norm(o.titre).includes(words.join(" ")) ? 3 : 0) + (norm(o.auteurObj.nom).includes(words[0]) ? 2 : 0) + (o.programme.some(p => p.actuelle) ? 1 : 0);
  }
  const year = o => parseInt((/(\d{3,4})/.exec(o.date) || [0, 9999])[1], 10);
  function results() {
    const words = norm(state.q).split(/\s+/).filter(Boolean);
    let r = list.filter(matches).map(o => ({ o, s: words.length ? score(o, words) : (o.programme.some(p => p.actuelle) ? 1 : 0) })).filter(x => x.s >= 0);
    const by = {
      pertinence: (a, b) => b.s - a.s || year(a.o) - year(b.o),
      titre: (a, b) => a.o.titre.localeCompare(b.o.titre, "fr"),
      auteur: (a, b) => a.o.auteurObj.nom.localeCompare(b.o.auteurObj.nom, "fr"),
      date: (a, b) => year(a.o) - year(b.o)
    };
    return r.sort(by[state.tri] || by.pertinence).map(x => x.o);
  }

  function urlFor(s = state) {
    const p = new URLSearchParams();
    if (s.q) p.set("q", s.q);
    FILTERS.forEach(k => { if (s[k]) p.set(k, s[k]); });
    if (s.tri && s.tri !== "pertinence") p.set("tri", s.tri);
    if (s.page > 1) p.set("page", s.page);
    const qs = p.toString();
    return "/bibliotheque" + (qs ? "?" + qs : "");
  }
  const activeCount = () => FILTERS.filter(k => state[k]).length;

  function filtersHtml() {
    const saved = store.savedFilters();
    return `<h2>Filtres ${activeCount() ? `<button class="btn ghost sm" id="resetF">Effacer</button>` : ""}</h2>
      ${FILTERS.map(k => `<div class="field"><label for="f-${k}">${LABELS[k]}</label>
        <select class="select" id="f-${k}" data-f="${k}"><option value="">Tous</option>${opts[k].map(([v, l]) => `<option value="${esc(v)}" ${state[k] === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`).join("")}
      <div class="field"><label>Filtres enregistrés</label>
        ${saved.length ? `<div class="status-bar">${saved.map(s => `<span class="chip" style="padding-right:4px"><a href="${esc(s.url)}" style="color:inherit;text-decoration:none">${esc(s.name)}</a><button class="icon-btn" style="width:22px;height:22px;border:0;background:none" data-delf="${esc(s.name)}" aria-label="Supprimer le filtre ${esc(s.name)}">${icon("close", "i-sm")}</button></span>`).join("")}</div>` : `<p class="small muted" style="margin:0">Aucun pour l'instant.</p>`}
        <button class="btn sm" id="saveF" ${activeCount() || state.q ? "" : "disabled"}>${icon("bookmark", "i-sm")} Enregistrer ces filtres</button></div>`;
  }

  function resultsHtml() {
    const r = results();
    const pages = Math.max(1, Math.ceil(r.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    const slice = r.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    const chips = FILTERS.filter(k => state[k]).map(k => `<button class="chip accent" data-clear="${k}" aria-label="Retirer le filtre ${LABELS[k]}">${esc(opts[k].find(x => x[0] === state[k])?.[1] || state[k])} ${icon("close", "i-sm")}</button>`).join("");
    return `<div class="lib-count" aria-live="polite">${r.length} œuvre${r.length > 1 ? "s" : ""}${r.length !== list.length ? ` sur ${list.length}` : ""}${chips ? ` · <span class="status-bar" style="display:inline-flex">${chips}</span>` : ""}</div>
      ${r.length ? `<div class="books">${slice.map(bookCard).join("")}</div>`
        : emptyState("Aucune œuvre ne correspond", "Essaie d'enlever un filtre ou de chercher un autre mot (titre, auteur, mouvement…).", `<button class="btn primary" id="resetAll">Tout afficher</button>`)}
      ${pages > 1 ? `<nav class="pager" aria-label="Pagination">${Array.from({ length: pages }, (_, i) => `<button data-page="${i + 1}" ${i + 1 === state.page ? 'aria-current="page"' : ""}>${i + 1}</button>`).join("")}</nav>` : ""}`;
  }

  const html = `<div class="wrap page">
    <div class="page-head"><h1>Bibliothèque</h1>
      <p>Les œuvres intégrales étudiées au lycée : textes à lire quand ils sont libres de droits, fiches de révision et liens vers les méthodes.</p></div>
    <div class="lib">
      <aside class="filters" id="filters" aria-label="Filtres">${filtersHtml()}</aside>
      <div>
        <div class="lib-top">
          <input class="input" type="search" id="libq" placeholder="Rechercher un titre, un auteur, un mouvement…" value="${esc(state.q)}" aria-label="Rechercher dans la bibliothèque">
          <label class="sr-only" for="tri">Trier par</label>
          <select class="select" id="tri">${[["pertinence", "Pertinence"], ["titre", "Titre (A-Z)"], ["auteur", "Auteur (A-Z)"], ["date", "Date de publication"]].map(([v, l]) => `<option value="${v}" ${state.tri === v ? "selected" : ""}>${l}</option>`).join("")}</select>
          <button class="btn filter-toggle" id="toggleF" aria-expanded="false" aria-controls="filters">${icon("filter", "i-sm")} Filtres${activeCount() ? ` (${activeCount()})` : ""}</button>
        </div>
        <div id="res">${resultsHtml()}</div>
        <div class="notice" style="margin-top:36px">${icon("info")}<div>
          <b>Ce que contient la bibliothèque.</b> ${list.length} œuvres sont intégrées pour l'instant : ${list.filter(o => o.classe === "1re").length} de première et ${list.filter(o => o.classe === "2nde").length} lectures de seconde. Le catalogue n'est pas exhaustif et s'enrichit progressivement.
          ${missing.length ? `<br>Œuvres officiellement au programme qui ne sont pas encore intégrées : ${missing.map(m => `<i>${esc(m.titre || m.oeuvre)}</i>${m.auteur ? ` (${esc(m.auteur)})` : ""} — ${esc(VOIES[m.voie] || m.voie)}`).join(" ; ")}.` : ""}
          Les textes encore protégés par le droit d'auteur ne sont pas reproduits : leur fiche indique comment se les procurer légalement.</div></div>
      </div>
    </div></div>`;

  return {
    title: "Bibliothèque",
    html,
    mount(root) {
      const res = root.querySelector("#res"), filters = root.querySelector("#filters");
      const sync = (resetPage = true) => {
        if (resetPage) state.page = 1;
        history.replaceState(null, "", urlFor());
        res.innerHTML = resultsHtml();
        filters.innerHTML = filtersHtml();
        root.querySelector("#toggleF").innerHTML = `${icon("filter", "i-sm")} Filtres${activeCount() ? ` (${activeCount()})` : ""}`;
      };
      let t;
      root.querySelector("#libq").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); sync(); }, 150); });
      root.querySelector("#tri").addEventListener("change", e => { state.tri = e.target.value; sync(); });
      root.querySelector("#toggleF").addEventListener("click", e => {
        const open = filters.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", open);
      });
      filters.addEventListener("change", e => { const k = e.target.dataset.f; if (k) { state[k] = e.target.value; sync(); } });
      filters.addEventListener("click", e => {
        if (e.target.closest("#resetF")) { FILTERS.forEach(k => { state[k] = ""; }); sync(); }
        else if (e.target.closest("#saveF")) {
          const name = prompt("Nom de ce filtre (ex. « Romans du programme ») :");
          if (name && name.trim()) { store.saveFilter(name.trim().slice(0, 40), urlFor({ ...state, page: 1 })); filters.innerHTML = filtersHtml(); toast("Filtre enregistré sur cet appareil"); }
        } else if (e.target.closest("[data-delf]")) { store.removeFilter(e.target.closest("[data-delf]").dataset.delf); filters.innerHTML = filtersHtml(); }
      });
      res.addEventListener("click", e => {
        const c = e.target.closest("[data-clear]"), p = e.target.closest("[data-page]");
        if (c) { state[c.dataset.clear] = ""; sync(); }
        else if (p) { state.page = +p.dataset.page; sync(false); root.querySelector(".lib-top").scrollIntoView({ behavior: "smooth" }); }
        else if (e.target.closest("#resetAll")) { FILTERS.forEach(k => { state[k] = ""; }); state.q = ""; root.querySelector("#libq").value = ""; sync(); }
      });
    }
  };
}
