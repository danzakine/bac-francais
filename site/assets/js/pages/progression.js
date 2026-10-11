import { data } from "../data.js";
import { store } from "../store.js";
import { esc, icon, cover, timeAgo, emptyState, toast } from "../ui.js";

const TYPES = { fiche: ["Fiche", o => `/oeuvres/${o}/fiche`], lecture: ["Lecture", o => `/lire/${o}`], methode: ["Méthode", m => `/methodes/${m}`], express: ["Révision express", o => `/oeuvres/${o}/fiche#express`] };

export default async function progression() {
  const [cat, methodes] = await Promise.all([data.catalogue(), data.methodes()]);
  function body() {
    const reading = Object.entries(store.reading()).filter(([id]) => cat.byId[id]).sort((a, b) => b[1].t - a[1].t);
    const status = store.allSheetStatus(), quiz = store.quiz(), cards = store.cards(), marks = store.allMarks(), hist = store.history();
    const withFiche = cat.list.filter(o => o.fiche);
    const nM = withFiche.filter(o => status[o.id] === "maitrise").length, nR = withFiche.filter(o => status[o.id] === "a-revoir").length;
    const cardVals = Object.values(cards), now = Date.now();
    const nMarks = Object.values(marks).reduce((s, l) => s + l.length, 0);
    const empty = !reading.length && !Object.keys(status).length && !Object.keys(quiz).length && !cardVals.length && !hist.length;
    const label = (h) => {
      if (h.type === "methode") { const m = methodes.find(x => x.id === h.id); return m ? m.titre : null; }
      return cat.byId[h.id]?.titre || null;
    };
    return `${empty ? emptyState("Rien à afficher pour l'instant", "Commence une lecture, ouvre une fiche ou fais un quiz : ta progression apparaîtra ici automatiquement.", `<a class="btn primary" href="/bibliotheque">Bibliothèque</a><a class="btn" href="/fiches">Fiches</a>`) : `
      <div class="grid-3">
        <div class="panel"><h3>Fiches</h3><p><b>${nM}</b> maîtrisée${nM > 1 ? "s" : ""} · <b>${nR}</b> à revoir · ${withFiche.length - nM - nR} sans statut</p><div class="bar"><span style="width:${withFiche.length ? Math.round(nM / withFiche.length * 100) : 0}%"></span></div><a class="small" href="/fiches?vue=a-revoir">Mes fiches à revoir →</a></div>
        <div class="panel"><h3>Cartes mémoire</h3><p><b>${cardVals.length}</b> carte${cardVals.length > 1 ? "s" : ""} vue${cardVals.length > 1 ? "s" : ""} · <b>${cardVals.filter(c => c.box >= 4).length}</b> bien ancrée${cardVals.filter(c => c.box >= 4).length > 1 ? "s" : ""} · <b>${cardVals.filter(c => c.due <= now).length}</b> à revoir aujourd'hui</p><a class="small" href="/cartes">Réviser les cartes →</a></div>
        <div class="panel"><h3>Lecture</h3><p><b>${reading.length}</b> œuvre${reading.length > 1 ? "s" : ""} commencée${reading.length > 1 ? "s" : ""} · <b>${nMarks}</b> signet${nMarks > 1 ? "s" : ""}, surlignage${nMarks > 1 ? "s" : ""} et note${nMarks > 1 ? "s" : ""}</p></div>
      </div>
      ${reading.length ? `<section class="section"><h2>Mes lectures</h2><div class="rows" style="margin-top:14px">${reading.map(([id, s]) => { const o = cat.byId[id]; const pct = s.total ? Math.min(100, Math.round(((s.chap + (s.ratio || 0)) / s.total) * 100)) : 0;
        return `<a class="row" href="/lire/${id}">${cover(o, "xs")}<div class="grow"><b>${esc(o.titre)}</b><span>${pct} % · ${timeAgo(s.t)}${(marks[id] || []).length ? ` · ${(marks[id] || []).length} marque${(marks[id] || []).length > 1 ? "s" : ""}` : ""}</span><div class="bar"><span style="width:${pct}%"></span></div></div>${icon("next", "i-sm")}</a>`; }).join("")}</div></section>` : ""}
      ${Object.keys(quiz).length ? `<section class="section"><h2>Mes quiz</h2><div class="rows" style="margin-top:14px">${Object.entries(quiz).filter(([id]) => cat.byId[id]).sort((a, b) => b[1].t - a[1].t).map(([id, q]) => `<a class="row" href="/oeuvres/${id}/fiche#quiz"><div class="grow"><b>${esc(cat.byId[id].titre)}</b><span>Meilleur score ${q.best}/${q.total} · dernier ${q.last}/${q.total} · ${timeAgo(q.t)}</span></div>${icon("next", "i-sm")}</a>`).join("")}</div></section>` : ""}
      ${hist.length ? `<section class="section"><h2>Historique</h2><div class="rows" style="margin-top:14px">${hist.slice(0, 25).map(h => { const l = label(h), T = TYPES[h.type]; return l && T ? `<a class="row" href="${T[1](h.id)}"><div class="grow"><b>${esc(l)}</b><span>${T[0]} · ${timeAgo(h.t)}</span></div>${icon("next", "i-sm")}</a>` : ""; }).join("")}</div></section>` : ""}`}`;
  }
  const html = `<div class="wrap page">
    <div class="page-head"><h1>Progression et révisions</h1><p>Tes lectures, tes fiches, tes quiz et tes cartes mémoire. Aucune donnée n'est inventée : tout vient de ce que tu as fait sur ce site.</p></div>
    <div id="pg">${body()}</div>
    <section class="section"><h2>Mes données</h2>
      <div class="notice" style="margin:14px 0">${icon("info")}<div><b>Où sont enregistrées tes données ?</b> Uniquement dans ce navigateur, sur cet appareil (stockage local). Il n'y a pas de compte ni de sauvegarde en ligne : si tu changes d'appareil ou de navigateur, ou si tu effaces les données du site, ta progression n'est pas récupérée. Pour la conserver ou la transférer, exporte un fichier de sauvegarde puis importe-le ailleurs.
        ${store.available ? "" : `<br><b style="color:var(--warn)">Le stockage local est indisponible (navigation privée ou réglage du navigateur) : ta progression ne sera pas conservée.</b>`}</div></div>
      <div class="btn-row"><button class="btn" id="exp">${icon("download", "i-sm")} Exporter ma sauvegarde</button>
        <label class="btn" style="cursor:pointer">${icon("upload", "i-sm")} Importer une sauvegarde<input type="file" accept="application/json,.json" id="imp" class="sr-only"></label>
        <button class="btn ghost" id="clr" style="color:var(--bad)">${icon("trash", "i-sm")} Tout effacer</button></div></section>
  </div>`;
  return {
    title: "Progression",
    html,
    mount(root) {
      root.querySelector("#exp").addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(store.exportAll(), null, 1)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `bibliotheque-bac-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
      root.querySelector("#imp").addEventListener("change", async e => {
        const f = e.target.files[0]; if (!f) return;
        try { store.importAll(JSON.parse(await f.text())); root.querySelector("#pg").innerHTML = body(); toast("Sauvegarde importée"); }
        catch (err) { toast("Fichier non reconnu : " + (err.message || "format invalide")); }
        e.target.value = "";
      });
      root.querySelector("#clr").addEventListener("click", () => {
        if (confirm("Effacer toute ta progression, tes favoris, signets et annotations sur cet appareil ? Cette action est définitive.")) { store.clearAll(); root.querySelector("#pg").innerHTML = body(); toast("Données effacées"); }
      });
    }
  };
}
