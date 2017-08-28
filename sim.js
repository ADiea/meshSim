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
		nodeRadius : document.getElementById("nodeRadius"),
		showGuides : document.getElementById("showGuides"),
		textNodeRadius : document.getElementById("textNodeRadius"),
		showNeigh : document.getElementById("showNeigh"),
		showRoutes : document.getElementById("showRoutes"),
		textNodesDescr : document.getElementById("textNodesDescr"),
	};

	this.settings = {nodeHandle:15, nodeRadius:80};
	this.flags = {nodeMoving:-1};	
	this.ui = {showGuides:false, addNode:true, delNode:false, pokeNode:false, frameTimeout:null, showNeigh:true, showRoutes:true};
	
	this.dom.showGuides.checked = this.ui.showGuides;
	this.dom.showGuides.onchange = function() {sim.ui.showGuides = sim.dom.showGuides.checked;}

	this.dom.showNeigh.checked = this.ui.showNeigh;
	this.dom.showNeigh.onchange = function() {sim.ui.showNeigh = sim.dom.showNeigh.checked;}

	this.dom.showRoutes.checked = this.ui.showRoutes;
	this.dom.showRoutes.onchange = function() {sim.ui.showRoutes = sim.dom.showRoutes.checked;}
	
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
	
	this.dom.nodeRadius.value = this.settings.nodeRadius;
	this.dom.textNodeRadius.innerText = "NodeRadius:"+this.settings.nodeRadius;
	this.dom.nodeRadius.onchange = function() 
	{
		sim.settings.nodeRadius = sim.dom.nodeRadius.value;
		sim.dom.textNodeRadius.innerText = "NodeRadius:"+sim.settings.nodeRadius;
	}
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
		
		this.gfx.drawCircle({x:node.x, y:node.y, r:node.r, c:"grey", dash:[10,15]});
	}
}

Sim.prototype.drawNodeDescr = function()
{
	var descr = "<table border=\"1\">";
	
	descr += "<tr> <td>MAC</td> <td>Neigh</td> <td>Time</td> <td>RTC_Alarm</td> <td>#Alarms</td> " + 
			 "<td>BatteryLife(mAh)</td> <td>AveBatDrain(mA)</td> <td>AppValues</td> <td>AppOvfErr</td> <td>AppData</td> </tr>";
	
	for(i in this.mesh.nodes)
	{
		var node = this.mesh.nodes[i];
		descr += "<tr>";
		
		descr += "<td>[";
		descr += this.mesh.nodes[i].mac;
		descr += "]</td>";
		
		descr += "<td>";
		descr += this.mesh.nodes[i].net.neigh.length + ": ";
		for(j in this.mesh.nodes[i].net.neigh)
		{
			descr += this.mesh.nodes[i].net.neigh[j].mac + " ";
		}
		descr += "</td>";

		descr += "<td>";
		descr += this.mesh.nodes[i].rtcTimestamp;
		descr += "</td>";

		descr += "<td>";
		descr += this.mesh.nodes[i].rtcAlarmTimestamp;
		descr += "</td>";

		descr += "<td>";
		descr += this.mesh.nodes[i].alarms.length;
		descr += "</td>";

		descr += "<td>";
		descr += Math.round(100*(this.mesh.nodes[i].mAhRemaining/3000) * 100) / 100;
		descr += "% (";
		descr += Math.round((this.mesh.nodes[i].mAhRemaining) * 100) / 100;
		descr += ")</td>";		

		descr += "<td>";
		descr += Math.round(((3000 - this.mesh.nodes[i].mAhRemaining)/(this.mesh.nodes[i].rtcTimestamp/3600.0)) * 100) / 100;
		descr += "</td>";			
	
		descr += "<td>";
		descr += this.mesh.nodes[i].app.values.length;
		descr += "</td>";

		descr += "<td>";
		descr += this.mesh.nodes[i].app.errOverflow;
		descr += "</td>";
		
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
		
		
		descr += "</tr>"
	}
	descr += "</table>";	
	this.dom.textNodesDescr.innerHTML = descr;
}

Sim.prototype.drawNodeLinks = function () 
{
	if(this.ui.showNeigh)
	{
		for(i in this.mesh.nodes)
		{
			var node = this.mesh.nodes[i];
			
			for(j in node.net.neigh)
			{
				var foundInList = false;
				for(k in node.net.neigh[j].net.neigh)
				{
					if(node == node.net.neigh[j].net.neigh[k])
					{
						foundInList = true;
					}
				}
				
				if(!foundInList) //This neighbour is just in our list, probably a temporary neighbour
				{
					this.gfx.drawLine({c:"grey", x1:node.x, y1:node.y,
										x2:node.net.neigh[j].x, y2:node.net.neigh[j].y, dash:[5,15]});
				}
				else if(node.mac < node.net.neigh[j].mac)//only draw one line, the one from the smallest of the 2 MACs
				{
					this.gfx.drawLine({c:"grey", x1:node.x, y1:node.y,
										x2:node.net.neigh[j].x, y2:node.net.neigh[j].y});
				}
				
				/*this.gfx.drawText({f:"12px Arial", 
								   t:Math.floor(this.sqrDist(node.x, node.y, node.net.neigh[j].x, node.net.neigh[j].y)), 
								   x:node.x+(node.net.neigh[j].x - node.x)/2, 
								   y:node.y + (node.net.neigh[j].y - node.y)/2, 
								   c:"black"});
				*/
			}
		}
	}	
}

Sim.prototype.drawFrame = function ()
{
	clearTimeout(sim.ui.frameTimeout);
	sim.ui.frameTimeout = setTimeout(sim.drawFrame, 100);
	
	sim.gfx.drawBkg();
	sim.drawNodeLinks();
	sim.drawNodes();
	sim.drawNodeDescr();
} 

//Mouse events

Sim.prototype.mousemove = function (pt) 
{
	var idxNodeFound = this.findNode(pt);	
	this.drawFrame(); //first draw frame
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
			this.gfx.drawCircle({x:pt.x, y:pt.y, r:this.settings.nodeRadius, c:"lightgrey"});
			if(this.ui.showGuides)
				this.gfx.drawGuides(pt);
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
	