'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class NukiApp extends Homey.App {

  onInit() {
    this.log('Initializing Nuki app ...');

    if (!this.util) this.util = new Util({homey: this.homey});

    // POLLING DEVICES FOR STATE
    this.pollDevices();

    // FLOW CARDS
    // Nuki Lock
    this.homey.flow.getActionCard('lockAction')
      .registerRunListener(async (args) => {
        try {
          let path = 'http://' + args.device.getSetting('address') + ':' + args.device.getSetting('port') + '/lockAction?nukiId=' + args.device.getData().id +'&action='+ args.lockaction +'&token='+ args.device.getSetting('token');
          let result = await this.util.sendCommand(path, 8000);
          if (result.success == true) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    // Nuki Opener
    this.homey.flow.getActionCard('openerAction')
      .registerRunListener(async (args, state) => {
        try {
          let path = 'http://' + args.device.getSetting('address') + ':' + args.device.getSetting('port') + '/lockAction?nukiId=' + args.device.getData().id + '&deviceType=2&action=' + args.openeraction + '&token=' + args.device.getSetting('token');
          let result = await this.util.sendCommand(path, 8000);
          if (result.success == true) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })
    this.homey.flow.getConditionCard('continuous_mode')
      .registerRunListener(async (args, state) => {
        return args.device.getCapabilityValue('continuous_mode');
      })
    this.homey.flow.getConditionCard('ring_condition')
      .registerRunListener(async (args, state) => {
        if (!args.elapsed_secs) {
          return false;
        }
        const lastRingDatetime = args.device.lastRingHomeyDatetime;
        if (!lastRingDatetime) {
          return false;
        }
        const now = new Date();
        return (now - lastRingDatetime) / 1000 < args.elapsed_secs;
      })
  }

  pollDevices() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        const isSameBridge = function (b) {
          return b.address == this.address && b.port == this.port
        };
        const drivers = this.homey.drivers.getDrivers();
        let bridges = [];

        for (let i in drivers) {
          let devices = drivers[i].getDevices();
          for (let j in devices) {
            const currBridge = {
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
        //  that some list items may not represent a device paired in Homey)
        for (let bridge of bridges) {
          const url = 'http://' + bridge.address + ':' + bridge.port + '/list?token=' + bridge.token;
          await this.util.sendCommand(url, 4000)
            .then(bridgeItems => {
              for (let nukiDev of bridge.nukiDevs) {
                const device = bridgeItems.find(el => el.nukiId === nukiDev.getData().id);
                if (!nukiDev.getAvailable()) {
                  nukiDev.setAvailable(); }
                switch (device.deviceType) {
                  case 0:  // SmartLock
                    nukiDev.updateCapabilitiesValue(device.lastKnownState);
                    break;
                  case 2:  // Opener
                    nukiDev.updateCapabilitiesValue(device.lastKnownState);
                    break
                }
              }
            })
            .catch(error => {
              if (error != 503) {
                for (let nukiDev of bridge.nukiDevs) {
                  nukiDev.setUnavailable(this.homey.__('app.unreachable'));
                }
              }
            })
        }
      } catch (error) {
        this.log(error);
      }
    }, 300000);
  }

}

module.exports = NukiApp;
