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
	this.networkServiceInterval = 100;
	
	this.neigh = [];
}

NodeNet.prototype.networkMaintenance = function()
{
	this.searchNeigh();
	this.node.addRTCAlarm(this.networkServiceInterval, this.networkMaintenance.bind(this));
}

NodeNet.prototype.processMessage = function(msg)
{
	if(msg.type == "discovery")
	{
		if(msg.action == "reply")
		{
			this.neigh.push(msg.from);
		}
		else if(msg.action == "hello")
		{
			this.node.sendMsg({from:this.node, to:msg.from, type:"discovery", action:"reply"});
		}
	}
	else if(msg.type == "app")
	{
		this.node.app.processMessage(msg);
	}	
}

NodeNet.prototype.searchNeigh = function()
{
	this.neigh = [];
	this.node.sendMsg({from:this.node, to:null, type:"discovery", action:"hello"});
}
