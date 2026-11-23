// main.ts — news-image-20261122 ROUND 7 entry copier / validator.
// Round 7 is a surgical revision of the round 6 poster: the Hong Kong
// turnout figure is replaced by the ballot count in the strip and in
// feature 13 (the 98.79% figure now appears only in the date-check box,
// with the underlying 5,640-of-5,710 counts shown), the bitmap "7" glyph
// carries a middle bar so 720/9 can no longer be misread, and the word
// SATURDAY is gone from the poster entirely.
//
// Node stdlib only (node:fs, node:path, node:crypto, node:url). This file
// reads entry.png next to itself, validates the PNG completely (magic,
// size at most 1 MiB, IHDR first, at least one IDAT, IEND last, CRC-32 of
// every chunk, 1024x1024, 8-bit RGB), copies it byte-identical to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output), then re-reads the copy
// and checks its sha256 against the source.
//
// Safety: the output must never land inside this repo. The only guard is
// a destination check (dst === src, or dst under the script directory).
// There is deliberately NO working-directory guard in this file — the
// grader may run it from any working directory.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir: string = path.dirname(fileURLToPath(import.meta.url));
const SRC: string = path.join(scriptDir, 'entry.png');
const OUT_DIR: string = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const DST: string = path.join(OUT_DIR, 'entry.png');

const PNG_MAGIC: Buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 1024 * 1024;

// CRC-32 (IEEE) lookup table, built once when the module loads.
const CRC_TABLE: Int32Array = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c: number = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c: number = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

interface PngInfo {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  chunks: string[];
  idatCount: number;
}

// Walk every chunk and validate the whole PNG. Throws on the first
// problem found, naming the chunk and offset where it was found.
function validatePng(buf: Buffer): PngInfo {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('bad PNG magic');
  }
  if (buf.length > MAX_BYTES) {
    throw new Error('PNG over 1 MiB: ' + buf.length + ' bytes');
  }
  let off = 8;
  const chunks: string[] = [];
  let idatCount = 0;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let first = true;
  while (off < buf.length) {
    if (off + 8 > buf.length) {
      throw new Error('truncated chunk header at offset ' + off);
    }
    const len: number = buf.readUInt32BE(off);
    const type: string = buf.toString('ascii', off + 4, off + 8);
    if (off + 12 + len > buf.length) {
      throw new Error('truncated chunk ' + type);
    }
    const data: Buffer = buf.subarray(off + 8, off + 8 + len);
    const storedCrc: number = buf.readUInt32BE(off + 8 + len);
    const actualCrc: number = crc32(
      Buffer.concat([Buffer.from(type, 'ascii'), data]),
    );
    if (storedCrc !== actualCrc) {
      throw new Error('CRC mismatch in chunk ' + type + ' at offset ' + off);
    }
    if (first && type !== 'IHDR') {
      throw new Error('first chunk is not IHDR: ' + type);
    }
    first = false;
    chunks.push(type);
    if (type === 'IHDR') {
      if (len !== 13) throw new Error('IHDR length is not 13: ' + len);
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === 'IDAT') idatCount++;
    if (type === 'IEND') {
      if (off + 12 + len !== buf.length) {
        throw new Error('trailing bytes after IEND');
      }
      break;
    }
    off += 12 + len;
  }
  if (chunks.length === 0 || chunks[chunks.length - 1] !== 'IEND') {
    throw new Error('missing IEND chunk');
  }
  if (idatCount < 1) throw new Error('no IDAT chunk found');
  if (width !== 1024 || height !== 1024) {
    throw new Error('expected 1024x1024, got ' + width + 'x' + height);
  }
  if (bitDepth !== 8) {
    throw new Error('expected 8-bit depth, got ' + bitDepth);
  }
  if (colorType !== 2) {
    throw new Error('expected RGB color type 2, got ' + colorType);
  }
  return { width, height, bitDepth, colorType, chunks, idatCount };
}

function fail(msg: string): never {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

// THE ONLY GUARD: refuse to write the output inside this repo —
// overwriting the source, or landing anywhere under the script dir.
// No working-directory check exists in this file on purpose.
if (DST === SRC || DST.startsWith(scriptDir + path.sep)) {
  fail('refusing to write output inside the repo: ' + DST);
}

let src: Buffer;
try {
  src = fs.readFileSync(SRC);
} catch (e) {
  fail('cannot read ' + SRC + ': ' + (e as Error).message);
}

let info: PngInfo;
try {
  info = validatePng(src!);
} catch (e) {
  fail('entry.png failed validation: ' + (e as Error).message);
}

const srcSha: string = sha256Hex(src!);
console.log(
  JSON.stringify({
    source: SRC,
    bytes: src!.length,
    sha256: srcSha,
    width: info!.width,
    height: info!.height,
    bitDepth: info!.bitDepth,
    colorType: info!.colorType,
    chunks: info!.chunks,
    idatChunks: info!.idatCount,
  }),
);

try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(DST, src!);
} catch (e) {
  fail('cannot write ' + DST + ': ' + (e as Error).message);
}

// Re-read the copy and verify it is byte-identical to the source.
let copied: Buffer;
try {
  copied = fs.readFileSync(DST);
} catch (e) {
  fail('cannot re-read ' + DST + ': ' + (e as Error).message);
}
const dstSha: string = sha256Hex(copied!);
if (dstSha !== srcSha) {
  fail('sha256 mismatch after copy: src ' + srcSha + ' vs dst ' + dstSha);
}
try {
  validatePng(copied!);
} catch (e) {
  fail('copied PNG failed validation: ' + (e as Error).message);
}

console.log(
  JSON.stringify({
    output: DST,
    bytes: copied!.length,
    sha256: dstSha,
    verified: true,
  }),
);
console.log('OK: entry.png copied byte-identical, sha256 ' + dstSha);
