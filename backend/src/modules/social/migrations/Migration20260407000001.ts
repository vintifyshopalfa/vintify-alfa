import { Migration } from "@mikro-orm/migrations"

export class Migration20260407000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_post" (
        "id" text NOT NULL,
        "seller_id" text NOT NULL,
        "customer_id" text NOT NULL,
        "content" text NOT NULL,
        "image_url" text NULL,
        "product_id" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_post_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_social_post_seller_id" ON "social_post" ("seller_id");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_social_post_created_at" ON "social_post" ("created_at");
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_like" (
        "id" text NOT NULL,
        "customer_id" text NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_like_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_social_like_unique"
        ON "social_like" ("customer_id", "resource_type", "resource_id")
        WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_social_like_resource" ON "social_like" ("resource_type", "resource_id");
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_comment" (
        "id" text NOT NULL,
        "post_id" text NOT NULL,
        "customer_id" text NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_comment_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_social_comment_post_id" ON "social_comment" ("post_id");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "social_comment";`)
    this.addSql(`DROP TABLE IF EXISTS "social_like";`)
    this.addSql(`DROP TABLE IF EXISTS "social_post";`)
  }
}
