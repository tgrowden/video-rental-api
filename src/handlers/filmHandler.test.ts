import { Container } from "typedi";
import { describe, it, expect, vi, beforeEach, Mocked } from "vitest";
import FilmSearchService from "../services/FilmSearchService";

import { filmSearchHandler } from "./filmHandler";
import { FilmSearchRequestParams } from "../validators/filmValidators";

const MockFilmSearchService = {
  searchFilms: vi.fn().mockResolvedValue([])
};

let filmSearchService: Mocked<FilmSearchService>;

beforeEach(() => {
  Container.set(FilmSearchService, MockFilmSearchService);
  filmSearchService = Container.get(FilmSearchService) as Mocked<FilmSearchService>;
});

const DEFAULT_PARAMS: FilmSearchRequestParams = {
  currentPage: 0,
  pageSize: 10,
  excludeDVD: false,
  excludeProjector: false,
  excludeVHS: false,
  sortDirection: "ASC",
  sortField: "title"
};

describe("filmSearchHandler()", () => {
  it("Should call FilmSearchService.searchFilms() with the provided params", async () => {
    await filmSearchHandler(DEFAULT_PARAMS);

    expect(filmSearchService.searchFilms).toHaveBeenCalledWith(DEFAULT_PARAMS);
  });
});
