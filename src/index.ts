import { transformValue } from "./transform.js";
import { Level, LevelName } from "./Level.js";
import type { Logger } from "./Logger.js";

let globalLevel: Level = Level.ALL;

export {
  Level,
  LevelName,
};

export type { Logger };
export const getGlobalLevel = () => globalLevel;
export const setGlobalLevel = (level: Level) => {
  globalLevel = level;
};

export {
  addTransformer,
  removeTransformer,
} from "./transform.js";

const formatMessage = (message: unknown, seen: Set<unknown> | null = new Set<unknown>()): unknown => {
  if (seen.has(message)) {
    return "[Circular]";
  }
  seen.add(message);
  // Give formatters a chance to transform the message.
  // We do this in case somebody wants to handle a certain shape of an array, for instance.
  const transformedMessage = transformValue(message);

  // Now, do a recursive transformation of the message. We don't want transofmration functions (format functions; need to change the name)
  // to worry about recursion and order of operations. Simplify it so that they only have to deal with the current value.
  if (Array.isArray(transformedMessage)) {
    return transformedMessage.map((message) => formatMessage(message, seen));
  }

  if (typeof transformedMessage === "object" && transformedMessage !== null) {
    const keys = Object.keys(transformedMessage).sort();
    const formattedObj: Record<string, unknown> = {};
    for (const key of keys) {
      formattedObj[key] = formatMessage(transformedMessage[key], seen);
    }
    return formattedObj;
  }

  return transformedMessage;
};

/**
 * In production environments (such as AWS), we want a single log message per line. So we stringify into a single line.
 * OTOH, in development environments, we want to see the raw message with newlines and pretty formatting.
 * @returns
 */
const stringifyIfNeeded = (message: unknown): string => {
  return JSON.stringify(message, null, process.env.NODE_ENV === "development" ? 2 : undefined);
};

export const getTimestamp = () => {
  return new Date().toISOString();
};

export const getLogger = (loggerName: string, parent?: Logger): Logger => {
  const name = parent ? `${parent.getName()} > ${loggerName}` : loggerName;
  const getName = () => name;
  const lineage = (parent ? [...parent.getLineage(), loggerName] : [loggerName]).join(" > ");
  const l: Logger = {} as Logger;
  let loggerLevel: Level | undefined;

  const makeLogFn = (level: Level) => {
    if (typeof window !== "undefined") {
      if (process.env.NODE_ENV === "development") {
        return (...messages: unknown[]) => {
          if (level <= Math.min(globalLevel, loggerLevel ?? globalLevel)) {
            console[LevelName[level]](`[${getTimestamp()} ${lineage}]`, ...messages);
          }
        };
      }
      return () => {};
    }

    return (...messages: unknown[]) => {
      if (level <= Math.min(globalLevel, loggerLevel ?? globalLevel)) {
        console[LevelName[level]](stringifyIfNeeded({
          name      : lineage,
          timestamp : getTimestamp(),
          level     : LevelName[level],
          logMessage: formatMessage(messages),
        }));
      }
    };
  };

  Object.assign(l, {
    getLevel: () => loggerLevel ? loggerLevel : parent?.getLevel() ?? globalLevel,
    setLevel: (newLevel: Level) => {
      loggerLevel = newLevel;
    },
    info      : makeLogFn(Level.INFO),
    error     : makeLogFn(Level.ERROR),
    warn      : makeLogFn(Level.WARN),
    debug     : makeLogFn(Level.DEBUG),
    log       : makeLogFn(Level.ALL),
    getLineage: () => parent ? [...parent.getLineage(), loggerName] : [loggerName],
    getName,
  });

  return l;
};

export default getLogger;
