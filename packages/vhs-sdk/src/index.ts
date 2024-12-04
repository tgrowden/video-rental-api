import films from "./data";
import { FilmSearchParams, Film, searchFilms } from "sdk-lib";

export async function searchVhs(params: FilmSearchParams): Promise<Film[]> {
  if (params.excludeVHS) {
    return [];
  }

  return searchFilms(films, params);
}
