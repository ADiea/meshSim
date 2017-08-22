//Author: ADiea
//Date: 21.08.17
//Descr: Controller part of the mesh simulator prj

var sim = new Sim();

function Sim()
{

}

Sim.prototype.init = function(gfx, mesh)
{
	this.gfx = gfx;
	this.mesh = mesh;
}

Sim.prototype.mousemove = function (pt) 
{
	this.gfx.drawBkg();
	this.gfx.drawCircles(this.mesh.nodes);
	this.gfx.drawCrosshairs(pt.x, pt.y);
}

Sim.prototype.mouseup = function (pt) 
{
	this.mesh.addNode(pt);
	
	this.gfx.drawBkg();
	this.gfx.drawCircles(this.mesh.nodes);
}
	