import { Migration } from "@mikro-orm/migrations"

export class Migration20260406000300 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "social_post"
      ALTER COLUMN "images" TYPE text USING images::text,
      ALTER COLUMN "images" SET DEFAULT '[]';
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "social_post"
      ALTER COLUMN "images" TYPE jsonb USING images::jsonb,
      ALTER COLUMN "images" SET DEFAULT '[]';
    `)
  }
}
