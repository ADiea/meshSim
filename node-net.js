//Author: ADiea
//Date: 28.08.17
//Descr: Model part of the mesh simulator prj
//		 Network layers (data link, network, transport)

/*

todo: link power negociation

*/

function NodeNet(node)
{
	this.node = node;
	
	//constants
	this.networkServiceInterval = 500;
	
	//neighbour cache
	this.neigh = [];
	
	this.routes = [];
}

NodeNet.prototype.networkMaintenance = function()
{
	this.searchNeigh();
	this.node.addRTCAlarm(this.networkServiceInterval, this.networkMaintenance.bind(this));
}

NodeNet.prototype.updateNeigh = function(msg)
{
	if(this.neigh.indexOf(msg.from) == -1)
	{
		this.neigh.push(msg.from);
	}
}

NodeNet.prototype.processMessage = function(msg)
{
	this.updateNeigh(msg);
	
	if(msg.type == "discovery")
	{
		/*
		if(msg.action == "reply")
		{
			this.neigh.push(msg.from);
		}
		else if(msg.action == "hello")
		{
			this.node.sendMsg({from:this.node, to:msg.from, type:"discovery", action:"reply"});
		}
		*/
	}
	else if(msg.type == "route")
	{
		if(msg.action == "request")
		{
			if(msg.route.dest == this.node.mac)
			{
				this.node.sendMsg({from:this.node, to:msg.from, type:"route", action:"reply"});
			}
		}
		else if(msg.action == "reply")
		{
			if(msg.route.source == this.node.mac)
			{
				this.routes.push({to:msg.route.dest, next: msg.from, hops:msg.route.nodes.length});
			}
			else
			{
				
			}
		}
	}
	else if(msg.type == "app")
	{
		this.node.app.processMessage(msg);
	}	
}

NodeNet.prototype.routeMessage = function(msg)
{
	if(this.neigh.indexOf(msg.to) != -1)
	{
		this.node.mesh.sendMsg(msg);
	}
}

NodeNet.prototype.searchNeigh = function()
{
	this.neigh = []; //todo: timestamp based prunning instead of prune all neighbours
	
	//this.node.sendMsg({from:this.node, to:null, type:"discovery", action:"hello"});
}
