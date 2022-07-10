import { TfcClient } from '../tfcApi';
import { HttpRequestConstructor } from '../tfcApi/TfcClient';

// A minor hack to change the request type depending on node vs web
let httpConstructor: HttpRequestConstructor;
export function setHttpRequestConstructor(contructor: HttpRequestConstructor) {
  httpConstructor = contructor;
}

/* eslint-disable */
export function createTfcClient(token: string, baseUrl: string): TfcClient {
  // TODO Actually check using the wellknown URL.
  if (!baseUrl.endsWith("/api/v2")) {
    baseUrl += "/api/v2";
  }

  let defaultHeaders = {
    'Accept': 'application/vnd.api+json'
  }

  return new TfcClient({
    TOKEN: token,
    BASE: baseUrl,
    HEADERS: defaultHeaders
  }, httpConstructor);
}



// var body interface{}
// switch method {
// case "GET":
//   reqHeaders.Set("Accept", "application/vnd.api+json")

//   if reqAttr != nil {
//     q, err := query.Values(reqAttr)
//     if err != nil {
//       return nil, err
//     }
//     u.RawQuery = encodeQueryParams(q)
//   }
// case "DELETE", "PATCH", "POST":
//   reqHeaders.Set("Accept", "application/vnd.api+json")
//   reqHeaders.Set("Content-Type", "application/vnd.api+json")

//   if reqAttr != nil {
//     if body, err = serializeRequestBody(reqAttr); err != nil {
//       return nil, err
//     }
//   }
// case "PUT":
//   reqHeaders.Set("Accept", "application/json")
//   reqHeaders.Set("Content-Type", "application/octet-stream")
//   body = reqAttr
// }