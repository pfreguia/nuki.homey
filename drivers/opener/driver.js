"use strict";

const NukiDriver = require('../../lib/NukiDriver.js');
const Util = require('/lib/util.js');

class OpenerDriver extends NukiDriver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey });

    this.homey.flow.getDeviceTriggerCard('openerstateChanged');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_true');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_false');
    this.homey.flow.getDeviceTriggerCard('ring_action');
  }

  onPair(session) {
    let devicesArray = [];

    session.setHandler('list_devices', async (data) => {
      let devices = [];
      try {
        let bridgeList = await this.util.sendCommand('https://api.nuki.io/discover/bridges', 4000);
        if (JSON.stringify(bridgeList).includes('"ip":')) {
          for (let i in bridgeList.bridges) {
            var authpath = 'http://' + bridgeList.bridges[i].ip + ':' + bridgeList.bridges[i].port + '/auth';
            var auth = await this.util.sendCommand(authpath, 32000);
            if (auth.success == true) {
              var locklistpath = 'http://' + bridgeList.bridges[i].ip + ':' + bridgeList.bridges[i].port + '/list?token=' + auth.token;
              var deviceList = await this.util.sendCommand(locklistpath, 2000);
              if (deviceList) {
                for (let x in deviceList) {
                  if (deviceList[x].deviceType == 2) {
                    devices.push({
                      name: deviceList[x].name + ' (Direct)',
                      data: {
                        id: deviceList[x].nukiId
                      },
                      settings: {
                        address: bridgeList.bridges[i].ip,
                        port: bridgeList.bridges[i].port,
                        token: auth.token
                      }
                    });
                  }
                }
              }
            } else {
              session.showView('select_pairing');
            }
          }
          if (devices.length) {
            return Promise.resolve(devices);
          } else {
            session.showView('select_pairing');
          }
        } else {
          session.showView('select_pairing');
        }
      } catch (error) {
        session.showView('select_pairing');
      }
    });

    session.setHandler('manual_pairing', async (data) => {
      try {
        let path = 'http://'+ data.address +':'+ data.port +'/info?token='+ data.token;
        let result = await this.util.sendCommand(path, 8000);
        for (let i in result.scanResults) {
          if (result.scanResults[i].deviceType == 2) {
            devicesArray.push({
              name: result.scanResults[i].name +' ('+ data.address +')',
              data: {
                id: result.scanResults[i].nukiId
              },
              settings: {
                address: data.address,
                port: Number(data.port),
                token: data.token
              }
            });
          }
        }
        return Promise.resolve(result);
      } catch (error) {
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

module.exports = OpenerDriver;
