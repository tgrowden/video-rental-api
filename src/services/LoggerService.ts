import { Service } from "typedi";
import pino, { LogFn } from "pino";

@Service()
export default class LoggerService {
  private logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true
      }
    }
  });

  public info: LogFn = this.logger.info.bind(this.logger);

  public error: LogFn = this.logger.error.bind(this.logger);

  public warn: LogFn = this.logger.warn.bind(this.logger);

  public debug: LogFn = this.logger.debug.bind(this.logger);

  public trace: LogFn = this.logger.trace.bind(this.logger);

  public fatal: LogFn = this.logger.fatal.bind(this.logger);
}
