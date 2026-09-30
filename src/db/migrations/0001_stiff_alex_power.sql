ALTER TABLE "activities" ADD COLUMN "external_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "dependencies" ADD COLUMN "external_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "holidays" ADD COLUMN "external_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "external_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "external_id" text DEFAULT 'project' NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "external_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "external_id" text NOT NULL;