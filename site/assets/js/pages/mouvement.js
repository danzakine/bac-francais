import { data } from "../data.js";
import { esc, paras, bookCard } from "../ui.js";

export default async function mouvement({ params }) {
  const cat = await data.catalogue();
  const m = cat.M[params.id];
  if (!m) throw new Error("introuvable");
  const oeuvres = cat.list.filter(o => o.mouvements.includes(m.id));
  const auteurs = (m.auteurs || []).map(id => cat.A[id]).filter(Boolean);
  const i = cat.mouvements.indexOf(m), prev = cat.mouvements[i - 1], next = cat.mouvements[i + 1];
  const html = `<div class="wrap page narrow">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="/mouvements">Mouvements littéraires</a> › <span>${esc(m.nom)}</span></nav>
    <div class="page-head"><div class="sec-label">${esc(m.periode)}</div><h1>${esc(m.nom)}</h1><p>${esc(m.resume)}</p></div>
    ${m.contexte ? `<section class="sheet-sec"><h2>Contexte</h2><div class="prose">${paras(m.contexte)}</div></section>` : ""}
    ${m.caracteristiques?.length ? `<section class="sheet-sec"><h2>Caractéristiques</h2><ul class="checklist">${m.caracteristiques.map(c => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}
    ${auteurs.length ? `<section class="sheet-sec"><h2>Auteurs de la bibliothèque</h2><div class="status-bar">${auteurs.map(a => `<a class="btn sm" href="/auteurs/${a.id}">${esc(a.nom)}</a>`).join("")}</div></section>` : ""}
    ${m.oeuvresCles?.length ? `<section class="sheet-sec"><h2>Œuvres clés à connaître</h2><ul>${m.oeuvresCles.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
    ${oeuvres.length ? `<section class="sheet-sec"><h2>Dans la bibliothèque</h2><div class="books">${oeuvres.map(bookCard).join("")}</div></section>` : ""}
    <nav class="btn-row" style="justify-content:space-between">${prev ? `<a class="btn" href="/mouvements/${prev.id}">← ${esc(prev.nom)}</a>` : "<span></span>"}${next ? `<a class="btn" href="/mouvements/${next.id}">${esc(next.nom)} →</a>` : ""}</nav>
  </div>`;
  return { title: m.nom, html };
}
