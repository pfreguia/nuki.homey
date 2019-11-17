'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class NukiDevice extends Homey.Device {

  onInit() {

    // INITIALLY SET DEVICE AS AVAILABLE
    this.setAvailable();

    // ADD BATTERY ALARM CAPABILITY
    if (!this.hasCapability('alarm_battery')) {
      this.addCapability('alarm_battery');
    }

    // POLLING DEVICE FOR LOCKSTATE AND BATTERYCRITICAL
    this.pollDevice();

    // ADD CALLBACK URL IN NUKI IF NOT SET ALREADY
    setTimeout(this.setCallbackUrl.bind(this), 10000);

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('lockaction', async (value) => {
      if (Number(value) != 0) {
        try {
          let path = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/lockAction?nukiId='+ this.getSetting('nukiId') +'&action='+ value +'&token='+ this.getSetting('token');
          let result = await util.sendCommand(path, 8000);
          if (result.success == true) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          if (error == 400) {
            return Promise.reject(Homey.__('400'));
          } else if (error == 401) {
            return Promise.reject(Homey.__('401'));
          } else if (error == 404) {
            return Promise.reject(Homey.__('404'));
          } else if (error == 503) {
            return Promise.reject(Homey.__('503'));
          } else {
            return Promise.reject(error);
          }
        }
      }
    });

    this.registerCapabilityListener('locked', async (value) => {
      try {
        if (value) {
          var path = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/lockAction?nukiId='+ this.getSetting('nukiId') +'&action=2&token='+ this.getSetting('token');
        } else {
          var path = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/lockAction?nukiId='+ this.getSetting('nukiId') +'&action=1&token='+ this.getSetting('token');
        }
        let result = await util.sendCommand(path, 8000);
        if (result.success == true) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      } catch (error) {
        if (error == 400) {
          return Promise.reject(Homey.__('400'));
        } else if (error == 401) {
          return Promise.reject(Homey.__('401'));
        } else if (error == 404) {
          return Promise.reject(Homey.__('404'));
        } else if (error == 503) {
          return Promise.reject(Homey.__('503'));
        } else {
          return Promise.reject(error);
        }
      }
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let path = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/list?token='+ this.getSetting('token');
        let result = await util.sendCommand(path, 4000);
        if (result) {

          const device = result.find(el => el.nukiId === this.getSetting('nukiId'));

          let state = util.returnLockState(device.lastKnownState.state);
          let locked = util.returnLocked(device.lastKnownState.state);

          // update capability lockstate & trigger lockstateChanged
          if (state != this.getCapabilityValue('lockstate')) {
            this.setCapabilityValue('lockstate', state);
            Homey.ManagerFlow.getCard('trigger', 'lockstateChanged').trigger(this, { lockstate: state }, {});
          }

          // update capability locked
          if (locked != this.getCapabilityValue('locked')) {
            this.setCapabilityValue('locked', locked);
          }

          // update battery alarm capability
          if (this.hasCapability('alarm_battery')) {
            if (device.lastKnownState.batteryCritical == true && (this.getCapabilityValue('alarm_battery') == false || this.getCapabilityValue('alarm_battery') == null)) {
              this.setCapabilityValue('alarm_battery', true);
            } else if (device.lastKnownState.batteryCritical == false && this.getCapabilityValue('alarm_battery') == true) {
              this.setCapabilityValue('alarm_battery', false);
            }
          }

        }
      } catch (error) {
        this.log(error);
      }
    }, 300000);
  }

  async setCallbackUrl() {
    try {
      let homeyaddress = await util.getHomeyIp();
      let callbackUrl = 'http://'+ homeyaddress +'/api/app/nuki.homey/callback/';
      let callbackListPath = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/callback/list?token='+ this.getSetting('token');
      let callbackList = await util.sendCommand(callbackListPath, 4000);
      let callbacks = JSON.stringify(callbackList.callbacks);
      if (!callbacks.includes(encodeURI(callbackUrl))) {
        let callbackAddPath = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/callback/add?url='+ encodeURI(callbackUrl) +'&token='+ this.getSetting('token');
        let result = await util.sendCommand(callbackAddPath, 4000);
        if (result.success != true) {
          setTimeout(this.setCallbackUrl.bind(this), 10000);
        }
      }
    } catch (error) {
      this.log(error);
      setTimeout(this.setCallbackUrl.bind(this), 10000);
    }
  }

}

module.exports = NukiDevice;
