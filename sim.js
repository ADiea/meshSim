//Author: ADiea
//Date: 21.08.17
//Descr: Controller part of the mesh simulator prj

var sim = new Sim();

function Sim()
{
}

Sim.prototype.init = function(gfx, mesh)
{
	this.gfx = gfx;
	this.mesh = mesh;
	
	this.dom = {
		addNode : document.getElementById("addNode"),
		delNode : document.getElementById("delNode"),
		pokeNode : document.getElementById("pokeNode"),
		//nodeRadius : document.getElementById("nodeRadius"),
		showGuides : document.getElementById("showGuides"),
		textNodeRadius : document.getElementById("textNodeRadius"),
		showNeigh : document.getElementById("showNeigh"),
		showRoutes : document.getElementById("showRoutes"),
		showRoutesFrom : document.getElementById("showRoutesFrom"),
		showRoutesTo : document.getElementById("showRoutesTo"),
		textNodesDescr : document.getElementById("textNodesDescr"),
		snapDistance : document.getElementById("snapDistance"),
		
	};

	this.settings = {nodeHandle:10, nodeRadius:this.mesh.getMaxSafeTXRadius()};
	this.flags = {nodeMoving:-1};	
	this.ui = {showGuides:false, addNode:true, delNode:false, pokeNode:false, frameTimeout:null, showNeigh:false, showRoutes:true, 
				showRoutesFrom:-1, showRoutesTo:-1, snapDistance:1};
				
	this.curCursorPt = {x:-100, y:-100};
	
	this.dom.showGuides.checked = this.ui.showGuides;
	this.dom.showGuides.onchange = function() {sim.ui.showGuides = sim.dom.showGuides.checked;}

	this.dom.showNeigh.checked = this.ui.showNeigh;
	this.dom.showNeigh.onchange = function() {sim.ui.showNeigh = sim.dom.showNeigh.checked;}

	this.dom.showRoutes.checked = this.ui.showRoutes;
	this.dom.showRoutes.onchange = function() {sim.ui.showRoutes = sim.dom.showRoutes.checked;}
	
	this.dom.showRoutesFrom.value = this.ui.showRoutesFrom;
	this.dom.showRoutesFrom.onchange = function() {sim.ui.showRoutesFrom = parseInt(sim.dom.showRoutesFrom.value);}

	this.dom.showRoutesTo.value = this.ui.showRoutesTo;
	this.dom.showRoutesTo.onchange = function() {sim.ui.showRoutesTo = parseInt(sim.dom.showRoutesTo.value);}

	this.dom.snapDistance.value = this.ui.snapDistance;
	this.dom.snapDistance.onchange = function() {sim.ui.snapDistance = parseInt(sim.dom.snapDistance.value);}
	
	
	
	this.dom.addNode.checked = this.ui.addNode;
	this.dom.addNode.onchange = function() 
	{
		sim.ui.addNode = sim.dom.addNode.checked;
		sim.ui.delNode = !sim.ui.addNode;
		sim.ui.pokeNode = !sim.ui.addNode;
	}

	this.dom.delNode.checked = this.ui.delNode;
	this.dom.delNode.onchange = function() 
	{
		sim.ui.delNode = sim.dom.delNode.checked;
		sim.ui.addNode = !sim.ui.delNode;
		sim.ui.pokeNode = !sim.ui.delNode;
	}
	
	this.dom.pokeNode.checked = this.ui.pokeNode;
	this.dom.pokeNode.onchange = function() 
	{
		sim.ui.pokeNode = sim.dom.pokeNode.checked;
		sim.ui.addNode = !sim.ui.pokeNode;
		sim.ui.delNode = !sim.ui.pokeNode;
	}
	/*
	this.dom.nodeRadius.value = this.settings.nodeRadius;
	this.dom.textNodeRadius.innerText = "NodeRadius:"+this.settings.nodeRadius;
	this.dom.nodeRadius.onchange = function() 
	{
		sim.settings.nodeRadius = sim.dom.nodeRadius.value;
		sim.dom.textNodeRadius.innerText = "NodeRadius:"+sim.settings.nodeRadius;
	}*/
	
	
}

Sim.prototype.drawNodes = function () 
{
	for(i in this.mesh.nodes)
	{
		var node = this.mesh.nodes[i];
		this.gfx.drawCircle({x:node.x, y:node.y, r:this.settings.nodeHandle, c:node.isAwake?"blue":"black"});

		var text = this.mesh.nodes[i].mac;
		
		this.gfx.drawText({f:"14px Arial", 
						   t:text, 
						   x:node.x - gfx.measureText({t:text, f:"14px Arial"}).width/2, 
						   y:node.y + 6, 
						   c:"red"});
		var nodeRssiRadius = this.mesh.getRssiRadius(node.mac, this.mesh.kSafeRSSI);
		this.gfx.drawCircle({x:node.x, y:node.y, r:nodeRssiRadius, c:"grey", dash:[10,15]});
	}
}

Sim.prototype.drawNodeDescr = function()
{
	var descr = "<table border=\"1\" style=\"white-space: nowrap;\">";
	descr += "<tr> <td> #Bcast </td> <td>#Unicast</td> <td>#Failed</td> </tr>";
	
	var totalPkts = this.mesh.stats.unicastPkts + this.mesh.stats.failedPkts + this.mesh.stats.bcastPkts;
	
	descr += "<tr><td>" + this.mesh.stats.bcastPkts + " (" + Math.round((this.mesh.stats.bcastPkts/totalPkts) * 100) +"% )" + "</td>";
	
	descr += "<td>" + this.mesh.stats.unicastPkts + " (" + Math.round((this.mesh.stats.unicastPkts/totalPkts) * 100) +"% )</td>";

	descr += "<td>" + this.mesh.stats.failedPkts + " (" + Math.round((this.mesh.stats.failedPkts/totalPkts) * 100) +"% )"+ "</td>"; 
		
	descr += "</tr> </table>"
	
	descr += "<table border=\"1\" style=\"white-space: nowrap;\"><tr>";
	for(i in this.mesh.stats.pktTypes)
	{
		var type = this.mesh.stats.pktTypes[i];
		descr += "<td>" + type.type + " : " + type.n + " </td>";
	}
	descr += "</tr> </table>";
	
	
	descr += "<table border=\"1\" style=\"white-space: nowrap;\">";
	
	descr += "<tr> <td>MAC</td> <td>Neigh</td> <td>Time</br<(Alarm)</td> <!-- <td>RTC_Al</td> <td>#Alr</td> --> " + 
			 "<td>BatLife</td> <td>BatDr(mA)</td> <!--<td>AppOvfErr</td>--> <td>AppData</td> <td>Routes</td> </tr>";
	
	for(i in this.mesh.nodes)
	{
		var node = this.mesh.nodes[i];
		descr += "<tr>";
		
		descr += "<td>[";
		descr += this.mesh.nodes[i].mac;
		descr += "]</td>";
		
		
		descr += "<td>";
		//descr += this.mesh.nodes[i].net.neigh.length + ": ";
		for(j in this.mesh.nodes[i].net.neigh)
		{
			descr += JSON.stringify(this.mesh.nodes[i].net.neigh[j]) + "</br>";
		}
		descr += "</td>";
		

		var h = Math.floor(this.mesh.nodes[i].rtcTimestamp/3600);
		var m = Math.floor((this.mesh.nodes[i].rtcTimestamp - h*3600)/60);
		var s = (this.mesh.nodes[i].rtcTimestamp - h*3600 - m*60);
		descr += "<td>";
		descr += h + ":" + m + ":" + s + "</br>(-";
		
		var remainingToAlarm = this.mesh.nodes[i].rtcAlarmTimestamp - this.mesh.nodes[i].rtcTimestamp;
		h = Math.floor(remainingToAlarm/3600);
		m = Math.floor((remainingToAlarm - h*3600)/60);
		s = (remainingToAlarm - h*3600 - m*60);
		
		
		descr += h + ":" + m + ":" + s + ")</td>";

/*		
		descr += "<td>";
		descr += this.mesh.nodes[i].rtcAlarmTimestamp;
		descr += "</td>";

		descr += "<td>";
		descr += this.mesh.nodes[i].alarms.length;
		descr += "</td>";
*/
		
		descr += "<td>";
		descr += Math.round(100*(this.mesh.nodes[i].mAhRemaining/3000) * 100) / 100 + "%";
		/*
		descr += "% (";
		descr += Math.round((this.mesh.nodes[i].mAhRemaining) * 100) / 100 + ")";
		*/
		descr += "</td>";		

		descr += "<td>";
		descr += Math.round(((this.mesh.nodes[i].mAhRemainingInitial - this.mesh.nodes[i].mAhRemaining)/(this.mesh.nodes[i].rtcTimestamp/3600.0)) * 100) / 100;
		descr += "</td>";			

/*
		descr += "<td>";
		descr += this.mesh.nodes[i].app.errOverflow;
		descr += "</td>";
*/
		
		descr += "<td>";		
		if(this.mesh.nodes[i].app.dataAllSensors.length)
		{
			for(j in this.mesh.nodes[i].app.dataAllSensors)
			{
				var record = this.mesh.nodes[i].app.dataAllSensors[j];
				descr += "(" + record.from + "):" + record.data.length + "<br/>";
			}
		}
		descr += "</td>";
		
		descr += "<td>";
		var routesTo = [];
		var noRoutesTo = [];
		
		for(j in this.mesh.nodes[i].net.routes)
		{
			descr += JSON.stringify(this.mesh.nodes[i].net.routes[j]).replace(/\"/g, "") + "<br/>";
			routesTo.push(this.mesh.nodes[i].net.routes[j].to);
		}
		
		for(j in this.mesh.nodes)
		{
			if(routesTo.indexOf(this.mesh.nodes[j].mac) == -1)
			{
				noRoutesTo.push(this.mesh.nodes[j].mac);
			}				
		}
		
		if(noRoutesTo.length)
		{
			descr += "----- No routes to: " + noRoutesTo;
		}
		
		descr += "</td>";
		
		descr += "</tr>"
	}
	descr += "</table>";	
	this.dom.textNodesDescr.innerHTML = descr;
}

Sim.prototype.drawRoutes = function () 
{
	if(this.ui.showRoutes)
	{
		var curNode = this.mesh.getNode(this.ui.showRoutesFrom);
		var route;
		if(curNode)
		{
			do
			{
				route = curNode.net.getRouteEntry(this.ui.showRoutesTo);
				if(!route)
					break;
				
				var nextNode = this.mesh.getNode(route.nextHop);
				if(!nextNode)
					break;
				
				this.gfx.drawLine({c:"red", x1:curNode.x, y1:curNode.y,
									x2:nextNode.x, y2:nextNode.y, dash:[5,10]});
									
				for(i in route.alt)
				{
					var nextAlt = this.mesh.getNode(route.alt[i].nextHop);
					this.gfx.drawLine({c:"red", x1:curNode.x, y1:curNode.y,
									x2:nextAlt.x, y2:nextAlt.y, dash:[5,10]});
				}
				
				var bestRoute = this.mesh.getNode(curNode.net.getBestHop(route));
				
				if(bestRoute)
				{
					this.gfx.drawLine({c:"black", x1:curNode.x, y1:curNode.y,
										x2:bestRoute.x, y2:bestRoute.y});
				}

				curNode = bestRoute ? bestRoute : nextNode;

			}while(curNode.mac != this.ui.showRoutesTo);
		}
	}
}

Sim.prototype.drawNodeLinks = function () 
{
	if(this.ui.showNeigh)
	{
		var node = this.mesh.getNode(this.ui.showRoutesTo);		
		if(node)
		{	
			for(i in node.net.neigh)
			{
				var nodeTo = this.mesh.getNode(node.net.neigh[i].mac);
				
				if(nodeTo)
				{
					this.gfx.drawLine({c:"grey", x1:node.x, y1:node.y,
											x2:nodeTo.x, y2:nodeTo.y, width:4, dash:[8, 10]});				
				}
			}
		}
	}	
}

Sim.prototype.drawFrame = function ()
{
	clearTimeout(sim.ui.frameTimeout);
	sim.ui.frameTimeout = setTimeout(sim.drawFrame, 100);
	
	sim.gfx.drawBkg();
	
	if(sim.drawMoveGuides)
	{
			sim.gfx.drawCircle({x:sim.curCursorPt.x, y:sim.curCursorPt.y, r:sim.settings.nodeRadius, c:"lightgrey"});
			if(sim.ui.showGuides)
				sim.gfx.drawGuides(sim.curCursorPt);
	}
	
	sim.drawNodeLinks();

	sim.drawRoutes();
	sim.drawNodes();
	sim.drawNodeDescr();
} 

//Mouse events

Sim.prototype.mousemove = function (pt) 
{
	var x = Math.floor(pt.x/this.ui.snapDistance)*this.ui.snapDistance;
	var y = Math.floor(pt.y/this.ui.snapDistance)*this.ui.snapDistance;
	pt.x = x;
	pt.y = y;
	
	this.curCursorPt = pt;
	var idxNodeFound = this.findNode(pt);
	this.drawFrame(); //first draw frame
	this.drawMoveGuides = false;	
	if(this.ui.addNode)
	{
		if(this.flags.nodeMoving != -1)
		{
			this.mesh.updateNodePosition(this.flags.nodeMoving, pt);
		}	
		
		if(this.flags.nodeMoving != -1 || idxNodeFound != -1)
		{	
			this.gfx.setCursor("move");
		}
		else
		{
			this.gfx.setCursor("crosshair");
			this.drawMoveGuides = true;
			
			this.gfx.drawCircle({x:this.curCursorPt.x, y:this.curCursorPt.y, r:this.settings.nodeRadius, c:"lightgrey"});
			if(this.ui.showGuides)
				this.gfx.drawGuides(this.curCursorPt);
		}
	}
	else if(this.ui.delNode)
	{
		if(idxNodeFound != -1)
		{	
			var node = this.mesh.nodes[idxNodeFound];
			this.gfx.setCursor("not-allowed");
			this.gfx.drawCircle({x:node.x, y:node.y, r:node.r, c:"red"});
		}
		else
		{
			this.gfx.setCursor("crosshair");
		}		
	}
	else if(sim.ui.pokeNode)
	{
		if(idxNodeFound != -1)
		{	
			//var node = this.mesh.nodes[idxNodeFound];
			this.gfx.setCursor("help");
			this.ui.showRoutesTo = this.dom.showRoutesTo.value = this.mesh.nodes[idxNodeFound].mac;
			//this.gfx.drawCircle({x:node.x, y:node.y, r:node.r, c:"red"});
		}
		else
		{
			this.gfx.setCursor("crosshair");
		}			
	}
}

Sim.prototype.mousedown = function (pt)
{
	pt = this.curCursorPt;
	if(this.ui.addNode)
	{	
		var idxNodeFound = this.findNode(pt);	
		if(idxNodeFound != -1)
		{
			this.flags.nodeMoving = idxNodeFound;
		}
		else 
		{
			var node = new Node(pt.x, pt.y, this.settings.nodeRadius*1.0)
			this.mesh.addNode(node);
		}
			
		this.drawFrame();
	}
}

Sim.prototype.mouseup = function (pt) 
{
	pt = this.curCursorPt;
	if(this.ui.addNode)
	{
		if(this.flags.nodeMoving != -1)
		{
			this.mesh.updateNodePosition(this.flags.nodeMoving, pt);
			this.flags.nodeMoving = -1;
		}
	}
	else if(this.ui.delNode)
	{
		var idxNodeFound = this.findNode(pt);	
		if(idxNodeFound != -1)
		{
			this.mesh.delNode(idxNodeFound);
		}
	}
	else if(sim.ui.pokeNode)
	{
		var idxNodeFound = this.findNode(pt);	
		if(idxNodeFound != -1)
		{
			this.mesh.nodes[idxNodeFound].app.getAllValues();
			
			this.ui.showRoutesFrom = this.dom.showRoutesFrom.value = this.mesh.nodes[idxNodeFound].mac;
		}
	}
	this.drawFrame();
}

//Utility functions

Sim.prototype.findNode = function (pt)
{
	var idxNodeFound = -1;
	for(i in this.mesh.nodes)
	{
		if(this.sqrDist(this.mesh.nodes[i].x, this.mesh.nodes[i].y, pt.x, pt.y)
			< this.settings.nodeHandle)
		{
			idxNodeFound = i;
			break;
		}
	}
	return idxNodeFound;
}

Sim.prototype.sqrDist = function (x1, y1, x2, y2) 
{
	var a = x1 - x2, b = y1 - y2;
	return Math.sqrt( a*a + b*b );
}
	