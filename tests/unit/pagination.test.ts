import { describe, expect, it } from "vitest";
import { buildMeta, parseListQuery, toOrderBy } from "@/lib/http/pagination";

function params(record: Record<string, string>): URLSearchParams {
  return new URLSearchParams(record);
}

describe("parseListQuery", () => {
  it("applies defaults when no params are provided", () => {
    const query = parseListQuery(params({}));
    expect(query).toMatchObject({ page: 1, pageSize: 20, skip: 0, take: 20, q: "", order: "desc" });
  });

  it("computes skip from page and pageSize", () => {
    expect(parseListQuery(params({ page: "3", pageSize: "10" }))).toMatchObject({ skip: 20, take: 10 });
  });

  it("clamps pageSize and ignores invalid pages", () => {
    expect(parseListQuery(params({ pageSize: "5000" })).pageSize).toBe(100);
    expect(parseListQuery(params({ page: "-4" })).page).toBe(1);
    expect(parseListQuery(params({ page: "abc" })).page).toBe(1);
  });

  it("rejects sort fields outside the whitelist", () => {
    const query = parseListQuery(params({ sort: "passwordHash" }), {
      sortable: ["createdAt", "lastName"],
      defaultSort: "lastName",
    });
    expect(query.sort).toBe("lastName");
  });

  it("accepts whitelisted sort fields and explicit order", () => {
    const query = parseListQuery(params({ sort: "lastName", order: "asc" }), {
      sortable: ["createdAt", "lastName"],
    });
    expect(query).toMatchObject({ sort: "lastName", order: "asc" });
  });

  it("trims the search term", () => {
    expect(parseListQuery(params({ q: "  jane  " })).q).toBe("jane");
  });
});

describe("toOrderBy", () => {
  it("builds a Prisma orderBy object", () => {
    expect(toOrderBy(parseListQuery(params({ sort: "lastName", order: "asc" })))).toEqual({
      lastName: "asc",
    });
  });
});

describe("buildMeta", () => {
  it("computes total pages, rounding up", () => {
    expect(buildMeta(137, 1, 20)).toEqual({ page: 1, pageSize: 20, total: 137, totalPages: 7 });
  });

  it("never reports fewer than one page", () => {
    expect(buildMeta(0, 1, 20).totalPages).toBe(1);
  });
});
