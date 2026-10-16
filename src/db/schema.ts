// Schéma de données de la plateforme (Drizzle ORM, PostgreSQL)
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const roleEnum = pgEnum("role", ["ADMIN", "TEACHER", "STUDENT", "AMBASSADOR"]);
export const itemTypeEnum = pgEnum("item_type", ["LESSON", "ASSIGNMENT", "ANNOUNCEMENT"]);
export const docKindEnum = pgEnum("doc_kind", [
  "COURSE",
  "TD",
  "TP",
  "EXAM",
  "HOMEWORK",
  "CORRECTION",
  "SUMMARY",
  "OTHER",
]);
export const docSourceEnum = pgEnum("doc_source", ["TEACHER", "STUDENT", "AMBASSADOR", "ADMIN"]);
export const docStatusEnum = pgEnum("doc_status", ["PENDING", "PUBLISHED", "REJECTED"]);
export const generationTypeEnum = pgEnum("generation_type", ["COURSE", "EXERCISES", "PRESENTATION"]);

export type Role = (typeof roleEnum.enumValues)[number];
export type DocKind = (typeof docKindEnum.enumValues)[number];
export type GenerationType = (typeof generationTypeEnum.enumValues)[number];

// Classe / promotion (ex : DIC1 Génie industriel)
export const classGroups = pgTable("class_groups", {
  id: id(),
  name: text("name").notNull().unique(),
  level: text("level"),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").default("STUDENT").notNull(),
  classGroupId: text("class_group_id").references(() => classGroups.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

// Espace de cours, l'équivalent d'une "classe" Google Classroom
export const courses = pgTable("courses", {
  id: id(),
  title: text("title").notNull(),
  code: text("code"),
  description: text("description"),
  color: text("color").default("#0f766e").notNull(),
  classGroupId: text("class_group_id")
    .notNull()
    .references(() => classGroups.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

// Publication dans un cours : leçon, devoir ou annonce
export const courseItems = pgTable("course_items", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: itemTypeEnum("type").default("LESSON").notNull(),
  title: text("title").notNull(),
  content: text("content").default("").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: createdAt(),
});

export const documents = pgTable(
  "documents",
  {
    id: id(),
    title: text("title").notNull(),
    description: text("description"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storageKey: text("storage_key").notNull(),
    kind: docKindEnum("kind").default("COURSE").notNull(),
    source: docSourceEnum("source").notNull(),
    status: docStatusEnum("status").default("PUBLISHED").notNull(),
    // Le document alimente la base de connaissances de l'IA
    aiEnabled: boolean("ai_enabled").default(true).notNull(),
    academicYear: text("academic_year"),
    courseId: text("course_id").references(() => courses.id, { onDelete: "cascade" }),
    itemId: text("item_id").references(() => courseItems.id, { onDelete: "cascade" }),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    reviewNote: text("review_note"),
    createdAt: createdAt(),
  },
  (t) => [index("documents_course_idx").on(t.courseId), index("documents_status_idx").on(t.status)],
);

// Morceaux de texte extraits des documents, indexés en plein texte pour l'IA
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: id(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    content: text("content").notNull(),
  },
  (t) => [
    index("chunks_document_idx").on(t.documentId),
    index("chunks_fts_idx").using("gin", sql`to_tsvector('french', ${t.content})`),
  ],
);

export const scheduleEntries = pgTable(
  "schedule_entries",
  {
    id: id(),
    classGroupId: text("class_group_id")
      .notNull()
      .references(() => classGroups.id, { onDelete: "cascade" }),
    courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // 1 = lundi ... 6 = samedi
    startTime: text("start_time").notNull(), // "08:00"
    endTime: text("end_time").notNull(),
    room: text("room"),
    teacherName: text("teacher_name"),
    createdAt: createdAt(),
  },
  (t) => [index("schedule_class_day_idx").on(t.classGroupId, t.dayOfWeek)],
);

export const announcements = pgTable("announcements", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  // null = toute l'école
  classGroupId: text("class_group_id").references(() => classGroups.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: id(),
  title: text("title").default("Nouvelle discussion").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ChatSource = { documentId: string; title: string };

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: id(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant">().notNull(),
    content: text("content").notNull(),
    sources: jsonb("sources").$type<ChatSource[]>(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_session_idx").on(t.sessionId)],
);

export const generations = pgTable("generations", {
  id: id(),
  type: generationTypeEnum("type").notNull(),
  topic: text("topic").notNull(),
  params: jsonb("params").$type<Record<string, unknown>>(),
  content: text("content").notNull(),
  // Pour les exercices : la correction, affichée séparément
  solution: text("solution"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

// Relations (pour les requêtes imbriquées)
export const usersRelations = relations(users, ({ one }) => ({
  classGroup: one(classGroups, { fields: [users.classGroupId], references: [classGroups.id] }),
}));
export const coursesRelations = relations(courses, ({ one, many }) => ({
  classGroup: one(classGroups, { fields: [courses.classGroupId], references: [classGroups.id] }),
  teacher: one(users, { fields: [courses.teacherId], references: [users.id] }),
  items: many(courseItems),
  documents: many(documents),
}));
export const courseItemsRelations = relations(courseItems, ({ one, many }) => ({
  course: one(courses, { fields: [courseItems.courseId], references: [courses.id] }),
  author: one(users, { fields: [courseItems.authorId], references: [users.id] }),
  documents: many(documents),
}));
export const documentsRelations = relations(documents, ({ one }) => ({
  course: one(courses, { fields: [documents.courseId], references: [courses.id] }),
  item: one(courseItems, { fields: [documents.itemId], references: [courseItems.id] }),
  uploader: one(users, { fields: [documents.uploaderId], references: [users.id] }),
}));
export const classGroupsRelations = relations(classGroups, ({ many }) => ({
  students: many(users),
  courses: many(courses),
}));
export const announcementsRelations = relations(announcements, ({ one }) => ({
  classGroup: one(classGroups, { fields: [announcements.classGroupId], references: [classGroups.id] }),
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
}));
export const scheduleEntriesRelations = relations(scheduleEntries, ({ one }) => ({
  classGroup: one(classGroups, { fields: [scheduleEntries.classGroupId], references: [classGroups.id] }),
  course: one(courses, { fields: [scheduleEntries.courseId], references: [courses.id] }),
}));
export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  course: one(courses, { fields: [chatSessions.courseId], references: [courses.id] }),
  messages: many(chatMessages),
}));
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] }),
}));
export const generationsRelations = relations(generations, ({ one }) => ({
  user: one(users, { fields: [generations.userId], references: [users.id] }),
  course: one(courses, { fields: [generations.courseId], references: [courses.id] }),
}));
