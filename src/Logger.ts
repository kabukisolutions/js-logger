/**
 * A logger interface that can be used to log messages to the console. Has the usual log methods plus a few additional
 * methods useful for adding meta information to the logs, such as the logger name.
 */
export interface Logger {
  info(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  log(...args: unknown[]): void;
  getLevel: () => number;
  setLevel: (level: number) => void;
  getName(): string;
  /** An array containing names of this logger, and all it's ancestors. Of the form [grandmaLogger, daddyLogger, logger]*/
  getLineage(): string[];
}
