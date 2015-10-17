'use strict';

import {DEFAULTS, ERRORS} from './constants';
import fetchConfig from './fetchConfig';
import fetchDoc from './fetchDoc';
import parseTable from './parseTable';

export {DEFAULTS, ERRORS, fetchConfig, fetchDoc, parseTable};

/* The main interface */
export default async function hacktablParser (etherCalcId) {
  let config = await fetchConfig(etherCalcId);
  let docXML = await fetchDoc(conf.DATA_URL);
  return parseTable(docXML.document, docXML.comments, conf);
}
