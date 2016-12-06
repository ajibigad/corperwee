var express = require('express');
var app = express();
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/', function (req, res) {
    res.render('index');
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('Corperwee app listening on port %s', port);
});