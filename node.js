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

Node.prototype.boot = function(mesh)
{
	this.mesh = mesh;
	this.searchNeigh();
}

Node.prototype.shutdown = function()
{
	this.sendMsg({from:this, to:null, type:"bye"});
}

Node.prototype.sendMsg = function(msg)
{
	this.mesh.sendMsg(msg);
}

Node.prototype.onRecvMsg = function(msg)
{
	this.processMessage(msg);
}

Node.prototype.onTimer = function()
{
	this.searchNeigh();
}

Node.prototype.processMessage = function(msg)
{
	if(msg.type == "bye")
	{
		var index = this.neigh.indexOf(msg.from);
		if(index > -1)
		{
			this.neigh.splice(index,1);
		}
	}
	if(msg.type == "discovery")
	{
		if(msg.action == "reply")
		{
			this.neigh.push(msg.from);
		}
		else if(msg.action == "hello")
		{
			this.sendMsg({from:this, to:msg.from, type:"discovery", action:"reply"});
		}
	}
}

Node.prototype.searchNeigh = function()
{
	this.neigh = [];
	this.sendMsg({from:this, to:null, type:"discovery", action:"hello"});
}

