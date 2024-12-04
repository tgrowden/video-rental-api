import express, { Application } from "express";
import bodyParser from "body-parser";
import filmRouter from "./routers/filmRouter";

const app: Application = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/films", filmRouter);

try {
  app.listen(PORT, (): void => {
    console.log(`Connected successfully on port ${PORT.toString()}`);
  });
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(`Error:`, error.message);
  } else {
    console.error(`Error:`, error);
  }
}
