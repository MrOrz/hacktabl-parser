import {DEFAULTS, ERRORS, COMMENTS} from './constants';
import fetchConfig from './fetchConfig';
import fetchDoc from './fetchDoc';
import parseTable from './parseTable';

export {DEFAULTS, ERRORS, COMMENTS, fetchConfig, fetchDoc, parseTable};

/* The main interface */
export default async function hacktablParser (etherCalcId) {
  let config = await fetchConfig(etherCalcId);
  let xmls = await fetchDoc(config.DATA_URL);

  return {
    config,
    table: await parseTable(xmls, config)
  };
}
