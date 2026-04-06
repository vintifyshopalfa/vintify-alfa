import { Migration } from "@mikro-orm/migrations"

export class Migration20260406000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" text NOT NULL,
        "actor_id" text NULL,
        "actor_type" text NOT NULL DEFAULT 'system',
        "action" text NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" text NULL,
        "metadata" jsonb NULL,
        "ip_address" text NULL,
        "user_agent" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_log_actor_id" ON "audit_log" ("actor_id");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_log_resource_type_resource_id"
        ON "audit_log" ("resource_type", "resource_id");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_log_created_at"
        ON "audit_log" ("created_at");
    `)

    this.addSql(`
      CREATE OR REPLACE FUNCTION audit_log_deny_mutation()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'audit_log is append-only: % on % is not permitted', TG_OP, TG_TABLE_NAME;
        RETURN NULL;
      END;
      $$;
    `)

    this.addSql(`
      DROP TRIGGER IF EXISTS audit_log_no_update ON "audit_log";
      CREATE TRIGGER audit_log_no_update
        BEFORE UPDATE ON "audit_log"
        FOR EACH ROW EXECUTE FUNCTION audit_log_deny_mutation();
    `)

    this.addSql(`
      DROP TRIGGER IF EXISTS audit_log_no_delete ON "audit_log";
      CREATE TRIGGER audit_log_no_delete
        BEFORE DELETE ON "audit_log"
        FOR EACH ROW EXECUTE FUNCTION audit_log_deny_mutation();
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TRIGGER IF EXISTS audit_log_no_delete ON "audit_log";`)
    this.addSql(`DROP TRIGGER IF EXISTS audit_log_no_update ON "audit_log";`)
    this.addSql(`DROP FUNCTION IF EXISTS audit_log_deny_mutation();`)
    this.addSql(`DROP TABLE IF EXISTS "audit_log";`)
  }
}
