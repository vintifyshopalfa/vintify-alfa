import { Migration } from "@mikro-orm/migrations"

export class Migration20260406000200 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "social_comment"
      ADD COLUMN IF NOT EXISTS "target_type" text NOT NULL DEFAULT 'post';
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_social_comment_target_type" ON "social_comment" ("target_type");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_social_comment_target_type";`)
    this.addSql(`ALTER TABLE "social_comment" DROP COLUMN IF EXISTS "target_type";`)
  }
}
