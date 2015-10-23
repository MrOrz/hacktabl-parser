import JSZip from 'jszip';
import fetch from 'isomorphic-fetch';
import {ERRORS} from './constants';

/* DOC file fetcher & extractor */
export default async function fetchDoc (dataUrl) {

  // First, try fetching the docx file form the given dataUrl
  //
  let docxBuffer;
  let resp;
  try {
    resp = await fetch(dataUrl);
  } catch (e) {
    if( e.message ){
      // node-fetch errors has 'message' property
      throw ERRORS.INVALID_DATA_URL;

    } else {
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
  }

  if(!resp.ok) {
    throw ERRORS.INVALID_DATA_URL;
  } else if(resp.url !== dataUrl) {
    /* If 'share option' of google doc is closed,
         `fetch` will be redirected to Google Login page. */

    throw ERRORS.NOT_SHARED;
  }

  if( resp.arrayBuffer ){
    // Browsers should support arrayBuffer
    //
    docxBuffer = await resp.arrayBuffer();

  } else {
    // node-fetch does not support resp.arrayBuffer
    //

    docxBuffer = await new Promise((resolve, reject) => {
      let chunks = [];
      let bytes = 0;

      resp.body.on('error', err => {
        reject(INVALID_DATA_URL);
      });

      resp.body.on('data', chunk => {
        chunks.push(chunk);
        bytes += chunk.length;
      });

      resp.body.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  // Then, unzip the retrieved docx file and return the uncompressed results.
  //
  let zip = new JSZip(docxBuffer);
  return {
    document: zip.file('word/document.xml').asText(),
    comments: zip.file('word/comments.xml') ? zip.file('word/comments.xml').asText() : "",
    rels: zip.file('word/_rels/document.xml.rels').asText()
  };

}
