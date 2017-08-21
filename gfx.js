//Author: ADiea
//Date: 21.08.17
//Descr: View part of the mesh simulator prj

function Gfx()
{
	
}

Gfx.prototype.init = function(canvas)
{
	this.canvas = canvas;
	this.ctx = canvas.getContext("2d");
	this.drawBkg();
}

Gfx.prototype.drawBkg = function()
{
	this.ctx.moveTo(0,0);
	this.ctx.lineTo(200,100);
	this.ctx.stroke(); 
}
