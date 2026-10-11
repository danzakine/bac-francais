import { data, OBJETS } from "../data.js";
import { store } from "../store.js";
import { esc, icon, paras, cover, emptyState } from "../ui.js";
import { normalizeFiche } from "./fiche.js";

const list = (arr, cls = "checklist") => arr?.length ? `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";

export function expressHtml(o, f) {
  const X = f.express || {};
  const cits = (X.citations || []).map(i => f.citations[i]).filter(c => c && c.verification?.statut === "verifiee");
  return `<div class="express">
    ${X.idees?.length ? `<h3>À retenir</h3>${list(X.idees)}` : `<p>${esc(f.resumeCourt || "")}</p>`}
    ${cits.length ? `<h3>Citations vérifiées</h3>${cits.map(c => `<p class="serif" style="font-size:1.06rem;margin-bottom:2px">« ${esc(c.texte)} »</p><p class="small muted">${esc(c.reference || "")}</p>`).join("")}` : ""}
    ${X.pieges?.length ? `<h3>Pièges à éviter</h3>${list(X.pieges, "checklist warn")}` : ""}
    ${X.synthese ? `<h3>Synthèse de dernière minute</h3><div class="prose">${paras(X.synthese)}</div>` : ""}
    <div class="btn-row no-print" style="margin-top:14px"><a class="btn sm" href="/oeuvres/${o.id}/fiche">Fiche complète</a>${f.quiz?.length ? `<a class="btn sm" href="/oeuvres/${o.id}/fiche#quiz">Faire le quiz</a>` : ""}</div></div>`;
}

export default async function revision({ query }) {
  const cat = await data.catalogue();
  const works = cat.list.filter(o => o.fiche);
  let vue = query.get("vue") || "programme";
  const VUES = [["programme", "Au programme"], ["a-revoir", "À revoir"], ["favoris", "Mes favoris"], ["toutes", "Toutes"]];

  function selection() {
    const st = store.allSheetStatus();
    if (vue === "programme") { const cur = works.filter(o => o.programme.some(p => p.actuelle)); return cur.length ? cur : works.filter(o => o.statut === "programme"); }
    if (vue === "a-revoir") return works.filter(o => st[o.id] === "a-revoir");
    if (vue === "favoris") return works.filter(o => store.isFav("oeuvre:" + o.id) || store.isFav("fiche:" + o.id));
    return works;
  }
  function body() {
    const sel = selection();
    if (!sel.length) return emptyState(vue === "a-revoir" ? "Aucune fiche à revoir" : "Aucun favori",
      vue === "a-revoir" ? "Marque des fiches « À revoir » pour les retrouver ici." : "Ajoute des œuvres ou des fiches à tes favoris pour les retrouver ici.",
      `<a class="btn" href="/fiches">Voir les fiches</a>`);
    return Object.keys(OBJETS).map(k => {
      const l = sel.filter(o => o.objet === k);
      return l.length ? `<h2 style="font-size:1.15rem;margin:26px 0 10px">${OBJETS[k].nom}</h2>${l.map(o => `<details class="acc" data-id="${o.id}">
        <summary><span style="display:flex;gap:12px;align-items:center">${cover(o, "xs")}<span>${esc(o.titre)}<br><span class="small muted" style="font-weight:400">${esc(o.auteurObj.nom)} · ${esc(o.date)}</span></span></span></summary>
        <div class="body" data-body>Chargement…</div></details>`).join("")}` : "";
    }).join("");
  }

  const html = `<div class="wrap page narrow">
    <nav class="crumbs"><a href="/fiches">Fiches</a> › <span>Révision express</span></nav>
    <div class="page-head"><h1>Révision express</h1><p>Pour chaque œuvre : les idées essentielles, les citations vérifiées les plus utiles, les pièges et une synthèse à relire juste avant l'épreuve.</p></div>
    <div class="notice" style="margin-bottom:20px">${icon("info")}<div><b>Dernière ligne droite :</b> relis la synthèse, puis cache l'écran et redis à voix haute 3 idées et 2 citations par œuvre. Se tester est plus efficace que relire (<a href="/methodes/memorisation">méthode</a>).</div></div>
    <div class="status-bar no-print">${VUES.map(([k, l]) => `<button class="btn sm" data-vue="${k}" aria-pressed="${k === vue}">${l}</button>`).join("")}
      <button class="btn sm" id="openAll">Tout déplier</button><button class="btn sm" onclick="print()">${icon("print", "i-sm")} Imprimer</button></div>
    <div id="rv">${body()}</div></div>`;

  let onPrint;
  return {
    title: "Révision express",
    unmount() { window.removeEventListener("beforeprint", onPrint); },
    html,
    mount(root) {
      const rv = root.querySelector("#rv");
      async function fill(d) {
        const b = d.querySelector("[data-body]"); if (b.dataset.done) return; b.dataset.done = "1";
        try { const o = cat.byId[d.dataset.id]; b.innerHTML = expressHtml(o, normalizeFiche(await data.fiche(o.id))); store.logVisit("express", o.id); }
        catch (e) { b.innerHTML = `<p class="muted">La fiche n'a pas pu être chargée. Vérifie ta connexion.</p>`; delete b.dataset.done; }
      }
      rv.addEventListener("toggle", e => { if (e.target.open) fill(e.target); }, true);
      root.querySelector("#openAll").addEventListener("click", () => rv.querySelectorAll("details").forEach(d => { d.open = true; }));
      onPrint = () => rv.querySelectorAll("details").forEach(fill);
      window.addEventListener("beforeprint", onPrint);
      root.querySelectorAll("[data-vue]").forEach(b => b.addEventListener("click", () => {
        vue = b.dataset.vue; root.querySelectorAll("[data-vue]").forEach(x => x.setAttribute("aria-pressed", x === b));
        history.replaceState(null, "", "/revision" + (vue === "programme" ? "" : "?vue=" + vue));
        rv.innerHTML = body();
      }));
    }
  };
}
