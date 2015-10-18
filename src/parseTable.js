/* Table parser */

import {COMMENTS} from './constants';

async function parseToDocument(xml) {
  if(typeof window !== 'undefined') {
    // Browser environement
    //

    // use 'text/html' for querySelector support
    return (new DOMParser).parseFromString(xml, 'text/html');

  } else {
    // NodeJS environment
    //
    return await new Promise((resolve, reject) => {
      let jsdom = require('jsdom');
      jsdom.env({
        html: xml,
        parsingMode: 'xml',
        done: (err, global) => {
          if(err) { reject(err); return; }
          resolve(global.document);
        }
      });
    });
  }

}

export async function parseComments(commentsXML) {
  let commentsDocument = await parseToDocument(commentsXML);
  // Parse comments
  //
  let commentMap = {};

  Array.prototype.forEach.call(commentsDocument.querySelectorAll('w\\:comment'), commentElement => {
    let id = commentElement.getAttribute('w:id');
    let text =
      Array.prototype.map.call(commentElement.querySelectorAll('w\\:t'),
          t => t.textContent.trim())
        .join("\n");

    let matches = text.match(/^\[([^\]]+)\]\s*/);
    let type = COMMENTS.OTHER;

    if(matches) {
      switch(matches[1].trim()) {
        case '補充說明': type = COMMENTS.NOTE; break;
        case '需要出處': type = COMMENTS.REF_MISSING; break;
        case '出處爭議': type = COMMENTS.REF_CONTROVERSIAL; break;
        case '質疑': type = COMMENTS.QUESTIONABLE; break;
      }

      // Remove tag from comments
      text = text.slice(matches[0].length);
    }

    commentMap[id] = {
      author: commentElement.getAttribute('w:author'),
      date: new Date(commentElement.getAttribute('w:date')),
      id, type, text
    };
  });

  return commentMap;
}

export default async function parseTable (docXML, commentsXML, config) {
  let commentMap = await parseComments(commentsXML);
  let docDocument = await parseToDocument(docXML);

  return;
}
