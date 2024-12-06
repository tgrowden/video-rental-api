import { Service, Container } from "typedi";
import { Film } from "sdk-lib";
import shortHash from "short-hash";
import { searchPrjktr } from "prjktr-sdk";
import { searchDvd } from "dvd-sdk";
import { searchVhs } from "vhs-sdk";

import { getFilmKey } from "../utils/filmUtils";
import { FilmSearchRequestParams } from "../validators/filmValidators";
import RedisService from "./RedisService";

export interface FilmVersion {
  format: Film["format"];
  numberOfCopiesAvailable: Film["numberOfCopiesAvailable"];
}

export type FilmSearchResponse = (Pick<Film, "title" | "director" | "releaseYear" | "distributor"> & {
  versions: FilmVersion[];
})[];

interface FilmMediumService {
  fetch: null | ((params: FilmSearchRequestParams) => Promise<Film[]>);
  pointer: number;
  ended: boolean;
  lastFetchedCount: number;
}

@Service()
export default class FilmSearchService {
  private redisService: RedisService;

  private DELIMITER = "\uFFFF";

  private CHUNK_SIZE = 10;

  constructor() {
    this.redisService = Container.get(RedisService);
  }

  public getSearchId(params: FilmSearchRequestParams): string {
    return shortHash(JSON.stringify(params));
  }

  public async insertFilmResult({
    searchId,
    film,
    sortField
  }: {
    searchId: string;
    film: Film;
    sortField: "title" | "releaseYear";
  }): Promise<void> {
    const filmKey = getFilmKey(film);

    this.redisService.pipeline.hsetnx(`film:${filmKey}`, "title", film.title);
    this.redisService.pipeline.hsetnx(`film:${filmKey}`, "director", film.director);
    this.redisService.pipeline.hsetnx(`film:${filmKey}`, "distributor", film.distributor);
    this.redisService.pipeline.hsetnx(`film:${filmKey}`, "releaseYear", film.releaseYear.toString());

    this.redisService.pipeline.hsetnx(`film:${filmKey}`, `format:${film.format}`, film.numberOfCopiesAvailable);

    if (sortField === "releaseYear") {
      const score = film.releaseYear;
      this.redisService.pipeline.zadd(`search:${searchId}`, "NX", score, filmKey);
    } else {
      const member = `${film.title}${this.DELIMITER}${filmKey}`;
      this.redisService.pipeline.zadd(`search:${searchId}`, "NX", 0, member);
    }

    await this.redisService.pipeline.exec();
  }

  public async getFilmCount(searchId: string): Promise<number> {
    return this.redisService.redis.zcard(`search:${searchId}`);
  }

  public async fetchPage({
    searchId,
    sortDirection,
    sortField,
    currentPage,
    pageSize
  }: {
    searchId: string;
    sortField: "title" | "releaseYear";
    sortDirection: "ASC" | "DESC";
    currentPage: number;
    pageSize: number;
  }): Promise<FilmSearchResponse> {
    const startIndex = currentPage * pageSize;
    const sortAscending = sortDirection === "ASC";

    let members: string[] = [];
    if (sortField === "releaseYear") {
      if (sortAscending) {
        members = await this.redisService.redis.zrange(
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
        members = await this.redisService.redis.zrange(
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
        members = await this.redisService.redis.zrange(
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
        members = await this.redisService.redis.zrange(
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
        const index = member.indexOf(this.DELIMITER);
        if (index !== -1) {
          filmKey = member.substring(index + this.DELIMITER.length);
        }
      }

      const filmData = await this.redisService.redis.hgetall(`film:${filmKey}`);
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

  private async fetchAndInsertChunks({
    service,
    searchId,
    params
  }: {
    service: FilmMediumService;
    searchId: string;
    params: FilmSearchRequestParams;
  }) {
    if (service.fetch && !service.ended) {
      const newResults = await service.fetch({ ...params, pageSize: this.CHUNK_SIZE, currentPage: service.pointer });
      service.pointer++;
      service.lastFetchedCount = newResults.length;
      if (newResults.length === 0) {
        service.ended = true;
      } else {
        for (const film of newResults) {
          await this.insertFilmResult({
            searchId,
            film,
            sortField: params.sortField
          });
        }
      }
    }
  }

  public async searchFilms(params: FilmSearchRequestParams): Promise<FilmSearchResponse> {
    const searchId = this.getSearchId(params);
    const startIndex = params.pageSize * params.currentPage;
    const endIndex = startIndex + params.pageSize;

    const services: FilmMediumService[] = [
      { fetch: params.excludeVHS ? null : searchVhs, pointer: 0, ended: false, lastFetchedCount: 0 },
      { fetch: params.excludeDVD ? null : searchDvd, pointer: 0, ended: false, lastFetchedCount: 0 },
      { fetch: params.excludeProjector ? null : searchPrjktr, pointer: 0, ended: false, lastFetchedCount: 0 }
    ];

    for (const service of services) {
      await this.fetchAndInsertChunks({ service, searchId, params });
    }

    let totalFilms = await this.getFilmCount(searchId);

    while (totalFilms < endIndex) {
      let fetchedMore = false;
      for (const service of services) {
        if (service.fetch && !service.ended && service.lastFetchedCount !== 0) {
          await this.fetchAndInsertChunks({ service, searchId, params });
          fetchedMore = true;
        }
      }

      if (!fetchedMore) {
        break;
      }

      totalFilms = await this.getFilmCount(searchId);
    }

    const results = await this.fetchPage({ ...params, searchId });

    return results;
  }
}
