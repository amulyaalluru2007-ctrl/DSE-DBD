import { useEffect, useState, useRef } from "react";
import TrainerSidebar3D from "../components/dashboard/TrainerSidebar3D";
import {
  assignWorkoutLive,
  fetchTrainerTrainees,
  fetchChatMessages,
  sendChatMessageLive,
  subscribeRealtime,
} from "../services/realtime";
import "../styles/module-pages.css";
import "../styles/trainer-dashboard.css";

const trainerNav = [
  { id: "section-trainer-dashboard", label: "Dashboard", index: "01", icon: "🏠" },
  { id: "section-trainer-clients", label: "My Clients", index: "02", icon: "👥" },
  { id: "section-trainer-workout-plans", label: "Workout Plans", index: "03", icon: "🏋️" },
  { id: "section-trainer-schedule", label: "Schedule", index: "04", icon: "📅" },
  { id: "section-trainer-progress", label: "Client Progress", index: "05", icon: "📈" },
  { id: "section-trainer-attendance", label: "Attendance", index: "06", icon: "🟠" },
  { id: "section-trainer-nutrition", label: "Nutrition", index: "07", icon: "🥗" },
  { id: "section-trainer-messages", label: "Messages", index: "08", icon: "💬" },
  { id: "section-trainer-performance", label: "Performance", index: "09", icon: "🏆" },
  { id: "section-trainer-exercises", label: "Exercise Library", index: "10", icon: "📚" },
  { id: "section-trainer-notifications", label: "Notifications", index: "11", icon: "🔔" },
  { id: "section-trainer-profile", label: "Trainer Profile", index: "12", icon: "👤" },
];

const initialClients = [
  {
    id: "1",
    dbId: 1,
    name: "Nihal",
    fullName: "Nihal Carter",
    goal: "Build Muscle",
    category: "Muscle Gain",
    height: "180 cm",
    weight: "72.4 kg",
    targetWeight: "75 kg",
    progress: 82,
    streak: 16,
    lastSession: "Today (08:00 AM)",
    attendance: "96%",
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    macros: { calories: 2800, protein: 175, carbs: 320, fat: 70, water: 4.0 },
    prs: { bench: "105 kg (+12.5kg)", squat: "140 kg (+15kg)", deadlift: "180 kg (+20kg)" },
    measurements: { chest: "41.5 in (+1.5)", arms: "15.8 in (+0.8)", waist: "31.0 in (-1.2)", bf: "13.5% (-3.5%)" },
  },
];

const exerciseDatabase = [
  { id: 1, name: "Barbell Incline Bench Press", muscle: "Chest", difficulty: "intermediate", setsReps: "4 sets × 8-10 reps", cues: "Retract scapulae, touch upper chest, drive feet firmly." },
  { id: 2, name: "Weighted Chest Dips", muscle: "Chest", difficulty: "advanced", setsReps: "3 sets × 8-12 reps", cues: "Slight forward torso lean, squeeze lower pecs at peak." },
  { id: 3, name: "Weighted Pull-Ups", muscle: "Back", difficulty: "advanced", setsReps: "4 sets × 6-8 reps", cues: "Drive elbows into back pockets, control 2s eccentric." },
  { id: 4, name: "Chest-Supported T-Bar Row", muscle: "Back", difficulty: "intermediate", setsReps: "4 sets × 10-12 reps", cues: "Neutral spine, retract lats without lower back strain." },
  { id: 5, name: "Barbell Back Squat", muscle: "Legs", difficulty: "advanced", setsReps: "5 sets × 5 reps", cues: "Brace 360 core pressure, knees track over mid-toes." },
  { id: 6, name: "Romanian Deadlift (RDL)", muscle: "Legs", difficulty: "intermediate", setsReps: "3 sets × 10 reps", cues: "Hinge deep at hips, keep bar glued to shins." },
  { id: 7, name: "Seated DB Overhead Press", muscle: "Shoulders", difficulty: "intermediate", setsReps: "4 sets × 8-10 reps", cues: "Keep elbows at 75° scaption plane, lockout overhead." },
  { id: 8, name: "Cable Lateral Raises", muscle: "Shoulders", difficulty: "beginner", setsReps: "4 sets × 15 reps", cues: "Constant tension at bottom, lead with lateral delts." },
  { id: 9, name: "Incline Dumbbell Hammer Curls", muscle: "Arms", difficulty: "beginner", setsReps: "3 sets × 12 reps", cues: "Elbows pinned back, target brachialis & forearm." },
  { id: 10, name: "Overhead Rope Tricep Extension", muscle: "Arms", difficulty: "intermediate", setsReps: "4 sets × 12-15 reps", cues: "Full stretch on long head of triceps, flare rope at lockout." },
  { id: 11, name: "Hanging Leg Raises", muscle: "Core", difficulty: "advanced", setsReps: "3 sets × 15 reps", cues: "Posterior pelvic tilt, curl pelvis up toward ribs." },
  { id: 12, name: "Cable Woodchoppers", muscle: "Core", difficulty: "intermediate", setsReps: "3 sets × 12/side", cues: "Rotate through thoracic spine, keep hips locked." },
];

export default function TrainerDashboardPage() {
  const [activeSection, setActiveSection] = useState("section-trainer-dashboard");
  const [visibleSections, setVisibleSections] = useState(() => new Set(["section-trainer-dashboard"]));
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Client Filter & Selected Client
  const [clients, setClients] = useState(initialClients);
  const [clientCategoryFilter, setClientCategoryFilter] = useState("All");
  const [selectedClientId, setSelectedClientId] = useState("1");
  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0] || initialClients[0];

  // Current Logged-In Trainer (Alex Carter is ID 4 in MySQL)
  const [currentTrainer, setCurrentTrainer] = useState({
    id: 4,
    name: "Alex Carter",
    email: "alex@fitpulse.com",
    role: "Trainer",
  });

  // Live Trainee Nutrition Telemetry (Synchronized with MySQL & Socket.io)
  const [traineeNutrition, setTraineeNutrition] = useState({
    calories: 2450,
    protein: 172,
    carbs: 253,
    fat: 56,
    water: 3.8,
    meals: [
      { id: 1, name: "Breakfast Bowl", title: "Oatmeal with Blueberries & Whey", calories: 520, protein: 42, time: "08:15 AM" },
      { id: 2, name: "Power Lunch", title: "Grilled Chicken Breast, Quinoa & Broccoli", calories: 680, protein: 58, time: "01:30 PM" },
      { id: 3, name: "Pre-Workout Fuel", title: "Banana, Peanut Butter & Rice Cake", calories: 340, protein: 12, time: "04:45 PM" },
      { id: 4, name: "Post-Workout Shake", title: "Hydro Whey Shake & Creatine", calories: 280, protein: 35, time: "06:40 PM" },
      { id: 5, name: "Dinner", title: "Grilled Salmon, Steamed Asparagus & Sweet Potato", calories: 620, protein: 48, time: "08:45 PM" },
    ],
  });

  // Workout Builder State
  const [builderTargetClient, setBuilderTargetClient] = useState("1");
  const [builderPlanName, setBuilderPlanName] = useState("Hypertrophy Push Block A");
  const [builderDaysPerWeek, setBuilderDaysPerWeek] = useState(4);
  const [builderExercises, setBuilderExercises] = useState([
    { id: 1, name: "Barbell Incline Bench Press", sets: 4, reps: "8-10", weight: "85 kg", rest: "90s" },
    { id: 2, name: "Weighted Chest Dips", sets: 3, reps: "10-12", weight: "+15 kg", rest: "75s" },
    { id: 3, name: "Seated DB Overhead Press", sets: 4, reps: "10", weight: "28 kg", rest: "60s" },
    { id: 4, name: "Cable Lateral Raises", sets: 4, reps: "15", weight: "12 kg", rest: "45s" },
  ]);
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState("3");
  const [newExReps, setNewExReps] = useState("12");
  const [newExWeight, setNewExWeight] = useState("20 kg");
  const [planAssignedAlert, setPlanAssignedAlert] = useState("");

  // Schedule timeline state
  const [scheduleDateFilter, setScheduleDateFilter] = useState("Today");
  const [scheduleSlots, setScheduleSlots] = useState([
    { time: "06:00 AM", title: "Gym Floor Protocol & Opening Duty", client: "Facility", type: "duty", status: "Completed" },
    { time: "08:00 AM", title: "PT: Hypertrophy Chest & Delts", client: "Nihal", type: "pt", status: "Completed" },
    { time: "10:00 AM", title: "PT: Biomechanics Review", client: "Nihal", type: "pt", status: "Completed" },
    { time: "12:00 PM", title: "Open PT Walk-in Consultation", client: "Open Slot", type: "open", status: "Available" },
    { time: "02:00 PM", title: "Strength Assessment & Video Feedback", client: "Nihal", type: "assessment", status: "Upcoming" },
    { time: "04:00 PM", title: "Open Consultation Slot", client: "Open Slot", type: "open", status: "Available" },
    { time: "05:00 PM", title: "Floor Conditioning Session", client: "Facility", type: "duty", status: "Upcoming" },
    { time: "07:00 PM", title: "Duty Wrap-up & Tomorrow Programming", client: "Facility", type: "duty", status: "Upcoming" },
  ]);

  // Attendance Module State
  const [attendanceTab, setAttendanceTab] = useState("clients"); // 'clients' | 'duty'
  const [clientAttendanceState, setClientAttendanceState] = useState({
    "1": "present",
    nihal: "present",
  });
  const [trainerClockedIn, setTrainerClockedIn] = useState(true);

  // Messages State
  const [activeChatClientId, setActiveChatClientId] = useState("1");
  const [chatMessages, setChatMessages] = useState({
    "1": [
      { id: 1, sender: "Nihal", text: "Coach, hit 100kg bench today on the 3rd set! Felt super clean.", time: "09:15 AM", isMe: false },
      { id: 2, sender: "Alex Carter", text: "Outstanding work Nihal! That's a 12.5kg jump over 6 weeks. Scapular retraction stayed locked?", time: "09:18 AM", isMe: true },
      { id: 3, sender: "Nihal", text: "Yes! Kept elbows at 70 degrees and feet glued like you demonstrated.", time: "09:20 AM", isMe: false },
      { id: 4, sender: "Alex Carter", text: "Proud of you. Keep hitting 175g protein today, take 5g creatine, and get 8 hrs sleep.", time: "09:22 AM", isMe: true },
    ],
    nihal: [
      { id: 1, sender: "Nihal", text: "Coach, hit 100kg bench today on the 3rd set! Felt super clean.", time: "09:15 AM", isMe: false },
      { id: 2, sender: "Alex Carter", text: "Outstanding work Nihal! That's a 12.5kg jump over 6 weeks. Scapular retraction stayed locked?", time: "09:18 AM", isMe: true },
      { id: 3, sender: "Nihal", text: "Yes! Kept elbows at 70 degrees and feet glued like you demonstrated.", time: "09:20 AM", isMe: false },
      { id: 4, sender: "Alex Carter", text: "Proud of you. Keep hitting 175g protein today, take 5g creatine, and get 8 hrs sleep.", time: "09:22 AM", isMe: true },
    ],
  });
  const [chatInputText, setChatInputText] = useState("");

  // Exercise Library filter
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState("All");

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, type: "milestone", title: "Personal Record Smashed", body: "Nihal hit 100kg Bench Press (1RM estimated at 105kg).", time: "2 hours ago", unread: true },
    { id: 2, type: "client", title: "New Client Assigned", body: "Rahul Sharma assigned to your roster by Gym Management.", time: "4 hours ago", unread: true },
    { id: 3, type: "alert", title: "Attendance Notice", body: "Arjun Reddy flagged absent for morning conditioning session.", time: "Yesterday", unread: false },
    { id: 4, type: "plan", title: "4-Week Cycle Expiring", body: "Sneha Rao's Phase 1 mobility program ends this Sunday.", time: "2 days ago", unread: false },
  ]);

  // Stagger & In-view Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSections((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              next.add(entry.target.id);
            } else {
              next.delete(entry.target.id);
            }
          });
          return next;
        });
      },
      { threshold: 0.05 }
    );

    trainerNav.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Frame Scrubbing Progress Tracker
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const total = document.documentElement.scrollHeight - window.innerHeight;
          if (total > 0) {
            setScrollProgress(window.scrollY / total);
          }

          // Active section detect
          const midScreen = window.scrollY + window.innerHeight * 0.35;
          for (let i = trainerNav.length - 1; i >= 0; i -= 1) {
            const el = document.getElementById(trainerNav[i].id);
            if (el && el.offsetTop <= midScreen) {
              setActiveSection(trainerNav[i].id);
              break;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load backend assigned trainees, chat messages, and subscribe to live Socket.io events
  useEffect(() => {
    let activeTrainerId = 4;
    try {
      const stored = localStorage.getItem("fitpulse_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === "Trainer") {
          setCurrentTrainer(parsed);
          activeTrainerId = parsed.id || 4;
        }
      }
    } catch {
      /* ignore */
    }

    // Role & Trainee Isolation: Fetch ONLY assigned trainees from MySQL
    fetchTrainerTrainees(activeTrainerId).then((res) => {
      if (res && res.success && res.trainees && res.trainees.length > 0) {
        const mapped = res.trainees.map((t) => ({
          id: String(t.id),
          dbId: t.id,
          name: t.name.split(" ")[0],
          fullName: t.name,
          email: t.email,
          phone: t.phone,
          goal: t.goal || "Build Muscle",
          category: "Muscle Gain",
          height: `${t.height || 180} cm`,
          weight: `${t.weight || 72.4} kg`,
          targetWeight: "75 kg",
          progress: t.attendanceVisits ? Math.min(Math.round((t.attendanceVisits / 24) * 100), 100) : 0,
          streak: t.streakDays ?? 0,
          lastSession: t.attendanceVisits > 0 ? "Recent Session" : "None Yet",
          attendance: `${t.attendanceVisits ?? 0} visits`,
          status: "Active",
          avatar: t.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
          macros: {
            calories: t.nutritionToday?.totalCalories ?? 0,
            protein: t.nutritionToday?.totalProtein ?? 0,
            carbs: t.nutritionToday?.totalCarbs ?? 0,
            fat: t.nutritionToday?.totalFats ?? 0,
            water: 0.0,
          },
          prs: t.prs || { bench: "-- kg", squat: "-- kg", deadlift: "-- kg" },
          measurements: { chest: "--", arms: "--", waist: "--", bf: "--" },
        }));

        setClients(mapped);
        setSelectedClientId(mapped[0].id);
        setActiveChatClientId(mapped[0].id);

        if (res.trainees[0]?.nutritionToday) {
          const nt = res.trainees[0].nutritionToday;
          setTraineeNutrition({
            calories: nt.totalCalories || 2450,
            protein: nt.totalProtein || 172,
            carbs: nt.totalCarbs || 253,
            fat: nt.totalFats || 56,
            water: 3.8,
            meals: (nt.meals || []).map((m) => ({
              id: m.id,
              name: m.mealName,
              title: m.mealName,
              calories: m.calories,
              protein: m.protein,
              time: m.timeLogged || "Today",
            })),
          });
        }
      }
    });

    // Fetch initial chat messages with Nihal Carter (ID 1)
    fetchChatMessages(activeTrainerId, 1, "member_trainer").then((res) => {
      if (res && res.success && res.messages && res.messages.length > 0) {
        const mappedMsgs = res.messages.map((m) => {
          const isMe = Number(m.sender_id || m.senderId) === Number(activeTrainerId);
          const tDate = m.created_at || m.createdAt;
          const timeStr = tDate && !isNaN(new Date(tDate).getTime())
            ? new Date(tDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Just now";
          return {
            id: m.id,
            sender: isMe ? "Alex Carter" : "Nihal",
            text: m.message,
            time: timeStr,
            isMe,
          };
        });
        setChatMessages((prev) => ({
          ...prev,
          "1": mappedMsgs,
          nihal: mappedMsgs,
        }));
      }
    });

    // Real-time Chat Socket Listener (STRICT ISOLATION)
    const unsubChat = subscribeRealtime("chat:message", (data) => {
      if (data.channel_type === "member_trainer" || data.channelType === "member_trainer") {
        const sId = Number(data.sender_id || data.senderId);
        const rId = Number(data.receiver_id || data.receiverId);
        const myTrainerId = Number(activeTrainerId);

        // STRICT ISOLATION: Drop if this trainer is neither sender nor receiver!
        if (sId !== myTrainerId && rId !== myTrainerId) {
          return;
        }

        const isMe = sId === myTrainerId;
        const traineeId = isMe ? rId : sId;
        const traineeKey = String(traineeId);

        const tDate = data.created_at || data.createdAt;
        const timeStr =
          tDate && !isNaN(new Date(tDate).getTime())
            ? new Date(tDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Just now";

        const newBubble = {
          id: data.id || Date.now(),
          sender: isMe ? (currentTrainer?.name || "Alex Carter") : (data.sender_name || "Trainee"),
          text: data.message,
          time: timeStr,
          isMe,
        };

        setChatMessages((prev) => {
          const list = prev[traineeKey] || prev["1"] || [];
          if (list.some((m) => m.id === newBubble.id)) return prev;
          return {
            ...prev,
            [traineeKey]: [...list, newBubble],
            "1": traineeId === 1 ? [...list, newBubble] : (prev["1"] || []),
          };
        });
      }
    });

    // Real-time Nutrition Telemetry Socket Listener
    const unsubNutrition = subscribeRealtime("nutrition:logged", (data) => {
      setTraineeNutrition((prev) => ({
        ...prev,
        calories: (prev.calories || 2450) + (data.caloriesAdded || 300),
        protein: (prev.protein || 172) + (data.proteinAdded || 25),
        meals: [
          {
            id: Date.now(),
            name: data.mealType || "Logged Intake",
            title: data.foodName || "Nutrient Log",
            calories: data.caloriesAdded || 300,
            protein: data.proteinAdded || 25,
            time: "Just now",
          },
          ...prev.meals,
        ],
      }));
    });

    // Real-time Member Body Metrics & Fitness Preferences Listener
    const unsubPrefs = subscribeRealtime("member:preferences-updated", (data) => {
      setClients((prev) =>
        prev.map((c) =>
          Number(c.dbId || c.id) === Number(data.memberId)
            ? {
                ...c,
                height: data.height ? `${data.height} cm` : c.height,
                weight: data.weight ? `${data.weight} kg` : c.weight,
                goal: data.goal || c.goal,
                avatar: data.avatar || c.avatar,
              }
            : c
        )
      );
    });

    // Real-time Physical Development: Personal Records (PRs)
    const unsubProgress = subscribeRealtime("progress:updated", (data) => {
      if (data.newPr && data.memberId) {
        setClients((prev) =>
          prev.map((c) => {
            if (Number(c.dbId || c.id) === Number(data.memberId)) {
              const lift = (data.newPr.liftName || "").toLowerCase();
              const newPrs = { ...c.prs };
              const diff = (data.newPr.weightKg - data.newPr.previousWeightKg).toFixed(1);
              const badge = diff > 0 ? `+${diff}kg` : "+5kg";

              if (lift.includes("bench")) {
                newPrs.bench = `${data.newPr.weightKg} kg (${badge})`;
              } else if (lift.includes("squat")) {
                newPrs.squat = `${data.newPr.weightKg} kg (${badge})`;
              } else if (lift.includes("deadlift")) {
                newPrs.deadlift = `${data.newPr.weightKg} kg (${badge})`;
              }

              return {
                ...c,
                prs: newPrs,
              };
            }
            return c;
          })
        );
      }
    });

    // Real-time Attendance Check-in
    const unsubAttendance = subscribeRealtime("attendance:scanned", (data) => {
      setClients((prev) =>
        prev.map((c) =>
          Number(c.dbId || c.id) === Number(data.userId)
            ? { ...c, attendance: `${data.monthlyCount || 19} visits`, streak: data.streakDays || 7 }
            : c
        )
      );
    });

    // Real-time Trainee Assigned / Switched
    const unsubAssigned = subscribeRealtime("trainee:assigned", (data) => {
      fetchTrainerTrainees(activeTrainerId).then((res) => {
        if (res && res.success && res.trainees) {
          const mapped = res.trainees.map((t) => ({
            id: String(t.id),
            dbId: t.id,
            name: t.name.split(" ")[0],
            fullName: t.name,
            email: t.email,
            phone: t.phone,
            goal: t.goal || "Build Muscle",
            category: "Muscle Gain",
            height: `${t.height || 180} cm`,
            weight: `${t.weight || 72.4} kg`,
            targetWeight: "75 kg",
            progress: t.attendanceVisits ? Math.min(Math.round((t.attendanceVisits / 24) * 100), 100) : 0,
            streak: t.streakDays ?? 0,
            lastSession: t.attendanceVisits > 0 ? "Recent Session" : "None Yet",
            attendance: `${t.attendanceVisits ?? 0} visits`,
            status: "Active",
            avatar: t.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
            macros: {
              calories: t.nutritionToday?.totalCalories ?? 0,
              protein: t.nutritionToday?.totalProtein ?? 0,
              carbs: t.nutritionToday?.totalCarbs ?? 0,
              fat: t.nutritionToday?.totalFats ?? 0,
              water: 0.0,
            },
            prs: t.prs || { bench: "-- kg", squat: "-- kg", deadlift: "-- kg" },
            measurements: { chest: "--", arms: "--", waist: "--", bf: "--" },
          }));
          setClients(mapped);
          if (mapped.length > 0) {
            setSelectedClientId(mapped[0].id);
            setActiveChatClientId(mapped[0].id);
          }
        }
      });
    });

    // Real-time Trainee Released
    const unsubReleased = subscribeRealtime("trainee:released", () => {
      fetchTrainerTrainees(activeTrainerId).then((res) => {
        if (res && res.success && res.trainees) {
          const mapped = res.trainees.map((t) => ({
            id: String(t.id),
            dbId: t.id,
            name: t.name.split(" ")[0],
            fullName: t.name,
            email: t.email,
            phone: t.phone,
            goal: t.goal || "Build Muscle",
            category: "Muscle Gain",
            height: `${t.height || 180} cm`,
            weight: `${t.weight || 72.4} kg`,
            targetWeight: "75 kg",
            progress: t.attendanceVisits ? Math.min(Math.round((t.attendanceVisits / 24) * 100), 100) : 0,
            streak: t.streakDays ?? 0,
            lastSession: t.attendanceVisits > 0 ? "Recent Session" : "None Yet",
            attendance: `${t.attendanceVisits ?? 0} visits`,
            status: "Active",
            avatar: t.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
            macros: {
              calories: t.nutritionToday?.totalCalories ?? 0,
              protein: t.nutritionToday?.totalProtein ?? 0,
              carbs: t.nutritionToday?.totalCarbs ?? 0,
              fat: t.nutritionToday?.totalFats ?? 0,
              water: 0.0,
            },
            prs: t.prs || { bench: "-- kg", squat: "-- kg", deadlift: "-- kg" },
            measurements: { chest: "--", arms: "--", waist: "--", bf: "--" },
          }));
          setClients(mapped);
        }
      });
    });

    return () => {
      if (unsubChat) unsubChat();
      if (unsubNutrition) unsubNutrition();
      if (unsubPrefs) unsubPrefs();
      if (unsubProgress) unsubProgress();
      if (unsubAttendance) unsubAttendance();
      if (unsubAssigned) unsubAssigned();
      if (unsubReleased) unsubReleased();
    };
  }, []);

  // Load chat messages when activeChatClientId changes
  useEffect(() => {
    const trainerId = currentTrainer?.id || 4;
    const targetClient = clients.find((c) => c.id === activeChatClientId);
    const targetDbId = targetClient?.dbId || targetClient?.id || Number(activeChatClientId) || 1;

    fetchChatMessages(trainerId, targetDbId, "member_trainer").then((res) => {
      if (res && res.success && res.messages) {
        const mappedMsgs = res.messages.map((m) => {
          const isMe = Number(m.sender_id || m.senderId) === Number(trainerId);
          const tDate = m.created_at || m.createdAt;
          const timeStr =
            tDate && !isNaN(new Date(tDate).getTime())
              ? new Date(tDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Just now";
          return {
            id: m.id,
            sender: isMe ? (currentTrainer?.name || "Alex Carter") : (m.sender_name || "Trainee"),
            text: m.message,
            time: timeStr,
            isMe,
          };
        });
        setChatMessages((prev) => ({
          ...prev,
          [String(targetDbId)]: mappedMsgs,
          [String(activeChatClientId)]: mappedMsgs,
        }));
      }
    });
  }, [activeChatClientId, currentTrainer.id, clients]);

  const scrollToModule = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim()) return;

    const targetClient = clients.find((c) => c.id === activeChatClientId) || selectedClient;
    const targetDbId = Number(targetClient?.dbId || targetClient?.id || activeChatClientId || 1);

    const text = chatInputText.trim();
    setChatInputText("");

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg = {
      id: Date.now(),
      sender: currentTrainer.name || "Alex Carter",
      text: text,
      time: timeStr,
      isMe: true,
    };

    setChatMessages((prev) => ({
      ...prev,
      [String(targetDbId)]: [...(prev[String(targetDbId)] || []), newMsg],
      [String(activeChatClientId)]: [...(prev[String(activeChatClientId)] || []), newMsg],
    }));

    // Broadcast across Socket.io & save to MySQL
    try {
      await sendChatMessageLive({
        sender_id: currentTrainer.id || 4,
        sender_name: currentTrainer.name || "Alex Carter",
        sender_role: "Trainer",
        receiver_id: targetDbId,
        receiver_name: targetClient?.fullName || targetClient?.name || "Nihal Carter",
        channel_type: "member_trainer",
        message: text,
      });
    } catch (err) {
      console.warn("Send message error:", err);
    }
  };

  const handleAddExerciseToBuilder = (e) => {
    e?.preventDefault?.();
    if (!newExName.trim()) return;

    const newEx = {
      id: Date.now(),
      name: newExName.trim(),
      sets: parseInt(newExSets, 10) || 3,
      reps: newExReps || "10",
      weight: newExWeight || "BW",
      rest: "60s",
    };

    setBuilderExercises((prev) => [...prev, newEx]);
    setNewExName("");
  };

  const handleAssignPlan = async () => {
    const target = initialClients.find((c) => c.id === builderTargetClient)?.name || "Client";
    setPlanAssignedAlert(`Routine "${builderPlanName}" (${builderExercises.length} exercises) successfully assigned to ${target}!`);
    setTimeout(() => setPlanAssignedAlert(""), 4500);

    // Broadcast live to member dashboard and MySQL database
    try {
      await assignWorkoutLive({
        userId: 1,
        title: builderPlanName,
        phase: "Phase II",
        exercises: builderExercises.map((e) => ({
          name: e.name,
          target: "Hypertrophy",
          sets: `${e.sets} sets`,
          reps: `${e.reps} reps`,
          weight: e.weight || "30 kg",
        })),
        trainerName: "Coach Alex Carter",
      });
    } catch {
      /* ignore */
    }
  };

  const toggleClientAttendance = (clientId) => {
    setClientAttendanceState((prev) => ({
      ...prev,
      [clientId]: prev[clientId] === "present" ? "absent" : "present",
    }));
  };

  const filteredClients = clients.filter((c) => {
    const matchesCat = clientCategoryFilter === "All" || c.category === clientCategoryFilter;
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.goal.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredExercises = exerciseDatabase.filter((ex) => {
    const matchesMuscle = exerciseMuscleFilter === "All" || ex.muscle === exerciseMuscleFilter;
    const matchesSearch = !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || ex.muscle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  return (
    <div className="trainer-dashboard-container">
      {/* Subtle Atmospheric Gym Background (Opacity 0.16, dark masked) */}
      <img
        src="/assets/auth-gym-clean-bg.jpg"
        alt="FitPulse Luxury Campus"
        className="module-page-bg"
      />
      <div className="module-page-vignette" />

      {/* 3D Glassmorphic Sidebar Dock matching Navbar GUI */}
      <TrainerSidebar3D
        activeSection={activeSection}
        onSelectModule={scrollToModule}
      />

      {/* =========================================================
          MAIN SCROLL CONTENT CONTAINER
          ========================================================= */}
      <main className="trainer-main-scroll">
        {/* Top telemetry bar with search and quick actions */}
        <header className="trainer-topbar">
          <div className="trainer-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="trainer-search-input"
              placeholder="Search clients, exercises, workouts, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="trainer-topbar-actions">
            <button className="trainer-quick-btn" onClick={() => scrollToModule("section-trainer-workout-plans")}>
              + Create Routine
            </button>
            <button className="trainer-quick-btn" onClick={() => scrollToModule("section-trainer-attendance")}>
              + Log Attendance
            </button>
          </div>
        </header>

        {/* =========================================================
            01. 🏠 DASHBOARD (COMMAND CENTER)
            ========================================================= */}
        <section
          id="section-trainer-dashboard"
          className={`trainer-module-section ${visibleSections.has("section-trainer-dashboard") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  COACHING COMMAND CENTER • {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </div>
                <h1 style={{ margin: "6px 0 8px 0", fontSize: "2rem", fontWeight: 900, color: "#ffffff" }}>
                  Good morning, Coach Alex Carter
                </h1>
                <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.92rem", maxWidth: 640 }}>
                  You have 6 PT sessions scheduled today. Nihal crushed his 100kg Bench PR, and 3 client training programs are ready for review.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span className="dash-hud-pill trainer-hud-pill" style={{ position: "static" }}>
                  <span className="dash-hud-dot" /> GYM FLOOR ACTIVE
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="trainer-quick-actions-bar">
              <button className="trainer-quick-btn" onClick={() => scrollToModule("section-trainer-clients")}>
                👥 View Assigned Clients
              </button>
              <button className="trainer-quick-btn" onClick={() => scrollToModule("section-trainer-workout-plans")}>
                🏋️ Assign Workout Plan
              </button>
              <button className="trainer-quick-btn" onClick={() => scrollToModule("section-trainer-schedule")}>
                📅 Today's Schedule (6 Sessions)
              </button>
              <button className="trainer-quick-btn" onClick={() => scrollToModule("section-trainer-messages")}>
                💬 Message Nihal
              </button>
            </div>
          </div>

          {/* 4 Stat Tiles */}
          <div className="trainer-stats-grid">
            <div className="trainer-stat-tile">
              <div className="trainer-stat-header">
                <span className="trainer-stat-label">ACTIVE CLIENTS</span>
                <span className="trainer-stat-badge">ROSTER</span>
              </div>
              <div className="trainer-stat-value">18</div>
              <div className="trainer-stat-sub">5 with sessions today • 100% capacity</div>
            </div>

            <div className="trainer-stat-tile">
              <div className="trainer-stat-header">
                <span className="trainer-stat-label">TODAY'S SESSIONS</span>
                <span className="trainer-stat-badge highlight">6 TOTAL</span>
              </div>
              <div className="trainer-stat-value">6</div>
              <div className="trainer-stat-sub">3 Completed • 3 Remaining</div>
            </div>

            <div className="trainer-stat-tile">
              <div className="trainer-stat-header">
                <span className="trainer-stat-label">ATTENDANCE RATE</span>
                <span className="trainer-stat-badge">MONTHLY</span>
              </div>
              <div className="trainer-stat-value">92%</div>
              <div className="trainer-stat-sub">+4% higher than gym target</div>
            </div>

            <div className="trainer-stat-tile">
              <div className="trainer-stat-header">
                <span className="trainer-stat-label">PLANS TO REVIEW</span>
                <span className="trainer-stat-badge">ACTION</span>
              </div>
              <div className="trainer-stat-value">3</div>
              <div className="trainer-stat-sub">Nihal, Arjun & Sneha phase updates</div>
            </div>
          </div>

          {/* Today's Schedule Preview & Realtime Alerts Split Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }}>
            {/* Schedule Preview */}
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Today's Coaching Schedule</h3>
                <button className="trainer-portal-switch-btn" onClick={() => scrollToModule("section-trainer-schedule")}>
                  Full Schedule →
                </button>
              </div>
              <div className="trainer-timeline-list">
                <div className="trainer-timeline-item">
                  <div className="trainer-timeline-time">08:00 AM</div>
                  <div className="trainer-timeline-client">
                    Nihal <span style={{ fontSize: "0.78rem", color: "var(--tp-cyan)" }}>• Hypertrophy Push</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: 4, background: "rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 700 }}>
                    COMPLETED
                  </span>
                </div>

                <div className="trainer-timeline-item">
                  <div className="trainer-timeline-time">10:00 AM</div>
                  <div className="trainer-timeline-client">
                    Priya Patel <span style={{ fontSize: "0.78rem", color: "var(--tp-cyan)" }}>• HIIT & Glutes</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: 4, background: "rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 700 }}>
                    COMPLETED
                  </span>
                </div>

                <div className="trainer-timeline-item" style={{ borderLeftColor: "#f59e0b" }}>
                  <div className="trainer-timeline-time">02:00 PM</div>
                  <div className="trainer-timeline-client">
                    Rahul Sharma <span style={{ fontSize: "0.78rem", color: "#f59e0b" }}>• Form Biomechanics</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: 4, background: "rgba(245,158,11,0.2)", color: "#f59e0b", fontWeight: 700 }}>
                    NEXT UP
                  </span>
                </div>

                <div className="trainer-timeline-item">
                  <div className="trainer-timeline-time">05:00 PM</div>
                  <div className="trainer-timeline-client">
                    Arjun Reddy <span style={{ fontSize: "0.78rem", color: "var(--tp-cyan)" }}>• Conditioning</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "#94a3b8", fontWeight: 700 }}>
                    SCHEDULED
                  </span>
                </div>
              </div>
            </div>

            {/* Coaching Progress Alerts */}
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Coaching Alerts & Milestones</h3>
                <button className="trainer-portal-switch-btn" onClick={() => scrollToModule("section-trainer-notifications")}>
                  View All
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="trainer-alert-item highlight">
                  <span style={{ fontSize: "1.2rem" }}>🔥</span>
                  <div>
                    <div style={{ fontWeight: 800, color: "#ffffff" }}>Nihal benched 100 kg!</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)" }}>+12.5kg PR breakthrough in 6-week cycle</div>
                  </div>
                </div>

                <div className="trainer-alert-item">
                  <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 800, color: "#ffffff" }}>Arjun missed workout check-in</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)" }}>2 consecutive days without logged nutrition</div>
                  </div>
                </div>

                <div className="trainer-alert-item">
                  <span style={{ fontSize: "1.2rem" }}>📋</span>
                  <div>
                    <div style={{ fontWeight: 800, color: "#ffffff" }}>Sneha's Phase 1 ends in 2 days</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)" }}>Schedule movement re-assessment test</div>
                  </div>
                </div>

                <div className="trainer-alert-item">
                  <span style={{ fontSize: "1.2rem" }}>🥗</span>
                  <div>
                    <div style={{ fontWeight: 800, color: "#ffffff" }}>Priya requested carb cycle update</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)" }}>Pending macro prescription confirmation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            02. 👥 MY CLIENTS (THE FLAGSHIP MODULE)
            ========================================================= */}
        <section
          id="section-trainer-clients"
          className={`trainer-module-section ${visibleSections.has("section-trainer-clients") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 02 • CLIENT ROSTER</div>
                <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>My Assigned Clients ({filteredClients.length})</h2>
                <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
                  Manage individual goals, transformation velocity, programs, and direct coaching interventions.
                </p>
              </div>

              {/* Category Filter Tabs */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["All", "Muscle Gain", "Strength", "Fat Loss", "Conditioning", "Mobility"].map((cat) => (
                  <button
                    key={cat}
                    className={`trainer-att-tab-btn ${clientCategoryFilter === cat ? "active" : ""}`}
                    onClick={() => setClientCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Client Cards Grid */}
          <div className="trainer-clients-grid">
            {filteredClients.map((client) => (
              <div key={client.id} className="trainer-client-card">
                <div>
                  <div className="trainer-client-header">
                    <img src={client.avatar} alt={client.name} className="trainer-client-avatar" />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 className="trainer-client-name">{client.name}</h4>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "rgba(0,180,255,0.15)", color: "var(--tp-cyan)", border: "1px solid rgba(0,180,255,0.3)" }}>
                          {client.status}
                        </span>
                      </div>
                      <div className="trainer-client-goal">Goal: {client.goal}</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--tp-text-muted)", marginTop: 2 }}>
                        Last Session: {client.lastSession}
                      </div>
                    </div>
                  </div>

                  {/* 4 Stat Readouts */}
                  <div className="trainer-client-stats-row" style={{ marginTop: 14 }}>
                    <div>
                      <div className="trainer-client-stat-val">{client.weight}</div>
                      <div className="trainer-client-stat-lbl">WEIGHT</div>
                    </div>
                    <div>
                      <div className="trainer-client-stat-val" style={{ color: "var(--tp-cyan)" }}>{client.progress}%</div>
                      <div className="trainer-client-stat-lbl">PROGRESS</div>
                    </div>
                    <div>
                      <div className="trainer-client-stat-val" style={{ color: "#f59e0b" }}>{client.streak}d</div>
                      <div className="trainer-client-stat-lbl">STREAK</div>
                    </div>
                    <div>
                      <div className="trainer-client-stat-val" style={{ color: "#10b981" }}>{client.attendance}</div>
                      <div className="trainer-client-stat-lbl">ATTENDANCE</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--tp-text-muted)", marginBottom: 4 }}>
                      <span>Target: {client.targetWeight}</span>
                      <span>{client.progress}% Completed</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${client.progress}%`, height: "100%", background: "linear-gradient(90deg, #0084ff, #00d2ff)" }} />
                    </div>
                  </div>
                </div>

                {/* 6 Actions: View Profile, View Progress, Assign Workout, View Attendance, Create Plan, Message */}
                <div className="trainer-client-actions">
                  <button
                    className="trainer-client-action-btn primary"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setBuilderTargetClient(client.id);
                      scrollToModule("section-trainer-workout-plans");
                    }}
                  >
                    Assign Workout
                  </button>
                  <button
                    className="trainer-client-action-btn"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      scrollToModule("section-trainer-progress");
                    }}
                  >
                    Progress
                  </button>
                  <button
                    className="trainer-client-action-btn"
                    onClick={() => {
                      setActiveChatClientId(client.id);
                      scrollToModule("section-trainer-messages");
                    }}
                  >
                    Message
                  </button>
                  <button
                    className="trainer-client-action-btn"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      scrollToModule("section-trainer-nutrition");
                    }}
                  >
                    Nutrition
                  </button>
                  <button
                    className="trainer-client-action-btn"
                    onClick={() => {
                      scrollToModule("section-trainer-attendance");
                    }}
                  >
                    Attendance
                  </button>
                  <button
                    className="trainer-client-action-btn"
                    onClick={() => {
                      alert(`Client Details: ${client.fullName}\nEmail: ${client.id}@fitpulse.com\nAssigned Coach: Alex Carter\nGoal: ${client.goal}`);
                    }}
                  >
                    Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            03. 🏋️ WORKOUT PLANS (INTERACTIVE BUILDER)
            ========================================================= */}
        <section
          id="section-trainer-workout-plans"
          className={`trainer-module-section ${visibleSections.has("section-trainer-workout-plans") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 03 • PROGRAMMING & PERIODIZATION</div>
            <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Workout Plan Builder</h2>
            <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
              Select client → pick movements → configure sets, reps, load & rest intervals → assign to client's dashboard.
            </p>
          </div>

          {planAssignedAlert && (
            <div style={{ padding: "14px 20px", borderRadius: 12, background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", color: "#34d399", fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span>✓</span> {planAssignedAlert}
            </div>
          )}

          <div className="trainer-builder-grid">
            {/* Left: Active Builder */}
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Routine Protocol Editor</h3>
                <span className="dash-hud-pill trainer-hud-pill" style={{ position: "static" }}>
                  {builderExercises.length} Movements Configured
                </span>
              </div>

              <div className="trainer-builder-form">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 14 }}>
                  <div className="trainer-form-group">
                    <label>ASSIGN TO CLIENT</label>
                    <select
                      className="trainer-form-select"
                      value={builderTargetClient}
                      onChange={(e) => setBuilderTargetClient(e.target.value)}
                    >
                      {initialClients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.goal})</option>
                      ))}
                    </select>
                  </div>

                  <div className="trainer-form-group">
                    <label>ROUTINE TITLE</label>
                    <input
                      type="text"
                      className="trainer-form-input"
                      value={builderPlanName}
                      onChange={(e) => setBuilderPlanName(e.target.value)}
                    />
                  </div>

                  <div className="trainer-form-group">
                    <label>DAYS / WK</label>
                    <select
                      className="trainer-form-select"
                      value={builderDaysPerWeek}
                      onChange={(e) => setBuilderDaysPerWeek(Number(e.target.value))}
                    >
                      <option value={3}>3 Days</option>
                      <option value={4}>4 Days</option>
                      <option value={5}>5 Days</option>
                      <option value={6}>6 Days</option>
                    </select>
                  </div>
                </div>

                {/* Table of Exercises in this Plan */}
                <table className="trainer-exercise-table">
                  <thead>
                    <tr>
                      <th>EXERCISE</th>
                      <th>SETS</th>
                      <th>REPS</th>
                      <th>LOAD</th>
                      <th>REST</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {builderExercises.map((ex, idx) => (
                      <tr key={ex.id || idx}>
                        <td style={{ fontWeight: 700, color: "#ffffff" }}>{ex.name}</td>
                        <td>{ex.sets}</td>
                        <td>{ex.reps}</td>
                        <td style={{ color: "var(--tp-cyan)", fontWeight: 700 }}>{ex.weight}</td>
                        <td>{ex.rest}</td>
                        <td>
                          <button
                            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontWeight: 700 }}
                            onClick={() => setBuilderExercises(builderExercises.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add Exercise Row */}
                <div style={{ marginTop: 14, padding: 14, background: "rgba(18,26,44,0.5)", borderRadius: 10, border: "1px dashed rgba(0,180,255,0.3)" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--tp-cyan)", marginBottom: 8 }}>+ QUICK ADD EXERCISE</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 70px 90px 100px auto", gap: 10 }}>
                    <input
                      type="text"
                      className="trainer-form-input"
                      placeholder="e.g. Dumbbell Incline Press"
                      value={newExName}
                      onChange={(e) => setNewExName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="trainer-form-input"
                      placeholder="Sets"
                      value={newExSets}
                      onChange={(e) => setNewExSets(e.target.value)}
                    />
                    <input
                      type="text"
                      className="trainer-form-input"
                      placeholder="Reps"
                      value={newExReps}
                      onChange={(e) => setNewExReps(e.target.value)}
                    />
                    <input
                      type="text"
                      className="trainer-form-input"
                      placeholder="Weight"
                      value={newExWeight}
                      onChange={(e) => setNewExWeight(e.target.value)}
                    />
                    <button className="trainer-quick-btn" onClick={handleAddExerciseToBuilder}>
                      Add
                    </button>
                  </div>
                </div>

                <button className="trainer-btn-assign" onClick={handleAssignPlan}>
                  ⚡ ASSIGN ROUTINE TO CLIENT DASHBOARD
                </button>
              </div>
            </div>

            {/* Right: Master Template Library */}
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Coach Master Templates</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)" }}>1-Click Load</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    title: "Push/Pull/Legs Hypertrophy",
                    split: "6-Day Split • Volume Focus",
                    exs: ["Incline BB Bench", "Weighted Dips", "Overhead Press", "Lateral Raises"],
                  },
                  {
                    title: "Strength 5x5 Peaking Protocol",
                    split: "3-Day Split • Heavy Compound Focus",
                    exs: ["Squat 5x5", "Bench Press 5x5", "Deadlift 1x5", "Barbell Row 5x5"],
                  },
                  {
                    title: "Fat Loss Metabolic Density",
                    split: "4-Day Split • High Work-to-Rest Ratio",
                    exs: ["Barbell Complexes", "Kettlebell Swings", "Sled Pushes", "Assault Bike"],
                  },
                  {
                    title: "Postural Restoration & Mobility",
                    split: "4-Day Split • Corrective Protocol",
                    exs: ["Face Pulls", "Deadbugs", "Hip 90/90 Hinge", "Pallof Press"],
                  },
                ].map((tpl, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: "rgba(18,26,44,0.6)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => {
                      setBuilderPlanName(tpl.title);
                      setPlanAssignedAlert(`Loaded template: "${tpl.title}" into builder.`);
                      setTimeout(() => setPlanAssignedAlert(""), 3000);
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "0.94rem" }}>{tpl.title}</div>
                      <span style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", fontWeight: 700 }}>Load ↗</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)", marginTop: 2 }}>{tpl.split}</div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 6 }}>
                      Key movements: {tpl.exs.join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            04. 📅 SCHEDULE (INTERACTIVE 06:00 AM - 09:00 PM TIMELINE)
            ========================================================= */}
        <section
          id="section-trainer-schedule"
          className={`trainer-module-section ${visibleSections.has("section-trainer-schedule") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 04 • TIMELINE DISPATCH</div>
                <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Daily Coaching Schedule</h2>
                <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
                  Operating hours: 06:00 AM to 09:00 PM. Includes 1-on-1 PT sessions, floor assessments, and walk-in consultation blocks.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Today", "Tomorrow", "This Week"].map((filter) => (
                  <button
                    key={filter}
                    className={`trainer-att-tab-btn ${scheduleDateFilter === filter ? "active" : ""}`}
                    onClick={() => setScheduleDateFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="trainer-card">
            <div className="trainer-schedule-timeline">
              {scheduleSlots.map((slot, idx) => {
                let cardClass = "trainer-schedule-slot-card";
                if (slot.type === "pt") cardClass += " pt-session";
                else if (slot.type === "assessment") cardClass += " assessment";
                else if (slot.type === "open") cardClass += " available";

                return (
                  <div key={idx} className="trainer-schedule-hour-row">
                    <div className="trainer-schedule-hour-label">{slot.time}</div>
                    <div className={cardClass}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "0.95rem" }}>
                          {slot.title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: slot.type === "open" ? "var(--tp-cyan)" : "var(--tp-text-muted)", marginTop: 2 }}>
                          {slot.type === "open" ? "+ Click to book client walk-in" : `Client: ${slot.client} • Type: ${slot.type.toUpperCase()}`}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background:
                              slot.status === "Completed"
                                ? "rgba(16,185,129,0.2)"
                                : slot.status === "Available"
                                ? "rgba(0,180,255,0.15)"
                                : "rgba(245,158,11,0.2)",
                            color:
                              slot.status === "Completed"
                                ? "#10b981"
                                : slot.status === "Available"
                                ? "var(--tp-cyan)"
                                : "#f59e0b",
                          }}
                        >
                          {slot.status}
                        </span>

                        {slot.type === "pt" && (
                          <button
                            className="trainer-client-action-btn"
                            onClick={() => {
                              setSelectedClientId(slot.client.toLowerCase());
                              scrollToModule("section-trainer-clients");
                            }}
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            05. 📈 CLIENT PROGRESS (COMPARATIVE ANALYTICS)
            ========================================================= */}
        <section
          id="section-trainer-progress"
          className={`trainer-module-section ${visibleSections.has("section-trainer-progress") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 05 • COACHING ANALYTICS</div>
                <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Client Transformation Analytics</h2>
                <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
                  Deep comparative tracking of lean tissue gains, 1RM strength progression, and body circumference changes.
                </p>
              </div>

              {/* Client Selector Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.82rem", color: "var(--tp-text-muted)", fontWeight: 700 }}>SELECT CLIENT:</span>
                <select
                  className="trainer-form-select"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.goal})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 5 Core Metric Boxes */}
          <div className="trainer-progress-stats-grid">
            <div className="trainer-metric-box">
              <div className="trainer-metric-val">{selectedClient.weight}</div>
              <div className="trainer-metric-lbl">CURRENT WEIGHT</div>
              <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: 4, fontWeight: 700 }}>Target: {selectedClient.targetWeight}</div>
            </div>
            <div className="trainer-metric-box">
              <div className="trainer-metric-val" style={{ color: "var(--tp-cyan)" }}>{selectedClient.prs.bench.split(" ")[0]} kg</div>
              <div className="trainer-metric-lbl">BENCH PRESS</div>
              <div style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", marginTop: 4, fontWeight: 700 }}>{selectedClient.prs.bench.split(" ")[2]}</div>
            </div>
            <div className="trainer-metric-box">
              <div className="trainer-metric-val" style={{ color: "var(--tp-cyan)" }}>{selectedClient.prs.squat.split(" ")[0]} kg</div>
              <div className="trainer-metric-lbl">SQUAT 1RM</div>
              <div style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", marginTop: 4, fontWeight: 700 }}>{selectedClient.prs.squat.split(" ")[2]}</div>
            </div>
            <div className="trainer-metric-box">
              <div className="trainer-metric-val" style={{ color: "var(--tp-cyan)" }}>{selectedClient.prs.deadlift.split(" ")[0]} kg</div>
              <div className="trainer-metric-lbl">DEADLIFT 1RM</div>
              <div style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", marginTop: 4, fontWeight: 700 }}>{selectedClient.prs.deadlift.split(" ")[2]}</div>
            </div>
            <div className="trainer-metric-box">
              <div className="trainer-metric-val" style={{ color: "#10b981" }}>{selectedClient.measurements.bf.split(" ")[0]}</div>
              <div className="trainer-metric-lbl">BODY FAT %</div>
              <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: 4, fontWeight: 700 }}>{selectedClient.measurements.bf.split(" ")[1]}</div>
            </div>
          </div>

          {/* Spline Chart & Body Circumference Table */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }}>
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>8-Week Progression Spline</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--tp-cyan)", fontWeight: 700 }}>Strength Index vs Target</span>
              </div>
              <div style={{ height: 220, position: "relative", display: "flex", alignItems: "flex-end", paddingBottom: 20 }}>
                {/* SVG Visualizing Spline */}
                <svg width="100%" height="180" viewBox="0 0 500 180" fill="none" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="splineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00b4ff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#00b4ff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 10 150 Q 80 140, 150 120 T 300 80 T 480 30 L 480 180 L 10 180 Z"
                    fill="url(#splineGrad)"
                  />
                  <path
                    d="M 10 150 Q 80 140, 150 120 T 300 80 T 480 30"
                    stroke="#00b4ff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Milestones */}
                  <circle cx="10" cy="150" r="5" fill="#00b4ff" />
                  <circle cx="150" cy="120" r="5" fill="#00b4ff" />
                  <circle cx="300" cy="80" r="5" fill="#00b4ff" />
                  <circle cx="480" cy="30" r="6" fill="#ffffff" stroke="#00b4ff" strokeWidth="3" />
                </svg>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--tp-text-muted)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                <span>Week 1 (Baseline)</span>
                <span>Week 3</span>
                <span>Week 5</span>
                <span>Week 8 (Current)</span>
              </div>
            </div>

            {/* Anthropometric Measurements */}
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Body Measurements</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)" }}>Last check-in: 3 days ago</span>
              </div>
              <table className="trainer-exercise-table">
                <thead>
                  <tr>
                    <th>METRIC</th>
                    <th>MEASUREMENT</th>
                    <th>DELTA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Chest Girth</td>
                    <td style={{ fontWeight: 800 }}>{selectedClient.measurements.chest.split(" ")[0]} in</td>
                    <td style={{ color: "var(--tp-cyan)", fontWeight: 700 }}>{selectedClient.measurements.chest.split(" ")[1]}</td>
                  </tr>
                  <tr>
                    <td>Arm Girth (Flexed)</td>
                    <td style={{ fontWeight: 800 }}>{selectedClient.measurements.arms.split(" ")[0]} in</td>
                    <td style={{ color: "var(--tp-cyan)", fontWeight: 700 }}>{selectedClient.measurements.arms.split(" ")[1]}</td>
                  </tr>
                  <tr>
                    <td>Waist Circumference</td>
                    <td style={{ fontWeight: 800 }}>{selectedClient.measurements.waist.split(" ")[0]} in</td>
                    <td style={{ color: "#10b981", fontWeight: 700 }}>{selectedClient.measurements.waist.split(" ")[1]}</td>
                  </tr>
                  <tr>
                    <td>DEXA Body Fat %</td>
                    <td style={{ fontWeight: 800 }}>{selectedClient.measurements.bf.split(" ")[0]}</td>
                    <td style={{ color: "#10b981", fontWeight: 700 }}>{selectedClient.measurements.bf.split(" ")[1]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================
            06. 🟠 ATTENDANCE (TRAINER DUTY + CLIENT CHECK-IN)
            ========================================================= */}
        <section
          id="section-trainer-attendance"
          className={`trainer-module-section ${visibleSections.has("section-trainer-attendance") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 06 • ACCESS & ATTENDANCE LOG</div>
                <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Attendance Management</h2>
                <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
                  Verify client session compliance and manage Coach Alex Carter's personal gym floor duty hours.
                </p>
              </div>

              {/* Dual Mode Tab Selector */}
              <div className="trainer-attendance-tab-bar">
                <button
                  className={`trainer-att-tab-btn ${attendanceTab === "clients" ? "active" : ""}`}
                  onClick={() => setAttendanceTab("clients")}
                >
                  👥 My Clients Attendance
                </button>
                <button
                  className={`trainer-att-tab-btn ${attendanceTab === "duty" ? "active" : ""}`}
                  onClick={() => setAttendanceTab("duty")}
                >
                  ⏱️ Trainer Duty Log
                </button>
              </div>
            </div>
          </div>

          {attendanceTab === "clients" ? (
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Today's Assigned Clients Attendance</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--tp-text-muted)" }}>1-Click Check-in Toggle</span>
              </div>
              {initialClients.map((client) => {
                const status = clientAttendanceState[client.id] || "absent";
                return (
                  <div key={client.id} className="trainer-client-att-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <img src={client.avatar} alt={client.name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
                      <div>
                        <div style={{ fontWeight: 800, color: "#ffffff" }}>{client.fullName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)" }}>
                          Goal: {client.goal} • Last session: {client.lastSession}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--tp-text-muted)", fontFamily: "JetBrains Mono" }}>
                        Monthly: {client.attendance}
                      </span>
                      <button
                        className={`trainer-btn-checkin ${status}`}
                        onClick={() => toggleClientAttendance(client.id)}
                      >
                        {status === "present" ? "✓ PRESENT" : "✕ ABSENT"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Coach Alex Carter Duty & Floor Hours</h3>
                <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 700 }}>
                  {trainerClockedIn ? "• CLOCKED IN (06:15 AM)" : "• CLOCKED OUT"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                <div className="trainer-metric-box">
                  <div className="trainer-metric-val">26 / 28</div>
                  <div className="trainer-metric-lbl">DAYS ATTENDED THIS MONTH</div>
                </div>
                <div className="trainer-metric-box">
                  <div className="trainer-metric-val" style={{ color: "var(--tp-cyan)" }}>174.5 hrs</div>
                  <div className="trainer-metric-lbl">TOTAL FLOOR & PT HOURS</div>
                </div>
                <div className="trainer-metric-box">
                  <div className="trainer-metric-val" style={{ color: "#10b981" }}>93.0%</div>
                  <div className="trainer-metric-lbl">ON-TIME PUNCTUALITY SCORE</div>
                </div>
              </div>

              <button
                className="trainer-quick-btn"
                style={{ width: "100%", justifyContent: "center", padding: 14 }}
                onClick={() => setTrainerClockedIn(!trainerClockedIn)}
              >
                {trainerClockedIn ? "Clock Out for Shift" : "Clock In for Shift"}
              </button>
            </div>
          )}
        </section>

        {/* =========================================================
            07. 🥗 NUTRITION (MACRO PRESCRIPTIONS)
            ========================================================= */}
        <section
          id="section-trainer-nutrition"
          className={`trainer-module-section ${visibleSections.has("section-trainer-nutrition") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 07 • DIETARY PROGRAMMING</div>
                <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Nutrition & Fuel Prescriptions</h2>
                <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
                  Prescribe macronutrient ratios, caloric surpluses/deficits, and hydration baselines for assigned athletes.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.82rem", color: "var(--tp-text-muted)", fontWeight: 700 }}>SELECT CLIENT:</span>
                <select
                  className="trainer-form-select"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.goal})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Live Trainee Food Journal & Real-time Telemetry */}
          <div className="trainer-card" style={{ marginBottom: 22, border: "1px solid rgba(16, 185, 129, 0.35)", background: "rgba(10, 16, 26, 0.75)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.2rem" }}>🥗</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#fff" }}>
                    Live Trainee Food Journal — {selectedClient.name}
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "#34d399" }}>
                    ● Real-Time Biometric Sync with MySQL & Trainee Customer Portal
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 8, fontSize: "0.78rem" }}>
                  Calories Today: <strong style={{ color: "#00f2fe" }}>{traineeNutrition.calories} / {selectedClient.macros.calories} kcal</strong>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 8, fontSize: "0.78rem" }}>
                  Protein Logged: <strong style={{ color: "#34d399" }}>{traineeNutrition.protein} / {selectedClient.macros.protein}g</strong>
                </div>
              </div>
            </div>

            {/* Meal Items Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {traineeNutrition.meals.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.72rem", color: "#00f2fe", fontWeight: 700, textTransform: "uppercase" }}>
                      {m.name || m.meal}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--tp-text-muted)" }}>{m.time}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
                    {m.title}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--tp-text-muted)" }}>
                    <span>⚡ {m.calories} kcal</span>
                    <span style={{ color: "#34d399", fontWeight: 600 }}>🥩 {m.protein}g protein</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Prescribed Macros */}
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>{selectedClient.name}'s Target Prescriptions</h3>
                <span className="dash-hud-pill trainer-hud-pill" style={{ position: "static" }}>
                  {selectedClient.macros.calories} kcal
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800, marginBottom: 4 }}>
                    <span>PROTEIN (4 kcal/g)</span>
                    <span style={{ color: "var(--tp-cyan)" }}>{selectedClient.macros.protein} g ({Math.round(selectedClient.macros.protein * 400 / selectedClient.macros.calories)}%)</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "30%", height: "100%", background: "#00b4ff" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800, marginBottom: 4 }}>
                    <span>CARBOHYDRATES (4 kcal/g)</span>
                    <span style={{ color: "#f59e0b" }}>{selectedClient.macros.carbs} g ({Math.round(selectedClient.macros.carbs * 400 / selectedClient.macros.calories)}%)</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "50%", height: "100%", background: "#f59e0b" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800, marginBottom: 4 }}>
                    <span>FATS (9 kcal/g)</span>
                    <span style={{ color: "#10b981" }}>{selectedClient.macros.fat} g ({Math.round(selectedClient.macros.fat * 900 / selectedClient.macros.calories)}%)</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "20%", height: "100%", background: "#10b981" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800, marginBottom: 4 }}>
                    <span>HYDRATION BASELINE</span>
                    <span style={{ color: "#38bdf8" }}>{selectedClient.macros.water} Liters / Day</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "80%", height: "100%", background: "#38bdf8" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Coach Nutritional Directives */}
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Coach Notes & Supplements</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--tp-cyan)", fontWeight: 700 }}>Active Directives</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 10, background: "rgba(18,26,44,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "0.88rem" }}>Pre-Workout Fueling</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--tp-text-muted)", marginTop: 4 }}>
                    Consume 45g simple carbs (banana + rice cake with honey) 45 mins prior to heavy lifting sessions.
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 10, background: "rgba(18,26,44,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "0.88rem" }}>Supplement Stack Prescribed</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--tp-text-muted)", marginTop: 4 }}>
                    • Creatine Monohydrate: 5g daily with morning shake<br />
                    • Whey Protein Isolate: 30g post-workout<br />
                    • Magnesium Glycinate: 400mg 30 mins before bed for neural recovery
                  </div>
                </div>

                <button
                  className="trainer-portal-switch-btn"
                  onClick={() => alert(`Saved new nutritional note for ${selectedClient.name}`)}
                >
                  + Add Custom Macro Note
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            08. 💬 MESSAGES (TRAINER ↔ CLIENTS DIRECT CHAT)
            ========================================================= */}
        <section
          id="section-trainer-messages"
          className={`trainer-module-section ${visibleSections.has("section-trainer-messages") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 08 • COACHING MESSAGING HUB</div>
            <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Direct Client Communications</h2>
            <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
              Real-time two-way coaching channel between Coach Alex Carter and assigned members.
            </p>
          </div>

          <div className="trainer-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="trainer-chat-layout">
              {/* Left: Contact List */}
              <div className="trainer-convo-list" style={{ padding: 16, borderRight: "1px solid var(--tp-border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--tp-text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                  Assigned Trainees (Isolated Roster)
                </div>
                {clients.map((client) => {
                  const isCur = activeChatClientId === client.id;
                  const msgs = chatMessages[client.id] || chatMessages.nihal || [];
                  const lastMsg = msgs[msgs.length - 1];

                  return (
                    <div
                      key={client.id}
                      className={`trainer-convo-item ${isCur ? "active" : ""}`}
                      onClick={() => setActiveChatClientId(client.id)}
                    >
                      <img src={client.avatar} alt={client.name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "0.88rem" }}>{client.name}</div>
                          {lastMsg && <span style={{ fontSize: "0.68rem", color: "var(--tp-text-muted)" }}>{lastMsg.time}</span>}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {lastMsg ? lastMsg.text : "No messages yet"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: Message Window */}
              <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 18 }}>
                {/* Active Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <img
                    src={clients.find((c) => c.id === activeChatClientId)?.avatar || selectedClient.avatar}
                    alt="client"
                    style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--tp-cyan)" }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: "#ffffff" }}>
                      {clients.find((c) => c.id === activeChatClientId)?.fullName || selectedClient.fullName}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--tp-cyan)" }}>
                      Online • Assigned Trainee • Goal: {clients.find((c) => c.id === activeChatClientId)?.goal || selectedClient.goal}
                    </div>
                  </div>
                </div>

                {/* Messages stream */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "16px 0" }}>
                  {(chatMessages[activeChatClientId] || chatMessages.nihal || []).map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: msg.isMe ? "flex-end" : "flex-start",
                        maxWidth: "70%",
                        background: msg.isMe ? "linear-gradient(180deg, #0084ff 0%, #0060df 100%)" : "rgba(18,26,44,0.85)",
                        border: msg.isMe ? "1px solid rgba(0,200,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        color: "#ffffff",
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>{msg.text}</div>
                      <div style={{ fontSize: "0.65rem", opacity: 0.7, textAlign: "right", marginTop: 4 }}>
                        {msg.time}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input Field */}
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <input
                    type="text"
                    className="trainer-form-input"
                    placeholder={`Message ${clients.find((c) => c.id === activeChatClientId)?.name || selectedClient.name}...`}
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="trainer-quick-btn" style={{ background: "linear-gradient(180deg, #0099ff 0%, #0070e0 100%)" }}>
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            09. 🏆 PERFORMANCE (TRAINER KPIS & RETENTION)
            ========================================================= */}
        <section
          id="section-trainer-performance"
          className={`trainer-module-section ${visibleSections.has("section-trainer-performance") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 09 • COACHING KPIS</div>
            <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Trainer Performance & Retention</h2>
            <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
              Metrics, client retention analytics, feedback rating, and monthly coaching performance breakdown.
            </p>
          </div>

          <div className="trainer-stats-grid">
            <div className="trainer-stat-tile">
              <div className="trainer-stat-header">
                <span className="trainer-stat-label">CLIENT RETENTION</span>
                <span className="trainer-stat-badge highlight">TOP 5%</span>
              </div>
              <div className="trainer-stat-value">94%</div>
              <div className="trainer-stat-sub">17 of 18 clients renewed contract</div>
            </div>

            <div className="trainer-stat-tile">
              <div className="trainer-stat-header">
                <span className="trainer-stat-label">COACH RATING</span>
                <span className="trainer-stat-badge">REVIEWS</span>
              </div>
              <div className="trainer-stat-value">4.9 ★</div>
              <div className="trainer-stat-sub">Based on 48 verified member ratings</div>
            </div>

            <div className="trainer-stat-tile">
              <div className="trainer-stat-header">
                <span className="trainer-stat-label">MONTHLY SESSIONS</span>
                <span className="trainer-stat-badge">TARGET: 120</span>
              </div>
              <div className="trainer-stat-value">142</div>
              <div className="trainer-stat-sub">+22 sessions over monthly quota</div>
            </div>

            <div className="trainer-stat-tile">
              <div className="trainer-stat-header">
                <span className="trainer-stat-label">PT REVENUE</span>
                <span className="trainer-stat-badge">COMMISSION</span>
              </div>
              <div className="trainer-stat-value">₹1,85,000</div>
              <div className="trainer-stat-sub">Tier 1 Elite Trainer bonus unlocked</div>
            </div>
          </div>

          {/* Most Improved Client Highlight Card */}
          <div className="trainer-card" style={{ border: "1px solid rgba(0,180,255,0.45)", background: "linear-gradient(135deg, rgba(11,17,30,0.9), rgba(0,84,180,0.2))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <img src={initialClients[0].avatar} alt="Nihal" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--tp-cyan)" }} />
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", fontWeight: 800, textTransform: "uppercase" }}>
                    ⭐ MOST IMPROVED ATHLETE OF THE MONTH
                  </span>
                  <h3 style={{ margin: "4px 0", fontSize: "1.3rem", fontWeight: 900 }}>Nihal (Metuku Nihal)</h3>
                  <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.85rem" }}>
                    +18% Composite Strength Index • 100kg Bench Press Milestone • 12-day consecutive training streak
                  </p>
                </div>
              </div>

              <button
                className="trainer-client-action-btn primary"
                style={{ padding: "10px 18px", fontSize: "0.85rem" }}
                onClick={() => {
                  setSelectedClientId("nihal");
                  scrollToModule("section-trainer-progress");
                }}
              >
                View Transformation Case Study →
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================
            10. 📚 EXERCISE LIBRARY
            ========================================================= */}
        <section
          id="section-trainer-exercises"
          className={`trainer-module-section ${visibleSections.has("section-trainer-exercises") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 10 • MOVEMENT TAXONOMY</div>
                <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Exercise Library & Biomechanical Cues</h2>
                <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
                  Curated movements indexed by target muscle group, setup cues, and prescription guidelines.
                </p>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"].map((m) => (
                  <button
                    key={m}
                    className={`trainer-att-tab-btn ${exerciseMuscleFilter === m ? "active" : ""}`}
                    onClick={() => setExerciseMuscleFilter(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="trainer-library-grid">
            {filteredExercises.map((ex) => (
              <div key={ex.id} className="trainer-exercise-card">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", fontWeight: 800, textTransform: "uppercase" }}>
                      {ex.muscle}
                    </span>
                    <span className={`trainer-diff-badge ${ex.difficulty}`}>
                      {ex.difficulty}
                    </span>
                  </div>
                  <h4 style={{ margin: "4px 0 8px 0", fontSize: "1rem", fontWeight: 800, color: "#ffffff" }}>
                    {ex.name}
                  </h4>
                  <div style={{ fontSize: "0.78rem", color: "var(--tp-text-dark)", fontWeight: 600, marginBottom: 8 }}>
                    Standard: {ex.setsReps}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--tp-text-muted)", lineHeight: 1.4 }}>
                    <strong style={{ color: "#cbd5e1" }}>Coaching Cue:</strong> {ex.cues}
                  </p>
                </div>

                <button
                  className="trainer-client-action-btn primary"
                  onClick={() => {
                    setNewExName(ex.name);
                    scrollToModule("section-trainer-workout-plans");
                  }}
                >
                  + Add to Builder
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            11. 🔔 NOTIFICATIONS (COACHING ALERTS)
            ========================================================= */}
        <section
          id="section-trainer-notifications"
          className={`trainer-module-section ${visibleSections.has("section-trainer-notifications") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 11 • ALERT STREAM</div>
                <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Coaching Notifications</h2>
                <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
                  Real-time alerts regarding PR breaks, missed workouts, client roster assignments, and phase reviews.
                </p>
              </div>

              <button
                className="trainer-portal-switch-btn"
                onClick={() => setNotifications(notifications.map((n) => ({ ...n, unread: false })))}
              >
                Mark All as Read
              </button>
            </div>
          </div>

          <div className="trainer-card">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`trainer-alert-item ${notif.unread ? "highlight" : ""}`}
                  style={{ justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: "1.3rem" }}>
                      {notif.type === "milestone" ? "🏆" : notif.type === "client" ? "👥" : notif.type === "alert" ? "⚠️" : "📋"}
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "0.92rem" }}>
                        {notif.title}
                        {notif.unread && <span style={{ marginLeft: 8, fontSize: "0.65rem", padding: "2px 6px", borderRadius: 4, background: "rgba(0,180,255,0.3)", color: "var(--tp-cyan)" }}>NEW</span>}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--tp-text-muted)", marginTop: 2 }}>{notif.body}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--tp-text-muted)", fontFamily: "JetBrains Mono" }}>{notif.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            12. 👤 TRAINER PROFILE (COACH ALEX CARTER CREDENTIALS)
            ========================================================= */}
        <section
          id="section-trainer-profile"
          className={`trainer-module-section ${visibleSections.has("section-trainer-profile") ? "in-view" : "out-of-view"}`}
        >
          <div className="trainer-card" style={{ marginBottom: 22 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--tp-cyan)", fontWeight: 800 }}>MODULE 12 • COACH CREDENTIALS</div>
            <h2 style={{ margin: "4px 0", fontSize: "1.7rem", fontWeight: 900 }}>Trainer Profile & Certification</h2>
            <p style={{ margin: 0, color: "var(--tp-text-muted)", fontSize: "0.88rem" }}>
              Professional accreditation, coaching philosophy, working hours, and facility settings.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 24 }}>
            {/* Left Card: Head Coach Identity */}
            <div className="trainer-card" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0084ff, #0044b4)",
                  color: "#ffffff",
                  fontSize: "2rem",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 30px rgba(0,132,255,0.5)",
                }}
              >
                AC
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900 }}>Coach Alex Carter</h3>
                <div style={{ fontSize: "0.82rem", color: "var(--tp-cyan)", fontWeight: 800, marginTop: 4 }}>
                  HEAD STRENGTH COACH & ATHLETIC PERFORMANCE LEAD
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--tp-text-muted)", marginTop: 6 }}>
                  FitPulse Gym • ID: FP-TR-0042
                </div>
              </div>

              <div style={{ width: "100%", padding: 12, borderRadius: 10, background: "rgba(18,26,44,0.6)", border: "1px solid rgba(255,255,255,0.05)", textAlign: "left" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--tp-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Active Shift Hours
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ffffff", marginTop: 2 }}>
                  Monday - Saturday: 06:00 AM - 02:00 PM / 05:00 PM - 09:00 PM
                </div>
              </div>

              <button
                className="trainer-portal-switch-btn"
                style={{ width: "100%", padding: "10px" }}
                onClick={() => {
                  window.history.pushState({}, "", "/dashboard");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
              >
                View Member Experience Dashboard ↗
              </button>
            </div>

            {/* Right Card: Bio, Accreditations & Settings */}
            <div className="trainer-card">
              <div className="trainer-card-header">
                <h3>Accreditations & Experience</h3>
                <span className="dash-hud-pill trainer-hud-pill" style={{ position: "static" }}>
                  VERIFIED SPECIALIST
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: "rgba(18,26,44,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", fontWeight: 800 }}>CERTIFICATION</div>
                    <div style={{ fontWeight: 800, color: "#ffffff", marginTop: 2 }}>CSCS (NSCA)</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--tp-text-muted)" }}>Certified Strength & Conditioning Specialist</div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 10, background: "rgba(18,26,44,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", fontWeight: 800 }}>CERTIFICATION</div>
                    <div style={{ fontWeight: 800, color: "#ffffff", marginTop: 2 }}>NASM-PES & CPT</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--tp-text-muted)" }}>Performance Enhancement Specialist</div>
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 10, background: "rgba(18,26,44,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", fontWeight: 800 }}>COACHING PHILOSOPHY</div>
                  <p style={{ margin: "6px 0 0 0", fontSize: "0.84rem", color: "var(--tp-text-dark)", lineHeight: 1.5 }}>
                    "Biomechanically sound progressive overload, precise recovery parameters, and individualized periodization. We don't guess; we measure, adapt, and conquer."
                  </p>
                </div>

                <div style={{ padding: 12, borderRadius: 10, background: "rgba(18,26,44,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--tp-cyan)", fontWeight: 800 }}>SPECIALTIES</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {["Hypertrophy", "Biomechanics & Form Analysis", "Powerlifting Peaking", "Metabolic Conditioning", "Postural Rehab"].map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "rgba(0,180,255,0.12)",
                          color: "var(--tp-cyan)",
                          border: "1px solid rgba(0,180,255,0.25)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
