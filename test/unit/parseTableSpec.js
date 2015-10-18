import {expect} from 'chai';
import parseTable, {parseComments} from '../../src/parseTable';
import {ERRORS, COMMENTS} from '../../src/';
import fs from 'fs';

describe('htparser.parseTable', () => {
  describe('parseComments', () => {
    let commentMap;
    before('loading and parsing comment from fixtures', async function() {
      let fileContent = fs.readFileSync(__dirname + '/../fixtures/comments-president2016.xml', 'utf8');
      commentMap = await parseComments(fileContent);
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
});
