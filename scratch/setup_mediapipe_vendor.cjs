const fs = require('fs');
const path = require('path');
const https = require('https');

const vendorDir = path.resolve(__dirname, '..', 'vendor', 'mediapipe');
const vendorWasmDir = path.join(vendorDir, 'wasm');
const webVendorDir = path.resolve(__dirname, '..', 'ELT LIVE WEB', 'vendor', 'mediapipe');
const webVendorWasmDir = path.join(webVendorDir, 'wasm');

[vendorDir, vendorWasmDir, webVendorDir, webVendorWasmDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Copy vision_bundle.js
const srcBundle = path.resolve(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'vision_bundle.js');
fs.copyFileSync(srcBundle, path.join(vendorDir, 'vision_bundle.js'));
fs.copyFileSync(srcBundle, path.join(webVendorDir, 'vision_bundle.js'));
console.log('Copied vision_bundle.js');

// Copy wasm files
const srcWasmDir = path.resolve(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmFiles = fs.readdirSync(srcWasmDir);
wasmFiles.forEach(file => {
  fs.copyFileSync(path.join(srcWasmDir, file), path.join(vendorWasmDir, file));
  fs.copyFileSync(path.join(srcWasmDir, file), path.join(webVendorWasmDir, file));
});
console.log(`Copied ${wasmFiles.length} WASM files`);

// Download selfie_segmenter.tflite
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
const modelDest = path.join(vendorDir, 'selfie_segmenter.tflite');
const webModelDest = path.join(webVendorDir, 'selfie_segmenter.tflite');

const fileStream = fs.createWriteStream(modelDest);
https.get(modelUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download model, status:', res.statusCode);
    process.exit(1);
  }
  res.pipe(fileStream);
  fileStream.on('finish', () => {
    fileStream.close();
    fs.copyFileSync(modelDest, webModelDest);
    console.log('Downloaded and copied selfie_segmenter.tflite successfully (' + fs.statSync(modelDest).size + ' bytes).');
  });
}).on('error', (err) => {
  console.error('Download error:', err);
  process.exit(1);
});
