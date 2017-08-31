//Author: ADiea
//Date: 28.08.17
//Descr: Model part of the mesh simulator prj
//		 Network layers (data link, network, transport)

/*

todo: 
link:
link power negociation

network:
send seq from current to next hop to have implicit route

debug alternatives not yet working ok.
choose best alt based on last battery level
hello with battery level

implement error frame
if bat level <10 send error frame

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
			//todo: filter requests with same id here and discard alt posibilities
			
			if(msg.route.to == this.node.mac)
			{
				if(msg.route.seqDest > this.routeSeq)
				{
					this.routeSeq++;
				}
				
				//not node.route = route outgoing this will use current routing table instead of replying to sender
				this.node.mesh.sendMsg({from:this.node.mac, to:msg.from, type:"route", action:"reply", 
									route:{to:msg.route.from, seqDest:this.routeSeq, from:this.node.mac, hops:0, ttl:32}});
			}
			else
			{
				
				var route = this.getRouteEntry(msg.route.from);
				if(route && route.lastReqId >= msg.route.id)
				{
					//discard this message
					return;
				}
				else
				{
					route.lastReqId = msg.route.id;
				}
				
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
					/*todo break this if e.g if sequences are eq then compare hops*/
					if(route.hops > msg.route.hops || !route.isValid || route.seq < msg.route.seqDest)
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
		else if(msg.action == "error")
		{
			
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

NodeNet.prototype.passiveUpdateRoutes = function(msg)
{
	//search prev node
	var routeNextHopDest = this.getRouteEntry(msg.from);
	if(!routeNextHopDest)
	{
		routeNextHopDest = {to:msg.from, nextHop: msg.from, hops:1, isValid:true, seq:-1, lastReqId:-1};
		this.routes.push(routeNextHopDest);
	}
	
	var route;
	msg.route.hops++;
	if(msg.action == "request")
	{
		//Search for the source
		route = this.getRouteEntry(msg.route.from);
		if(route)
		{
			if(route.seq < msg.route.seqSrc)
			{
				if(!route.isValid)
				{
					route.nextHop = msg.from;
					route.hops = msg.route.hops;
					route.isValid = true;
				}
				route.seq = msg.route.seqSrc;
			}	
			else if(route.seq == msg.route.seqSrc && route.hops > msg.route.hops)
			{
				route.nextHop = msg.from;
				route.hops = msg.route.hops;
			}
			/*todo: keep multiple paths with different battery levels and same hopcount*/			
		}
		else
		{
			this.routes.push({to:msg.route.from, nextHop: msg.from, hops:msg.route.hops, isValid:true, seq:msg.route.seqSrc, lastReqId:msg.route.id - 1});
		}

		//Search for the destination
		var route = this.getRouteEntry(msg.route.to);
		
		if(route)
		{
			if(route.seq > msg.route.seqDest)
			{
				msg.route.seqDest = route.seq;
			}
		}
		else
		{
			this.routes.push({to:msg.route.to, nextHop: -1, hops:-1, isValid:false, seq:msg.route.seqDest, lastReqId:-1});
		}
	}
	else if(msg.action == "reply")
	{
		//Search for the route destination = message surce
		var route = this.getRouteEntry(msg.route.from);
		
		if(route)
		{
			if(route.seq < msg.route.seqDest)
			{
				if(!route.isValid)
				{
					route.nextHop = msg.from;
					route.hops = msg.route.hops;
					route.isValid = true;
				}
				route.seq = msg.route.seqDest;
			}
			else if(route.seq == msg.route.seqDest)
			{
				if(route.hops > msg.route.hops)
				{
					route.nextHop = msg.from;
					route.hops = msg.route.hops;
				}
			}	
			
			if(route.hops == msg.route.hops && route.nextHop != msg.from)
			{
				if(!route.alt)
				{
					route.alt = [];
				}
				
				var alreadyInList = false;
				for(iAlt in route.alt)
				{
					if(route.alt[iAlt].nextHop == msg.from)
					{
						alreadyInList = true;
						break;
					}
				}
				
				if(!alreadyInList)
				{
					route.alt.push({to:msg.route.from, nextHop: msg.from, hops:msg.route.hops, isValid:true, seq:msg.route.seqDest, lastReqId:-1});
				}
			}
			
			/*todo: keep multiple paths with different battery levels and same hopcount*/
		}
		else
		{
			route = {to:msg.route.from, nextHop: msg.from, hops:msg.route.hops, isValid:true, seq:msg.route.seqDest, lastReqId:-1};
			this.routes.push(route);
		}

		//Search for the route source  =message destination
		var routeBack = this.getRouteEntry(msg.route.to);
		if(routeBack)
		{
			//precursors
			if(!route.precursors)
			{
				route.precursors = [];
			}
			if( -1 == route.precursors.indexOf(routeBack.nextHop))
			{
				route.precursors.push(routeBack.nextHop);
			}
			
			if(!routeNextHopDest.precursors)
			{
				routeNextHopDest.precursors = [];
			}
			if( -1 ==routeNextHopDest.precursors.indexOf(routeBack.nextHop))
			{
				routeNextHopDest.precursors.push(routeBack.nextHop);
			}
		
		/*
			if(routeBack.seq < msg.route.seqDest)
			{
				routeBack.seq = msg.route.seqDest;
			}
			*/
		}
		else
		{
			this.routes.push({to:msg.route.to, nextHop: -1, hops:-1, isValid:false, seq:-1, lastReqId:-1});
			
		}
		
		
	}
	else if(msg.action == "error")
	{
		/*
		   The only other circumstance in which a node may change the
   destination sequence number in one of its route table entries is in
   response to a lost or expired link to the next hop towards that
   destination.  The node determines which destinations use a particular
   next hop by consulting its routing table.  In this case, for each
   destination that uses the next hop, the node increments the sequence
   number and marks the route as invalid (see also sections 6.11, 6.12).
   Whenever any fresh enough (i.e., containing a sequence number at
   least equal to the recorded sequence number) routing information for
   an affected destination is received by a node that has marked that
   route table entry as invalid, the node SHOULD update its route table
   information according to the information contained in the update.
		*/
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
			msg.from = this.node.mac;
			this.node.mesh.sendMsg(msg);
		}
		else
		{
			//this.startRouteDiscovery(msg.route.to, route.seq);
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

NodeNet.prototype.routeRoutingPkg = function(msg)
{
	
	msg.to = null; //broadcast
	msg.from = this.node.mac;
	
	var route = this.getRouteEntry(msg.route.to);
	if(route && route.isValid)
	{
		msg.to = route.nextHop;
	}

	this.node.mesh.sendMsg(msg);
}

NodeNet.prototype.routeOutgoing = function(msg)
{
	if(!msg.route)
	{
		msg.route = {to:msg.to, from:this.node.mac};
	}
	
	var route = this.getRouteEntry(msg.route.to);
	
	if(route)
	{
		if(route.isValid)
		{
			msg.to = route.nextHop;
			msg.from = this.node.mac;
			this.node.mesh.sendMsg(msg);
		}
		else
		{
			this.startRouteDiscovery(msg.route.to, route.seq);
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
	++this.routeReqId;
	
	var route = this.getRouteEntry(this.node.mac);
	if(route)
	{
		route.lastReqId = this.routeReqId;
	}
	else 
	{
		this.routes.push({to:this.node.mac, nextHop:this.node.mac, hops:0, isValid:false, seq:this.routeSeq, lastReqId:this.routeReqId});
	}
	
	this.node.mesh.sendMsg({from:this.node.mac, to:null, type:"route", action:"request", 
						route:{id:this.routeReqId, to:mac, seqDest:lastSeq, from:this.node.mac, seqSrc:this.routeSeq, hops:0, ttl:32}});
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


