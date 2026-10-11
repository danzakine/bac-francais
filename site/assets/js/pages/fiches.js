import { data, OBJETS } from "../data.js";
import { store } from "../store.js";
import { esc, icon, cover, emptyState } from "../ui.js";

const STATUTS = { "a-revoir": ["warn", "À revoir"], maitrise: ["ok", "Maîtrisé"] };

export default async function fiches({ query }) {
  const cat = await data.catalogue();
  const withFiche = cat.list.filter(o => o.fiche);
  let tab = query.get("vue") || "programme";

  function row(o) {
    const st = store.sheetStatus(o.id), q = store.quiz()[o.id];
    return `<a class="row" href="/oeuvres/${o.id}/fiche">${cover(o, "xs")}<div class="grow"><b>${esc(o.titre)}</b>
      <span>${esc(o.auteurObj.nom)} · ${esc(OBJETS[o.objet].court)}${o.programme.some(p => p.actuelle) ? " · au programme" : ""}</span>
      <div class="status-bar" style="margin-top:6px">${st ? `<span class="chip ${STATUTS[st][0]}">${STATUTS[st][1]}</span>` : ""}${q ? `<span class="chip">Quiz : ${q.best}/${q.total}</span>` : ""}${store.isFav("fiche:" + o.id) ? `<span class="chip">${icon("heart", "i-sm")} Favori</span>` : ""}</div></div>${icon("next", "i-sm")}</a>`;
  }

  function body() {
    const status = store.allSheetStatus();
    let groups;
    if (tab === "a-revoir" || tab === "maitrise") {
      const l = withFiche.filter(o => status[o.id] === tab);
      if (!l.length) return emptyState(tab === "a-revoir" ? "Aucune fiche « À revoir »" : "Aucune fiche « Maîtrisé »",
        "Sur chaque fiche, utilise les boutons « À revoir » et « Maîtrisé » pour suivre où tu en es. Ce classement reste sur cet appareil.");
      groups = [["", l]];
    } else if (tab === "programme") {
      groups = Object.entries(OBJETS).map(([k, v]) => [v.nom, withFiche.filter(o => o.classe === "1re" && o.objet === k)]);
      groups.push(["Lectures de seconde et culture littéraire", withFiche.filter(o => o.classe !== "1re")]);
    } else {
      groups = [["", [...withFiche].sort((a, b) => a.titre.localeCompare(b.titre, "fr"))]];
    }
    return groups.filter(([, l]) => l.length).map(([t, l]) => `${t ? `<h2 style="font-size:1.2rem;margin:28px 0 12px">${esc(t)}</h2>` : ""}<div class="rows">${l.map(row).join("")}</div>`).join("");
  }

  const tabs = [["programme", "Par objet d'étude"], ["az", "De A à Z"], ["a-revoir", "À revoir"], ["maitrise", "Maîtrisé"]];
  const html = `<div class="wrap page narrow">
    <div class="page-head"><h1>Fiches de révision</h1>
      <p>${withFiche.length} fiches complètes : carte d'identité, résumé, analyse, citations vérifiées, préparation de l'écrit et de l'oral, résumé express et quiz.</p></div>
    <div class="grid-2" style="margin-bottom:28px">
      <a class="panel" href="/revision"><div class="panel-icon">${icon("bolt")}</div><h3>Révision express</h3><p class="muted">L'essentiel de chaque œuvre en quelques minutes, pour la veille de l'épreuve.</p></a>
      <a class="panel" href="/cartes"><div class="panel-icon">${icon("cards")}</div><h3>Cartes mémoire</h3><p class="muted">Citations et notions à retenir, avec rappels espacés.</p></a>
    </div>
    <div class="status-bar" role="tablist" aria-label="Classement des fiches">${tabs.map(([k, l]) => `<button class="btn sm" role="tab" data-tab="${k}" aria-pressed="${k === tab}" aria-selected="${k === tab}">${l}</button>`).join("")}</div>
    <div id="fl">${body()}</div></div>`;

  return {
    title: "Fiches de révision",
    html,
    mount(root) {
      root.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
        tab = b.dataset.tab;
        root.querySelectorAll("[data-tab]").forEach(x => { x.setAttribute("aria-pressed", x === b); x.setAttribute("aria-selected", x === b); });
        history.replaceState(null, "", "/fiches" + (tab === "programme" ? "" : "?vue=" + tab));
        root.querySelector("#fl").innerHTML = body();
      }));
    }
  };
}
