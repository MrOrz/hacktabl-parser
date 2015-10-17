import JSZip from 'jszip';
import {ERRORS} from './constants';

/* DOC file fetcher & extractor */
export default async function fetchDoc (dataUrl) {

  // First, try fetching the docx file form the given dataUrl
  //
  let docxBuffer;

  if( typeof window !== 'undefined' ){
    // Browser environment
    //
    let fetch = require('isomorphic-fetch');
    let resp;
    try {
      resp = await fetch(dataUrl);
    } catch (e) {
      /* If 'share option' of google doc is closed,
         `fetch` will be redirected to Google Login page,
         which does not allow cross-origin requests.

         In browsers, it will trigger CORS error and fetch would reject with TypeError.

         NOTE: There is currently no way in browsers to distinguish CORS errors
         from other network errors like DNS resolve error.
         Especially in Google chrome, the above two error returns identical errors
         with their message set to "Unable to fetch".
       */
      throw ERRORS.NOT_SHARED;
    }

    if(!resp.ok) {
      throw ERRORS.INVALID_DATA_URL;
    }

    docxBuffer = Uint8Array.from(await resp.arrayBuffer());

  } else {
    // NodeJS environment
    //

    let httpClient = dataUrl.startsWith('https://') ? require('https') : require('http');
    let url = require('url');

    docxBuffer = await new Promise((resolve, reject) => {
      let chunks = [], dataLen = 0;

      let req = httpClient.get(url.parse(dataUrl), (resp) => {
        if(resp.statusCode >= 300 && resp.statusCode <= 399) {
          /* If 'share option' of google doc is closed,
             `fetch` will be redirected to Google Login page */
          reject(ERRORS.NOT_SHARED); return;

        } else if(resp.statusCode >= 400) {
          reject(ERRORS.INVALID_DATA_URL); return;
        }

        resp.on('data', (chunk) => {
          chunks.push(chunk); dataLen += chunk.length;
        });

        resp.on('end', () => {
          let buffer = new Buffer(dataLen);
          let pos = 0;
          for( let chunk of chunks ){
            chunk.copy(buffer, pos);
            pos += chunk.length;
          }

          resolve(buffer);
        });
      });

      req.on('error', (err) => {
        reject(ERRORS.INVALID_DATA_URL);
      });
    });
  }

  // Then, unzip the retrieved docx file and return the uncompressed results.
  //
  let zip = new JSZip(docxBuffer);
  return {
    document: zip.file('word/document.xml').asText(),
    comments: zip.file('word/comments.xml').asText()
  };

}
