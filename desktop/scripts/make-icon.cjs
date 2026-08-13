const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico").default;

const desktopDir = path.resolve(__dirname, "..");
const svg = path.join(desktopDir, "build", "icon.svg");
const png = path.join(desktopDir, "build", "icon.png");
const ico = path.join(desktopDir, "build", "icon.ico");

async function main() {
  await sharp(svg).resize(512, 512).png().toFile(png);
  fs.writeFileSync(ico, await pngToIco(png));
  console.log("Windows application icons generated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
