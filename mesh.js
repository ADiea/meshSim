//Author: ADiea
//Date: 21.08.17
//Descr: Model part of the mesh simulator prj

var mesh = new Mesh();

function Mesh()
{
	this.nodes = [];
}

Mesh.prototype.init = function(settings)
{
	this.settings = settings;
}

Mesh.prototype.addNode = function(pt)
{
	this.nodes.push({x:pt.x, y:pt.y, r:this.settings.nodeRadius});
}