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
	setTimeout(mesh.onTimer, 3000);
}

Mesh.prototype.addNode = function(node)
{
	this.nodes.push(node);
	//boot-up the node
	node.boot(this);
}

Mesh.prototype.updateNodePosition = function(i, pt)
{
	this.nodes[i].x = pt.x;
	this.nodes[i].y = pt.y;
}

Mesh.prototype.delNode = function(i)
{
	this.nodes[i].shutdown();
	this.nodes.splice(i,1);
}

Mesh.prototype.sqrDist = function (x1, y1, x2, y2) 
{
	var a = x1 - x2, b = y1 - y2;
	return Math.sqrt( a*a + b*b );
}

Mesh.prototype.onTimer = function()
{
	for(var i in mesh.nodes)
	{
		mesh.nodes[i].onTimer();
	}
	setTimeout(mesh.onTimer, 3000);
}

Mesh.prototype.sendMsg = function(msg)
{
	if(msg.to)
	{
		if(this.sqrDist(msg.from.x, msg.from.y, 
						msg.to.x, msg.to.y) < 
		   msg.from.r + msg.to.r)
		{
			msg.to.onRecvMsg(msg);
		}		
	}
	else //broadcast
	{
		for(var i in this.nodes)
		{
			if(msg.from == this.nodes[i])
				continue;
			if(this.sqrDist(msg.from.x, msg.from.y, 
							this.nodes[i].x, this.nodes[i].y) < 
			   msg.from.r + this.nodes[i].r)
			{
				this.nodes[i].onRecvMsg(msg);
			}
		}
	}
}