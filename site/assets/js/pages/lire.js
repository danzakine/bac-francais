import { data } from "../data.js";
import { store } from "../store.js";
import { esc, icon, toast, errorView } from "../ui.js";

/* ---------- Outils texte : décalages de caractères dans un conteneur ---------- */
function textNodes(root) {
  const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) out.push(n);
  return out;
}
function offsetOf(root, node, offset) {
  const r = document.createRange(); r.setStart(root, 0); r.setEnd(node, offset);
  return r.toString().length;
}
/* Entoure [start, end[ (décalages dans root.textContent) d'éléments <mark> */
function wrapRange(root, start, end, make) {
  let pos = 0;
  for (const node of textNodes(root)) {
    const len = node.data.length, a = pos, b = pos + len;
    pos = b;
    if (b <= start || a >= end) continue;
    const s = Math.max(0, start - a), e = Math.min(len, end - a);
    if (e <= s || !node.data.slice(s, e).trim()) continue;
    const mid = node.splitText(s); mid.splitText(e - s);
    const m = make(); mid.parentNode.insertBefore(m, mid); m.appendChild(mid);
  }
}
/* Recherche tolérante : on ne compare que lettres et chiffres (sans accents ni casse) */
function fold(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae"); }
function index(text) {
  let n = "", map = [];
  for (let i = 0; i < text.length; i++) {
    const f = fold(text[i]).replace(/[^a-z0-9]/g, "");
    for (const ch of f) { n += ch; map.push(i); }
  }
  return { n, map };
}
function findQuote(idx, quote) {
  const parts = quote.split(/\s*(?:\[\s*(?:…|\.\.\.)\s*\]|\(\s*(?:…|\.\.\.)\s*\)|…)\s*/).map(p => fold(p).replace(/[^a-z0-9]/g, "")).filter(p => p.length >= 12);
  if (!parts.length) return null;
  const first = parts.sort((a, b) => b.length - a.length)[0];
  const at = idx.n.indexOf(first);
  if (at < 0) return null;
  return [idx.map[at], idx.map[at + first.length - 1] + 1];
}

const PAPERS = [["light", "Clair"], ["sepia", "Sépia"], ["night", "Nuit"]];
const FONTS = [["serif", "Serif", 'var(--serif)'], ["sans", "Sans", 'var(--sans)'], ["mono", "Mono", 'ui-monospace, "SF Mono", Menlo, monospace']];
const COLORS = [["yellow", "#f5d547"], ["green", "#7ed492"], ["blue", "#8ec5ff"], ["pink", "#f6a3c4"]];

export default async function lire({ params, query }) {
  const cat = await data.catalogue();
  const o = cat.byId[params.id];
  if (!o) throw new Error("introuvable");
  if (!o.texte.disponible) {
    return { title: o.titre, html: errorView("Texte non disponible", `${o.texte.droits === "protege" ? `${o.titre} est protégé par le droit d'auteur : le site ne reproduit pas le texte intégral.` : o.texte.droitsDetail || "Le texte intégral n'est pas disponible sur le site."} ${o.acquerir || ""}`,
      `<a class="btn primary" href="/oeuvres/${o.id}/fiche">Voir la fiche de révision</a><a class="btn" href="/oeuvres/${o.id}">Présentation de l'œuvre</a>`) };
  }
  const [T, fiche] = await Promise.all([data.texte(o.id), o.fiche ? data.fiche(o.id).catch(() => null) : null]);
  const chaps = T.chapitres;
  const id = o.id;
  const citations = (fiche?.citations || []).map((c, i) => ({ ...c, _i: i })).filter(c => c.verification?.statut === "verifiee" || !c.verification);
  const bilingual = chaps.some(c => c.original);

  const prefs = Object.assign({ size: 1.15, lh: 1.75, width: 680, paper: document.documentElement.dataset.theme === "dark" ? "night" : "light", font: "serif" }, store.get("reader", {}));
  let showOriginal = bilingual && store.get("original." + id, false);
  let cur = 0, focusMode = false;
  const saved = store.reading()[id];
  if (saved && saved.chap < chaps.length) cur = saved.chap;
  const hashChap = parseInt(location.hash.slice(1), 10);
  if (hashChap >= 1 && hashChap <= chaps.length) cur = hashChap - 1;

  const html = `
    <header class="rbar" id="rbar"><div class="in">
      <a class="rbtn" href="/oeuvres/${id}" aria-label="Retour à la présentation de l'œuvre">${icon("back")}</a>
      <button class="rbtn" data-open="toc" aria-label="Sommaire, signets et annotations">${icon("list")}<span class="rlbl">Sommaire</span></button>
      <div class="ttl" id="ttl"></div>
      ${bilingual ? `<button class="rbtn" id="langBtn"></button>` : ""}
      <button class="rbtn" id="bmBtn" aria-label="Ajouter un signet ici">${icon("bookmark")}</button>
      ${fiche ? `<a class="rbtn" href="/oeuvres/${id}/fiche" title="Ouvrir la fiche de révision">${icon("sheet")}<span class="rlbl">Fiche</span></a>` : ""}
      <button class="rbtn" id="focusBtn" aria-pressed="false" aria-label="Mode lecture sans distraction">${icon("expand")}</button>
      <button class="rbtn" data-open="settings" aria-label="Réglages d'affichage">${icon("type")}</button>
      <div class="rprog" id="rprog"></div>
    </div></header>
    <article class="rtext" id="rtext" lang="fr"></article>
    <div class="drawer left" id="d-toc" hidden><div class="shade" data-close></div><div class="sheet-r" role="dialog" aria-label="Navigation dans le texte">
      <div class="dh"><h2>${esc(o.titre)}</h2><button class="rbtn" data-close aria-label="Fermer">${icon("close")}</button></div>
      <div class="tabs" role="tablist"><button role="tab" data-tab="toc" aria-selected="true">Sommaire</button><button role="tab" data-tab="bm" aria-selected="false">Signets</button><button role="tab" data-tab="notes" aria-selected="false">Annotations</button></div>
      <div class="db" id="d-body"></div></div></div>
    <div class="drawer" id="d-settings" hidden><div class="shade" data-close></div><div class="sheet-r" role="dialog" aria-label="Réglages de lecture">
      <div class="dh"><h2>Affichage</h2><button class="rbtn" data-close aria-label="Fermer">${icon("close")}</button></div>
      <div class="settings">
        <div><div class="lab">Taille du texte</div><div class="seg-r"><button data-size="-1" aria-label="Réduire">A−</button><button data-size="0" aria-label="Taille par défaut">Défaut</button><button data-size="1" aria-label="Agrandir">A+</button></div></div>
        <div><div class="lab">Interligne</div><div class="seg-r">${[[1.5, "Serré"], [1.75, "Normal"], [2.05, "Aéré"]].map(([v, l]) => `<button data-lh="${v}">${l}</button>`).join("")}</div></div>
        <div><div class="lab">Largeur de colonne</div><div class="seg-r">${[[580, "Étroite"], [680, "Normale"], [820, "Large"]].map(([v, l]) => `<button data-width="${v}">${l}</button>`).join("")}</div></div>
        <div><div class="lab">Police</div><div class="seg-r">${FONTS.map(([v, l, ff]) => `<button data-font="${v}" style="font-family:${ff}">${l}</button>`).join("")}</div></div>
        <div><div class="lab">Fond</div><div class="seg-r">${PAPERS.map(([v, l]) => `<button data-paper="${v}">${l}</button>`).join("")}</div></div>
        <p class="tiny" style="opacity:.7;margin:0">Raccourcis : ← → chapitre précédent / suivant · Échap pour fermer. Sélectionne un passage pour le surligner ou l'annoter.</p>
      </div></div></div>`;

  let cleanup = [];
  return {
    title: `${o.titre} — lecture`,
    html,
    mount(root) {
      document.body.classList.add("reading");
      store.logVisit("lecture", id);
      const text = root.querySelector("#rtext"), bar = root.querySelector("#rbar");
      const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); cleanup.push(() => el.removeEventListener(ev, fn, opt)); };

      function applyPrefs() {
        document.body.dataset.paper = prefs.paper;
        text.style.setProperty("--rsize", prefs.size + "rem");
        text.style.setProperty("--rlh", prefs.lh);
        text.style.setProperty("--rwidth", prefs.width + "px");
        text.style.setProperty("--rfont", FONTS.find(f => f[0] === prefs.font)?.[2] || "var(--serif)");
        root.querySelectorAll("[data-paper]").forEach(b => b.setAttribute("aria-pressed", b.dataset.paper === prefs.paper));
        root.querySelectorAll("[data-font]").forEach(b => b.setAttribute("aria-pressed", b.dataset.font === prefs.font));
        root.querySelectorAll("[data-lh]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.lh === prefs.lh));
        root.querySelectorAll("[data-width]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.width === prefs.width));
        store.set("reader", prefs);
      }
      applyPrefs();

      const body = () => text.querySelector("#cbody");
      const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);

      function decorate() {
        const b = body(); if (!b) return;
        // citations de la fiche présentes dans ce chapitre
        if (citations.length && !showOriginal) {
          const idx = index(b.textContent);
          citations.forEach(c => {
            const r = findQuote(idx, c.texte);
            if (r) wrapRange(b, r[0], r[1], () => { const m = document.createElement("mark"); m.className = "cit"; m.dataset.cit = c._i; m.title = "Citation commentée dans la fiche"; return m; });
          });
        }
        // surlignages et annotations de l'élève
        store.marks(id).filter(m => m.kind === "hl" && m.chap === cur && !!m.original === showOriginal).forEach(m => {
          wrapRange(b, m.start, m.end, () => { const el = document.createElement("mark"); el.className = `hl ${m.color || "yellow"} ${m.note ? "note" : ""}`; el.dataset.mark = m.id; if (m.note) el.title = m.note; return el; });
        });
      }

      function render(i, ratio = 0) {
        cur = Math.max(0, Math.min(chaps.length - 1, i));
        const c = chaps[cur];
        const content = showOriginal && c.original ? c.original : c.html;
        const edition = showOriginal && T.editionOriginal ? T.editionOriginal : T.edition;
        text.innerHTML = `${cur === 0 ? `<p class="meta">${esc(o.auteurObj.nom)} · ${esc(edition || "")}</p>` : ""}
          <h2>${esc(c.titre)}</h2><div id="cbody">${content}</div>
          <nav class="chapnav" aria-label="Chapitres">
            ${cur > 0 ? `<button data-go="${cur - 1}">← ${esc(chaps[cur - 1].titre)}</button>` : "<span></span>"}
            ${cur < chaps.length - 1 ? `<button data-go="${cur + 1}" style="text-align:right">${esc(chaps[cur + 1].titre)} →</button>`
              : fiche ? `<a href="/oeuvres/${id}/fiche">Fin de l'œuvre — réviser avec la fiche →</a>` : "<span></span>"}</nav>`;
        decorate();
        root.querySelector("#ttl").innerHTML = `<b>${esc(o.titre)}</b> · ${esc(c.titre)}`;
        history.replaceState(null, "", `/lire/${id}#${cur + 1}`);
        requestAnimationFrame(() => { scrollTo(0, ratio * maxScroll()); onScroll(); });
        if (!root.querySelector("#d-toc").hidden) drawer(currentTab);
      }

      let tick, lastY = scrollY;
      function onScroll() {
        const ratio = Math.min(1, scrollY / maxScroll());
        root.querySelector("#rprog").style.width = ((cur + ratio) / chaps.length * 100) + "%";
        if (focusMode) bar.classList.toggle("hide", scrollY > lastY && scrollY > 80);
        lastY = scrollY;
        clearTimeout(tick);
        tick = setTimeout(() => store.saveReading(id, { chap: cur, ratio, total: chaps.length }), 300);
      }
      on(window, "scroll", onScroll, { passive: true });

      /* ----- Tiroirs ----- */
      let currentTab = "toc";
      function drawer(tab) {
        currentTab = tab;
        root.querySelectorAll("#d-toc [data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
        const db = root.querySelector("#d-body");
        const marks = store.marks(id);
        if (tab === "toc") {
          db.innerHTML = `<nav class="toc-r">${chaps.map((c, i) => `<a href="#${i + 1}" data-goto="${i}" class="${i === cur ? "cur" : ""}">${esc(c.titre)}</a>`).join("")}</nav>`;
          db.querySelector(".cur")?.scrollIntoView({ block: "center" });
        } else if (tab === "bm") {
          const bms = marks.filter(m => m.kind === "bm").sort((a, b) => a.chap - b.chap || a.ratio - b.ratio);
          db.innerHTML = bms.length ? bms.map(m => `<div class="item"><a href="#" data-jump="${m.chap}" data-ratio="${m.ratio}"><b>${esc(chaps[m.chap]?.titre || "")}</b><div class="x">${Math.round(m.ratio * 100)} % du chapitre</div>${m.text ? `<q>${esc(m.text)}</q>` : ""}</a>
            <button class="rbtn" data-delmark="${m.id}" style="height:30px">${icon("trash", "i-sm")} Supprimer</button></div>`).join("")
            : `<p class="empty-r">Aucun signet. Utilise le bouton ${icon("bookmark", "i-sm")} en haut de l'écran pour marquer un endroit.</p>`;
        } else {
          const hls = marks.filter(m => m.kind === "hl").sort((a, b) => a.chap - b.chap || a.start - b.start);
          db.innerHTML = hls.length ? hls.map(m => `<div class="item"><a href="#" data-jump="${m.chap}" data-mark="${m.id}"><div class="x">${esc(chaps[m.chap]?.titre || "")}${m.original ? " · texte original" : ""}</div><q style="border-left:3px solid ${COLORS.find(c => c[0] === m.color)?.[1] || COLORS[0][1]};padding-left:8px">${esc(m.text)}</q>${m.note ? `<div class="note">${esc(m.note)}</div>` : ""}</a>
            <button class="rbtn" data-delmark="${m.id}" style="height:30px">${icon("trash", "i-sm")} Supprimer</button></div>`).join("")
            : `<p class="empty-r">Aucun passage surligné. Sélectionne du texte pour le surligner ou y ajouter une note personnelle.</p>`;
        }
      }
      function openDrawer(name) {
        root.querySelectorAll(".drawer").forEach(d => { d.hidden = true; });
        const d = root.querySelector("#d-" + name); d.hidden = false;
        if (name === "toc") drawer(currentTab);
        d.querySelector("[data-close].rbtn, button")?.focus();
      }
      root.querySelectorAll("[data-open]").forEach(b => on(b, "click", () => openDrawer(b.dataset.open)));
      root.querySelectorAll(".drawer").forEach(d => on(d, "click", e => {
        if (e.target.closest("[data-close]")) { d.hidden = true; return; }
        const t = e.target.closest("[data-tab]"); if (t) return drawer(t.dataset.tab);
        const g = e.target.closest("[data-goto]"); if (g) { e.preventDefault(); d.hidden = true; return render(+g.dataset.goto); }
        const del = e.target.closest("[data-delmark]"); if (del) { store.removeMark(id, del.dataset.delmark); drawer(currentTab); render(cur, scrollY / maxScroll()); return; }
        const j = e.target.closest("[data-jump]");
        if (j) {
          e.preventDefault(); d.hidden = true;
          const m = store.marks(id).find(x => x.id === j.dataset.mark);
          if (m && !!m.original !== showOriginal) { showOriginal = !!m.original; syncLang(); }
          render(+j.dataset.jump, j.dataset.ratio ? +j.dataset.ratio : 0);
          if (j.dataset.mark) setTimeout(() => text.querySelector(`[data-mark="${j.dataset.mark}"]`)?.scrollIntoView({ block: "center" }), 60);
        }
      }));
      on(root.querySelector("#d-settings"), "click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.size !== undefined) prefs.size = b.dataset.size === "0" ? 1.15 : Math.max(.9, Math.min(1.8, +(prefs.size + b.dataset.size * .08).toFixed(2)));
        if (b.dataset.lh) prefs.lh = +b.dataset.lh;
        if (b.dataset.width) prefs.width = +b.dataset.width;
        if (b.dataset.font) prefs.font = b.dataset.font;
        if (b.dataset.paper) prefs.paper = b.dataset.paper;
        applyPrefs();
      });

      /* ----- Signets, mode focus, langue ----- */
      on(root.querySelector("#bmBtn"), "click", () => {
        const ratio = Math.min(1, scrollY / maxScroll());
        const p = [...body().querySelectorAll("p, .strophe")].find(el => el.getBoundingClientRect().top > 60);
        store.addMark(id, { kind: "bm", chap: cur, ratio, text: (p?.textContent || "").trim().slice(0, 120) });
        toast("Signet ajouté");
      });
      on(root.querySelector("#focusBtn"), "click", e => {
        focusMode = !focusMode; e.currentTarget.setAttribute("aria-pressed", focusMode);
        bar.classList.remove("hide");
        toast(focusMode ? "Mode sans distraction : la barre se masque pendant la lecture" : "Mode sans distraction désactivé");
      });
      const langBtn = root.querySelector("#langBtn");
      function syncLang() { if (langBtn) langBtn.innerHTML = `<span>${showOriginal ? "Traduction" : "Texte original"}</span>`; }
      if (langBtn) { syncLang(); on(langBtn, "click", () => { const r = scrollY / maxScroll(); showOriginal = !showOriginal; store.set("original." + id, showOriginal); syncLang(); render(cur, r); }); }

      /* ----- Sélection : surligner / annoter ----- */
      let pop = null;
      const closePop = () => { pop?.remove(); pop = null; };
      function showPop(x, y, htmlStr) {
        closePop();
        pop = document.createElement("div"); pop.className = "selpop"; pop.innerHTML = htmlStr;
        document.body.appendChild(pop);
        const w = pop.offsetWidth;
        pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + scrollX + "px";
        pop.style.top = Math.max(60, y - 52) + scrollY + "px";
        return pop;
      }
      function noteModal(initial, quoteText, onSave) {
        const m = document.createElement("div"); m.className = "modal";
        m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-label="Annotation"><h2>Annotation personnelle</h2><q>${esc(quoteText.slice(0, 220))}</q>
          <textarea aria-label="Ta note">${esc(initial || "")}</textarea><div class="btn-row"><button class="btn" data-x>Annuler</button><button class="btn primary" data-ok>Enregistrer</button></div></div>`;
        document.body.appendChild(m);
        const ta = m.querySelector("textarea"); ta.focus();
        m.addEventListener("click", e => {
          if (e.target === m || e.target.closest("[data-x]")) m.remove();
          if (e.target.closest("[data-ok]")) { onSave(ta.value.trim()); m.remove(); }
        });
        m.addEventListener("keydown", e => { if (e.key === "Escape") m.remove(); });
      }
      function onSelect() {
        const sel = getSelection(), b = body();
        if (!sel || sel.isCollapsed || !b || !b.contains(sel.anchorNode) || !b.contains(sel.focusNode)) return;
        const r = sel.getRangeAt(0);
        const start = offsetOf(b, r.startContainer, r.startOffset), end = offsetOf(b, r.endContainer, r.endOffset);
        const txt = r.toString().trim();
        if (end - start < 2 || !txt) return;
        const rect = r.getBoundingClientRect();
        const p = showPop(rect.left + rect.width / 2, rect.top,
          COLORS.map(([c, hex]) => `<button data-color="${c}" aria-label="Surligner"><span class="sw" style="background:${hex}"></span></button>`).join("") +
          `<button data-note>${icon("pen", "i-sm")} Note</button>`);
        p.addEventListener("mousedown", e => e.preventDefault());
        p.addEventListener("click", e => {
          const btn = e.target.closest("button"); if (!btn) return;
          const base = { kind: "hl", chap: cur, start, end, text: txt.slice(0, 400), original: showOriginal };
          if (btn.dataset.color) { store.addMark(id, { ...base, color: btn.dataset.color }); toast("Passage surligné"); finish(); }
          else if (btn.hasAttribute("data-note")) { closePop(); noteModal("", txt, note => { store.addMark(id, { ...base, color: "yellow", note }); toast("Annotation enregistrée"); finish(); }); }
        });
        function finish() { closePop(); getSelection().removeAllRanges(); const rr = scrollY / maxScroll(); render(cur, rr); }
      }
      on(document, "mouseup", () => setTimeout(onSelect, 10));
      on(document, "touchend", () => setTimeout(onSelect, 250));
      on(document, "mousedown", e => { if (pop && !pop.contains(e.target)) closePop(); });

      /* Clic sur un surlignage ou une citation de la fiche */
      on(text, "click", e => {
        const go = e.target.closest("[data-go]"); if (go) return render(+go.dataset.go);
        if (!getSelection().isCollapsed) return;
        const hl = e.target.closest("mark.hl");
        if (hl) {
          const m = store.marks(id).find(x => x.id === hl.dataset.mark); if (!m) return;
          const rect = hl.getBoundingClientRect();
          const p = showPop(rect.left + rect.width / 2, rect.top,
            COLORS.map(([c, hex]) => `<button data-color="${c}" aria-label="Changer la couleur"><span class="sw" style="background:${hex}"></span></button>`).join("") +
            `<button data-note>${icon("pen", "i-sm")} ${m.note ? "Modifier la note" : "Note"}</button><button data-del aria-label="Supprimer">${icon("trash", "i-sm")}</button>`);
          p.addEventListener("click", ev => {
            const b = ev.target.closest("button"); if (!b) return;
            const rr = scrollY / maxScroll();
            if (b.dataset.color) { store.updateMark(id, m.id, { color: b.dataset.color }); closePop(); render(cur, rr); }
            else if (b.hasAttribute("data-del")) { store.removeMark(id, m.id); closePop(); render(cur, rr); toast("Surlignage supprimé"); }
            else { closePop(); noteModal(m.note, m.text, note => { store.updateMark(id, m.id, { note }); render(cur, rr); }); }
          });
          return;
        }
        const cm = e.target.closest("mark.cit");
        if (cm) {
          const c = fiche.citations[+cm.dataset.cit];
          const m = document.createElement("div"); m.className = "modal cit-pop";
          m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-label="Citation commentée"><h2>Citation commentée dans la fiche</h2><q>${esc(c.texte)}</q>
            <dl>${c.reference ? `<dt>Référence</dt><dd>${esc(c.reference)}</dd>` : ""}${c.sens ? `<dt>Sens</dt><dd>${esc(c.sens)}</dd>` : ""}${c.demontre ? `<dt>Permet de montrer</dt><dd>${esc(c.demontre)}</dd>` : ""}${!c.sens && c.analyse ? `<dt>Analyse</dt><dd>${esc(c.analyse)}</dd>` : ""}</dl>
            <div class="btn-row"><button class="btn" data-x>Fermer</button><a class="btn primary" href="/oeuvres/${id}/fiche#cit-${cm.dataset.cit}">Voir dans la fiche</a></div></div>`;
          document.body.appendChild(m);
          m.querySelector("[data-x]").focus();
          m.addEventListener("click", ev => { if (ev.target === m || ev.target.closest("[data-x]") || ev.target.closest("a")) m.remove(); });
          m.addEventListener("keydown", ev => { if (ev.key === "Escape") m.remove(); });
        }
      });

      on(document, "keydown", e => {
        if (e.target.closest("input, textarea, select") || document.querySelector(".modal")) return;
        if (e.key === "ArrowRight" && cur < chaps.length - 1) render(cur + 1);
        else if (e.key === "ArrowLeft" && cur > 0) render(cur - 1);
        else if (e.key === "Escape") { root.querySelectorAll(".drawer").forEach(d => { d.hidden = true; }); closePop(); }
      });
      cleanup.push(closePop);

      /* Démarrage : citation demandée (?cit=), sinon dernière position */
      const citParam = query.get("cit");
      if (citParam !== null && fiche?.citations?.[+citParam]) {
        const c = fiche.citations[+citParam];
        const found = chaps.findIndex(ch => { const d = document.createElement("div"); d.innerHTML = ch.html; return findQuote(index(d.textContent), c.texte); });
        if (found >= 0) {
          showOriginal = false; syncLang(); render(found);
          setTimeout(() => { const el = text.querySelector(`mark.cit[data-cit="${+citParam}"]`); el?.scrollIntoView({ block: "center" }); el?.animate?.([{ background: "rgba(245,213,71,.7)" }, { background: "transparent" }], { duration: 2200 }); }, 80);
        } else { toast("Passage introuvable automatiquement dans cette édition"); render(cur); }
      } else {
        render(cur, saved && saved.chap === cur && !(hashChap >= 1) ? saved.ratio : 0);
      }
    },
    unmount() { cleanup.forEach(fn => fn()); cleanup = []; document.body.classList.remove("reading"); delete document.body.dataset.paper; }
  };
}
