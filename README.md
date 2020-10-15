# pdf-tables-parser

Library to extract text tables from pdf files.

## Background (why)
Sometimes your server has to retrieve information from pdf files E.g. financial reports,
where the information is inside tables (rows, columns).

However there's no an easy way to extract this information from Nodejs applications. All the alterantives I tried
need an extra processing to get the tables I wanted, so finally I decided to create one of my own.

### Demo
You can test online the library [here](https://pomgui.github.io/pdf-tables-parser/demo/)

## Installation

```bash
$ npm install -g @pomgui/pdf-tables-parser
```

## Usage

```javascript
const
    { PdfDocument } = require('@pomgui/pdf-tables-parser'),
    fs = require('fs');

const pdf = new PdfDocument();
pdf.load('report.pdf')
    .then(() => fs.writeFileSync('report.json', JSON.stringify(pdf, null, 2), 'utf8'))
    .catch(err => console.error(err));
```

### Result Example
```json
{
  "numPages": 1,
  "pages": [
    {
      "pageNumber": 1,
      "tables": [
        {
          "tableNumber": 1,
          "numrows": 65,
          "numcols": 3,
          "data": [
            ["name", "age", "amount"],
            ["John", "49", "150,000.00"],
            ["Mary", "25", "10,000.00"],
            ["..."]
          ]
        }
      ]
    }
  ]
}
```
