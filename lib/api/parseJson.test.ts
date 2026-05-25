import { describe, it, expect } from "vitest";
import { safeParseJson, parseJsonWithSchema } from "./parseJson";
import { z } from "zod";

describe("safeParseJson", () => {
  it("parses valid JSON", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "test", value: 42 }),
    });
    const result = await safeParseJson(request);
    expect(result).toEqual({ name: "test", value: 42 });
  });

  it("throws ApiHttpError for invalid JSON", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: "not valid json",
    });
    await expect(safeParseJson(request)).rejects.toMatchObject({
      status: 400,
      code: "invalid_json",
    });
  });

  it("throws ApiHttpError for empty body", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: "",
    });
    await expect(safeParseJson(request)).rejects.toMatchObject({
      status: 400,
      code: "invalid_json",
    });
  });
});

describe("parseJsonWithSchema", () => {
  const TestSchema = z.object({
    name: z.string(),
    count: z.number(),
  });

  it("parses and validates with schema", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "test", count: 5 }),
    });
    const result = await parseJsonWithSchema(request, TestSchema);
    expect(result).toEqual({ name: "test", count: 5 });
  });

  it("throws for invalid JSON before schema validation", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: "invalid",
    });
    await expect(parseJsonWithSchema(request, TestSchema)).rejects.toMatchObject({
      status: 400,
      code: "invalid_json",
    });
  });

  it("throws ZodError for schema validation failure", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "test", count: "not a number" }),
    });
    await expect(parseJsonWithSchema(request, TestSchema)).rejects.toThrow();
  });
});
