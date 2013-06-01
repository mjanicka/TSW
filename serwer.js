var fs = require('fs'),
    http = require('http'),
    io = require('socket.io'),
    url = require('url'),

    server = http.createServer(function (req, res) {
            var request = url.parse(req.url, true);
            var action = request.pathname;

            if (action == '/') {
                var strona = fs.readFileSync('./logowanie.html');
                res.writeHead(200, {
                        'Content-Type': 'text/html'
                    });
                res.write(strona);
                res.end();
            }
            if (action == '/login') {
				if( req.session ){
					console.log( req.session );
				}				
				var post;
                req.on('data', function (data) {
					var tmp = "" + data;
					post = require( "querystring" ).parse(tmp);
					
					var baza = require("mongojs").connect("kalambury",["uzytkownicy"]);
					var wynik = baza.uzytkownicy.find( { login: post.login }, function( err, user ){
						if( user[0] ){
							if(user[0].haslo == post.haslo) {
								req.session.user = user[0].login;
								var strona = fs.readFileSync('./polerysuj.html');
								res.writeHead(200, {
								'Content-Type': 'text/html'
								});
								res.write(strona);
								res.send();
							}
						}
						var strona = fs.readFileSync('./logowanie.html');
						res.writeHead(200, {
						'Content-Type': 'text/html; charset=utf-8'
						});	
						res.write("<p style=\"color:red\">zły login bądź hasło</p>");
						res.write(strona);
						res.end();
					});
				});
                
                
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
