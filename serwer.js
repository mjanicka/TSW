var fs = require('fs'),
    http = require('http'),
    io = require('socket.io'),
    url = require('url'),

    server = http.createServer(function (req, res) {
            var request = url.parse(req.url, true);
            var action = request.pathname;

            if (action == '/') {
                var login = fs.readFileSync('./logowanie.html');
                res.writeHead(200, {
                        'Content-Type': 'text/html'
                    });
                res.write(login);
                res.end();
            }
            if (action == '/login') {
                var login = fs.readFileSync('./polerysuj.html');
                res.writeHead(200, {
                        'Content-Type': 'text/html'
                    });
                res.write(login);
                res.end();
            }
        });
server.listen(8080);

var socket = io.listen(server);
socket.on('connection', function (client) {
        console.log('connected');
        client.on('message', function (msg) {
                console.log(msg);
            });
    });
