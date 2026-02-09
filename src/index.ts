import { transformValue } from "./transform.js";
import { Level, LevelName } from "./Level.js";
import type { Logger } from "./Logger.js";
import { ColorMap, ResetColor } from "./Colors.js";

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

const formatMessage = (message: unknown, path: Set<unknown> | null = new Set<unknown>()): unknown => {
  // Give formatters a chance to transform the message.
  const transformedMessage = transformValue(message);

  // Only objects can create cycles. Treat as circular only if this object is already an ancestor (own descendant).
  if (typeof transformedMessage === "object" && transformedMessage !== null) {
    if (path.has(transformedMessage)) {
      return "[Circular]";
    }
    const nextPath = new Set(path);
    nextPath.add(transformedMessage);

    if (Array.isArray(transformedMessage)) {
      return transformedMessage.map((item) => formatMessage(item, nextPath));
    }
    const keys = Object.keys(transformedMessage).sort();
    const formattedObj: Record<string, unknown> = {};
    for (const key of keys) {
      formattedObj[key] = formatMessage(transformedMessage[key], nextPath);
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
            console[LevelName[level]](ColorMap[level], `[${getTimestamp()} ${lineage}]`, ResetColor, ...messages);
          }
        };
      }
      return () => {};
    }

    return (...messages: unknown[]) => {
      if (level <= Math.min(globalLevel, loggerLevel ?? globalLevel)) {
        console[LevelName[level]](ColorMap[level], stringifyIfNeeded({
          name      : lineage,
          timestamp : getTimestamp(),
          level     : LevelName[level],
          logMessage: formatMessage(messages),
        }), ResetColor);
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
