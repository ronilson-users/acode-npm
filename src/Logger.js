class Logger {
  static error(message, context) {
    console.error(`ERROR: ${message}`, context);
  }

  static warn(message, context) {
    console.warn(`WARN: ${message}`, context);
  }

  static info(message, context) {
    console.info(`INFO: ${message}`, context);
  }

  static debug(message, context) {
    console.debug(`DEBUG: ${message}`, context);
  }
}

export default Logger;