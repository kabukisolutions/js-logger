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
    assert.deepStrictEqual(JSON.parse(console.error.mock.calls[0].arguments[1]), {
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
    assert.deepStrictEqual(JSON.parse(console.error.mock.calls[0].arguments[1]), {
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
    assert.deepStrictEqual(JSON.parse(console.error.mock.calls[0].arguments[1]), {
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
    const loggedOutput = JSON.parse(console.error.mock.calls[0].arguments[1]);
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

  it("should only not eliminate strings, considering them as circular references", (ctx) => {
    const logger = getLogger("test");
    ctx.mock.method(console, "error");
    const data = [
      {
        "link"       : "https://www.opindia.com/",
        "title"      : "OpIndia",
        "description": "bringing the 'right' side of India",
        "favicon"    : "https://i0.wp.com/www.opindia.com/wp-content/uploads/2018/10/cropped-opindia-logo-1.png?fit=32%2C32&ssl=1",
        "ogImage"    : "https://i0.wp.com/www.opindia.com/wp-content/uploads/2018/10/cropped-opindia-logo-1.png?fit=32%2C32&ssl=1",
      },
      {
        "link"       : "https://www.opindia.com/blog/",
        "title"      : "OpIndia.com",
        "description": "bringing the 'right' side of India",
        "favicon"    : "https://i0.wp.com/www.opindia.com/wp-content/uploads/2018/10/cropped-opindia-logo-1.png?fit=32%2C32&ssl=1",
        "ogImage"    : "https://i0.wp.com/www.opindia.com/wp-content/uploads/2018/10/cropped-opindia-logo-1.png?fit=32%2C32&ssl=1",
      },
    ];
    logger.error(data);
    /// @ts-expect-error - we have mocked console.error
    const loggedOutput = JSON.parse(console.error.mock.calls[0].arguments[1]);
    assert.strictEqual(loggedOutput.level, "error");
    assert.ok(Array.isArray(loggedOutput.logMessage));
    // Logger receives messages as [data], so logMessage is formatMessage([data]) === [data] (no false circular replacement)
    assert.deepStrictEqual(loggedOutput.logMessage, [data]);
  });

  it("should not consider duplicate siblings as circular references", (ctx) => {
    const logger = getLogger("test");
    ctx.mock.method(console, "error");
    const sampleObj = {
      "bar": "baz",
    };

    const data = {
      "foo": sampleObj,
      "bar": sampleObj,
      "baz": {
        "qux": sampleObj,
      },
    };
    logger.error(data);
    /// @ts-expect-error - we have mocked console.error
    const loggedOutput = JSON.parse(console.error.mock.calls[0].arguments[1]);
    assert.strictEqual(loggedOutput.level, "error");
    assert.deepStrictEqual(loggedOutput.logMessage, [data]);
  });
});
