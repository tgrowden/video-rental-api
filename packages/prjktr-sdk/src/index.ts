import films from "./data";
import { FilmSearchParams, Film, searchFilms } from "sdk-lib";

export async function searchPrjktr(params: FilmSearchParams): Promise<Film[]> {
  if (params.excludeProjector) {
    return [];
  }

  return searchFilms(films, params);
}
