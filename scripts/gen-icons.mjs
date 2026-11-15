import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function makeIcon(size, padding) {
  const w = size;
  const h = size;
  const px = Buffer.alloc(w * h * 4);
  const bg = [15, 23, 42, 255];
  const fg = [56, 189, 248, 255];
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    px[i] = c[0];
    px[i + 1] = c[1];
    px[i + 2] = c[2];
    px[i + 3] = c[3];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, bg);
  const r = Math.round(size * 0.22);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const inCorner = (x < r && y < r) || (x >= w - r && y < r) || (x < r && y >= h - r) || (x >= w - r && y >= h - r);
      if (!inCorner) continue;
      const cx = x < r ? r - 1 : w - r;
      const cy = y < r ? r - 1 : h - r;
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) set(x, y, [0, 0, 0, 0]);
    }
  const bw = Math.round((w - 2 * padding) * 0.42);
  const bh = Math.round((h - 2 * padding) * 0.62);
  const x0 = Math.round((w - bw) / 2);
  const y0 = Math.round(padding + ((h - 2 * padding - bh) * 0.35));
  const notch = Math.round(bw * 0.5);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      if (y > bh - notch) {
        const t = y - (bh - notch);
        if (Math.abs(x - bw / 2) < t) continue;
      }
      set(x0 + x, y0 + y, fg);
    }
  return encodePNG(w, h, px);
}

mkdirSync('static', { recursive: true });
writeFileSync('static/icon-192.png', makeIcon(192, 0));
writeFileSync('static/icon-512.png', makeIcon(512, 0));
writeFileSync('static/icon-maskable-512.png', makeIcon(512, Math.round(512 * 0.12)));
console.log('Icônes PNG générées dans static/');
