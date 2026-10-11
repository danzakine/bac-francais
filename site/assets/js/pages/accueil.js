import { data, OBJETS, VOIES } from "../data.js";
import { store } from "../store.js";
import { esc, icon, bookCard, cover, timeAgo, emptyState } from "../ui.js";

export default async function accueil() {
  const [cat, methodes] = await Promise.all([data.catalogue(), data.methodes()]);
  const sessions = cat.sessions;
  const pref = store.prefs();
  let sessionId = sessions.find(s => s.id === pref.session)?.id || sessions.find(s => s.actuelle)?.id || sessions[0]?.id;
  let voie = pref.voie || "generale";

  function programmeBlock() {
    const s = sessions.find(x => x.id === sessionId);
    if (!s) {
      const list = cat.list.filter(o => o.statut === "programme");
      return `<div class="notice warn">${icon("warn")}<div>La liste officielle par session est en cours de vérification. Œuvres de 1re actuellement intégrées :</div></div>
        <div class="books" style="margin-top:18px">${list.map(bookCard).join("")}</div>`;
    }
    const voies = Object.keys(s.voies || {});
    if (!voies.includes(voie)) voie = voies[0];
    const items = s.voies[voie] || [];
    const groups = Object.keys(OBJETS).map(k => {
      const its = items.filter(it => it.objet === k);
      if (!its.length) return "";
      return `<div style="margin-bottom:26px"><h3 style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span class="dot" style="background:${OBJETS[k].couleur}"></span>${OBJETS[k].nom}</h3>
        <div class="books">${its.map(it => {
          const o = cat.byId[it.oeuvre];
          if (o) return bookCard(o);
          return `<div class="book"><div class="cover" style="--c:#6b665d"><span class="k">${esc(OBJETS[k].nom)}</span><span class="t">${esc(it.titre || it.oeuvre)}</span><span class="a">${esc(it.auteur || "")}</span></div>
            <div class="book-meta"><div class="t">${esc(it.titre || it.oeuvre)}</div><div class="a">${esc(it.auteur || "")}</div><div class="tags"><span class="chip">Fiche non disponible</span></div></div></div>`;
        }).join("")}</div></div>`;
    }).join("");
    return `<div class="status-bar" style="margin-bottom:20px">
        ${voies.map(v => `<button class="btn sm" data-voie="${v}" aria-pressed="${v === voie}">${VOIES[v] || v}</button>`).join("")}
      </div>
      ${!s.actuelle ? `<div class="notice warn" style="margin-bottom:18px">${icon("warn")}<div>Session passée : ces œuvres ne sont plus au programme.</div></div>` : ""}
      ${groups}
      <p class="small muted">Ton professeur choisit une œuvre par objet d'étude. Source : <a href="${esc(s.source?.url)}" target="_blank" rel="noopener">${esc(s.source?.titre)}</a>${s.source?.verifie ? `, vérifié le ${esc(new Date(s.source.verifie).toLocaleDateString("fr-FR"))}` : ""} · <a href="/programme">détail du programme</a></p>`;
  }

  function resumeBlock() {
    const r = store.reading();
    const items = Object.entries(r).filter(([id]) => cat.byId[id]).sort((a, b) => b[1].t - a[1].t).slice(0, 3);
    if (!items.length) return "";
    return `<section class="section"><div class="section-head"><div><h2>Reprendre ma lecture</h2></div><a href="/progression">Toute ma progression →</a></div>
      <div class="rows">${items.map(([id, s]) => {
        const o = cat.byId[id];
        const pct = s.total ? Math.min(100, Math.round(((s.chap + (s.ratio || 0)) / s.total) * 100)) : 0;
        return `<a class="row" href="/lire/${id}">${cover(o, "xs")}<div class="grow"><b>${esc(o.titre)}</b><span>${esc(o.auteurObj.nom)} · ${pct} % · ${timeAgo(s.t)}</span><div class="bar"><span style="width:${pct}%"></span></div></div>${icon("next", "i-sm")}</a>`;
      }).join("")}</div></section>`;
  }

  function progressBlock() {
    const hist = store.history().filter(h => h.type === "fiche" && cat.byId[h.id]).slice(0, 4);
    const status = store.allSheetStatus();
    const nMait = Object.values(status).filter(s => s === "maitrise").length;
    const nRev = Object.values(status).filter(s => s === "a-revoir").length;
    const nFav = store.favorites().length;
    if (!hist.length && !nMait && !nRev && !nFav) {
      return emptyState("Ton espace de révision est vide pour l'instant",
        "Ouvre une fiche, commence une lecture ou ajoute une œuvre à tes favoris : ton historique et ta progression apparaîtront ici. Rien n'est envoyé sur Internet, tout reste dans ce navigateur.",
        `<a class="btn primary" href="/fiches">Voir les fiches</a><a class="btn" href="/bibliotheque">Explorer la bibliothèque</a>`);
    }
    return `<div class="grid-2">
      <div class="panel"><h3>Fiches consultées récemment</h3>${hist.length ? `<div style="margin-top:8px">${hist.map(h => `<div style="padding:6px 0"><a href="/oeuvres/${h.id}/fiche">${esc(cat.byId[h.id].titre)}</a> <span class="small muted">· ${timeAgo(h.t)}</span></div>`).join("")}</div>` : `<p class="muted">Aucune fiche consultée.</p>`}</div>
      <div class="panel"><h3>Mon suivi</h3>
        <p style="margin-top:8px"><b>${nMait}</b> fiche${nMait > 1 ? "s" : ""} maîtrisée${nMait > 1 ? "s" : ""} · <b>${nRev}</b> à revoir · <b>${nFav}</b> favori${nFav > 1 ? "s" : ""}</p>
        <a class="btn sm" href="/progression">Voir ma progression</a></div></div>`;
  }

  const metIds = ["commentaire", "dissertation", "explication-lineaire", "entretien", "grammaire", "memorisation"];
  const metList = metIds.map(id => methodes.find(m => m.id === id)).filter(Boolean);
  const metIcons = { ecrit: "feather", oral: "quote", revisions: "bolt" };

  const html = `
  <div class="wrap">
    <section class="hero">
      <h1>Lire, comprendre et réviser les œuvres du bac de français</h1>
      <p>Les textes intégraux libres de droits, des fiches de révision vérifiées et des méthodes claires pour l'écrit et l'oral, de la seconde à la première.</p>
      <form class="bigsearch" id="homeSearch" role="search">${icon("search")}<input type="search" name="q" placeholder="Une œuvre, un auteur, un mouvement, une notion…" aria-label="Rechercher"></form>
      <div class="hero-links"><a class="btn primary" href="/bibliotheque">${icon("library")} Ouvrir la bibliothèque</a><a class="btn" href="/methodes">${icon("method")} Méthodes du bac</a></div>
    </section>

    ${resumeBlock()}

    <section class="section" id="programme">
      <div class="section-head"><div><h2>Au programme du bac</h2><p>Œuvres officielles des épreuves anticipées de français.</p></div>
        ${sessions.length > 1 ? `<label class="session-pick small">Session <select class="select" id="sessionSel">${sessions.map(s => `<option value="${s.id}" ${s.id === sessionId ? "selected" : ""}>${esc(s.libelle)}</option>`).join("")}</select></label>`
          : sessions[0] ? `<span class="chip accent">${esc(sessions[0].libelle)}</span>` : ""}
      </div>
      <div id="progBlock">${programmeBlock()}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Réviser efficacement</h2><p>Des outils pour retenir, pas seulement pour lire.</p></div></div>
      <div class="grid-3">
        <a class="panel" href="/fiches"><div class="panel-icon">${icon("sheet")}</div><h3>Fiches de révision</h3><p class="muted">Résumé, analyse, citations vérifiées, sujets corrigés et préparation de l'oral pour chaque œuvre.</p></a>
        <a class="panel" href="/revision"><div class="panel-icon">${icon("bolt")}</div><h3>Révision express</h3><p class="muted">L'essentiel de chaque œuvre en quelques minutes, idéal la veille de l'épreuve.</p></a>
        <a class="panel" href="/cartes"><div class="panel-icon">${icon("cards")}</div><h3>Cartes mémoire</h3><p class="muted">Citations et notions à mémoriser, avec des rappels espacés automatiques.</p></a>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Méthodes de l'écrit et de l'oral</h2><p>Étape par étape, avec des exemples commentés.</p></div><a href="/methodes">Toutes les méthodes →</a></div>
      ${metList.length ? `<div class="grid-3">${metList.map(m => `<a class="panel" href="/methodes/${m.id}"><div class="panel-icon">${icon(metIcons[m.epreuve] || "method")}</div><h3>${esc(m.titre)}</h3><p class="muted">${esc(m.resume || "")}</p></a>`).join("")}</div>`
        : `<div class="notice">${icon("info")}<div>Les fiches méthode sont en cours de rédaction. En attendant, consulte <a href="/programme">les modalités des épreuves</a>.</div></div>`}
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Mouvements littéraires et notions</h2><p>Situer une œuvre dans son époque et maîtriser le vocabulaire de l'analyse.</p></div><a href="/mouvements">Frise des mouvements →</a></div>
      ${cat.mouvements.length ? `<div class="status-bar">${cat.mouvements.map(m => `<a class="btn sm" href="/mouvements/${m.id}">${esc(m.nom.replace(/^(Le |La |L'|Les )/, ""))} <span class="muted tiny">${esc(m.periode)}</span></a>`).join("")}</div>` : `<p class="muted">Les fiches des mouvements littéraires sont en cours de rédaction.</p>`}
      <p style="margin-top:16px"><a class="btn" href="/notions">${icon("list")} Glossaire des notions et procédés</a></p>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Mon espace</h2><p>Tes lectures, tes fiches et ton suivi, enregistrés sur cet appareil.</p></div></div>
      ${progressBlock()}
    </section>
  </div>`;

  return {
    title: "Accueil",
    html,
    mount(root) {
      root.querySelector("#homeSearch").addEventListener("submit", e => { e.preventDefault(); window.dispatchEvent(new CustomEvent("open-search", { detail: e.target.q.value })); });
      root.querySelector("#homeSearch input").addEventListener("focus", e => { e.target.blur(); window.dispatchEvent(new CustomEvent("open-search", { detail: e.target.value })); });
      const block = root.querySelector("#progBlock");
      const wire = () => block.querySelectorAll("[data-voie]").forEach(b => b.addEventListener("click", () => { voie = b.dataset.voie; store.setPref("voie", voie); block.innerHTML = programmeBlock(); wire(); }));
      wire();
      root.querySelector("#sessionSel")?.addEventListener("change", e => { sessionId = e.target.value; store.setPref("session", sessionId); block.innerHTML = programmeBlock(); wire(); });
    }
  };
}
