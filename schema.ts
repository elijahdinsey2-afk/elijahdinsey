import { pgTable, text, serial, integer, boolean, timestamp, date, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull().default("Staff Member"),
  role: text("role").notNull().default("admin"),
});

export const timetables = pgTable("timetables", {
  id: serial("id").primaryKey(),
  tutorGroup: text("tutor_group").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6
  period: integer("period").notNull(),
  subject: text("subject").notNull(),
  room: text("room").notNull(),
  teacherId: integer("teacher_id").notNull(),
});

export const insertTimetableSchema = createInsertSchema(timetables).omit({ id: true });
export type Timetable = typeof timetables.$inferSelect;
export type InsertTimetable = z.infer<typeof insertTimetableSchema>;

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  yearGroup: integer("year_group").notNull(),
  tutorGroup: text("tutor_group").notNull(),
  admissionDate: date("admission_date").notNull(),
  attendanceSessionsPossible: integer("attendance_sessions_possible").default(188),
  attendanceSessionsPresent: integer("attendance_sessions_present").default(188),
  behaviourPoints: integer("behaviour_points").default(0),
});

export const tutorGroups = pgTable("tutor_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  yearGroup: integer("year_group").notNull(),
});

export const insertTutorGroupSchema = createInsertSchema(tutorGroups);
export type TutorGroup = typeof tutorGroups.$inferSelect;
export type InsertTutorGroup = z.infer<typeof insertTutorGroupSchema>;

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  date: date("date").notNull(),
  session: text("session").notNull(), // 'AM' or 'PM'
  status: text("status").notNull(), // 'PRESENT', 'LATE', 'ABSENT', 'AUTH_ABSENT', 'UNAUTH_ABSENT'
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const behaviour = pgTable("behaviour", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  type: text("type").notNull(), // 'POSITIVE' or 'NEGATIVE'
  category: text("category").notNull(), // 'ACHIEVEMENT', 'EXCELLENT_WORK', 'WARNING', 'DISRUPTION', 'HOMEWORK'
  points: integer("points").notNull(),
  notes: text("notes"),
  date: timestamp("date").defaultNow(),
});

export const detentions = pgTable("detentions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  type: text("type").notNull(), // 'LUNCH' or 'AFTER_SCHOOL'
  date: date("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default("SCHEDULED"), // 'SCHEDULED', 'ATTENDED', 'MISSED'
  reason: text("reason"),
});

// === RELATIONS ===

export const studentsRelations = relations(students, ({ many }) => ({
  attendance: many(attendance),
  behaviour: many(behaviour),
  detentions: many(detentions),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));

export const behaviourRelations = relations(behaviour, ({ one }) => ({
  student: one(students, {
    fields: [behaviour.studentId],
    references: [students.id],
  }),
}));

export const detentionsRelations = relations(detentions, ({ one }) => ({
  student: one(students, {
    fields: [detentions.studentId],
    references: [students.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertStudentSchema = createInsertSchema(students).omit({ 
  id: true, 
  attendanceSessionsPossible: true,
  attendanceSessionsPresent: true, 
  behaviourPoints: true 
});
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, recordedAt: true });
export const insertBehaviourSchema = createInsertSchema(behaviour).omit({ id: true, date: true });
export const insertDetentionSchema = createInsertSchema(detentions).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Behaviour = typeof behaviour.$inferSelect;
export type Detention = typeof detentions.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertBehaviour = z.infer<typeof insertBehaviourSchema>;
export type InsertDetention = z.infer<typeof insertDetentionSchema>;

// Request types
export type LoginRequest = Pick<InsertUser, "username" | "password">;
export type CreateStudentRequest = InsertStudent;
export type CreateAttendanceRequest = InsertAttendance;
export type CreateBehaviourRequest = InsertBehaviour;
export type CreateDetentionRequest = InsertDetention;
export type UpdateDetentionRequest = Partial<InsertDetention>;

// Response types
export type StudentResponse = Student;
export type StudentsListResponse = Student[];
export type AttendanceResponse = Attendance;
export type BehaviourResponse = Behaviour;
export type DetentionResponse = Detention;

// Dashboard stats
export interface DashboardStats {
  totalStudents: number;
  attendanceToday: number; // Percentage
  behaviourPointsToday: number;
  detentionsThisWeek: number;
}
