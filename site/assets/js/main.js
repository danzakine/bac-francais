/* Point d'entrée : mise en page, navigation, routeur et recherche globale. */
import { store } from "./store.js";
import { data, norm, OBJETS } from "./data.js";
import { esc, icon, errorView, loadingView } from "./ui.js";

/* ---------- Thème ---------- */
function applyTheme() {
  const pref = store.prefs().theme;
  const dark = pref === "dark";                      // fond clair par défaut ; le mode sombre est un choix explicite
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
applyTheme();

/* ---------- Routes ---------- */
const ROUTES = [
  ["/", "accueil", "accueil"],
  ["/bibliotheque", "bibliotheque", "bibliotheque"],
  ["/oeuvres/:id", "oeuvre", "bibliotheque"],
  ["/oeuvres/:id/fiche", "fiche", "fiches"],
  ["/lire/:id", "lire", "bibliotheque"],
  ["/fiches", "fiches", "fiches"],
  ["/revision", "revision", "fiches"],
  ["/cartes", "cartes", "progression"],
  ["/methodes", "methodes", "methodes"],
  ["/methodes/:id", "methode", "methodes"],
  ["/programme", "programme", "methodes"],
  ["/mouvements", "mouvements", "bibliotheque"],
  ["/mouvements/:id", "mouvement", "bibliotheque"],
  ["/auteurs/:id", "auteur", "bibliotheque"],
  ["/notions", "notions", "methodes"],
  ["/favoris", "favoris", "favoris"],
  ["/progression", "progression", "progression"],
  ["/a-propos", "apropos", ""]
];
const compiled = ROUTES.map(([pattern, page, nav]) => {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return "([a-z0-9-]+)"; }) + "/?$");
  return { re, keys, page, nav };
});
function match(path) {
  for (const r of compiled) {
    const m = r.re.exec(path);
    if (m) return { ...r, params: Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]])) };
  }
  return null;
}

/* ---------- Mise en page ---------- */
const NAV = [
  ["/", "accueil", "home", "Accueil"],
  ["/bibliotheque", "bibliotheque", "library", "Bibliothèque"],
  ["/fiches", "fiches", "sheet", "Fiches"],
  ["/methodes", "methodes", "method", "Méthodes"],
  ["/favoris", "favoris", "heart", "Favoris"],
  ["/progression", "progression", "chart", "Progression"]
];
document.body.innerHTML = `
  <a class="skip" href="#app">Aller au contenu</a>
  <header class="header"><div class="wrap">
    <a class="brand" href="/"><span class="brand-mark">${icon("book")}</span>Bibliothèque du bac</a>
    <nav class="mainnav" aria-label="Navigation principale">${NAV.map(([h, k, i, l]) => `<a href="${h}" data-nav="${k}">${icon(i)}<span>${l}</span></a>`).join("")}</nav>
    <div class="header-tools">
      <button class="search-trigger" id="openSearch" aria-label="Rechercher">${icon("search", "i-sm")}<span class="slbl">Rechercher…</span><kbd>/</kbd></button>
      <button class="icon-btn" id="themeBtn" aria-label="Basculer le mode clair / sombre"></button>
    </div></div></header>
  <main id="app" tabindex="-1"></main>
  <footer class="site"><div class="wrap">
    <span>Bibliothèque du bac — site de révision indépendant, non affilié au ministère de l'Éducation nationale.</span>
    <span><a href="/programme">Programme officiel et sources</a> · <a href="/a-propos">Droits, sources et données</a></span>
  </div></footer>
  <nav class="tabbar" aria-label="Navigation">${NAV.map(([h, k, i, l]) => `<a href="${h}" data-nav="${k}">${icon(i)}<span>${l}</span></a>`).join("")}</nav>`;

const app = document.getElementById("app");
const themeBtn = document.getElementById("themeBtn");
function syncThemeBtn() { themeBtn.innerHTML = icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon"); }
syncThemeBtn();
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  store.setPref("theme", next); applyTheme(); syncThemeBtn();
});

/* ---------- Routeur ---------- */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";   // le routeur gère le défilement
let current = null;
let focusNext = false;
let renderId = 0;

export async function navigate(url, { replace = false } = {}) {
  if (replace) history.replaceState(null, "", url); else history.pushState(null, "", url);
  focusNext = true;
  await render();
}

async function render() {
  const id = ++renderId;
  const path = location.pathname.replace(/\/index\.html$/, "/") || "/";
  const r = match(path);
  if (current?.unmount) { try { current.unmount(); } catch (e) { console.error(e); } }
  current = null;
  document.body.classList.remove("reading");
  document.querySelectorAll("[data-nav]").forEach(a => a.toggleAttribute("aria-current", false));
  if (!r) {
    app.innerHTML = errorView("Page introuvable", "Cette adresse ne correspond à aucune page du site.", `<a class="btn primary" href="/">Accueil</a><a class="btn" href="/bibliotheque">Bibliothèque</a>`);
    document.title = "Page introuvable — Bibliothèque du bac";
    return;
  }
  document.querySelectorAll(`[data-nav="${r.nav}"]`).forEach(a => a.setAttribute("aria-current", "page"));
  app.innerHTML = loadingView();
  try {
    const mod = await import(`./pages/${r.page}.js`);
    const view = await mod.default({ params: r.params, query: new URLSearchParams(location.search), navigate });
    if (id !== renderId) return;                      // une navigation plus récente a eu lieu
    current = view;
    document.title = (view.title ? view.title + " — " : "") + "Bibliothèque du bac";
    app.innerHTML = view.html;
    if (view.mount) await view.mount(app);
    if (focusNext) { app.focus({ preventScroll: true }); focusNext = false; }   // lecteurs d'écran : annonce de la nouvelle page
    if (!location.hash) window.scrollTo(0, 0);
    else document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch (e) {
    if (id !== renderId) return;
    console.error(e);
    const notFound = e && e.message === "introuvable";
    document.title = (notFound ? "Contenu introuvable" : "Erreur de chargement") + " — Bibliothèque du bac";
    app.innerHTML = notFound
      ? errorView("Contenu introuvable", "Ce contenu n'existe pas (encore) sur le site.", `<a class="btn primary" href="/bibliotheque">Voir la bibliothèque</a>`)
      : errorView("Un problème est survenu", "Le contenu n'a pas pu être chargé. Vérifie ta connexion puis recharge la page.", `<button class="btn primary" onclick="location.reload()">Recharger</button>`);
  }
}

/* Interception des liens internes */
document.addEventListener("click", e => {
  const a = e.target.closest("a");
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute("download")) return;
  const href = a.getAttribute("href");
  if (!href || !href.startsWith("/") || href.startsWith("//") || /\.(json|pdf|txt)$/.test(href)) return;
  e.preventDefault();
  const url = new URL(href, location.origin);
  if (url.pathname === location.pathname && url.search === location.search && url.hash) {
    history.replaceState(null, "", url.hash);
    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  navigate(href);
});
window.addEventListener("popstate", render);

/* Les fiches s'impriment entièrement dépliées */
window.addEventListener("beforeprint", () => document.querySelectorAll("details").forEach(d => { d.dataset.wasOpen = d.open; d.open = true; }));
window.addEventListener("afterprint", () => document.querySelectorAll("details").forEach(d => { d.open = d.dataset.wasOpen === "true"; }));

/* ---------- Recherche globale ---------- */
let searchIndex = null;
async function buildIndex() {
  if (searchIndex) return searchIndex;
  const [cat, notions, methodes] = await Promise.all([data.catalogue(), data.notions(), data.methodes()]);
  const items = [];
  cat.list.forEach(o => items.push({ g: "Œuvres", label: o.titre, sub: `${o.auteurObj.nom} · ${o.genre}`, href: `/oeuvres/${o.id}`,
    hay: norm([o.titre, o.titreComplet, o.auteurObj.nom, o.genre, OBJETS[o.objet]?.nom, ...o.mouvementsObj.map(m => m.nom), ...o.programme.map(p => p.parcours)].join(" ")) }));
  cat.auteurs.forEach(a => items.push({ g: "Auteurs", label: a.nom, sub: a.dates, href: `/auteurs/${a.id}`, hay: norm(a.nom) }));
  cat.mouvements.forEach(m => items.push({ g: "Mouvements", label: m.nom, sub: m.periode, href: `/mouvements/${m.id}`, hay: norm(m.nom + " " + m.periode) }));
  notions.forEach(n => items.push({ g: "Notions", label: n.terme, sub: n.definition.slice(0, 80) + (n.definition.length > 80 ? "…" : ""), href: `/notions#${n.id}`, hay: norm(n.terme) }));
  methodes.forEach(m => items.push({ g: "Méthodes", label: m.titre, sub: m.resume?.slice(0, 80), href: `/methodes/${m.id}`, hay: norm(m.titre) }));
  return (searchIndex = items);
}
export async function search(q, limit = 30) {
  const items = await buildIndex();
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return items.map(it => {
    if (!words.every(w => it.hay.includes(w))) return null;
    const starts = it.hay.startsWith(words[0]) || norm(it.label).startsWith(words[0]);
    return { ...it, score: (starts ? 2 : 0) + (norm(it.label).includes(words.join(" ")) ? 1 : 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, limit);
}

function openSearch(initial = "") {
  if (document.querySelector(".dlg")) return;
  const prevFocus = document.activeElement;
  const dlg = document.createElement("div");
  dlg.className = "dlg";
  dlg.innerHTML = `<div class="dlg-box" role="dialog" aria-modal="true" aria-label="Recherche">
    <div class="in">${icon("search")}<input type="search" placeholder="Œuvre, auteur, mouvement, notion, méthode…" aria-label="Rechercher" value="${esc(initial)}">
    <button class="icon-btn" data-close aria-label="Fermer">${icon("close", "i-sm")}</button></div>
    <div class="dlg-res" role="listbox"></div></div>`;
  document.body.appendChild(dlg);
  const input = dlg.querySelector("input"), res = dlg.querySelector(".dlg-res");
  let sel = 0, results = [];
  const close = () => { dlg.remove(); prevFocus?.focus?.(); };
  async function run() {
    const q = input.value.trim();
    if (!q) { res.innerHTML = `<p class="muted small" style="padding:12px">Exemples : <i>Zola</i>, <i>romantisme</i>, <i>métaphore</i>, <i>dissertation</i>, <i>Phèdre</i>.</p>`; results = []; return; }
    results = await search(q);
    sel = 0;
    if (!results.length) { res.innerHTML = `<p class="muted" style="padding:14px">Aucun résultat pour « ${esc(q)} ». Essaie un autre mot ou parcours la <a href="/bibliotheque">bibliothèque</a>.</p>`; return; }
    let g = "";
    res.innerHTML = results.map((r, i) => (r.g !== g ? `<h4>${(g = r.g)}</h4>` : "") +
      `<a href="${r.href}" role="option" class="${i === 0 ? "sel" : ""}" data-i="${i}"><div><b>${esc(r.label)}</b><br><span>${esc(r.sub || "")}</span></div></a>`).join("");
  }
  input.addEventListener("input", run);
  input.addEventListener("keydown", e => {
    const links = [...res.querySelectorAll("a[data-i]")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (!links.length) return;
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.classList.toggle("sel", i === sel)); links[sel].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && links[sel]) { e.preventDefault(); close(); navigate(links[sel].getAttribute("href")); }
  });
  dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-close]")) close(); else if (e.target.closest("a")) close(); });
  dlg.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  input.focus(); run();
}
document.getElementById("openSearch").addEventListener("click", () => openSearch());
document.addEventListener("keydown", e => {
  if (e.key === "/" && !e.target.closest("input, textarea, select, [contenteditable]") && !document.body.classList.contains("reading")) { e.preventDefault(); openSearch(); }
});
window.addEventListener("open-search", e => openSearch(e.detail || ""));

render();
