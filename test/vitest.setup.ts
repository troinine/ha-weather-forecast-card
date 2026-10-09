import { beforeAll, beforeEach } from "vitest";

beforeAll(() => {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
});

// The card caches forecast events in localStorage; clear it so one test's
// forecast can't seed the next test's card.
beforeEach(() => {
  window.localStorage.clear();
});
