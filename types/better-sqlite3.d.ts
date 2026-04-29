declare module 'better-sqlite3' {
  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface Statement {
    run(...params: unknown[]): RunResult;
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  }

  interface Transaction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
  }

  interface Database {
    pragma(source: string): unknown;
    exec(source: string): this;
    prepare(source: string): Statement;
    transaction<T extends (...args: any[]) => any>(fn: T): Transaction<T>;
  }

  const DatabaseCtor: {
    new (filename: string): Database;
  };

  namespace DatabaseCtor {
    export type Database = Database;
  }

  export default DatabaseCtor;
}
