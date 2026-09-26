import { describe, expect, it } from "vitest";
import { pageRange } from "./pagination";

describe("page range", () => {
  it("does not offer a page past the end", () => {
    expect(pageRange(4, 3)).toEqual({ page: 3, pageCount: 3, hasPrevious: true, hasNext: false });
  });
});
