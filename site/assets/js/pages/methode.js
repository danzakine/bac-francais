import { data } from "../data.js";
import { store } from "../store.js";
import { esc, icon, paras, favButton, wireFavs } from "../ui.js";
import { EPREUVES } from "./methodes.js";

const fmtDate = d => { try { return new Date(d).toLocaleDateString("fr-FR"); } catch (e) { return d; } };

/* Encadré « modalités officielles » tiré de epreuves.json */
export function modalitesHtml(ep, kind, full = false) {
  if (!ep) return "";
  const src = (ep.sources || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre)}</a>`).join(" · ");
  const voie = v => v === "generale" ? "Voie générale" : v === "technologique" ? "Voie technologique" : esc(v);
  let body = "";
  if (kind === "ecrit" && ep.ecrit) {
    const E = ep.ecrit;
    body = `<p>${[E.duree && `Durée : <b>${esc(E.duree)}</b>`, E.coefficient && `coefficient <b>${esc(E.coefficient)}</b>`].filter(Boolean).join(" · ")}${ep.calendrier?.ecrit ? ` · ${esc(ep.calendrier.ecrit)}` : ""}</p>
      ${E.sujets ? Object.entries(E.sujets).map(([v, l]) => `<p style="margin:12px 0 6px"><b>${voie(v)}</b> — au choix :</p><div class="table-wrap"><table class="t"><tbody>${l.map(x => `<tr><td style="width:30%"><b>${esc(x.exercice)}</b><br><span class="small muted">${esc(x.bareme || "")}</span></td><td>${esc(x.contenu || "")}</td></tr>`).join("")}</tbody></table></div>`).join("")
        : Object.entries(E.voies || {}).map(([v, t]) => `<p><b>${voie(v)} :</b> ${esc(t)}</p>`).join("")}
      ${full && E.notes ? [].concat(E.notes).map(n => `<p class="small">${esc(n)}</p>`).join("") : ""}`;
  } else if (kind === "oral" && ep.oral) {
    const O = ep.oral;
    body = `<p>${[O.preparation && `Préparation : <b>${esc(O.preparation)}</b>`, O.duree && `épreuve : <b>${esc(O.duree)}</b>`, O.coefficient && `coefficient <b>${esc(O.coefficient)}</b>`].filter(Boolean).join(" · ")}</p>
      ${O.parties?.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Partie</th><th>Durée</th><th>Points</th><th>Contenu</th></tr></thead><tbody>${O.parties.map(p => `<tr><td><b>${esc(p.titre)}</b></td><td>${esc(p.duree || "")}</td><td>${p.points != null ? esc(p.points) : ""}</td><td>${esc(p.contenu || "")}
        ${p.etapes?.length ? `<ul style="margin:8px 0 0;padding-left:18px">${p.etapes.map(e => `<li><b>${esc(e.titre)}</b>${e.points != null ? ` (${esc(e.points)} pts)` : ""} : ${esc(e.contenu || "")}</li>`).join("")}</ul>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${full && O.recapitulatif ? `<p class="small" style="margin-top:10px"><b>Récapitulatif :</b> ${esc(O.recapitulatif)}</p>` : ""}
      ${full && O.documents ? `<p class="small"><b>Documents :</b> ${esc(O.documents)}</p>` : ""}
      ${full && O.notation ? `<p class="small"><b>Notation :</b> ${esc(O.notation)}</p>` : ""}
      ${ep.calendrier?.oral ? `<p class="small" style="margin-top:8px"><b>Calendrier :</b> ${esc(ep.calendrier.oral)}</p>` : ""}`;
  }
  if (!body) return "";
  return `<div class="box"><h4>Modalités officielles — ${esc(ep.libelle || ep.session || "")}</h4>${body}
    ${full && ep.texteApplicable ? `<p class="small">${esc(ep.texteApplicable)}</p>` : ""}
    ${ep.aVerifier?.length ? `<details style="margin-top:6px"><summary class="small" style="color:var(--warn);cursor:pointer">Points à vérifier (${ep.aVerifier.length})</summary><ul class="small">${ep.aVerifier.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
    <p class="src">Sources : ${src || "—"}${ep.verifie ? ` · vérifié le ${fmtDate(ep.verifie)}` : ""}</p></div>`;
}

export default async function methode({ params }) {
  const [methodes, epreuves] = await Promise.all([data.methodes(), data.epreuves()]);
  const m = methodes.find(x => x.id === params.id);
  if (!m) throw new Error("introuvable");
  const secs = m.sections || [];
  const others = methodes.filter(x => x.epreuve === m.epreuve && x.id !== m.id);

  const secHtml = (s, i) => `<section class="sheet-sec" id="s${i + 1}"><h2>${esc(s.titre)}</h2>
    ${(s.etapes || []).map(e => `<div style="margin-bottom:18px"><h3 style="font-family:var(--sans);font-size:1.05rem;margin:0 0 6px">${esc(e.titre)}</h3><div class="prose">${paras(e.texte)}</div></div>`).join("")}
    ${s.texte ? `<div class="prose">${paras(s.texte)}</div>` : ""}
    ${s.tableau?.lignes?.length ? `${s.tableau.titre ? `<h3>${esc(s.tableau.titre)}</h3>` : ""}<div class="table-wrap"><table class="t">${s.tableau.colonnes ? `<thead><tr>${s.tableau.colonnes.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>` : ""}<tbody>${s.tableau.lignes.map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
    ${s.encadre ? `<div class="box"><h4>${esc(s.encadre.titre)}</h4><div class="prose">${paras(s.encadre.texte)}</div></div>` : ""}
    ${s.exemple ? `<div class="box example"><h4>${esc(s.exemple.titre || "Exemple")}</h4><div class="written">${paras(s.exemple.texte)}</div>
      ${s.exemple.commentaire ? `<span class="lbl">Pourquoi ça marche</span><div class="prose">${paras(s.exemple.commentaire)}</div>` : ""}</div>` : ""}
  </section>`;

  const extra = [];
  if (m.erreurs?.length) extra.push(["erreurs", "Erreurs fréquentes", `<ul class="checklist warn">${m.erreurs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`]);
  if (m.entrainement?.length) extra.push(["entrainement", "S'entraîner", `<p class="muted">Cherche d'abord ta réponse, par écrit ou à voix haute, puis ouvre la correction.</p>
    ${m.entrainement.map((q, i) => `<details class="acc"><summary>${i + 1}. ${esc(q.question)}</summary><div class="body"><span class="lbl">Correction</span><div class="prose">${paras(q.reponse)}</div></div></details>`).join("")}`]);
  if (m.sources?.length) extra.push(["sources", "Sources", `<ul>${m.sources.map(s => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre)}</a>` : esc(s.titre)}</li>`).join("")}</ul>`]);

  const kind = m.epreuve === "oral" ? "oral" : m.epreuve === "ecrit" ? "ecrit" : null;
  const html = `<div class="wrap page">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="/methodes">Méthodes</a> › <span>${esc(m.titre)}</span></nav>
    <div class="page-head" style="display:flex;gap:20px;justify-content:space-between;flex-wrap:wrap;align-items:flex-end">
      <div><div class="sec-label">${esc(EPREUVES[m.epreuve]?.[1] || "")}</div><h1>${esc(m.titre)}</h1><p>${esc(m.resume || "")}</p></div>
      <div class="btn-row no-print">${favButton("methode:" + m.id, "Favori", "Favori")}<button class="btn sm" onclick="print()">${icon("print", "i-sm")} Imprimer</button></div></div>
    <div class="sheet">
      <nav class="toc" aria-label="Sommaire"><b>Sommaire</b>${secs.map((s, i) => `<a href="#s${i + 1}">${esc(s.titre)}</a>`).join("")}${extra.map(([k, t]) => `<a href="#${k}">${t}</a>`).join("")}</nav>
      <article>
        ${kind ? modalitesHtml(epreuves, kind) : ""}
        ${secs.map(secHtml).join("")}
        ${extra.map(([k, t, b]) => `<section class="sheet-sec" id="${k}"><h2>${t}</h2>${b}</section>`).join("")}
        ${others.length ? `<div class="panel no-print"><h3>Dans la même épreuve</h3>${others.map(x => `<div style="padding:4px 0"><a href="/methodes/${x.id}">${esc(x.titre)}</a></div>`).join("")}</div>` : ""}
      </article></div></div>`;

  return { title: m.titre, html, mount(root) { store.logVisit("methode", m.id); wireFavs(root, "Favori", "Favori"); } };
}
