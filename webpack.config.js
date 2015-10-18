var webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname + '/lib',
    filename: 'index.browser.js'
  },
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel', exclude: /node_modules/}
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'typeof window': JSON.stringify('object')
    }),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: false
    }),

    // Ignore jsdom in src/parseTable,
    //        http, https and url in src/fetchDoc
    //
    new webpack.IgnorePlugin(/^(?:jsdom|http|https|url)$/)
  ],
  debug: false
};
