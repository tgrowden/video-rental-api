import { Film } from "sdk-lib";

/**
 * @todo: determine if Film["distributor"] should be included in the comparison;
 * does it refer to the distributor of the film or of the film media?
 */
export const FILM_EQUALITY_KEYS = ["director", "releaseYear", "title", "distributor"] as const;

export function getFilmKey(film: Film): string {
  return FILM_EQUALITY_KEYS.map((key) => film[key]).join("-");
}

export function isSameFilm(film1: Film, film2: Film): boolean {
  return FILM_EQUALITY_KEYS.every((key) => film1[key] === film2[key]);
}
