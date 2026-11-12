const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const SOURCE_JPG = '/Users/prakashchoudhary/.gemini/antigravity/brain/914afa34-0717-44ec-b818-5a0c2fdda8fe/.user_uploaded/media_1794480466808_46db7312.jpg';
const RAW_PNG = '/tmp/docket_icon_1024.png';

// Convert JPG to raw PNG using sips
execSync(`sips -s format png "${SOURCE_JPG}" --out "${RAW_PNG}"`);

const buf = fs.readFileSync(RAW_PNG);
let offset = 8;
const idats = [];
while (offset < buf.length) {
  const len = buf.readUInt32BE(offset);
  const type = buf.toString('ascii', offset + 4, offset + 8);
  if (type === 'IDAT') idats.push(buf.subarray(offset + 8, offset + 8 + len));
  offset += 12 + len;
}
const decomp = zlib.inflateSync(Buffer.concat(idats));
const width = 1024;
const height = 1024;
const bpp = 3;
const rowLen = width * bpp;
const rawRgb = Buffer.alloc(width * height * 3);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Defilter PNG
for (let y = 0; y < height; y++) {
  const filter = decomp[y * (1 + rowLen)];
  const srcRow = y * (1 + rowLen) + 1;
  const dstRow = y * rowLen;
  const prevRow = (y - 1) * rowLen;

  for (let x = 0; x < rowLen; x++) {
    const rawVal = decomp[srcRow + x];
    const left = x >= bpp ? rawRgb[dstRow + x - bpp] : 0;
    const up = y > 0 ? rawRgb[prevRow + x] : 0;
    const upleft = y > 0 && x >= bpp ? rawRgb[prevRow + x - bpp] : 0;

    let val = 0;
    if (filter === 0) val = rawVal;
    else if (filter === 1) val = (rawVal + left) & 0xff;
    else if (filter === 2) val = (rawVal + up) & 0xff;
    else if (filter === 3) val = (rawVal + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) val = (rawVal + paeth(left, up, upleft)) & 0xff;

    rawRgb[dstRow + x] = val;
  }
}

// Flood fill from outer borders to find outer white background
// Background is white (~254), clock has black pixels (~0)
const isOuterBg = new Uint8Array(width * height);
const queue = new Int32Array(width * height * 2);
let qHead = 0;
let qTail = 0;

function isWhite(x, y) {
  const idx = (y * width + x) * 3;
  const r = rawRgb[idx];
  const g = rawRgb[idx + 1];
  const b = rawRgb[idx + 2];
  // Brightness threshold for background
  return (r + g + b) / 3 > 200;
}

// Seed all 4 borders
for (let x = 0; x < width; x++) {
  if (isWhite(x, 0)) {
    isOuterBg[0 * width + x] = 1;
    queue[qTail++] = x;
    queue[qTail++] = 0;
  }
  if (isWhite(x, height - 1)) {
    isOuterBg[(height - 1) * width + x] = 1;
    queue[qTail++] = x;
    queue[qTail++] = height - 1;
  }
}
for (let y = 1; y < height - 1; y++) {
  if (isWhite(0, y) && !isOuterBg[y * width + 0]) {
    isOuterBg[y * width + 0] = 1;
    queue[qTail++] = 0;
    queue[qTail++] = y;
  }
  if (isWhite(width - 1, y) && !isOuterBg[y * width + (width - 1)]) {
    isOuterBg[y * width + (width - 1)] = 1;
    queue[qTail++] = width - 1;
    queue[qTail++] = y;
  }
}

// BFS flood fill
while (qHead < qTail) {
  const cx = queue[qHead++];
  const cy = queue[qHead++];

  const neighbors = [
    [cx + 1, cy],
    [cx - 1, cy],
    [cx, cy + 1],
    [cx, cy - 1],
  ];
  for (const [nx, ny] of neighbors) {
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const nIdx = ny * width + nx;
      if (!isOuterBg[nIdx] && isWhite(nx, ny)) {
        isOuterBg[nIdx] = 1;
        queue[qTail++] = nx;
        queue[qTail++] = ny;
      }
    }
  }
}

// Create 1024x1024 RGBA transparent buffer
const rgba1024 = Buffer.alloc(width * height * 4);
// Also clean 1024x1024 RGB opaque buffer with pure white background
const rgb1024Clean = Buffer.alloc(width * height * 3);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const srcIdx = (y * width + x) * 3;
    const dstIdx4 = (y * width + x) * 4;
    const dstIdx3 = (y * width + x) * 3;
    const isBg = isOuterBg[y * width + x];

    const r = rawRgb[srcIdx];
    const g = rawRgb[srcIdx + 1];
    const b = rawRgb[srcIdx + 2];

    if (isBg) {
      // Outer background: transparent
      rgba1024[dstIdx4] = 255;
      rgba1024[dstIdx4 + 1] = 255;
      rgba1024[dstIdx4 + 2] = 255;
      rgba1024[dstIdx4 + 3] = 0;

      // Clean pure white for opaque version
      rgb1024Clean[dstIdx3] = 255;
      rgb1024Clean[dstIdx3 + 1] = 255;
      rgb1024Clean[dstIdx3 + 2] = 255;
    } else {
      // Foreground (clock, bells, hands, ticks)
      rgba1024[dstIdx4] = r;
      rgba1024[dstIdx4 + 1] = g;
      rgba1024[dstIdx4 + 2] = b;
      rgba1024[dstIdx4 + 3] = 255;

      rgb1024Clean[dstIdx3] = r;
      rgb1024Clean[dstIdx3 + 1] = g;
      rgb1024Clean[dstIdx3 + 2] = b;
    }
  }
}

// PNG Encoder helpers
function crc32(buffer) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = table[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(w, h, buffer, isRgba = true) {
  const channels = isRgba ? 4 : 3;
  const colorType = isRgba ? 6 : 2;

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = colorType;
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT with filter byte 0 (None) per row
  const rowSize = w * channels;
  const rawData = Buffer.alloc(h * (1 + rowSize));
  for (let y = 0; y < h; y++) {
    rawData[y * (1 + rowSize)] = 0; // Filter type None
    buffer.copy(rawData, y * (1 + rowSize) + 1, y * rowSize, (y + 1) * rowSize);
  }

  const idat = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Resampling helper: area averaging for high quality downscaling
function resampleRgba(srcBuf, srcW, srcH, dstW, dstH) {
  const dstBuf = Buffer.alloc(dstW * dstH * 4);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    const syStart = Math.floor(dy * scaleY);
    const syEnd = Math.min(srcH, Math.ceil((dy + 1) * scaleY));

    for (let dx = 0; dx < dstW; dx++) {
      const sxStart = Math.floor(dx * scaleX);
      const sxEnd = Math.min(srcW, Math.ceil((dx + 1) * scaleX));

      let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
      let count = 0;

      for (let sy = syStart; sy < syEnd; sy++) {
        for (let sx = sxStart; sx < sxEnd; sx++) {
          const idx = (sy * srcW + sx) * 4;
          const a = srcBuf[idx + 3];
          if (a > 0) {
            totalR += srcBuf[idx];
            totalG += srcBuf[idx + 1];
            totalB += srcBuf[idx + 2];
            totalA += a;
          }
          count++;
        }
      }

      const dstIdx = (dy * dstW + dx) * 4;
      if (count > 0 && totalA > 0) {
        dstBuf[dstIdx] = Math.round(totalR / count);
        dstBuf[dstIdx + 1] = Math.round(totalG / count);
        dstBuf[dstIdx + 2] = Math.round(totalB / count);
        dstBuf[dstIdx + 3] = Math.round(totalA / count);
      } else {
        dstBuf[dstIdx] = 0;
        dstBuf[dstIdx + 1] = 0;
        dstBuf[dstIdx + 2] = 0;
        dstBuf[dstIdx + 3] = 0;
      }
    }
  }
  return dstBuf;
}

// Resample RGB (opaque)
function resampleRgb(srcBuf, srcW, srcH, dstW, dstH) {
  const dstBuf = Buffer.alloc(dstW * dstH * 3);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    const syStart = Math.floor(dy * scaleY);
    const syEnd = Math.min(srcH, Math.ceil((dy + 1) * scaleY));

    for (let dx = 0; dx < dstW; dx++) {
      const sxStart = Math.floor(dx * scaleX);
      const sxEnd = Math.min(srcW, Math.ceil((dx + 1) * scaleX));

      let totalR = 0, totalG = 0, totalB = 0;
      let count = 0;

      for (let sy = syStart; sy < syEnd; sy++) {
        for (let sx = sxStart; sx < sxEnd; sx++) {
          const idx = (sy * srcW + sx) * 3;
          totalR += srcBuf[idx];
          totalG += srcBuf[idx + 1];
          totalB += srcBuf[idx + 2];
          count++;
        }
      }

      const dstIdx = (dy * dstW + dx) * 3;
      dstBuf[dstIdx] = Math.round(totalR / count);
      dstBuf[dstIdx + 1] = Math.round(totalG / count);
      dstBuf[dstIdx + 2] = Math.round(totalB / count);
    }
  }
  return dstBuf;
}

// 1. icon.png (1024x1024 opaque for universal App Icon)
const iconPng = encodePng(1024, 1024, rgb1024Clean, false);
fs.writeFileSync('assets/images/icon.png', iconPng);
console.log('Generated assets/images/icon.png (1024x1024)');

// 2. favicon.png (48x48)
const faviconBuf = resampleRgb(rgb1024Clean, 1024, 1024, 48, 48);
fs.writeFileSync('assets/images/favicon.png', encodePng(48, 48, faviconBuf, false));
console.log('Generated assets/images/favicon.png (48x48)');

// 3. splash-icon.png (256x256 transparent icon)
const splashBuf = resampleRgba(rgba1024, 1024, 1024, 256, 256);
fs.writeFileSync('assets/images/splash-icon.png', encodePng(256, 256, splashBuf, true));
console.log('Generated assets/images/splash-icon.png (256x256)');

// 4. android-icon-foreground.png (512x512 transparent with safe margin)
// Android adaptive icon has a safe circle of 66% (338px diameter in 512px)
const fgSize = 340;
const fgScaled = resampleRgba(rgba1024, 1024, 1024, fgSize, fgSize);
const androidFgBuf = Buffer.alloc(512 * 512 * 4); // all transparent
const fgOffset = Math.floor((512 - fgSize) / 2); // 86
for (let y = 0; y < fgSize; y++) {
  for (let x = 0; x < fgSize; x++) {
    const srcIdx = (y * fgSize + x) * 4;
    const dstIdx = ((y + fgOffset) * 512 + (x + fgOffset)) * 4;
    androidFgBuf[dstIdx] = fgScaled[srcIdx];
    androidFgBuf[dstIdx + 1] = fgScaled[srcIdx + 1];
    androidFgBuf[dstIdx + 2] = fgScaled[srcIdx + 2];
    androidFgBuf[dstIdx + 3] = fgScaled[srcIdx + 3];
  }
}
fs.writeFileSync('assets/images/android-icon-foreground.png', encodePng(512, 512, androidFgBuf, true));
console.log('Generated assets/images/android-icon-foreground.png (512x512)');

// 5. android-icon-monochrome.png (512x512 transparent monochrome)
const androidMonoBuf = Buffer.alloc(512 * 512 * 4);
for (let i = 0; i < 512 * 512; i++) {
  const alpha = androidFgBuf[i * 4 + 3];
  const r = androidFgBuf[i * 4];
  const g = androidFgBuf[i * 4 + 1];
  const b = androidFgBuf[i * 4 + 2];
  const brightness = (r + g + b) / 3;
  // If it's part of the black outline/body
  if (alpha > 0 && brightness < 128) {
    androidMonoBuf[i * 4] = 0;
    androidMonoBuf[i * 4 + 1] = 0;
    androidMonoBuf[i * 4 + 2] = 0;
    androidMonoBuf[i * 4 + 3] = 255;
  }
}
fs.writeFileSync('assets/images/android-icon-monochrome.png', encodePng(512, 512, androidMonoBuf, true));
console.log('Generated assets/images/android-icon-monochrome.png (512x512)');

// 6. android-icon-background.png (512x512 solid white)
const androidBgBuf = Buffer.alloc(512 * 512 * 3, 255);
fs.writeFileSync('assets/images/android-icon-background.png', encodePng(512, 512, androidBgBuf, false));
console.log('Generated assets/images/android-icon-background.png (512x512)');

// 7. tabIcons/home.png (24x24), home@2x.png (48x48), home@3x.png (72x72)
// For tab bar icons with template rendering, we create crisp silhouette icons
// where dark pixels have alpha > 0 and light/white pixels are transparent
function makeTabIcon(size, filename) {
  // Crop slightly to the clock body so it fills the 24px/48px canvas nicely
  // Original is 1024x1024, clock is between y: 140..880, x: 140..880
  const cropW = 800;
  const cropH = 800;
  const cropX = 112;
  const cropY = 112;

  const croppedRgba = Buffer.alloc(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = ((y + cropY) * width + (x + cropX)) * 3;
      const dstIdx = (y * cropW + x) * 4;
      const r = rawRgb[srcIdx];
      const g = rawRgb[srcIdx + 1];
      const b = rawRgb[srcIdx + 2];
      const brightness = (r + g + b) / 3;

      // Dark pixels become the icon silhouette (black with alpha)
      if (brightness < 128) {
        croppedRgba[dstIdx] = 0;
        croppedRgba[dstIdx + 1] = 0;
        croppedRgba[dstIdx + 2] = 0;
        croppedRgba[dstIdx + 3] = Math.round((1 - brightness / 128) * 255);
      } else {
        // White pixels (background + clock face highlights) are transparent
        croppedRgba[dstIdx] = 0;
        croppedRgba[dstIdx + 1] = 0;
        croppedRgba[dstIdx + 2] = 0;
        croppedRgba[dstIdx + 3] = 0;
      }
    }
  }

  const iconBuf = resampleRgba(croppedRgba, cropW, cropH, size, size);
  fs.writeFileSync(`assets/images/tabIcons/${filename}`, encodePng(size, size, iconBuf, true));
  console.log(`Generated assets/images/tabIcons/${filename} (${size}x${size})`);
}
makeTabIcon(24, 'home.png');
makeTabIcon(48, 'home@2x.png');
makeTabIcon(72, 'home@3x.png');

// Also generate assets/images/docket-icon.png (transparent 512x512) for in-app display / splash
const docketIconBuf = resampleRgba(rgba1024, 1024, 1024, 512, 512);
fs.writeFileSync('assets/images/docket-icon.png', encodePng(512, 512, docketIconBuf, true));
console.log('Generated assets/images/docket-icon.png (512x512)');
