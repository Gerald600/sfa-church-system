import { convert } from 'pdf-img-convert/pdf-img-convert.js';
import fs from 'fs';
import path from 'path';

async function convertPdf() {
  const pdfPath = 'C:\\Users\\Bright\\.gemini\\antigravity-ide\\brain\\0bd8793c-7b43-4e0c-ba5b-71882686e575\\media__1786211901296.pdf';
  console.log('Converting PDF from:', pdfPath);
  const outputImages = await convert(pdfPath, {
    scale: 3.0
  });
  
  for (let i = 0; i < outputImages.length; i++) {
    const outputPath = path.join(process.cwd(), 'public', 'images', `church_architectural_plan_${i + 1}.png`);
    fs.writeFileSync(outputPath, outputImages[i]);
    console.log(`Saved page ${i + 1} to ${outputPath}`);
  }
}

convertPdf().catch(err => {
  console.error('Error converting PDF:', err);
  process.exit(1);
});
