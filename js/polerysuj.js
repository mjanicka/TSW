"use strict"; 
			
var downX;
var downY;
var ismousedown = 0;
var socket = new io.connect('http://localhost:8081'); // tworzenie socketa, wywoływanie connection

function getCookie (name) {
	var result = null;
	var cookies = document.cookie.split("; ");
	cookies.forEach(function(cookie) {
		var tmp = cookie.split("=");
		if(tmp[0] === name) { 
			result = "" + tmp[1]; //"" dlatego, żeby stworzył nowy obiekt zamiast przypisywać referencję
		}
	});
	return result;

}

var userid = getCookie("userid");


function mousedown(event) {
	var canvas = document.getElementById("mojCanvas");
	var context = canvas.getContext('2d');
	var kolor = document.getElementById("kolor");
	var figura = document.getElementById("figura");
	var x = event.clientX;
	var y = event.clientY;

	x -= canvas.offsetLeft;
	y -= canvas.offsetTop;

	downX = x;
	downY = y;

	context.beginPath();

	if (kolor.value) {
		context.strokeStyle = kolor.value;
	}

	if (figura.value === "punkt") {
		context.rect(x, y, 2, 2);
		context.stroke();
		socket.emit('punkt',[x,y, context.strokeStyle]); 
	}

	ismousedown = 1;
}

function mousemove(event) {
	if (ismousedown === 1) {
		var canvas = document.getElementById("mojCanvas");
		var context = canvas.getContext('2d');
		var figura = document.getElementById("figura");
		var x = event.clientX;
		var y = event.clientY;

		x -= canvas.offsetLeft;
		y -= canvas.offsetTop;

		if (figura.value === "punkt") {
			context.rect(x, y, 2, 2);
			context.stroke();
			socket.emit('punkt',[x,y, context.strokeStyle]);
		}
	}
}

function mouseup(event) {
	ismousedown = 0;

	var canvas = document.getElementById("mojCanvas");
	var context = canvas.getContext('2d');
	var figura = document.getElementById("figura");
	var x = event.clientX;
	var y = event.clientY;
	var radius = x - downX;	
	x -= canvas.offsetLeft;
	y -= canvas.offsetTop;

	switch (figura.value) {
	case "prostokąt":
		context.rect(downX, downY, x - downX, y - downY);
		context.stroke();
		socket.emit('prostokąt',[downX, downY, x - downX, y - downY, context.strokeStyle]);
	break;
	
	case "koło":
		context.arc(downX, downY, radius, x, y, false);
		context.stroke();
		socket.emit('koło',[downX, downY, radius, x, y, context.strokeStyle]);
	break;
	
	case "linia":
		context.moveTo(downX, downY);
		context.lineTo(x , y);
		context.stroke();
		socket.emit('linia',[downX, downY, x , y, context.strokeStyle]);
	break;
	}
}

function doserwera(text) {
	socket.send(text);  
}


function wyslij() {
	var tekst = document.getElementById("wiadomosc");

	doserwera(tekst.value);
	tekst.value = "";
}

function enter(event) {
	if (event.keyCode === 13) {
		wyslij();
	}
}

function zakonczPolaczenie(){
	socket.emit('logout', '' );
}

function wyloguj() {
	window.location = "/logout";
}

function enableDrawing(){
var canvas = document.getElementById("mojCanvas");
	canvas.onmousedown = mousedown;
	canvas.onmousemove = mousemove;
	canvas.onmouseup = mouseup;
}

function disableDrawing(){
var canvas = document.getElementById("mojCanvas");
	canvas.onmousedown = null;
	canvas.onmousemove = null;
	canvas.onmouseup = null;
}

function init() {
	var czat = document.getElementById("czat");
	var wpisz = document.getElementById("wiadomosc");
					
	wpisz.onkeyup = enter;
	window.onunload = zakonczPolaczenie;
	
	socket.emit( "start-connection", userid );
	
	socket.on('message', function (msg) {
		czat.innerHTML += msg;
	});
	
	socket.on('start-drawing', function(thing){
		czat.innerHTML += "Zaczynasz grę, narysuj " + thing + "\n";
		enableDrawing();
	}); 

	socket.on('end-game', function(message){
		czat.innerHTML += message + "\n";
		disableDrawing();
		
		var canvas = document.getElementById("mojCanvas");
		canvas.width = canvas.width;
	});
	
	function rysujPunkt(wspolrzedne) {
		var canvas = document.getElementById("mojCanvas");
		var context = canvas.getContext('2d');
		
		
		context.beginPath();
		context.rect(wspolrzedne[0], wspolrzedne[1], 2, 2);
		context.strokeStyle = wspolrzedne[2];
		context.stroke();
	}
	socket.on('punkt', rysujPunkt);
	
	function rysujProstokat(wspolrzedne) {
		var canvas = document.getElementById("mojCanvas");
		var context = canvas.getContext('2d');
		
		
		context.beginPath();
		context.rect(wspolrzedne[0], wspolrzedne[1], wspolrzedne[2], wspolrzedne[3]);
		context.strokeStyle = wspolrzedne[4];
		context.stroke();
	}
	socket.on('prostokąt', rysujProstokat);
	
	function rysujKolo(wspolrzedne) {
		var canvas = document.getElementById("mojCanvas");
		var context = canvas.getContext('2d');
		
		context.beginPath();
		context.arc(wspolrzedne[0], wspolrzedne[1], wspolrzedne[2], wspolrzedne[3], wspolrzedne[4], false);
		context.strokeStyle = wspolrzedne[5];
		context.stroke();
	}
	socket.on('koło', rysujKolo);
	
	function rysujLinie(wspolrzedne) {
		var canvas = document.getElementById("mojCanvas");
		var context = canvas.getContext('2d');
		
		
		context.beginPath();
		context.moveTo(wspolrzedne[0], wspolrzedne[1]);
		context.lineTo(wspolrzedne[2], wspolrzedne[3]);
		context.strokeStyle = wspolrzedne[4];
		context.stroke();
	}
	socket.on('linia', rysujLinie);
	
	socket.on('canvas-state', function(rysunek){
		rysunek.forEach(function(dzialanie){
			switch(dzialanie[0]){ //pierwszy element dzialania czyli typ
				case 'punkt':
					rysujPunkt(dzialanie[1]); 
					break;
				case 'prostokat':
					rysujProstokat(dzialanie[1]);
					break;
				case 'kolo':
					rysujKolo(dzialanie[1]);
					break;
				case 'linia':
					rysujLinie(dzialanie[1]);
					break;
			}
		});
	});
}
