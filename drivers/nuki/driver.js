'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class NukiDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey });

    this.homey.flow.getDeviceTriggerCard('lockstateChanged');
  }

  onPair(session) {
    let devicesArray = [];

    session.setHandler('list_devices', async (data) => {
      let devices = [];
      try {
        let bridgeList = await this.util.sendCommand('https://api.nuki.io/discover/bridges', 4000);
        if (JSON.stringify(bridgeList).includes('"ip":')) {
          for (let i in bridgeList.bridges) {
            var authpath = 'http://'+ bridgeList.bridges[i].ip +':'+ bridgeList.bridges[i].port +'/auth';
            var auth = await this.util.sendCommand(authpath, 32000);
            if (auth.success == true) {
              var locklistpath = 'http://'+ bridgeList.bridges[i].ip +':'+ bridgeList.bridges[i].port +'/list?token='+ auth.token;
              var deviceList = await this.util.sendCommand(locklistpath, 2000);
              if (deviceList) {
                for (let x in deviceList) {
                  if (deviceList[x].deviceType == 0) {
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
              }
            } else {
              return Promise.reject(this.homey.__("driver.no_token"));
            }
          }
          return Promise.resolve(devices);
        } else {
          await session.showView('select_pairing');
        }
      } catch(error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('manual_pairing', async (data) => {
      try {
        let path = 'http://'+ data.address +':'+ data.port +'/info?token='+ data.token;
        let result = await this.util.sendCommand(path, 8000);
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
        return Promise.resolve(result);
      } catch(error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('add_device', (data) => {
      return new Promise((resolve, reject) => {
        try {
          return resolve(devicesArray);
        } catch (error) {
          return reject(error);
        }
      });
    });

  }

}

module.exports = NukiDriver;
