import {expect} from 'chai';
import parseTable, {parseComments, processHeaderRows, processParagraph, parseToDocument, parseRels} from '../../src/parseTable';
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
      expect(commentMap['102']).to.have.property('type', COMMENTS.NOTE);
      expect(commentMap['102']).to.have.property('text', "據官網：成立類似「人口、健康及社會保障研究中心」建置長期照顧資料以利整合各縣市資訊系統。(1)非營利、營利、準營利服務單位均應納入管理與監督(政府財源應優先用於擴大非營利組織所提供的長期照顧服務)。(2)發展更精確的需求評估工具，以利實現以需求評估結果作為服務的依據，避免資源浪費。");

      // Multi-paragraph comments. Type = Note
      expect(commentMap['70']).to.have.property('type', COMMENTS.NOTE);
      expect(commentMap['70']).to.have.property('text', "具體作法：\n1.擴大政治參與機會\n2.建立城鄉產業連結\n3.保障居住權\n4.維護接受語言和文化教育的權利");

      // Type = Controlversial reference
      expect(commentMap['23']).to.have.property('type', COMMENTS.REF_CONTROVERSIAL);

      // Mistyped type
      expect(commentMap['26']).to.have.property('type', COMMENTS.OTHER);
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
      expect(columnHeaders[0]).to.have.property('title').and.eqls('COL_HEADER');
      expect(columnHeaders[0]).not.to.have.property('children');
    });

    it('should process multiple-row header with merges', () => {
      let columnHeaders = processHeaderRows(tables[1], {}, processConfig({DOC_ID:'foo', HEADER_ROWS: 3}));
      expect(columnHeaders).to.have.length(2);
      expect(columnHeaders[1]).to.have.property('title').and.eqls('COL_HEADER_2');
      expect(columnHeaders[0]).to.have.property('children').and.have.length(2);
      expect(columnHeaders[0].children[1]).to.have.property('title').and.eqls('COL_HEADER_4');
      expect(columnHeaders[0].children[1]).to.have.property('children').and.have.length(2);
      expect(columnHeaders[0].children[1].children[0]).to.have.property('title').and.eqls('COL_HEADER_9');

      expect(columnHeaders[1].children[0]).to.have.property('children').and.have.length(1);
      // Merged with COL_HEADER_5, expected to be empty
      expect(columnHeaders[1].children[0].children[0]).to.have.property('title').and.eqls('');
    });

    it('should detect invalid nesting on column headers', () => {
      expect(() => processHeaderRows(tables[2], {}, processConfig({DOC_ID:'foo'}))).to.throw(ERRORS.INVALID_MERGED_COLUMN_HEADER);
      expect(() => processHeaderRows(tables[3], {}, processConfig({DOC_ID:'foo', HEADER_ROWS: 3}))).to.throw(ERRORS.INVALID_COLUMN_HEADER_NESTING);
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
      console.log('HYPERLINK_MAP', hyperLinkMap);
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
      expect(hyperlink.children).to.have.length(1);
    });
  });
});
