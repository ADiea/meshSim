//Author: ADiea
//Date: 22.08.17
//Descr: Model part of the mesh simulator prj
//		 A node entity

/*

todo: link power negociation

*/

function Node(x, y, r)
{
	//core submodule state, position and radio range radius
	this.isAwake = false;
	this.x = x;
	this.y = y;
	this.r = r;
	
	//Constants. Time is in RTC time ticks
	this.stayAwakeInterval = 20;
	
	//core submodule this is memory of the core MCU
	this.alarms = [];
	
	//core subbmodule, software blocks
	this.net = new NodeNet(this);
	this.app = new NodeApp(this);
	
	//radio submodule
	this.radioFramePending = false; //is there a radio frame pending for us?
	this.radioMsg = [];
	this.txPower = 0;
		
	//rtc submodule
	this.rtcTimestamp = 0;
	this.rtcSpeed = 100; //ms
	this.rtcAlarmTimestamp = -1;
	
	//power management
	this.mAhRemaining = Math.random()*3000; //battery life
	this.mAhRemainingInitial = this.mAhRemaining;
	this.mAhTimestampStart = -1;
}

/*************************** Main() ***************************/

Node.prototype.main = function() //this is the main function, called by the reset vector
{
	this.batRegisterDrain(10);
	
	if(this.powerUpReason == "power") 
	{
		//node was powered up
		this.net.networkMaintenance();
	}
	else if(this.powerUpReason == "extInterrupt") 
	{
		//node was woken by external interrupt
		this.serviceExternalIntIRQ();
	}
	
	this.addRTCAlarm(this.stayAwakeInterval, this.gotoSleep.bind(this));
}


/*************************** Interrupts ***************************/

Node.prototype.powerUp = function(mesh)
{
	this.mesh = mesh;
	
	this.txPower = this.mesh.kMaxTxPower;
	
	this.powerUpReason="power";
	this.isAwake = true;
	setTimeout(this.onRTCTick.bind(this), this.rtcSpeed);
	
	this.app.measure();
	this.main();
}

Node.prototype.externalIntWakeup = function()
{
	/* this is called when the node is asleep 
	   and an ext inter from radio or rtc arrives 
	   causing the node to reset and wakeup */
	this.powerUpReason="extInterrupt";
	this.isAwake = true;
	this.main();
}

Node.prototype.externalIntIRQ = function()
{
	if(this.isAwake)
	{
		this.serviceExternalIntIRQ();
	}
	else
	{
		this.externalIntWakeup();
	}
}

Node.prototype.serviceExternalIntIRQ = function()
{
	if(this.rtcAlarmTimestamp > 0 && 
	   this.rtcAlarmTimestamp < this.rtcTimestamp) 
	{
		//external interrupt was generated by RTC
		this.rtcAlarmTimestamp = -1;
		this.serviceRTCAlarm();
	}
	else if(this.radioFramePending)
	{
		//external interrupt was generated by Radio
		do
		{
			var msg = this.radioMsg[0];
			this.radioMsg.splice(0, 1);
			
			this.net.processMessage(msg);
		}
		while(this.radioMsg.length);
		
		this.radioFramePending = false;
	}	
}

Node.prototype.serviceRTCAlarm = function()
{
	var done = false;
	//service RTC alarm
	do{
		done = true;
		for(i in this.alarms)
		{
			if(this.alarms[i].timestamp <= this.rtcTimestamp)
			{
				var bindedFunc = this.alarms[i].bindedFunc;
				this.alarms.splice(i,1);//remove this alarm from the array 
										//before calling the binded function
				
				bindedFunc();//can append another alarm at the end of the array
				done = false; //search for another alarm
				break;
			}
		}
	}while(!done);
	
	this.setNextRTCAlarm();
}

/*************************** Utils ***************************/

Node.prototype.gotoSleep = function()
{
	this.isAwake = false;
	this.batRegisterDrain(.07);
}

Node.prototype.setNextRTCAlarm = function()
{
	if(this.alarms.length)
	{
		var minAlarm = this.alarms[0].timestamp;
		for(i in this.alarms)
		{
			if(minAlarm > this.alarms[i].timestamp)
			{
				minAlarm = this.alarms[i].timestamp;
			}
		}
		
		this.rtcAlarmTimestamp = minAlarm;
	}
}

Node.prototype.addRTCAlarm = function(timestamp, bindedFunc)
{
	this.alarms.push({timestamp:this.rtcTimestamp + timestamp, bindedFunc:bindedFunc});
	this.setNextRTCAlarm();
}

/*************************** RTC submodule ***************************/ 
Node.prototype.onRTCTick = function()
{
	//Update RTC
	this.rtcTimestamp++;
	
	//Wakeup the node
	if(this.rtcAlarmTimestamp > 0 && 
	   this.rtcAlarmTimestamp < this.rtcTimestamp)
	{
		this.externalIntIRQ();
	}
	
	//reschedule RTC tick
	setTimeout(this.onRTCTick.bind(this), this.rtcSpeed);
}

/*************************** Radio submodule ***************************/ 
Node.prototype.sendMsg = function(msg)
{
	this.batDrain(85, .01);
	return this.net.routeTraffic(msg);
}

Node.prototype.onRecvMsg = function(msg)
{
	this.batDrain(20, .01);

	this.radioFramePending = true;
	this.radioMsg.push(msg);
	
	//don't call ext interrupt directly to avoid recursion for stats.bcastPkts
	setTimeout(this.externalIntIRQ.bind(this), 5);
}

/*************************** Power Management ***************************/ 
Node.prototype.batDrain = function(mA, s)
{
	this.mAhRemaining -= mA*(s/3600.0);
	if(this.mAhRemaining <=0 )
	{
		this.mAhRemaining = 0;
		this.isAwake = false;
	}
}

Node.prototype.batRegisterDrain = function(mA)
{
	if(this.mAhTimestampStart != -1)
	{
		var elapsedSeconds = this.rtcTimestamp - this.mAhTimestampStart;
		this.batDrain(this.mAhCurrentConsumption, elapsedSeconds);
	}
	
	this.mAhTimestampStart = this.rtcTimestamp;
	this.mAhCurrentConsumption = mA;
}
