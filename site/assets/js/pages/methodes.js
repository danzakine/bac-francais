import { data } from "../data.js";
import { esc, icon, emptyState } from "../ui.js";

export const EPREUVES = {
  ecrit: ["feather", "L'épreuve écrite", "Commentaire, dissertation, contraction et essai."],
  oral: ["quote", "L'épreuve orale", "Explication linéaire, lecture, grammaire et entretien."],
  revisions: ["bolt", "Réviser et mémoriser", "S'organiser, retenir les œuvres et les citations."]
};

export default async function methodes() {
  const [methodes, epreuves] = await Promise.all([data.methodes(), data.epreuves()]);
  const groups = Object.entries(EPREUVES).map(([k, [ic, titre, sous]]) => {
    const l = methodes.filter(m => m.epreuve === k);
    return l.length ? `<section class="section" style="margin-top:34px"><div class="section-head"><div><h2 style="display:flex;gap:10px;align-items:center">${icon(ic)} ${titre}</h2><p>${sous}</p></div></div>
      <div class="grid-3">${l.map(m => `<a class="panel" href="/methodes/${m.id}"><h3>${esc(m.titre)}</h3><p class="muted">${esc(m.resume || "")}</p>${m.duree ? `<p class="small" style="color:var(--ink-3);margin:8px 0 0">${icon("info", "i-sm")} ${esc(m.duree)}</p>` : ""}</a>`).join("")}</div></section>` : "";
  }).join("");

  const html = `<div class="wrap page">
    <div class="page-head"><h1>Méthodes du bac de français</h1>
      <p>Les méthodes de l'écrit et de l'oral, étape par étape, avec des exemples commentés tirés des œuvres de la bibliothèque.</p></div>
    <div class="grid-2">
      <a class="panel" href="/programme"><div class="panel-icon">${icon("compass")}</div><h3>Programme et déroulé des épreuves</h3><p class="muted">${epreuves ? "Durées, coefficients et barème de l'oral, avec leurs sources officielles." : "Objets d'étude et œuvres au programme, avec leurs sources officielles."}</p></a>
      <a class="panel" href="/notions"><div class="panel-icon">${icon("list")}</div><h3>Glossaire des notions</h3><p class="muted">Figures de style, versification, grammaire, registres : définitions et exemples.</p></a>
    </div>
    ${groups || emptyState("Les fiches méthode arrivent bientôt", "Elles sont en cours de rédaction.")}
  </div>`;
  return { title: "Méthodes", html };
}
