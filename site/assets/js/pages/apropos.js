import { data } from "../data.js";
import { esc, icon } from "../ui.js";

export default async function apropos() {
  const cat = await data.catalogue();
  const fmt = d => { try { return new Date(d).toLocaleDateString("fr-FR"); } catch (e) { return d; } };
  const rows = cat.list.map(o => `<tr><td><a href="/oeuvres/${o.id}">${esc(o.titre)}</a><br><span class="small muted">${esc(o.auteurObj.nom)}</span></td>
    <td>${o.texte.droits === "domaine-public" ? `<span class="chip ok">Domaine public</span>` : `<span class="chip warn">${icon("lock", "i-sm")} Protégée</span>`}<br><span class="small">${esc(o.texte.droitsDetail || "")}</span></td>
    <td class="small">${o.texte.disponible ? `${esc(o.texte.edition || "")}<br><a href="${esc(o.texte.url)}" target="_blank" rel="noopener">${esc(o.texte.source)}</a>${o.texte.consulte ? ` · consulté le ${fmt(o.texte.consulte)}` : ""}` : "Texte non reproduit"}</td>
    <td class="small">${esc(o.texte.restrictions || (o.texte.disponible ? "" : "Citations brèves uniquement, dans la fiche."))}</td></tr>`).join("");
  const html = `<div class="wrap page">
    <div class="page-head"><h1>Droits, sources et données</h1><p>Comment le site choisit ses textes, vérifie ses contenus et enregistre tes données.</p></div>
    <div class="grid-2">
      <div class="panel"><h3>Textes intégraux</h3><p class="muted">Seules les œuvres du domaine public sont reproduites, à partir d'éditions dont la provenance est indiquée (Wikisource, Project Gutenberg, Gallica…). Les œuvres encore protégées ne sont pas reproduites : leur fiche contient seulement de brèves citations, et la page de l'œuvre indique comment se procurer le livre légalement.</p></div>
      <div class="panel"><h3>Citations et fiches</h3><p class="muted">Chaque citation porte un statut. « Vérifiée » : contrôlée mot pour mot dans la source indiquée. « À vérifier » : à ne pas citer comme exacte sans contrôle. Les interprétations sont distinguées des faits établis, et les points incertains sont signalés en fin de fiche.</p></div>
      <div class="panel"><h3>Programme officiel</h3><p class="muted">Les œuvres au programme et les modalités d'épreuve sont reprises du Bulletin officiel et d'Éduscol, avec leur source et leur date de vérification. <a href="/programme">Voir le programme</a>.</p></div>
      <div class="panel"><h3>Tes données</h3><p class="muted">Pas de compte, pas de publicité, pas de traceur. Favoris, progression, signets et annotations restent dans ton navigateur. <a href="/progression">Exporter ou effacer mes données</a>.</p></div>
    </div>
    <section class="section"><h2>Statut de chaque œuvre</h2>
      <div class="table-wrap" style="margin-top:14px"><table class="t"><thead><tr><th>Œuvre</th><th>Droits</th><th>Édition et provenance</th><th>Restrictions</th></tr></thead><tbody>${rows}</tbody></table></div></section>
    <p class="small muted" style="margin-top:24px">Site de révision indépendant, non affilié au ministère de l'Éducation nationale. Une erreur ? Signale-la à ton professeur et vérifie toujours dans ton édition de référence.</p>
  </div>`;
  return { title: "Droits et sources", html };
}
