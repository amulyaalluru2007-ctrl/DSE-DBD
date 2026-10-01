import { useEffect, useState, useRef } from "react";
import {
  fetchAdminOverview,
  fetchAdminTrainers,
  createTrainerLive,
  fetchAdminMembers,
  assignTrainerLive,
  fetchMemberQueries,
  resolveMemberQueryLive,
  fetchChatMessages,
  sendChatMessageLive,
  subscribeRealtime,
} from "../services/realtime";
import "../styles/admin-dashboard.css";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, trainers, members, chat, queries
  const [loading, setLoading] = useState(true);

  // Live Data States
  const [overview, setOverview] = useState({
    totalTrainers: 2,
    totalMembers: 4,
    pendingQueries: 1,
    activeWorkoutsToday: 6,
    checkInsToday: 38,
  });

  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [queries, setQueries] = useState([]);

  // Create Trainer Modal
  const [showCreateTrainerModal, setShowCreateTrainerModal] = useState(false);
  const [trainerForm, setTrainerForm] = useState({
    name: "",
    email: "",
    personalEmail: "",
    specialty: "Strength & Hypertrophy",
    password: "",
    phone: "+1 (555) 000-0000",
  });
  const [creatingTrainer, setCreatingTrainer] = useState(false);
  const [createMsg, setCreateMsg] = useState({ type: "", text: "" });

  // Admin <-> Trainer Chat State
  const [selectedTrainerChat, setSelectedTrainerChat] = useState(null);
  const selectedTrainerChatRef = useRef(selectedTrainerChat);
  useEffect(() => {
    selectedTrainerChatRef.current = selectedTrainerChat;
  }, [selectedTrainerChat]);

  const [trainerChatHistory, setTrainerChatHistory] = useState([]);
  const [adminChatInput, setAdminChatInput] = useState("");

  // Query Resolution Modal / Inline Note
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [resolvingQuery, setResolvingQuery] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [queryFilter, setQueryFilter] = useState("all"); // all, pending, resolved

  // Current logged in admin info
  const [currentAdmin, setCurrentAdmin] = useState({
    id: 1,
    name: "Gym Administrator",
    email: "admin@fitpulse.com",
    role: "Admin",
  });

  // Load initial backend state
  const loadAllData = async () => {
    try {
      const [ov, tr, mem, qr] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminTrainers(),
        fetchAdminMembers(),
        fetchMemberQueries(),
      ]);

      if (ov && ov.success) {
        const stats = ov.data || ov.stats || {};
        setOverview((prev) => ({ ...prev, ...stats }));
      }
      if (tr && tr.success) {
        setTrainers(tr.trainers);
        if (tr.trainers.length > 0 && !selectedTrainerChat) {
          setSelectedTrainerChat(tr.trainers[0]);
        }
      }
      if (mem && mem.success) setMembers(mem.members);
      if (qr && qr.success) setQueries(qr.queries);
    } catch (err) {
      console.warn("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fitpulse_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === "Admin") {
          setCurrentAdmin(parsed);
        }
      }
    } catch {
      /* ignore */
    }

    loadAllData();

    // Subscribe to real-time WebSocket events
    const unsubNewQuery = subscribeRealtime("query:new", (data) => {
      setQueries((prev) => [data.query, ...prev]);
      setOverview((prev) => ({ ...prev, pendingQueries: (prev?.pendingQueries || 0) + 1 }));
    });

    const unsubResolvedQuery = subscribeRealtime("query:resolved", (data) => {
      setQueries((prev) =>
        prev.map((q) => (q.id === data.queryId ? { ...q, status: "Resolved", admin_notes: data.adminNotes } : q))
      );
      setOverview((prev) => ({ ...prev, pendingQueries: Math.max(0, (prev?.pendingQueries || 1) - 1) }));
    });

    const unsubTrainerCreated = subscribeRealtime("trainer:created", () => {
      fetchAdminTrainers().then((res) => {
        if (res && res.success) setTrainers(res.trainers);
      });
      fetchAdminOverview().then((res) => {
        if (res && res.success) {
          const stats = res.data || res.stats || {};
          setOverview((prev) => ({ ...prev, ...stats }));
        }
      });
    });

    const unsubTraineeAssigned = subscribeRealtime("trainee:assigned", () => {
      fetchAdminMembers().then((res) => {
        if (res && res.success) setMembers(res.members);
      });
      fetchAdminTrainers().then((res) => {
        if (res && res.success) setTrainers(res.trainers);
      });
    });

    const unsubChatMessage = subscribeRealtime("chat:message", (data) => {
      const ch = data?.channel_type || data?.channelType;
      if (ch === "admin_trainer") {
        const curTrainerId = Number(selectedTrainerChatRef.current?.id);
        const sId = Number(data.sender_id || data.senderId);
        const rId = Number(data.receiver_id || data.receiverId);
        if (curTrainerId && (sId === curTrainerId || rId === curTrainerId)) {
          setTrainerChatHistory((prev) => {
            if (data.id && prev.some((m) => m.id === data.id)) return prev;
            return [...prev, data];
          });
        }
      }
    });

    return () => {
      if (unsubNewQuery) unsubNewQuery();
      if (unsubResolvedQuery) unsubResolvedQuery();
      if (unsubTrainerCreated) unsubTrainerCreated();
      if (unsubTraineeAssigned) unsubTraineeAssigned();
      if (unsubChatMessage) unsubChatMessage();
    };
  }, []);

  // Load chat messages when selected trainer changes
  useEffect(() => {
    if (selectedTrainerChat && currentAdmin) {
      fetchChatMessages(currentAdmin.id || 1, selectedTrainerChat.id, "admin_trainer").then((res) => {
        if (res && res.success) {
          setTrainerChatHistory(res.messages);
        }
      });
    }
  }, [selectedTrainerChat]);

  const handleLogout = () => {
    localStorage.removeItem("fitpulse_token");
    localStorage.removeItem("fitpulse_user");
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Create Trainer Submission
  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    if (!trainerForm.name || !trainerForm.email || !trainerForm.personalEmail || !trainerForm.password) {
      setCreateMsg({ type: "error", text: "Please provide all required fields including personal Gmail." });
      return;
    }

    setCreatingTrainer(true);
    setCreateMsg({ type: "", text: "" });

    const res = await createTrainerLive(trainerForm);
    setCreatingTrainer(false);

    if (res && res.success) {
      setCreateMsg({
        type: "success",
        text: `Trainer ${trainerForm.name} created! Corporate ID linked to ${trainerForm.personalEmail}.`,
      });
      setTimeout(() => {
        setShowCreateTrainerModal(false);
        setTrainerForm({
          name: "",
          email: "",
          personalEmail: "",
          specialty: "Strength & Hypertrophy",
          password: "",
          phone: "+1 (555) 000-0000",
        });
        setCreateMsg({ type: "", text: "" });
        loadAllData();
      }, 1500);
    } else {
      setCreateMsg({ type: "error", text: res?.message || "Error creating trainer in database." });
    }
  };

  // Assign Trainer to Member
  const handleAssignTrainer = async (memberId, trainerId) => {
    const res = await assignTrainerLive(memberId, trainerId);
    if (res && res.success) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                assigned_trainer_id: trainerId ? Number(trainerId) : null,
                assigned_trainer_name: trainers.find((t) => t.id === Number(trainerId))?.name || "Unassigned",
              }
            : m
        )
      );
    }
  };

  // Resolve Member Support Query
  const handleResolveQuery = async (queryId) => {
    setResolvingQuery(true);
    const res = await resolveMemberQueryLive(queryId, adminNotes || "Resolved by Gym Administrator.");
    setResolvingQuery(false);

    if (res && res.success) {
      setQueries((prev) =>
        prev.map((q) => (q.id === queryId ? { ...q, status: "Resolved", admin_notes: adminNotes } : q))
      );
      setSelectedQuery(null);
      setAdminNotes("");
    }
  };

  // Send Admin -> Trainer message
  const handleSendAdminMessage = async (e) => {
    e.preventDefault();
    if (!adminChatInput.trim() || !selectedTrainerChat) return;

    const text = adminChatInput.trim();
    setAdminChatInput("");

    const payload = {
      sender_id: currentAdmin.id || 1,
      senderId: currentAdmin.id || 1,
      sender_name: "Gym Administrator",
      senderName: "Gym Administrator",
      senderRole: "Admin",
      receiver_id: selectedTrainerChat.id,
      receiverId: selectedTrainerChat.id,
      receiver_name: selectedTrainerChat.name,
      receiverName: selectedTrainerChat.name,
      channel_type: "admin_trainer",
      channelType: "admin_trainer",
      message: text,
    };

    const res = await sendChatMessageLive(payload);
    if (res && res.success) {
      const msg = res.message || res.chatMessage;
      if (msg) {
        setTrainerChatHistory((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }
  };

  const filteredQueries = queries.filter((q) => {
    if (queryFilter === "pending") return q.status === "Pending" || q.status === "In-Review";
    if (queryFilter === "resolved") return q.status === "Resolved";
    return true;
  });

  return (
    <div className="admin-dashboard-container">
      {/* Subtle Background Radial Glows */}
      <div className="admin-ambient-glow-1" />
      <div className="admin-ambient-glow-2" />

      {/* Top Bar */}
      <header className="admin-topbar">
        <div className="admin-brand-cluster">
          <div className="admin-brand-logo">
            <span>FITPULSE</span>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>ADMIN CONTROL</span>
          </div>
          <div className="admin-badge-live">
            <span className="admin-pulse-dot" />
            <span>LIVE MYSQL ENGINE</span>
          </div>
        </div>

        <div className="admin-top-stats">
          <div className="admin-stat-pill">
            <span>Certified Trainers:</span>
            <strong style={{ color: "#00f2fe" }}>{overview.totalTrainers || trainers.length}</strong>
          </div>
          <div className="admin-stat-pill">
            <span>Members Registered:</span>
            <strong style={{ color: "#34d399" }}>{overview.totalMembers || members.length}</strong>
          </div>
          <div className="admin-stat-pill">
            <span>Query Box:</span>
            <strong style={{ color: overview.pendingQueries > 0 ? "#f59e0b" : "#94a3b8" }}>
              {overview.pendingQueries} Pending
            </strong>
          </div>

          <div className="admin-user-profile">
            <div className="admin-avatar">AD</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>Administrator</span>
              <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>admin@fitpulse.com</span>
            </div>
            <button type="button" onClick={handleLogout} className="admin-logout-btn">
              Exit Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="admin-workspace">
        {/* Left Vertical Dock */}
        <aside className="admin-sidebar">
          <button
            id="admin-tab-overview"
            type="button"
            className={`admin-nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span>📊</span>
            <span>Gym Pulse Overview</span>
          </button>

          <button
            id="admin-tab-trainers"
            type="button"
            className={`admin-nav-item ${activeTab === "trainers" ? "active" : ""}`}
            onClick={() => setActiveTab("trainers")}
          >
            <span>🏋️</span>
            <span>Trainers Roster</span>
            <span className="admin-nav-badge" style={{ background: "rgba(0,242,254,0.2)", color: "#00f2fe" }}>
              {trainers.length}
            </span>
          </button>

          <button
            id="admin-tab-members"
            type="button"
            className={`admin-nav-item ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            <span>👥</span>
            <span>Member Directory</span>
            <span className="admin-nav-badge" style={{ background: "rgba(16,185,129,0.2)", color: "#34d399" }}>
              {members.length}
            </span>
          </button>

          <button
            id="admin-tab-chat"
            type="button"
            className={`admin-nav-item ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <span>💬</span>
            <span>Trainer Messenger</span>
          </button>

          <button
            id="admin-tab-queries"
            type="button"
            className={`admin-nav-item ${activeTab === "queries" ? "active" : ""}`}
            onClick={() => setActiveTab("queries")}
          >
            <span>📬</span>
            <span>Member Query Box</span>
            {overview.pendingQueries > 0 && (
              <span className="admin-nav-badge">{overview.pendingQueries}</span>
            )}
          </button>

          <div style={{ marginTop: "auto", padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.3rem" }}>
              System Authority
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Root Privileges • MySQL 8.0 • Socket.io Cluster
            </div>
          </div>
        </aside>

        {/* Content Canvas */}
        <main className="admin-content-area">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              {/* Privacy Notice Banner */}
              <div className="admin-privacy-banner">
                <span style={{ fontSize: "1.6rem" }}>🛡️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f8fafc", marginBottom: "0.2rem" }}>
                    FitPulse Administrator Boundary & Privacy Protocol
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.4 }}>
                    Admin oversees facility rosters, trainer assignments, corporate accounts, and support tickets. Private member-trainer 1-on-1 chats and daily biometric nutrition journals remain strictly confidential between trainees and their assigned certified trainer.
                  </div>
                </div>
              </div>

              {/* KPI Metric Grid */}
              <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                  <span className="admin-kpi-title">Certified Coaches</span>
                  <span className="admin-kpi-val" style={{ color: "#00f2fe" }}>{trainers.length}</span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Corporate accounts provisioned</span>
                </div>

                <div className="admin-kpi-card">
                  <span className="admin-kpi-title">Active Members</span>
                  <span className="admin-kpi-val" style={{ color: "#34d399" }}>{members.length}</span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Synced across all gym tiers</span>
                </div>

                <div className="admin-kpi-card">
                  <span className="admin-kpi-title">Support Queries</span>
                  <span className="admin-kpi-val" style={{ color: overview.pendingQueries > 0 ? "#f59e0b" : "#94a3b8" }}>
                    {overview.pendingQueries}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Requiring admin response</span>
                </div>

                <div className="admin-kpi-card">
                  <span className="admin-kpi-title">Today's Check-ins</span>
                  <span className="admin-kpi-val" style={{ color: "#a855f7" }}>{overview.checkInsToday}</span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>QR access gate verified</span>
                </div>
              </div>

              {/* Action Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
                {/* Recent Support Queries Preview */}
                <div className="admin-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Recent Member Support Tickets</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("queries")}
                      style={{ background: "transparent", border: "none", color: "#00f2fe", fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Open Query Box →
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    {queries.slice(0, 3).map((q) => (
                      <div
                        key={q.id}
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: "8px",
                          padding: "0.8rem 1rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f8fafc" }}>
                            {q.memberName || q.member_name || "Nihal Carter"} ({q.memberEmail || q.member_email || "member@fitpulse.com"})
                          </span>
                          <span className={`admin-badge-pill ${q.status === "Resolved" ? "badge-resolved" : "badge-pending"}`}>
                            {q.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.2rem" }}>
                          <strong>{q.subject}</strong> — {q.category}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {q.message.length > 120 ? q.message.substring(0, 120) + "..." : q.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Roster Actions */}
                <div className="admin-card">
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Quick Management</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("trainers");
                        setShowCreateTrainerModal(true);
                      }}
                      style={{
                        padding: "0.9rem",
                        background: "linear-gradient(135deg, rgba(0,242,254,0.15) 0%, rgba(0,242,254,0.05) 100%)",
                        border: "1px solid rgba(0,242,254,0.3)",
                        borderRadius: "10px",
                        color: "#00f2fe",
                        fontWeight: 600,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.8rem",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>➕</span>
                      <div>
                        <div style={{ fontSize: "0.88rem" }}>Create New Trainer Account</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 400 }}>
                          Issue corporate email & link personal Gmail for self-reset
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("members")}
                      style={{
                        padding: "0.9rem",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "10px",
                        color: "#e2e8f0",
                        fontWeight: 600,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.8rem",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>🎯</span>
                      <div>
                        <div style={{ fontSize: "0.88rem" }}>Reassign Trainees & Coaches</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 400 }}>
                          Pair gym members with certified fitness coaches
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("chat")}
                      style={{
                        padding: "0.9rem",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "10px",
                        color: "#e2e8f0",
                        fontWeight: 600,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.8rem",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>📢</span>
                      <div>
                        <div style={{ fontSize: "0.88rem" }}>Broadcast to Trainer Roster</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 400 }}>
                          Send operations notices to coaching staff
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRAINERS ROSTER */}
          {activeTab === "trainers" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#fff" }}>Certified Trainers Roster</h2>
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>
                    Corporate IDs issued by Admin and securely linked to trainers' personal Gmail for independent self-service resets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateTrainerModal(true)}
                  style={{
                    padding: "0.75rem 1.4rem",
                    background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#000",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.85rem",
                    boxShadow: "0 4px 15px rgba(0, 242, 254, 0.3)",
                  }}
                >
                  <span>+</span>
                  <span>Create New Trainer</span>
                </button>
              </div>

              {/* Trainers Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.2rem" }}>
                {trainers.map((tr) => (
                  <div key={tr.id} className="admin-card">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #3b82f6 0%, #00f2fe 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.2rem",
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        {tr.name.split(" ").map((n) => n[0]).join("")}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#fff" }}>{tr.name}</h3>
                          <span className="admin-badge-pill badge-resolved">Active Coach</span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#00f2fe", fontWeight: 600, marginTop: "0.15rem" }}>
                          {tr.specialty || "Fitness Specialist"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Corporate ID:</span>
                        <strong style={{ color: "#fff" }}>{tr.email}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94a3b8" }}>Linked Personal Gmail:</span>
                        <span
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#34d399",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                          }}
                        >
                          ✉️ {tr.personalEmail || tr.personal_email || "Linked upon signup"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Active Trainees:</span>
                        <strong style={{ color: "#00f2fe" }}>{tr.activeTraineeCount ?? tr.trainee_count ?? 0} Members</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Self-Service Reset:</span>
                        <span style={{ color: "#34d399", fontWeight: 600 }}>Enabled (Personal Gmail)</span>
                      </div>
                    </div>

                    <div style={{ marginTop: "1.2rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrainerChat(tr);
                          setActiveTab("chat");
                        }}
                        style={{
                          flex: 1,
                          padding: "0.55rem",
                          background: "rgba(0, 242, 254, 0.1)",
                          border: "1px solid rgba(0, 242, 254, 0.25)",
                          borderRadius: "8px",
                          color: "#00f2fe",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Direct Message Coach
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MEMBER DIRECTORY & TRAINER ASSIGNMENT */}
          {activeTab === "members" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#fff" }}>Member Directory & Coaching Roster</h2>
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>
                    Assign gym members to personal trainers. Trainers will only see and communicate with their assigned trainees.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Search member by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "0.6rem 1rem",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.85rem",
                    width: "280px",
                  }}
                />
              </div>

              <div className="admin-card" style={{ padding: 0 }}>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Member Details</th>
                        <th>Contact</th>
                        <th>Membership Plan</th>
                        <th>Gym Attendance</th>
                        <th>Assigned Certified Coach</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members
                        .filter(
                          (m) =>
                            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.email.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((mem) => (
                          <tr key={mem.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <div
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    color: "#fff",
                                  }}
                                >
                                  {mem.name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: "#fff" }}>{mem.name}</div>
                                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>ID: FP-{1000 + mem.id}</div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div style={{ fontSize: "0.82rem", color: "#f1f5f9" }}>{mem.email}</div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{mem.phone || "N/A"}</div>
                            </td>

                            <td>
                              <span className="admin-badge-pill" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                                {mem.planName || mem.plan_tier || "VIP Elite"}
                              </span>
                            </td>

                            <td>
                              <div style={{ fontWeight: 600, color: "#34d399" }}>
                                {mem.attendanceVisits ?? mem.attendance_count ?? 18} Check-ins
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Active QR Valid</div>
                            </td>

                            <td>
                              <select
                                value={mem.assignedTrainerId || mem.assigned_trainer_id || ""}
                                onChange={(e) => handleAssignTrainer(mem.id, e.target.value)}
                                style={{
                                  background: "rgba(15, 23, 42, 0.9)",
                                  border: "1px solid rgba(0, 242, 254, 0.3)",
                                  borderRadius: "8px",
                                  color: "#00f2fe",
                                  padding: "0.5rem 0.8rem",
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  outline: "none",
                                }}
                              >
                                <option value="">-- No Coach Assigned --</option>
                                {trainers.map((tr) => (
                                  <option key={tr.id} value={tr.id}>
                                    Coach {tr.name} ({tr.specialty || "Strength"})
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRAINER MESSENGER (ADMIN <-> TRAINER) */}
          {activeTab === "chat" && (
            <div style={{ height: "calc(100vh - 120px)", display: "flex", gap: "1.2rem" }}>
              {/* Trainer Selector Column */}
              <div
                style={{
                  width: "280px",
                  background: "rgba(13, 19, 31, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  overflowY: "auto",
                }}
              >
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", marginBottom: "0.4rem" }}>
                  Staff Coaching Roster
                </div>
                {trainers.map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => setSelectedTrainerChat(tr)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem",
                      padding: "0.75rem",
                      borderRadius: "10px",
                      background: selectedTrainerChat?.id === tr.id ? "rgba(0, 242, 254, 0.15)" : "rgba(255,255,255,0.02)",
                      border: selectedTrainerChat?.id === tr.id ? "1px solid rgba(0, 242, 254, 0.4)" : "1px solid transparent",
                      color: selectedTrainerChat?.id === tr.id ? "#00f2fe" : "#e2e8f0",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "#1e293b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "#fff",
                      }}
                    >
                      {tr.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{tr.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{tr.specialty || "Trainer"}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Chat Conversation Area */}
              <div
                style={{
                  flex: 1,
                  background: "rgba(13, 19, 31, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {selectedTrainerChat ? (
                  <>
                    <div
                      style={{
                        padding: "1rem 1.4rem",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(10, 15, 24, 0.5)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                          Direct Line: Admin ↔ Coach {selectedTrainerChat.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#00f2fe" }}>
                          {selectedTrainerChat.email} • Staff Management Channel
                        </div>
                      </div>
                      <span className="admin-badge-pill badge-resolved">Secure Protocol</span>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        padding: "1.4rem",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.8rem",
                      }}
                    >
                      {trainerChatHistory.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#64748b", margin: "auto", fontSize: "0.85rem" }}>
                          No messages yet with Coach {selectedTrainerChat.name}. Send an operational memo below.
                        </div>
                      ) : (
                        trainerChatHistory.map((m, idx) => {
                          const isFromAdmin = Number(m.sender_id || m.senderId) === Number(currentAdmin.id || 1) || m.sender_role === "Admin" || m.senderRole === "Admin";
                          const rawDate = m.created_at || m.createdAt;
                          const d = rawDate ? new Date(rawDate) : new Date();
                          const timeStr = isNaN(d.getTime()) ? "Just now" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          return (
                            <div
                              key={m.id || idx}
                              style={{
                                alignSelf: isFromAdmin ? "flex-end" : "flex-start",
                                maxWidth: "68%",
                                padding: "0.85rem 1.1rem",
                                borderRadius: isFromAdmin ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                                background: isFromAdmin
                                  ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                                  : "rgba(15, 23, 42, 0.85)",
                                border: isFromAdmin
                                  ? "1px solid rgba(56, 189, 248, 0.4)"
                                  : "1px solid rgba(255, 255, 255, 0.12)",
                                color: "#fff",
                                fontSize: "0.88rem",
                                boxShadow: "0 6px 16px rgba(0,0,0,0.28)",
                              }}
                            >
                              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: isFromAdmin ? "#bae6fd" : "#38bdf8", marginBottom: "0.25rem" }}>
                                {isFromAdmin ? "Admin Control" : (m.sender_name || m.senderName || `Coach ${selectedTrainerChat.name}`)}
                              </div>
                              <div style={{ lineHeight: 1.45 }}>{m.message}</div>
                              <div style={{ fontSize: "0.65rem", color: isFromAdmin ? "#e0f2fe" : "#94a3b8", textAlign: "right", marginTop: "0.35rem" }}>
                                {timeStr}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form
                      onSubmit={handleSendAdminMessage}
                      style={{
                        padding: "1rem",
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        gap: "0.8rem",
                        background: "rgba(10, 15, 24, 0.5)",
                      }}
                    >
                      <input
                        type="text"
                        placeholder={`Message Coach ${selectedTrainerChat.name}...`}
                        value={adminChatInput}
                        onChange={(e) => setAdminChatInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "0.75rem 1rem",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "0.88rem",
                          outline: "none",
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          padding: "0.75rem 1.4rem",
                          background: "linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)",
                          border: "none",
                          borderRadius: "8px",
                          color: "#000",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        Send Memo
                      </button>
                    </form>
                  </>
                ) : (
                  <div style={{ margin: "auto", color: "#64748b" }}>Select a coach to start conversation.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MEMBER SUPPORT QUERY BOX */}
          {activeTab === "queries" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#fff" }}>Member Support Query Box</h2>
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>
                    Inbound customer queries, complaints, and facility requests submitted from member customer portals.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setQueryFilter("all")}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: "6px",
                      background: queryFilter === "all" ? "rgba(0,242,254,0.2)" : "rgba(255,255,255,0.04)",
                      border: queryFilter === "all" ? "1px solid #00f2fe" : "1px solid rgba(255,255,255,0.08)",
                      color: queryFilter === "all" ? "#00f2fe" : "#94a3b8",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    All ({queries.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueryFilter("pending")}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: "6px",
                      background: queryFilter === "pending" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
                      border: queryFilter === "pending" ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                      color: queryFilter === "pending" ? "#f59e0b" : "#94a3b8",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Pending ({queries.filter((q) => q.status !== "Resolved").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueryFilter("resolved")}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: "6px",
                      background: queryFilter === "resolved" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)",
                      border: queryFilter === "resolved" ? "1px solid #34d399" : "1px solid rgba(255,255,255,0.08)",
                      color: queryFilter === "resolved" ? "#34d399" : "#94a3b8",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Resolved ({queries.filter((q) => q.status === "Resolved").length})
                  </button>
                </div>
              </div>

              {/* Tickets List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredQueries.length === 0 ? (
                  <div className="admin-card" style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                    No support tickets found under "{queryFilter}".
                  </div>
                ) : (
                  filteredQueries.map((q) => (
                    <div
                      key={q.id}
                      className="admin-card"
                      style={{
                        borderLeft:
                          q.status === "Resolved"
                            ? "4px solid #10b981"
                            : q.priority === "High"
                            ? "4px solid #ef4444"
                            : "4px solid #f59e0b",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff" }}>
                              {q.subject}
                            </span>
                            <span className={`admin-badge-pill ${q.status === "Resolved" ? "badge-resolved" : "badge-pending"}`}>
                              {q.status}
                            </span>
                            <span className="admin-badge-pill" style={{ background: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}>
                              {q.category}
                            </span>
                            {q.priority === "High" && (
                              <span className="admin-badge-pill badge-high">URGENT</span>
                            )}
                          </div>

                          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.3rem" }}>
                            Submitted by <strong style={{ color: "#00f2fe" }}>{q.memberName || q.member_name || "Nihal Carter"}</strong> ({q.memberEmail || q.member_email || "member@fitpulse.com"} {q.member_phone ? `• ${q.member_phone}` : ""}) • {new Date(q.createdAt || q.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>

                        {q.status !== "Resolved" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuery(q);
                              setAdminNotes(`Resolved ticket for ${q.member_name}. Access verified.`);
                            }}
                            style={{
                              padding: "0.45rem 0.9rem",
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid rgba(16, 185, 129, 0.4)",
                              borderRadius: "6px",
                              color: "#34d399",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Resolve Ticket ✓
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          borderRadius: "8px",
                          padding: "1rem",
                          color: "#e2e8f0",
                          fontSize: "0.88rem",
                          lineHeight: 1.5,
                          marginBottom: "0.8rem",
                        }}
                      >
                        {q.message}
                      </div>

                      {q.admin_notes && (
                        <div
                          style={{
                            background: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            borderRadius: "8px",
                            padding: "0.8rem 1rem",
                            fontSize: "0.8rem",
                            color: "#34d399",
                          }}
                        >
                          <strong>Admin Resolution Notes:</strong> {q.admin_notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE TRAINER MODAL */}
      {showCreateTrainerModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #0d121c 0%, #070a0e 100%)",
              border: "1px solid rgba(0, 242, 254, 0.3)",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0,242,254,0.15)",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setShowCreateTrainerModal(false)}
              style={{
                position: "absolute",
                top: "1.2rem",
                right: "1.2rem",
                background: "transparent",
                border: "none",
                color: "#6b7280",
                fontSize: "1.2rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🏋️</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                Provision New Trainer Account
              </h2>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginBottom: "1.2rem", lineHeight: 1.4 }}>
              Register a corporate FitPulse email and link the trainer's personal Gmail account so they can independently reset their password without admin intervention.
            </p>

            {createMsg.text && (
              <div
                style={{
                  padding: "0.7rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                  background: createMsg.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  border: createMsg.type === "success" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
                  color: createMsg.type === "success" ? "#34d399" : "#f87171",
                }}
              >
                {createMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateTrainer}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "0.8rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marcus Vance"
                    value={trainerForm.name}
                    onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.8rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                    Coaching Specialty
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Powerlifting & Mobility"
                    value={trainerForm.specialty}
                    onChange={(e) => setTrainerForm({ ...trainerForm, specialty: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.8rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "0.8rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                  Corporate FitPulse Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. marcus@fitpulse.com"
                  value={trainerForm.email}
                  onChange={(e) => setTrainerForm({ ...trainerForm, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.8rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "0.8rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#34d399", fontWeight: 600, marginBottom: "0.3rem" }}>
                  ★ Linked Personal Gmail (For Independent Self-Service Reset) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. marcus.fitness.coach@gmail.com"
                  value={trainerForm.personalEmail}
                  onChange={(e) => setTrainerForm({ ...trainerForm, personalEmail: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.8rem",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "8px",
                    color: "#34d399",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                />
                <span style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.2rem", display: "block" }}>
                  Password reset codes will go directly to this personal Gmail address.
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "1.4rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={trainerForm.password}
                    onChange={(e) => setTrainerForm({ ...trainerForm, password: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.8rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={trainerForm.phone}
                    onChange={(e) => setTrainerForm({ ...trainerForm, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.8rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTrainerModal(false)}
                  style={{
                    padding: "0.6rem 1.2rem",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    color: "#9ca3af",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingTrainer}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#000",
                    fontWeight: 700,
                    cursor: creatingTrainer ? "not-allowed" : "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  {creatingTrainer ? "Creating Account..." : "Provision Trainer →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE QUERY MODAL */}
      {selectedQuery && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #0d121c 0%, #070a0e 100%)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "480px",
              position: "relative",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem 0" }}>
              Resolve Ticket #{selectedQuery.id}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "1rem" }}>
              Ticket: <strong>{selectedQuery.subject}</strong> from {selectedQuery.member_name}
            </p>

            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.4rem" }}>
              Admin Resolution Notes
            </label>
            <textarea
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Locker assigned, keycard renewed, or coach briefed."
              style={{
                width: "100%",
                padding: "0.8rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.85rem",
                boxSizing: "border-box",
                marginBottom: "1.2rem",
                resize: "vertical",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem" }}>
              <button
                type="button"
                onClick={() => setSelectedQuery(null)}
                style={{
                  padding: "0.6rem 1.2rem",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  color: "#9ca3af",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolvingQuery}
                onClick={() => handleResolveQuery(selectedQuery.id)}
                style={{
                  padding: "0.6rem 1.4rem",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: resolvingQuery ? "not-allowed" : "pointer",
                }}
              >
                {resolvingQuery ? "Saving..." : "Confirm Resolution ✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
