//Author: ADiea
//Date: 28.08.17
//Descr: Model part of the mesh simulator prj
//		 Network layers (data link, network, transport)

/*

todo: 
link:
link power negociation

not efficient to send discovery to every neigh since radio band will be occupied xn. Better bcast? how do they respond? maybe they do not respond everybody collects assively from broadcasts.

network:
send seq from current to next hop to have implicit route

debug alternatives not yet working ok.
choose best alt based on last battery level
hello with battery level

implement error frame
if bat level <10 send error frame

hello: aodv hello plus bat plus rssi request. individual no neigh no broadcast. each neigh answers with own bat and rssi
also time sinc
all neigh data collected in neigh

*/

function NodeNet(node)
{
	this.node = node;
	
	//constants
	this.networkServiceInterval = 500;
	this.neighAliveInterval = 2 * this.networkServiceInterval;
	this.kRouteAliveBatThres = 10;
	this.kRouteAliveRSSIThres = 90;
	
	
	//neighbour cache
	this.neigh = [];
	
	this.bufferApp = [];
	
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
	var n = this.getNeighEntry(msg.from);
	
	if(!n)
	{
		this.neigh.push({mac:msg.from, bat:Math.round(msg.info.bat*100), rssi:Math.round(this.node.mesh.getRssiFromNode(msg.from, this.node.mac)), lastAlive:this.node.rtcTimestamp});
	}
	else
	{
		n.bat = Math.round(msg.info.bat*100);
		n.rssi = Math.round(this.node.mesh.getRssiFromNode(msg.from, this.node.mac));
		n.lastAlive = this.node.rtcTimestamp;
	}	
}

NodeNet.prototype.processMessage = function(msg)
{
	//this.updateNeigh(msg);

	if(msg.type == "discovery")
	{
		if(msg.action == "reply")
		{
			this.updateNeigh(msg);
		}
		else if(msg.action == "request")
		{
			this.updateNeigh(msg);
			this.node.mesh.sendMsg({from:this.node, to:msg.from, type:"discovery", action:"reply", info:{bat:this.node.mAhRemaining/3000, txPower:this.node.txPower}});
		}	
	}
	else if(msg.type == "route")
	{
		this.passiveUpdateRoutes(msg);
		
		if(msg.action == "request")
		{
			//todo: test filter requests with same id here and discard alt posibilities
			
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
				//a route was added in passiveUpdateRoutes();
				var route = this.getRouteEntry(msg.route.from);
				this.routeBufferedPkts(route);
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
			this.routeTraffic(msg);
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
	
	var n = this.getNeighEntry(msg.from);
	if(!n)
	{
		this.neigh.push({mac:msg.from, bat:100, rssi:0, lastAlive:this.node.rtcTimestamp});
	}
	else
	{
		n.lastAlive = this.node.rtcTimestamp;
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
					route.alt.push({to:msg.route.from, nextHop: msg.from, hops:msg.route.hops, isValid:true, seq:msg.route.seqSrc, lastReqId:-1});
				}
			}
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
			//this.routes.push({to:msg.route.to, nextHop: -1, hops:-1, isValid:false, seq:msg.route.seqDest, lastReqId:-1});
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
	
	if(route && route.alt && msg.action == "reply")
	{
		for(iAlt in route.alt)
		{
			msg.to = route.alt[iAlt].nextHop;
			this.node.mesh.sendMsg(msg);
		}
	}
}

NodeNet.prototype.routeTraffic = function(msg)
{
	if(!msg.route)
	{
		msg.route = {to:msg.to, from:this.node.mac};
	}
	
	var route = this.getRouteEntry(msg.route.to);
	
	if(route)
	{
		var nextHop = this.getBestHop(route);

		if(nextHop != 0)
		{
			msg.to = nextHop;
			msg.from = this.node.mac;
			this.node.mesh.sendMsg(msg);
		}
		else
		{
			this.bufferApp.push(msg);
			this.startRouteDiscovery(msg.route.to, route.seq);
			return false;
		}
	}
	else
	{
		this.bufferApp.push(msg);
		this.startRouteDiscovery(msg.route.to, -1);
		return false;
	}
	
	return true;
}

NodeNet.prototype.routeBufferedPkts = function(route)
{
	var done = false;
	var i = 0;
	do
	{
		done = true;
		for(; i<this.bufferApp.length; i++)
		{
			if(route.to == this.bufferApp[i].route.to)
			{
				this.routeTraffic(this.bufferApp[i]);
				this.bufferApp.splice(i, 1);
				done = false;
				break;
			}
		}
	}
	while(!done);
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
		this.routes.push({to:this.node.mac, nextHop:this.node.mac, hops:0, isValid:true, seq:this.routeSeq, lastReqId:this.routeReqId});
	}
	
	this.node.mesh.sendMsg({from:this.node.mac, to:null, type:"route", action:"request", 
						route:{id:this.routeReqId, to:mac, seqDest:lastSeq, from:this.node.mac, seqSrc:this.routeSeq, hops:0, ttl:32}});
}

NodeNet.prototype.searchNeigh = function()
{
	//this.neigh = []; //todo: timestamp based prunning instead of prune all neighbours
	//this.node.sendMsg({from:this.node, to:null, type:"discovery", action:"hello"});
	var done = false;
	
	do
	{
		done = true;	
		for(i in this.neigh)
		{
			var n = this.neigh[i];

			if(this.node.rtcTimestamp - n.lastAlive < this.neighAliveInterval)
			{
				this.node.mesh.sendMsg({from:this.node.mac, to:n.mac, type:"discovery", action:"request", info:{bat:this.node.mAhRemaining/3000, txPower:this.node.txPower}});
			}
			else 
			{
				this.neigh.splice(i,1);
				done = false;
				break;
			}
			
		}
	}
	while(!done);
}

NodeNet.prototype.getBestHop = function(route)
{
	var alt = [];
	
	if(this.isRouteAlive(route))
	{
		alt.push(route);
	}
	
	if(route.alt)
	{
		for(i in route.alt)
		{
			if(this.isRouteAlive(route.alt[i]))
			{
				alt.push(route.alt[i]);
			}
		}
		
		var done = false, i=0;
		do
		{
			done = true;
			for(i=0; i<alt.length; i++)
			{
				if(i+1 < alt.length)
				{
					var n1 = this.getNeighEntry(alt[i].nextHop);
					var n2 = this.getNeighEntry(alt[i+1].nextHop);
					if(-1 == this.compareAltNeigh(n1, n2))
					{
						var a = alt[i];
						alt[i] = alt[i+1];
						alt[i+1] = a;
						done = false;
					}
				}
			}
		}
		while(!done);
	}
	
	if(alt.length == 0)
		return 0;
	
	return alt[0].nextHop;
}

//if n1 is better than n2 return 1, else return -1

NodeNet.prototype.compareAltNeigh = function(n1, n2)
{
	//calc relative percent difference for bat and rssi
	var rssiDifference = Math.abs(n1.rssi - n2.rssi) / (this.kRouteAliveRSSIThres);
	var batDifference =  Math.abs(n1.bat - n2.bat) / (100);
	var diffBatVsRSSI = Math.abs(rssiDifference - batDifference);
	
	//prefer rssi over bat for comparison if the relative differences are close
	var compareRSSI = true;
	
	if(diffBatVsRSSI > .1)
	{
		//take into account the greatest difference between rssi and bat
		if(rssiDifference < batDifference)
		{
			compareRSSI = false;
		}
	}

	if(compareRSSI)
	{
		if(n1.rssi <= n2.rssi)
			return 1;
	}
	else
	{
		if(n1.bat >= n2.bat)
			return 1;
	}
	
	return -1;
}


/************** Utils ****************/
NodeNet.prototype.isRouteAlive = function(route)
{
	do
	{
		if(!route.isValid)
			break;
		
		var n = this.getNeighEntry(route.nextHop);
		
		if(!n)
			break;
		
		if(n.bat < this.kRouteAliveBatThres)
			break;
		
		if(n.rssi > this.kRouteAliveRSSIThres)
			break;
		
		return true;
	}
	while(false);
	
	return false;
}

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

NodeNet.prototype.getNeighEntry = function(mac)
{
	for(i in this.neigh)
	{
		if(this.neigh[i].mac == mac)
		{
			return this.neigh[i];
		}
	}
	return null;
}