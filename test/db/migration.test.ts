import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  if (process.env.CI === "true") {
    throw new Error(
      "DATABASE_URL is missing in CI environment. Database tests must not be skipped in CI."
    );
  }
}

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("Database Schema & Migration DDL Verification", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates exactly the three required Phase 1 tables in public schema", async () => {
    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name;`
    );

    const tableNames = tables.map((t) => t.table_name);
    // Exclude Prisma's migration tracking table if present
    const appTables = tableNames.filter((name) => name !== "_prisma_migrations");

    expect(appTables.sort()).toEqual(["custom_requests", "tracks", "users"]);
  });

  it("tracks table explicitly omits reserved_by_order_id", async () => {
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'tracks' 
         AND column_name = 'reserved_by_order_id';`
    );

    expect(columns).toHaveLength(0);
  });

  it("tracks table contains reserved_until with timestamptz type", async () => {
    const columns = await prisma.$queryRawUnsafe<
      Array<{ column_name: string; data_type: string; is_nullable: string }>
    >(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'tracks' 
         AND column_name = 'reserved_until';`
    );

    expect(columns).toHaveLength(1);
    expect(columns[0].data_type).toBe("timestamp with time zone");
    expect(columns[0].is_nullable).toBe("YES");
  });

  it("all timestamp columns across all three tables are timestamp with time zone", async () => {
    const timestampColumns = await prisma.$queryRawUnsafe<
      Array<{ table_name: string; column_name: string; data_type: string }>
    >(
      `SELECT table_name, column_name, data_type FROM information_schema.columns 
       WHERE table_schema = 'public' 
         AND table_name IN ('users', 'tracks', 'custom_requests')
         AND (column_name LIKE '%_at' OR column_name LIKE '%_until')
       ORDER BY table_name, column_name;`
    );

    expect(timestampColumns.length).toBeGreaterThan(0);
    for (const col of timestampColumns) {
      expect(col.data_type).toBe("timestamp with time zone");
    }
  });

  it("updated_at columns carry DEFAULT now() / CURRENT_TIMESTAMP on all three tables", async () => {
    const updatedAtDefaults = await prisma.$queryRawUnsafe<
      Array<{ table_name: string; column_name: string; column_default: string }>
    >(
      `SELECT table_name, column_name, column_default FROM information_schema.columns 
       WHERE table_schema = 'public' 
         AND table_name IN ('users', 'tracks', 'custom_requests')
         AND column_name = 'updated_at'
       ORDER BY table_name;`
    );

    expect(updatedAtDefaults).toHaveLength(3);
    for (const col of updatedAtDefaults) {
      expect(col.column_default).toMatch(/CURRENT_TIMESTAMP|now\(\)/i);
    }
  });

  it("defines the three required enum types with exact lowercase values", async () => {
    const enums = await prisma.$queryRawUnsafe<
      Array<{ enum_name: string; enum_value: string }>
    >(
      `SELECT t.typname AS enum_name, e.enumlabel AS enum_value
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public'
       ORDER BY t.typname, e.enumsortorder;`
    );

    const enumMap = new Map<string, string[]>();
    for (const row of enums) {
      if (!enumMap.has(row.enum_name)) {
        enumMap.set(row.enum_name, []);
      }
      enumMap.get(row.enum_name)!.push(row.enum_value);
    }

    expect(enumMap.get("role")).toEqual(["admin", "customer"]);
    expect(enumMap.get("track_status")).toEqual([
      "draft",
      "published",
      "reserved",
      "sold_exclusive",
      "archived",
    ]);
    expect(enumMap.get("custom_request_status")).toEqual([
      "submitted",
      "quoted",
      "deposit_pending",
      "in_progress",
      "demo_sent",
      "revising",
      "approved",
      "completed",
      "cancelled",
    ]);
  });

  it("contains unique constraints on users.email and tracks.slug", async () => {
    const uniqueIndexes = await prisma.$queryRawUnsafe<
      Array<{ tablename: string; indexname: string; indexdef: string }>
    >(
      `SELECT tablename, indexname, indexdef FROM pg_indexes 
       WHERE schemaname = 'public' 
         AND tablename IN ('users', 'tracks', 'custom_requests')
         AND indexdef LIKE '%UNIQUE%'
       ORDER BY tablename, indexname;`
    );

    const userEmailIndex = uniqueIndexes.find(
      (idx) => idx.tablename === "users" && idx.indexname === "users_email_key"
    );
    expect(userEmailIndex).toBeDefined();

    const trackSlugIndex = uniqueIndexes.find(
      (idx) => idx.tablename === "tracks" && idx.indexname === "tracks_slug_key"
    );
    expect(trackSlugIndex).toBeDefined();
  });

  it("contains exactly the 7 secondary indexes across the migration", async () => {
    const secondaryIndexes = await prisma.$queryRawUnsafe<
      Array<{ tablename: string; indexname: string }>
    >(
      `SELECT tablename, indexname FROM pg_indexes 
       WHERE schemaname = 'public' 
         AND tablename IN ('users', 'tracks', 'custom_requests')
         AND indexdef NOT LIKE '%UNIQUE%'
         AND indexname NOT LIKE '%_pkey'
       ORDER BY tablename, indexname;`
    );

    const expectedIndexes = [
      { tablename: "custom_requests", indexname: "custom_requests_created_at_idx" },
      { tablename: "custom_requests", indexname: "custom_requests_status_idx" },
      { tablename: "custom_requests", indexname: "custom_requests_user_id_idx" },
      { tablename: "tracks", indexname: "tracks_created_at_idx" },
      { tablename: "tracks", indexname: "tracks_genre_idx" },
      { tablename: "tracks", indexname: "tracks_mood_idx" },
      { tablename: "tracks", indexname: "tracks_status_idx" },
    ];

    expect(secondaryIndexes).toHaveLength(7);
    expect(secondaryIndexes).toEqual(expectedIndexes);
  });
});
