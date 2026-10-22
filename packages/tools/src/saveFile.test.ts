import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readSaveFile, writeSaveFile } from "./saveFile";

const json = JSON.stringify({ formatVersion: 1, text: "é".repeat(1000) });
const tempDir = () => mkdtempSync(join(tmpdir(), "silo-save-"));

describe("save files", () => {
  it("round-trips plain JSON", () => {
    const path = join(tempDir(), "a.silo.json");
    writeSaveFile(path, json);
    expect(readFileSync(path, "utf8")).toBe(json);
    expect(readSaveFile(path)).toBe(json);
  });

  it("round-trips gzip, and the file is really compressed", () => {
    const path = join(tempDir(), "a.silo.json.gz");
    writeSaveFile(path, json);
    expect(gunzipSync(readFileSync(path)).toString("utf8")).toBe(json);
    expect(readSaveFile(path)).toBe(json);
  });

  it("replaces the previous save and leaves no temporary file", () => {
    const dir = tempDir();
    const path = join(dir, "a.silo.json");
    writeSaveFile(path, "old");
    writeSaveFile(path, json);
    expect(readSaveFile(path)).toBe(json);
    expect(readdirSync(dir)).toEqual(["a.silo.json"]);
  });

  it("keeps the previous save and leaves no partial file when the write fails", () => {
    const dir = tempDir();
    const path = join(dir, "a.silo.json");
    writeFileSync(path, "old");
    // A directory cannot be replaced by a file: the rename fails after the temp file is written.
    mkdirSync(join(dir, "blocked.silo.json"));
    expect(() => writeSaveFile(join(dir, "blocked.silo.json"), json)).toThrow();
    expect(readdirSync(dir).sort()).toEqual(["a.silo.json", "blocked.silo.json"]);
    expect(readFileSync(path, "utf8")).toBe("old");
  });

  it("fails without creating anything when the folder does not exist", () => {
    const dir = tempDir();
    expect(() => writeSaveFile(join(dir, "missing", "a.silo.json"), json)).toThrow();
    expect(readdirSync(dir)).toEqual([]);
  });
});
