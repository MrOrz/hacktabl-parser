export const ERRORS = {
  NO_ETHERCALC: 'Ethercalc ID does not exist',
  NO_EDIT_URL: 'Neither DOC_ID nor EDIT_URL exists in the specified Ethercalc',
  NO_DATA_URL: 'Neither DOC_ID nor DATA_URL exists in the specified Ethercalc',

  NOT_SHARED: 'Specified Google Doc should be shared to anyone',
  INVALID_DATA_URL: 'Unable to fetch the given Google Doc with the specified DOC_ID or DATA_URL',
  INVALID_MERGED_COLUMN_HEADER: 'The column headers adjacent to data should not be horizontally merged',
  INVALID_MERGED_ROW_HEADER: 'The row headers adjacent to data should not be vertically merged',
  INVALID_COLUMN_HEADER_NESTING: 'The column headers are not correctly nested',
  INVALID_ROW_HEADER_NESTING: 'The row headers are not correctly nested',
  INVALID_MERGING: 'Data cells should not be merged',
};

export const DEFAULTS = {
  HEADER_COLUMNS: 1,
  HEADER_ROWS: 1,
  HIGHLIGHT: false,
  LABEL_SUMMARY: 0,
  TITLE: 'Hacktabl: collaborative table for everyone',
  TYPE: 'EXPANDED',
  EMPHASIZE_NO_REF: false
};

export const COMMENTS = {
  REF_MISSING: 'REF_MISSING',
  REF_CONTROVERSIAL: 'REF_CONTROVERSIAL',
  QUESTIONABLE: 'QUESTIONABLE',
  NOTE: 'NOTE',
  SECOND: 'SECOND',
  OTHER: 'OTHER'
};
