/* Composants d'interface réutilisables (chaînes HTML). */
import { OBJETS, siecleRomain } from "./data.js";
import { store } from "./store.js";

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Paragraphes à partir d'un texte brut (séparés par des lignes vides ou des retours) */
export const paras = t => String(t || "").split(/\n\s*\n|\n/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  library: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.8-1 3 15.5-3.8 1z" transform="translate(-2 0)"/>',
  sheet: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 12h6M10 16h6"/>',
  method: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10.5V16c3 2.5 9 2.5 12 0v-5.5"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.3 4.5 7.4 4.5c2 0 3.5 1.1 4.6 2.7 1.1-1.6 2.6-2.7 4.6-2.7 3.1 0 5.4 2.9 4.4 6.2-1.5 4.7-9 9.3-9 9.3z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  read: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  next: '<path d="M9 18l6-6-6-6"/>',
  type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.5M12 17.5v.5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  cards: '<rect x="3" y="6" width="14" height="15" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v13"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/>',
  feather: '<path d="M20 4c-6 0-12 4-13 13l-3 3"/><path d="M7 17c6 0 10-3 11-8M10 13h5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>'
};
export const icon = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ""}</svg>`;

export function cover(o, cls = "") {
  const ob = OBJETS[o.objet] || OBJETS.roman;
  return `<div class="cover ${cls}" style="--c:${ob.cover}" aria-hidden="true">
    <span class="k">${esc(ob.nom)}</span><span class="t">${esc(o.titre)}</span><span class="a">${esc(o.auteurObj?.nom || "")}</span></div>`;
}

export function programmeChip(o) {
  const cur = (o.programme || []).filter(p => p.actuelle);
  if (cur.length) return `<span class="chip accent">Au programme ${esc(sessionCourte(cur[0].libelle))}</span>`;
  if ((o.programme || []).length) return `<span class="chip">Ancien programme</span>`;
  return o.statut === "programme" ? `<span class="chip accent">Au programme</span>` : `<span class="chip">Lecture complémentaire</span>`;
}
export const sessionCourte = lib => { const m = /(\d{4})/.exec(lib || ""); return m ? "EAF " + m[1] : ""; };

export function bookCard(o) {
  const tags = [programmeChip(o)];
  if (o.texte?.disponible) tags.push('<span class="chip ok">Texte intégral</span>');
  return `<a class="book" href="/oeuvres/${o.id}">
    ${cover(o)}
    <div class="book-meta"><div class="t">${esc(o.titre)}</div>
      <div class="a">${esc(o.auteurObj?.nom || "")} · ${esc(o.date)}</div>
      <div class="tags">${tags.join("")}</div></div></a>`;
}

export function bookRow(o, extra = "") {
  return `<a class="row" href="/oeuvres/${o.id}">${cover(o, "xs")}<div class="grow"><b>${esc(o.titre)}</b><span>${esc(o.auteurObj?.nom || "")} · ${esc(o.genre)} · ${esc(siecleRomain(o.siecle))}</span>${extra}</div>${icon("next", "i-sm")}</a>`;
}

export function favButton(key, labelOn = "Dans mes favoris", labelOff = "Ajouter aux favoris") {
  const on = store.isFav(key);
  return `<button class="btn" data-fav="${esc(key)}" aria-pressed="${on}">${icon("heart")}<span>${on ? labelOn : labelOff}</span></button>`;
}
/* Branche tous les boutons favoris d'un conteneur */
export function wireFavs(root, labelOn = "Dans mes favoris", labelOff = "Ajouter aux favoris") {
  root.querySelectorAll("[data-fav]").forEach(b => b.addEventListener("click", () => {
    const on = store.toggleFav(b.dataset.fav);
    b.setAttribute("aria-pressed", on);
    const span = b.querySelector("span"); if (span) span.textContent = on ? labelOn : labelOff;
    toast(on ? "Ajouté aux favoris" : "Retiré des favoris");
  }));
}

let toastTimer;
export function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

export const loadingView = (msg = "Chargement…") => `<div class="wrap"><div class="loading">${esc(msg)}</div></div>`;

export function errorView(title, detail, actions = `<a class="btn primary" href="/">Retour à l'accueil</a>`) {
  return `<div class="wrap page"><div class="empty"><h3>${esc(title)}</h3><p>${esc(detail)}</p><div class="btn-row">${actions}</div></div></div>`;
}

export const emptyState = (title, text, actions = "") =>
  `<div class="empty"><h3>${esc(title)}</h3><p>${esc(text)}</p>${actions ? `<div class="btn-row">${actions}</div>` : ""}</div>`;

export function timeAgo(t) {
  const d = (Date.now() - t) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  const j = Math.floor(d / 86400);
  return j === 1 ? "hier" : `il y a ${j} jours`;
}

export function verifChip(c) {
  const s = c?.verification?.statut;
  if (s === "verifiee") return `<span class="chip ok" title="${esc(c.verification.source || "")}">${icon("check", "i-sm")} Vérifiée</span>`;
  return `<span class="chip warn" title="Citation non vérifiée mot pour mot : ne pas la citer comme exacte">${icon("warn", "i-sm")} À vérifier</span>`;
}
