import { z } from "zod";

export const FilmSearchRequestParamsSchema = z.object({
  currentPage: z.number().min(0).default(0),
  pageSize: z.number().default(20),
  sortField: z.union([z.literal("title"), z.literal("releaseYear")]).default("title"),
  sortDirection: z.union([z.literal("ASC"), z.literal("DESC")]).default("ASC"),
  excludeVHS: z.boolean().default(false),
  excludeDVD: z.boolean().default(false),
  excludeProjector: z.boolean().default(false),
  search: z
    .object({
      title: z.string().optional(),
      releaseYear: z.number().optional(),
      director: z.string().optional(),
      distributor: z.string().optional()
    })
    .optional()
});

export type FilmSearchRequestParams = z.infer<typeof FilmSearchRequestParamsSchema>;
