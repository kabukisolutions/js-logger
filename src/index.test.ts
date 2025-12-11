import { describe, it } from "node:test";
import * as assert from "node:assert";
import { getLogger, Level, setGlobalLevel } from "./index.js";

const Now = new Date("2025-01-01T00:00:00.000Z");

/*
ctx.mock.timers.enable({ apis: ["Date"], now: Now });
ctx.mock.method(console, "info");
*/

describe ("getLogger", () => {
  it("should return a logger", () => {
    const logger = getLogger("test");
    assert.strictEqual(logger.getName(), "test");
  });

  it("should return a logger with a parent", () => {
    const parent = getLogger("parent");
    const logger = getLogger("test", parent);
    assert.strictEqual(logger.getName(), "parent > test");
  });

  it("should only log message when the message level is below the logger level", (ctx) => {
    ctx.mock.timers.enable({ apis: ["Date"], now: Now });
    ctx.mock.method(console, "error");
    ctx.mock.method(console, "info");
    const parent = getLogger("parent");
    const logger = getLogger("test", parent);
    logger.setLevel(Level.ERROR);
    logger.error("test message");
    /// @ts-expect-error - we have mocked console.error
    assert.deepStrictEqual(JSON.parse(console.error.mock.calls[0].arguments[0]), {
      name      : "parent > test",
      timestamp : Now.toISOString(),
      level     : "error",
      logMessage: ["test message"],
    });
    logger.info("test message");
    /// @ts-expect-error - we have mocked console.info
    assert.strictEqual(console.info.mock.calls.length, 0);
  });

  it("should use global level as the effective level if the logger level is not set", (ctx) => {
    ctx.mock.timers.enable({ apis: ["Date"], now: Now });
    ctx.mock.method(console, "error");
    ctx.mock.method(console, "info");
    const parent = getLogger("parent");
    const logger = getLogger("test", parent);
    setGlobalLevel(Level.ERROR);
    logger.error("test message");
    /// @ts-expect-error - we have mocked console.error
    assert.deepStrictEqual(JSON.parse(console.error.mock.calls[0].arguments[0]), {
      name      : "parent > test",
      timestamp : Now.toISOString(),
      level     : "error",
      logMessage: ["test message"],
    });
    logger.info("test message");
    /// @ts-expect-error - we have mocked console.info
    assert.strictEqual(console.info.mock.calls.length, 0);
  });

  it("should apply transformers to the message", (ctx) => {
    ctx.mock.timers.enable({ apis: ["Date"], now: Now });
    ctx.mock.method(console, "error");
    ctx.mock.method(console, "info");
    const parent = getLogger("parent");
    const logger = getLogger("test", parent);
    const error = new Error("test message");
    logger.error(error);
    /// @ts-expect-error - we have mocked console.error
    assert.deepStrictEqual(JSON.parse(console.error.mock.calls[0].arguments[0]), {
      name      : "parent > test",
      timestamp : Now.toISOString(),
      level     : "error",
      logMessage: [{
        name   : "Error",
        message: "test message",
        stack  : error.stack as string,
      }],
    });
  });

  it("should handle self-referential objects without infinite loops", (ctx) => {
    ctx.mock.timers.enable({ apis: ["Date"], now: Now });
    ctx.mock.method(console, "error");
    const logger = getLogger("test");
    const selfReferentialObj: Record<string, unknown> = { name: "test" };
    selfReferentialObj.self = selfReferentialObj;

    // This should not cause an infinite loop
    logger.error(selfReferentialObj);

    /// @ts-expect-error - we have mocked console.error
    const loggedOutput = JSON.parse(console.error.mock.calls[0].arguments[0]);
    assert.strictEqual(loggedOutput.name, "test");
    assert.strictEqual(loggedOutput.level, "error");
    // The logMessage should contain the object with circular reference replaced by "[Circular]"
    assert.ok(Array.isArray(loggedOutput.logMessage));
    assert.strictEqual(loggedOutput.logMessage.length, 1);
    assert.deepStrictEqual(loggedOutput.logMessage[0], {
      name: "test",
      self: "[Circular]",
    });
  });
});
