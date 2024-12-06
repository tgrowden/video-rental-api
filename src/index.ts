import "dotenv/config";
import "reflect-metadata";
import express, { Application } from "express";
import bodyParser from "body-parser";

import { Container } from "typedi";
import filmRouter from "./routers/filmRouter";
import LoggerService from "./services/LoggerService";
import RedisService from "./services/RedisService";
import FilmSearchService from "./services/FilmSearchService";

const app: Application = express();
const PORT = 3000;

function setServices(): void {
  Container.set(LoggerService, new LoggerService());
  Container.set(RedisService, new RedisService());
  Container.set(FilmSearchService, new FilmSearchService());
}

function start() {
  setServices();

  const logger = Container.get(LoggerService);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use("/films", filmRouter);

  try {
    app.listen(PORT, (): void => {
      logger.info(`Connected successfully on port ${PORT.toString()}`);
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error:`, error.message);
    } else {
      console.error(`Error:`, error);
    }
  }
}

start();
