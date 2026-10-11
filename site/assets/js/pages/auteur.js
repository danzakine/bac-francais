import { data } from "../data.js";
import { esc, paras, bookCard } from "../ui.js";

export default async function auteur({ params }) {
  const cat = await data.catalogue();
  const a = cat.A[params.id];
  const oeuvres = cat.list.filter(o => o.auteur === params.id);
  if (!a && !oeuvres.length) throw new Error("introuvable");
  const nom = a?.nom || oeuvres[0].auteurObj.nom;
  const mvts = (a?.mouvements || []).map(id => cat.M[id]).filter(Boolean);
  const html = `<div class="wrap page narrow">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="/bibliotheque">Bibliothèque</a> › <span>${esc(nom)}</span></nav>
    <div class="page-head"><div class="sec-label">Auteur${a?.dates ? ` · ${esc(a.dates)}` : ""}</div><h1>${esc(nom)}</h1></div>
    ${a?.bio ? `<section class="sheet-sec"><h2>Biographie utile</h2><div class="prose">${paras(a.bio)}</div></section>` : `<p class="muted">La notice de cet auteur est en cours de rédaction.</p>`}
    ${a?.aRetenir?.length ? `<section class="sheet-sec"><h2>À retenir pour le bac</h2><ul class="checklist">${a.aRetenir.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
    ${mvts.length ? `<section class="sheet-sec"><h2>Mouvement${mvts.length > 1 ? "s" : ""}</h2><div class="status-bar">${mvts.map(m => `<a class="btn sm" href="/mouvements/${m.id}">${esc(m.nom)}</a>`).join("")}</div></section>` : ""}
    <section class="sheet-sec"><h2>Dans la bibliothèque</h2><div class="books">${oeuvres.map(bookCard).join("")}</div></section>
  </div>`;
  return { title: nom, html };
}
