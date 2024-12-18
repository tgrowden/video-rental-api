import { FilmSearchParams, Film } from "./typeDefinitions";

export type SearchFilmsOptions = Pick<
  FilmSearchParams,
  "search" | "currentPage" | "pageSize" | "sortDirection" | "sortField"
>;

/**
 * A function for searching from a list of films.
 * Ideally, this would be handled by the data-store; this is just a placeholder-implementation, as
 * the requirements state that these functions are already implemented.
 */
export function searchFilms(films: Film[], opts: SearchFilmsOptions): Promise<Film[]> {
  let result = films;

  if (opts.search?.director || opts.search?.distributor || opts.search?.releaseYear || opts.search?.title) {
    result = films.filter((film) => {
      return (
        (!opts.search?.director || film.director === opts.search.director) &&
        (!opts.search?.distributor || film.distributor === opts.search.distributor) &&
        (!opts.search?.releaseYear || film.releaseYear === opts.search.releaseYear) &&
        /**
         * This assumes some sort of autocomplete has been implemented client-side and that
         * exact strings are being passed
         *
         * @todo check if this is desired
         */
        (!opts.search?.title || film.title === opts.search.title)
      );
    });
  }

  result = result.sort((a, b) => {
    switch (opts.sortField) {
      case "releaseYear":
        return opts.sortDirection === "ASC" ? a.releaseYear - b.releaseYear : b.releaseYear - a.releaseYear;
      case "title":
      default:
        return opts.sortDirection === "ASC" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    }
  });

  const startIndex = opts.pageSize * opts.currentPage;
  const endIndex = startIndex + opts.pageSize;

  result = result.slice(startIndex, endIndex);
  return new Promise((resolve) => {
    resolve(result);
  });
}
