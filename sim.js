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
		nodeRadius : document.getElementById("nodeRadius"),
		showGuides : document.getElementById("showGuides"),
		textNodeRadius : document.getElementById("textNodeRadius"),
	};

	this.settings = {nodeHandle:10, nodeRadius:30};
	this.flags = {nodeMoving:-1};	
	this.ui = {showGuides:false, addNode:true, delNode:false, frameTimeout:null};
	
	this.dom.showGuides.checked = this.ui.showGuides;
	this.dom.showGuides.onchange = function() {sim.ui.showGuides = sim.dom.showGuides.checked;}
	
	this.dom.addNode.checked = this.ui.addNode;
	this.dom.addNode.onchange = function() 
	{
		sim.ui.addNode = sim.dom.addNode.checked;
		sim.ui.delNode = !sim.ui.addNode;
	}

	this.dom.delNode.checked = this.ui.delNode;
	this.dom.delNode.onchange = function() 
	{
		sim.ui.delNode = sim.dom.delNode.checked;
		sim.ui.addNode = !sim.ui.delNode;
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
		
		this.gfx.drawText({f:"12px Arial", t:i, x:node.x - 4, y:node.y + 4, c:"red"});
		this.gfx.drawCircle({x:node.x, y:node.y, r:this.settings.nodeHandle, c:"grey"});
		this.gfx.drawCircle({x:node.x, y:node.y, r:node.r, c:"black"});
	}
}

Sim.prototype.drawNodeLinks = function () 
{
	for(i in this.mesh.nodes)
	{
		var node = this.mesh.nodes[i];
		
		for(j in node.neigh)
		{
			this.gfx.drawLine({c:"grey", x1:node.x, y1:node.y,
								x2:node.neigh[j].x, y2:node.neigh[j].y});
			
			this.gfx.drawText({f:"12px Arial", 
							   t:Math.floor(this.sqrDist(node.x, node.y, node.neigh[j].x, node.neigh[j].y)), 
							   x:node.x+(node.neigh[j].x - node.x)/2, 
							   y:node.y + (node.neigh[j].y - node.y)/2, 
							   c:"black"});
			
		}
	}
}

Sim.prototype.drawFrame = function ()
{
	clearTimeout(sim.ui.frameTimeout);
	sim.ui.frameTimeout = setTimeout(sim.drawFrame, 300);
	
	sim.gfx.drawBkg();
	sim.drawNodes();
	sim.drawNodeLinks();
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
	