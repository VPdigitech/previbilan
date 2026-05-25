import { useState, useEffect, useRef } from "react";

// ── CONFIG ─────────────────────────────────────────────────────────────────
const BRAND = "PréviPlan";
const AUTHOR = "David";
const LS_LINKS = {
  starter: "https://buy.stripe.com/dRm00j0qN2GP8RS64CejK00?success_url=https://previbilan.fr?success=true%26pack=starter",
  pro:     "https://buy.stripe.com/6oU9AT5L7ftBfgg8cKejK01?success_url=https://previbilan.fr?success=true%26pack=pro",
};

const TARIFS = [
  {
    id: "starter",
    nom: "Essentiel",
    prix: "29,99",
    tag: null,
    desc: "Pour valider votre projet",
    color: "#6b7280",
    features: [
      "Bilan prévisionnel 3 ans",
      "Compte de résultat complet",
      "Seuil de rentabilité calculé",
      "Plan de financement",
      "PDF téléchargeable instantané",
      "Format reconnu banques françaises",
    ],
  },
  {
    id: "pro",
    nom: "Pack Banque",
    prix: "59,99",
    tag: "LE PLUS CHOISI",
    desc: "Pour convaincre votre banque",
    color: "#d97706",
    features: [
      "Bilan prévisionnel 5 ans",
      "Compte de résultat détaillé",
      "Seuil de rentabilité calculé",
      "Plan de financement complet",
      "Analyse de trésorerie",
      "PDF téléchargeable instantané",
      "Format reconnu banques françaises",
    ],
  },
];

// ── CALCUL ──────────────────────────────────────────────────────────────────
function calc(d) {
  const charges = ["loyerMensuel","salaires","chargesSociales","fournitures","marketing","assurances","autresCharges"]
    .reduce((s, k) => s + (parseFloat(d[k]) || 0), 0);
  const chargesAn = charges * 12;
  const ca1 = parseFloat(d.caAn1) || 0;
  const taux = (parseFloat(d.tauxCroissance) || 15) / 100;
  const ca2 = parseFloat(d.caAn2) || ca1 * (1 + taux);
  const ca3 = parseFloat(d.caAn3) || ca2 * (1 + taux);
  const ca4 = ca3 * (1 + taux);
  const ca5 = ca4 * (1 + taux);
  const emprunt = parseFloat(d.empruntBancaire) || 0;
  const duree = parseFloat(d.dureeEmprunt) || 7;
  const tauxE = (parseFloat(d.tauxEmprunt) || 3.5) / 100 / 12;
  const mensualite = emprunt > 0 ? (emprunt * tauxE) / (1 - Math.pow(1 + tauxE, -duree * 12)) : 0;
  const rembAn = mensualite * 12;
  const c = [1, 1.05, 1.1, 1.15, 1.2].map(m => chargesAn * m + rembAn);
  const cas = [ca1, ca2, ca3, ca4, ca5];
  const res = cas.map((ca, i) => ca - c[i]);
  const marges = cas.map((ca, i) => ca > 0 ? ((ca - c[i]) / ca * 100).toFixed(1) : 0);
  const moisEquilibre = ca1 > 0 ? Math.ceil((chargesAn / ca1) * 12) : null;
  return { charges, chargesAn, cas, c, res, marges, moisEquilibre, mensualite, rembAn, ca1, ca2, ca3 };
}

function eur(n) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const defaultData = {
  nomEntreprise: "", secteur: "", formeJuridique: "SASU", dateCreation: "", email: "",
  loyerMensuel: "", salaires: "", chargesSociales: "", fournitures: "", marketing: "", assurances: "", autresCharges: "",
  caAn1: "", caAn2: "", caAn3: "", caAn4: "", caAn5: "", tauxCroissance: "15",
  apportPersonnel: "", empruntBancaire: "", dureeEmprunt: "7", tauxEmprunt: "3.5", subventions: "",
};

// ── COMPOSANTS UI ───────────────────────────────────────────────────────────
// ── TOOLTIP ────────────────────────────────────────────────────────────────
const Tooltip = ({ content }) => {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6, verticalAlign: "middle" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          background: open ? "#d97706" : "rgba(217,119,6,0.25)",
          border: "1px solid rgba(217,119,6,0.5)",
          color: open ? "#fff" : "#d97706",
          fontSize: 10, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, padding: 0, transition: "all 0.2s",
        }}
        title="Aide"
      >?</button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#1c1c2e", border: "1px solid rgba(217,119,6,0.4)", borderRadius: 10,
          padding: "12px 14px", width: 280, zIndex: 999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontSize: 12, color: "#d1d5db", lineHeight: 1.6,
        }}>
          <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 10, height: 10, background: "#1c1c2e", border: "1px solid rgba(217,119,6,0.4)", borderTop: "none", borderLeft: "none", transform: "translateX(-50%) rotate(45deg)" }} />
          {content}
          <button onClick={() => setOpen(false)} style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14 }}>×</button>
        </div>
      )}
    </span>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", suffix, tooltip }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase", display: "flex", alignItems: "center" }}>
      {label}
      {tooltip && <Tooltip content={tooltip} />}
    </label>
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: suffix ? "10px 40px 10px 14px" : "10px 14px",
          color: "#f9fafb", fontSize: 14, outline: "none", transition: "border-color 0.2s",
          fontFamily: "'DM Sans', sans-serif",
        }}
        onFocus={e => e.target.style.borderColor = "#d97706"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
      />
      {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: 13 }}>{suffix}</span>}
    </div>
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase" }}>{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8, padding: "10px 14px", color: "#f9fafb", fontSize: 14, outline: "none",
        fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
      }}
    >
      {options.map(o => <option key={o} value={o} style={{ background: "#1a1a2e" }}>{o}</option>)}
    </select>
  </div>
);

// ── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [step, setStep] = useState(0);
  const [data, setData] = useState(defaultData);
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [legalPage, setLegalPage] = useState(null);
  const [selectedPack, setSelectedPack] = useState("starter");
  const [paid, setPaid] = useState(false);

  const nbAns = selectedPack === "starter" ? 3 : 5;
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const r = calc(data);

  // Détecte le retour de Stripe après paiement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setPaid(true);
      const pack = params.get("pack") || "starter";
      setSelectedPack(pack);
      setPage("generateur");
      setStep(4);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const handleEmail = () => {
    if (!data.email) { alert("Renseignez votre email à l'étape Entreprise."); return; }
    setSending(true);
    setTimeout(() => { setSending(false); setEmailSent(true); }, 2000);
  };

  const go = (p) => { setPage(p); setStep(0); };

  // ── STYLES GLOBAUX ─────────────────────────────────────────────────────
  const globalStyle = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0c0c14; font-display: swap; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #0c0c14; }
    ::-webkit-scrollbar-thumb { background: #d97706; border-radius: 2px; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    .fade-up { animation: fadeUp 0.6s ease forwards; }
    .fade-up-2 { animation: fadeUp 0.6s 0.15s ease forwards; opacity: 0; }
    .fade-up-3 { animation: fadeUp 0.6s 0.3s ease forwards; opacity: 0; }
    .fade-up-4 { animation: fadeUp 0.6s 0.45s ease forwards; opacity: 0; }
    .gold-shimmer {
      background: linear-gradient(90deg, #d97706 0%, #fbbf24 40%, #d97706 60%, #92400e 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shimmer 3s linear infinite;
    }
    .card-hover { transition: transform 0.25s, box-shadow 0.25s; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(217,119,6,0.15); }
    .btn-primary {
      background: linear-gradient(135deg, #d97706, #b45309);
      border: none; color: #ffffff; font-weight: 700;
      cursor: pointer; transition: all 0.2s; font-family: "'DM Sans', sans-serif";
      letter-spacing: 0.01em; min-height: 44px;
    }
    .btn-primary:hover { background: linear-gradient(135deg, #f59e0b, #d97706); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(217,119,6,0.4); }
    .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.35); color: #e5e7eb; cursor: pointer; transition: all 0.2s; font-family: "'DM Sans', sans-serif"; min-height: 44px; }
    .btn-ghost:hover { border-color: rgba(255,255,255,0.6); color: #ffffff; }
    input option { background: #1a1a2e; }
    @media (max-width: 640px) {
      .btn-primary, .btn-ghost { min-height: 52px; font-size: 16px; }
    }
  `;

  const base = {
    fontFamily: "'DM Sans', sans-serif",
    background: "#0c0c14",
    minHeight: "100vh",
    color: "#f9fafb",
  };

  // ── NAV ────────────────────────────────────────────────────────────────
  const Nav = () => (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
      background: scrolled ? "rgba(12,12,20,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      padding: "0 2rem", display: "flex", alignItems: "center",
      justifyContent: "space-between", height: 64, transition: "all 0.3s",
    }}>
      <button onClick={() => go("home")} style={{ background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ fontSize: 20, fontFamily: "'Playfair Display', serif", fontWeight: 800, color: "#f59e0b", letterSpacing: "-0.5px" }}>Prévi<span style={{ color: "#fff" }}>Bilan</span></span>
      </button>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => go("tarifs")} className="btn-ghost" style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13 }}>Tarifs</button>
        <button onClick={() => go("generateur")} className="btn-primary" style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13 }}>
          Créer mon bilan →
        </button>
      </div>
    </nav>
  );

  // ── HOME ───────────────────────────────────────────────────────────────
  if (page === "home") return (
    <div style={base}>
      <style>{globalStyle}</style>
      <Nav />

      {/* Hero */}
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 2rem 80px", position: "relative", overflow: "hidden" }}>
        {/* Fond décoratif */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 80, right: "15%", width: 2, height: 120, background: "linear-gradient(to bottom, transparent, #d97706, transparent)" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "10%", width: 2, height: 80, background: "linear-gradient(to bottom, transparent, #d97706, transparent)" }} />

        <div style={{ maxWidth: 780, textAlign: "center", position: "relative" }}>
          <div className="fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 20, padding: "6px 16px", marginBottom: 36, fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#fbbf24", letterSpacing: "0.08em" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d97706", animation: "pulse 2s infinite" }} />
            FORMAT RECONNU PAR LES BANQUES FRANÇAISES
          </div>

          <h1 className="fade-up-2" style={{ fontSize: "clamp(2.4rem, 6vw, 4.2rem)", fontFamily: "'Playfair Display', serif", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 28 }}>
            Votre bilan prévisionnel<br />
            <span className="gold-shimmer">en 3 minutes chrono</span>
          </h1>

          <p className="fade-up-3" style={{ fontSize: 18, color: "#9ca3af", maxWidth: 520, margin: "0 auto 48px", lineHeight: 1.75, fontWeight: 300 }}>
            Répondez à quelques questions simples et recevez un dossier financier complet, prêt pour votre banque, BPI France ou vos investisseurs.
          </p>

          <div className="fade-up-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, maxWidth: 620, margin: "0 auto", width: "100%" }}>
            {TARIFS.map(t => (
              <div key={t.id} style={{
                background: t.tag ? "rgba(217,119,6,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${t.tag ? "rgba(217,119,6,0.5)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 16, padding: "24px 20px", textAlign: "center", position: "relative",
              }}>
                {t.tag && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#d97706,#b45309)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace" }}>{t.tag}</div>}
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>{t.nom}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 800, color: t.tag ? "#f59e0b" : "#f9fafb", marginBottom: 4 }}>{t.prix}€</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>{t.id === "starter" ? "3 ans" : "5 ans"} · paiement unique</div>
                <ul style={{ listStyle: "none", textAlign: "left", marginBottom: 20 }}>
                  {t.features.slice(0,4).map(f => (
                    <li key={f} style={{ display: "flex", gap: 8, color: "#d1d5db", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "#d97706" }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => { setSelectedPack(t.id); go("generateur"); }} className={t.tag ? "btn-primary" : "btn-ghost"} style={{ width: "100%", padding: "11px 0", borderRadius: 8, fontSize: 13, fontWeight: t.tag ? 700 : 400 }}>
                  {t.tag ? "Commencer →" : "Choisir"}
                </button>
              </div>
            ))}
          </div>

          <div className="fade-up-4" style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            {["20× moins cher qu'un comptable", "PDF prêt pour la banque", "Généré en 3 minutes"].map(b => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#d97706", fontSize: 14 }}>✦</span>
                <span style={{ color: "#6b7280", fontSize: 13 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 2rem 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {[
            { icon: "📊", t: "Compte de résultat", d: "Sur 3 à 5 ans avec calcul automatique de toutes vos charges et revenus" },
            { icon: "📍", t: "Seuil de rentabilité", d: "Votre point mort calculé au mois près, présenté clairement pour les banques" },
            { icon: "🏦", t: "Format bancaire", d: "Mise en page professionnelle attendue par BPI, Crédit Agricole, BNP, CIC" },
            { icon: "⚡", t: "Résultat immédiat", d: "Votre bilan généré en 3 minutes, prêt à présenter à votre conseiller bancaire" },
          ].map(f => (
            <div key={f.t} className="card-hover" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 16 }}>{f.t}</div>
              <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.65 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Aperçu des pages du bilan — FORMAT A4 FIXE */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "70px 2rem", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ color: "#d97706", fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: "0.12em", textAlign: "center", marginBottom: 16 }}>APERÇU DU DOCUMENT</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, textAlign: "center", marginBottom: 8, color: "#f9fafb" }}>Un vrai dossier bancaire professionnel</h2>
          <p style={{ color: "#9ca3af", textAlign: "center", marginBottom: 48, fontSize: 15 }}>Style banque privée · <span style={{ color: "#d1d5db" }}>3 pages</span> Pack Essentiel · <span style={{ color: "#C5A059", fontWeight: 600 }}>5 pages</span> Pack Banque</p>

          {/* Grille 3 pages — ratio A4 identique pour chaque page */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "start" }}>
            {[
              {
                num: "1", badge: "#C5A059", label: "Page de garde",
                content: (
                  <div style={{ fontFamily: "Helvetica,Arial,sans-serif", background: "white", aspectRatio: "210/297", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "0.5px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", padding: "10% 8%", color: "#0A192F", position: "relative" }}>
                    <div style={{ position: "absolute", top: 8, right: 8, background: "#C5A059", color: "white", fontSize: 7, fontWeight: 700, padding: "2px 6px", letterSpacing: "0.06em" }}>PAGE 1</div>
                    <div style={{ width: "28%", height: 2, background: "#C5A059", marginBottom: "8%" }}></div>
                    <div style={{ fontSize: "clamp(12px, 3.5vw, 22px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.5px", marginBottom: "3%", color: "#0A192F" }}>Dossier de<br/>Prévisionnel<br/>Financier</div>
                    <div style={{ fontSize: "clamp(7px, 1.5vw, 10px)", color: "#475569", marginBottom: "8%" }}>Plan de développement sur 3 exercices</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "3%", marginBottom: "8%" }}>
                      {[["268 k€","CA Cumulé","#1E3A8A"],["31 855 €","Résultat","#C5A059"],["14,4 %","Marge","#1E3A8A"]].map(([v,l,c]) => (
                        <div key={l} style={{ background: "#F8FAFC", borderTop: `2px solid ${c}`, padding: "6% 4%", textAlign: "center" }}>
                          <div style={{ fontSize: "clamp(7px,2vw,12px)", fontWeight: 700, color: c === "#C5A059" ? "#C5A059" : "#0A192F" }}>{v}</div>
                          <div style={{ fontSize: "clamp(5px,1.2vw,8px)", color: "#64748B", textTransform: "uppercase", marginTop: 2 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ borderLeft: "2px solid #0A192F", paddingLeft: "4%", fontSize: "clamp(6px,1.4vw,9px)", lineHeight: 1.7, color: "#334155" }}>
                      <div>Entreprise : <strong>SARL DUPONT</strong></div>
                      <div>Secteur : <strong>Restauration</strong></div>
                      <div>Statut : <span style={{ color: "#C5A059", fontWeight: 600 }}>✓ Conforme bancaire</span></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E2E8F0", paddingTop: "3%", marginTop: "4%", fontSize: "clamp(5px,1.1vw,8px)", color: "#94A3B8" }}>
                      <span>Confidentiel</span><span style={{ color: "#C5A059" }}>PréviPlan</span><span>1 / 5</span>
                    </div>
                  </div>
                )
              },
              {
                num: "2", badge: "#1E3A8A", label: "Compte de résultat",
                content: (
                  <div style={{ fontFamily: "Helvetica,Arial,sans-serif", background: "white", aspectRatio: "210/297", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "0.5px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", padding: "8% 7%", color: "#0A192F", position: "relative" }}>
                    <div style={{ position: "absolute", top: 8, right: 8, background: "#1E3A8A", color: "white", fontSize: 7, fontWeight: 700, padding: "2px 6px", letterSpacing: "0.06em" }}>PAGE 2</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "3%", marginBottom: "4%", fontSize: "clamp(5px,1.1vw,7px)", color: "#64748B", textTransform: "uppercase" }}>
                      <span>SARL DUPONT — Exploitation</span>
                      <span style={{ background: "#EFF6FF", color: "#1E40AF", padding: "1px 4px", fontWeight: 700 }}>OFFICIEL</span>
                    </div>
                    <div style={{ fontSize: "clamp(9px,2.2vw,14px)", fontWeight: 700, borderLeft: "2px solid #C5A059", paddingLeft: "4%", marginBottom: "2%" }}>Compte de Résultat</div>
                    <div style={{ fontSize: "clamp(5px,1.1vw,7px)", color: "#64748B", marginBottom: "4%", paddingLeft: "5%" }}>Produits, charges et profitabilité — 3 exercices</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "clamp(5px,1.2vw,8px)", tableLayout: "fixed" }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          <th style={{ textAlign: "left", padding: "3px 3px", borderBottom: "1.5px solid #0A192F", color: "#475569", fontWeight: 600, width: "46%" }}>Désignation (€)</th>
                          {["Année N","N+1","N+2"].map(a => <th key={a} style={{ textAlign: "right", padding: "3px 3px", borderBottom: "1.5px solid #0A192F", color: "#475569", fontWeight: 600 }}>{a}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Ventes marchandises","65 000","78 000","92 000",false,false],
                          ["Prestations","8 000","10 500","13 000",false,false],
                          ["CHIFFRE D'AFFAIRES","73 000","88 500","105 000",true,false],
                          ["Achats & matières","26 000","30 500","36 000",false,false],
                          ["Charges externes","12 000","13 500","14 500",false,false],
                          ["VALEUR AJOUTÉE","35 000","44 500","54 500",false,true],
                          ["Charges personnel","22 000","25 000","28 000",false,false],
                          ["EBE","10 500","16 700","23 300",true,false],
                          ["IS","1 275","2 205","3 195",false,false],
                          ["RÉSULTAT NET","7 225","12 495","18 105",false,true],
                        ].map(([l,v1,v2,v3,tot,maj]) => (
                          <tr key={l} style={{ background: tot?"#F1F5F9":maj?"rgba(197,160,89,0.05)":"transparent" }}>
                            <td style={{ padding:"2px 3px",textAlign:"left",fontWeight:tot||maj?700:500,color:maj?"#A37F3D":"#0A192F",borderBottom:tot?"1.5px solid #0A192F":"1px solid #E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l}</td>
                            {[v1,v2,v3].map((v,i) => <td key={i} style={{padding:"2px 3px",textAlign:"right",fontWeight:tot||maj?700:400,color:maj?"#A37F3D":"#334155",borderBottom:tot?"1.5px solid #0A192F":"1px solid #E2E8F0"}}>{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ border: "1px solid #E2E8F0", padding: "4% 5%", background: "#F8FAFC", marginTop: "3%" }}>
                      <div style={{ fontSize: "clamp(5px,1vw,7px)", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4%" }}>Évolution CA sur 3 ans</div>
                      {[["N",69,"73 k€"],["N+1",84,"89 k€"],["N+2",100,"105 k€"],["Seuil rent.",80,"58 k€"]].map(([l,w,v],i) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                          <div style={{ width: "22%", fontSize: "clamp(5px,1vw,6px)", color: i===3?"#C5A059":"#334155" }}>{l}</div>
                          <div style={{ flex: 1, height: 6, background: "#E2E8F0", overflow: "hidden" }}>
                            <div style={{ width: `${w}%`, height: "100%", background: i===3?"linear-gradient(90deg,#C5A059,#A37F3D)":"linear-gradient(90deg,#0A192F,#1E3A8A)" }}></div>
                          </div>
                          <div style={{ width: "22%", textAlign: "right", fontSize: "clamp(5px,1vw,7px)", fontWeight: 700, color: i===3?"#C5A059":"#0A192F" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E2E8F0", paddingTop: "2%", marginTop: "3%", fontSize: "clamp(5px,1vw,7px)", color: "#94A3B8" }}>
                      <span>Confidentiel</span><span>Compte de Résultat</span><span>2 / 5</span>
                    </div>
                  </div>
                )
              },
              {
                num: "3", badge: "#16A34A", label: "Plan de trésorerie",
                content: (
                  <div style={{ fontFamily: "Helvetica,Arial,sans-serif", background: "white", aspectRatio: "210/297", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "0.5px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", padding: "8% 7%", color: "#0A192F", position: "relative" }}>
                    <div style={{ position: "absolute", top: 8, right: 8, background: "#16A34A", color: "white", fontSize: 7, fontWeight: 700, padding: "2px 6px", letterSpacing: "0.06em" }}>PAGE 3</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "3%", marginBottom: "4%", fontSize: "clamp(5px,1.1vw,7px)", color: "#64748B", textTransform: "uppercase" }}>
                      <span>SARL DUPONT — Flux Financiers</span>
                      <span style={{ background: "#EFF6FF", color: "#1E40AF", padding: "1px 4px", fontWeight: 700 }}>TRÉSO</span>
                    </div>
                    <div style={{ fontSize: "clamp(9px,2.2vw,14px)", fontWeight: 700, borderLeft: "2px solid #C5A059", paddingLeft: "4%", marginBottom: "2%" }}>Plan de Trésorerie</div>
                    <div style={{ fontSize: "clamp(5px,1.1vw,7px)", color: "#64748B", marginBottom: "4%", paddingLeft: "5%" }}>Flux réels d'encaissements et décaissements — Année N</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "clamp(5px,1.1vw,7px)", tableLayout: "fixed" }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          <th style={{ textAlign: "left", padding: "3px 2px", borderBottom: "1.5px solid #0A192F", color: "#475569", fontWeight: 600, width: "32%" }}>Flux (€)</th>
                          {["M1","M3","M6","M9","M12","Total"].map(h => <th key={h} style={{ textAlign: "right", padding: "3px 2px", borderBottom: "1.5px solid #0A192F", color: h==="Total"?"#C5A059":"#475569", fontWeight: 600 }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Tréso. initiale","2 000","4 150","7 900","11 400","15 250","2 000","init"],
                          ["(+) Encaissements","7 300","7 200","7 100","8 400","9 200","87 600","pos"],
                          ["(−) Achats","2 900","2 850","2 800","3 100","3 400","34 800","neg"],
                          ["(−) Salaires","1 650","1 650","1 650","1 650","1 650","19 800","neg"],
                          ["FLUX NET","+1 750","+1 700","+1 650","+2 600","+3 050","+20 750","maj"],
                          ["CLÔTURE","3 750","5 850","9 550","14 000","18 300","18 300","tot"],
                        ].map(([l,...vals]) => {
                          const type = vals.pop();
                          const isTot=type==="tot",isMaj=type==="maj",isPos=type==="pos",isNeg=type==="neg";
                          return (
                            <tr key={l} style={{ background: isTot?"#F1F5F9":isMaj?"rgba(197,160,89,0.05)":"transparent" }}>
                              <td style={{padding:"2px 2px",textAlign:"left",fontWeight:isTot||isMaj?700:500,color:isMaj?"#A37F3D":"#0A192F",borderBottom:isTot?"1.5px solid #0A192F":"1px solid #E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l}</td>
                              {vals.map((v,i) => <td key={i} style={{padding:"2px 2px",textAlign:"right",fontWeight:isTot||isMaj?700:400,color:isMaj?"#A37F3D":isPos?"#16A34A":isNeg?"#DC2626":"#334155",borderBottom:isTot?"1.5px solid #0A192F":"1px solid #E2E8F0",whiteSpace:"nowrap"}}>{v}</td>)}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ border: "1px solid #E2E8F0", padding: "4% 5%", background: "#F8FAFC", marginTop: "3%" }}>
                      <div style={{ fontSize: "clamp(5px,1vw,7px)", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "4%" }}>Évolution du solde — Année N</div>
                      {[["Début N",11,"2 000 €","#0A192F"],["Clôture N",100,"18 300 €","#C5A059"]].map(([l,w,v,c]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                          <div style={{ width: "24%", fontSize: "clamp(5px,1vw,6px)", color: "#334155" }}>{l}</div>
                          <div style={{ flex: 1, height: 6, background: "#E2E8F0", overflow: "hidden" }}>
                            <div style={{ width: `${w}%`, height: "100%", background: c==="#C5A059"?"linear-gradient(90deg,#C5A059,#A37F3D)":"linear-gradient(90deg,#0A192F,#1E3A8A)" }}></div>
                          </div>
                          <div style={{ width: "24%", textAlign: "right", fontSize: "clamp(5px,1vw,7px)", fontWeight: 700, color: c }}>{v}</div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "6%", marginTop: "3%", fontSize: "clamp(5px,1vw,6px)", color: "#64748B" }}>
                        <span>Flux net : <strong style={{ color: "#16A34A" }}>+20 750 €</strong></span>
                        <span>Point mort : <strong style={{ color: "#0A192F" }}>Mois 10</strong></span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E2E8F0", paddingTop: "2%", marginTop: "3%", fontSize: "clamp(5px,1vw,7px)", color: "#94A3B8" }}>
                      <span>Modèle Certifié</span><span>Plan de Trésorerie</span><span>3 / 5</span>
                    </div>
                  </div>
                )
              }
            ].map(pg => (
              <div key={pg.num} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, background: pg.badge, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }}>{pg.num}</div>
                  <span style={{ fontSize: 12, color: "#d1d5db", fontWeight: 500 }}>{pg.label}</span>
                </div>
                {pg.content}
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 32 }}>
            ✦ Format A4 · Prêt pour impression ou enregistrement PDF en 1 clic
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Pack Essentiel — 3 pages</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {["Page de garde","Compte de résultat","Plan de trésorerie"].map((p, i) => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 16, height: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#d1d5db" }}>{i + 1}</div>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.08)", margin: "0 8px" }}></div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#C5A059", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Pack Banque — 5 pages</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {["Page de garde","Compte de résultat","Plan de trésorerie","Bilan Actif/Passif","Ratios & indicateurs"].map((p, i) => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 16, height: 16, background: i < 3 ? "rgba(197,160,89,0.15)" : "rgba(197,160,89,0.08)", border: `1px solid ${i < 3 ? "#C5A059" : "rgba(197,160,89,0.3)"}`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#C5A059" }}>{i + 1}</div>
                    <span style={{ fontSize: 11, color: i < 3 ? "#d1d5db" : "#9ca3af" }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* CTA final */}
      <div style={{ textAlign: "center", padding: "60px 2rem 40px", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 20 }}>Prêt à convaincre votre banque ?</h2>
        <p style={{ color: "#6b7280", marginBottom: 36 }}>Créé par {AUTHOR} · previbilan.fr</p>
        <button onClick={() => go("generateur")} className="btn-primary" style={{ padding: "15px 40px", borderRadius: 10, fontSize: 16 }}>
          Commencer maintenant — c'est gratuit
        </button>
      </div>

      {/* Legal overlay */}
      {legalPage && <LegalPage activePage={legalPage} onClose={() => setLegalPage(null)} />}

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "28px 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, position: "relative", zIndex: 10 }}>
        <span style={{ color: "#374151", fontSize: 13, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>PréviPlan</span>
        <span style={{ color: "#374151", fontSize: 12 }}>© 2025 previbilan.fr · Créé par {AUTHOR} · Paiement sécurisé Stripe</span>
        <div style={{ display: "flex", gap: 16, position: "relative", zIndex: 10 }}>
          {[["mentions", "Mentions légales"], ["cgv", "CGV"], ["rgpd", "Contact"]].map(([key, label]) => (
            <span key={key} onClick={() => setLegalPage(key)} style={{ color: "#6b7280", fontSize: 12, cursor: "pointer" }} onMouseOver={e => e.target.style.color = "#f59e0b"} onMouseOut={e => e.target.style.color = "#6b7280"}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ── TARIFS ─────────────────────────────────────────────────────────────
  if (page === "tarifs") return (
    <div style={base}>
      <style>{globalStyle}</style>
      <Nav />
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "120px 2rem 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ color: "#d97706", fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: "0.12em", marginBottom: 16 }}>TARIFS</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, marginBottom: 16 }}>Simple. Transparent. Sans surprise.</h2>
          <p style={{ color: "#6b7280" }}>Payez une fois, téléchargez immédiatement. Aucun abonnement caché.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, alignItems: "center" }}>
          {TARIFS.map((t, i) => (
            <div key={t.id} className="card-hover" style={{
              background: t.tag ? "rgba(217,119,6,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${t.tag ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 20, padding: 32, position: "relative",
              transform: t.tag ? "scale(1.03)" : "scale(1)",
            }}>
              {t.tag && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #d97706, #b45309)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "5px 16px", borderRadius: 20, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                  {t.tag}
                </div>
              )}
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6, fontWeight: 500 }}>{t.nom}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: t.tag ? "#f59e0b" : "#f9fafb" }}>{t.prix}€</span>
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 28 }}>{t.desc}</div>
              <ul style={{ listStyle: "none", marginBottom: 32 }}>
                {t.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "#d1d5db", fontSize: 13, marginBottom: 10 }}>
                    <span style={{ color: "#d97706", marginTop: 1 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setSelectedPack(t.id); go("generateur"); }}
                className={t.tag ? "btn-primary" : "btn-ghost"}
                style={{ width: "100%", padding: 13, borderRadius: 10, fontSize: 14 }}
              >
                {t.tag ? "Commencer →" : "Choisir"}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "#374151", fontSize: 12, marginTop: 36 }}>
          Paiement sécurisé · TVA incluse · Facture disponible sur demande
        </p>
      </div>
    </div>
  );

  // ── GÉNÉRATEUR ──────────────────────────────────────────────────────────
  const STEPS = [
    { label: "Entreprise", icon: "🏢" },
    { label: "Charges", icon: "📋" },
    { label: "Revenus", icon: "💶" },
    { label: "Financement", icon: "🏦" },
    { label: "Bilan", icon: "📊" },
  ];

  if (page === "generateur") return (
    <div style={base}>
      <style>{globalStyle}</style>
      <Nav />

      {/* Stepper */}
      <div style={{ position: "sticky", top: 64, zIndex: 90, background: "rgba(12,12,20,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 2rem", display: "flex", alignItems: "stretch" }}>
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => i <= step && setStep(i)}
              style={{
                flex: 1, padding: "14px 0", background: "none", border: "none",
                borderBottom: `2px solid ${i === step ? "#d97706" : i < step ? "rgba(217,119,6,0.3)" : "transparent"}`,
                color: i === step ? "#f59e0b" : i < step ? "#92400e" : "#374151",
                cursor: i <= step ? "pointer" : "default", transition: "all 0.2s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}
            >
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ height: "100%", width: `${((step + 1) / STEPS.length) * 100}%`, background: "linear-gradient(to right, #92400e, #d97706)", transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 2rem 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
            {STEPS[step].icon} {STEPS[step].label}
          </h2>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            {["Informations générales sur votre projet", "Vos charges mensuelles fixes et variables", "Votre chiffre d'affaires prévisionnel", "Votre plan de financement initial", "Votre bilan généré — prêt pour la banque"][step]}
          </p>
        </div>

        {/* STEP 0 */}
        {step === 0 && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Sélecteur de pack */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 4 }}>
              {TARIFS.map(t => (
                <button key={t.id} onClick={() => setSelectedPack(t.id)} style={{
                  background: selectedPack === t.id ? "rgba(217,119,6,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selectedPack === t.id ? "#d97706" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.2s"
                }}>
                  <div style={{ color: selectedPack === t.id ? "#f59e0b" : "#9ca3af", fontSize: 13, fontWeight: 600 }}>{t.nom}</div>
                  <div style={{ color: selectedPack === t.id ? "#d97706" : "#4b5563", fontSize: 16, fontWeight: 700, margin: "4px 0" }}>{t.prix}€</div>
                  <div style={{ color: "#4b5563", fontSize: 10 }}>{t.id === "starter" ? "3 ans" : "5 ans"}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Input label="Nom de l'entreprise" value={data.nomEntreprise} onChange={v => set("nomEntreprise", v)} placeholder="Ma Société SAS" />
              <Select label="Forme juridique" value={data.formeJuridique} onChange={v => set("formeJuridique", v)} options={["SASU", "SAS", "SARL", "EURL", "Auto-entrepreneur", "EI"]} />
            </div>
            <Input label="Secteur d'activité" value={data.secteur} onChange={v => set("secteur", v)} placeholder="ex: Conseil, Restauration, Commerce..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Input label="Date de création prévue" value={data.dateCreation} onChange={v => set("dateCreation", v)} type="date" />
              <Input label="Email (pour recevoir le PDF)" value={data.email} onChange={v => set("email", v)} placeholder="vous@email.com" type="email" />
            </div>
            <div style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 10, padding: 14 }}>
              <p style={{ color: "#92400e", fontSize: 12 }}>💡 Votre email sera utilisé uniquement pour envoyer votre bilan PDF. Aucun spam.</p>
            </div>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
              <p style={{ color: "#6b7280", fontSize: 12 }}>💡 Saisissez vos charges <strong style={{ color: "#d97706" }}>mensuelles</strong>. Le total annuel est calculé automatiquement.</p>
            </div>
            {[
              ["loyerMensuel", "Loyer / Local", "1 200", null],
              ["salaires", "Salaires bruts", "3 500", <>
                <strong style={{color:"#f59e0b"}}>Salaires bruts</strong> = ce que vous versez à vos employés <em>avant</em> déduction des cotisations salariales.<br/><br/>
                💡 <strong>Astuce simple :</strong> Salaire net × 1,28 ≈ salaire brut.<br/>
                Ex : 2 000€ net → environ 2 560€ brut.<br/><br/>
                Vous seul : mettez votre rémunération de gérant prévue.
              </>],
              ["chargesSociales", "Charges sociales patronales", "1 400", <>
                <strong style={{color:"#f59e0b"}}>Charges sociales patronales</strong> = cotisations payées par l'entreprise <em>en plus</em> du salaire brut.<br/><br/>
                💡 <strong>Règle rapide :</strong> environ <strong>40 à 45%</strong> du salaire brut.<br/>
                Ex : 3 500€ brut × 42% = <strong>~1 470€</strong> de charges patronales.<br/><br/>
                Pour un gérant SASU : comptez environ 55% de la rémunération nette.
              </>],
              ["fournitures", "Fournitures & matériel", "300", null],
              ["marketing", "Marketing & communication", "400", null],
              ["assurances", "Assurances", "150", null],
              ["autresCharges", "Autres charges", "200", null],
            ].map(([key, label, ph, tooltip]) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 12 }}>
                <Input label={label} value={data[key]} onChange={v => set(key, v)} placeholder={ph} type="number" suffix="€/mois" tooltip={tooltip} />
                {data[key] && <div style={{ color: "#6b7280", fontSize: 12, paddingBottom: 10, whiteSpace: "nowrap" }}>= {eur(parseFloat(data[key]) * 12)}/an</div>}
              </div>
            ))}
            <div style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#9ca3af", fontSize: 13 }}>Total charges mensuelles</span>
              <span style={{ color: "#f59e0b", fontSize: 22, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{eur(r.charges)}</span>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#f59e0b", fontSize: 13 }}>📦 Pack sélectionné :</span>
              <span style={{ color: "#f9fafb", fontSize: 13, fontWeight: 600 }}>{TARIFS.find(t => t.id === selectedPack)?.nom} — {nbAns} ans</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(nbAns, 3)}, 1fr)`, gap: 12 }}>
              {[
                ["caAn1", "CA Année 1 (estimation)"],
                ["caAn2", "CA Année 2 (estimation)"],
                ["caAn3", "CA Année 3 (estimation)"],
              ].map(([k, l]) => (
                <Input key={k} label={l} value={data[k]} onChange={v => set(k, v)} placeholder="80 000" type="number" suffix="€" />
              ))}
            </div>
            {nbAns >= 5 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  ["caAn4", "CA Année 4 (estimation)"],
                  ["caAn5", "CA Année 5 (estimation)"],
                ].map(([k, l]) => (
                  <Input key={k} label={l} value={data[k] || ""} onChange={v => set(k, v)} placeholder="120 000" type="number" suffix="€" />
                ))}
              </div>
            )}
            <Input label="Taux de croissance annuel" value={data.tauxCroissance} onChange={v => set("tauxCroissance", v)} placeholder="15" type="number" suffix="%" />
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#6b7280", letterSpacing: "0.08em" }}>APERÇU COMPTE DE RÉSULTAT — {nbAns} ANS</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", color: "#4b5563", fontSize: 11, fontWeight: 400 }}></th>
                    {Array.from({length: nbAns}, (_, i) => <th key={i} style={{ padding: "10px 16px", textAlign: "right", color: "#d97706", fontSize: 11, fontWeight: 600 }}>AN {i+1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { l: "Chiffre d'affaires", v: r.cas.slice(0, nbAns) },
                    { l: "Charges totales", v: r.c.slice(0, nbAns) },
                    { l: "Résultat net", v: r.res.slice(0, nbAns), bold: true },
                  ].map(row => (
                    <tr key={row.l} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px 16px", color: row.bold ? "#f9fafb" : "#9ca3af", fontSize: 13, fontWeight: row.bold ? 600 : 400 }}>{row.l}</td>
                      {row.v.map((v, i) => (
                        <td key={i} style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, color: row.bold ? (v >= 0 ? "#4ade80" : "#f87171") : "#f9fafb", fontWeight: row.bold ? 700 : 400 }}>{eur(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div style={{ display: "grid", gap: 16 }}>
            <Input label="Apport personnel (€)" value={data.apportPersonnel} onChange={v => set("apportPersonnel", v)} placeholder="20 000" type="number" suffix="€" />
            <Input label="Emprunt bancaire souhaité (€)" value={data.empruntBancaire} onChange={v => set("empruntBancaire", v)} placeholder="50 000" type="number" suffix="€" />
            <Input label="Subventions / Aides (BPI, région...)" value={data.subventions} onChange={v => set("subventions", v)} placeholder="10 000" type="number" suffix="€" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Select label="Durée de l'emprunt" value={data.dureeEmprunt} onChange={v => set("dureeEmprunt", v)} options={["3","5","7","10","12","15","20"].map(n => `${n} ans`)} />
              <Input label="Taux d'intérêt (%)" value={data.tauxEmprunt} onChange={v => set("tauxEmprunt", v)} placeholder="3.5" type="number" suffix="%" />
            </div>
            {r.mensualite > 0 && (
              <div style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#9ca3af", fontSize: 13 }}>Mensualité estimée</span>
                <span style={{ color: "#f59e0b", fontSize: 22, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{eur(r.mensualite)}/mois</span>
              </div>
            )}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16 }}>
              <p style={{ color: "#4b5563", fontSize: 12 }}>Total financement : <strong style={{ color: "#f9fafb" }}>{eur((parseFloat(data.apportPersonnel)||0) + (parseFloat(data.empruntBancaire)||0) + (parseFloat(data.subventions)||0))}</strong></p>
            </div>
          </div>
        )}

        {/* STEP 4 — BILAN FINAL */}
        {step === 4 && (
          <div style={{ display: "grid", gap: 20 }}>
            {/* En-tête doc */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ background: "rgba(217,119,6,0.08)", borderBottom: "1px solid rgba(217,119,6,0.2)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>{data.nomEntreprise || "Votre Entreprise"}</div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{data.formeJuridique} · {data.secteur || "Secteur non renseigné"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#4b5563", letterSpacing: "0.08em" }}>BILAN PRÉVISIONNEL</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{new Date().toLocaleDateString("fr-FR")}</div>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  { l: "CA Année 1", v: eur(r.cas[0]), c: "#f9fafb" },
                  { l: "Seuil rentabilité", v: eur(r.chargesAn), c: "#f59e0b" },
                  { l: `Résultat An ${nbAns}`, v: eur(r.res[nbAns-1]), c: r.res[nbAns-1] >= 0 ? "#4ade80" : "#f87171" },
                ].map((k, i) => (
                  <div key={i} style={{ padding: "18px 16px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: k.c }}>{k.v}</div>
                    <div style={{ color: "#4b5563", fontSize: 11, marginTop: 5 }}>{k.l}</div>
                  </div>
                ))}
              </div>

              {/* Tableau dynamique selon pack */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                      <th style={{ padding: "10px 20px", textAlign: "left", color: "#4b5563", fontSize: 11, fontWeight: 400, fontFamily: "'DM Mono', monospace" }}>COMPTE DE RÉSULTAT — {nbAns} ANS</th>
                      {Array.from({length: nbAns}, (_, i) => <th key={i} style={{ padding: "10px 14px", textAlign: "right", color: "#d97706", fontSize: 11, fontWeight: 600 }}>AN {i+1}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { l: "Chiffre d'affaires", v: r.cas.slice(0, nbAns) },
                      { l: "Charges d'exploitation", v: r.c.slice(0, nbAns) },
                      { l: "RÉSULTAT NET", v: r.res.slice(0, nbAns), bold: true },
                      { l: "Marge nette", v: r.marges.slice(0, nbAns).map(m => `${m}%`), bold: false, pct: true },
                    ].map(row => (
                      <tr key={row.l} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: row.bold ? "rgba(0,0,0,0.2)" : "transparent" }}>
                        <td style={{ padding: "10px 20px", color: row.bold ? "#f9fafb" : "#9ca3af", fontSize: 12, fontWeight: row.bold ? 700 : 400 }}>{row.l}</td>
                        {row.v.map((v, i) => (
                          <td key={i} style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, fontWeight: row.bold ? 700 : 400, color: row.bold ? (typeof v === "number" && v >= 0 ? "#4ade80" : "#f87171") : row.pct ? "#9ca3af" : "#f9fafb" }}>
                            {row.pct ? v : eur(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Plan financement */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
                <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#4b5563", letterSpacing: "0.08em", marginBottom: 14 }}>PLAN DE FINANCEMENT</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[["Apport personnel", data.apportPersonnel], ["Emprunt bancaire", data.empruntBancaire], ["Subventions", data.subventions]].map(([l, v]) => (
                    <div key={l} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>{v ? eur(parseFloat(v)) : "—"}</div>
                      <div style={{ color: "#4b5563", fontSize: 11, marginTop: 4 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Point mort */}
              {r.moisEquilibre && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>📍 Point mort estimé</span>
                  <span style={{ color: "#f59e0b", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>Mois {Math.min(r.moisEquilibre, 60)}</span>
                </div>
              )}
            </div>

            {/* Bouton PDF pleine largeur */}
            <div style={{ display: "grid", gap: 12 }}>
              <button onClick={() => {
                const nom = data.nomEntreprise || "Votre Entreprise";
                const forme = data.formeJuridique || "SASU";
                const secteur = data.secteur || "Secteur non renseigné";
                const dateCreation = data.dateCreation || new Date().toLocaleDateString("fr-FR");
                const ca1 = eur(r.cas[0]); const ca2 = eur(r.cas[1]); const ca3 = eur(r.cas[2]);
                const c1 = eur(r.c[0]); const c2 = eur(r.c[1]); const c3 = eur(r.c[2]);
                const res1 = eur(r.res[0]); const res2 = eur(r.res[1]); const res3 = eur(r.res[2]);
                const ca4 = nbAns >= 5 ? eur(r.cas[3]) : null; const ca5 = nbAns >= 5 ? eur(r.cas[4]) : null;
                const c4 = nbAns >= 5 ? eur(r.c[3]) : null; const c5 = nbAns >= 5 ? eur(r.c[4]) : null;
                const res4 = nbAns >= 5 ? eur(r.res[3]) : null; const res5 = nbAns >= 5 ? eur(r.res[4]) : null;
                const seuil = eur(r.chargesAn);
                const totalFinancement = eur((parseFloat(data.apportPersonnel)||0)+(parseFloat(data.empruntBancaire)||0)+(parseFloat(data.subventions)||0));
                const isPaid = paid;
                const colHeaders = Array.from({length: nbAns}, (_, i) => `AN ${i+1}`).join("</th><th>");
                const caRow = [ca1,ca2,ca3,...(nbAns>=5?[ca4,ca5]:[])].map(v=>`<td>${v}</td>`).join("");
                const cRow = [c1,c2,c3,...(nbAns>=5?[c4,c5]:[])].map(v=>`<td>${v}</td>`).join("");
                const resRow = [res1,res2,res3,...(nbAns>=5?[res4,res5]:[])].map((v,i)=>`<td class="${r.res[i]>=0?'green':'red'}" style="font-weight:700">${v}</td>`).join("");
                const margeRow = r.marges.slice(0,nbAns).map(m=>`<td>${m}%</td>`).join("");
                // Trésorerie mensuelle simplifiée
                const tresoMois = Array.from({length:12}, (_, i) => {
                  const caM = (r.cas[0]||0)/12;
                  const chM = (r.c[0]||0)/12;
                  return { mois: ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][i], ca: caM, ch: chM, res: caM-chM, cum: (caM-chM)*(i+1) };
                });
                const win = window.open("", "_blank");
                win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
                <title>${isPaid ? "Bilan Prévisionnel Complet" : "Aperçu"} — ${nom}</title>
                <style>
                  * { margin:0; padding:0; box-sizing:border-box; }
                  body { font-family: 'Georgia', serif; background: white; color: #1a1a1a; font-size: 12px; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 80px; color: rgba(217,119,6,0.12); font-weight: 900; pointer-events: none; z-index: 1000; white-space: nowrap; letter-spacing: 8px; display: ${isPaid?'none':'block'}; }
                  .watermark2 { position: fixed; top: 15%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 55px; color: rgba(217,119,6,0.08); font-weight: 900; pointer-events: none; z-index: 1000; white-space: nowrap; display: ${isPaid?'none':'block'}; }
                  .watermark3 { position: fixed; top: 85%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 55px; color: rgba(217,119,6,0.08); font-weight: 900; pointer-events: none; z-index: 1000; white-space: nowrap; display: ${isPaid?'none':'block'}; }
                  .page { max-width: 210mm; margin: 0 auto; padding: 20mm 18mm; min-height: 297mm; position: relative; }
                  .page-break { page-break-before: always; padding-top: 20mm; }
                  .header-doc { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d97706; padding-bottom: 16px; margin-bottom: 24px; }
                  .logo { font-size: 22px; font-weight: 900; color: #d97706; letter-spacing: -1px; }
                  .company-name { font-size: 18px; font-weight: 700; margin-bottom: 3px; }
                  .company-sub { color: #6b7280; font-size: 11px; }
                  .doc-info { text-align: right; color: #6b7280; font-size: 10px; line-height: 1.6; }
                  .doc-info strong { color: #1a1a1a; font-size: 13px; display: block; margin-bottom: 2px; }
                  .section { margin-bottom: 28px; }
                  .section-title { font-size: 13px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #d97706; padding-bottom: 6px; margin-bottom: 14px; }
                  .kpis { display: grid; grid-template-columns: repeat(${nbAns>=5?4:3},1fr); gap: 12px; margin-bottom: 24px; }
                  .kpi { background: #faf9f7; border: 1px solid #e5e0d8; border-radius: 6px; padding: 12px; text-align: center; }
                  .kpi-val { font-size: 18px; font-weight: 700; color: #d97706; }
                  .kpi-label { font-size: 9px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
                  th { background: #1a1a1a; color: white; padding: 8px 10px; text-align: right; font-size: 10px; font-weight: 600; }
                  th:first-child { text-align: left; }
                  td { padding: 7px 10px; border-bottom: 1px solid #f0ede8; }
                  td:not(:first-child) { text-align: right; }
                  tr.subtotal td { background: #faf9f7; font-weight: 600; border-top: 1px solid #d4c9b0; }
                  tr.total td { background: #1a1a1a; color: white; font-weight: 700; }
                  tr.total td.green { color: #4ade80; }
                  tr.total td.red { color: #f87171; }
                  .green { color: #16a34a; }
                  .red { color: #dc2626; }
                  .blur { filter: blur(5px); color: #ccc; }
                  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
                  .info-box { background: #faf9f7; border: 1px solid #e5e0d8; border-radius: 6px; padding: 12px; }
                  .info-box label { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 4px; }
                  .info-box value { font-size: 14px; font-weight: 700; display: block; }
                  .footer-page { position: fixed; bottom: 10mm; left: 18mm; right: 18mm; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e0d8; padding-top: 6px; }
                  .cta-box { background: linear-gradient(135deg, #d97706, #b45309); color: white; padding: 24px; border-radius: 10px; text-align: center; margin-top: 24px; }
                  .print-btn { position: fixed; top: 20px; right: 20px; background: #d97706; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; z-index: 2000; display: ${isPaid?'block':'none'}; }
                  @media print {
                    .print-btn { display: none !important; }
                    .watermark, .watermark2, .watermark3 { position: fixed !important; }
                    body { font-size: 11px; }
                    .page { padding: 15mm 15mm; }
                    .page-break { page-break-before: always !important; }
                  }
                  .page-break { page-break-before: always; padding-top: 15mm; border-top: none; }
                </style></head><body onload="${isPaid ? 'setTimeout(()=>document.querySelector(\'.print-btn\').focus(),500)' : ''}">

                <div class="watermark">APERÇU GRATUIT</div>
                <div class="watermark2">APERÇU GRATUIT</div>
                <div class="watermark3">APERÇU GRATUIT</div>
                <button class="print-btn" onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>

                <!-- PAGE 1 : PAGE DE GARDE + RÉSUMÉ EXÉCUTIF -->
                <div class="page">
                  <div class="header-doc">
                    <div>
                      <div class="logo">PréviPlan</div>
                      <div style="font-size:10px;color:#9ca3af;margin-top:2px;">previbilan.fr</div>
                    </div>
                    <div class="doc-info">
                      <strong>BILAN PRÉVISIONNEL ${nbAns} ANS</strong>
                      ${isPaid ? '' : '<span style="color:#d97706;font-weight:700;">APERÇU GRATUIT</span><br/>'}
                      Document généré le ${new Date().toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  <!-- Identité -->
                  <div class="section">
                    <div class="section-title">Présentation de l'entreprise</div>
                    <div class="info-grid">
                      <div class="info-box"><label>Raison sociale</label><value>${nom}</value></div>
                      <div class="info-box"><label>Forme juridique</label><value>${forme}</value></div>
                      <div class="info-box"><label>Secteur d'activité</label><value>${secteur}</value></div>
                      <div class="info-box"><label>Date de création</label><value>${dateCreation}</value></div>
                    </div>
                  </div>

                  <!-- KPIs résumé -->
                  <div class="section">
                    <div class="section-title">Indicateurs clés</div>
                    <div class="kpis">
                      <div class="kpi"><div class="kpi-val">${ca1}</div><div class="kpi-label">CA Année 1</div></div>
                      <div class="kpi"><div class="kpi-val" style="color:${r.res[0]>=0?'#16a34a':'#dc2626'}">${res1}</div><div class="kpi-label">Résultat An 1</div></div>
                      <div class="kpi"><div class="kpi-val">${seuil}</div><div class="kpi-label">Seuil rentabilité</div></div>
                      ${nbAns>=5?`<div class="kpi"><div class="kpi-val" style="color:${r.res[4]>=0?'#16a34a':'#dc2626'}">${res5||'—'}</div><div class="kpi-label">Résultat An 5</div></div>`:''}
                    </div>
                  </div>

                  <!-- Hypothèses -->
                  <div class="section">
                    <div class="section-title">Hypothèses retenues</div>
                    <table>
                      <thead><tr><th style="text-align:left">Paramètre</th><th>Valeur</th><th>Base de calcul</th></tr></thead>
                      <tbody>
                        <tr><td>Taux de croissance annuel du CA</td><td>${data.tauxCroissance || 15}%</td><td>Hypothèse retenue</td></tr>
                        <tr><td>Charges mensuelles fixes</td><td>${eur(r.charges)}</td><td>Détail page 2</td></tr>
                        <tr><td>Total financement</td><td>${totalFinancement}</td><td>Détail page 3</td></tr>
                        <tr><td>Point mort estimé</td><td>Mois ${Math.min(r.moisEquilibre||0, nbAns*12)}</td><td>Calculé automatiquement</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="footer-page">
                    <span>${nom} · ${forme}</span>
                    <span>Bilan Prévisionnel ${nbAns} ans · previbilan.fr</span>
                    <span>Page 1/${nbAns>=5?5:4}</span>
                  </div>
                </div>

                <!-- PAGE 2 : COMPTE DE RÉSULTAT -->
                <div class="page page-break">
                  <div class="header-doc">
                    <div><div class="company-name">${nom}</div><div class="company-sub">${forme} · ${secteur}</div></div>
                    <div class="doc-info"><strong>COMPTE DE RÉSULTAT PRÉVISIONNEL</strong>${new Date().toLocaleDateString("fr-FR")}</div>
                  </div>

                  <div class="section">
                    <div class="section-title">Charges d'exploitation annuelles</div>
                    <table>
                      <thead><tr><th style="text-align:left">Poste de charge</th><th>Mensuel</th><th>Annuel</th></tr></thead>
                      <tbody>
                        ${[
                          ["Loyer / Local", data.loyerMensuel],
                          ["Salaires bruts", data.salaires],
                          ["Charges sociales patronales", data.chargesSociales],
                          ["Fournitures & matériel", data.fournitures],
                          ["Marketing & communication", data.marketing],
                          ["Assurances", data.assurances],
                          ["Autres charges", data.autresCharges],
                        ].filter(([,v]) => v).map(([l,v]) => `<tr><td>${l}</td><td>${eur(parseFloat(v))}</td><td>${eur(parseFloat(v)*12)}</td></tr>`).join("")}
                        <tr class="subtotal"><td>TOTAL CHARGES FIXES</td><td>${eur(r.charges)}</td><td>${eur(r.chargesAn)}</td></tr>
                        ${r.rembAn > 0 ? `<tr><td>Remboursement emprunt</td><td>${eur(r.mensualite)}</td><td>${eur(r.rembAn)}</td></tr>` : ''}
                      </tbody>
                    </table>
                  </div>

                  <div class="section">
                    <div class="section-title">Compte de résultat ${nbAns} ans</div>
                    <table>
                      <thead><tr><th style="text-align:left">Indicateur</th><th>${colHeaders}</th></tr></thead>
                      <tbody>
                        <tr><td>Chiffre d'affaires</td>${caRow}</tr>
                        <tr><td>Charges d'exploitation</td>${cRow}</tr>
                        <tr class="subtotal"><td>Résultat brut</td>${[res1,res2,res3,...(nbAns>=5?[res4,res5]:[])].map((v,i)=>`<td class="${r.res[i]>=0?'green':'red'}">${v}</td>`).join("")}</tr>
                        <tr><td>Marge nette</td>${isPaid ? margeRow : Array(nbAns).fill('<td class="blur">████</td>').join("")}</tr>
                        <tr class="total"><td>RÉSULTAT NET</td>${resRow}</tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="footer-page">
                    <span>${nom} · ${forme}</span>
                    <span>Bilan Prévisionnel ${nbAns} ans · previbilan.fr</span>
                    <span>Page 2/${nbAns>=5?5:4}</span>
                  </div>
                </div>

                <!-- PAGE 3 : PLAN DE FINANCEMENT -->
                <div class="page page-break">
                  <div class="header-doc">
                    <div><div class="company-name">${nom}</div><div class="company-sub">${forme} · ${secteur}</div></div>
                    <div class="doc-info"><strong>PLAN DE FINANCEMENT</strong>${new Date().toLocaleDateString("fr-FR")}</div>
                  </div>

                  <div class="section">
                    <div class="section-title">Structure de financement</div>
                    <table>
                      <thead><tr><th style="text-align:left">Source de financement</th><th>Montant</th><th>%</th></tr></thead>
                      <tbody>
                        ${data.apportPersonnel ? `<tr><td>Apport personnel</td><td>${eur(parseFloat(data.apportPersonnel))}</td><td>${Math.round(parseFloat(data.apportPersonnel)/((parseFloat(data.apportPersonnel)||0)+(parseFloat(data.empruntBancaire)||0)+(parseFloat(data.subventions)||0))*100)||0}%</td></tr>` : ''}
                        ${data.empruntBancaire ? `<tr><td>Emprunt bancaire</td><td>${eur(parseFloat(data.empruntBancaire))}</td><td>${Math.round(parseFloat(data.empruntBancaire)/((parseFloat(data.apportPersonnel)||0)+(parseFloat(data.empruntBancaire)||0)+(parseFloat(data.subventions)||0))*100)||0}%</td></tr>` : ''}
                        ${data.subventions ? `<tr><td>Subventions / Aides</td><td>${eur(parseFloat(data.subventions))}</td><td>${Math.round(parseFloat(data.subventions)/((parseFloat(data.apportPersonnel)||0)+(parseFloat(data.empruntBancaire)||0)+(parseFloat(data.subventions)||0))*100)||0}%</td></tr>` : ''}
                        <tr class="total"><td>TOTAL FINANCEMENT</td><td>${totalFinancement}</td><td>100%</td></tr>
                      </tbody>
                    </table>
                  </div>

                  ${data.empruntBancaire ? `
                  <div class="section">
                    <div class="section-title">Conditions de l'emprunt bancaire</div>
                    <table>
                      <thead><tr><th style="text-align:left">Paramètre</th><th>Valeur</th></tr></thead>
                      <tbody>
                        <tr><td>Montant emprunté</td><td>${eur(parseFloat(data.empruntBancaire))}</td></tr>
                        <tr><td>Durée de remboursement</td><td>${data.dureeEmprunt} ans</td></tr>
                        <tr><td>Taux d'intérêt annuel</td><td>${data.tauxEmprunt}%</td></tr>
                        <tr class="subtotal"><td>Mensualité estimée</td><td>${eur(r.mensualite)}</td></tr>
                        <tr><td>Coût total du crédit</td><td>${eur(r.mensualite*12*(parseFloat(data.dureeEmprunt)||7) - parseFloat(data.empruntBancaire))}</td></tr>
                      </tbody>
                    </table>
                  </div>` : ''}

                  <div class="section">
                    <div class="section-title">Seuil de rentabilité</div>
                    <table>
                      <thead><tr><th style="text-align:left">Indicateur</th><th>Valeur</th><th>Commentaire</th></tr></thead>
                      <tbody>
                        <tr><td>Charges fixes annuelles</td><td>${seuil}</td><td>À couvrir impérativement</td></tr>
                        <tr><td>CA nécessaire pour équilibre</td><td>${seuil}</td><td>Point mort financier</td></tr>
                        <tr><td>Mois pour atteindre l'équilibre</td><td>Mois ${Math.min(r.moisEquilibre||0, nbAns*12)}</td><td>Basé sur CA An 1</td></tr>
                        <tr class="subtotal"><td>CA prévisionnel An 1</td><td>${ca1}</td><td>${r.cas[0] >= r.chargesAn ? '✅ Supérieur au seuil' : '⚠️ Inférieur au seuil'}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="footer-page">
                    <span>${nom} · ${forme}</span>
                    <span>Bilan Prévisionnel ${nbAns} ans · previbilan.fr</span>
                    <span>Page 3/${nbAns>=5?5:4}</span>
                  </div>
                </div>

                <!-- PAGE 4 : TRÉSORERIE MENSUELLE AN 1 -->
                <div class="page page-break">
                  <div class="header-doc">
                    <div><div class="company-name">${nom}</div><div class="company-sub">${forme} · ${secteur}</div></div>
                    <div class="doc-info"><strong>PLAN DE TRÉSORERIE — ANNÉE 1</strong>${new Date().toLocaleDateString("fr-FR")}</div>
                  </div>

                  <div class="section">
                    <div class="section-title">Trésorerie mensuelle prévisionnelle — Année 1</div>
                    <table>
                      <thead><tr><th style="text-align:left">Mois</th><th>CA prévu</th><th>Charges</th><th>Résultat</th><th>Cumulé</th></tr></thead>
                      <tbody>
                        ${tresoMois.map((m,i) => `<tr ${i===11?'class="subtotal"':''}><td>${m.mois}</td><td>${isPaid ? eur(m.ca) : '<span class="blur">████████</span>'}</td><td>${isPaid ? eur(m.ch) : '<span class="blur">████████</span>'}</td><td class="${m.res>=0?'green':'red'}">${isPaid ? eur(m.res) : '<span class="blur">████████</span>'}</td><td class="${m.cum>=0?'green':'red'}">${isPaid ? eur(m.cum) : '<span class="blur">████████</span>'}</td></tr>`).join("")}
                      </tbody>
                    </table>
                    ${!isPaid ? '<p style="text-align:center;color:#d97706;font-style:italic;font-size:11px;margin-top:8px;">🔒 Données complètes disponibles après achat</p>' : ''}
                  </div>

                  <div class="footer-page">
                    <span>${nom} · ${forme}</span>
                    <span>Bilan Prévisionnel ${nbAns} ans · previbilan.fr</span>
                    <span>Page 4/${nbAns>=5?5:4}</span>
                  </div>
                </div>

                ${nbAns>=5 ? `
                <!-- PAGE 5 : SYNTHÈSE 5 ANS -->
                <div class="page page-break">
                  <div class="header-doc">
                    <div><div class="company-name">${nom}</div><div class="company-sub">${forme} · ${secteur}</div></div>
                    <div class="doc-info"><strong>SYNTHÈSE & RATIOS — 5 ANS</strong>${new Date().toLocaleDateString("fr-FR")}</div>
                  </div>

                  <div class="section">
                    <div class="section-title">Tableau de bord financier 5 ans</div>
                    <table>
                      <thead><tr><th style="text-align:left">Indicateur</th><th>AN 1</th><th>AN 2</th><th>AN 3</th><th>AN 4</th><th>AN 5</th></tr></thead>
                      <tbody>
                        <tr><td>Chiffre d'affaires</td>${caRow}</tr>
                        <tr><td>Charges totales</td>${cRow}</tr>
                        <tr class="subtotal"><td>Résultat net</td>${resRow}</tr>
                        <tr><td>Marge nette (%)</td>${isPaid ? margeRow : Array(5).fill('<td class="blur">████</td>').join("")}</tr>
                        <tr><td>Croissance CA</td><td>—</td>${[1,2,3,4].map(i=>`<td>${r.cas[i-1]>0?Math.round((r.cas[i]-r.cas[i-1])/r.cas[i-1]*100):0}%</td>`).join("")}</tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="section">
                    <div class="section-title">Analyse financière</div>
                    <div class="info-grid">
                      <div class="info-box">
                        <label>Tendance globale</label>
                        <value style="font-size:12px;color:${r.res[4]>=0?'#16a34a':'#dc2626'}">${r.res[4]>=0?'📈 Croissance positive':'📉 Déficit persistant'}</value>
                      </div>
                      <div class="info-box">
                        <label>Résultat cumulé 5 ans</label>
                        <value style="color:${r.res.slice(0,5).reduce((a,b)=>a+b,0)>=0?'#16a34a':'#dc2626'}">${eur(r.res.slice(0,5).reduce((a,b)=>a+b,0))}</value>
                      </div>
                      <div class="info-box">
                        <label>Meilleure année</label>
                        <value>Année ${r.res.indexOf(Math.max(...r.res.slice(0,5)))+1}</value>
                      </div>
                      <div class="info-box">
                        <label>CA total 5 ans</label>
                        <value>${eur(r.cas.slice(0,5).reduce((a,b)=>a+b,0))}</value>
                      </div>
                    </div>
                  </div>

                  <div style="background:#faf9f7;border:1px solid #e5e0d8;border-radius:8px;padding:16px;margin-top:16px;">
                    <div style="font-size:11px;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em;">Note méthodologique</div>
                    <p style="font-size:10px;color:#6b7280;line-height:1.6;">Ce bilan prévisionnel a été généré sur la base des données fournies par le porteur de projet. Les projections financières reposent sur des hypothèses de croissance et ne constituent pas une garantie de résultats. Ce document est fourni à titre indicatif et ne remplace pas le conseil d'un expert-comptable agréé.</p>
                  </div>

                  <div class="footer-page">
                    <span>${nom} · ${forme}</span>
                    <span>Bilan Prévisionnel 5 ans · previbilan.fr</span>
                    <span>Page 5/5</span>
                  </div>
                </div>` : ''}

                ${!isPaid ? `
                <div class="page page-break" style="display:flex;align-items:center;justify-content:center;min-height:297mm;">
                  <div style="text-align:center;max-width:400px;">
                    <div style="font-size:48px;margin-bottom:20px;">🔓</div>
                    <h2 style="color:#d97706;font-size:24px;margin-bottom:12px;">Débloquez votre bilan complet</h2>
                    <p style="color:#6b7280;font-size:13px;line-height:1.7;margin-bottom:24px;">Ce document complet ${nbAns>=5?'5 pages':'4 pages'} est disponible sans filigrane après achat. Trésorerie mensuelle, ratios financiers et synthèse complète inclus.</p>
                    <div style="background:#d97706;color:white;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;">${selectedPack==='pro'?'Pack Banque — 59,99€':'Pack Essentiel — 29,99€'}</div>
                    <p style="color:#9ca3af;font-size:11px;margin-top:12px;">previbilan.fr · Paiement sécurisé Stripe</p>
                  </div>
                </div>` : ''}

                </body></html>`);
                win.document.close();
              }} className="btn-primary" style={{ padding: 16, borderRadius: 10, fontSize: 15, fontWeight: 700 }}>
                {paid ? "📄 Générer mon PDF complet" : "👁️ Aperçu PDF gratuit"}
              </button>
            </div>

            {paid && (
              <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🎉 Paiement confirmé !</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>Cliquez "Générer mon PDF complet" puis <strong style={{color:"#f9fafb"}}>Cmd+P → Enregistrer en PDF</strong></div>
              </div>
            )}

            {/* Upsell tarifs — masqué si déjà payé */}
            {!paid && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {TARIFS.map(t => (
                  <div key={t.id} style={{ background: t.tag ? "rgba(217,119,6,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${t.tag ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: t.tag ? "#f59e0b" : "#f9fafb" }}>{t.prix}€</div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 14 }}>{t.desc}</div>
                    <a href={LS_LINKS[t.id]} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <button className={t.tag ? "btn-primary" : "btn-ghost"} style={{ width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 13 }}>
                        {t.tag ? `Télécharger — ${t.prix}€ →` : `Pack ${t.nom}`}
                      </button>
                    </a>
                  </div>
                ))}
              </div>
            )}
            {paid && (
              <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <p style={{ color: "#4ade80", fontSize: 13, marginBottom: 8 }}>✅ Bilan débloqué — version complète sans filigrane</p>
                <p style={{ color: "#6b7280", fontSize: 12 }}>Cliquez "Générer mon PDF complet" puis <strong style={{color:"#f9fafb"}}>Cmd+P → Enregistrer en PDF</strong></p>
              </div>
            )}
            {!paid && <p style={{ color: "#374151", fontSize: 11, textAlign: "center" }}>Paiement sécurisé via Stripe · Bilan livré immédiatement</p>}
          </div>
        )}

        {/* Navigation bas */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36 }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : go("home")} className="btn-ghost" style={{ padding: "10px 22px", borderRadius: 8, fontSize: 13 }}>
            ← {step === 0 ? "Accueil" : "Précédent"}
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary" style={{ padding: "10px 28px", borderRadius: 8, fontSize: 13 }}>
              {step === STEPS.length - 2 ? "✦ Générer mon bilan" : "Suivant →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PAGES LÉGALES ───────────────────────────────────────────────────────────
const LEGAL_EMAIL = "contact@previbilan.fr";
const LEGAL_DATE = "22 mai 2025";

const LegalSection = ({ title, children }) => (
  <div style={{ marginBottom: 36 }}>
    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#f59e0b", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid rgba(217,119,6,0.2)" }}>{title}</h2>
    <div style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.85 }}>{children}</div>
  </div>
);

const LP = ({ children }) => <p style={{ marginBottom: 10 }}>{children}</p>;
const LL = ({ children }) => <li style={{ marginBottom: 6, paddingLeft: 8 }}>{children}</li>;

const LEGAL_PAGES = {
  mentions: {
    label: "Mentions légales",
    content: () => (
      <div>
        <LegalSection title="1. Éditeur du site">
          <LP>Le site <strong style={{color:"#f9fafb"}}>previbilan.fr</strong> est édité par :</LP>
          <LP><strong style={{color:"#f9fafb"}}>Nom :</strong> David<br/><strong style={{color:"#f9fafb"}}>Email :</strong> {LEGAL_EMAIL}<br/><strong style={{color:"#f9fafb"}}>Site web :</strong> https://previbilan.fr</LP>
          <LP>Activité exercée à titre individuel sans structure juridique enregistrée au moment de la publication.</LP>
        </LegalSection>
        <LegalSection title="2. Hébergement">
          <LP><strong style={{color:"#f9fafb"}}>Vercel Inc.</strong><br/>340 Pine Street, Suite 701<br/>San Francisco, CA 94104, États-Unis<br/>vercel.com</LP>
        </LegalSection>
        <LegalSection title="3. Propriété intellectuelle">
          <LP>L'ensemble du contenu du site (textes, graphiques, logotypes) est la propriété exclusive de l'éditeur et protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction sans autorisation écrite est interdite.</LP>
        </LegalSection>
        <LegalSection title="4. Responsabilité">
          <LP>Les documents générés sont fournis à titre informatif. Ils ne constituent pas un conseil juridique, comptable ou financier professionnel. L'éditeur ne saurait être tenu responsable des décisions prises sur leur base.</LP>
        </LegalSection>
        <LegalSection title="5. Contact">
          <LP>Pour toute question : <strong style={{color:"#f59e0b"}}>{LEGAL_EMAIL}</strong></LP>
        </LegalSection>
        <p style={{color:"#374151", fontSize:11}}>Dernière mise à jour : {LEGAL_DATE}</p>
      </div>
    )
  },
  cgv: {
    label: "CGV",
    content: () => (
      <div>
        <LegalSection title="1. Objet">
          <LP>Les présentes CGV régissent les ventes de documents financiers numériques proposées sur previbilan.fr. Toute commande implique l'acceptation pleine et entière des présentes CGV.</LP>
        </LegalSection>
        <LegalSection title="2. Produits">
          <ul style={{listStyle:"none", marginBottom:12}}>
            <LL>• <strong style={{color:"#f9fafb"}}>Pack Essentiel (29,99€)</strong> : Bilan prévisionnel 3 ans PDF</LL>
            <LL>• <strong style={{color:"#f9fafb"}}>Pack Banque (59,99€)</strong> : Bilan 5 ans + Excel + Guide banquier + Business Plan</LL>
            <LL>• <strong style={{color:"#f9fafb"}}>Pack Expert (99€)</strong> : Pack Banque + Lettre présentation + Scénarios + Ratios + Support 48h</LL>
          </ul>
        </LegalSection>
        <LegalSection title="3. Prix">
          <LP>Les prix sont indiqués en euros TTC. L'éditeur se réserve le droit de modifier ses prix à tout moment, les commandes étant facturées au tarif en vigueur au moment de la commande.</LP>
        </LegalSection>
        <LegalSection title="4. Paiement">
          <LP>Paiement sécurisé via <strong style={{color:"#f9fafb"}}>Stripe</strong>. Moyens acceptés : carte bancaire (Visa, Mastercard), Apple Pay, Klarna. Transaction chiffrée SSL. Paiement exigible immédiatement à la commande.</LP>
        </LegalSection>
        <LegalSection title="5. Livraison">
          <LP>Les documents numériques sont délivrés immédiatement après confirmation du paiement par téléchargement direct et/ou email. En cas de non-réception contactez-nous à {LEGAL_EMAIL} dans les 24h.</LP>
        </LegalSection>
        <LegalSection title="6. Droit de rétractation">
          <LP>Conformément à l'article L.221-28 du Code de la consommation, <strong style={{color:"#f9fafb"}}>le droit de rétractation ne s'applique pas</strong> aux contenus numériques dont l'exécution a commencé avec l'accord du consommateur. En procédant au paiement et au téléchargement, le client renonce expressément à ce droit.</LP>
        </LegalSection>
        <LegalSection title="7. Réclamations">
          <LP>Pour toute réclamation : <strong style={{color:"#f59e0b"}}>{LEGAL_EMAIL}</strong> — Réponse sous 48h ouvrées.</LP>
        </LegalSection>
        <LegalSection title="8. Responsabilité">
          <LP>Les documents sont basés sur les données saisies par le client. PréviPlan ne garantit pas l'acceptation du dossier par un établissement bancaire.</LP>
        </LegalSection>
        <LegalSection title="9. Droit applicable">
          <LP>Les présentes CGV sont soumises au droit français. En cas de litige, les tribunaux français seront compétents.</LP>
        </LegalSection>
        <p style={{color:"#374151", fontSize:11}}>Dernière mise à jour : {LEGAL_DATE}</p>
      </div>
    )
  },
  rgpd: {
    label: "Politique RGPD",
    content: () => (
      <div>
        <LegalSection title="1. Responsable du traitement">
          <LP>David, joignable à {LEGAL_EMAIL}, est responsable du traitement des données collectées sur previbilan.fr.</LP>
        </LegalSection>
        <LegalSection title="2. Données collectées">
          <ul style={{listStyle:"none", marginBottom:12}}>
            <LL>• <strong style={{color:"#f9fafb"}}>Données de commande</strong> : email, nom</LL>
            <LL>• <strong style={{color:"#f9fafb"}}>Données financières simulées</strong> : informations saisies dans le générateur (non stockées)</LL>
            <LL>• <strong style={{color:"#f9fafb"}}>Données de paiement</strong> : traitées exclusivement par Stripe — aucune donnée bancaire stockée</LL>
            <LL>• <strong style={{color:"#f9fafb"}}>Données de navigation</strong> : IP, navigateur (cookies techniques)</LL>
          </ul>
        </LegalSection>
        <LegalSection title="3. Finalités">
          <ul style={{listStyle:"none", marginBottom:12}}>
            <LL>• Générer et envoyer les documents commandés</LL>
            <LL>• Traiter et confirmer les paiements</LL>
            <LL>• Assurer le support client</LL>
            <LL>• Améliorer le service</LL>
          </ul>
        </LegalSection>
        <LegalSection title="4. Durée de conservation">
          <ul style={{listStyle:"none", marginBottom:12}}>
            <LL>• <strong style={{color:"#f9fafb"}}>Données de commande</strong> : 5 ans (obligations légales)</LL>
            <LL>• <strong style={{color:"#f9fafb"}}>Données de navigation</strong> : 13 mois maximum</LL>
            <LL>• <strong style={{color:"#f9fafb"}}>Données du générateur</strong> : non stockées après génération</LL>
          </ul>
        </LegalSection>
        <LegalSection title="5. Partage des données">
          <ul style={{listStyle:"none", marginBottom:12}}>
            <LL>• <strong style={{color:"#f9fafb"}}>Stripe</strong> : paiements (stripe.com/fr/privacy)</LL>
            <LL>• <strong style={{color:"#f9fafb"}}>Vercel</strong> : hébergement (vercel.com/legal/privacy-policy)</LL>
          </ul>
          <LP>Aucune donnée n'est vendue à des tiers.</LP>
        </LegalSection>
        <LegalSection title="6. Vos droits">
          <LP>Accès, rectification, effacement, opposition, portabilité. Pour exercer ces droits : <strong style={{color:"#f59e0b"}}>{LEGAL_EMAIL}</strong></LP>
          <LP>Réclamation possible auprès de la <strong style={{color:"#f9fafb"}}>CNIL</strong> : cnil.fr</LP>
        </LegalSection>
        <LegalSection title="7. Cookies">
          <LP>Cookies techniques nécessaires uniquement. Pas de cookies publicitaires. Vous pouvez les désactiver dans les paramètres de votre navigateur.</LP>
        </LegalSection>
        <p style={{color:"#374151", fontSize:11}}>Dernière mise à jour : {LEGAL_DATE}</p>
      </div>
    )
  }
};

export function LegalPage({ activePage, onClose }) {
  const [active, setActive] = useState(activePage || "mentions");
  const page = LEGAL_PAGES[active];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0c0c14", zIndex: 1000, overflowY: "auto", fontFamily: "'DM Sans', sans-serif", color: "#f9fafb" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, background: "rgba(12,12,20,0.95)", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <span style={{ fontSize: 20, fontFamily: "'Playfair Display', serif", fontWeight: 800, color: "#f59e0b" }}>Prévi<span style={{color:"#fff"}}>Bilan</span></span>
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(LEGAL_PAGES).map(([key, p]) => (
            <button key={key} onClick={() => setActive(key)} style={{ background: active === key ? "rgba(217,119,6,0.15)" : "transparent", border: `1px solid ${active === key ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.1)"}`, color: active === key ? "#f59e0b" : "#9ca3af", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
              {p.label}
            </button>
          ))}
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11 }}>
            ✕ Fermer
          </button>
        </div>
      </nav>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "50px 2rem 80px" }}>
        <div style={{ marginBottom: 36 }}>
          <p style={{ color: "#d97706", fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", marginBottom: 10 }}>INFORMATIONS LÉGALES</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, marginBottom: 8 }}>{page.label}</h1>
          <div style={{ width: 40, height: 2, background: "#d97706", borderRadius: 1 }} />
        </div>
        {page.content()}
      </div>
    </div>
  );
}
