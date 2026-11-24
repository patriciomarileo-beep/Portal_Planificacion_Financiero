import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register(
  "../scripts/test-typescript-loader.mjs",
  import.meta.url,
);

const {
  openingType,
  storeClassification,
} = await import(
  "../modules/profitability-bl/domain/store-classification.ts"
);

test(
  "classifies a configured new store as NS",
  () => {
    assert.equal(
      storeClassification(
        "210302",
        2026,
        "ENERO",
      ),
      "NS",
    );
  },
);

test(
  "classifies an existing store as SSS",
  () => {
    assert.equal(
      storeClassification(
        "210302",
        2026,
        "DICIEMBRE",
      ),
      "SSS",
    );
  },
);

test(
  "openingType classifies a store using its code",
  () => {
    assert.equal(
      openingType(
        { code: "210302" },
        2027,
        "ENERO",
      ),
      "NS",
    );
  },
);

test(
  "unknown months default safely to SSS",
  () => {
    assert.equal(
      storeClassification(
        "210302",
        2026,
        "MES_INVALIDO",
      ),
      "SSS",
    );
  },
);