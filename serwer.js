"use strict";

var fs = require('fs'),
    http = require('http'),
    io = require('socket.io'),
    express = require('express'),

    server = express(),
    players = {},
    currentPlayer = null,
    playersCount = 0,
    currentWord = null,
    strona, ids;


function randomString(len) {
    var result = "", i, ascii;

    for (i = 0; i < len; i++) {
        ascii = Math.floor(Math.random() * 93) + 33; // from '!'(33) to '~'(126)
        if (ascii === 59 || ascii === 61) { // ; and = dont wanted as special chars in many cases
            ascii = 33;
        }
        result += String.fromCharCode(ascii);
    }
    return result;
}

function randomWord() {
    var slowa = ['pies', 'kot', 'ulica', 'chmura', 'ekspedientka', 'samochód', 'zabawki'],
        slowo = slowa[Math.floor(Math.random() * slowa.length)];

    return slowo;
}

server.configure(function() {
    server.use(express.cookieParser());
    server.use(express.bodyParser());
    server.use(express.session({ secret: randomString(5) }));
});

server.get('/', function(req, res) {
    var strona = fs.readFileSync('./logowanie.html');
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.write(strona);
    res.send();
});

server.get('/polerysuj.js', function(req, res) {
    var strona = fs.readFileSync('./polerysuj.js');
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.write(strona);
    res.send();
});

server.post('/login', function(req, res) {
    var baza = require("mongojs").connect("kalambury",["uzytkownicy"]);
     baza.uzytkownicy.find({login:req.body.login}, function(err, user) {
        if (user[0] &&  user[0].haslo === req.body.haslo) {
            console.log("session: " + req.session.login);
            strona = fs.readFileSync('./polerysuj.html');
            req.session.login = req.body.login;
            var userid = randomString(5);
            players[userid] = { name: req.body.login };
            console.log("created player login: " + req.body.login + " id: " + userid + "\n");

            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Set-Cookie': 'userid=' + userid
                });

            res.write(strona);
            res.send();
        }
        else {
            strona = fs.readFileSync('./logowanie.html');
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'    
            });
            res.write("błędny login bądź hasło");
            res.write(strona);
            res.send();
        }
    });
});

server.get('/logout', function(req, res) {
    req.session = null;
    var strona = fs.readFileSync('./logowanie.html'); 
    res.writeHead(200, {
       'Content-Type': 'text/html'
    });
    res.write(strona);
    res.send();
});

server.post('/register', function(req, res) {
     var baza = require("mongojs").connect("kalambury",["uzytkownicy"]);
     if(req.body.haslorej === req.body.powtorzhaslorej) {
        baza.uzytkownicy.find({login:req.body.loginrej}, function(err, user) {
            if(user[0]) {
                strona = fs.readFileSync('./logowanie.html');
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8'    
                });
                res.write("użytkownik istnieje już w bazie");
                res.write(strona);
                res.send();
            }
            else {
                baza.uzytkownicy.insert({login:req.body.loginrej, haslo:req.body.haslorej});
                strona = fs.readFileSync('./polerysuj.html');
                var userid = randomString(5);
                players[userid] = {name: req.body.loginrej};
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',    
                    'Set-Cookie': 'userid=' + userid
                });
                res.write("użytkownik został dodany");
                res.write(strona);
                res.send();
            }
        });
    }
    else {
        strona = fs.readFileSync('./logowanie.html');
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'    
        });
        res.write("hasła się nie zgadzają");
        res.write(strona);
        res.send();
    }
});

server.listen(8080);

var    httpserv = http.createServer(server).listen(8081),
    socket = io.listen(httpserv);

socket.on('connection', function (client) {
    var clientUID = null;
    
    function startNewGame() {
        var playerNum = Math.floor(Math.random() * playersCount);
        var playerIds = Object.keys(players);
        currentPlayer = playerIds[playerNum];
        playerIds.forEach(function(pid) {
            console.log ("test: " + pid);
            if(pid === currentPlayer) {
                currentWord = randomWord();
                players[pid].sock.emit("start-drawing", currentWord);
            } else{
                players[pid].sock.emit("message", players[currentPlayer].name +
                    " zaczyna rysować.\n");
            }
        });
    }
        
    client.on('start-connection', function (userid) {
        clientUID = userid;
        players[userid].sock = client;
        client.emit("message", "Witaj " + players[userid].name + ".\n");
        playersCount ++;
        
        if(currentPlayer === null && playersCount > 1) {
            startNewGame();
        }
    });

    client.on('message', function(text) {
        if(text === currentWord) {
            ids = Object.keys(players);
            ids.forEach(function(id) {
                players[id].sock.emit("end-game", "gracz " + players[id].name + " odgadł hasło: " + currentWord);
            });
            startNewGame();
        }
        else {
            ids = Object.keys(players);
            ids.forEach(function(id) {
                players[id].sock.emit('message', players[clientUID].name + ": " + text + "\n");
            });
        }
    });
    
    client.on('punkt', function(wspolrzedne) {
        Object.keys(players).forEach(function(id) {
            if(currentPlayer !== id) {
                players[id].sock.emit('punkt', wspolrzedne);
            }
        });
    });
    
    client.on('prostokąt', function(wspolrzedne) {
        Object.keys(players).forEach(function(id) {
            if(currentPlayer !== id) {
                players[id].sock.emit('prostokąt', wspolrzedne);
            }
        });
    });
    
    client.on('koło', function(wspolrzedne) {
        Object.keys(players).forEach(function(id) {
            if(currentPlayer !== id) {
                players[id].sock.emit('koło', wspolrzedne);
            }
        });
    });
    
    client.on('linia', function(wspolrzedne) {
        Object.keys(players).forEach(function(id) {
            if(currentPlayer !== id) {
                players[id].sock.emit('linia', wspolrzedne);
            }
        });
    });
    
    client.on('logout', function() {
        delete players[clientUID];

        if(--playersCount === 1) {
            players[Object.keys(players)[0]].sock.emit("end-game", "Pozostali użytkownicy opuścili grę, gra zostaje przerwana.");
            currentPlayer = null;
        } else if(clientUID === currentPlayer) {
            Object.keys(players).forEach(function(playerID) {
                players[playerID].sock.emit("end-game", "Rysujący opuścił grę, gra zostaje przerwana.");
                currentPlayer = null;
            });
            startNewGame();
        }
    });
 });
