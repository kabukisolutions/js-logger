import { describe, it } from "node:test";
import * as assert from "node:assert";
import { formatValue, addFormatter, removeFormatter, type Formatter } from "./formatters.js";

describe("formatters", () => {
  describe("formatValue", () => {
    it("should format Error objects with name, message, and stack", () => {
      const error = new Error("test error");
      const formatted = formatValue(error);

      assert.deepStrictEqual(formatted, {
        name   : "Error",
        message: "test error",
        stack  : error.stack,
      });
    });

    it("should pass through non-Error objects unchanged", () => {
      const message = "simple string";
      const formatted = formatValue(message);
      assert.strictEqual(formatted, message);
    });

    it("should pass through objects unchanged", () => {
      const obj = { key: "value", number: 42 };
      const formatted = formatValue(obj);
      assert.deepStrictEqual(formatted, obj);
    });

    it("should pass through arrays unchanged", () => {
      const arr = [1, 2, "three"];
      const formatted = formatValue(arr);
      assert.deepStrictEqual(formatted, arr);
    });

    it("should pass through null and undefined unchanged", () => {
      assert.strictEqual(formatValue(null), null);
      assert.strictEqual(formatValue(undefined), undefined);
    });
  });

  describe("addFormatter", () => {
    it("should add a custom formatter to the chain", () => {
      const customFormatter: Formatter = (message: unknown) => {
        if (typeof message === "string") {
          return message.toUpperCase();
        }
        return message;
      };

      addFormatter(customFormatter);
      const result = formatValue("hello world");
      assert.strictEqual(result, "HELLO WORLD");

      // Clean up
      removeFormatter(customFormatter);
    });

    it("should not add the same formatter twice", () => {
      const customFormatter: Formatter = (message: unknown) => {
        if (typeof message === "string") {
          return `PREFIX_${message}`;
        }
        return message;
      };

      addFormatter(customFormatter);
      addFormatter(customFormatter); // Should be ignored

      const result = formatValue("test");
      assert.strictEqual(result, "PREFIX_test");

      // Clean up
      removeFormatter(customFormatter);
    });

    it("should apply formatters in LIFO order", () => {
      const formatter1: Formatter = (message: unknown) => {
        if (typeof message === "string") {
          return `${message}_1`;
        }
        return message;
      };

      const formatter2: Formatter = (message: unknown) => {
        if (typeof message === "string") {
          return `${message}_2`;
        }
        return message;
      };

      addFormatter(formatter1);
      addFormatter(formatter2);

      const result = formatValue("test");
      assert.strictEqual(result, "test_2");

      // Clean up
      removeFormatter(formatter1);
      removeFormatter(formatter2);
    });
  });

  describe("removeFormatter", () => {
    it("should remove a formatter from the chain", () => {
      const customFormatter: Formatter = (message: unknown) => {
        if (typeof message === "string") {
          return `FORMATTED_${message}`;
        }
        return message;
      };

      addFormatter(customFormatter);
      let result = formatValue("test");
      assert.strictEqual(result, "FORMATTED_test");

      removeFormatter(customFormatter);
      result = formatValue("test");
      assert.strictEqual(result, "test");
    });

    it("should handle removing a formatter that doesn't exist", () => {
      const formatter1: Formatter = () => "never added";
      const formatter2: Formatter = () => "also never added";

      // Should not throw
      removeFormatter(formatter1);
      removeFormatter(formatter2);
    });
  });

  describe("formatter chain behavior", () => {
    it("should allow formatters to call next formatter", () => {
      const upperCaseFormatter: Formatter = (message: unknown, next?: Formatter) => {
        if (typeof message === "string") {
          return next ? next(message.toUpperCase()) : message.toUpperCase();
        }
        return next ? next(message) : message;
      };

      const addPrefixFormatter: Formatter = (message: unknown) => {
        if (typeof message === "string") {
          return `PREFIX_${message}`;
        }
        return message;
      };

      addFormatter(addPrefixFormatter);
      addFormatter(upperCaseFormatter);

      const result = formatValue("hello");
      assert.strictEqual(result, "PREFIX_HELLO");

      // Clean up
      removeFormatter(upperCaseFormatter);
      removeFormatter(addPrefixFormatter);
    });

    it("should allow formatters to short-circuit the chain", () => {
      const shortCircuitFormatter: Formatter = (message: unknown) => {
        if (typeof message === "string") {
          return "SHORT_CIRCUIT";
        }
        return message;
      };

      const shouldNotRunFormatter: Formatter = (message: unknown) => {
        if (typeof message === "string") {
          return "SHOULD_NOT_RUN";
        }
        return message;
      };

      addFormatter(shouldNotRunFormatter);
      addFormatter(shortCircuitFormatter);

      const result = formatValue("test");
      assert.strictEqual(result, "SHORT_CIRCUIT");

      // Clean up
      removeFormatter(shortCircuitFormatter);
      removeFormatter(shouldNotRunFormatter);
    });

    it("should apply built-in error formatter after custom formatters", () => {
      const stringToErrorFormatter: Formatter = (message: unknown, next?: Formatter) => {
        if (typeof message === "string") {
          return next ? next(new Error(message)) : new Error(message);
        }
        return next ? next(message) : message;
      };

      addFormatter(stringToErrorFormatter);
      const result = formatValue("test error message");

      const errorResult = result as { name: string; message: string; stack: string };
      assert.deepStrictEqual(errorResult, {
        name   : "Error",
        message: "test error message",
        stack  : errorResult.stack,
      });
      assert.ok(typeof errorResult.stack === "string");

      // Clean up
      removeFormatter(stringToErrorFormatter);
    });

    it("should handle complex object formatting chains", () => {
      const addTimestampFormatter: Formatter = (message: unknown, next?: Formatter) => {
        if (typeof message === "object" && message !== null && !Array.isArray(message)) {
          return next ? next({ ...message, timestamp: "2024-01-01T00:00:00.000Z" }) : { ...message, timestamp: "2024-01-01T00:00:00.000Z" };
        }
        return next ? next(message) : message;
      };

      const addLevelFormatter: Formatter = (message: unknown) => {
        if (typeof message === "object" && message !== null && !Array.isArray(message)) {
          return { ...message, level: "info" };
        }
        return message;
      };

      addFormatter(addLevelFormatter);
      addFormatter(addTimestampFormatter);

      const original = { message: "test log" };
      const result = formatValue(original);

      assert.deepStrictEqual(result, {
        message  : "test log",
        timestamp: "2024-01-01T00:00:00.000Z",
        level    : "info",
      });

      // Clean up
      removeFormatter(addTimestampFormatter);
      removeFormatter(addLevelFormatter);
    });
  });
});
