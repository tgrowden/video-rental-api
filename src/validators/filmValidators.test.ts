import { describe, expect, it } from "vitest";
import { FilmSearchRequestParamsSchema } from "./filmValidators";

describe("FilmSearchRequestSchema", () => {
  it("Should pass when validating an empty object", () => {
    expect(() => {
      return FilmSearchRequestParamsSchema.parse({});
    }).not.toThrow();
  });

  it("Should fail validation when passed a `currentPage` less than 0", () => {
    expect(() => FilmSearchRequestParamsSchema.parse({ currentPage: -1 })).toThrow();
  });
});
