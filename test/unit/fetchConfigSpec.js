import {expect} from 'chai';
import {fetchConfig, ERRORS, DEFAULTS} from '../../src';
import {processConfig} from '../../src/fetchConfig'

describe('htparser.fetchConfig', () => {
  it('should reject when there is no corresponding ethercalc for the given ID (requires Internet)', () => {
    return expect(fetchConfig('_THIS_SHOULD_NOT_EXIST_')).to.be.rejectedWith(ERRORS.NO_ETHERCALC);
  });

  it('should reject when both DOC_ID and (DATA_URL, EDIT_URL) are absent', () => {
    expect(() => processConfig({DOC_ID: 'test'})).to.not.throw;
    expect(() => processConfig({DATA_URL: 'test'})).to.throw(ERRORS.NO_EDIT_URL);
    expect(() => processConfig({EDIT_URL: 'test'})).to.throw(ERRORS.NO_DATA_URL);
  });

  it('should use docx as data source', () => {
    // If DATA_URL is given, it should change to use docx format.

    let result1 = processConfig({
      // Format 1
      DATA_URL: 'https://docs.google.com/feeds/download/documents/export/Export?id=189K9aM7m9wrxoj63De3zoBrK0LDYDF76_BTROXWPR4M&exportFormat=html',
      EDIT_URL: '_FOO_'
    });

    expect(result1.DATA_URL).to.eql('https://docs.google.com/feeds/download/documents/export/Export?id=189K9aM7m9wrxoj63De3zoBrK0LDYDF76_BTROXWPR4M&exportFormat=docx');

    let result2 = processConfig({
      // Format 2
      DATA_URL: 'http://docs.google.com/document/export?format=html&id=1D_TfV5udsWesnD2RFQ5D2VXrbuPG6hOxW1bhqjPKaFg&hl=en',
      EDIT_URL: '_FOO_'
    });

    expect(result2.DATA_URL).to.eql('http://docs.google.com/document/export?format=docx&id=1D_TfV5udsWesnD2RFQ5D2VXrbuPG6hOxW1bhqjPKaFg&hl=en');
  })

  it('should supply DEFAULTS and overrides DEFAULTS correctly', () => {
    // DOC_ID --> DATA_URL and EDIT_URL
    let docIdResult = processConfig({DOC_ID:"test"});
    expect(docIdResult).to.have.property('DATA_URL');
    expect(docIdResult).to.have.property('EDIT_URL');

    // Should have DEFAULTS
    expect(docIdResult.HEADER_COLUMNS).to.eql(DEFAULTS.HEADER_COLUMNS);

    // Values should override DEFAULTS
    let overrideResult = processConfig({DOC_ID:"test", HEADER_COLUMNS: 3});
    expect(overrideResult.HEADER_COLUMNS).to.eql(3);
  });

  it('should convert numeric options to number', () => {
    let result = processConfig({
      DOC_ID: 'foo',
      HEADER_COLUMNS: '2',
      HEADER_ROWS: '3',
      LABEL_SUMMARY: '4'
    });
    expect(result).to.have.property('HEADER_COLUMNS', 2);
    expect(result).to.have.property('HEADER_ROWS', 3);
    expect(result).to.have.property('LABEL_SUMMARY', 4);
  });
});
