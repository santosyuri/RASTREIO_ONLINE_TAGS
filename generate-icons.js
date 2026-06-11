/**
 * generate-icons.js
 * Gera todos os ícones do PWA a partir de uma imagem fonte.
 *
 * USO:
 * npm install sharp
 * node generate-icons.js [caminho-da-imagem]
 *
 * Exemplo:
 * node generate-icons.js image_1147ba.png
 */

const fs   = require('fs');
const path = require('path');

// SIZES atualizado para incluir o tamanho 512 exigido pelo manifest.json
const SIZES  = [72, 96, 128, 144, 152, 180, 192, 512];
const outDir = path.join(__dirname, 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

async function generateWithSharp(sourceFile) {
  try {
    const sharp = require('sharp');

    for (const size of SIZES) {
      await sharp(sourceFile)
        .ensureAlpha() // Garante canal alpha para evitar distorções em logos transparentes
        .resize(size, size, { 
          fit: 'contain', 
          background: { r: 21, g: 101, b: 192, alpha: 1 } // #1565C0 em RGBA
        })
        .png()
        .toFile(path.join(outDir, `icon-${size}.png`));

      console.log(`✅ icons/icon-${size}.png gerado com sucesso.`);
    }
    console.log('\n🚀 Todos os ícones em formato PNG foram criados na pasta "icons"!');
  } catch (err) {
    console.error('❌ Erro ao processar com Sharp:', err.message);
  }
}

function generateSVGPlaceholders() {
  for (const size of SIZES) {
    const r = size * 0.2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#1565C0"/>
  <circle cx="${size/2}" cy="${size*0.42}" r="${size*0.2}" fill="white"/>
  <circle cx="${size/2}" cy="${size*0.42}" r="${size*0.09}" fill="#8BC34A"/>
  <polygon points="${size/2-size*0.06},${size*0.62} ${size/2+size*0.06},${size*0.62} ${size/2},${size*0.75}" fill="white"/>
</svg>`;
    fs.writeFileSync(path.join(outDir, `icon-${size}.svg`), svg);
    console.log(`✅ icons/icon-${size}.svg gerado (SVG fallback)`);
  }
  console.log('\n💡 Para PNG reais, instale: npm install sharp\n   E rode: node generate-icons.js logo.png');
}

// ── Entry point ──────────────────────────────────────────────────
const sourceFile = process.argv[2];

if (sourceFile) {
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Erro: Arquivo fonte "${sourceFile}" não encontrado na raiz.`);
    process.exit(1);
  }
  generateWithSharp(sourceFile);
} else {
  try {
    require('sharp');
    // Se o sharp existe mas não passou imagem, avisa
    console.log('⚠️ Por favor, informe o arquivo de imagem. Exemplo:\n   node generate-icons.js image_1147ba.png');
  } catch (e) {
    console.log('ℹ️ Imagem fonte não informada. Gerando placeholders simples (sem sharp)...');
    generateSVGPlaceholders();
  }
}