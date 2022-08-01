var http = require('https');
var fs = require('fs');
var path = require('path');

function clean(pathToClean, recreate) {
  if (fs.existsSync(pathToClean)) {
    console.log(`Removing '${pathToClean}' ...`);
    fs.rmSync(pathToClean, { force: true, recursive: true });
  }
  if (recreate) {
    console.log(`Creating '${pathToClean}' ...`);
    fs.mkdirSync(pathToClean);
  }
}

function getUrlAsPromise(url) {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to download ${url} ...`);
    http.get(url, (response) => {
      let chunksOfData = [];

      response.on('data', (fragments) => {
        chunksOfData.push(fragments);
      });

      response.on('end', () => {
        let responseBody = Buffer.concat(chunksOfData);
        resolve({
          resultCode: response.statusCode,
          redirect: response.headers.location,
          body: responseBody.toString()
        });
      });

      response.on('error', (error) => {
        reject(error);
      });
    });
  });
}

async function downloadAsync(url, dest) {
  try {
    let promise = getUrlAsPromise(url);
    let response = await promise;


    if (response.resultCode === 302) {
      await downloadAsync(response.redirect, dest);
    }

    fs.writeFileSync(dest, response.body, { encoding: 'utf-8' });
  }
  catch(error) {
    // Promise rejected
    console.log(error);
  }
};


// "components": {
//   "<something>>": {
//     // For GitHub
//     "release": "0.0.1",
//     "githubUser": "<username>",
//     "githubRepo": "<repo>",
//     // For File
//     "file": "<relative path>",
//   }
// },
async function vendorFile(
  config,
  displayName,
  destPath,
  vendorConfig
) {
  if (config === undefined) {
    console.log(`package.json is missing component configuration for ${displayName}`);
    process.exit(1);
  }

  if (config.release !== undefined) {
    ghUser = config.githubUser || vendorConfig.github.user;
    ghRepo = config.githubRepo || vendorConfig.github.repo;

    console.log(`Using GitHub release ${config.release} for ${displayName}`);
    const url = `https://github.com/${ghUser}/${ghRepo}/releases/download/${config.release}/${vendorConfig.github.releaseFile}`;
    await downloadAsync(url, destPath);
    console.log("Completed downloading the asset.");
    return;
  }

  if (config.file !== undefined) {
    console.log(`Copying from ${config.file} ...`);
    fs.copyFileSync(config.file, destPath);
    return;
  }

  console.log(`Component ${displayName} is missing a 'release' or 'file' property`);
  process.exit(1);
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.log(`Could not find package.json at ${packageJsonPath}`);
  process.exit(1);
}

const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (pkgJson.components === undefined) {
  console.log(`package.json is missing a components section`);
  process.exit(1);
}

const vendorPath = path.join(__dirname, '..', 'vendor');
clean(vendorPath, true);

(async function () {
  console.log("Vendoring for Terrafrm Cloud OpenAPI Specification...");
  await vendorFile(
    pkgJson.components.openapi,
    "openapi",
    path.join(vendorPath, "openapi-terraform-cloud.yaml"),
    {
      github: {
        releaseFile: "openapi-terraform-cloud.yaml",
        user: "glennsarti",
        repo: "openapi-terraform-cloud"
      }
    }
  );

  console.log("Vendoring complete.");
  process.exit(0);
})();
