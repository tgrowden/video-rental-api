import express, { Request, Response } from "express";

import { FilmSearchRequestParamsSchema } from "../validators/filmValidators";
import { filmSearchHandler } from "../handlers/filmHandler";

const filmRouter = express.Router();

filmRouter.post("/", async (req: Request, res: Response) => {
  const params = FilmSearchRequestParamsSchema.safeParse(req.body);

  if (!params.success) {
    res.status(400).json(params.error);
  } else {
    console.log(params.data);
    const response = await filmSearchHandler(params.data);
    res.json(response);
  }
});

export default filmRouter;
