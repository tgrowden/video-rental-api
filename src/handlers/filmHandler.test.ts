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
  const MOCK_FILMS: Record<"dvd" | "vhs" | "prjktr", Film[]> = {
    dvd: [
      {
        title: "airplane",
        director: "",
        releaseYear: 1975,
        distributor: "Universal Pictures",
        numberOfCopiesAvailable: 4,
        format: "dvd"
      },

      {
        title: "gladiator",
        director: "",
        releaseYear: 1980,
        distributor: "Warner Bros.",
        numberOfCopiesAvailable: 5,
        format: "dvd"
      },
      {
        title: "deer hunter",
        director: "",
        releaseYear: 1977,
        distributor: "20th Century Fox",
        numberOfCopiesAvailable: 3,
        format: "dvd"
      },
      {
        title: "alien",
        director: "",
        releaseYear: 1972,
        distributor: "Paramount Pictures",
        numberOfCopiesAvailable: 6,
        format: "dvd"
      },
      {
        title: "revenge of the nerds",
        director: "",
        releaseYear: 1982,
        distributor: "Universal Pictures",
        numberOfCopiesAvailable: 7,
        format: "dvd"
      }
    ],
    vhs: [
      {
        title: "revenge of the nerds",
        director: "",
        releaseYear: 1982,
        distributor: "Universal Pictures",
        numberOfCopiesAvailable: 4,
        format: "vhs"
      },
      {
        title: "gladiator",
        director: "",
        releaseYear: 1980,
        distributor: "Warner Bros.",
        numberOfCopiesAvailable: 5,
        format: "vhs"
      },
      {
        title: "deer hunter",
        director: "",
        releaseYear: 1977,
        distributor: "20th Century Fox",
        numberOfCopiesAvailable: 3,
        format: "vhs"
      },
      {
        title: "good will hunting",
        director: "",
        releaseYear: 1977,
        distributor: "20th Century Fox",
        numberOfCopiesAvailable: 2,
        format: "vhs"
      }
    ],
    prjktr: [
      {
        title: "gladiator",
        director: "",
        releaseYear: 1980,
        distributor: "Warner Bros.",
        numberOfCopiesAvailable: 2,
        format: "prjktr"
      },
      {
        title: "revenge of the nerds",
        director: "",
        releaseYear: 1982,
        distributor: "Universal Pictures",
        numberOfCopiesAvailable: 7,
        format: "prjktr"
      }
    ]
  };

  return {
    MOCK_FILMS,
    searchVhs: vi.fn().mockResolvedValue(MOCK_FILMS.vhs),
    searchPrjktr: vi.fn().mockResolvedValue(MOCK_FILMS.prjktr),
    searchDvd: vi.fn().mockResolvedValue(MOCK_FILMS.dvd)
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
      expect.objectContaining({ title: "airplane" }),
      expect.objectContaining({ title: "alien" }),
      expect.objectContaining({ title: "deer hunter" }),
      expect.objectContaining({ title: "gladiator" }),
      expect.objectContaining({ title: "good will hunting" }),
      expect.objectContaining({ title: "revenge of the nerds" })
    ]);

    await expect(filmSearchHandler({ ...DEFAULT_PARAMS, sortField: "title", sortDirection: "DESC" })).resolves.toEqual([
      expect.objectContaining({ title: "revenge of the nerds" }),
      expect.objectContaining({ title: "good will hunting" }),
      expect.objectContaining({ title: "gladiator" }),
      expect.objectContaining({ title: "deer hunter" }),
      expect.objectContaining({ title: "alien" }),
      expect.objectContaining({ title: "airplane" })
    ]);

    await expect(
      filmSearchHandler({ ...DEFAULT_PARAMS, sortField: "releaseYear", sortDirection: "ASC" })
    ).resolves.toEqual([
      expect.objectContaining({ releaseYear: 1972 }),
      expect.objectContaining({ releaseYear: 1975 }),
      expect.objectContaining({ releaseYear: 1977 }),
      expect.objectContaining({ releaseYear: 1977 }),
      expect.objectContaining({ releaseYear: 1980 }),
      expect.objectContaining({ releaseYear: 1982 })
    ]);

    await expect(
      filmSearchHandler({ ...DEFAULT_PARAMS, sortField: "releaseYear", sortDirection: "DESC" })
    ).resolves.toEqual([
      expect.objectContaining({ releaseYear: 1982 }),
      expect.objectContaining({ releaseYear: 1980 }),
      expect.objectContaining({ releaseYear: 1977 }),
      expect.objectContaining({ releaseYear: 1977 }),
      expect.objectContaining({ releaseYear: 1975 }),
      expect.objectContaining({ releaseYear: 1972 })
    ]);
  });

  it("Should respect paging options", async () => {
    await expect(filmSearchHandler({ ...DEFAULT_PARAMS, pageSize: 2 })).resolves.toHaveLength(2);
  });

  it("Should not fail when paging is out-of-bounds", async () => {
    await expect(filmSearchHandler({ ...DEFAULT_PARAMS, currentPage: 9999 })).resolves.toHaveLength(0);
  });

  it("Should properly handle paging", async () => {
    await expect(
      filmSearchHandler({ ...DEFAULT_PARAMS, pageSize: 2, sortField: "title", currentPage: 0 })
    ).resolves.toEqual([expect.objectContaining({ title: "airplane" }), expect.objectContaining({ title: "alien" })]);

    await expect(
      filmSearchHandler({ ...DEFAULT_PARAMS, pageSize: 2, sortField: "title", currentPage: 1 })
    ).resolves.toEqual([
      expect.objectContaining({ title: "deer hunter" }),
      expect.objectContaining({ title: "gladiator" })
    ]);

    await expect(
      filmSearchHandler({ ...DEFAULT_PARAMS, pageSize: 2, sortField: "title", currentPage: 2 })
    ).resolves.toEqual([
      expect.objectContaining({ title: "good will hunting" }),
      expect.objectContaining({ title: "revenge of the nerds" })
    ]);
  });
});
