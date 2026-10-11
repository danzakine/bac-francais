import { data, norm } from "../data.js";
import { esc, emptyState } from "../ui.js";

const CATS = { figures: "Figures de style", versification: "Versification", recit: "Récit", theatre: "Théâtre", argumentation: "Argumentation", grammaire: "Grammaire", genres: "Genres", registres: "Registres et tonalités" };

export default async function notions() {
  const all = await data.notions();
  let q = "", c = "";
  const cats = Object.keys(CATS).filter(k => all.some(n => n.categorie === k));
  function body() {
    const w = norm(q).split(/\s+/).filter(Boolean);
    const l = all.filter(n => (!c || n.categorie === c) && w.every(x => norm(n.terme + " " + n.definition).includes(x)));
    if (!l.length) return emptyState("Aucune notion trouvée", "Essaie un autre mot ou une autre catégorie.");
    return cats.filter(k => l.some(n => n.categorie === k)).map(k => `<h2 style="font-size:1.15rem;margin:28px 0 6px">${CATS[k]}</h2><dl class="vocab">
      ${l.filter(n => n.categorie === k).sort((a, b) => a.terme.localeCompare(b.terme, "fr")).map(n => `<div id="${esc(n.id)}"><dt>${esc(n.terme)}</dt><dd>${esc(n.definition)}
        ${n.exemple ? `<div class="serif" style="margin-top:6px;color:var(--ink)">${esc(n.exemple)}</div>` : ""}${n.source ? `<div class="tiny" style="color:var(--ink-3)">${esc(n.source)}</div>` : ""}</dd></div>`).join("")}</dl>`).join("");
  }
  const html = `<div class="wrap page narrow">
    <div class="page-head"><h1>Notions et procédés</h1><p>Le vocabulaire de l'analyse littéraire et de la grammaire, avec des exemples. Les exemples tirés d'œuvres sont vérifiés ; les autres sont signalés comme exemples forgés.</p></div>
    ${all.length ? `<div class="lib-top"><input class="input" type="search" id="nq" placeholder="Chercher une notion (ex. anaphore, alexandrin, subordonnée…)" aria-label="Chercher une notion">
      <label class="sr-only" for="nc">Catégorie</label><select class="select" id="nc"><option value="">Toutes les catégories</option>${cats.map(k => `<option value="${k}">${CATS[k]}</option>`).join("")}</select></div>
      <p class="small muted">Entraîne-toi aussi avec les <a href="/cartes?paquet=notions">cartes mémoire des notions</a>.</p>
      <div id="nl">${body()}</div>` : emptyState("Glossaire en cours de rédaction", "Les notions seront bientôt disponibles.")}
  </div>`;
  return {
    title: "Notions et procédés", html,
    mount(root) {
      const nl = root.querySelector("#nl"); if (!nl) return;
      root.querySelector("#nq").addEventListener("input", e => { q = e.target.value; nl.innerHTML = body(); });
      root.querySelector("#nc").addEventListener("change", e => { c = e.target.value; nl.innerHTML = body(); });
      const h = decodeURIComponent(location.hash.slice(1));
      if (h) setTimeout(() => { const el = document.getElementById(h); if (el) { el.scrollIntoView({ block: "center" }); el.style.background = "var(--accent-2)"; } }, 50);
    }
  };
}
