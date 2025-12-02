/**
 * You will log fewer and fewer messages as you decrease the level.
 */
export const enum Level {
  OFF = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  ALL = 5,
};

/**
 * Maps levels to the names of the console methods that will be called.
 */
export const LevelName = {
  [Level.OFF]  : "OFF",
  [Level.ERROR]: "error",
  [Level.WARN] : "warn",
  [Level.INFO] : "info",
  [Level.DEBUG]: "debug",
  [Level.ALL]  : "log",
};
