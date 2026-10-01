import { useState, useEffect } from "react";
import CustomerSidebar3D from "../../components/dashboard/CustomerSidebar3D";
import {
  onRealtimeEvent,
  fetchDashboardData,
  processPaymentLive,
} from "../../services/realtime";
import "../../styles/module-pages.css";

const plansData = [
  {
    id: "standard",
    name: "Standard Tier",
    price: "₹1,999",
    period: "/ month",
    desc: "Essential gym floor access, cardio equipment, and free weight zones.",
    perks: [
      { text: "Full gym floor & barbell zones", active: true },
      { text: "Locker room & shower access", active: true },
      { text: "FitPulse mobile workout tracking", active: true },
      { text: "1-on-1 Certified Coach consultations", active: false },
      { text: "Recovery Lounge (Cryo & Sauna)", active: false },
      { text: "Unlimited Guest Passes", active: false },
    ],
    buttonText: "Downgrade to Standard",
    featured: false,
  },
  {
    id: "pro",
    name: "Pro Athlete Tier",
    price: "₹3,999",
    period: "/ month",
    desc: "Intermediate athletic access with group classes and recovery sauna.",
    perks: [
      { text: "Full gym floor & barbell zones", active: true },
      { text: "Locker room & shower access", active: true },
      { text: "FitPulse mobile workout tracking", active: true },
      { text: "2 Monthly Coach Biomechanic Audits", active: true },
      { text: "Recovery Lounge (Cryo & Sauna)", active: true },
      { text: "Unlimited Guest Passes", active: false },
    ],
    buttonText: "Switch to Pro",
    featured: false,
  },
  {
    id: "elite",
    name: "Elite Black Card",
    price: "₹6,999",
    period: "/ month",
    badge: "MOST POPULAR • ALL INCLUSIVE",
    desc: "The ultimate fitness experience. 24/7 campus access, private coaching diagnostics, full recovery spa suite, and VIP amenities.",
    perks: [
      { text: "24/7 Access to all 8 campus turnstiles", active: true },
      { text: "Executive private locker & towel service", active: true },
      { text: "Monthly InBody 770 composition scan", active: true },
      { text: "Unlimited 1-on-1 Coach Access (Alex Carter)", active: true },
      { text: "Full Recovery Lounge (Cryo, Sauna, Hydro)", active: true },
      { text: "2 Monthly VIP Guest Passes", active: true },
    ],
    buttonText: "Current Active Tier ✓",
    featured: true,
  },
];

export default function PlansModulePage() {
  const [activePlan, setActivePlan] = useState("elite");
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    let email = null;
    try {
      const stored = JSON.parse(localStorage.getItem("fitpulse_user") || "{}");
      if (stored.email) email = stored.email;
    } catch {}

    fetchDashboardData(email).then((data) => {
      if (data && data.invoices && data.invoices.length > 0) {
        setInvoices(
          data.invoices.map((inv) => ({
            id: inv.invoice_code,
            date: inv.payment_date || "Today",
            amount: inv.amount.startsWith("₹") || inv.amount.startsWith("$") ? inv.amount.replace("$", "₹") : `₹${inv.amount}`,
            method: "UPI • Instant",
            status: inv.status,
          }))
        );
      }
    });

    const unsubPayment = onRealtimeEvent("payment:success", (payload) => {
      if (payload) {
        const newInv = {
          id: payload.invoiceCode,
          date: "Today, Just Now",
          amount: payload.amount,
          method: "UPI • Instant",
          status: "Paid",
        };
        setInvoices((prev) => [newInv, ...prev]);
      }
    });

    return () => {
      unsubPayment();
    };
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handlePlanSelect = async (id) => {
    setActivePlan(id);
    const chosenPlan = plansData.find((p) => p.id === id);
    try {
      await processPaymentLive({
        amount: chosenPlan ? chosenPlan.price + ".00" : "₹3,999.00",
        planName: chosenPlan ? chosenPlan.name : "Pro Athlete Tier",
      });
    } catch {
      /* ignore */
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="module-page-container">
      {/* Photorealistic Dedicated Background */}
      <img
        src="/assets/modules/bg-plans.jpg"
        alt="FitPulse VIP Membership Plans"
        className="module-page-bg"
      />
      <div className="module-page-vignette" />

      {/* 3D Sidebar Dock */}
      <CustomerSidebar3D currentModule="plans" />

      {/* Main Page Area */}
      <main className="module-page-main">
        {/* Topbar matching screen design */}
        <div className="portal-screen-header">
          <div className="module-breadcrumb-row">
            <button
              type="button"
              className="module-back-btn"
              onClick={() => navigateTo("/dashboard")}
            >
              <span>←</span>
              <span>Dashboard</span>
            </button>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
            <span className="module-breadcrumb-current">Membership Plans</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="portal-search-bar">
              <span style={{ color: "#64748b" }}>🔍</span>
              <input
                type="text"
                className="portal-search-input"
                placeholder="Search plans & invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="portal-date-pill">
              <span>📅</span>
              <span>23 Sep 2026</span>
            </div>
          </div>
        </div>

        {/* Screen 8 Top Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 className="portal-screen-title">Membership Plans</h1>
            <p className="portal-screen-subtitle">
              Select the athletic tier that accelerates your strength, endurance, and transformation.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="module-status-pill" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", borderColor: "rgba(245, 158, 11, 0.3)" }}>
              <span>👑 CURRENT: ELITE BLACK CARD</span>
            </div>
          </div>
        </div>

        {/* Screen 8: 3 Pricing Tier Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "26px" }}>
          {plansData.map((plan) => {
            const isCurrent = activePlan === plan.id;
            const isPro = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className="portal-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: isCurrent ? "#10b981" : isPro ? "#0070f3" : "rgba(255,255,255,0.08)",
                  background: isCurrent
                    ? "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(12, 17, 27, 0.95) 100%)"
                    : isPro
                    ? "linear-gradient(180deg, rgba(0, 112, 243, 0.08) 0%, rgba(12, 17, 27, 0.95) 100%)"
                    : "rgba(12, 17, 27, 0.88)",
                  position: "relative",
                }}
              >
                {/* Badge if Pro or Current */}
                {isPro && (
                  <div style={{ position: "absolute", top: 16, right: 16 }}>
                    <span className="portal-weight-badge" style={{ color: "#00e5ff", background: "rgba(0, 229, 255, 0.15)", borderColor: "rgba(0, 229, 255, 0.4)", fontSize: "0.68rem" }}>
                      MOST POPULAR
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div style={{ position: "absolute", top: 16, right: 16 }}>
                    <span className="portal-weight-badge" style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.4)", fontSize: "0.68rem" }}>
                      CURRENT PLAN ✓
                    </span>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#ffffff", marginBottom: 6 }}>
                    {plan.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                    <span style={{ fontSize: "2.3rem", fontWeight: 900, color: "#ffffff", fontFamily: "JetBrains Mono" }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "#8da4be" }}>{plan.period}</span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.45, marginBottom: 18 }}>
                    {plan.desc}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    {plan.perks.map((perk, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          fontSize: "0.78rem",
                          color: perk.active ? "#ffffff" : "#64748b",
                        }}
                      >
                        <span style={{ color: perk.active ? "#00e5ff" : "#475569", fontWeight: 900 }}>
                          {perk.active ? "✓" : "✕"}
                        </span>
                        <span>{perk.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className={isCurrent ? "portal-pill-tab active" : "portal-btn-primary"}
                  style={{
                    width: "100%",
                    padding: "11px",
                    background: isCurrent ? "linear-gradient(135deg, #10b981, #059669)" : undefined,
                    borderColor: isCurrent ? "#34d399" : undefined,
                    boxShadow: isCurrent ? "0 4px 14px rgba(16, 185, 129, 0.35)" : undefined,
                  }}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {isCurrent ? "Current Active Tier ✓" : isPro ? "Switch to Pro Athlete" : "Select Standard"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Scrollable Extended Content: Recent Invoices & Billing */}
        <div className="portal-card">
          <div className="portal-card-header">
            <div>
              <h3 className="portal-card-title">Recent Invoices & Payment Receipts</h3>
              <div style={{ fontSize: "0.75rem", color: "#8da4be", marginTop: "2px" }}>
                Auto-renewal payment records charged to primary Visa card
              </div>
            </div>
            <span className="portal-weight-badge">
              Auto-Pay: Enabled
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {invoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "#94a3b8", fontSize: "0.85rem" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "8px" }}>🧾</div>
                <div style={{ fontWeight: 700, color: "#cbd5e1" }}>No Invoices or Receipts Yet</div>
                <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                  When you subscribe to a membership tier or hire a master trainer, official GST payment receipts will be cataloged here.
                </div>
              </div>
            ) : (
              invoices
                .filter((inv) => !searchQuery || inv.id.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((inv) => (
                  <div key={inv.id} className="portal-exercise-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                        🧾
                      </div>
                      <div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#ffffff" }}>{inv.id}</div>
                        <div style={{ fontSize: "0.74rem", color: "#8da4be" }}>{inv.date} • {inv.method}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#ffffff", fontFamily: "JetBrains Mono" }}>
                        {inv.amount}
                      </div>
                      <span
                        className="portal-weight-badge"
                        style={{
                          fontSize: "0.7rem",
                          color: "#34d399",
                          borderColor: "rgba(52, 211, 153, 0.4)",
                          background: "rgba(52, 211, 153, 0.1)",
                        }}
                      >
                        {inv.status}
                      </span>
                      <button
                        type="button"
                        className="portal-pill-tab"
                        style={{ fontSize: "0.72rem", padding: "5px 12px" }}
                        onClick={() => alert(`Downloading receipt for ${inv.id}...`)}
                      >
                        PDF Receipt ⬇
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
