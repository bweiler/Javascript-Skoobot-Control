/* Skoobot Raspberry Pi Javascript control app

   This implements Bluetooth and a webserver. You must install Node.js and Noble. See Github and the Skoobot site for instructions.

   To run this code: Turn on your robot on near your Raspberry Pi. Start this code by running this in a command window:

   sudo node skoobot.js

   Then open a browser. To make the robot go forward, type http://localhost:8080/?cmd=forward
   (Don't forget the ?)

   If weird error messages come out, reboot your Raspberry Pi. If that doesn't work contact me.

   Also, there is more work to do:
    
   1. Make a nice web client with buttons.
   2. Implement the rest of the commands and data.
   3. Code up some cool robot behaviors

*/
var http = require('http');
var url = require('url');
const noble = require('noble');

const LEFT  	= 0x10;
const RIGHT 	= 0x11;
const FORWARD 	= 0x12;
const BACKWARD	= 0x13;
const STOP 	= 0x14;
const DISTANCE	= 0x22;
const AMBIENT	= 0x22;
const BUZZER	= 0x17;
const ROVER	= 0x40;
const FOTOVORE	= 0x41;

const SKOOBOT_SERVICE_UUID = '1523';
const DATA_CHARACTERISTIC_UUID = '000015241212efde1523785feabcd123';
const COMMAND_CHARACTERISTIC_UUID = '000015251212efde1523785feabcd123';
const DATA2_CHARACTERISTIC_UUID = '000015261212efde1523785feabcd123';
const DATA4_CHARACTERISTIC_UUID = '000015271212efde1523785feabcd123';
const DATA20_CHARACTERISTIC_UUID = '000015281212efde1523785feabcd123';

var cmdCharacteristic = null;
var dataCharacteristic = null;
var dataready = 0;
var datavalue = 0;

//This is webserver
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  var q = url.parse(req.url, true).query;
  var txt = q.cmd;
  console.log(txt);
  var msg = 'unknown';
  var cmdvar = 0;
  if (txt == 'forward') {
	msg = 'Going forward';
	cmdvar = FORWARD;
  }
  if (txt == 'backward') {
	msg = 'Going Backward';
	cmdvar = BACKWARD;
  }
  if (txt == 'right') {
	msg = 'Going right';
	cmdvar = RIGHT;
  }
  if (txt == 'left') {
	msg = 'Going left';
	cmdvar = LEFT;
  }
  if (txt == 'stop') {
	msg = 'Stopping';
	cmdvar = STOP;
  }
  if (txt == 'distance') {
      msg = 'Distance';	
      cmdvar = DISTANCE;
  }
  if (txt == 'value') {
      if (dataready == 1)
      {
         msg = 'Data value: ',datavalue;
         dataready = 0;
      }else{
	 msg = 'Unknown';	
      }
  }
  var cmdbyte = new Buffer(1);
  cmdbyte.writeUInt8(cmdvar, 0);
  cmdCharacteristic.write(cmdbyte, false, function(err) {
	if (err) {
	  console.log('write error');
	}
  });
  res.end(msg);
}).listen(8080);

//This does scanned for Skoobot
noble.on('stateChange', state => {
  if (state === 'poweredOn') {
    console.log('Scanning');
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

//This connects
noble.on('discover', peripheral => {
    // connect to the first peripheral that is scanned
    noble.stopScanning();
    const name = peripheral.advertisement.localName;    
    const svcs = peripheral.advertisement.serviceUuids;    
    const rssi = peripheral.rssi;
    console.log(`Connecting to '${name}' ${peripheral.id} ${svcs} ${rssi} `);
    connectAndSetUp(peripheral);
});

function connectAndSetUp(peripheral) {

  peripheral.connect(function(err) {
    //
    // Once the peripheral has been connected, then discover the
    // services and characteristics of interest.
    //
    if (err) {
       console.log(err);
    }
    console.log('Connected, Scanning for service ...');

 
    peripheral.discoverServices(null, function(err, services) {
       
       console.log('discovering...');
      
       services.forEach(function(service) {
        //
        // This must be the service we were looking for.
        //
        console.log('found service:', service.uuid);

        //
        // So, discover its characteristics.
        //
        service.discoverCharacteristics(null, function(err, characteristics) {

          characteristics.forEach(function(characteristic) {
            //
            // Loop through each characteristic and match them to the
            // UUIDs that we know about.
            //
            console.log('found characteristic:', characteristic.uuid);

            if (COMMAND_CHARACTERISTIC_UUID == characteristic.uuid) {
              cmdCharacteristic = characteristic;
	      console.log('cmd characteristic matched');
            }
            else if (DATA_CHARACTERISTIC_UUID == characteristic.uuid) {
              dataCharacteristic = characteristic;
  	      // data callback receives notifications
	      console.log('data characteristic matched');
   	      dataCharacteristic.on('data', (data, isNotification) => {
	        console.log('Received: ', data.readUInt8(0));
                dataready = 1;
                datavalue = data.readUInt8(0);
	      });
	  
	      // subscribe to be notified whenever the peripheral update the characteristic
	      dataCharacteristic.subscribe(error => {
		  if (error) {
		     console.error('Error subscribing to dataCharacteristic');
		  } else {
		     console.log('Subscribed for dataCharacteristic notifications');
		  }
	      }); 
           }
         })
       })
    })
  })
 })
}

 // create an interval to send data to the service
//  let count = 0;
//  setInterval(() => {
//    count++;
//    const message = new Buffer('hello, ble ' + count, 'utf-8');
//    console.log("Sending:  '" + message + "'");
//    cmdCharacteristic.write(message);
//  }, 2500);