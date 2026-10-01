import { io } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:5000";

let socket = null;
const listeners = new Map();
let toastSubscribers = [];

// Initialize Socket connection
export const initRealtimeClient = () => {
  if (socket) return socket;

  try {
    socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[FitPulse RealTime] Connected to WebSocket server. Socket ID:", socket.id);
      dispatchToast({
        id: Date.now(),
        type: "system",
        title: "Live Synchronized",
        message: "Real-time biometric & gym engine connected to MySQL.",
        duration: 3500,
      });
    });

    socket.on("connect_error", (err) => {
      console.warn("[FitPulse RealTime] Connection warning:", err.message);
    });

    // Global Notification listener
    socket.on("notification:new", (data) => {
      dispatchToast({
        id: Date.now(),
        type: data.type || "info",
        title: data.title || "Gym Update",
        message: data.message || "",
        duration: 4500,
      });
      notifyListeners("notification:new", data);
    });

    // Attendance Scan Event
    socket.on("attendance:scanned", (data) => {
      notifyListeners("attendance:scanned", data);
    });

    // Workout Events
    socket.on("workout:assigned", (data) => {
      notifyListeners("workout:assigned", data);
    });
    socket.on("workout:set-completed", (data) => {
      notifyListeners("workout:set-completed", data);
    });
    socket.on("workout:completed", (data) => {
      notifyListeners("workout:completed", data);
    });

    // Progress & PRs
    socket.on("progress:updated", (data) => {
      notifyListeners("progress:updated", data);
    });

    // Trainer Sessions
    socket.on("session:booked", (data) => {
      notifyListeners("session:booked", data);
    });

    // Chat Message Event
    socket.on("chat:message", (data) => {
      notifyListeners("chat:message", data);
    });

    // Member Query Events
    socket.on("query:new", (data) => {
      notifyListeners("query:new", data);
    });
    socket.on("query:resolved", (data) => {
      notifyListeners("query:resolved", data);
    });

    // Admin Events
    socket.on("trainer:created", (data) => {
      notifyListeners("trainer:created", data);
    });
    socket.on("trainee:assigned", (data) => {
      notifyListeners("trainee:assigned", data);
    });

    // Nutrition Live Event
    socket.on("nutrition:logged", (data) => {
      notifyListeners("nutrition:logged", data);
    });
    socket.on("session:cancelled", (data) => {
      notifyListeners("session:cancelled", data);
    });

    // Nutrition
    socket.on("nutrition:logged", (data) => {
      notifyListeners("nutrition:logged", data);
    });

    // Payments & Membership
    socket.on("payment:success", (data) => {
      notifyListeners("payment:success", data);
    });
    socket.on("membership:updated", (data) => {
      notifyListeners("membership:updated", data);
    });

    // Profile & Fitness Preferences
    socket.on("profile:updated", (data) => {
      notifyListeners("profile:updated", data);
    });
    socket.on("member:preferences-updated", (data) => {
      notifyListeners("member:preferences-updated", data);
    });

    // Biometric Face ID
    socket.on("user:face-enrolled", (data) => {
      notifyListeners("user:face-enrolled", data);
    });

  } catch (error) {
    console.warn("Socket init error:", error);
  }

  return socket;
};

// Listener Registration
export const onRealtimeEvent = (event, callback) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  // Return unregister function
  return () => {
    if (listeners.has(event)) {
      listeners.get(event).delete(callback);
    }
  };
};

export const subscribeRealtime = onRealtimeEvent;

const notifyListeners = (event, data) => {
  if (listeners.has(event)) {
    listeners.get(event).forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Error in listener for ${event}:`, e);
      }
    });
  }
};

// Toast notification subscription for floating UI toast component
export const subscribeToToasts = (callback) => {
  toastSubscribers.push(callback);
  return () => {
    toastSubscribers = toastSubscribers.filter((cb) => cb !== callback);
  };
};

export const dispatchToast = (toast) => {
  toastSubscribers.forEach((cb) => {
    try {
      cb(toast);
    } catch {
      /* ignore */
    }
  });
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("fitpulse_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/* =====================================================
   API CLIENT HELPERS (TRIGGERING REAL-TIME UPDATES)
===================================================== */
export const fetchDashboardData = async (email) => {
  try {
    let targetEmail = email;
    if (!targetEmail) {
      const stored = getStoredUser();
      if (stored && stored.email) {
        targetEmail = stored.email;
      }
    }
    const query = targetEmail ? `?email=${encodeURIComponent(targetEmail)}` : "";
    const res = await fetch(`${SOCKET_SERVER_URL}/api/dashboard/data${query}`);
    if (!res.ok) throw new Error("Failed to fetch dashboard data");
    return await res.json();
  } catch (err) {
    console.warn("API fetch fallback:", err);
    return null;
  }
};

export const scanAttendanceLive = async (terminal = "Turnstile #02 (Main Entrance)", isCheckOut = false) => {
  try {
    const stored = getStoredUser();
    const userId = stored?.id || 1;
    const res = await fetch(`${SOCKET_SERVER_URL}/api/attendance/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminal, isCheckOut, userId }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Scan attendance API warning:", err);
    return null;
  }
};

export const assignWorkoutLive = async (workoutData) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/workouts/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workoutData),
    });
    return await res.json();
  } catch (err) {
    console.warn("Assign workout API warning:", err);
    return null;
  }
};

export const toggleExerciseLive = async (exerciseId) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/workouts/toggle-exercise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Toggle exercise API warning:", err);
    return null;
  }
};

export const finishWorkoutLive = async (payload) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/workouts/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.warn("Finish workout API warning:", err);
    return null;
  }
};

export const bookSessionLive = async (sessionId, memberName) => {
  try {
    const stored = getStoredUser();
    const resolvedName = memberName || stored?.name || "Member";
    const userId = stored?.id || 1;
    const res = await fetch(`${SOCKET_SERVER_URL}/api/sessions/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, memberName: resolvedName, userId }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Book session API warning:", err);
    return null;
  }
};

export const logNutritionLive = async (nutritionData) => {
  try {
    const stored = getStoredUser();
    const userId = stored?.id || 1;
    const res = await fetch(`${SOCKET_SERVER_URL}/api/nutrition/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nutritionData, userId }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Log nutrition API warning:", err);
    return null;
  }
};

export const processPaymentLive = async (paymentData) => {
  try {
    const stored = getStoredUser();
    const userId = stored?.id || 1;
    const res = await fetch(`${SOCKET_SERVER_URL}/api/membership/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...paymentData, userId }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Process payment API warning:", err);
    return null;
  }
};

export const updateSettingsLive = async (profileData) => {
  try {
    const stored = getStoredUser();
    const userId = profileData.userId || stored?.id || 1;
    const res = await fetch(`${SOCKET_SERVER_URL}/api/settings/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profileData, userId }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Update settings API warning:", err);
    return null;
  }
};

/* =====================================================
   AUTH & TRAINER SELF-SERVICE RESET
===================================================== */
export const loginLive = async (email, password) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Login API error:", err);
    return { success: false, message: "Network connection error." };
  }
};

export const requestTrainerResetLive = async (corporateEmail) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/auth/trainer-reset-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corporateEmail }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Trainer reset request error:", err);
    return { success: false, message: "Network error requesting reset." };
  }
};

export const confirmTrainerResetLive = async (corporateEmail, newPassword) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/auth/trainer-reset-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corporateEmail, newPassword }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Trainer reset confirm error:", err);
    return { success: false, message: "Network error confirming reset." };
  }
};

/* =====================================================
   ADMIN OPERATIONS
===================================================== */
export const fetchAdminOverview = async () => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/admin/overview`);
    return await res.json();
  } catch (err) {
    console.warn("Admin overview error:", err);
    return null;
  }
};

export const fetchAdminTrainers = async () => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/admin/trainers`);
    return await res.json();
  } catch (err) {
    console.warn("Admin trainers error:", err);
    return null;
  }
};

export const createTrainerLive = async (trainerData) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/admin/trainers/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trainerData),
    });
    return await res.json();
  } catch (err) {
    console.warn("Create trainer error:", err);
    return { success: false, message: "Error creating trainer." };
  }
};

export const fetchAdminMembers = async () => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/admin/members`);
    return await res.json();
  } catch (err) {
    console.warn("Admin members error:", err);
    return null;
  }
};

export const assignTrainerLive = async (memberId, trainerId) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/admin/members/assign-trainer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, trainerId }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Assign trainer error:", err);
    return { success: false, message: "Error assigning trainer." };
  }
};

export const fetchMemberQueries = async () => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/admin/queries`);
    return await res.json();
  } catch (err) {
    console.warn("Fetch queries error:", err);
    return null;
  }
};

export const resolveMemberQueryLive = async (queryId, adminNotes, status = "Resolved") => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/admin/queries/${queryId}/resolve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNotes, status }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Resolve query error:", err);
    return { success: false, message: "Error resolving query." };
  }
};

export const createMemberQueryLive = async (queryData) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/queries/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryData),
    });
    return await res.json();
  } catch (err) {
    console.warn("Create member query error:", err);
    return { success: false, message: "Error creating query." };
  }
};

/* =====================================================
   REAL-TIME CHAT (MEMBER <-> TRAINER & ADMIN <-> TRAINER)
===================================================== */
export const fetchChatMessages = async (user1Id, user2Id, channelType = "member_trainer") => {
  try {
    const res = await fetch(
      `${SOCKET_SERVER_URL}/api/chat/messages?user1Id=${user1Id}&user2Id=${user2Id}&channelType=${channelType}`
    );
    return await res.json();
  } catch (err) {
    console.warn("Fetch chat error:", err);
    return null;
  }
};

export const sendChatMessageLive = async (msgData) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msgData),
    });
    return await res.json();
  } catch (err) {
    console.warn("Send chat error:", err);
    return null;
  }
};

/* =====================================================
   TRAINER: FETCH ONLY ASSIGNED TRAINEES & LIVE NUTRITION
===================================================== */
export const fetchTrainerTrainees = async (trainerId = 4) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/trainer/trainees?trainerId=${trainerId}`);
    return await res.json();
  } catch (err) {
    console.warn("Fetch trainer trainees error:", err);
    return null;
  }
};

/* =====================================================
   MEMBER: FETCH CURRENT ASSIGNED COACH
===================================================== */
export const fetchAssignedCoach = async (memberId = 1) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/user/assigned-coach?memberId=${memberId}`);
    return await res.json();
  } catch (err) {
    console.warn("Fetch assigned coach error:", err);
    return null;
  }
};

/* =====================================================
   ATTENDANCE: FETCH FACILITY LEDGER
===================================================== */
export const fetchAttendanceLedger = async () => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/attendance/ledger`);
    return await res.json();
  } catch (err) {
    console.warn("Fetch attendance ledger error:", err);
    return null;
  }
};

/* =====================================================
   AUTH: CHANGE PASSWORD
===================================================== */
export const changePasswordLive = async ({ userId, currentPassword, newPassword }) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Change password error:", err);
    return { success: false, message: "Network error updating password." };
  }
};

/* =====================================================
   MEMBER: SELECT SINGLE MASTER TRAINER
===================================================== */
export const selectTrainerLive = async (memberId, trainerId, paymentInfo = {}) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/member/select-trainer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, trainerId, ...paymentInfo }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Select trainer error:", err);
    return { success: false, message: "Network error assigning coach." };
  }
};

/* =====================================================
   MEMBER: LEAVE CURRENT TRAINER
===================================================== */
export const leaveTrainerLive = async (memberId) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/member/leave-trainer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Leave trainer error:", err);
    return { success: false, message: "Network error releasing coach." };
  }
};

/* =====================================================
   MEMBER: LOG NEW PERSONAL RECORD (PR)
===================================================== */
export const logProgressRecordLive = async (prData) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/member/progress-record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prData),
    });
    return await res.json();
  } catch (err) {
    console.warn("Log PR error:", err);
    return { success: false, message: "Network error logging PR." };
  }
};

/* =====================================================
   BIOMETRICS: FACIAL RECOGNITION API CLIENTS
===================================================== */
export const enrollFaceLive = async ({ userId, faceDescriptor, facePhoto, age = 22, gender = "Male" }) => {
  try {
    const resolvedUserId = userId || getStoredUser()?.id;
    if (!resolvedUserId) {
      return { success: false, message: "User session required to enroll Face ID." };
    }
    const res = await fetch(`${SOCKET_SERVER_URL}/api/user/enroll-face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: resolvedUserId, faceDescriptor, facePhoto, age, gender }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Enroll face error:", err);
    return { success: false, message: "Network error enrolling Face ID." };
  }
};

export const recognizeFaceLive = async ({ faceDescriptor, facePhoto, fallbackUserId, terminal }) => {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/api/attendance/recognize-face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faceDescriptor, facePhoto, fallbackUserId, terminal }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Recognize face error:", err);
    return { success: false, message: "Network error recognizing face biometrics." };
  }
};

export const fetchFaceStatusLive = async (userId) => {
  try {
    const resolvedUserId = userId || getStoredUser()?.id;
    if (!resolvedUserId) return null;
    const res = await fetch(`${SOCKET_SERVER_URL}/api/user/face-status?userId=${resolvedUserId}`);
    return await res.json();
  } catch (err) {
    console.warn("Fetch face status error:", err);
    return null;
  }
};


