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
	
	this.routeSeq = 0;
	this.routeReqId = 0;
	
	this.routes = [];
}

NodeNet.prototype.networkMaintenance = function()
{
	this.searchNeigh();
	this.node.addRTCAlarm(this.networkServiceInterval, this.networkMaintenance.bind(this));
}

NodeNet.prototype.updateNeigh = function(msg)
{
	if(this.neigh.indexOf(this.node.mesh.getNode(msg.from)) == -1)
	{
		this.neigh.push(this.node.mesh.getNode(msg.from));
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
		this.passiveUpdateRoutes(msg);
		
		if(msg.action == "request")
		{
			var route = this.getRouteEntry(msg.route.from);
			if(route && route.lastReqId >= msg.route.id)
			{
				//discard this message
				return;
			}
			
			if(msg.route.to == this.node.mac)
			{
				this.routeSeq++;
				this.node.sendMsg({from:this.node.mac, to:msg.from, type:"route", action:"reply", 
									route:{to:msg.route.from, seqDest:this.routeSeq, from:this.node.mac, hops:0, ttl:32}});
			}
			else
			{
				this.routeRoutingPkg(msg);
			}
		}
		else if(msg.action == "reply")
		{
			if(msg.route.to == this.node.mac)
			{
				var route = this.getRouteEntry(msg.route.from);
							
				if(route)
				{
					if(route.hops > msg.route.hops || !route.isActive || route.seq < msg.route.seqDest)
					{
						route.nextHop = msg.from;
						route.hops = msg.route.hops;
						route.isValid = true;
						route.seq = msg.route.seqDest;
					}
				}
				else this.routes.push({to:msg.route.from, nextHop: msg.from, hops:msg.route.hops, isValid:true, seq:msg.route.seqDest, lastReqId:-1});
			}
			else
			{
				this.routeRoutingPkg(msg);
			}
		}
	}
	else if(msg.type == "app")
	{
		if(this.node.mac != msg.route.to)
		{
			this.routeIncoming(msg);
		}
		else 
		{
			this.node.app.processMessage(msg);
		}
	}	
}


NodeNet.prototype.routeRoutingPkg = function(msg)
{
	msg.route.hops++;

	var route = this.getRouteEntry(msg.route.to);
	
	if(route)
	{
		if(route.isValid)
		{
			msg.to = route.nextHop;
			this.node.mesh.sendMsg(msg);
		}
		else
		{
			msg.to = null;
			this.node.mesh.sendMsg(msg);
		}
	}
	else
	{
		/*should not get here b/c a route is added in passive route update */
		msg.to = null;
		this.node.mesh.sendMsg(msg);
	}
}


NodeNet.prototype.passiveUpdateRoutes = function(msg)
{
	if(msg.action == "request")
	{
		//Search for the destination
		var route = this.getRouteEntry(msg.route.to);
		
		if(route)
		{
			if(route.seq < msg.seqDest)
			{
				route.seq = msg.seqDest;
			}
		}
		else
		{
			this.routes.push({to:msg.route.to, nextHop: -1, hops:-1, isValid:false, seq:msg.route.seqDest, lastReqId:-1});
		}
		
		//Search for the source
		route = this.getRouteEntry(msg.route.from);
		if(route)
		{
			if(route.seq < msg.route.seqSrc)
			{
				route.seq = msg.route.seqSrc;
			}
		}
		else
		{
			this.routes.push({to:msg.route.from, nextHop: msg.from, hops:msg.hops, isValid:true, seq:msg.route.seqSrc, lastReqId:msg.route.id});
		}
	}
	else if(msg.action == "reply")
	{
		//Search for the destination
		var route = this.getRouteEntry(msg.route.to);
		
		if(route)
		{
			/*if(route.seq < msg.seqDest)
			{
				route.seq = msg.seqDest;
			}*/
		}
		else
		{
			this.routes.push({to:msg.route.to, nextHop: -1, hops:-1, isValid:false, seq:-1, lastReqId:-1});
		}
		
		//Search for the source
		route = this.getRouteEntry(msg.route.from);
		if(route)
		{
			if(route.seq < msg.route.seqDest)
			{
				route.seq = msg.route.seqDest;
			}
		}
		else
		{
			this.routes.push({to:msg.route.from, nextHop: msg.from, hops:msg.hops, isValid:true, seq:msg.route.seqDest, lastReqId:-1});
		}
	}	
}

NodeNet.prototype.routeIncoming = function(msg)
{
	var route = this.getRouteEntry(msg.route.to);
		
	if(route)
	{
		if(route.isValid)
		{
			msg.to = route.nextHop;
			this.node.mesh.sendMsg(msg);
		}
		else return false;
	}
	else
	{
		this.startRouteDiscovery(msg.route.to, -1);
		return false;
	}
	
	return true;
}

NodeNet.prototype.routeOutgoing = function(msg)
{
	
	msg.route = {to:msg.to, from:this.node.mac};
	var route = this.getRouteEntry(msg.to);
	
	if(route)
	{
		if(route.isValid)
		{
			msg.to = route.nextHop;
			this.node.mesh.sendMsg(msg);
		}
		else
		{
			this.startRouteDiscovery(msg.route.to, route.destSeq);
			return false;
		}
	}
	else
	{
		this.startRouteDiscovery(msg.route.to, -1);
		return false;
	}
	
	return true;
}

NodeNet.prototype.startRouteDiscovery = function(mac, lastSeq)
{
	++this.routeSeq;
	this.node.mesh.sendMsg({from:this.node.mac, to:null, type:"route", action:"request", 
						route:{id:this.routeReqId++, to:mac, seqDest:lastSeq, from:this.node.mac, seqSrc:this.routeSeq, hops:0, ttl:32}});
}

NodeNet.prototype.searchNeigh = function()
{
	this.neigh = []; //todo: timestamp based prunning instead of prune all neighbours
	
	//this.node.sendMsg({from:this.node, to:null, type:"discovery", action:"hello"});
}

/************** Utils ****************/
NodeNet.prototype.getRouteEntry = function(mac)
{
	for(i in this.routes)
	{
		if(this.routes[i].to == mac)
		{
			return this.routes[i];
		}
	}
	return null;
}


