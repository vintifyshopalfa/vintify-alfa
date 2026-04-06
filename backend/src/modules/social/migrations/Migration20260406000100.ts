import { Migration } from "@mikro-orm/migrations"

export class Migration20260406000100 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_post" (
        "id" text NOT NULL,
        "seller_id" text NOT NULL,
        "body" text NOT NULL DEFAULT '',
        "images" jsonb NOT NULL DEFAULT '[]',
        "likes_count" integer NOT NULL DEFAULT 0,
        "comments_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_post_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_social_post_seller_id" ON "social_post" ("seller_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_social_post_created_at" ON "social_post" ("created_at" DESC);`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_like" (
        "id" text NOT NULL,
        "customer_id" text NOT NULL,
        "target_type" text NOT NULL,
        "target_id" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_like_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_social_like_unique" ON "social_like" ("customer_id", "target_type", "target_id") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_social_like_target" ON "social_like" ("target_type", "target_id");`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_comment" (
        "id" text NOT NULL,
        "post_id" text NOT NULL,
        "customer_id" text NOT NULL,
        "body" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_comment_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_social_comment_post_id" ON "social_comment" ("post_id");`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "social_comment";`)
    this.addSql(`DROP TABLE IF EXISTS "social_like";`)
    this.addSql(`DROP TABLE IF EXISTS "social_post";`)
  }
}
