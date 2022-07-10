var fs = require('fs');
var path = require('path');
var cp = require('child_process');

const root = path.join(__dirname, '..');

function clean(pathToClean) {
  if (fs.existsSync(pathToClean)) {
    console.log(`Removing '${pathToClean}' ...`);
    fs.rmSync(pathToClean, { force: true, recursive: true });
  }

  console.log(`Creating '${pathToClean}' ...`);
  fs.mkdirSync(pathToClean, { recursive: true });
}

function run(cmd, args) {
  console.log(`Running ${cmd}`);
  const run = cp.execSync(cmd);
  console.log(run.toString());
}

function moveFile(fromPath, toPath, filename) {
  if (!fs.existsSync(toPath)) {
    console.log(`Creating '${toPath}' ...`);
    fs.mkdirSync(toPath);
  }
  fs.cpSync(path.join(fromPath, filename), path.join(toPath, filename));
  fs.rmSync(path.join(fromPath, filename));
}

function moveAndMungeFile(fromPath, toPath, subdir, filename, mungePath) {
  moveFile(path.join(fromPath, subdir), path.join(toPath, subdir), filename);

  const filePath = path.join(toPath, subdir, filename);
  let content = fs.readFileSync(filePath, 'utf8');

  // Hacky way of munging in the new import directories
  content = content.replace("import { ApiError } from '."              , `import { ApiError } from '${mungePath}/${subdir}`);
  content = content.replace("import type { ApiRequestOptions } from '.", `import type { ApiRequestOptions } from '${mungePath}/${subdir}`);
  content = content.replace("import type { ApiResult } from '."        , `import type { ApiResult } from '${mungePath}/${subdir}`);
  content = content.replace("import { CancelablePromise } from '."     , `import { CancelablePromise } from '${mungePath}/${subdir}`);
  content = content.replace("import type { OnCancel } from '."         , `import type { OnCancel } from '${mungePath}/${subdir}`);
  content = content.replace("import type { OpenAPIConfig } from '."    , `import type { OpenAPIConfig } from '${mungePath}/${subdir}`);
  content = content.replace("import { BaseHttpRequest } from '."       , `import { BaseHttpRequest } from '${mungePath}/${subdir}`);
  content = content.replace("import type { CancelablePromise } from '.", `import type { CancelablePromise } from '${mungePath}/${subdir}`);

  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

function mungeFetchRequest(fetchReqPath) {
  // Hackily munge the request.ts file
  let content = fs.readFileSync(fetchReqPath, 'utf8');

  // Add in the no-cors request init
  content = content.replace(
    "const request: RequestInit = {",
    "const request: RequestInit = {\n    mode: 'no-cors',"
  );

  fs.writeFileSync(fetchReqPath, content, { encoding: 'utf8' });
}

function mungeCommon(cmnPath) {
  // Remove specific client files
  fs.rmSync(path.join(cmnPath, 'core','request.ts'));
  fs.rmSync(path.join(cmnPath, 'core', 'FetchHttpRequest.ts'));

  // Hackily munge the TfcClient.ts file
  const filePath = path.join(cmnPath, 'TfcClient.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove the reference to the Fetch style request creator. This should be injected as creation time
  content = content.replace("import { FetchHttpRequest } from './core/FetchHttpRequest';", "");
  // Make the HttpRequestConstructor required
  content = content.replace(
    "constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest)",
    "constructor(config: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor)"
  );
  // We need to export the constructor
  content = content.replace(
    "type HttpRequestConstructor = new ",
    "export type HttpRequestConstructor = new "
  );

  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

const tmpApiDir = path.join(root, 'tmp', 'tfcApi');
const commonApiDir = path.join(root, 'src', 'common', 'tfcApi');
const nodeApiDir =  path.join(root, 'src', 'node', 'tfcApi');
const browserApiDir =  path.join(root, 'src', 'browser', 'tfcApi');

console.log("Building for Nodejs...");
clean(tmpApiDir);
run(`npm run openapi:build:node -- -o "${tmpApiDir}"`);
console.log("Extracting for Nodejs...");
clean(nodeApiDir);
moveAndMungeFile(tmpApiDir, nodeApiDir, 'core', 'request.ts', '../../../common/tfcApi');
moveAndMungeFile(tmpApiDir, nodeApiDir, 'core', 'AxiosHttpRequest.ts', '../../../common/tfcApi');

console.log("Building for Web...");
clean(tmpApiDir);
run(`npm run openapi:build:web -- -o "${tmpApiDir}"`);
console.log("Extracting for Web...");
clean(browserApiDir);
moveAndMungeFile(tmpApiDir, browserApiDir, 'core', 'request.ts', '../../../common/tfcApi');
moveAndMungeFile(tmpApiDir, browserApiDir, 'core', 'FetchHttpRequest.ts', '../../../common/tfcApi');
mungeFetchRequest(path.join(browserApiDir, 'core', 'request.ts'));

console.log("Building for Common ...");
clean(commonApiDir);
run(`npm run openapi:build:web -- -o "${commonApiDir}"`);
console.log("Extracting for Web...");
mungeCommon(commonApiDir);
