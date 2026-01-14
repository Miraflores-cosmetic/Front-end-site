import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimizeImages() {
  const imageDirs = ['src/assets/images', 'src/assets/icons'];

  let optimizedCount = 0;
  let totalSavings = 0;

  for (const dir of imageDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    const imageFiles = files.filter(file => /\.(png|jpe?g|gif)$/i.test(file));

    console.log(`🔍 Found ${imageFiles.length} images to optimize in ${dir}`);

    for (const imageFile of imageFiles) {
      const inputPath = path.join(dir, imageFile);
      const ext = path.extname(imageFile).toLowerCase();

      try {
        const originalStats = fs.statSync(inputPath);
        const originalSize = originalStats.size;

        let optimizedBuffer;

        if (ext === '.png') {
          // Create WebP version first
          const webpPath = inputPath.replace(/\.png$/i, '.webp');
          await sharp(inputPath).webp({ quality: 85 }).toFile(webpPath);

          console.log(`✅ Converted PNG to WebP: ${imageFile} → ${path.basename(webpPath)}`);

          // Remove original PNG file after successful WebP conversion
          fs.unlinkSync(inputPath);
          console.log(`🗑️  Removed original PNG: ${imageFile}`);

          // Don't optimize the PNG buffer since we're removing the file
          optimizedBuffer = null;
        } else if (ext === '.jpg' || ext === '.jpeg') {
          // Optimize JPEG
          optimizedBuffer = await sharp(inputPath)
            .jpeg({ quality: 85, progressive: true })
            .toBuffer();
        } else if (ext === '.gif') {
          // Optimize GIF
          optimizedBuffer = await sharp(inputPath).gif({ optimizationLevel: 7 }).toBuffer();
        }

        if (optimizedBuffer) {
          const newSize = optimizedBuffer.length;
          const savings = originalSize - newSize;
          const savingsPercent = Math.round((savings / originalSize) * 100);

          if (savings > 0) {
            fs.writeFileSync(inputPath, optimizedBuffer);
            totalSavings += savings;
            optimizedCount++;
            console.log(
              `📦 ${imageFile}: ${originalSize} → ${newSize} bytes (-${savingsPercent}%)`
            );
          }
        }
      } catch (error) {
        console.error(`❌ Failed to optimize ${imageFile}:`, error.message);
      }
    }
  }

  if (optimizedCount > 0) {
    console.log(`\n🎉 Optimization complete!`);
    console.log(`📊 Optimized ${optimizedCount} images`);
    console.log(`💾 Total savings: ${Math.round(totalSavings / 1024)}KB`);
  } else {
    console.log(`\n✨ All images are already optimized!`);
  }
}

optimizeImages().catch(console.error);
