import { Service, Container } from "typedi";
import Redis, { ChainableCommander } from "ioredis";

import LoggerService from "./LoggerService";

@Service()
export default class RedisService {
  public redis: Redis;

  public pipeline: ChainableCommander;

  private logger: LoggerService;

  private redisOptions = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT, 10) : undefined,
    password: process.env.REDIS_PASSWORD
  };

  constructor() {
    this.logger = Container.get(LoggerService);

    this.redis = new Redis(this.redisOptions).on("connect", () => {
      this.logger.info("Connected to Redis");
      this.logger.debug(this.redisOptions, `Redis options`);
    });

    this.pipeline = this.redis.pipeline();
  }
}
