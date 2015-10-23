import {DEFAULTS, ERRORS, COMMENTS} from './constants';
import fetchConfig from './fetchConfig';
import fetchDoc from './fetchDoc';
import parseTable from './parseTable';
import * as components from './components'; // For developers to make 'instanceof' check.

export {DEFAULTS, ERRORS, COMMENTS, fetchConfig, fetchDoc, parseTable, components};

/* The main interface */
export default async function hacktablParser (etherCalcId) {
  let config = await fetchConfig(etherCalcId);
  let xmls = await fetchDoc(config.DATA_URL);

  return {
    config,
    table: await parseTable(xmls, config)
  };
}
