import { data } from "../data.js";
import { store } from "../store.js";
import { esc, icon, bookCard, emptyState, toast } from "../ui.js";

export default async function favoris() {
  const [cat, methodes] = await Promise.all([data.catalogue(), data.methodes()]);
  function body() {
    const favs = store.favorites();
    const oeuvres = favs.filter(k => k.startsWith("oeuvre:")).map(k => cat.byId[k.slice(7)]).filter(Boolean);
    const fiches = favs.filter(k => k.startsWith("fiche:")).map(k => cat.byId[k.slice(6)]).filter(Boolean);
    const mets = favs.filter(k => k.startsWith("methode:")).map(k => methodes.find(m => m.id === k.slice(8))).filter(Boolean);
    if (!oeuvres.length && !fiches.length && !mets.length) return emptyState("Aucun favori pour l'instant",
      "Sur la page d'une œuvre, d'une fiche ou d'une méthode, appuie sur le bouton cœur pour la retrouver ici.",
      `<a class="btn primary" href="/bibliotheque">Explorer la bibliothèque</a><a class="btn" href="/methodes">Voir les méthodes</a>`);
    const rm = key => `<button class="btn sm ghost" data-rm="${esc(key)}">${icon("close", "i-sm")} Retirer</button>`;
    return `${oeuvres.length ? `<section class="section" style="margin-top:20px"><h2>Œuvres</h2><div class="books" style="margin-top:14px">${oeuvres.map(bookCard).join("")}</div></section>` : ""}
      ${fiches.length ? `<section class="section"><h2>Fiches de révision</h2><div class="rows" style="margin-top:14px">${fiches.map(o => `<div class="row"><div class="grow"><a href="/oeuvres/${o.id}/fiche"><b>${esc(o.titre)}</b></a><span>${esc(o.auteurObj.nom)}</span></div>${rm("fiche:" + o.id)}</div>`).join("")}</div></section>` : ""}
      ${mets.length ? `<section class="section"><h2>Méthodes</h2><div class="rows" style="margin-top:14px">${mets.map(m => `<div class="row"><div class="grow"><a href="/methodes/${m.id}"><b>${esc(m.titre)}</b></a><span>${esc(m.resume || "")}</span></div>${rm("methode:" + m.id)}</div>`).join("")}</div></section>` : ""}`;
  }
  return {
    title: "Favoris",
    html: `<div class="wrap page"><div class="page-head"><h1>Favoris</h1><p>Tes œuvres, fiches et méthodes mises de côté, enregistrées sur cet appareil.</p></div><div id="fv">${body()}</div></div>`,
    mount(root) {
      const fv = root.querySelector("#fv");
      fv.addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { store.toggleFav(b.dataset.rm); fv.innerHTML = body(); toast("Retiré des favoris"); } });
    }
  };
}
