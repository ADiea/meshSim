//Author: ADiea
//Date: 21.08.17
//Descr: Model part of the mesh simulator prj

var mesh = new Mesh();

function Mesh()
{
	this.nodes = [];
	this.uniqueId = 1;
}

Mesh.prototype.init = function(settings)
{
	this.settings = settings;
}

Mesh.prototype.addNode = function(node)
{
	node.mac = this.uniqueId++;
	this.nodes.push(node);
	//boot-up the node
	node.powerUp(this);
}

Mesh.prototype.updateNodePosition = function(i, pt)
{
	this.nodes[i].x = pt.x;
	this.nodes[i].y = pt.y;
}

Mesh.prototype.delNode = function(i)
{
	this.nodes.splice(i,1);
}

Mesh.prototype.sqrDist = function (x1, y1, x2, y2) 
{
	var a = x1 - x2, b = y1 - y2;
	return Math.sqrt( a*a + b*b );
}

Mesh.prototype.sendMsg = function(msg)
{
	//some packets are lost due to errors
	if(Math.floor(100 * Math.random()) < this.settings.errorRate)
		return;
	
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