var http = require('http');
var url = require('url');

var Q = require('./query');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/json'});
  if(req.url === '/favicon.ico') {
    res.end('null');
    return;
  }

  var query = url.parse(req.url).query + '';
  var q = query.split('&');
  var part1 = (q[0]+'').split('=');
  var part2 = (q[1]+'').split('=');
  var id = '';
  var pw = '';
  if( part1[0] === 'id') {
    id = part1[1];
    pw = part2[1];
  } else {
    id = part2[1];
    pw = part1[1];
  }

  Q(id, pw)
    .then(function(json) {
      res.write(json);
      res.end();
    }).catch(function(err) {
      res.write(err);
      res.end();
    });

}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');