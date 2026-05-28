const path = require('path');
const browser = process.env.BROWSER || 'chrome';

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    'popup/popup': './src/popup/popup.ts',
    'sidepanel/sidepanel': './src/sidepanel/sidepanel.ts',
  },
  output: {
    path: path.resolve(__dirname, `dist-${browser}`),
    filename: '[name].js',
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/,
    }],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
