import Database from 'better-sqlite3';

/** Open better-sqlite3 database instance (avoids `Database` default export / type name clash). */
export type SqliteDatabase = InstanceType<typeof Database>;
