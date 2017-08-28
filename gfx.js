//Author: ADiea
//Date: 21.08.17
//Descr: View part of the mesh simulator prj

var gfx = new Gfx();

function Gfx()
{
	
}

Gfx.prototype.init = function(canvas, settings, controller)
{
	this.canvas = canvas;
	this.ctx = canvas.getContext("2d");
	this.settings = settings;
	this.controller = controller;
	
	this.canvas.onmousemove = this.mousemove;
	this.canvas.onmouseup = this.mouseup;
	this.canvas.onmousedown = this.mousedown;
	
	this.drawBkg();
}

Gfx.prototype.drawBkg = function(pt)
{
   if(!pt) pt={x:-1, y:-1};
   var i = this.ctx.canvas.height, textOffset = 0;

   this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
   this.ctx.strokeStyle = 'lightgray';
   //this.ctx.lineWidth = 0.5;

   while(i > this.settings.gridSize) 
   {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.ctx.canvas.width, i);
      this.ctx.stroke();
	  
	  this.drawText({t:i*this.settings.gridScale, 
					 f:"12px Arial", 
					 c:"gray", 
					 x:5, 
					 y:i-4});
	  
	  i -= this.settings.gridSize;
   }
   
   i = this.ctx.canvas.width;

   while(i > this.settings.gridSize) 
   {
      this.ctx.beginPath();
      this.ctx.moveTo(i, this.settings.gridSize);
      this.ctx.lineTo(i, this.ctx.canvas.height);
      this.ctx.stroke();
	  
	  this.drawText({t:i*this.settings.gridScale, 
					 f:"12px Arial", 
					 c:"gray", 
					 x:i - this.measureText({t:i*this.settings.gridScale, f:"12px Arial"}).width/2, 
					 y:textOffset%2 ? 15:30});
	  
	  textOffset++;
      i -= this.settings.gridSize;
   } 
}

Gfx.prototype.setCursor = function(cursor)
{
	this.canvas.style.cursor = cursor;
}

Gfx.prototype.drawText = function(text)
{
	this.ctx.fillStyle = text.c;
	this.ctx.font = text.f;
	this.ctx.fillText(text.t, text.x, text.y); 
}

Gfx.prototype.measureText = function(text)
{
	this.ctx.font = text.f;
	return this.ctx.measureText(text.t); 
}

Gfx.prototype.drawCircle = function(circle)
{
   this.ctx.strokeStyle = circle.c;
   if(circle.dash)
   {
	   this.ctx.setLineDash(circle.dash);
   }   
   this.ctx.beginPath();
   this.ctx.arc(circle.x, circle.y, circle.r, 0,2*Math.PI);
   this.ctx.stroke();
   this.ctx.setLineDash([]);
}

Gfx.prototype.drawGuides = function(pt)
{
	this.drawLine({c:"grey", x1:0, y1:pt.y, x2:this.ctx.canvas.width, y2:pt.y});
	this.drawLine({c:"grey", x1:pt.x, y1:0, x2:pt.x, y2:this.ctx.canvas.height});
}

Gfx.prototype.drawLine = function(line)
{
   this.ctx.strokeStyle = line.c;
   if(line.dash)
   {
	   this.ctx.setLineDash(line.dash);
   }
   this.ctx.beginPath();
   this.ctx.moveTo(line.x1, line.y1);
   this.ctx.lineTo(line.x2, line.y2);
   this.ctx.stroke();
   this.ctx.setLineDash([]);
}

Gfx.prototype.winToCanvas = function(x, y) 
{
   var box = this.canvas.getBoundingClientRect();
   return { x: x - box.left * (this.canvas.width  / box.width),
            y: y - box.top  * (this.canvas.height / box.height)
          };
}

Gfx.prototype.mousemove = function (e) 
{
	var loc = gfx.winToCanvas(e.clientX, e.clientY);
	gfx.controller.mousemove(loc);
}

Gfx.prototype.mouseup = function (e) 
{
	var loc = gfx.winToCanvas(e.clientX, e.clientY);
	gfx.controller.mouseup(loc);
}

Gfx.prototype.mousedown = function (e) 
{
	var loc = gfx.winToCanvas(e.clientX, e.clientY);
	gfx.controller.mousedown(loc);
}