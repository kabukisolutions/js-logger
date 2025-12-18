import { describe, it } from "node:test";
import * as assert from "node:assert";
import { transformValue, addTransformer, removeTransformer, type Transformer } from "./transform.js";

describe("transformers", () => {
  describe("transformValue", () => {
    it("should transform Error objects with name, message, and stack", () => {
      const error = new Error("test error");
      const transformed = transformValue(error);

      assert.deepStrictEqual(transformed, {
        name   : "Error",
        message: "test error",
        stack  : error.stack,
      });
    });

    it("should pass through non-Error objects unchanged", () => {
      const message = "simple string";
      const transformed = transformValue(message);
      assert.strictEqual(transformed, message);
    });

    it("should pass through objects unchanged", () => {
      const obj = { key: "value", number: 42 };
      const transformed = transformValue(obj);
      assert.deepStrictEqual(transformed, obj);
    });

    it("should pass through arrays unchanged", () => {
      const arr = [1, 2, "three"];
      const transformed = transformValue(arr);
      assert.deepStrictEqual(transformed, arr);
    });

    it("should pass through null and undefined unchanged", () => {
      assert.strictEqual(transformValue(null), null);
      assert.strictEqual(transformValue(undefined), undefined);
    });
  });

  describe("addTransformer", () => {
    it("should add a custom transformer to the chain", () => {
      const customTransformer: Transformer = (message: unknown) => {
        if (typeof message === "string") {
          return message.toUpperCase();
        }
        return message;
      };

      addTransformer(customTransformer);
      const result = transformValue("hello world");
      assert.strictEqual(result, "HELLO WORLD");

      removeTransformer(customTransformer);
    });

    it("should not add the same transformer twice", () => {
      const customTransformer: Transformer = (message: unknown) => {
        if (typeof message === "string") {
          return `PREFIX_${message}`;
        }
        return message;
      };

      addTransformer(customTransformer);
      addTransformer(customTransformer); // Should be ignored

      const result = transformValue("test");
      assert.strictEqual(result, "PREFIX_test");

      removeTransformer(customTransformer);
    });

    it("should apply transformers in LIFO order", () => {
      const transformer1: Transformer = (message: unknown) => {
        if (typeof message === "string") {
          return `${message}_1`;
        }
        return message;
      };

      const transformer2: Transformer = (message: unknown) => {
        if (typeof message === "string") {
          return `${message}_2`;
        }
        return message;
      };

      addTransformer(transformer1);
      addTransformer(transformer2);

      const result = transformValue("test");
      assert.strictEqual(result, "test_2");

      removeTransformer(transformer1);
      removeTransformer(transformer2);
    });
  });

  describe("removeFormatter", () => {
    it("should remove a formatter from the chain", () => {
      const customFormatter: Transformer = (message: unknown) => {
        if (typeof message === "string") {
          return `FORMATTED_${message}`;
        }
        return message;
      };

      addTransformer(customFormatter);
      let result = transformValue("test");
      assert.strictEqual(result, "FORMATTED_test");

      removeTransformer(customFormatter);
      result = transformValue("test");
      assert.strictEqual(result, "test");
    });

    it("should handle removing a formatter that doesn't exist", () => {
      const transformer1: Transformer = () => "never added";
      const transformer2: Transformer = () => "also never added";

      // Should not throw
      removeTransformer(transformer1);
      removeTransformer(transformer2);
    });
  });

  describe("transformer chain behavior", () => {
    it("should allow transformers to call next transformer", () => {
      const upperCaseFormatter: Transformer = (message: unknown, next?: Transformer) => {
        if (typeof message === "string") {
          return next ? next(message.toUpperCase()) : message.toUpperCase();
        }
        return next ? next(message) : message;
      };

      const addPrefixFormatter: Transformer = (message: unknown) => {
        if (typeof message === "string") {
          return `PREFIX_${message}`;
        }
        return message;
      };

      addTransformer(addPrefixFormatter);
      addTransformer(upperCaseFormatter);

      const result = transformValue("hello");
      assert.strictEqual(result, "PREFIX_HELLO");

      removeTransformer(upperCaseFormatter);
      removeTransformer(addPrefixFormatter);
    });

    it("should allow transformers to short-circuit the chain", () => {
      const shortCircuitFormatter: Transformer = (message: unknown) => {
        if (typeof message === "string") {
          return "SHORT_CIRCUIT";
        }
        return message;
      };

      const shouldNotRunFormatter: Transformer = (message: unknown) => {
        if (typeof message === "string") {
          return "SHOULD_NOT_RUN";
        }
        return message;
      };

      addTransformer(shouldNotRunFormatter);
      addTransformer(shortCircuitFormatter);

      const result = transformValue("test");
      assert.strictEqual(result, "SHORT_CIRCUIT");

      removeTransformer(shortCircuitFormatter);
      removeTransformer(shouldNotRunFormatter);
    });

    it("should apply built-in error transformer after custom transformers", () => {
      const stringToErrorFormatter: Transformer = (message: unknown, next?: Transformer) => {
        if (typeof message === "string") {
          return next ? next(new Error(message)) : new Error(message);
        }
        return next ? next(message) : message;
      };

      addTransformer(stringToErrorFormatter);
      const result = transformValue("test error message");

      const errorResult = result as { name: string; message: string; stack: string };
      assert.deepStrictEqual(errorResult, {
        name   : "Error",
        message: "test error message",
        stack  : errorResult.stack,
      });
      assert.ok(typeof errorResult.stack === "string");

      removeTransformer(stringToErrorFormatter);
    });

    it("should handle complex object transformation chains", () => {
      const addTimestampFormatter: Transformer = (message: unknown, next?: Transformer) => {
        if (typeof message === "object" && message !== null && !Array.isArray(message)) {
          return next ? next({ ...message, timestamp: "2024-01-01T00:00:00.000Z" }) : { ...message, timestamp: "2024-01-01T00:00:00.000Z" };
        }
        return next ? next(message) : message;
      };

      const addLevelFormatter: Transformer = (message: unknown) => {
        if (typeof message === "object" && message !== null && !Array.isArray(message)) {
          return { ...message, level: "info" };
        }
        return message;
      };

      addTransformer(addLevelFormatter);
      addTransformer(addTimestampFormatter);

      const original = { message: "test log" };
      const result = transformValue(original);

      assert.deepStrictEqual(result, {
        message  : "test log",
        timestamp: "2024-01-01T00:00:00.000Z",
        level    : "info",
      });

      removeTransformer(addTimestampFormatter);
      removeTransformer(addLevelFormatter);
    });
  });
});
