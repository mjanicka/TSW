var fs = require('fs'),
    http = require('http'),
    io = require('socket.io'),
    url = require('url'),
    express = require('express'),

    server = express();

server.configure(function(){
	server.use(express.cookieParser()); 
	server.use(express.bodyParser());
	server.use( express.session( { secret: 'xxx' } ) );
});

server.get('/', function( req, res ){
 	console.log( "session: " + req.session.login );
        var strona = fs.readFileSync('./logowanie.html');
        res.writeHead(200, {
	        'Content-Type': 'text/html'
        });
        res.write(strona);
        res.send();
});

server.post( '/login', function( req, res ){
 	console.log( "session: " + req.session.login );
 	var baza = require("mongojs").connect("kalambury",["uzytkownicy"]);
 	baza.uzytkownicy.find({login:req.body.login}, function(err, user) {
		if (user[0] &&  user[0].haslo == req.body.haslo) {
			var strona = fs.readFileSync('./polerysuj.html');
			req.session.login = req.body.login;
			res.writeHead(200, {
				'Content-Type': 'text/html; charset=utf-8'	
			});
			res.write(strona);
			res.send();
		}
		else {
			var strona = fs.readFileSync('./logowanie.html');
			res.writeHead(200, {
				'Content-Type': 'text/html; charset=utf-8'	
			});
			res.write("błędny login bądź hasło");
			res.write(strona);
			res.send();
		}
	});
});

server.get('/logout', function( req, res ){
	req.session = null;
    var strona = fs.readFileSync('./logowanie.html'); 
    res.writeHead(200, {
	   'Content-Type': 'text/html'
    });
    res.write(strona);
    res.send();
});

server.post( '/register', function( req, res ){
 	var baza = require("mongojs").connect("kalambury",["uzytkownicy"]);
 	if(req.body.haslorej == req.body.powtorzhaslorej) {
		baza.uzytkownicy.find({login:req.body.loginrej}, function(err, user) {
			if(user[0]){
				var strona = fs.readFileSync('./logowanie.html');
				res.writeHead(200, {
					'Content-Type': 'text/html; charset=utf-8'	
				});
				res.write("użytkownik istnieje już w bazie");
				res.write(strona);
				res.send();
			}
			else {
				baza.uzytkownicy.insert({login:req.body.loginrej, haslo:req.body.haslorej});
				var strona = fs.readFileSync('./polerysuj.html');
				res.writeHead(200, {
					'Content-Type': 'text/html; charset=utf-8'	
				});
				res.write("użytkownik został dodany");
				res.write(strona);
				res.send();
			}
		});
	}
	else {
		var strona = fs.readFileSync('./logowanie.html');
		res.writeHead(200, {
			'Content-Type': 'text/html; charset=utf-8'	
		});
		res.write("hasła się nie zgadzają");
		res.write(strona);
		res.send();
	}
});

server.listen(8080);

var	httpserv = http.createServer(server).listen(8081),
	socket = io.listen(httpserv);
socket.on('connection', function (client) {
        console.log('connected');
        client.on('message', function (msg) {
                console.log(msg);
            });
    });
