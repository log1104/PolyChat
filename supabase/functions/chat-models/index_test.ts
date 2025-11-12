// @ts-nocheck
import "https://deno.land/std@0.224.0/testing/types.d.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  mapCatalog,
  mapRows,
} from "./index.ts";
import { DEFAULT_CHAT_MODEL_CATALOG } from "../../../shared/chatModelCatalog.ts";

Deno.test("mapRows sorts by position and removes incomplete entries", () => {
  const rows = [
    { model_id: "model-b", label: "Model B", position: 5 },
    { model_id: "model-a", label: "Model A", position: 1 },
    { model_id: null, label: "", position: null },
  ] as Array<Record<string, unknown>>;

  const result = mapRows(rows);

  assertEquals(result, [
    { id: "model-a", label: "Model A", position: 1 },
    { id: "model-b", label: "Model B", position: 5 },
  ]);
});

Deno.test("mapCatalog mirrors default catalog entries", () => {
  const mapped = mapCatalog(DEFAULT_CHAT_MODEL_CATALOG);
  assertEquals(mapped, DEFAULT_CHAT_MODEL_CATALOG);
});
