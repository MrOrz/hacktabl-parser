var webpack = require('webpack');
var isProduction = process.env['NODE_ENV'] === 'production';

module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname + '/lib',
    filename: 'index.browser.js',
    library: 'hacktablParser'
  },
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel?optional[]=runtime', exclude: /node_modules/}
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'typeof window': JSON.stringify('object')
    }),

    // Ignore jsdom in src/parseTable,
    //        http, https and url in src/fetchDoc
    //
    new webpack.IgnorePlugin(/^(?:jsdom|http|https|url)$/)
  ],
  debug: !isProduction
};

if(isProduction) {
  module.exports.plugins.push(new webpack.optimize.UglifyJsPlugin({
    sourceMap: false
  }))
}