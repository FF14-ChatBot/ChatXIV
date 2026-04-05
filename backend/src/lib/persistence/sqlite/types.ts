import Database from 'better-sqlite3';

/** Open better-sqlite3 database handle. */
export type SqliteDatabase = InstanceType<typeof Database>;
