const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { get, all, run } = require('./db');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function getFilenameForUrl(url, id = 'img') {
  const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 10);
  return 'dish_' + id + '_' + hash + '.jpg';
}

async function cacheImageLocally(url, id = 'img') {
  if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return url;
  }

  const filename = getFilenameForUrl(url, id);
  const filePath = path.join(uploadsDir, filename);

  if (fs.existsSync(filePath)) {
    return '/uploads/' + filename;
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 0) {
        await fs.promises.writeFile(filePath, buffer);
        console.log('[ImageHelper] Image cached: ' + filename + ' (' + buffer.length + ' bytes)');
        return '/uploads/' + filename;
      }
    }
  } catch (err) {
    console.warn('[ImageHelper] Failed to download image from ' + url + ':', err.message);
  }

  return url;
}


async function preCacheAllProductImages() {
  try {
    const products = await all('SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != ""');
    console.log(`[ImageHelper] Pre-caching ${products.length} product images for Wi-Fi offline sync...`);
    for (const p of products) {
      if (p.image && (p.image.startsWith('http://') || p.image.startsWith('https://'))) {
        await cacheImageLocally(p.image, p.id);
      }
    }
    console.log('IImageHelper] All product images are cached and ready for local Wi-Fi sync!');
  } catch (err) {
    console.warn('[ImageHelper] preCacheAllProductImages error:', err.message);
  }
}

module.exports = {
  uploadsDir,
  getFilenameForUrl,
  cacheImageLocally,
  preCacheAllProductImages,
};
