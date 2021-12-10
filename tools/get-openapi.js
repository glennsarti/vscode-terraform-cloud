var http = require('https');
var fs = require('fs');
var path = require('path');

var download = function (url, dest, cb) {
  var file = fs.createWriteStream(dest);
  console.log(`Attempting to download ${url} ...`);
  http.get(url, function (response) {

    if (response.statusCode === 302) {
      download(response.headers.location, dest);
    } else {
      response.pipe(file);
      file.on('finish', function () {
        console.log(`File saved to ${dest}`);
        file.close(cb);
      });
    };
  });
};

let vendorDir = path.join(__dirname, '..', 'vendor');
if (!fs.existsSync(vendorDir)) {
  console.log(`Creating ${vendorDir}`);
  fs.mkdirSync(vendorDir);
}

let downloadFile = path.join(vendorDir, 'openapi-terraform-cloud.yaml');
if (fs.existsSync(downloadFile)) {
  console.log(`Removing ${downloadFile}`);
  fs.rmSync(downloadFile);
}

// TODO Get the Api version number
const apiVersion = '0.0.1';
const openApiDownload = `https://github.com/glennsarti/openapi-terraform-cloud/releases/download/${apiVersion}/openapi-terraform-cloud.yaml`;

download(openApiDownload, downloadFile);
