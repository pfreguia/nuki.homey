'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class NukiApp extends Homey.App {

  onInit() {
    this.log('Initializing Nuki app ...');

    if (!this.util) this.util = new Util({homey: this.homey });

    // POLLING DEVICES FOR STATE
    this.pollDevices();


    // FLOW CARDS

    // Nuki Lock
    this.homey.flow.getActionCard('lockAction')
      .registerRunListener(async (args) => {
        try {
          let path = 'http://'+ args.device.getSetting('address') +':'+ args.device.getSetting('port') +'/lockAction?nukiId='+ args.device.getSetting('nukiId') +'&action='+ args.lockaction +'&token='+ args.device.getSetting('token');
          let result = await this.util.sendCommand(path, 8000);
          if (result.success == true) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          if (error == '400') {
            return Promise.reject(this.homey.__('app.400'));
          } else if (error == '401') {
            return Promise.reject(this.homey.__('app.401'));
          } else if (error == '404') {
            return Promise.reject(this.homey.__('app.404'));
          } else if (error == '503') {
            return Promise.reject(this.homey.__('app.503'));
          } else {
            return Promise.reject(error);
          }
        }
      })

    // Nuki Opener
    this.homey.flow.getActionCard('openerAction')
      .registerRunListener(async (args, state) => {
        try {
          let path = 'http://' + args.device.getSetting('address') + ':' + args.device.getSetting('port') + '/lockAction?nukiId=' + args.device.getSetting('nukiId') + '&deviceType=2&action=' + args.openeraction + '&token=' + args.device.getSetting('token');
          let result = await this.util.sendCommand(path, 8000);
          if (result.success == true) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          if (error == '400') {
            return Promise.reject(Homey.__('400'));
          } else if (error == '401') {
            return Promise.reject(Homey.__('401'));
          } else if (error == '404') {
            return Promise.reject(Homey.__('404'));
          } else if (error == '503') {
            return Promise.reject(Homey.__('503'));
          } else {
            return Promise.reject(error);
          }
        }
      })
  }

  pollDevices() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let bridges = [];
        let drivers = this.homey.drivers.getDrivers();
        let isSameBridge = function (b) {
          return b.address == this.address && b.port == this.port
        };

        for (let i in drivers) {
          let devices = drivers[i].getDevices();
          for (let j in devices) {
            let currBridge = {
              address: devices[j].getSetting('address'),
              port: devices[j].getSetting('port'),
              token: devices[j].getSetting('token'),
              nukiDevs: []
            };
            let existingBridge = bridges.find(isSameBridge, currBridge);
            if (!existingBridge) {
              bridges.push(currBridge);
              existingBridge = currBridge;
            }
            existingBridge.nukiDevs.push(devices[j]);
          }
        }

        // Loop on each paired device in the list of each bridge (taking into account
        //  account that some list items may not represent a device paired in Homey)
        for (let i in bridges) {
          let bridge = bridges[i];
          let url = 'http://' + bridge.address + ':' + bridge.port + '/list?token=' + bridge.token;
          let bridgeItems = await this.util.sendCommand(url, 4000);
          if (bridgeItems) {
            for (let j in bridge.nukiDevs) {
              let nukiDev = bridge.nukiDevs[j];
              const device = bridgeItems.find(el => el.nukiId === nukiDev.getSetting('nukiId'));
              switch (device.deviceType) {
                case 0:  // SmartLock
                  nukiDev.updateCapabilitiesValue(device.lastKnownState);
                  break;
                case 2:  // Opener
                  nukiDev.updateCapabilitiesValue(device.lastKnownState);
                  break
              }
            }
          }
        }
      } catch (error) {
        this.log(error);
      }
    }, 300000);
  }

}

module.exports = NukiApp;
