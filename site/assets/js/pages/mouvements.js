import { data, siecleRomain } from "../data.js";
import { esc, emptyState } from "../ui.js";

export default async function mouvements() {
  const cat = await data.catalogue();
  const M = cat.mouvements;
  const nOeuvres = id => cat.list.filter(o => o.mouvements.includes(id)).length;
  const bySiecle = [...new Set(M.map(m => m.siecle))].sort((a, b) => a - b);
  const html = `<div class="wrap page narrow">
    <div class="page-head"><h1>Mouvements littéraires</h1>
      <p>Situer une œuvre dans son époque : les grands mouvements et courants, du Moyen Âge à aujourd'hui, avec leurs caractéristiques, leurs auteurs et les œuvres de la bibliothèque qui s'y rattachent.</p></div>
    ${M.length ? bySiecle.map(s => `<h2 style="font-size:1.15rem;margin:30px 0 4px">${esc(siecleRomain(s))}</h2>
      ${M.filter(m => m.siecle === s).map(m => `<div class="era"><div class="when">${esc(m.periode)}</div><div>
        <h3 style="margin-bottom:4px"><a href="/mouvements/${m.id}" style="color:inherit">${esc(m.nom)}</a></h3>
        <p class="muted" style="margin:0">${esc(m.resume)}</p>
        ${nOeuvres(m.id) ? `<p class="small" style="margin:6px 0 0"><a href="/mouvements/${m.id}">${nOeuvres(m.id)} œuvre${nOeuvres(m.id) > 1 ? "s" : ""} dans la bibliothèque →</a></p>` : ""}</div></div>`).join("")}`).join("")
      : emptyState("Fiches en cours de rédaction", "Les fiches des mouvements littéraires seront bientôt disponibles.")}
  </div>`;
  return { title: "Mouvements littéraires", html };
}
