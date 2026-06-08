const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

async function processImages() {
    const brainDir = 'C:/Users/bmull/.gemini/antigravity/brain/07d4f781-7e52-4c8e-85be-bb0e7700cd21';
    const outputDir = 'c:/Users/bmull/.gemini/antigravity/_projects/shirt-designer/public/images';
    
    const jobs = [
        { src: 'blank_white_t_shirt_flat_lay_no_bg_1774215100826.png', dest: 't-shirt.png' },
        { src: 'blank_white_hoodie_flat_lay_no_bg_1774215113770.png', dest: 'hoodie.png' },
        { src: 'blank_white_long_sleeve_flat_lay_no_bg_1774215125211.png', dest: 'long-sleeve.png' }
    ];

    for (const job of jobs) {
        const sourcePath = path.join(brainDir, job.src);
        if (!fs.existsSync(sourcePath)) {
            console.error(`Missing: ${sourcePath}`);
            continue;
        }

        console.log(`Processing ${job.src}...`);
        const image = await Jimp.read(sourcePath);
        
        // Remove PURE WHITE background
        // We target pixels that are very close to white
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            
            // If it is almost perfectly white (background), make it transparent
            if (r > 245 && g > 245 && b > 245) {
                this.bitmap.data[idx + 3] = 0; 
            }
        });

        await image.write(path.join(outputDir, job.dest));
        console.log(`Saved ${job.dest} with transparency.`);
    }
}

processImages().catch(console.error);
