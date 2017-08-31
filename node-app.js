//Author: ADiea
//Date: 28.08.17
//Descr: Model part of the mesh simulator prj
//		 Application layer

function NodeApp(node)
{
	this.node = node;
	
	//constants
	this.sensorMeasurementInterval = 110;
	
	//buffer of sensor read values (data)
	this.values = [];
	this.lastReadIndex = 0;
	this.lastWriteIndex = -1;
	this.maxLength = 100;
	this.errOverflow = false;
	
	//Data from all sensors
	this.dataAllSensors = [];
}

NodeApp.prototype.measure = function()
{
	this.doMeasurement();
	this.node.addRTCAlarm(this.sensorMeasurementInterval, this.measure.bind(this));
}

NodeApp.prototype.processMessage = function(msg)
{
	if(msg.type == "app")
	{
		if(msg.action == "replyValues")
		{
			this.dataAllSensors.push({from:msg.route.from, data:msg.data});
		}
		else if(msg.action == "getValues")
		{
			this.node.sendMsg({from:this.node.mac, to:msg.route.from, type:"app", action:"replyValues", data:this.values});
		}
	}
}

NodeApp.prototype.getAllValues = function()
{
	this.dataAllSensors = [];
	
	for(i in this.node.mesh.nodes)
	{
		var node = this.node.mesh.nodes[i];
		if(this.node == node)
			continue;
		
		//if(this.node.net.getRoute(nodeMac))
		//{
			this.node.sendMsg({from:this.node.mac, to:node.mac, type:"app", action:"getValues"});
		//}
		//else
		//{
			
		//}
	}
}

NodeApp.prototype.doMeasurement = function()
{
	if(this.values.length <= this.maxLength)
	{
		var value = Math.random() + this.node.mac;
		this.values.push({v:value});
		this.lastWriteIndex = this.values.length - 1;
	}
	else
	{
		if(this.lastReadIndex == this.lastWriteIndex)
		{
			this.errOverflow = true;
		}
		
		this.lastWriteIndex = (this.lastWriteIndex + 1) % this.maxLength;		
	}
}
