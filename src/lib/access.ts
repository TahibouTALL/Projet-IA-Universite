// Règles d'accès : la base de données reste la source de vérité pour le rôle et la classe
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { authOptions } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  classGroupId: string | null;
  /** Cours dont l'utilisateur est l'enseignant. */
  teachingCourseIds: string[];
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return null;
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, uid) });
  if (!user) return null;
  const teaching =
    user.role === "TEACHER" || user.role === "ADMIN"
      ? await db
          .select({ id: schema.courses.id })
          .from(schema.courses)
          .where(eq(schema.courses.teacherId, user.id))
      : [];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    classGroupId: user.classGroupId,
    teachingCourseIds: teaching.map((t) => t.id),
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export const isStudentLike = (u: CurrentUser) => u.role === "STUDENT" || u.role === "AMBASSADOR";
export const isStaff = (u: CurrentUser) => u.role === "TEACHER" || u.role === "ADMIN";

/** Liste des cours visibles par l'utilisateur. */
export async function visibleCourses(user: CurrentUser) {
  const base = {
    with: {
      classGroup: true,
      teacher: { columns: { id: true, name: true } },
    },
  } as const;
  if (user.role === "ADMIN") {
    return db.query.courses.findMany({ ...base, orderBy: (c, { asc }) => [asc(c.title)] });
  }
  if (user.role === "TEACHER") {
    if (!user.teachingCourseIds.length) return [];
    return db.query.courses.findMany({
      ...base,
      where: inArray(schema.courses.id, user.teachingCourseIds),
      orderBy: (c, { asc }) => [asc(c.title)],
    });
  }
  if (!user.classGroupId) return [];
  return db.query.courses.findMany({
    ...base,
    where: eq(schema.courses.classGroupId, user.classGroupId),
    orderBy: (c, { asc }) => [asc(c.title)],
  });
}

export async function visibleCourseIds(user: CurrentUser): Promise<string[]> {
  return (await visibleCourses(user)).map((c) => c.id);
}

export function canViewCourse(user: CurrentUser, course: { id: string; classGroupId: string }) {
  if (user.role === "ADMIN") return true;
  if (user.role === "TEACHER") return user.teachingCourseIds.includes(course.id);
  return course.classGroupId === user.classGroupId;
}

export function canManageCourse(user: CurrentUser, course: { id: string }) {
  return user.role === "ADMIN" || (user.role === "TEACHER" && user.teachingCourseIds.includes(course.id));
}

/** Nom de l'enseignant d'un cours. */
export function teacherNames(course: { teacher?: { name: string } | null }) {
  return course.teacher?.name ?? "";
}

/** Charge un cours en vérifiant le droit de lecture, sinon 404. */
export async function getViewableCourse(user: CurrentUser, courseId: string) {
  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.id, courseId),
    with: {
      classGroup: true,
      teacher: { columns: { id: true, name: true } },
    },
  });
  if (!course || !canViewCourse(user, course)) notFound();
  return course;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administration",
  TEACHER: "Enseignant",
  STUDENT: "Étudiant",
  AMBASSADOR: "Ambassadeur",
};
