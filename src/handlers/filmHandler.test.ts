import { describe, it, expect, vi, afterEach } from "vitest";
import { searchDvd } from "dvd-sdk";
import { searchPrjktr } from "prjktr-sdk";
import { searchVhs } from "vhs-sdk";
import { Film } from "sdk-lib";

import { filmSearchHandler } from "./filmHandler";
import { FilmSearchRequestParams } from "../validators/filmValidators";

const DEFAULT_PARAMS: FilmSearchRequestParams = {
  currentPage: 0,
  pageSize: 10,
  excludeDVD: false,
  excludeProjector: false,
  excludeVHS: false,
  sortDirection: "ASC",
  sortField: "title"
};

const mocks = vi.hoisted(() => {
  const MOCK_FILMS: Omit<Film, "format" | "numberOfCopiesAvailable">[] = [
    {
      title: "b",
      director: "b",
      distributor: "b",
      releaseYear: 1966
    },
    {
      title: "z",
      director: "z",
      distributor: "z",
      releaseYear: 1990
    },
    {
      title: "a",
      director: "a",
      distributor: "a",
      releaseYear: 1965
    }
  ];

  return {
    MOCK_FILMS,
    searchVhs: vi.fn().mockResolvedValue(
      MOCK_FILMS.map((i) => ({
        ...i,
        format: "vhs",
        numberOfCopiesAvailable: 1
      }))
    ),
    searchPrjktr: vi.fn().mockResolvedValue(
      MOCK_FILMS.map((i) => ({
        ...i,
        format: "prjktr",
        numberOfCopiesAvailable: 1
      }))
    ),
    searchDvd: vi.fn().mockResolvedValue(
      MOCK_FILMS.map((i) => ({
        ...i,
        format: "dvd",
        numberOfCopiesAvailable: 1
      }))
    )
  };
});

vi.mock("dvd-sdk", () => {
  return {
    searchDvd: mocks.searchDvd
  };
});
vi.mock("vhs-sdk", () => {
  return {
    searchVhs: mocks.searchVhs
  };
});
vi.mock("prjktr-sdk", () => {
  return {
    searchPrjktr: mocks.searchPrjktr
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("filmSearchHandler()", () => {
  it("Should exclude DVD films when the `excludeDVD` option is true", async () => {
    await filmSearchHandler({ ...DEFAULT_PARAMS, excludeDVD: true });

    expect(searchDvd).not.toHaveBeenCalled();
  });

  it("Should exclude VHS films when the `excludeVHS` option is true", async () => {
    await filmSearchHandler({ ...DEFAULT_PARAMS, excludeVHS: true });

    expect(searchVhs).not.toHaveBeenCalled();
  });

  it("Should exclude Projector films when the `excludeProjector` option is true", async () => {
    await filmSearchHandler({ ...DEFAULT_PARAMS, excludeProjector: true });

    expect(searchPrjktr).not.toHaveBeenCalled();
  });

  it("Should sort films by appropriate fields in the correct order", async () => {
    await expect(filmSearchHandler({ ...DEFAULT_PARAMS, sortField: "title", sortDirection: "ASC" })).resolves.toEqual([
      expect.objectContaining({ title: "a" }),
      expect.objectContaining({ title: "b" }),
      expect.objectContaining({ title: "z" })
    ]);

    await expect(filmSearchHandler({ ...DEFAULT_PARAMS, sortField: "title", sortDirection: "DESC" })).resolves.toEqual([
      expect.objectContaining({ title: "z" }),
      expect.objectContaining({ title: "b" }),
      expect.objectContaining({ title: "a" })
    ]);

    await expect(
      filmSearchHandler({ ...DEFAULT_PARAMS, sortField: "releaseYear", sortDirection: "ASC" })
    ).resolves.toEqual([
      expect.objectContaining({ releaseYear: 1965 }),
      expect.objectContaining({ releaseYear: 1966 }),
      expect.objectContaining({ releaseYear: 1990 })
    ]);

    await expect(
      filmSearchHandler({ ...DEFAULT_PARAMS, sortField: "releaseYear", sortDirection: "DESC" })
    ).resolves.toEqual([
      expect.objectContaining({ releaseYear: 1990 }),
      expect.objectContaining({ releaseYear: 1966 }),
      expect.objectContaining({ releaseYear: 1965 })
    ]);
  });

  it("Should respect paging options", async () => {
    await expect(filmSearchHandler({ ...DEFAULT_PARAMS, pageSize: 2 })).resolves.toHaveLength(2);
  });

  it("Should not fail when paging is out-of-bounds", async () => {
    await expect(filmSearchHandler({ ...DEFAULT_PARAMS, currentPage: 9999 })).resolves.toHaveLength(0);
  });
});
