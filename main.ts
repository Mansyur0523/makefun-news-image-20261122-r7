import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// Locate entry.png next to this script, wherever the repo is checked out.
const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(scriptDir, "entry.png");

const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
const outPath = join(outDir, "entry.png");

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

// The output must never land inside the repository itself.
if (outPath === resolve(scriptDir) || outPath.startsWith(resolve(scriptDir) + sep)) {
  fail("refusing to write output inside the repository");
}

// CRC-32 (IEEE) table, built once at startup.
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(chunk: Buffer): number {
  let c = 0xffffffff;
  for (const byte of chunk) {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ---- Read and validate the PNG -------------------------------------------
const bytes = readFileSync(sourcePath);

if (bytes.length > 1024 * 1024) {
  fail(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
}

const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!bytes.subarray(0, 8).equals(pngMagic)) {
  fail("entry.png does not start with the PNG signature");
}

// ---- Walk the chunk stream -------------------------------------------------
let offset = 8;
let width = 0;
let height = 0;
let seenIhdr = false;
let seenIdat = false;
let seenIend = false;
let firstChunk = true;

while (offset + 8 <= bytes.length) {
  const length = bytes.readUInt32BE(offset);
  const type = bytes.subarray(offset + 4, offset + 8).toString("latin1");
  const dataStart = offset + 8;
  const dataEnd = dataStart + length;
  const chunkEnd = dataEnd + 4;
  if (chunkEnd > bytes.length) {
    fail(`chunk ${type} runs past the end of the file`);
  }
  const data = bytes.subarray(dataStart, dataEnd);
  const storedCrc = bytes.readUInt32BE(dataEnd);
  const actualCrc = crc32(Buffer.concat([bytes.subarray(offset + 4, offset + 8), data]));
  if (storedCrc !== actualCrc) {
    fail(`CRC mismatch in ${type} chunk`);
  }

  if (firstChunk) {
    if (type !== "IHDR" || length !== 13) {
      fail("first chunk must be a 13-byte IHDR");
    }
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    if (data[8] !== 8 || data[9] !== 2) {
      fail(`expected 8-bit RGB (color type 2), got bit depth ${data[8]} color type ${data[9]}`);
    }
    if (width > 1024 || height > 1024) {
      fail(`image is ${width}x${height}, larger than the 1024 px side limit`);
    }
    seenIhdr = true;
    firstChunk = false;
  }

  if (type === "IDAT") seenIdat = true;
  if (type === "IEND") {
    if (chunkEnd !== bytes.length) {
      fail("trailing bytes after IEND");
    }
    seenIend = true;
    break;
  }
  offset = chunkEnd;
}

if (!seenIhdr) fail("no IHDR chunk found");
if (!seenIdat) fail("no IDAT chunk found");
if (!seenIend) fail("no IEND chunk found");

// ---- Copy byte-identical and verify ----------------------------------------
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, bytes);

const written = readFileSync(outPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const writtenSha = createHash("sha256").update(written).digest("hex");
if (sha256 !== writtenSha) {
  fail("output sha256 does not match the source file");
}

console.log(JSON.stringify({ ok: true, bytes: bytes.length, width, height, sha256 }));
