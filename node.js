//Author: ADiea
//Date: 22.08.17
//Descr: Model part of the mesh simulator prj
//		 A node entity

function Node(x, y, r)
{
	this.x = x;
	this.y = y;
	this.r = r;
	this.neigh = [];
}

Node.prototype.boot = function(nodes)
{
	this.searchNeigh(nodes);	
}

Node.prototype.shutdown = function()
{
	for(var i in this.neigh)
	{
		this.neigh[i].processMessage({from:this, data:"bye"});
	}	
}

Node.prototype.processMessage = function(msg)
{
	if(msg.data == "bye")
	{
		var index = this.neigh.indexOf(msg.from);
		if(index > -1)
		{
			this.neigh.splice(index,1);
		}
	}
}

Node.prototype.searchNeigh = function(nodes)
{
	this.neigh = [];
	for(var i in nodes)
	{
		if(this == nodes[i])
			continue;
		if(this.sqrDist(this.x, this.y, 
						nodes[i].x, nodes[i].y) < 
		   this.r + nodes[i].r)
		{
			this.neigh.push(nodes[i]);
		}
	}
}

Node.prototype.sqrDist = function (x1, y1, x2, y2) 
{
	var a = x1 - x2, b = y1 - y2;
	return Math.sqrt( a*a + b*b );
}