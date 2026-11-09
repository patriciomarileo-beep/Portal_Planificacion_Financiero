import { register } from "node:module";
register("./test-typescript-loader.mjs", import.meta.url);
await import("../tests/security.test.mjs");
await import("../tests/data-generation.test.mjs");
