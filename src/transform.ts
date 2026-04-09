/**
 * A transformer is a function that takes a message and returns a transformed message.
 * The transformer can choose to pass the message (either as is or as a transformed message) to the next transformer in the chain, or to return a transformed message.
 * Once a formatter returns a formatted message, the message is no longer passed to the next formatter in the chain.
 * The last transformer in the chain is responsible for returning the final transformed message.
 * The system includes a few built-in transformers that can be short-circuited if one of the user transformers terminate the transformation process.
 * Transformers are called in a LIFO order, so that the last transformer in the chain is called first. This way, one may override the behavior of a previous transformer, including the built-in ones.
 */
export type Transformer = (message: unknown, next?: Transformer) => unknown;

/**
 * Transform incoming Error objects into plain objects that contain all the properties of the Error object, including
 * the non-enumerable ones. All other types pass through unchanged.
 *
 * @param message - The message to transform. This may or may not be an Error object.
 * @param next - The next transformer in the chain. Optional.
 * @returns The transformed message.
 */
const transformAnError: Transformer = (message: unknown, next?: Transformer) => {
  if (message instanceof Error) {
    const errLike = message as Record<string, unknown> & Partial<Pick<Error, "stack" | "name" | "message">>;
    const transformed = {
      ...errLike,
      stack  : errLike.stack,
      name   : errLike.name,
      message: errLike.message,
    };
    return next ? next(transformed) : transformed;
  }

  return next ? next(message) : message;
};

const transformers: Transformer[] = [transformAnError];

/**
 * Adds a formatter to the user formatters chain. If tje formatter has been previously added, it is not added again.
 * @param formatter - The formatter to add.
 */
export const addTransformer = (transformer: Transformer) => {
  if (transformers.includes(transformer)) {
    return;
  }
  transformers.push(transformer);
};

export const removeTransformer = (transformer: Transformer) => {
  const index = transformers.indexOf(transformer);
  if (index !== -1) {
    transformers.splice(index, 1);
  }
};

/**
 * This is the the inner transformValue function that is called recursively to apply the transformers.
 * @returns
 */
const innerTransformValue = (message: unknown, offset: number): unknown => {
  const transformFn = transformers[offset - 1];
  if (transformFn) {
    const next = (msg: unknown) => innerTransformValue(msg, offset - 1);
    return transformFn(message, next);
  }
  return message;
};

/**
 * Given a single value, apply transformers until one of the transformers returns a transformed message.
 * @param message
 */
export const transformValue = (message: unknown) => {
  return innerTransformValue(message, transformers.length);
};
