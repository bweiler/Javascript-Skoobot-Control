//Skoobot control app

const noble = require('noble');

const LEFT  	= 0x10;
const RIGHT 	= 0x11;
const FORWARD 	= 0x12;
const BACKWARD	= 0x13;

const SKOOBOT_SERVICE_UUID = '1523';
const COMMAND_CHARACTERISTIC_UUID = '1525';

noble.on('stateChange', state => {
  if (state === 'poweredOn') {
    console.log('Scanning');
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', peripheral => {
    // connect to the first peripheral that is scanned
    noble.stopScanning();
    const name = peripheral.advertisement.localName;
    console.log(`Connecting to '${name}' ${peripheral.id}`);
    connectAndSetUp(peripheral);
});

function connectAndSetUp(peripheral) {

  peripheral.connect(error => {
    console.log('Connected to', peripheral.id);

    // specify the services and characteristics to discover
    const serviceUUIDs = [SKOOBOT_SERVICE_UUID];
    const characteristicUUIDs = [COMMAND_CHARACTERISTIC_UUID];

    peripheral.discoverSomeServicesAndCharacteristics(
        serviceUUIDs,
        characteristicUUIDs,
        onServicesAndCharacteristicsDiscovered
    );
  });
  
  peripheral.on('disconnect', () => console.log('disconnected'));
}

function onServicesAndCharacteristicsDiscovered(error, services, characteristics) {
  console.log('Discovered services and characteristics');
  const cmdCharacteristic = characteristics[0];

  // data callback receives notifications
  cmdCharacteristic.on('data', (data, isNotification) => {
    console.log('Received: "' + data + '"');
  });
  
  // subscribe to be notified whenever the peripheral update the characteristic
  cmdCharacteristic.subscribe(error => {
    if (error) {
      console.error('Error subscribing to echoCharacteristic');
    } else {
      console.log('Subscribed for echoCharacteristic notifications');
    }
  });

  // create an interval to send data to the service
  let count = 0;
  setInterval(() => {
    count++;
    const message = new Buffer('hello, ble ' + count, 'utf-8');
    console.log("Sending:  '" + message + "'");
    echoCharacteristic.write(message);
  }, 2500);
}