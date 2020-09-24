"use strict";

const Homey = require('homey');

class NukiDriver extends Homey.Driver {


  get nukiDeviceType() {
    throw new Error('Abstract error');
  }

  onInit() {
    if (!this.util) this.util = new Util({ homey: this.homey });

    this.homey.flow.getDeviceTriggerCard('openerstateChanged');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_true');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_false');
    this.homey.flow.getDeviceTriggerCard('ring_action');
  }

  onPair(session) {
    let foundDevices = [];

    session.setHandler('loading_bridge', async (dummy) => {
      try {
        const bridgeList = await this.util.sendCommand('https://api.nuki.io/discover/bridges', 4000);
        if (JSON.stringify(bridgeList).includes('"ip":')) {
          for (let i in bridgeList.bridges) {
            const authpath = 'http://' + bridgeList.bridges[i].ip + ':' + bridgeList.bridges[i].port + '/auth';
            const auth = await this.util.sendCommand(authpath, 23000);
            if (auth.success == true) {
              const locklistpath = 'http://' + bridgeList.bridges[i].ip + ':' + bridgeList.bridges[i].port + '/list?token=' + auth.token;
              const deviceList = await this.util.sendCommand(locklistpath, 2000);
              if (deviceList) {
                for (let x in deviceList) {
                  if (deviceList[x].deviceType == this.nukiDeviceType) {
                    foundDevices.push({
                      name: deviceList[x].name,
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
              else {
                return false;
              }
            }
            else {
              return false;
            }
          }
          return true;
        }
        else {
          return false;
        }
      }
      catch (error) {
        return false;
      }
    });

    session.setHandler('list_devices', async (data) => {
      return Promise.resolve(foundDevices);
    });

    session.setHandler('manual_pairing', async (bridgeAddress) => {
      try {
        let path = 'http://' + bridgeAddress.address + ':' + bridgeAddress.port + '/info?token=' + bridgeAddress.token;
        let bridgeInfo = await this.util.sendCommand(path, 8000);
        for (let i in bridgeInfo.scanResults) {
          if (bridgeInfo.scanResults[i].deviceType == this.nukiDeviceType) {
            foundDevices.push({
              name: bridgeInfo.scanResults[i].name,
              data: {
                id: bridgeInfo.scanResults[i].nukiId
              },
              settings: {
                address: bridgeAddress.address,
                port: Number(bridgeAddress.port),
                token: bridgeAddress.token
              }
            });
          }
        }
        return Promise.resolve(bridgeInfo);
      }
      catch (error) {
        return Promise.reject(error);
      }
    });
  }

}

module.exports = NukiDriver;
