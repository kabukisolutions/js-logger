import { Level } from "./Level.js";

export const ColorMap: Record<Level, string> = {
  [Level.OFF]  : "",
  [Level.ERROR]: "\x1b[31m", // Red
  [Level.WARN] : "\x1b[33m", // Yellow
  [Level.INFO] : "\x1b[32m", // Green
  [Level.DEBUG]: "\x1b[34m", // Blue
  [Level.ALL]  : "\x1b[37m", // White
};
export const ResetColor = "\x1b[0m";
