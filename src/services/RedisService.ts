import { Service } from "typedi";
import Redis, { ChainableCommander } from "ioredis";

@Service()
export default class RedisService {
  public redis: Redis;

  public pipeline: ChainableCommander;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT, 10) : undefined,
      password: process.env.REDIS_PASSWORD
    });

    this.pipeline = this.redis.pipeline();
  }
}
