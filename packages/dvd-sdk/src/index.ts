import films from "./data";
import { FilmSearchParams, Film, searchFilms } from "sdk-lib";

export async function searchDvd(params: FilmSearchParams): Promise<Film[]> {
  if (params.excludeDVD) {
    return [];
  }

  return searchFilms(films, params);
}
