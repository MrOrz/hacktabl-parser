describe('htparser', function() {
  it('should parse everything given an etherCalcId', function() {
    this.timeout(10000); // Fetching and parsing takes lots of time...

    return hacktablParser.default('HACKTABL_PARSER_TEST').then(function(parsed){
      chai.expect(parsed.config).to.have.property('TITLE', 'Hacktabl parser fixture');
      chai.expect(parsed.table).to.have.deep.property('rows[0].cells[0].items[0].children[1].text', '加入 TPP 的各層面問題');
    });
  });
});