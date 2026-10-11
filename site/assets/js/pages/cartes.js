import { data, OBJETS } from "../data.js";
import { store } from "../store.js";
import { esc, icon, emptyState } from "../ui.js";

const SESSION_MAX = 20;

/* Construit les cartes d'un paquet. Seules les citations vérifiées deviennent des cartes. */
async function buildDeck(deck, cat) {
  if (deck === "notions") {
    const notions = await data.notions();
    return notions.map(n => ({ id: "notion:" + n.id, front: n.terme, frontSub: "Notion · définis-la et donne un exemple", back: n.definition, backSub: n.exemple || "" }));
  }
  const ids = deck === "programme" ? cat.list.filter(o => o.fiche && o.programme.some(p => p.actuelle)).map(o => o.id)
    : deck === "toutes" ? cat.list.filter(o => o.fiche).map(o => o.id) : [deck];
  const fiches = await Promise.all(ids.map(id => data.fiche(id).then(f => [id, f]).catch(() => [id, null])));
  const cards = [];
  fiches.forEach(([id, f]) => {
    if (!f) return;
    const o = cat.byId[id];
    (f.citations || []).forEach((c, i) => {
      if (c.verification?.statut !== "verifiee") return;
      cards.push({ id: `cit:${id}:${i}`, front: c.texte, quote: true, frontSub: `${o.titre} — d'où vient cette citation et que montre-t-elle ?`,
        back: [c.locuteur, c.reference].filter(Boolean).join(" · "), backSub: c.demontre || c.sens || "", link: `/oeuvres/${id}/fiche#cit-${i}` });
    });
  });
  return cards;
}

export default async function cartes({ query }) {
  const cat = await data.catalogue();
  const notions = await data.notions();
  const works = cat.list.filter(o => o.fiche);
  let deck = query.get("paquet") || "programme";
  const decks = [["programme", "Citations des œuvres au programme"], ["toutes", "Citations de toutes les œuvres"], ...(notions.length ? [["notions", "Notions et procédés"]] : []),
    ...works.map(o => [o.id, `Citations — ${o.titre}`])];

  const html = `<div class="wrap page narrow">
    <div class="page-head"><h1>Cartes mémoire</h1>
      <p>Lis la face avant, réponds dans ta tête (ou à voix haute), puis retourne la carte. Si tu savais, la carte reviendra plus tard ; sinon, elle revient vite. C'est le principe des <a href="/methodes/memorisation">rappels espacés</a>.</p></div>
    <div class="field no-print" style="max-width:460px;margin-bottom:22px"><label for="deck">Paquet</label>
      <select class="select" id="deck">${decks.map(([v, l]) => `<option value="${esc(v)}" ${v === deck ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
    <div id="stage"><div class="loading">Préparation des cartes…</div></div>
    <p class="small muted" style="margin-top:28px">Les cartes de citations ne reprennent que des citations vérifiées mot pour mot. Ta progression (boîtes 1 à 5) est enregistrée sur cet appareil.</p></div>`;

  let keyHandler;
  return {
    title: "Cartes mémoire",
    html,
    unmount() { if (keyHandler) document.removeEventListener("keydown", keyHandler); },
    async mount(root) {
      const stage = root.querySelector("#stage");
      let cards = [], queue = [], idx = 0, flipped = false, known = 0, done = 0;

      function stats() {
        const st = store.cards(), now = Date.now();
        const due = cards.filter(c => !st[c.id] || st[c.id].due <= now);
        const mastered = cards.filter(c => (st[c.id]?.box || 0) >= 4).length;
        return { due, mastered, seen: cards.filter(c => st[c.id]).length };
      }
      function intro() {
        const s = stats();
        if (!cards.length) { stage.innerHTML = emptyState("Aucune carte dans ce paquet", "Ce paquet ne contient pas encore de citation vérifiée.", `<a class="btn" href="/fiches">Voir les fiches</a>`); return; }
        stage.innerHTML = `<div class="panel" style="text-align:center">
          <p style="font-size:1.05rem"><b>${cards.length}</b> carte${cards.length > 1 ? "s" : ""} · <b>${s.seen}</b> déjà vue${s.seen > 1 ? "s" : ""} · <b>${s.mastered}</b> bien ancrée${s.mastered > 1 ? "s" : ""}</p>
          <p class="muted">${s.due.length ? `${s.due.length} carte${s.due.length > 1 ? "s" : ""} à réviser aujourd'hui.` : "Rien à réviser aujourd'hui : reviens plus tard, ou entraîne-toi quand même."}</p>
          <div class="btn-row" style="justify-content:center">${s.due.length ? `<button class="btn primary" data-start="due">Réviser (${Math.min(SESSION_MAX, s.due.length)} cartes)</button>` : ""}
            <button class="btn ${s.due.length ? "" : "primary"}" data-start="all">Entraînement libre</button></div></div>`;
      }
      function start(mode) {
        const pool = mode === "due" ? stats().due : [...cards];
        queue = pool.sort(() => Math.random() - .5).slice(0, SESSION_MAX); idx = 0; known = 0; done = 0; show();
      }
      function show() {
        if (idx >= queue.length) {
          stage.innerHTML = `<div class="quiz score" style="margin:0 auto"><div class="n">${known}/${done}</div><p>cartes sues du premier coup.</p>
            <div class="btn-row" style="justify-content:center"><button class="btn primary" data-restart>Terminer</button></div></div>`;
          return;
        }
        const c = queue[idx]; flipped = false;
        stage.innerHTML = `<div class="flash"><p class="small muted" style="text-align:center">Carte ${idx + 1} sur ${queue.length}</p>
          <div class="flash-card" id="card" tabindex="0" role="button" aria-label="Retourner la carte">
            <div class="flash-face"><div class="q">${c.quote ? `« ${esc(c.front)} »` : esc(c.front)}</div><div class="hint">${esc(c.frontSub)}</div></div>
            <div class="flash-face back"><div class="q" style="font-size:1.1rem">${esc(c.back)}</div>${c.backSub ? `<p class="muted" style="margin-top:12px">${esc(c.backSub)}</p>` : ""}${c.link ? `<a class="small" href="${c.link}">Voir dans la fiche</a>` : ""}</div></div>
          <div class="flash-actions" id="acts"><button class="btn primary" data-flip>Retourner la carte</button></div></div>`;
        stage.querySelector("#card").focus();
      }
      function flip() {
        if (flipped) return; flipped = true;
        stage.querySelector("#card").classList.add("flipped");
        stage.querySelector("#acts").innerHTML = `<button class="btn" data-grade="0">Je ne savais pas</button><button class="btn primary" data-grade="1">${icon("check", "i-sm")} Je savais</button>`;
        stage.querySelector("[data-grade='1']").focus();
      }
      function grade(ok) { store.gradeCard(queue[idx].id, ok); done++; if (ok) known++; idx++; show(); }

      stage.addEventListener("click", e => {
        if (e.target.closest("a")) return;
        const s = e.target.closest("[data-start]"); if (s) return start(s.dataset.start);
        if (e.target.closest("[data-restart]")) return intro();
        const g = e.target.closest("[data-grade]"); if (g) return grade(g.dataset.grade === "1");
        if (e.target.closest("[data-flip]") || e.target.closest("#card")) flip();
      });
      keyHandler = e => {
        if (!stage.querySelector("#card") || e.target.closest("select, input, textarea")) return;
        if (e.key === " " || e.key === "Enter") { if (!flipped) { e.preventDefault(); flip(); } }
        else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) grade(false);
        else if (flipped && (e.key === "2" || e.key === "ArrowRight")) grade(true);
      };
      document.addEventListener("keydown", keyHandler);

      async function load() {
        stage.innerHTML = `<div class="loading">Préparation des cartes…</div>`;
        try { cards = await buildDeck(deck, cat); intro(); }
        catch (e) { stage.innerHTML = emptyState("Les cartes n'ont pas pu être chargées", "Vérifie ta connexion puis réessaie.", `<button class="btn primary" onclick="location.reload()">Recharger</button>`); }
      }
      root.querySelector("#deck").addEventListener("change", e => { deck = e.target.value; history.replaceState(null, "", "/cartes?paquet=" + deck); load(); });
      load();
    }
  };
}
