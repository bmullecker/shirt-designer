const fs = require('fs');
const path = require('path');

// Helper to look for the image files in the brain directory
const BRAIN_DIR = 'C:/Users/bmull/.gemini/antigravity/brain/07d4f781-7e52-4c8e-85be-bb0e7700cd21';
const PUBLIC_DIR = 'c:/Users/bmull/.gemini/antigravity/_projects/shirt-designer/public/images';

// Map of names to their latest generated file paths (mock data, we'll confirm with list_dir if needed)
const ASSETS = {
  't-shirt': 'white_t_shirt_no_bg_1774214668560.png',
  'hoodie': 'hoodie_magenta_bg_1774214746761_1774214761092.png',
  'long-sleeve': 'long_sleeve_magenta_bg_1774214746761_1774214773518.png'
};

// Instead of using node-canvas (which failed to install properly), 
// we'll instruct the user to refresh their server once we move the files.
// But first, we need to MANUALLY verify the files exist.

for (const [key, filename] of Object.entries(ASSETS)) {
  const source = path.join(BRAIN_DIR, filename);
  const dest = path.join(PUBLIC_DIR, `${key}.png`);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`Copied ${key} asset to public/images.`);
  } else {
    console.error(`Could not find source file for ${key}: ${source}`);
  }
}
