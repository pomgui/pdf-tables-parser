const pdflib = require('pdfjs-dist/build/pdf'),
    { PdfDocument } = require('../dist/PdfDocument');

pdflib.GlobalWorkerOptions.workerSrc = './bundles/main.bundle.worker.js';

angular.module('demoApp', ['ngSanitize'])
    .controller('DemoController', ['$scope', '$sce', function ($scope, $sce) {
        $scope.content = '';
        $scope.format = 'HTML';
        $scope.pdf = null;
        $scope.load = function (f) {
            let reader = new FileReader();
            reader.onload = e => {
                let data = e.target.result;
                $scope.pdf = new PdfDocument();
                $scope.pdf.load(data)
                    .then(_ => $scope.$apply(() => {
                        $scope.error = '';
                        $scope.setPage($scope.pdf.pages[0]);
                    }))
                    .catch(err => {
                        $scope.content = $scope.curpage = $scope.curtable = null;
                        $scope.error = err;
                    });
            };
            reader.readAsArrayBuffer(f);
        };
        $scope.setPage = page => {
            $scope.content = '';
            $scope.curpage = page;
            $scope.setTable(page.tables[0]);
        }
        $scope.setTable = table => {
            $scope.curtable = table;
            switch ($scope.format) {
                case 'HTML':
                    let html = table.asHtml();
                    html = addHtmlRowsColsIds(html);
                    $scope.content = $sce.trustAsHtml(html); break;
                case 'JSON':
                    $scope.content = JSON.stringify(table, (k, v) => k.startsWith('$$') ? undefined : v, 2)
                        .replace(/\n/g, '<br>'); break;
                case 'CSV':
                    $scope.content = table.asDelimitedText(); break;
                // .replace(/\n/g, '<br>'); break;
            }
        }
        $scope.setFormat = f => {
            $scope.format = f;
            $scope.setTable($scope.curtable);
        };
        function addHtmlRowsColsIds(html) {
            let row = 0;
            return html
                .replace(/<tr>/g, g => g + `<td class="row">${row++}</td>`)
                .replace(/<table>/, g => g + `<tr class="cols"><td>#</td>`
                    + new Array($scope.curtable.numcols).fill(0)
                        .map((_, col) => `<td>${col}</td>`).join('')
                    + '</tr>'
                );
        }
    }])

    .directive('piFile', () => (scope, element) =>
        element.bind('change', event =>
            scope.$apply(() => scope.load(event.target.files[0]))
        )
    )

    .directive('piDrop', () => (scope, element) => {
        element.on('dragenter dragover dragleave drop', e => {
            e.stopPropagation(); e.preventDefault();
            if (e.type == 'drop') {
                scope.$apply(() => scope.load(e.dataTransfer.files[0]));
                element.removeClass('dragging');
            } else {
                e.dataTransfer.dropEffect = 'copy';
                if (e.type == 'dragover') element.addClass('dragging');
                else element.removeClass('dragging');
            }
        });
    });
