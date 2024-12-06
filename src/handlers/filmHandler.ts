import { Container } from "typedi";
import FilmSearchService from "../services/FilmSearchService";

import { FilmSearchRequestParams } from "../validators/filmValidators";

export async function filmSearchHandler(params: FilmSearchRequestParams): ReturnType<FilmSearchService["searchFilms"]> {
  const filmSearchService = Container.get(FilmSearchService);

  return filmSearchService.searchFilms(params);
}
