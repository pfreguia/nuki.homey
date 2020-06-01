"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class NukiApp extends Homey.App {

  onInit() {
    this.log('Initializing Nuki app ...');

    // POLLING DEVICES FOR STATE
    this.pollDevices();

    /* DEPRECATED - USING DEFAULT CONDITION CARD FOR LOCKED CAPABILITY INSTEAD */
    new Homey.FlowCardCondition('isLocked')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getCapabilityValue('locked')) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    new Homey.FlowCardAction('lockAction')
      .register()
      .registerRunListener(async (args, state) => {
        try {
          let path = 'http://'+ args.device.getSetting('address') +':'+ args.device.getSetting('port') +'/lockAction?nukiId='+ args.device.getSetting('nukiId') +'&action='+ args.lockaction +'&token='+ args.device.getSetting('token');
          let result = await util.sendCommand(path, 8000);
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
        let drivers = Homey.ManagerDrivers.getDrivers();
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
          let bridgeItems = await util.sendCommand(url, 4000);
          if (bridgeItems) {
            for (let j in bridge.nukiDevs) {
              let nukiDev = bridge.nukiDevs[j];
              const device = bridgeItems.find(el => el.nukiId === nukiDev.getSetting('nukiId'));
              switch (device.deviceType) {
                case 0:  // SmartLock
                  let state = util.returnLockState(device.lastKnownState.state);
                  let locked = util.returnLocked(device.lastKnownState.state);

                  // update capability lockstate & trigger lockstateChanged
                  if (state != nukiDev.getCapabilityValue('lockstate')) {
                    nukiDev.setCapabilityValue('lockstate', state);
                    Homey.ManagerFlow.getCard('trigger', 'lockstateChanged').trigger(nukiDev, { lockstate: state }, {});
                  }

                  // update capability locked
                  if (locked != nukiDev.getCapabilityValue('locked')) {
                    nukiDev.setCapabilityValue('locked', locked);
                  }

                  // update battery alarm capability
                  if (nukiDev.hasCapability('alarm_battery')) {
                    if (device.lastKnownState.batteryCritical == true && (nukiDev.getCapabilityValue('alarm_battery') == false || nukiDev.getCapabilityValue('alarm_battery') == null)) {
                      nukiDev.setCapabilityValue('alarm_battery', true);
                    } else if (device.lastKnownState.batteryCritical == false && nukiDev.getCapabilityValue('alarm_battery') == true) {
                      nukiDev.setCapabilityValue('alarm_battery', false);
                    }
                  }
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
