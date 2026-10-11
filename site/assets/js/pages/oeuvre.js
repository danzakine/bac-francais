import { data, OBJETS, VOIES, siecleRomain } from "../data.js";
import { store } from "../store.js";
import { esc, icon, cover, paras, favButton, wireFavs } from "../ui.js";

export default async function oeuvre({ params }) {
  const cat = await data.catalogue();
  const o = cat.byId[params.id];
  if (!o) throw new Error("introuvable");
  const fiche = o.fiche ? await data.fiche(o.id).catch(() => null) : null;
  const ctx = fiche?.identite?.contexte || fiche?.contexte?.epoque || "";
  const prog = o.programme;
  const reading = store.reading()[o.id];
  const sources = Object.fromEntries(cat.sessions.map(s => [s.id, s]));

  const progHtml = prog.length ? prog.map(p => {
    const s = sources[p.session];
    return `<div class="prog-box"><b>${esc(p.libelle)} — ${esc(VOIES[p.voie] || p.voie)}${p.actuelle ? "" : " (session passée)"}</b>
      <span>Objet d'étude : ${esc(OBJETS[o.objet].nom)} · Parcours : <i>${esc(p.parcours)}</i></span>
      ${p.precisions ? `<br><span class="small muted">Précision du programme : ${esc(p.precisions)}</span>` : ""}
      ${s?.source ? `<div class="src" style="margin-top:6px">Source : <a href="${esc(s.source.url)}" target="_blank" rel="noopener">${esc(s.source.titre)}</a>${s.source.verifie ? ` · vérifié le ${new Date(s.source.verifie).toLocaleDateString("fr-FR")}` : ""}</div>` : ""}</div>`;
  }).join("") : o.statut === "programme"
    ? `<div class="notice warn">${icon("warn")}<div>Œuvre inscrite au programme de première ; le détail par session est en cours de vérification sur les sources officielles.</div></div>`
    : `<div class="notice">${icon("info")}<div>Œuvre de culture littéraire, souvent étudiée en seconde (objet d'étude « ${esc(OBJETS[o.objet].nom)} »). Elle ne figure pas sur la liste nationale des épreuves anticipées : elle peut nourrir tes exemples en dissertation et ton entretien oral.</div></div>`;

  const t = o.texte;
  const dispo = t.disponible
    ? `<div class="panel"><h3 style="display:flex;gap:8px;align-items:center">${icon("read")} Texte intégral disponible</h3>
        <p class="muted">${esc(t.droitsDetail)}</p>
        <dl class="vocab small" style="margin:6px 0 14px">
          <div><dt>Édition</dt><dd>${esc(t.edition)}</dd></div>
          <div><dt>Provenance</dt><dd><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.source)}</a>${t.consulte ? ` · consulté le ${new Date(t.consulte).toLocaleDateString("fr-FR")}` : ""}</dd></div>
          <div><dt>Réutilisation</dt><dd>${esc(t.restrictions || "—")}</dd></div></dl>
        <a class="btn primary" href="/lire/${o.id}">${icon("read")} ${reading ? "Reprendre la lecture" : "Lire l'œuvre"}</a></div>`
    : `<div class="panel"><h3 style="display:flex;gap:8px;align-items:center">${icon("lock")} ${t.droits === "protege" ? "Œuvre protégée par le droit d'auteur" : "Texte intégral non disponible sur le site"}</h3>
        <p class="muted">${esc(t.droitsDetail)}${t.droits === "protege" ? " Seules de courtes citations sont présentes dans la fiche." : ""}</p>
        ${o.acquerir ? `<p><b>Se procurer le livre légalement :</b> ${esc(o.acquerir)}</p>` : ""}</div>`;

  const methodes = [["commentaire", "Le commentaire de texte"], ["dissertation", "La dissertation"], ["explication-lineaire", "L'explication linéaire"], ["entretien", "L'entretien de l'oral"]];

  const html = `<div class="wrap page">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="/bibliotheque">Bibliothèque</a> › <span>${esc(o.titre)}</span></nav>
    <div class="work-head">
      ${cover(o, "lg")}
      <div style="flex:1;min-width:0">
        <div class="status-bar">${prog.some(p => p.actuelle) ? `<span class="chip accent">Au programme · ${esc(prog.find(p => p.actuelle).libelle)}</span>` : o.statut === "complementaire" ? `<span class="chip">Lecture complémentaire · ${o.classe === "2nde" ? "seconde" : "première"}</span>` : ""}
          ${t.disponible ? `<span class="chip ok">Texte intégral sur le site</span>` : `<span class="chip">${t.droits === "protege" ? "Texte sous droits" : "Texte non reproduit"}</span>`}</div>
        <h1>${esc(o.titreComplet)}</h1>
        <p class="by"><a href="/auteurs/${o.auteur}">${esc(o.auteurObj.nom)}</a> · ${esc(o.date)}</p>
        ${fiche?.accroche ? `<p class="hook">${esc(fiche.accroche)}</p>` : ""}
        <div class="btn-row" style="margin-top:18px">
          ${t.disponible ? `<a class="btn primary" href="/lire/${o.id}">${icon("read")} ${reading ? "Reprendre la lecture" : "Lire l'œuvre"}</a>` : ""}
          ${fiche ? `<a class="btn ${t.disponible ? "" : "primary"}" href="/oeuvres/${o.id}/fiche">${icon("sheet")} Fiche de révision</a>` : ""}
          ${favButton("oeuvre:" + o.id)}
        </div>
      </div>
    </div>

    <dl class="facts">
      <div><dt>Auteur</dt><dd><a href="/auteurs/${o.auteur}">${esc(o.auteurObj.nom)}</a>${o.auteurObj.dates ? ` <span class="muted small">(${esc(o.auteurObj.dates)})</span>` : ""}</dd></div>
      <div><dt>Publication</dt><dd>${esc(o.date)}</dd></div>
      <div><dt>Genre</dt><dd>${esc(o.genre)}</dd></div>
      <div><dt>Mouvement</dt><dd>${o.mouvementsObj.length ? o.mouvementsObj.map(m => `<a href="/mouvements/${m.id}">${esc(m.nom)}</a>`).join(", ") : o.sansMouvement ? `<span class="small" style="font-weight:400">${esc(o.sansMouvement)}</span>` : "—"}</dd></div>
      <div><dt>Siècle</dt><dd>${esc(siecleRomain(o.siecle))}</dd></div>
      <div><dt>Objet d'étude</dt><dd>${esc(OBJETS[o.objet].nom)}</dd></div>
    </dl>

    <div class="split">
      <div>
        <section class="sheet-sec"><h2>Au programme ?</h2>${progHtml}</section>
        ${fiche ? `<section class="sheet-sec"><h2>Résumé</h2><div class="prose">${paras(fiche.resumeCourt)}</div>
            <a href="/oeuvres/${o.id}/fiche#resume">Résumé détaillé →</a></section>
          ${ctx ? `<section class="sheet-sec"><h2>Contexte historique</h2><div class="prose">${paras(ctx)}</div></section>` : ""}
          ${fiche.themes?.length ? `<section class="sheet-sec"><h2>Thèmes principaux</h2><ul class="checklist">${fiche.themes.map(th => `<li>${esc(th.titre)}</li>`).join("")}</ul>
            <p style="margin-top:12px"><a href="/oeuvres/${o.id}/fiche#analyse">Analyse détaillée →</a></p></section>` : ""}
          ${fiche.parcours ? `<section class="sheet-sec"><h2>Intérêt de l'œuvre dans le programme</h2><p class="muted">Parcours : <b>${esc(fiche.parcours.intitule)}</b></p><div class="prose">${paras((fiche.parcours.explication || "").split(/\n\s*\n/)[0])}</div>
            <a href="/oeuvres/${o.id}/fiche#parcours">Le parcours en détail →</a></section>` : ""}`
        : `<div class="notice">${icon("info")}<div>La fiche de révision de cette œuvre n'est pas encore rédigée.</div></div>`}
      </div>
      <aside style="display:flex;flex-direction:column;gap:16px">
        ${dispo}
        ${o.auteurObj.bio ? `<div class="panel"><h3>${esc(o.auteurObj.nom)}</h3><p class="muted small">${esc(o.auteurObj.bio)}</p><a class="small" href="/auteurs/${o.auteur}">Fiche de l'auteur →</a></div>` : ""}
        <div class="panel"><h3>Méthodes associées</h3>${methodes.map(([id, l]) => `<div style="padding:4px 0"><a href="/methodes/${id}">${esc(l)}</a></div>`).join("")}</div>
      </aside>
    </div></div>`;

  return { title: o.titre, html, mount(root) { wireFavs(root); } };
}
