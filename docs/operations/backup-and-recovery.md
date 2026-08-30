# PostgreSQL backup and artifact recovery

## Storage assumption

For the PoC, PostgreSQL is the system of record for tenants, Markdown articles, uploaded TSX source, compiled browser artifacts, compilation failures, version state, and active presentation pointers. A database backup therefore protects both content and presentation artifacts.

Deleting an article deliberately cascades deletion to its owned presentation records. Recovering an accidentally deleted article requires restoring from a backup or point-in-time recovery.

## Backup example

Use the platform's managed PostgreSQL backups in hosted environments. For a manual custom-format backup:

```bash
pg_dump --format=custom --no-owner --file=agent-native-cms.dump "$DATABASE_URL"
```

Record the application revision, migration revision, PostgreSQL version, backup timestamp, and checksum next to the dump. Do not commit dumps or credentials to the repository.

## Restore drill

Restore into an isolated database first, never directly over the active database without an approved recovery event:

```bash
createdb agent_native_cms_restore
pg_restore --no-owner --dbname=agent_native_cms_restore agent-native-cms.dump
```

Point a disposable kernel instance at the restored database, run migrations, and verify:

1. Tenant and article counts.
2. Presentation counts by status.
3. Every `active_presentation_id` resolves to an active presentation owned by the same tenant/article.
4. Stored compiled artifacts are present for `compiled` and `active` records.
5. MCP read tools return the expected versioned contract and records.

## Artifact recovery

Compiled code is stored alongside source, so normal recovery does not require recompilation. If a compiled artifact is missing but source exists, preserve the damaged record for audit and upload the source as a new version through MCP using the current SDK/compiler. Activate the new compiled version only after verification; do not mutate historical source in place.
