import {expect} from 'chai';
import parseTable, {
  parseComments, processHeaderRows, processParagraph, parseToDocument,
  parseRels, processBodyRows
} from '../../src/parseTable';
import {processConfig} from '../../src/fetchConfig';
import {ERRORS, COMMENTS} from '../../src/';
import fs from 'fs';

function readFixture(fileName) {
  return fs.readFileSync(`${__dirname}/../fixtures/${fileName}`, 'utf8');
}

describe('htparser.parseTable', () => {
  describe('parseComments', () => {
    let commentMap;
    before('loading and parsing comment from fixtures', async function() {
      commentMap = await parseComments(readFixture('comments-president2016.xml'));
    });

    it('should parse authors, ids and dates', () => {
      expect(commentMap).to.be.an('object');
      expect(commentMap).to.contain.all.keys('77', '41', '75');
      expect(commentMap['77']).to.have.property('author', 'Johnson Liang');
      expect(commentMap['77']).to.have.property('id', '77');
      expect(commentMap['77']).to.have.property('date').and.eqls(new Date("2015-10-03T14:01:23Z"));
    });

    it('should give correct types for each comment', () => {
      // Single-paragraph comments. Type = Note
      expect(commentMap['102']).to.have.property('type', '補充說明');
      expect(commentMap['102']).to.have.property('text', "據官網：成立類似「人口、健康及社會保障研究中心」建置長期照顧資料以利整合各縣市資訊系統。(1)非營利、營利、準營利服務單位均應納入管理與監督(政府財源應優先用於擴大非營利組織所提供的長期照顧服務)。(2)發展更精確的需求評估工具，以利實現以需求評估結果作為服務的依據，避免資源浪費。");

      // Multi-paragraph comments. Type = Note
      expect(commentMap['70']).to.have.property('type', '補充說明');
      expect(commentMap['70']).to.have.property('text', "具體作法：\n1.擴大政治參與機會\n2.建立城鄉產業連結\n3.保障居住權\n4.維護接受語言和文化教育的權利");

      // Type = Controlversial reference
      expect(commentMap['23']).to.have.property('type', '出處爭議');

      // Mistyped type
      expect(commentMap['26']).to.have.property('type', null);
    });

    it('should handle empty comments', () => {
      return expect(parseComments('')).to.eventually.eql({});
    });
  });

  describe('processHeaderRows', () => {
    //
    // See the real tables:
    //
    // https://docs.google.com/document/d/11sZHm560LSOIjEE7QYjY4Xx7ygaBNy7QDkISwZ3gbm8/edit?usp=sharing
    //
    let tables;

    before('populate tables', async function(){
      let doc = await parseToDocument(readFixture('processHeaderRows.xml'));
      tables = Array.prototype.map.call(doc.querySelectorAll('w\\:tbl'), (tableElem) => {
        return tableElem.querySelectorAll('w\\:tr');
      });
    });

    it('should process single-row header', () => {
      let columnHeaders = processHeaderRows(tables[0], {}, processConfig({DOC_ID:'foo', HEADER_COLUMNS: 2}));
      expect(columnHeaders).to.have.length(1);
      expect(columnHeaders[0]).to.have.property('paragraphs').and.have.length(1);
      expect(columnHeaders[0]).to.have.deep.property('paragraphs[0].children').and.have.length(1);
      expect(columnHeaders[0]).to.have.deep.property('paragraphs[0].children[0].text', 'COL_HEADER');
      expect(columnHeaders[0]).not.to.have.property('children');
    });

    it('should process multiple-row header with merges', () => {
      let columnHeaders = processHeaderRows(tables[1], {}, processConfig({DOC_ID:'foo', HEADER_ROWS: 3}));
      expect(columnHeaders).to.have.length(2);
      expect(columnHeaders[1]).to.have.property('paragraphs').and.have.length(1);
      expect(columnHeaders[1]).to.have.deep.property('paragraphs[0].children[0].text', 'COL_HEADER_2');
      expect(columnHeaders[0]).to.have.property('children').and.have.length(2);
      expect(columnHeaders[0]).to.have.deep.property('children[1].paragraphs[0].children[0].text', 'COL_HEADER_4');
      expect(columnHeaders[0]).to.have.deep.property('children[1].children').and.have.length(2);
      expect(columnHeaders[0]).to.have.deep.property('children[1].children[0].paragraphs[0].children[0].text', 'COL_HEADER_9');

      expect(columnHeaders[1]).to.have.deep.property('children[0].children').and.have.length(1);
      // Merged with COL_HEADER_5, expected to be empty
      expect(columnHeaders[1]).to.have.deep.property('children[0].children[0].paragraphs[0].children').to.have.length(0);
    });

    it('should detect invalid nesting on column headers', () => {
      expect(() => processHeaderRows(tables[2], {}, processConfig({DOC_ID:'foo'}))).to.throw(ERRORS.INVALID_MERGED_COLUMN_HEADER);
      expect(() => processHeaderRows(tables[3], {}, processConfig({DOC_ID:'foo', HEADER_ROWS: 3}))).to.throw(ERRORS.INVALID_COLUMN_HEADER_NESTING);
    });
  });

  describe('processBodyRows', () => {
    describe('header cell processing', () => {
      //
      // See the real tables:
      //
      // https://docs.google.com/document/d/1xaIh6mx4pJFZg0s5iRDqxAUPLhggR_nxRt-yroOHI6k/edit?usp=sharing
      //
      let tables;

      before('populate tables', async function(){
        let doc = await parseToDocument(readFixture('processBodyRows-rowheader.xml'));
        tables = Array.prototype.map.call(doc.querySelectorAll('w\\:tbl'), (tableElem) => {
          return tableElem.querySelectorAll('w\\:tr');
        });
      });

      it('should process single-row header', () => {
        let rows = processBodyRows(tables[0], {}, processConfig({DOC_ID:'foo'}));
        expect(rows).to.have.length(2);
        expect(rows[0]).to.have.property('paragraphs').and.have.length(1);
        expect(rows[0]).to.have.deep.property('paragraphs[0].children').and.have.length(1);
        expect(rows[0]).to.have.deep.property('paragraphs[0].children[0].text', 'ROW_HEADER_1');
        expect(rows[0]).not.to.have.property('children');
      });

      it('should process multiple-row header with merges', () => {
        let rows = processBodyRows(tables[1], {}, processConfig({DOC_ID:'foo', HEADER_COLUMNS: 3}));
        expect(rows).to.have.length(2);
        expect(rows[1]).to.have.property('paragraphs').and.have.length(1);
        expect(rows[1]).to.have.deep.property('paragraphs[0].children[0].text', 'ROW_HEADER_2');
        expect(rows[0]).to.have.property('children').and.have.length(2);
        expect(rows[0]).to.have.deep.property('children[1].paragraphs[0].children[0].text', 'ROW_HEADER_4');
        expect(rows[0]).to.have.deep.property('children[1].children').and.have.length(2);
        expect(rows[0]).to.have.deep.property('children[1].children[0].paragraphs[0].children[0].text', 'ROW_HEADER_9');

        // Horizontally merged cell that is adjacent to data cell.
        expect(rows[1]).to.have.deep.property('children[0]').to.not.have.property('children');
        expect(rows[1]).to.have.deep.property('children[0]').to.have.property('colspan', 2);
      });

      it('should detect invalid nesting on column headers', () => {
        expect(() => processBodyRows(tables[2], {}, processConfig({DOC_ID:'foo'}))).to.throw(ERRORS.INVALID_MERGED_ROW_HEADER);
        expect(() => processBodyRows(tables[3], {}, processConfig({DOC_ID:'foo', HEADER_COLUMNS: 3}))).to.throw(ERRORS.INVALID_ROW_HEADER_NESTING);
      });
    });

    describe('data cell processing', () => {
      //
      // See the real table:
      //
      // https://docs.google.com/document/d/1ea0PFeRbM-7UfAW9xtRLP_UisJb5nf4yvlVuSy9IZz4/edit?usp=sharing
      //
      let theCell;

      before('populate the cell', async function(){
        let doc = await parseToDocument(readFixture('processBodyRows-datacell.xml'));
        const URL = 'http://google.com';
        theCell = processBodyRows(doc.querySelectorAll('w\\:tr'), {
          rId11: URL, rId10: URL, rId9: URL, rId5: URL, rId6: URL, rId7: URL, rId8: URL,
        }, processConfig({DOC_ID: 'foo'}))[0].cells[0];
      });

      it('should process summary paragraphs', () => {
        expect(theCell).to.have.property('summaryParagraphs').and.have.length(2);
        expect(theCell).to.have.deep.property('summaryParagraphs[1].children[0].text', 'Summary 2');
      });
      it('should process items with levels', () => {
        expect(theCell).to.have.deep.property('items[0].level', 0);
        expect(theCell).to.have.deep.property('items[0].children[0].text', 'Item1');
        expect(theCell).to.have.deep.property('items[1].level', 1);
      });
      it('should process items with a reference', () => {
        // Simplest reference
        //
        expect(theCell).to.have.deep.property('items[2].children[0].text', 'item2');
        expect(theCell).to.have.deep.property('items[2].ref[0].href', 'http://google.com');
        expect(theCell).to.have.deep.property('items[2].ref[0].runs[0].text', 'Google');

        // "[出處" broken into different runs, should not affect parsing
        //
        expect(theCell).to.have.deep.property('items[3].children[0].text', 'item3');
        expect(theCell).to.have.deep.property('items[3].ref[0].href', 'http://google.com');

        // "[出處" cut by hyperlinks, still should not affect parsing.
        // Have comments in reference. Hyperlinks will be cut in two by the comment.
        //
        expect(theCell).to.have.deep.property('items[4].children[0].text', 'item4');
        expect(theCell).to.have.deep.property('items[4].ref').to.have.length(2);
        expect(theCell).to.have.deep.property('items[4].ref[0].href', 'http://google.com');
        expect(theCell).to.have.deep.property('items[4].ref[0].runs[0].text', 'Go');

        // No content, only reference
        //
        expect(theCell).to.have.deep.property('items[7].children').to.have.length(0);
        expect(theCell).to.have.deep.property('items[7].ref[0].runs[0].text', 'reference only');
      });
      it('should process items with labels', () => {
        expect(theCell).to.have.deep.property('items[5].labels').to.have.length(2);
        expect(theCell).to.have.deep.property('items[5].labels[1]', 'LABEL2');

        expect(theCell).to.have.deep.property('items[6].labels[0]', 'LABEL ONLY');
      });
    });
  });

  describe('processParagraph', () => {
    //
    // See the real paragraphs:
    //
    // https://docs.google.com/document/d/1XZp_bevmHcpjhLKxa9-9n3F0mbIo89h1vN0bLpnKASs/edit?usp=sharing
    //
    let paragraphs, hyperLinkMap;

    before('populate paragraphs', async function(){
      let doc = await parseToDocument(readFixture('processParagraph.xml'));
      paragraphs = doc.querySelectorAll('w\\:body > w\\:p');
      hyperLinkMap = await parseRels(readFixture('processParagraph.xml.rels'));
    });

    it('should process paragraph with 1 single run', () => {
      let paragraph = processParagraph(paragraphs[0], hyperLinkMap, processConfig({DOC_ID:'foo'}));
      expect(paragraph.children).to.have.length(1);
      expect(paragraph.children[0]).to.have.property('text', 'A paragraph');
    });

    it('should merge adjacent runs with identical style', () => {
      let paragraph = processParagraph(paragraphs[1], hyperLinkMap, processConfig({DOC_ID:'foo', HIGHLIGHT: true}));
      expect(paragraph.children).to.have.length(1);
      expect(paragraph.children[0]).to.have.property('text', 'Second paragraph with text that should be merged into 1 run');
    });

    it('should identify bullet point levels', () => {
      let paragraph2 = processParagraph(paragraphs[2], hyperLinkMap, processConfig({DOC_ID:'foo'}));
      expect(paragraph2).to.have.property('level', 0);
      expect(paragraph2.children[0].text).to.eql('Bullet item 1');

      expect(processParagraph(paragraphs[4], hyperLinkMap, processConfig({DOC_ID:'foo'}))).to.have.property('level', 1);
      expect(processParagraph(paragraphs[6], hyperLinkMap, processConfig({DOC_ID:'foo'}))).to.have.property('level', 0);
    });

    it('should process bold, italic and underline text', () => {
      // Highlight false: merged into 1 run
      let paragraph = processParagraph(paragraphs[7], hyperLinkMap, processConfig({DOC_ID:'foo', HIGHLIGHT: false}));
      expect(paragraph.children).to.have.length(1);

      // Highlight true: bold, italic, underline parsed.
      paragraph = processParagraph(paragraphs[7], hyperLinkMap, processConfig({DOC_ID:'foo', HIGHLIGHT: true}));
      expect(paragraph.children).to.have.length(7);

      // Bold & italic run
      expect(paragraph.children[5]).to.have.property('isB', true);
      expect(paragraph.children[5]).to.have.property('isI', true);
    });

    it('should process comments', () => {
      // Highlight false, should not show bold
      let paragraph = processParagraph(paragraphs[8], hyperLinkMap, processConfig({DOC_ID:'foo'}));
      expect(paragraph.children).to.have.length(3);
      expect(paragraph.children[1]).to.have.property('commentIds').and.eqls(['0', '1']);
      expect(paragraph.children[2]).to.have.property('text', ' contents.');

      // Overlapping comments
      paragraph = processParagraph(paragraphs[9], hyperLinkMap, processConfig({DOC_ID:'foo'}));
      expect(paragraph.children).to.have.length(4);
      expect(paragraph).to.have.deep.property('children[1].commentIds').and.eqls(['2', '3']);
      expect(paragraph).to.have.deep.property('children[2].commentIds').and.eqls(['3']);
    });

    it('should process hyperlinks', () => {
      // Highlight must be true to parse hyperlinks
      let paragraph = processParagraph(paragraphs[10], hyperLinkMap, processConfig({DOC_ID:'foo', HIGHLIGHT: true}));

      // Comment (<w:commentRangeStart>) in anchor will cut hyperlink into pieces
      //
      expect(paragraph.children).to.have.length(7);

      let hyperlink = paragraph.children[2];
      expect(hyperlink).to.have.property('href', 'http://google.com');
      expect(hyperlink).to.have.property('runs').and.have.length(1);
    });
  });
});
