import {expect} from 'chai';
import fetchDoc from '../../src/fetchDoc';
import {ERRORS} from '../../src/';

describe('htparser.fetchDoc', () => {
  it('should reject with INVALID_DATA_URL when the doc cannot be retrieved', () => {
    return Promise.all([
      // DNS resolve error, causes node-fetch to reject
      expect(fetchDoc('https://_THIS_NOT_EXIST_.com'))
        .to.eventually.rejectedWith(ERRORS.INVALID_DATA_URL),

      // 404, causes node-fetch to reject
      expect(fetchDoc('https://docs.google.com/feeds/download/documents/export/Export?id=NOT_EXIST&exportFormat=docx'))
        .to.eventually.rejectedWith(ERRORS.INVALID_DATA_URL)
    ]);
  });
  it('should reject with NOT_SHARED when the doc is not shared', () => {
    return expect(fetchDoc('https://docs.google.com/feeds/download/documents/export/Export?id=1_GNChf12WwFcHeSyLqg1nh4Z8JaZihfN6jVv2FJxkBw&exportFormat=docx'))
             .to.eventually.rejectedWith(ERRORS.NOT_SHARED);
  });
  it('should return document and comment as text', () => {
    return fetchDoc('https://docs.google.com/feeds/download/documents/export/Export?id=1cS_G80kjpT-3YLdGlOAukVBEFAmZ-DE4i0SNYbmyWlg&exportFormat=docx').then((data) => {
      expect(data.document).to.include('_WORDS_IN_DOC_');
      expect(data.comments).to.include('_ANCHORED_COMMENT_');
    });
  });
});