import { data, OBJETS, VOIES } from "../data.js";
import { store } from "../store.js";
import { esc, icon, paras } from "../ui.js";
import { modalitesHtml } from "./methode.js";

const fmtDate = d => { try { return new Date(d).toLocaleDateString("fr-FR"); } catch (e) { return d; } };
const srcHtml = s => s ? `<p class="src">Source : ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre)}</a>` : esc(s.titre)}${s.verifie ? ` · vérifié le ${fmtDate(s.verifie)}` : ""}</p>` : "";

export default async function programme() {
  const [cat, epreuves] = await Promise.all([data.catalogue(), data.epreuves()]);
  const P = cat.programme;
  const sessions = cat.sessions;
  let sid = sessions.find(s => s.id === store.prefs().session)?.id || sessions.find(s => s.actuelle)?.id || sessions[0]?.id;

  function sessionHtml() {
    const s = sessions.find(x => x.id === sid);
    if (!s) return `<div class="notice warn">${icon("warn")}<div>La liste officielle des œuvres par session n'a pas encore été intégrée.</div></div>`;
    return `${s.public ? `<p class="muted">${esc(s.public)}</p>` : ""}
      ${!s.actuelle ? `<div class="notice warn" style="margin-bottom:14px">${icon("warn")}<div>${/venir/i.test(s.libelle + (s.notes || []).join(" ")) ? "Session à venir : liste donnée à titre d'information." : "Session passée : ces œuvres ne sont plus au programme des épreuves actuelles."}</div></div>` : ""}
      ${Object.entries(s.voies || {}).map(([v, items]) => `<h3 style="margin:22px 0 10px">${esc(VOIES[v] || v)}</h3>
        <div class="table-wrap"><table class="t"><thead><tr><th>Objet d'étude</th><th>Œuvre</th><th>Parcours associé</th></tr></thead><tbody>
        ${items.map(it => { const o = it.oeuvre && cat.byId[it.oeuvre]; return `<tr><td>${esc(OBJETS[it.objet]?.nom || it.objet)}</td>
          <td>${o ? `<a href="/oeuvres/${o.id}">${esc(o.titre)}</a>, ${esc(o.auteurObj.nom)}` : `${esc(it.titre || "")}${it.auteur ? `, ${esc(it.auteur)}` : ""} <span class="chip">pas encore dans la bibliothèque</span>`}${it.precisions ? `<br><span class="small muted">${esc(it.precisions)}</span>` : ""}</td>
          <td><i>${esc(it.parcours || "")}</i></td></tr>`; }).join("")}</tbody></table></div>`).join("")}
      ${(s.notes || []).length ? `<ul class="small muted" style="margin-top:12px">${s.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      ${srcHtml(s.source)}`;
  }
  const objets = (blk, titre) => blk?.objets?.length ? `<section class="section"><h2>${titre}</h2><div class="kv-list" style="margin-top:14px">
      ${blk.objets.map(x => `<div><h4>${esc(x.intitule)}</h4>${x.attendus ? `<p>${esc(x.attendus)}</p>` : ""}</div>`).join("")}</div>
      ${blk.notes ? `<div class="prose small" style="margin-top:10px">${paras([].concat(blk.notes).join("\n"))}</div>` : ""}${srcHtml(blk.source)}</section>` : "";

  const html = `<div class="wrap page narrow">
    <div class="page-head"><h1>Programme officiel et épreuves</h1>
      <p>Ce que disent les textes officiels : œuvres au programme par session, objets d'étude de seconde et de première, déroulé des épreuves. Chaque information est accompagnée de sa source.</p></div>
    <div class="notice" style="margin-bottom:10px">${icon("info")}<div>Site indépendant, non affilié au ministère. En cas de doute, la référence reste le Bulletin officiel et ce que t'indique ton professeur.</div></div>

    <section class="section"><div class="section-head"><div><h2>Œuvres au programme du bac</h2><p>Épreuves anticipées de français (fin de première).</p></div>
      ${sessions.length > 1 ? `<label class="session-pick small">Session <select class="select" id="sess">${sessions.map(s => `<option value="${s.id}" ${s.id === sid ? "selected" : ""}>${esc(s.libelle)}</option>`).join("")}</select></label>` : ""}</div>
      <div id="sessBlock">${sessionHtml()}</div></section>

    ${epreuves ? `<section class="section"><h2>Les épreuves</h2>
      <h3 style="margin-top:16px">Écrit</h3>${modalitesHtml(epreuves, "ecrit", true)}
      <h3>Oral</h3>${modalitesHtml(epreuves, "oral", true)}
      ${epreuves.evolutions?.length ? `<h3>Ce qui a changé récemment</h3><ul class="checklist">${epreuves.evolutions.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <p style="margin-top:14px"><a href="/methodes">Méthodes de l'écrit et de l'oral →</a></p></section>` : ""}

    ${objets(P?.premiere, "Les objets d'étude de première")}
    ${objets(P?.seconde, "Le programme de seconde")}
  </div>`;

  return {
    title: "Programme et épreuves",
    html,
    mount(root) {
      root.querySelector("#sess")?.addEventListener("change", e => { sid = e.target.value; store.setPref("session", sid); root.querySelector("#sessBlock").innerHTML = sessionHtml(); });
    }
  };
}
