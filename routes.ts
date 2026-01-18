import { z } from "zod";
import { 
  insertUserSchema, 
  insertStudentSchema, 
  insertAttendanceSchema, 
  insertBehaviourSchema, 
  insertDetentionSchema,
  insertTutorGroupSchema,
  users,
  students,
  attendance,
  behaviour,
  detentions,
  tutorGroups
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          totalStudents: z.number(),
          attendanceToday: z.number(),
          behaviourPointsToday: z.number(),
          detentionsThisWeek: z.number(),
        }),
      },
    },
    tutorGroupAttendance: {
      method: 'GET' as const,
      path: '/api/dashboard/tutor-attendance',
      responses: {
        200: z.array(z.object({
          name: z.string(),
          present: z.number(),
        })),
      },
    },
  },
  students: {
    list: {
      method: 'GET' as const,
      path: '/api/students',
      input: z.object({
        search: z.string().optional(),
        yearGroup: z.coerce.number().optional(),
        tutorGroup: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof students.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/students/:id',
      responses: {
        200: z.custom<typeof students.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/students',
      input: insertStudentSchema,
      responses: {
        201: z.custom<typeof students.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    bulkCreate: {
      method: 'POST' as const,
      path: '/api/students/bulk',
      input: z.object({
        tutorGroup: z.string(),
        yearGroup: z.number(),
        students: z.array(z.object({
          firstName: z.string(),
          lastName: z.string(),
        })),
      }),
      responses: {
        201: z.object({ count: z.number() }),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/students/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  attendance: {
    record: {
      method: 'POST' as const,
      path: '/api/attendance',
      input: insertAttendanceSchema,
      responses: {
        201: z.custom<typeof attendance.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getByStudent: {
      method: 'GET' as const,
      path: '/api/students/:id/attendance',
      responses: {
        200: z.array(z.custom<typeof attendance.$inferSelect>()),
      },
    },
  },
  behaviour: {
    create: {
      method: 'POST' as const,
      path: '/api/behaviour',
      input: insertBehaviourSchema,
      responses: {
        201: z.custom<typeof behaviour.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getByStudent: {
      method: 'GET' as const,
      path: '/api/students/:id/behaviour',
      responses: {
        200: z.array(z.custom<typeof behaviour.$inferSelect>()),
      },
    },
    bulkCreate: {
      method: 'POST' as const,
      path: '/api/behaviour/bulk',
      input: z.object({
        tutorGroup: z.string(),
        category: z.string(),
        type: z.enum(['POSITIVE', 'NEGATIVE']),
        points: z.number(),
        notes: z.string().optional(),
      }),
      responses: {
        201: z.object({ count: z.number() }),
        400: errorSchemas.validation,
      },
    },
  },
  detentions: {
    list: {
      method: 'GET' as const,
      path: '/api/detentions',
      responses: {
        200: z.array(z.custom<typeof detentions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/detentions',
      input: insertDetentionSchema,
      responses: {
        201: z.custom<typeof detentions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/detentions/:id',
      input: insertDetentionSchema.partial(),
      responses: {
        200: z.custom<typeof detentions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  tutorGroups: {
    list: {
      method: 'GET' as const,
      path: '/api/tutor-groups',
      responses: {
        200: z.array(z.custom<typeof tutorGroups.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tutor-groups',
      input: insertTutorGroupSchema,
      responses: {
        201: z.custom<typeof tutorGroups.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
