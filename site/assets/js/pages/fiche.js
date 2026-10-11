import { data, OBJETS } from "../data.js";
import { store } from "../store.js";
import { esc, icon, paras, favButton, wireFavs, verifChip, toast } from "../ui.js";

/* Compatibilité : fiches v1 (contexte, aRetenir) et v2 (identite, express) */
export function normalizeFiche(f) {
  const n = { ...f };
  if (!n.identite && f.contexte) n.identite = { auteur: f.contexte.auteur, contexte: f.contexte.epoque, mouvement: f.contexte.mouvement };
  if (!n.express && f.aRetenir) n.express = { idees: f.aRetenir };
  n.citations = (f.citations || []).map((c, i) => ({ ...c, _i: i }));
  return n;
}

/* Lien vers le passage : seulement pour une citation vérifiée dans le texte même du site, sans modernisation */
const fold = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const linkable = c => { const v = c.verification || {}; const src = fold(v.source), note = fold(v.note);
  return v.statut === "verifiee" && src.includes("du site") && !src.includes("n'est pas") && !src.includes("n’est pas") && !note.includes("moderni") && !note.includes("tradu"); };
const NATURE = { fait: ["ok", "Fait établi"], hypothese: ["warn", "Hypothèse d'interprétation"], debat: ["", "Débat critique"] };
const list = (arr, cls = "checklist") => arr?.length ? `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
const block = (title, body) => body ? `<h3>${esc(title)}</h3>${body}` : "";

export function quizWidget(root, fiche, id) {
  const qs = fiche.quiz || [];
  let i = 0, score = 0;
  const box = root;
  function q() {
    if (i >= qs.length) {
      store.saveQuiz(id, score, qs.length);
      const best = store.quiz()[id]?.best || score;
      const msg = score === qs.length ? "Sans faute : tu maîtrises l'œuvre." : score >= qs.length * .7 ? "Bon résultat. Relis les explications des questions manquées." : "Relis la fiche (résumé express, citations) puis recommence.";
      box.innerHTML = `<div class="quiz score"><div class="n">${score}/${qs.length}</div><p>${msg}</p><p class="small muted">Meilleur score enregistré : ${best}/${qs.length}</p><button class="btn primary" data-again>Recommencer</button></div>`;
      box.querySelector("[data-again]").onclick = () => { i = 0; score = 0; q(); };
      return;
    }
    const it = qs[i];
    box.innerHTML = `<div class="quiz"><div class="quiz-top"><span>Question ${i + 1} sur ${qs.length}</span><span>Score : ${score}</span></div>
      <h3>${esc(it.question)}</h3><div class="opts">${it.choix.map((c, j) => `<button data-j="${j}">${esc(c)}</button>`).join("")}</div><div data-fb></div></div>`;
    box.querySelector(".opts").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      const j = +b.dataset.j, ok = j === it.reponse;
      if (ok) score++;
      box.querySelectorAll(".opts button").forEach((x, k) => { x.disabled = true; if (k === it.reponse) x.classList.add("good"); else if (k === j) x.classList.add("bad"); });
      box.querySelector("[data-fb]").innerHTML = `<div class="feedback" role="status"><b>${ok ? "Bonne réponse." : "Ce n'est pas la bonne réponse."}</b> ${esc(it.explication || "")}</div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn primary" data-next>${i + 1 < qs.length ? "Question suivante" : "Voir mon score"}</button></div>`;
      const nx = box.querySelector("[data-next]"); nx.onclick = () => { i++; q(); }; nx.focus();
    });
  }
  q();
}

export default async function fiche({ params }) {
  const cat = await data.catalogue();
  const o = cat.byId[params.id];
  if (!o) throw new Error("introuvable");
  const f = normalizeFiche(await data.fiche(o.id));
  const id = o.id;
  const I = f.identite || {}, A = f.analyse || {}, E = f.ecrit || {}, O = f.oral || {}, X = f.express || {};
  const status = store.sheetStatus(id);

  const sections = [];
  const add = (key, label, title, body) => { if (body && body.trim()) sections.push({ key, label, title, body }); };

  add("identite", "A. Carte d'identité", "Carte d'identité", `
    <dl class="facts" style="margin-top:0">
      <div><dt>Auteur</dt><dd><a href="/auteurs/${o.auteur}">${esc(o.auteurObj.nom)}</a></dd></div>
      <div><dt>Date</dt><dd>${esc(o.date)}</dd></div><div><dt>Genre</dt><dd>${esc(o.genre)}</dd></div>
      <div><dt>Mouvement</dt><dd>${o.mouvementsObj.map(m => `<a href="/mouvements/${m.id}">${esc(m.nom)}</a>`).join(", ") || "—"}</dd></div></dl>
    ${block("L'auteur", I.auteur ? `<div class="prose">${paras(I.auteur)}</div>` : "")}
    ${block("Contexte historique, culturel et littéraire", I.contexte ? `<div class="prose">${paras(I.contexte)}</div>` : "")}
    ${block("Mouvement et genre", I.mouvement ? `<div class="prose">${paras(I.mouvement)}</div>` : "")}
    ${block("Circonstances de publication", I.circonstances ? `<div class="prose">${paras(I.circonstances)}</div>` : "")}
    ${block("Place dans l'œuvre de l'auteur", I.carriere ? `<div class="prose">${paras(I.carriere)}</div>` : "")}`);

  add("resume", "B. Résumé et compréhension", "Résumé et compréhension", `
    <div class="box"><h4>Résumé général</h4><div class="prose">${paras(f.resumeCourt)}</div></div>
    ${block("Résumé détaillé", f.resume?.length ? `<div class="timeline">${f.resume.map(s => `<div><h4>${esc(s.titre)}</h4><div class="prose">${paras(s.texte)}</div></div>`).join("")}</div>` : "")}
    ${block("Structure de l'œuvre", f.structure ? `<div class="prose">${paras(f.structure)}</div>` : "")}
    ${block(o.objet === "poesie" || o.objet === "idees" ? "Figures et voix" : "Personnages et relations", f.personnages?.length ? `<div class="people">${f.personnages.map(p => `<div class="person"><h4>${esc(p.nom)}</h4><p>${esc(p.role)}</p>${p.relations ? `<p><i>Relations :</i> ${esc(p.relations)}</p>` : ""}</div>`).join("")}</div>` : "")}
    ${block("Évolution", f.evolution ? `<div class="prose">${paras(f.evolution)}</div>` : "")}`);

  add("analyse", "C. Analyse littéraire", "Analyse littéraire", `
    ${block("Thèmes majeurs", (f.themes || []).map((t, i) => `<details class="acc" ${i === 0 ? "open" : ""}><summary>${esc(t.titre)}</summary><div class="body prose">${paras(t.texte)}</div></details>`).join(""))}
    ${block("Enjeux et problématiques", list(A.enjeux))}
    ${block("Intentions de l'auteur", A.intentions ? `<div class="prose">${paras(A.intentions)}</div>` : "")}
    ${block("Procédés littéraires importants", A.procedes?.length ? `<div class="kv-list">${A.procedes.map(p => `<div><h4>${esc(p.nom)}</h4><p>${esc(p.explication)}</p>${p.exemple ? `<p><i>Exemple :</i> ${esc(p.exemple)}</p>` : ""}</div>`).join("")}</div>` : "")}
    ${block("Style", A.style ? `<div class="prose">${paras(A.style)}</div>` : "")}
    ${block("Tonalités et registres", A.registres?.length ? `<div class="kv-list">${A.registres.map(r => `<div><h4>${esc(r.nom)}</h4><p>${esc(r.explication)}</p></div>`).join("")}</div>` : "")}
    ${block("Interprétations", A.interpretations?.length ? `<div class="kv-list">${A.interpretations.map(x => { const [c, l] = NATURE[x.nature] || NATURE.hypothese; return `<div><span class="chip ${c}">${l}</span><p style="margin-top:6px">${esc(x.texte)}</p></div>`; }).join("")}</div>` : "")}
    ${block("Liens avec le mouvement et le contexte", A.liens ? `<div class="prose">${paras(A.liens)}</div>` : "")}`);

  if (f.parcours) add("parcours", "Parcours", `Parcours : ${f.parcours.intitule}`, `
    <div class="prose">${paras(f.parcours.explication)}</div>
    ${block("Textes complémentaires", (f.parcours.textesComplementaires || []).length ? `<div class="kv-list">${f.parcours.textesComplementaires.map(t => `<div><h4>${esc(t.titre)} <span class="muted" style="font-weight:400">— ${esc(t.auteur)}</span></h4><p>${esc(t.interet)}</p></div>`).join("")}</div>` : "")}`);

  const canRead = o.texte.disponible;
  add("citations", "D. Citations", "Citations à mémoriser", `
    <p class="muted">Chaque citation porte son statut : <span class="chip ok">${icon("check", "i-sm")} Vérifiée</span> = contrôlée mot pour mot dans la source indiquée ; <span class="chip warn">${icon("warn", "i-sm")} À vérifier</span> = ne la cite pas comme exacte sans contrôle dans ton édition.</p>
    ${f.citations.map(c => `<div class="quote" id="cit-${c._i}"><blockquote>${esc(c.texte)}</blockquote>
      <div class="ref">${verifChip(c)}${c.locuteur ? `<span>${esc(c.locuteur)}</span> ·` : ""}<span>${esc(c.reference || "Référence non précisée")}</span>
        ${canRead && linkable(c) ? `· <a href="/lire/${id}?cit=${c._i}">Voir dans le texte</a>` : ""}</div>
      ${(c.situation || c.sens || c.analyse) ? `<dl>
        ${c.situation ? `<dt>Situation</dt><dd>${esc(c.situation)}</dd>` : ""}
        ${c.sens ? `<dt>Sens</dt><dd>${esc(c.sens)}</dd>` : ""}
        ${c.procedes ? `<dt>Procédés</dt><dd>${esc(c.procedes)}</dd>` : ""}
        ${c.demontre ? `<dt>Permet de montrer</dt><dd>${esc(c.demontre)}</dd>` : ""}
        ${c.usage ? `<dt>Pour le bac</dt><dd>${esc(c.usage)}</dd>` : ""}
        ${c.analyse && !c.sens ? `<dt>Analyse</dt><dd>${esc(c.analyse)}</dd>` : ""}
        ${c.verification?.source ? `<dt>Vérification</dt><dd class="small">${esc(c.verification.source)}${c.verification.note ? ` — ${esc(c.verification.note)}` : ""}</dd>` : ""}
      </dl>` : ""}</div>`).join("")}`);

  add("ecrit", "E. Préparer l'écrit", "Préparer l'écrit", `
    ${block("Idées essentielles", list(E.idees))}
    ${block("Axes d'analyse possibles", list(E.axes))}
    ${block("Grandes problématiques", list(E.problematiques))}
    ${block("Exemples précis à exploiter", E.exemples?.length ? `<div class="kv-list">${E.exemples.map(x => `<div><h4>${esc(x.exemple)}</h4><p>${esc(x.utilisation)}</p></div>`).join("")}</div>` : "")}
    ${block("Liens entre thèmes, personnages et procédés", E.liens ? `<div class="prose">${paras(E.liens)}</div>` : "")}
    ${block("Sujets de commentaire", E.sujetsCommentaire?.length ? `<div class="kv-list">${E.sujetsCommentaire.map(x => `<div><h4>${esc(x.passage)}</h4><p>${esc(x.pistes)}</p></div>`).join("")}</div>` : "")}
    ${block("Dissertations corrigées", (f.dissertations || []).map((d, i) => `<details class="acc" ${i === 0 ? "open" : ""}><summary>Sujet ${i + 1} — ${esc(d.sujet)}</summary><div class="body">
      ${d.analyse ? `<span class="lbl">Analyse du sujet</span><p>${esc(d.analyse)}</p>` : ""}
      <span class="lbl">Problématique</span><p><b>${esc(d.problematique)}</b></p>
      <span class="lbl">Plan détaillé</span><div class="plan">${(d.plan || []).map(p => `<b>${esc(p.titre)}</b><ul>${(p.arguments || []).map(a => `<li>${esc(a)}</li>`).join("")}</ul>`).join("")}</div>
      ${d.introduction ? `<span class="lbl">Introduction rédigée</span><div class="written">${paras(d.introduction)}</div>` : ""}
      ${d.conclusion ? `<span class="lbl">Conclusion rédigée</span><div class="written">${paras(d.conclusion)}</div>` : ""}</div></details>`).join("") + (f.dissertations?.length ? `<p class="small"><a href="/methodes/dissertation">Revoir la méthode de la dissertation →</a></p>` : ""))}
    ${block("Erreurs d'interprétation à éviter", list(E.erreurs, "checklist warn"))}`);

  add("oral", "F. Préparer l'oral", "Préparer l'oral", `
    ${block("Présenter l'œuvre en une minute", O.presentation ? `<div class="written">${paras(O.presentation)}</div>` : "")}
    ${block("L'essentiel pour l'entretien", list(O.essentiels))}
    ${block("Questions possibles de l'examinateur", O.questions?.length ? O.questions.map(q => `<details class="acc"><summary>${esc(q.question)}</summary><div class="body"><span class="lbl">Exemple de réponse argumentée</span><p>${esc(q.reponse)}</p></div></details>`).join("") : "")}
    ${block("Liens avec le parcours et d'autres œuvres", O.liens ? `<div class="prose">${paras(O.liens)}</div>` : "")}
    ${block("Questions de réflexion personnelle", O.reflexion?.length ? `<p class="small muted">Ces pistes t'aident à réfléchir : ton avis personnel, argumenté, reste ce que l'examinateur attend.</p>${O.reflexion.map(q => `<details class="acc"><summary>${esc(q.question)}</summary><div class="body"><p>${esc(q.pistes)}</p></div></details>`).join("")}` : "")}
    ${block("Extraits clés pour l'explication linéaire", (f.extraits || []).map(x => `<details class="acc"><summary><span>${esc(x.titre)}<br><span class="small muted" style="font-weight:400">${esc(x.reference)}</span></span></summary><div class="body">
      <span class="lbl">Projet de lecture</span><p>${esc(x.enjeu)}</p><span class="lbl">Mouvements du texte</span><ol style="padding-left:20px;margin:0">${(x.mouvements || []).map(m => `<li style="margin-bottom:6px">${esc(m)}</li>`).join("")}</ol></div></details>`).join("") + (f.extraits?.length ? `<p class="small"><a href="/methodes/explication-lineaire">Revoir la méthode de l'explication linéaire →</a></p>` : ""))}`);

  const xc = (X.citations || []).map(i => f.citations[i]).filter(c => c && c.verification?.statut === "verifiee");
  add("express", "G. Résumé express", "Résumé express", `<div class="express">
    ${block("À retenir", list(X.idees))}
    ${block("Citations utiles", xc.length ? xc.map(c => `<p class="serif" style="font-size:1.08rem;margin-bottom:4px">« ${esc(c.texte)} »</p><p class="small muted">${esc(c.reference)}</p>`).join("") : "")}
    ${block("Pièges à éviter", list(X.pieges, "checklist warn"))}
    ${block("Synthèse de dernière minute", X.synthese ? `<div class="prose">${paras(X.synthese)}</div>` : "")}</div>`);

  add("vocabulaire", "Vocabulaire", "Vocabulaire et procédés", f.vocabulaire?.length ? `<dl class="vocab">${f.vocabulaire.map(v => `<div><dt>${esc(v.terme)}</dt><dd>${esc(v.definition)}</dd></div>`).join("")}</dl><p class="small" style="margin-top:12px"><a href="/notions">Glossaire complet des notions →</a></p>` : "");

  add("quiz", "H. Auto-évaluation", "Auto-évaluation", f.quiz?.length ? `<p class="muted">${f.quiz.length} questions corrigées. Ton meilleur score est enregistré dans ta progression.</p><div id="quizBox"></div>` : "");

  add("sources", "Sources", "Sources et points de vigilance", `
    ${f.aVerifier?.length ? `<div class="notice warn" style="margin-bottom:14px">${icon("warn")}<div><b>Points signalés comme incertains :</b><ul style="margin:6px 0 0;padding-left:18px">${f.aVerifier.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div></div>` : ""}
    ${f.sources?.length ? `<ul>${f.sources.map(s => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre)}</a>` : esc(s.titre)}</li>`).join("")}</ul>` : ""}
    <p class="small muted">Texte de référence : ${o.texte.disponible ? `${esc(o.texte.edition)} (<a href="${esc(o.texte.url)}" target="_blank" rel="noopener">${esc(o.texte.source)}</a>).` : (o.texte.droits === "protege" ? "œuvre protégée, texte non reproduit sur le site." : `texte non reproduit sur le site (${esc(o.texte.droitsDetail || "")}).`)} Fiche rédigée pour le site ; signale toute erreur à ton professeur.</p>`);

  const html = `<div class="wrap page">
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="/fiches">Fiches</a> › <a href="/oeuvres/${id}">${esc(o.titre)}</a> › <span>Fiche de révision</span></nav>
    <div class="page-head" style="display:flex;gap:20px;justify-content:space-between;flex-wrap:wrap;align-items:flex-end">
      <div><div class="sec-label" style="color:${OBJETS[o.objet].couleur}">${esc(OBJETS[o.objet].nom)} · fiche de révision</div>
        <h1>${esc(o.titre)}</h1><p style="margin-top:4px">${esc(o.auteurObj.nom)} · ${esc(o.date)}${f.accroche ? ` — ${esc(f.accroche)}` : ""}</p></div>
      <div class="btn-row no-print">
        <button class="btn sm" data-status="a-revoir" aria-pressed="${status === "a-revoir"}">À revoir</button>
        <button class="btn sm" data-status="maitrise" aria-pressed="${status === "maitrise"}">${icon("check", "i-sm")} Maîtrisé</button>
        ${favButton("fiche:" + id, "Favori", "Favori")}
        <button class="btn sm" onclick="print()">${icon("print", "i-sm")} Imprimer</button>
        ${canRead ? `<a class="btn sm primary" href="/lire/${id}">${icon("read", "i-sm")} Lire l'œuvre</a>` : ""}
      </div>
    </div>
    <div class="sheet">
      <nav class="toc" aria-label="Sommaire de la fiche"><b>Sommaire</b>${sections.map(s => `<a href="#${s.key}" data-k="${s.key}">${esc(s.label)}</a>`).join("")}</nav>
      <article>${sections.map(s => `<section class="sheet-sec" id="${s.key}"><div class="sec-label">${esc(s.label)}</div><h2>${esc(s.title)}</h2>${s.body}</section>`).join("")}</article>
    </div></div>`;

  let observer;
  return {
    title: `Fiche — ${o.titre}`,
    html,
    mount(root) {
      store.logVisit("fiche", id);
      wireFavs(root, "Favori", "Favori");
      root.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", () => {
        const s = b.dataset.status, cur = store.sheetStatus(id), next = cur === s ? null : s;
        store.setSheetStatus(id, next);
        root.querySelectorAll("[data-status]").forEach(x => x.setAttribute("aria-pressed", x.dataset.status === next));
        toast(next === "maitrise" ? "Fiche marquée comme maîtrisée" : next === "a-revoir" ? "Fiche ajoutée à « À revoir »" : "Statut retiré");
      }));
      const qb = root.querySelector("#quizBox"); if (qb) quizWidget(qb, f, id);
      const links = Object.fromEntries([...root.querySelectorAll(".toc a")].map(a => [a.dataset.k, a]));
      observer = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { Object.values(links).forEach(a => a.classList.remove("on")); links[e.target.id]?.classList.add("on"); }
      }), { rootMargin: "-20% 0px -70% 0px" });
      root.querySelectorAll(".sheet-sec").forEach(s => observer.observe(s));
      const h = location.hash.slice(1);
      if (h.startsWith("cit-")) { const el = document.getElementById(h); el?.classList.add("target"); setTimeout(() => el?.scrollIntoView({ block: "center" }), 50); }
    },
    unmount() { observer?.disconnect(); }
  };
}
