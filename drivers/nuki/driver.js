"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class NukiDriver extends Homey.Driver {

  onInit() {
    new Homey.FlowCardTriggerDevice('lockstateChanged').register();
  }

  async onPairListDevices (data, callback) {
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
      callback(null, devices);
    } catch(error) {
      callback(error, false);
    }
  }

}

module.exports = NukiDriver;
