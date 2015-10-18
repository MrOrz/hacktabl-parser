/* Table parser */

import {COMMENTS, ERRORS} from './constants';
import {ColGroup, RowGroup} from './components';

export async function parseToDocument(xml) {
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

// Process header rows to populate header rows (column headers)
//
export function processHeaderRows(rowElems, commentMap, config) {
  let columnHeaders = [];
  let parentHeaderOfColumn = []; // Maps column id to parent header

  for(let i = 0; i < config.HEADER_ROWS; i+=1) {
    let isFirstRow = i === 0;
    let isLeafRow = i === config.HEADER_ROWS-1;

    let cells = rowElems[i].querySelectorAll('w\\:tc');
    let columnId = 0; // 0 ~ (total column count)-1

    for(let j = 0; j < cells.length; j+=1){
      let cell = cells[j];
      let gridSpanElem = cell.querySelector('w\\:gridSpan');
      let colspan = 1;

      if (gridSpanElem) {
        colspan = +gridSpanElem.getAttribute('w:val') || colspan;
      }

      if(columnId < config.HEADER_COLUMNS) {
        // Skipping header columns
        columnId += colspan;
        continue;
      }

      let colgroup = new ColGroup(cell.textContent, isLeafRow);

      if(isFirstRow) {
        columnHeaders.push(colgroup);
      }else{
        parentHeaderOfColumn[columnId].children.push(colgroup);
      }


      if(isLeafRow && colspan !== 1) {
        throw ERRORS.INVALID_MERGED_COLUMN_HEADER;
      }

      // Update parentHeaderOfColumn[] mapping
      //
      let parentHeader = parentHeaderOfColumn[columnId];
      for(let k = 0; k < colspan; k+=1){
        // If the headers are correctly nested,
        // each column spanned by this header should map to the same parent header
        //
        if(parentHeader !== parentHeaderOfColumn[columnId]) {
          throw ERRORS.INVALID_COLUMN_HEADER_NESTING;
        }
        parentHeaderOfColumn[columnId] = colgroup;
        columnId += 1;
      }
    }
  }

  return columnHeaders;
}

export default async function parseTable (docXML, commentsXML, config) {
  let commentMap = await parseComments(commentsXML);
  let docDocument = await parseToDocument(docXML);

  let tableElem = docDocument.querySelector('w\\:tbl');
  let rowElems = tableElem.querySelectorAll('w\\:tr');

  let columnHeaders = processHeaderRows(rowElems, commentMap, config);

  return {

  }
}
