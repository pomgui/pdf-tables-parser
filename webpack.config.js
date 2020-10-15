const path = require('path');

module.exports = (env, argv) => {
  const config = {
    context: __dirname,
    entry: {
        'main.bundle': './demo/demo.js',
        'main.bundle.worker':  'pdfjs-dist/build/pdf.worker.entry',
    },
    mode: 'none',
    output: {
      path: path.resolve(__dirname, './demo/bundles'),
      publicPath: './demo/bundles',
      filename: '[name].js'
    }
  };

  return config;
};
