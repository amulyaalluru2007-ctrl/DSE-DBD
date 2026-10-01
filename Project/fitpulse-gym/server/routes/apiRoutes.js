import express from "express";
import {
  getDashboardData,
  scanAttendance,
  getAttendanceLedger,
  getAssignedCoach,
  assignWorkout,
  toggleExercise,
  finishWorkout,
  bookSession,
  logNutrition,
  processPayment,
  updateSettings,
  getTrainerTrainees,
  createMemberQuery,
  selectTrainer,
  leaveTrainer,
  logProgressRecord,
  enrollFace,
  recognizeFaceAndCheckIn,
  getFaceStatus,
} from "../controllers/realtimeController.js";
import {
  getAdminOverview,
  getAllTrainers,
  createTrainer,
  getAllMembers,
  assignTrainerToMember,
  getMemberQueries,
  resolveMemberQuery,
} from "../controllers/adminController.js";
import {
  getChatMessages,
  sendChatMessage,
} from "../controllers/chatController.js";

const router = express.Router();

// Real-Time Dashboard Aggregation
router.get("/dashboard/data", getDashboardData);

// Attendance Live Scan & Ledger
router.post("/attendance/scan", scanAttendance);
router.get("/attendance/ledger", getAttendanceLedger);

// Biometric Facial Recognition & Attendance Login
router.post("/user/enroll-face", enrollFace);
router.post("/attendance/recognize-face", recognizeFaceAndCheckIn);
router.get("/user/face-status", getFaceStatus);

// Member Assigned Coach & Single Coach Workflow
router.get("/user/assigned-coach", getAssignedCoach);
router.post("/member/select-trainer", selectTrainer);
router.post("/member/leave-trainer", leaveTrainer);

// Member Physical Development: PR Records
router.post("/member/progress-record", logProgressRecord);

// Workouts Live Updates
router.post("/workouts/assign", assignWorkout);
router.post("/workouts/toggle-exercise", toggleExercise);
router.post("/workouts/finish", finishWorkout);

// Trainer Sessions Live Booking
router.post("/sessions/book", bookSession);

// Nutrition Live Log
router.post("/nutrition/log", logNutrition);

// Payments & Membership
router.post("/membership/pay", processPayment);

// Settings
router.put("/settings/profile", updateSettings);

// Trainer Trainees Isolation & Live Nutrition
router.get("/trainer/trainees", getTrainerTrainees);

// Member Support Queries
router.post("/queries/create", createMemberQuery);

// Chat (Member <-> Trainer & Admin <-> Trainer)
router.get("/chat/messages", getChatMessages);
router.post("/chat/send", sendChatMessage);

// Admin Control Panel
router.get("/admin/overview", getAdminOverview);
router.get("/admin/trainers", getAllTrainers);
router.post("/admin/trainers/create", createTrainer);
router.get("/admin/members", getAllMembers);
router.post("/admin/members/assign-trainer", assignTrainerToMember);
router.get("/admin/queries", getMemberQueries);
router.put("/admin/queries/:id/resolve", resolveMemberQuery);

export default router;
