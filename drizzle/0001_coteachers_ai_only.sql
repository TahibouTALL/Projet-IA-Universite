CREATE TABLE "course_teachers" (
	"course_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_teachers_course_id_user_id_pk" PRIMARY KEY("course_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "ai_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_teachers_user_idx" ON "course_teachers" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "course_teachers" ("course_id", "user_id") SELECT "id", "teacher_id" FROM "courses" ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "documents" SET "ai_only" = true, "status" = 'PUBLISHED' WHERE "source" = 'AMBASSADOR';
