import { db } from "./db";
import {
  users, students, attendance, behaviour, detentions, tutorGroups, timetables,
  type User, type InsertUser,
  type Student, type InsertStudent,
  type Attendance, type InsertAttendance,
  type Behaviour, type InsertBehaviour,
  type Detention, type InsertDetention,
  type TutorGroup, type InsertTutorGroup,
  type Timetable, type InsertTimetable,
  type DashboardStats
} from "@shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Students
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  searchStudents(query?: string, yearGroup?: number, tutorGroup?: string): Promise<Student[]>;

  // Attendance
  recordAttendance(record: InsertAttendance): Promise<Attendance>;
  getStudentAttendance(studentId: number): Promise<Attendance[]>;
  getAttendancePercentageToday(): Promise<number>;

  // Behaviour
  createBehaviour(record: InsertBehaviour): Promise<Behaviour>;
  getStudentBehaviour(studentId: number): Promise<Behaviour[]>;
  getBehaviourPointsToday(): Promise<number>;

  // Detentions
  getDetentions(): Promise<Detention[]>;
  createDetention(record: InsertDetention): Promise<Detention>;
  updateDetention(id: number, updates: Partial<InsertDetention>): Promise<Detention>;
  getDetentionsThisWeek(): Promise<number>;
  
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
  
  // Timetables
  getTimetables(): Promise<Timetable[]>;
  createTimetable(record: InsertTimetable): Promise<Timetable>;
  getTimetableByGroup(tutorGroup: string): Promise<Timetable[]>;
  deleteTimetable(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Students
  async getStudents(): Promise<Student[]> {
    return await db.select().from(students).orderBy(desc(students.id));
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(insertStudent).returning();
    return student;
  }

  async searchStudents(query?: string, yearGroup?: number, tutorGroup?: string): Promise<Student[]> {
    let conditions = [];
    
    if (query) {
      const lowerQuery = `%${query.toLowerCase()}%`;
      conditions.push(sql`lower(${students.firstName} || ' ' || ${students.lastName}) LIKE ${lowerQuery}`);
    }
    
    if (yearGroup) {
      conditions.push(eq(students.yearGroup, yearGroup));
    }
    
    if (tutorGroup) {
      conditions.push(eq(students.tutorGroup, tutorGroup));
    }

    if (conditions.length === 0) {
      return this.getStudents();
    }

    return await db.select().from(students).where(and(...conditions)).orderBy(desc(students.id));
  }

  // Attendance
  async recordAttendance(record: InsertAttendance): Promise<Attendance> {
    const [att] = await db.insert(attendance).values(record).returning();
    
    // Update student session counts
    const student = await this.getStudent(record.studentId);
    if (student) {
      let presentInc = 0;
      // If status is not PRESENT or LATE, they lost a day of presence
      // Since they start at 188/188, we only decrement if they are ABSENT
      if (record.status !== 'PRESENT' && record.status !== 'LATE') {
        presentInc = -1;
      }
      
      await db.update(students)
        .set({ 
          attendanceSessionsPresent: Math.max(0, (student.attendanceSessionsPresent || 0) + presentInc)
        })
        .where(eq(students.id, record.studentId));
    }
    
    return att;
  }

  async getStudentAttendance(studentId: number): Promise<Attendance[]> {
    return await db.select().from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.date));
  }

  async getAttendancePercentageToday(): Promise<number> {
    const allStudents = await this.getStudents();
    if (allStudents.length === 0) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const present = await db.select().from(attendance)
      .where(and(
        eq(attendance.date, today),
        sql`${attendance.status} IN ('PRESENT', 'LATE')`
      ));
      
    return Math.round((present.length / allStudents.length) * 100) || 0;
  }

  // Behaviour
  async createBehaviour(record: InsertBehaviour): Promise<Behaviour> {
    // Check if positive points and student is absent
    if (record.points > 0) {
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = await db.select().from(attendance)
        .where(and(
          eq(attendance.studentId, record.studentId),
          eq(attendance.date, today)
        ));
      
      const lastMark = todayAttendance[todayAttendance.length - 1];
      if (lastMark && (lastMark.status === 'ABSENT_UNAUTH' || lastMark.status === 'ABSENT_AUTH')) {
        throw new Error("Cannot award positive points to an absent student");
      }
    }

    const [beh] = await db.insert(behaviour).values(record).returning();
    
    // Update student points
    const student = await this.getStudent(record.studentId);
    if (student) {
      const newPoints = (student.behaviourPoints || 0) + record.points;
      await db.update(students)
        .set({ behaviourPoints: newPoints })
        .where(eq(students.id, record.studentId));
        
      // Check for detention trigger (e.g., < -10 points)
      if (newPoints <= -10) {
         // Auto-create detention logic could go here or be handled by the caller
      }
    }
    
    return beh;
  }

  async getStudentBehaviour(studentId: number): Promise<Behaviour[]> {
    return await db.select().from(behaviour)
      .where(eq(behaviour.studentId, studentId))
      .orderBy(desc(behaviour.date));
  }

  async getBehaviourPointsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const result = await db.select({
      total: sql<number>`sum(${behaviour.points})`
    }).from(behaviour)
    .where(sql`${behaviour.date} >= ${today.toISOString()}`);
    
    return result[0]?.total || 0;
  }

  // Detentions
  async getDetentions(): Promise<Detention[]> {
    return await db.select().from(detentions).orderBy(desc(detentions.date));
  }

  async createDetention(record: InsertDetention): Promise<Detention> {
    const [det] = await db.insert(detentions).values(record).returning();
    return det;
  }

  async updateDetention(id: number, updates: Partial<InsertDetention>): Promise<Detention> {
    const [det] = await db.update(detentions)
      .set(updates)
      .where(eq(detentions.id, id))
      .returning();
    return det;
  }

  async getDetentionsThisWeek(): Promise<number> {
    // Simplified count for prototype
    const dets = await this.getDetentions();
    return dets.length; // Just return total for now to ensure data shows
  }

  // Dashboard
  async deleteStudent(id: number): Promise<void> {
    await db.delete(attendance).where(eq(attendance.studentId, id));
    await db.delete(behaviour).where(eq(behaviour.studentId, id));
    await db.delete(detentions).where(eq(detentions.studentId, id));
    await db.delete(students).where(eq(students.id, id));
  }

  // Tutor Groups
  async getTutorGroups(): Promise<TutorGroup[]> {
    return await db.select().from(tutorGroups);
  }

  async createTutorGroup(tg: InsertTutorGroup): Promise<TutorGroup> {
    const [newTg] = await db.insert(tutorGroups).values(tg).returning();
    return newTg;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allStudents = await this.getStudents();
    const stats = {
      totalStudents: allStudents.length,
      attendanceToday: await this.getAttendancePercentageToday(),
      behaviourPointsToday: await this.getBehaviourPointsToday(),
      detentionsThisWeek: await this.getDetentionsThisWeek(),
    };
    return stats;
  }

  async getTutorGroupAttendance(): Promise<{ name: string; present: number }[]> {
    const allStudents = await this.getStudents();
    const groupsSet = new Set(allStudents.map(s => s.tutorGroup));
    const groups = Array.from(groupsSet);
    
    return groups.map(group => {
      const groupStudents = allStudents.filter(s => s.tutorGroup === group);
      const totalPossible = groupStudents.length * 188;
      const totalPresent = groupStudents.reduce((acc, s) => acc + (s.attendanceSessionsPresent || 0), 0);
      return {
        name: group,
        present: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0
      };
    });
  }

  // Timetables
  async getTimetables(): Promise<Timetable[]> {
    return await db.select().from(timetables);
  }

  async createTimetable(record: InsertTimetable): Promise<Timetable> {
    const [tt] = await db.insert(timetables).values(record).returning();
    return tt;
  }

  async getTimetableByGroup(tutorGroup: string): Promise<Timetable[]> {
    return await db.select().from(timetables).where(eq(timetables.tutorGroup, tutorGroup));
  }

  async deleteTimetable(id: number): Promise<void> {
    await db.delete(timetables).where(eq(timetables.id, id));
  }
}

export const storage = new DatabaseStorage();
