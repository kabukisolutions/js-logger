/**
 * A formatter is a function that takes a message and returns a formatted message.
 * The formatter can choose to pass the message (either as is or as a formatted message) to the next formatter in the chain, or to return a formatted message.
 * Once a formatter returns a formatted message, the message is no longer passed to the next formatter in the chain.
 * The last formatter in the chain is responsible for returning the final formatted message.
 * The system includes a few built-in formatters that can be short-circuited if one of the user formatters terminate the formatting process.
 * Formatters are called in a LIFO order, so that the last formatter in the chain is called first. This way, one may override the behavior of a previous formatter, including the built-in ones.
 */
export type Formatter = (message: unknown, next?: Formatter) => unknown;

const formatError: Formatter = (message: unknown, next?: Formatter) => {
  if (message instanceof Error) {
    return {
      name   : message.name,
      message: message.message,
      stack  : message.stack,
    };
  }
  return next ? next(message) : message;
};

const formatters: Formatter[] = [formatError];

/**
 * Adds a formatter to the user formatters chain. If tje formatter has been previously added, it is not added again.
 * @param formatter - The formatter to add.
 */
export const addFormatter = (formatter: Formatter) => {
  if (formatters.includes(formatter)) {
    return;
  }
  formatters.push(formatter);
};

export const removeFormatter = (formatter: Formatter) => {
  const index = formatters.indexOf(formatter);
  if (index !== -1) {
    formatters.splice(index, 1);
  }
};

/**
 * This is the the inner formatValue function that is called recursively to apply the formatters.
 * @returns
 */
const innerFormatValue = (message: unknown, offset: number): unknown => {
  const formatFn = formatters[offset - 1];
  if (formatFn) {
    const next = (msg: unknown) => innerFormatValue(msg, offset - 1);
    return formatFn(message, next);
  }
  return message;
};

/**
 * Given a single value, apply formatters until one of the formatters returns a formatted message.
 * @param message
 */
export const formatValue = (message: unknown) => {
  return innerFormatValue(message, formatters.length);
};
