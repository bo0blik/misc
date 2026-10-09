// Run with: node --test tests/state-sync.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadEditor() {
  let html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  let script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  script = script.replace("const state = {", "const state = globalThis.__editorState = {");
  script = script.replace('window.addEventListener("scroll", closeMenus, true);',
    'window.addEventListener("scroll", closeMenus, true); globalThis.__editorTest = { getValue, setValue, uniqueName, handleCommand, binding, removeBinding };');
  const listeners = new Map();
  const element = () => ({ addEventListener() {}, classList: { add() {}, remove() {} } });
  const document = {
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getElementById() { return element(); },
    addEventListener(name, callback) {
      listeners.set(name, [...(listeners.get(name) || []), callback]);
    }
  };
  const context = { document, window: { addEventListener() {} }, clearTimeout() {}, setTimeout() {}, structuredClone };
  vm.runInNewContext(script, context);
  return { state: context.__editorState, api: context.__editorTest, listeners };
}

test("editable existing scalar and array values update their correct binding", () => {
  const { state, api } = loadEditor();
  api.setValue("numbers.1", 42);
  api.setValue("text", "changed");
  assert.equal(state.numbers[0], 123);
  assert.equal(state.numbers[1], 42);
  assert.equal(state.text, "changed");
});

test("delegated input handles newly created values and checkbox state", () => {
  const { state, listeners } = loadEditor();
  state.simple = { new: "" };
  const dispatch = input => {
    for (const handler of listeners.get("input")) handler({ target: { closest() { return input; } } });
  };
  dispatch({ dataset: { value: "simple.new" }, type: "text", value: "hello" });
  assert.equal(state.simple.new, "hello");
  dispatch({ dataset: { value: "simple.new" }, type: "checkbox", checked: true, value: "on" });
  assert.equal(state.simple.new, true);
});

test("unique duplicate keys cannot overwrite an existing property", () => {
  const { api } = loadEditor();
  const values = { name: "original", nameCopy: "copy" };
  const next = api.uniqueName(values, "nameCopy");
  assert.equal(next, "nameCopy2");
  values[next] = values.name;
  values[next] = "changed";
  assert.equal(values.name, "original");
});

test("array deletion removes model value and compacts the indices", () => {
  const { state, api } = loadEditor();
  const input = { dataset: { value: "numbers.0" } };
  const row = {
    querySelector(selector) { return selector === "input[data-value]" ? input : null; },
    remove() { this.removed = true; }
  };
  assert.equal(api.removeBinding(row), true);
  assert.equal(row.removed, true);
  assert.deepEqual(Array.from(state.numbers), [12]);
});
