import { Migration } from "@mikro-orm/migrations"

export class Migration20260406000002 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "audit_log" RENAME TO "audit_logs";
    `)

    this.addSql(`
      ALTER INDEX IF EXISTS "IDX_audit_log_actor_id" RENAME TO "IDX_audit_logs_actor_id";
    `)

    this.addSql(`
      ALTER INDEX IF EXISTS "IDX_audit_log_resource_type_resource_id" RENAME TO "IDX_audit_logs_resource_type_resource_id";
    `)

    this.addSql(`
      ALTER INDEX IF EXISTS "IDX_audit_log_created_at" RENAME TO "IDX_audit_logs_created_at";
    `)

    this.addSql(`
      DROP TRIGGER IF EXISTS audit_log_no_update ON "audit_logs";
      CREATE TRIGGER audit_logs_no_update
        BEFORE UPDATE ON "audit_logs"
        FOR EACH ROW EXECUTE FUNCTION audit_log_deny_mutation();
    `)

    this.addSql(`
      DROP TRIGGER IF EXISTS audit_log_no_delete ON "audit_logs";
      CREATE TRIGGER audit_logs_no_delete
        BEFORE DELETE ON "audit_logs"
        FOR EACH ROW EXECUTE FUNCTION audit_log_deny_mutation();
    `)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "audit_logs" RENAME TO "audit_log";`)
  }
}
