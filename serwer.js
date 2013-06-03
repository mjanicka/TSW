var fs = require('fs'),
    http = require('http'),
    io = require('socket.io'),
    url = require('url'),
    express = require('express'),

    server = express(), players= new Object(),
    currentPlayer = null, playersCount = 0, currentWord = null;

function randomString( len ){
	var result = "";
	for( var i = 0; i < len; i++ ){
		var ascii = Math.floor( Math.random() * 93 ) + 33 ; // from '!'(33) to '~'(126)
		if (ascii == 59 || ascii == 61 ){ // ; and = dont wanted as special chars in many cases
			ascii = 33;
		}
		result += String.fromCharCode( ascii )
	}
	return result;
}

function randomWord(){
	var slowa = ['pies','kot','ulica', 'chmura', 'ekspedientka', 'samochód', 'zabawki'],
		slowo = slowa[Math.floor(Math.random() * slowa.length)];
 	
 	return slowo;
}

server.configure(function(){
	server.use(express.cookieParser()); 
	server.use(express.bodyParser());
	server.use( express.session( { secret: randomString(5) } ) );
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
	var baza = require("mongojs").connect("kalambury",["uzytkownicy"]);
 	baza.uzytkownicy.find({login:req.body.login}, function(err, user) {
		if (user[0] &&  user[0].haslo == req.body.haslo) {
			console.log( "session: " + req.session.login );
			var strona = fs.readFileSync('./polerysuj.html');
			req.session.login = req.body.login;
			var userid = randomString(5);
			players[userid] = { name: req.body.login };
			console.log( "created player login: " + req.body.login + " id: " + userid + "\n" );

			res.writeHead(200, {
				'Content-Type': 'text/html; charset=utf-8',
				'Set-Cookie': 'userid=' + userid
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
	var clientUID = null;
        console.log('connected');
        client.on('start-connection', function (userid) {
		clientUID = userid;
                console.log( 'new userid: ' + userid );
		console.log( "logged in " + players[userid]["name"] + "\n" );
		players[userid]["sock"] = client;
		client.emit( "message", "Witaj " + players[userid]["name"] + ".\n" );
		playersCount ++;

		console.log( currentPlayer + " " + playersCount );

		if( currentPlayer == null && playersCount > 1 ){
			var playerNum = Math.floor( Math.random() * playersCount );
			var playerIds = Object.keys( players );
			currentPlayer = playerIds[playerNum];
			playerIds.forEach( function(pid){
				console.log ( "test: " + pid );
				if( pid == currentPlayer ){
					players[pid]["sock"].emit( "start-drawing", randomWord() );
				} else{
					players[pid]["sock"].emit( "message", players[currentPlayer]["name"] +
						" zaczyna rysować." );
				}
			});
		}
        });
	
	client.on('punkt', function(wspolrzedne){
		Object.keys(players).forEach(function(id) {
			if(currentPlayer != id){
				players[id]['sock'].emit('punkt', wspolrzedne);
			}
		});
	});
	
	client.on('logout', function(){
		var playerName = players[clientUID]["name"];
		delete players[clientUID];
		if( playersCount-- == 1 ){
			players[Object.keys(players)[0]]["sock"].emit( "end-game", "Pozostali użytkownicy opuścili grę, gra zostaje przerwana." );
			currentPlayer = null;
		} else if( clientUID == currentPlayer ){
			Object.keys(players).forEach( function( playerID ){
				players[playerID]["sock"].emit( "end-game", "Rysujący opuścił grę, gra zostaje przerwana." );
				currentPlayer = null;
			});
		}
	});
 });
