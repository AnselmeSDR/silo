import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

/** `*.silo.json.gz` is gzip, anything else plain JSON (D-04). */
const isGzipPath = (path: string): boolean => path.endsWith(".gz");

/**
 * Writes a save atomically: temporary file in the same folder, flushed, then renamed over the target.
 * If anything fails, the previous save is untouched and no partial file is left behind.
 */
export const writeSaveFile = (path: string, json: string): void => {
  const data = isGzipPath(path) ? gzipSync(json) : Buffer.from(json, "utf8");
  const temp = `${path}.${process.pid}.tmp`;
  let fd: number | null = null;
  try {
    fd = openSync(temp, "w");
    writeSync(fd, data);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    renameSync(temp, path);
  } catch (error) {
    if (fd !== null) closeSync(fd);
    rmSync(temp, { force: true });
    throw error;
  }
};

/** Reads a save written by `writeSaveFile`; the gzip layer is picked from the extension. */
export const readSaveFile = (path: string): string => {
  const data = readFileSync(path);
  return (isGzipPath(path) ? gunzipSync(data) : data).toString("utf8");
};
