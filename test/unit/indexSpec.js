import {expect} from 'chai';
import parser, {fetchDoc, parseTable} from '../../src';
import {processConfig} from '../../src/fetchConfig';

describe('htparser', () => {
  it('should parse everything given an etherCalcId (requires Internet)', async function() {
    this.timeout(30000); // Fetching and parsing takes lots of time...

    let {config, table} = await parser('HACKTABL_PARSER_TEST');

    expect(config).to.have.property('TITLE', 'Hacktabl parser fixture');
    expect(table).to.have.deep.property('rows[0].cells[0].items[0].children[1].text', '加入 TPP 的各層面問題');
  });
});