"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class NukiDriver extends Homey.Driver {

  onInit() {
    new Homey.FlowCardTriggerDevice('lockstateChanged').register();
  }

  onPair(socket) {
    let devicesArray = [];

    socket.on('list_devices', async (data, callback) => {
      let devices = [];
      try {
        let bridgeList = await util.sendCommand('https://api.nuki.io/discover/bridges', 4000);
        for (let i in bridgeList.bridges) {
          var authpath = 'http://'+ bridgeList.bridges[i].ip +':'+ bridgeList.bridges[i].port +'/auth';
          var auth = await util.sendCommand(authpath, 32000);
          if (auth.success == true) {
            var locklistpath = 'http://'+ bridgeList.bridges[i].ip +':'+ bridgeList.bridges[i].port +'/list?token='+ auth.token;
            var deviceList = await util.sendCommand(locklistpath, 2000);
            if (deviceList) {
              for (let x in deviceList) {
                devices.push({
                  name: deviceList[x].name +' ('+ bridgeList.bridges[i].ip +')',
                  data: {
                    id: deviceList[x].nukiId
                  },
                  settings: {
                    address: bridgeList.bridges[i].ip,
                    port: bridgeList.bridges[i].port,
                    nukiId: deviceList[x].nukiId,
                    token: auth.token
                  }
                });
              }
            }
          } else {
            callback(Homey.__("Did not receive a token from the bridge, make sure you push the bridge button during pairing."), false);
          }
        }
        if (devices.length) {
          callback(null, devices);
        } else {
          socket.showView('select_pairing');
        }
      } catch(error) {
        callback(error, false);
      }
    });

    socket.on('manual_pairing', async (data, callback) => {
      try {
        let path = 'http://'+ data.address +':'+ data.port +'/info?token='+ data.token;
        let result = await util.sendCommand(path, 8000);
        for (let i in result.scanResults) {
          devicesArray.push({
            name: result.scanResults[i].name +' ('+ data.address +')',
            data: {
              id: result.scanResults[i].nukiId
            },
            settings: {
              address: data.address,
              port: data.port,
              nukiId: result.scanResults[i].nukiId,
              token: data.token
            }
          });
        }
        callback(null, result);
      } catch(error) {
        callback(error, false);
      }
    });

    socket.on('add_device', (data, callback) => {
      callback(false, devicesArray);
    });

  }

}

module.exports = NukiDriver;
