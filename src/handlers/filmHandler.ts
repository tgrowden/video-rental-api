import { searchPrjktr } from "prjktr-sdk";
import { searchDvd } from "dvd-sdk";
import { searchVhs } from "vhs-sdk";
import { Film } from "sdk-lib";

import { FilmSearchRequestParams } from "../validators/filmValidators";
import { mergeSort } from "../lib/mergeSort";
import { getFilmKey } from "../utils/filmUtils";

interface FilmVersion {
  format: Film["format"];
  numberOfCopiesAvailable: Film["numberOfCopiesAvailable"];
}

export type FilmSearchResponse = (Pick<Film, "title" | "director" | "releaseYear" | "distributor"> & {
  versions: FilmVersion[];
})[];

export async function filmSearchHandler(params: FilmSearchRequestParams): Promise<FilmSearchResponse> {
  const vhsFilms = await searchVhs(params);
  const dvdFilms = await searchDvd(params);
  const prjktrFilms = await searchPrjktr(params);

  const allFilms = [...vhsFilms, ...dvdFilms, ...prjktrFilms];

  const filmMap = new Map<string, FilmSearchResponse[number]>();

  for (const film of allFilms) {
    const key = getFilmKey(film);

    const existingFilm = filmMap.get(key);

    if (existingFilm) {
      const existingVersion = existingFilm.versions.find((version) => version.format === film.format);
      if (existingVersion) {
        /**
         * @todo: validate data integrity: determine if the number of copies should be summed or if another way
         * of handling this is more appropriate
         */
        existingVersion.numberOfCopiesAvailable += film.numberOfCopiesAvailable;
      } else {
        existingFilm.versions.push({
          format: film.format,
          numberOfCopiesAvailable: film.numberOfCopiesAvailable
        });
      }
      filmMap.set(key, { ...existingFilm });
    } else {
      filmMap.set(key, {
        title: film.title,
        director: film.director,
        releaseYear: film.releaseYear,
        distributor: film.distributor,
        versions: [
          {
            format: film.format,
            numberOfCopiesAvailable: film.numberOfCopiesAvailable
          }
        ]
      });
    }
  }

  const result = mergeSort(Array.from(filmMap.values()), (a, b) => {
    switch (params.sortField) {
      case "releaseYear":
        return params.sortDirection === "ASC" ? a.releaseYear - b.releaseYear : b.releaseYear - a.releaseYear;
      case "title":
      default:
        return params.sortDirection === "ASC" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    }
  }).slice(params.currentPage * params.pageSize, params.pageSize * (params.currentPage + 1));

  return result;
}
