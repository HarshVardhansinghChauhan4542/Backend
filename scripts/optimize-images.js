const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = 'public/images/originals';
const outputDir = 'public/images/optimized';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const processImage = async (file) => {
  const filePath = path.join(inputDir, file);
  const fileName = path.basename(file, path.extname(file));
  
  try {
    // Generate WebP version
    await sharp(filePath)
      .webp({ quality: 80 })
      .toFile(path.join(outputDir, `${fileName}.webp`));
    
    // Generate JPEG fallback
    await sharp(filePath)
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(path.join(outputDir, `${fileName}.jpg`));
    
    console.log(`Processed: ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
};

// Process all images in the directory
fs.readdir(inputDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }
  
  files.forEach(processImage);
});