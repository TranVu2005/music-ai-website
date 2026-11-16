// Runs for every test file. Only touches the DOM when one exists (jsdom files),
// so node/DB tests keep their environment unchanged.
import { afterEach } from "vitest";

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}
