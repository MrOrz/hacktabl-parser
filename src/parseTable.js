/* Table parser */

import {COMMENTS, ERRORS} from './constants';
import {ColGroup, RowGroup, Paragraph, HyperLink, Run} from './components';

export async function parseToDocument(xml, jsdomMode='xml') {
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
        parsingMode: jsdomMode,
        done: (err, global) => {
          if(err) { reject(err); return; }
          resolve(global.document);
        }
      });
    });
  }

}

export async function parseRels(relsXML) {
  // Not sure why we need to use parsingMode='html' for jsdom to work...
  //
  let relsDocument = await parseToDocument(relsXML, 'html');

  let hyperLinkMap = {};
  for(let hyperLinkElem of relsDocument.querySelectorAll('relationship[type$="hyperlink"]')) {
    hyperLinkMap[hyperLinkElem.getAttribute('Id')] = hyperLinkElem.getAttribute('Target');
  }

  return hyperLinkMap;
}

export async function parseComments(commentsXML) {
  let commentsDocument = await parseToDocument(commentsXML);
  // Parse comments
  //
  let commentMap = {};

  for(let commentElem of commentsDocument.querySelectorAll('w\\:comment')){
    let id = commentElem.getAttribute('w:id');
    let text =
      Array.prototype.map.call(commentElem.querySelectorAll('w\\:t'),
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
      author: commentElem.getAttribute('w:author'),
      date: new Date(commentElem.getAttribute('w:date')),
      id, type, text
    };
  };

  return commentMap;
}

function processParagraphChildren(childNodes, hyperLinkMap, config, commentIdsInRange = {}){
  // commentIdsInRange{} is the currently activated comment ids

  // Make an array copy of childNodes NodeList because we may mutate the list later.
  //
  let nodeQueue = Array.prototype.slice.call(childNodes, 0);

  let children = [];
  let lastRun;

  for(let i = 0; i < nodeQueue.length; i+=1){
    let node = nodeQueue[i];
    switch(node.nodeName){
      case 'w:hyperlink':
        if( config.HIGHLIGHT ){
          lastRun = null; // Force new run
          let hyperlink = new HyperLink(hyperLinkMap[node.getAttribute('r:id')]);
          hyperlink.runs = processParagraphChildren(node.childNodes, hyperLinkMap, config, commentIdsInRange);
          children.push(hyperlink);
        } else {
          // Directly unwrap the w:hyperlink
          nodeQueue.splice(i+1, 0, ...node.childNodes)
        }

        break;

      case 'w:r':
        let runCfg = {
          text: node.textContent,
          isB: node.querySelector('w\\:rPr > w\\:b[w\\:val="1"]') !== null,
          isI: node.querySelector('w\\:rPr > w\\:i[w\\:val="1"]') !== null,
          isU: node.querySelector('w\\:rPr > w\\:u[w\\:val="1"]') !== null,
        };

        if(!runCfg.text) {
          // No text in run, just skip
          continue;
        }

        if (lastRun) {
          let isConfigMatch = lastRun.isB === runCfg.isB &&
                              lastRun.isI === runCfg.isI &&
                              lastRun.isU === runCfg.isU;

          if (!config.HIGHLIGHT || (config.HIGHLIGHT && isConfigMatch)) {
            // Reuse lastRun
            lastRun.text += node.textContent;
            continue;
          }
        }

        // Create new run
        runCfg.commentIds = Object.keys(commentIdsInRange);
        lastRun = new Run(runCfg);
        children.push(lastRun);

        break;

      case 'w:commentRangeStart':
        lastRun = null; // Force new run
        commentIdsInRange[+node.getAttribute('w:id')] = true;
        break;

      case 'w:commentRangeEnd':
        lastRun = null; // Force new run
        delete commentIdsInRange[+node.getAttribute('w:id')];
        break;
    }
  };

  return children;
}

// Process runs, hyperlinks and comments in a single paragraph
// into a paragraph instance.
//
export function processParagraph(pElem, hyperLinkMap, config) {
  let level = -1; // Normal text
  let numPrElem = pElem.querySelector('w\\:pPr > w\\:numPr');
  if(numPrElem) {
    level = +numPrElem.querySelector('w\\:ilvl').getAttribute('w:val')
  }

  let paragraph = new Paragraph(level);
  paragraph.children = processParagraphChildren(pElem.childNodes, hyperLinkMap, config);

  return paragraph;
}

function processTitleCellParagraphs(cellElem, hyperLinkMap, config){
  return Array.prototype.map.call(cellElem.querySelectorAll('w\\:p'), p =>
    processParagraph(p, hyperLinkMap, config));
}

// Process header rows to populate header rows (column headers)
//
export function processHeaderRows(rowElems, hyperLinkMap, config) {
  let columnHeaders = [];
  let parentHeaderOfColumn = []; // Maps column id to parent header

  for(let i = 0; i < config.HEADER_ROWS; i+=1) {
    let isFirstRow = i === 0;
    let isLeafRow = i === config.HEADER_ROWS-1;

    let cellElems = rowElems[i].querySelectorAll('w\\:tc');
    let columnId = 0; // 0 ~ (total column count)-1

    for(let j = 0; j < cellElems.length; j+=1){
      let cellElem = cellElems[j];
      let gridSpanElem = cellElem.querySelector('w\\:gridSpan');
      let colspan = gridSpanElem ? +gridSpanElem.getAttribute('w:val') : 1;

      if(columnId < config.HEADER_COLUMNS) {
        // Skipping header columns
        columnId += colspan;
        continue;
      }

      let colGroup = new ColGroup(processTitleCellParagraphs(cellElem, hyperLinkMap, config), isLeafRow);

      if(isFirstRow) {
        columnHeaders.push(colGroup);
      }else{
        parentHeaderOfColumn[columnId].children.push(colGroup);
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
        parentHeaderOfColumn[columnId] = colGroup;
        columnId += 1;
      }
    }
  }

  return columnHeaders;
}

export function processBodyRows(rowElems, hyperLinkMap, config) {
  let rows = [];
  let parentHeaderOfLevel = []; // Maps header level to parent header

  for(let i = config.HEADER_ROWS; i<rowElems.length; i+=1){
    let cellElems = rowElems[i].querySelectorAll('w\\:tc');


    // Row header cells
    //
    let headerCellCount = 0;
    for(let j = 0; j < config.HEADER_COLUMNS; headerCellCount += 1){
      let cellElem = cellElems[j];
      let gridSpanElem = cellElem.querySelector('w\\:gridSpan');
      let vMergeElem = cellElem.querySelector('w\\:vMerge');

      let colspan = gridSpanElem ? +gridSpanElem.getAttribute('w:val') : 1;
      let isLeaf = j + colspan === config.HEADER_COLUMNS;
      let isVerticallyMerged = !!vMergeElem;
      let isVerticallyContinuing = isVerticallyMerged && vMergeElem.getAttribute('w:val') === 'continue';

      if(isLeaf && isVerticallyMerged) {
        throw ERRORS.INVALID_MERGED_ROW_HEADER;
      }

      if(!isVerticallyContinuing){
        let rowGroup = new RowGroup(processTitleCellParagraphs(cellElem, hyperLinkMap, config), colspan, isLeaf);

        if( j === 0 ){
          rows.push(rowGroup);
        } else {
          parentHeaderOfLevel[j-1].children.push(rowGroup);
        }

        for( let k = 0; k<colspan; k+=1) {
          parentHeaderOfLevel[j+k] = rowGroup;
        }
      }else if( j > 0 && -1 === parentHeaderOfLevel[j-1].children.indexOf(parentHeaderOfLevel[j])){
        // The cell continues from the upper cell.
        // Check if it is nested correctly.
        //
        throw ERRORS.INVALID_ROW_HEADER_NESTING;
      }

      j += colspan;
    }

    // Row data cells
    //
    for(let j = headerCellCount; j < cellElems.length ; j+=1){
      let cellElem = cellElems[j];
      if(cellElem.querySelector('w\\:vMerge') || cellElem.querySelector('w\\:gridSpan')) {
        throw ERRORS.INVALID_MERGING;
      }

      Array.prototype.forEach.call(cellElem.querySelectorAll('w\\:p'), pElem => {

      });
    }
  }

  return rows
}

export default async function parseTable (xmls, config) {
  let commentMap = await parseComments(xmls.comments);
  let hyperLinkMap = await parseRels(xmls.rels);
  let docDocument = await parseToDocument(xmls.document);

  let tableElem = docDocument.querySelector('w\\:tbl');
  let rowElems = tableElem.querySelectorAll('w\\:tr');

  return {
    columns: processHeaderRows(rowElems, hyperLinkMap, config),
    rows: processBodyRows(rowElems, hyperLinkMap, config)
  }
}
