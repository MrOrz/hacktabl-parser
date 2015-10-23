import fetch from 'isomorphic-fetch';
import {ERRORS, DEFAULTS} from './constants';

/* Validates configuration, populate defaults, etc. */
export function processConfig (configObj) {

  if(configObj.DOC_ID) {
    configObj.EDIT_URL = configObj.EDIT_URL || `https://docs.google.com/document/d/${configObj.DOC_ID}/edit`;
    configObj.DATA_URL = configObj.DATA_URL || `https://docs.google.com/feeds/download/documents/export/Export?id=${configObj.DOC_ID}&exportFormat=docx`;

  } else if (!configObj.DATA_URL) {
    throw ERRORS.NO_DATA_URL;

  } else if (!configObj.EDIT_URL) {
    throw ERRORS.NO_EDIT_URL;

  } else {
    // No DOC_ID given, but both DATA_URL and EDIT_URL exists.
    configObj.DOC_ID = configObj.DATA_URL.match(/\bid=([^&]+)/)[1];
  }

  // DATA_URL should always use docx format.
  // URLs should come in 2 patterns:
  // 1. http://docs.google.com/document/export?format=docx&id=<id>=en
  // 2. https://docs.google.com/feeds/download/documents/export/Export?id=<id>&exportFormat=html
  configObj.DATA_URL = configObj.DATA_URL.replace(/\bformat=[^&]+/, "format=docx")
                                         .replace(/\bexportFormat=[^&]+/, "exportFormat=docx");

  // Populate with the defaults
  for (let key of Object.keys(DEFAULTS)) {
    configObj[key] = configObj[key] || DEFAULTS[key];
  }

  return configObj;
}

/* Config fetcher */
export default async function fetchConfig (etherCalcId) {
  let resp = await fetch(`https://ethercalc.org/${etherCalcId}.csv`);

  if( resp.status === 404) {
    throw ERRORS.NO_ETHERCALC;
  }

  let csvData = await resp.text();

  // Process CSV data into key-value pairs (object)

  let configObj = {}
  for(let row of csvData.split('\n')) {
    let columns = row.split(',').map(word => word.match(/^"?(.*?)"?$/)[1]);
    if(columns.length >= 2) {
      configObj[columns[0]] = columns[1];
    }
  }

  return processConfig(configObj);
}
