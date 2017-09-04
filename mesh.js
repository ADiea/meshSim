//Author: ADiea
//Date: 21.08.17
//Descr: Model part of the mesh simulator prj

var mesh = new Mesh();

function Mesh()
{
	this.nodes = [];
	this.uniqueId = 1;
	
	this.stats = {bcastPkts:0, unicastPkts:0, failedPkts:0, pktTypes:[]};
	
	//todo: adjust according to reality
	this.kRssiConstant = .05;
	this.kMaxTxPower = 13;
	this.kSafeRSSI = 60;
	this.kFailedRSSI = 120;
	
}

Mesh.prototype.getNode = function(mac)
{
	for(i in this.nodes)
	{
		if(mac == this.nodes[i].mac)
				return this.nodes[i];
	}
	return null;
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

Mesh.prototype.getRssiFromNode = function (macFrom, macDest) 
{
	var n1 = this.getNode(macFrom);
	var n2 = this.getNode(macDest);
	if(!n1 || !n2)
		return this.kFailedRSSI;
	
	var dist = this.sqrDist(n1.x, n1.y, n2.x, n2.y);
	var power = n1.txPower;
	
	var rssi = this.kRssiConstant * (dist*dist) / power;
	return rssi;
}

Mesh.prototype.getMaxSafeTXRadius = function()
{
	return Math.sqrt(this.kSafeRSSI*this.kMaxTxPower/this.kRssiConstant);
}

Mesh.prototype.getRssiRadius = function (mac, rssi) 
{
	var n1 = this.getNode(mac);
	if(!n1) return 5;
	
	var dist = Math.sqrt(rssi*n1.txPower/this.kRssiConstant);
	return dist;
}

Mesh.prototype.isPacketFailed = function (rssi)
{
	if(rssi <= this.kSafeRSSI)
	{
		return false;
	}
	if(rssi >= this.kFailedRSSI)
	{
		return true;
	}
	
	var failRate = 2*100 * (rssi - this.kSafeRSSI) / (this.kFailedRSSI - this.kSafeRSSI);
	//failRate = failRate * failRate;
	
	if(Math.floor(100 * Math.random()) < failRate)
	{
		return true;
	}
	
	return false;
}

Mesh.prototype.sendMsg = function(msg)
{
	var foundPktType = false;
	for(i in this.stats.pktTypes)
	{
		if(this.stats.pktTypes[i].type == msg.type)
		{
			this.stats.pktTypes[i].n++;
			foundPktType = true;
			break;
		}
	}
	
	if(!foundPktType)
	{
		this.stats.pktTypes.push({type:msg.type, n:1});
	}
	
	//some packets are lost due to other errors
	if(Math.floor(100 * Math.random()) < this.settings.errorRate)
	{
		this.stats.failedPkts++;
		return;
	}
	
	if(this.getNode(msg.to))
	{
		if(this.isPacketFailed(this.getRssiFromNode(msg.from, msg.to)))
		{
			this.stats.failedPkts++;
			return;
		}
		else
		{
			this.stats.unicastPkts++;
			this.getNode(msg.to).onRecvMsg(JSON.parse(JSON.stringify(msg)));
		}
	}
	else //broadcast
	{
		for(i in this.nodes)
		{
			if(msg.from == this.nodes[i].mac)
				continue;
			   
			if(this.isPacketFailed(this.getRssiFromNode(msg.from, this.nodes[i].mac)))
			{
				//don't care, bcast does not guarantee delivery
				//this.stats.failedPkts++;
				continue;
			}
			else   
			{
				this.stats.bcastPkts++;
				this.nodes[i].onRecvMsg(JSON.parse(JSON.stringify(msg)));
			}
		}
	}
}