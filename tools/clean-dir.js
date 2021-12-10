if (process.argv.length !== 3) {
  throw "Expected one and only argument to be passed"
}

const path = require('path');
const fs = require('fs');

const pathToClean = path.join(__dirname, '..', process.argv[2]);

if (fs.existsSync(pathToClean)) {
  console.log(`Removing '${pathToClean}' ...`);
  fs.rmSync(pathToClean, { force: true, recursive: true });
}

console.log(`Creating '${pathToClean}' ...`);
fs.mkdirSync(pathToClean);
