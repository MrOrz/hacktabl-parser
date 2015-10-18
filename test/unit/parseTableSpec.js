import {expect} from 'chai';
import parseTable, {parseComments, processHeaderRows, parseToDocument} from '../../src/parseTable';
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
      expect(commentMap['77']).to.have.property('author').and.equals('Johnson Liang');
      expect(commentMap['77']).to.have.property('id').and.equals('77');
      expect(commentMap['77']).to.have.property('date').and.eqls(new Date("2015-10-03T14:01:23Z"));
    });

    it('should give correct types for each comment', () => {
      // Single-paragraph comments. Type = Note
      expect(commentMap['102']).to.have.property('type').and.equal(COMMENTS.NOTE);
      expect(commentMap['102']).to.have.property('text').and.equal("據官網：成立類似「人口、健康及社會保障研究中心」建置長期照顧資料以利整合各縣市資訊系統。(1)非營利、營利、準營利服務單位均應納入管理與監督(政府財源應優先用於擴大非營利組織所提供的長期照顧服務)。(2)發展更精確的需求評估工具，以利實現以需求評估結果作為服務的依據，避免資源浪費。");

      // Multi-paragraph comments. Type = Note
      expect(commentMap['70']).to.have.property('type').and.equal(COMMENTS.NOTE);
      expect(commentMap['70']).to.have.property('text').and.equal("具體作法：\n1.擴大政治參與機會\n2.建立城鄉產業連結\n3.保障居住權\n4.維護接受語言和文化教育的權利");

      // Type = Controlversial reference
      expect(commentMap['23']).to.have.property('type').and.equals(COMMENTS.REF_CONTROVERSIAL);

      // Mistyped type
      expect(commentMap['26']).to.have.property('type').and.equals(COMMENTS.OTHER);
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
  })
});
