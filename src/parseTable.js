/* Table parser */

import {COMMENTS, ERRORS} from './constants';
import {ColGroup, RowGroup, Paragraph, HyperLink, Run, DataCell} from './components';

// querySelector wrapper
//
function $(selector, node){
  if(typeof window === 'undefined') {
    // jsdom does not support namespace selector (|) but can use colons...
    selector = selector.replace(/\*\|/g, 'w\\:');
  }
  return node.querySelector(selector);
}

// querySelectorAll wrapper
//
function $$(selector, node){
  if(typeof window === 'undefined') {
    // jsdom does not support namespace selector (|) but can use colons...
    selector = selector.replace(/\*\|/g, 'w\\:');
  }
  return node.querySelectorAll(selector);
}

export async function parseToDocument(xml, jsdomMode='xml') {
  if(typeof window !== 'undefined') {
    // Browser environment
    //
    return (new DOMParser).parseFromString(xml, 'text/xml');

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
  if(!commentsXML) {return {};}

  let commentsDocument = await parseToDocument(commentsXML);
  // Parse comments
  //
  let commentMap = {};

  for(let commentElem of $$('*|comment', commentsDocument)){
    let id = commentElem.getAttribute('w:id');
    let text =
      Array.prototype.map.call($$('*|t', commentElem),
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
    switch(node.nodeName.toLowerCase()){
      case 'w:hyperlink':
        if( config.HIGHLIGHT || config.__REFERENCE__ ){
          lastRun = null; // Force new run
          let hyperlink = new HyperLink(hyperLinkMap[node.getAttribute('r:id')]);
          hyperlink.runs = processParagraphChildren(node.childNodes, hyperLinkMap, config, commentIdsInRange);
          if(hyperlink.runs.length > 0){
            children.push(hyperlink);
          }
        } else {
          // Directly unwrap the w:hyperlink
          nodeQueue.splice(i+1, 0, ...node.childNodes)
        }

        break;

      case 'w:r':
        let runCfg = {
          text: node.textContent,
          isB: $('*|rPr > *|b[*|val="1"]', node) !== null,
          isI: $('*|rPr > *|i[*|val="1"]', node) !== null,
          isU: $('*|rPr > *|u[*|val="1"]', node) !== null,
        };

        if(!runCfg.text) {
          // No text in run, just skip
          continue;
        }

        if (lastRun) {
          let isConfigMatch = lastRun.isB === runCfg.isB &&
                              lastRun.isI === runCfg.isI &&
                              lastRun.isU === runCfg.isU;

          if (!config.HIGHLIGHT || config.__REFERENCE__ || (config.HIGHLIGHT && isConfigMatch)) {
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

      case 'w:commentrangestart':
        lastRun = null; // Force new run
        commentIdsInRange[+node.getAttribute('w:id')] = true;
        break;

      case 'w:commentrangeend':
        lastRun = null; // Force new run
        delete commentIdsInRange[+node.getAttribute('w:id')];
        break;
    }
  };

  return children;
}

// Given an array of <w:t> elements, clean up the first leading spaces and
// the last trailing spaces across elements.
//
function trimTElems(tElems) {
  // Leading space
  //

  for(let tElem of tElems) {
    if(!tElem.parentNode) {continue;} // Already removed before

    tElem.textContent = tElem.textContent.replace(/^\s*/, '');
    if(tElem.textContent.length > 0) { // No more to clean
      break;
    }
    tElem.parentNode.removeChild(tElem);
  }

  // Trailing space
  //
  for(let k = tElems.length-1; k >= 0; k-=1){
    let tElem = tElems[k];
    if(!tElem.parentNode) {continue;} // Already removed before

    tElem.textContent = tElem.textContent.replace(/\s*$/, '');
    if(tElem.textContent.length > 0){ // No more to clean
      break;
    }
    tElem.parentNode.removeChild(tElem);
  }
}

function removePrefixByWordCount(tElems, wordCountToRemove) {
  for(let k = 0; k < tElems.length && wordCountToRemove > 0; k += 1){
    let tElem = tElems[k];
    if(!tElem.parentNode) {continue;} // Already removed

    if(tElem.textContent.length <= wordCountToRemove){
      wordCountToRemove -= tElem.textContent.length;
      tElem.parentNode.removeChild(tElem);

    }else{
      tElem.textContent = tElem.textContent.slice(wordCountToRemove);
      break;
    }
  }
}

function removeSuffixByWordCount(tElems, wordCountToRemove) {
  for(let k = tElems.length-1; k >=0  && wordCountToRemove > 0; k -= 1){
    let tElem = tElems[k];
    if(!tElem.parentNode) {continue;} // Already removed

    if(tElem.textContent.length <= wordCountToRemove){
      wordCountToRemove -= tElem.textContent.length;
      tElem.parentNode.removeChild(tElem);

    }else{
      tElem.textContent = tElem.textContent.slice(0, -wordCountToRemove);
      break;
    }
  }
}

// Process runs, hyperlinks and comments in a single paragraph
// into a paragraph instance.
//
export function processParagraph(pElem, hyperLinkMap, config) {
  let level = -1; // Normal text
  let numPrElem = $('*|pPr > *|numPr', pElem);
  if(numPrElem) {
    level = +$('*|ilvl', numPrElem).getAttribute('w:val')
  }

  trimTElems($$('*|t', pElem));

  let paragraph = new Paragraph(level);
  paragraph.children = processParagraphChildren(pElem.childNodes, hyperLinkMap, config);

  return paragraph;
}

function processTitleCellParagraphs(cellElem, hyperLinkMap, config){
  return Array.prototype.map.call($$('*|p', cellElem), p =>
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

    let cellElems = $$('*|tc', rowElems[i]);
    let columnId = 0; // 0 ~ (total column count)-1

    for(let j = 0; j < cellElems.length; j+=1){
      let cellElem = cellElems[j];
      let gridSpanElem = $('*|gridSpan', cellElem);
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

  // Rows
  //
  for(let i = config.HEADER_ROWS; i<rowElems.length; i+=1){
    let cellElems = $$('*|tc', rowElems[i]);


    // Row header cells
    //
    let headerCellCount = 0;
    for(let j = 0; j < config.HEADER_COLUMNS; headerCellCount += 1){
      let cellElem = cellElems[j];
      let gridSpanElem = $('*|gridSpan', cellElem);
      let vMergeElem = $('*|vMerge', cellElem);

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
    let leafHeader = parentHeaderOfLevel[config.HEADER_COLUMNS-1];
    for(let j = headerCellCount; j < cellElems.length ; j+=1){
      let cell = new DataCell;
      let cellElem = cellElems[j];
      if($('*|vMerge', cellElem) || $('*|gridSpan', cellElem)) {
        throw ERRORS.INVALID_MERGING;
      }

      // Each paragraph in a data cell
      //
      Array.prototype.forEach.call($$('*|p', cellElem), pElem => {
        if($('*|numPr', pElem) === null) {
          // Summary paragraph
          //
          cell.summaryParagraphs.push(processParagraph(pElem, hyperLinkMap, config));

        } else {
          // Paragraph is list item
          //

          // Process references
          let ref;
          let refMatch = pElem.textContent.match(/\[出處[^\]]+\]\s*$/im);
          if (refMatch) {

            // Remove the elements that composes the reference from pElem.
            // Process those reference runs / hyperlinks and store them in ref.
            //
            let wordCountToExtract = refMatch[0].length;
            let childElems = pElem.childNodes; // either <w:Hyperlink> or <w:r> directly under <w:p>
            let refElems = [];

            for(let k = childElems.length-1; k >= 0 && wordCountToExtract > 0; k-=1){
              let childElem = childElems[k];
              let copiedElem = childElem.cloneNode(true);
              refElems.unshift(copiedElem);

              // Process <w:t>s of the current child element(either <w:hyperlink> or <w:r>)
              let childTElems = $$('*|t', childElem);
              for(let m = childTElems.length-1; m>=0 && wordCountToExtract > 0; m-=1){
                let childTElem = childTElems[m];
                if(childTElem.textContent.length <= wordCountToExtract) {
                  wordCountToExtract -= childTElem.textContent.length;
                  childTElem.parentNode.removeChild(childTElem);
                } else {

                  // Remove the part that belongs to reference in childTElems
                  childTElem.textContent = childTElem.textContent.slice(0, -wordCountToExtract);

                  // Just keep the <w:t>s that is part of reference in copiedTElems.
                  let copiedTElems = $$('*|t', copiedElem);
                  copiedTElems[m].textContent = copiedTElems[m].textContent.slice(-wordCountToExtract);
                  for(let n = 0; n < m; n+=1) {
                    copiedTElems[n].parentNode.removeChild(copiedTElems[n])
                  }

                  wordCountToExtract = 0;
                }
              } // <w:t>s
            } // paragraph's child elements

            let refTElems = [];
            for(let refElem of refElems) {
              let tElems = $$('*|t', refElem);
              if(!tElems){ continue; }
              for(let tElem of tElems){
                refTElems.push(tElem);
              }
            }

            trimTElems(refTElems);

            // Remove '[出處' prefix from the collected refElems
            //
            removePrefixByWordCount(refTElems, '[出處'.length);

            // Remove ']' suffix from the collected refElems
            //
            removeSuffixByWordCount(refTElems, ']'.length);

            // Trim again, since there may be space between prefix, reference contents and suffix.
            trimTElems(refTElems);

            // Convert refElems into JS objects
            //
            ref = processParagraphChildren(refElems, hyperLinkMap, {__REFERENCE__: true});
          }

          // Process labels
          let labels;
          let labelsMatch = pElem.textContent.match(/^(?:\s*\[[^\]]+\])+/);
          if (labelsMatch) {
            labels = Array.prototype.map.call(labelsMatch[0].match(/\[[^\]]+\]/g),
                               labelWithBracket => labelWithBracket.slice(1, -1));

            // Remove labels from pElem's descendents
            //
            removePrefixByWordCount($$('*|t', pElem), labelsMatch[0].length)
          }

          // Process the rest of the paragraph
          let paragraph = processParagraph(pElem, hyperLinkMap, config);

          // Push the paragraph into cell.items
          cell.addItem(paragraph, ref, labels);
        }
      }); // paragraph

      leafHeader.cells.push(cell);
    } // cell
  } // row

  return rows
}

export default async function parseTable (xmls, config) {
  let commentMap = await parseComments(xmls.comments);
  let hyperLinkMap = await parseRels(xmls.rels);
  let docDocument = await parseToDocument(xmls.document);

  let tableElem = $('*|tbl', docDocument);
  let rowElems = $$('*|tr', tableElem);

  return {
    columns: processHeaderRows(rowElems, hyperLinkMap, config),
    rows: processBodyRows(rowElems, hyperLinkMap, config)
  }
}
