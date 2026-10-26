import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const braces = require("braces");
const ast = depth => {
  let node = { type: "text", value: "a" };
  for (let index = 0; index < depth; index++) node = { type: "paren", nodes: [node] };
  return { type: "root", nodes: [node] };
};

test("brace and parenthesis nesting is bounded for balanced and unbalanced input", () => {
  for (const [open, close] of [["{", "}"], ["(", ")"]]) {
    assert.doesNotThrow(() => braces.parse(open.repeat(100) + "a" + close.repeat(100)));
    for (const input of [open.repeat(101) + "a" + close.repeat(101), open.repeat(5000)]) {
      for (const method of [braces, braces.parse, braces.compile, braces.expand]) assert.throws(() => method(input), /exceeds max depth/);
    }
    assert.throws(() => braces.parse(open.repeat(2) + "a" + close.repeat(2), { maxDepth: 1.5 }), /exceeds max depth/);
  }
});

test("direct AST walkers reject deep inputs before reaching stack exhaustion", () => {
  for (const method of [braces.compile, braces.expand, braces.stringify]) {
    assert.doesNotThrow(() => method(ast(100)));
    for (const depth of [101, 5000]) assert.throws(() => method(ast(depth)), /exceeds max depth/);
    assert.throws(() => method(ast(101), { maxDepth: Infinity }), /exceeds max depth/);
    assert.throws(() => method(ast(2), { maxDepth: 1.5 }), /exceeds max depth/);
  }
});

test("normal expansion, escaping, invalid braces and range limits retain their behavior", () => {
  assert.deepEqual(braces.expand("src/{app,lib}/*.{ts,tsx}"), ["src/app/*.ts", "src/app/*.tsx", "src/lib/*.ts", "src/lib/*.tsx"]);
  assert.deepEqual(braces.expand("a{01..03}b"), ["a01b", "a02b", "a03b"]);
  assert.equal(braces.stringify(braces.parse("{{a}}"), { escapeInvalid: true }), "{{a}}");
  assert.doesNotThrow(() => braces.parse("\\{".repeat(200)));
  assert.throws(() => braces.expand("{1..2000}"), /range limit/);
});

test("the actual glob consumers continue finding source files", () => {
  const glob = require("fast-glob"), micromatch = require("micromatch");
  assert.deepEqual(micromatch(["app/page.tsx", "app/layout.tsx", "package.json"], ["app/*.{ts,tsx}"]), ["app/page.tsx", "app/layout.tsx"]);
  assert.ok(glob.sync("app/{page,layout}.tsx").includes("app/page.tsx"));
});
