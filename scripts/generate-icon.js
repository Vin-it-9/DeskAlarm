const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const logoPath = path.join(__dirname, '../assets/logo.png'); // 👈 Update this path if needed
const iconDir = path.join(__dirname, '../build/icons');

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

// Generate PNG icons from the logo
Promise.all(
  sizes.map(size =>
    sharp(logoPath)
      .resize(size, size)
      .toFile(path.join(iconDir, `${size}x${size}.png`))
  )
)
  .then(() => {
    console.log('PNG icons generated successfully.');

    // Copy 512x512 as icon.png (optional)
    fs.copyFileSync(
      path.join(iconDir, '512x512.png'),
      path.join(iconDir, 'icon.png')
    );

    // Generate icon.ico from sizes up to 256x256 (standard for Windows)
    return pngToIco(
      sizes
        .filter(size => size <= 256)
        .map(size => path.join(iconDir, `${size}x${size}.png`))
    );
  })
  .then(buffer => {
    fs.writeFileSync(path.join(iconDir, 'icon.ico'), buffer);
    console.log('icon.ico created successfully in build/icons/');
  })
  .catch(err => {
    console.error('Error generating icons:', err);
  });
