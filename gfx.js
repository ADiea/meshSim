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
	
	this.drawBkg();
}

Gfx.prototype.drawBkg = function()
{
   var i = this.ctx.canvas.height;

   this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
   this.ctx.strokeStyle = 'lightgray';
   //this.ctx.lineWidth = 0.5;

   while(i > this.settings.gridSize*4) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.ctx.canvas.width, i);
      this.ctx.stroke();
      i -= this.settings.gridSize;
   }
   
   i = this.ctx.canvas.width;

   while(i > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.ctx.canvas.height);
      this.ctx.stroke();
      i -= this.settings.gridSize;
   } 
}

Gfx.prototype.drawCrosshairs = function(x, y)
{
   this.ctx.strokeStyle = 'black';
   this.ctx.beginPath();

   this.ctx.moveTo(x, y - this.settings.crosshairOffset);
   this.ctx.lineTo(x, y + this.settings.crosshairOffset);
   
   this.ctx.moveTo(x - this.settings.crosshairOffset, y);
   this.ctx.lineTo(x + this.settings.crosshairOffset, y);

   this.ctx.stroke();
}

Gfx.prototype.drawCircles = function(circles)
{
   this.ctx.strokeStyle = 'black';
   

   for(i in circles)
   {
	//    this.ctx.moveTo(circles[i].x, circles[i].y);
	   this.ctx.beginPath();
	   this.ctx.arc(circles[i].x, circles[i].y, circles[i].r, 0,2*Math.PI);
   this.ctx.stroke();

   }
   
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
