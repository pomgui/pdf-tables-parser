const
    { PdfLoader } = require('../dist/PdfLoader'),
    fs = require('fs');

const parser = new PdfLoader();
parser.load('/tmp/1.pdf')
    .then(doc => fs.writeFileSync('/tmp/1.json', JSON.stringify(doc, null, 2), 'utf8'))
    .catch(err => console.error(err));
