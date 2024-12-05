import { searchPrjktr } from "prjktr-sdk";
import { searchDvd } from "dvd-sdk";
import { searchVhs } from "vhs-sdk";
import { Film } from "sdk-lib";
import { FilmSearchRequestParams } from "../validators/filmValidators";
import { PriorityQueue } from "../utils/PriorityQueue";
import { getFilmKey } from "../utils/filmUtils";

interface FilmVersion {
  format: Film["format"];
  numberOfCopiesAvailable: Film["numberOfCopiesAvailable"];
}

export type FilmSearchResponse = (Pick<Film, "title" | "director" | "releaseYear" | "distributor"> & {
  versions: FilmVersion[];
})[];

interface Service {
  fetch: null | ((params: FilmSearchRequestParams) => Promise<Film[]>);
  pointer: number;
  ended: boolean;
  lastFetchedCount: number;
}

const CHUNK_SIZE = 10;

export async function filmSearchHandler(params: FilmSearchRequestParams): Promise<FilmSearchResponse> {
  const startIndex = params.pageSize * params.currentPage;
  const endIndex = startIndex + params.pageSize;

  const services: Service[] = [
    { fetch: params.excludeVHS ? null : searchVhs, pointer: 0, ended: false, lastFetchedCount: 0 },
    { fetch: params.excludeDVD ? null : searchDvd, pointer: 0, ended: false, lastFetchedCount: 0 },
    { fetch: params.excludeProjector ? null : searchPrjktr, pointer: 0, ended: false, lastFetchedCount: 0 }
  ];

  const priorityQueue = new PriorityQueue<Film>((a, b) => {
    switch (params.sortField) {
      case "releaseYear":
        return params.sortDirection === "ASC" ? a.releaseYear - b.releaseYear : b.releaseYear - a.releaseYear;
      case "title":
      default:
        return params.sortDirection === "ASC" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    }
  });

  const filmMap = new Map<string, FilmSearchResponse[number]>();

  let globalCount = 0;

  const results: FilmSearchResponse = [];

  async function fetchChunksIfNeeded(): Promise<void> {
    if (!priorityQueue.isEmpty()) return;

    for (const service of services) {
      if (service.fetch && !service.ended && service.lastFetchedCount !== 0) {
        const newResults = await service.fetch({ ...params, pageSize: CHUNK_SIZE, currentPage: service.pointer });
        service.pointer++;
        service.lastFetchedCount = newResults.length;

        if (newResults.length === 0) {
          service.ended = true;
        } else {
          for (const film of newResults) {
            priorityQueue.enqueue(film);
          }
        }
      }
    }
  }

  for (const service of services) {
    if (service.fetch && !service.ended) {
      const initialData = await service.fetch({ ...params, pageSize: CHUNK_SIZE, currentPage: service.pointer });
      service.pointer++;
      service.lastFetchedCount = initialData.length;
      if (initialData.length === 0) {
        service.ended = true;
      } else {
        for (const film of initialData) {
          priorityQueue.enqueue(film);
        }
      }
    }
  }

  while (results.length < params.pageSize) {
    if (priorityQueue.isEmpty()) {
      await fetchChunksIfNeeded();
      if (priorityQueue.isEmpty()) {
        break;
      }
    }

    // we know this is non-null
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const nextFilm = priorityQueue.dequeue()!;
    const filmKey = getFilmKey(nextFilm);

    const existingFilm = filmMap.get(filmKey);
    if (!existingFilm) {
      globalCount++;
      if (globalCount <= startIndex) {
        filmMap.set(filmKey, {
          title: nextFilm.title,
          director: nextFilm.director,
          releaseYear: nextFilm.releaseYear,
          distributor: nextFilm.distributor,
          versions: [
            {
              format: nextFilm.format,
              numberOfCopiesAvailable: nextFilm.numberOfCopiesAvailable
            }
          ]
        });
      } else if (globalCount > endIndex) {
        filmMap.set(filmKey, {
          title: nextFilm.title,
          director: nextFilm.director,
          releaseYear: nextFilm.releaseYear,
          distributor: nextFilm.distributor,
          versions: [
            {
              format: nextFilm.format,
              numberOfCopiesAvailable: nextFilm.numberOfCopiesAvailable
            }
          ]
        });
        break;
      } else {
        const newEntry = {
          title: nextFilm.title,
          director: nextFilm.director,
          releaseYear: nextFilm.releaseYear,
          distributor: nextFilm.distributor,
          versions: [
            {
              format: nextFilm.format,
              numberOfCopiesAvailable: nextFilm.numberOfCopiesAvailable
            }
          ]
        };
        filmMap.set(filmKey, newEntry);
        results.push(newEntry);

        if (results.length === params.pageSize) {
          break;
        }
      }
    } else {
      const existingVersion = existingFilm.versions.find((v) => v.format === nextFilm.format);
      if (existingVersion) {
        existingVersion.numberOfCopiesAvailable += nextFilm.numberOfCopiesAvailable;
      } else {
        existingFilm.versions.push({
          format: nextFilm.format,
          numberOfCopiesAvailable: nextFilm.numberOfCopiesAvailable
        });
      }
    }
  }

  return results;
}
