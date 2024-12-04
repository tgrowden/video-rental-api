export interface Film {
  /**
   * The title of the film
   */
  title: string;

  /**
   * The director of the film
   */
  director: string;

  /**
   * The year the film was released in the given format
   */
  releaseYear: number;

  /**
   * The distributor of the film type
   */
  distributor: string;

  /**
   * the number available to rent for the given format
   */
  numberOfCopiesAvailable: number;

  /**
   * The film's format
   */
  format: "vhs" | "dvd" | "prjktr";
}

export interface FilmSearchParams {
  currentPage: number;
  pageSize: number;
  sortField: "title" | "releaseYear";
  sortDirection: "ASC" | "DESC";
  excludeVHS?: boolean;
  excludeDVD?: boolean;
  excludeProjector?: boolean;
  search?: {
    title?: string;
    releaseYear?: number;
    director?: string;
    distributor?: string;
  };
}
