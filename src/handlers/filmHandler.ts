import Redis from "ioredis";
import { searchPrjktr } from "prjktr-sdk";
import { searchDvd } from "dvd-sdk";
import { searchVhs } from "vhs-sdk";
import { Film } from "sdk-lib";
import shortHash from "short-hash";

import { FilmSearchRequestParams } from "../validators/filmValidators";
import { getFilmKey } from "../utils/filmUtils";

interface Service {
  fetch: null | ((params: FilmSearchRequestParams) => Promise<Film[]>);
  pointer: number;
  ended: boolean;
  lastFetchedCount: number;
}

interface FilmVersion {
  format: Film["format"];
  numberOfCopiesAvailable: Film["numberOfCopiesAvailable"];
}

export type FilmSearchResponse = (Pick<Film, "title" | "director" | "releaseYear" | "distributor"> & {
  versions: FilmVersion[];
})[];

const CHUNK_SIZE = 10;

/**
 * @todo: abstract this into a separate module so that
 * it can A) be mocked and B) cache can be invalidated
 * upon new/changed data
 */
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? Number.parseInt(process.env.REDIS_PORT, 10) : undefined,
  password: process.env.REDIS_PASSWORD
});

const DELIMITER = "\uFFFF";

async function insertFilmResult(searchId: string, film: Film, sortField: "title" | "releaseYear"): Promise<void> {
  const filmKey = getFilmKey(film);

  const pipeline = redis.multi();

  pipeline.hsetnx(`film:${filmKey}`, "title", film.title);
  pipeline.hsetnx(`film:${filmKey}`, "director", film.director);
  pipeline.hsetnx(`film:${filmKey}`, "distributor", film.distributor);
  pipeline.hsetnx(`film:${filmKey}`, "releaseYear", film.releaseYear.toString());

  pipeline.hincrby(`film:${filmKey}`, `format:${film.format}`, film.numberOfCopiesAvailable);

  if (sortField === "releaseYear") {
    const score = film.releaseYear;
    pipeline.zadd(`search:${searchId}`, "NX", score, filmKey);
  } else {
    const member = `${film.title}${DELIMITER}${filmKey}`;
    pipeline.zadd(`search:${searchId}`, "NX", 0, member);
  }

  await pipeline.exec();
}

async function getFilmCount(searchId: string): Promise<number> {
  return redis.zcard(`search:${searchId}`);
}

async function fetchPage(
  searchId: string,
  sortField: "title" | "releaseYear",
  sortDirection: "ASC" | "DESC",
  currentPage: number,
  pageSize: number
): Promise<FilmSearchResponse> {
  const startIndex = currentPage * pageSize;
  const sortAscending = sortDirection === "ASC";

  let members: string[] = [];

  if (sortField === "releaseYear") {
    if (sortAscending) {
      members = await redis.zrange(
        `search:${searchId}`,
        0,
        0,
        // @ts-expect-error this is fine
        "BYSCORE",
        "-",
        "+",
        "LIMIT",
        startIndex.toString(),
        pageSize.toString()
      );
    } else {
      // @ts-expect-error this is fine
      members = await redis.zrange(
        `search:${searchId}`,
        0,
        0,
        "BYSCORE",
        "+",
        "-",
        "REV",
        "LIMIT",
        startIndex.toString(),
        pageSize.toString()
      );
    }
  } else {
    // Sort by title using lex range
    if (sortAscending) {
      members = await redis.zrange(
        `search:${searchId}`,
        "-",
        "+",
        "BYLEX",
        "LIMIT",
        startIndex.toString(),
        pageSize.toString()
      );
    } else {
      // DESC
      members = await redis.zrange(
        `search:${searchId}`,
        "+",
        "-",
        "BYLEX",
        "REV",
        "LIMIT",
        startIndex.toString(),
        pageSize.toString()
      );
    }
  }

  const results: FilmSearchResponse = [];

  for (const member of members) {
    let filmKey = member;
    if (sortField === "title") {
      const index = member.indexOf(DELIMITER);
      if (index !== -1) {
        filmKey = member.substring(index + DELIMITER.length);
      }
    }

    const filmData = await redis.hgetall(`film:${filmKey}`);
    const { title, director, distributor, releaseYear, ...rest } = filmData;
    const versions: FilmVersion[] = [];

    for (const [k, v] of Object.entries(rest)) {
      if (k.startsWith("format:")) {
        const fmt = k.split(":")[1] as Film["format"];
        versions.push({
          format: fmt,
          numberOfCopiesAvailable: Number.parseInt(v, 10)
        });
      }
    }

    results.push({
      title,
      director,
      releaseYear: Number.parseInt(releaseYear, 10),
      distributor,
      versions
    });
  }

  return results;
}

function getSearchId(params: FilmSearchRequestParams): string {
  return shortHash(JSON.stringify(params));
}

export async function filmSearchHandler(params: FilmSearchRequestParams): Promise<FilmSearchResponse> {
  const searchId = getSearchId(params);
  const startIndex = params.pageSize * params.currentPage;
  const endIndex = startIndex + params.pageSize;

  const services: Service[] = [
    { fetch: params.excludeVHS ? null : searchVhs, pointer: 0, ended: false, lastFetchedCount: 0 },
    { fetch: params.excludeDVD ? null : searchDvd, pointer: 0, ended: false, lastFetchedCount: 0 },
    { fetch: params.excludeProjector ? null : searchPrjktr, pointer: 0, ended: false, lastFetchedCount: 0 }
  ];

  async function fetchAndInsertChunks(service: Service) {
    if (service.fetch && !service.ended) {
      const newResults = await service.fetch({ ...params, pageSize: CHUNK_SIZE, currentPage: service.pointer });
      service.pointer++;
      service.lastFetchedCount = newResults.length;
      if (newResults.length === 0) {
        service.ended = true;
      } else {
        for (const film of newResults) {
          await insertFilmResult(searchId, film, params.sortField);
        }
      }
    }
  }

  for (const service of services) {
    await fetchAndInsertChunks(service);
  }

  let totalFilms = await getFilmCount(searchId);

  while (totalFilms < endIndex) {
    let fetchedMore = false;
    for (const service of services) {
      if (service.fetch && !service.ended && service.lastFetchedCount !== 0) {
        await fetchAndInsertChunks(service);
        fetchedMore = true;
      }
    }

    if (!fetchedMore) {
      break;
    }

    totalFilms = await getFilmCount(searchId);
  }

  const results = await fetchPage(
    searchId,
    params.sortField,
    params.sortDirection,
    params.currentPage,
    params.pageSize
  );
  return results;
}
