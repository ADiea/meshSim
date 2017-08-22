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

Mesh.prototype.addNode = function(node)
{
	this.nodes.push(node);
	//boot-up the node
	node.boot(this.nodes);
}

Mesh.prototype.updateNodePosition = function(i, pt)
{
	this.nodes[i].x = pt.x;
	this.nodes[i].y = pt.y;
	this.nodes[i].searchNeigh(this.nodes)
}

Mesh.prototype.delNode = function(i)
{
	this.nodes[i].shutdown();
	this.nodes.splice(i,1);
}

/*
Mesh.prototype.updateNodeLinks = function()
{
	for(var i in this.nodes)
	{
		this.node_SearchNeighbours(i);
	}
}
*/

