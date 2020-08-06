'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class NukiDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey });

    // INITIALLY SET DEVICE AS AVAILABLE
    this.setAvailable();

    // ADD CALLBACK URL IN NUKI IF NOT SET ALREADY
    setTimeout(this.setCallbackUrl.bind(this), 10000);

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('lockaction', async (value) => {
      if (Number(value) != 0) {
        try {
          let path = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/lockAction?nukiId='+ this.getSetting('nukiId') +'&action='+ value +'&token='+ this.getSetting('token');
          let result = await this.util.sendCommand(path, 8000);
          if (result.success == true) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          if (error == 400) {
            return Promise.reject(this.homey.__('app.400'));
          } else if (error == 401) {
            return Promise.reject(this.homey.__('app.401'));
          } else if (error == 404) {
            return Promise.reject(this.homey.__('app.404'));
          } else if (error == 503) {
            return Promise.reject(this.homey.__('app.503'));
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
        let result = await this.util.sendCommand(path, 8000);
        if (result.success == true) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      } catch (error) {
        if (error == 400) {
          return Promise.reject(this.homey.__('app.400'));
        } else if (error == 401) {
          return Promise.reject(this.homey.__('app.401'));
        } else if (error == 404) {
          return Promise.reject(this.homey.__('app.404'));
        } else if (error == 503) {
          return Promise.reject(this.homey.__('app.503'));
        } else {
          return Promise.reject(error);
        }
      }
    });

  }

  // HELPER FUNCTIONS
  updateCapabilitiesValue(newState) {
    let state = this.util.returnLockState(newState.state);
    let locked = this.util.returnLocked(newState.state);

    // update capability locked
    if (locked != this.getCapabilityValue('locked')) {
      this.setCapabilityValue('locked', locked);
    }

    // update capability lockstate & trigger lockstateChanged
    if (state != this.getCapabilityValue('lockstate')) {
      this.setCapabilityValue('lockstate', state);
      this.homey.flow.getDeviceTriggerCard('lockstateChanged').trigger(this, {lockstate: state}, {});
    }

    // update capability alarm_contact
    if (newState.doorsensorState == 2 || newState.doorsensorState == 3) {
      if (!this.hasCapability('alarm_contact')) {
        this.addCapability('alarm_contact')
      }
      if (newState.doorsensorState == 3 && this.getCapabilityValue('alarm_contact') == false) {
        this.setCapabilityValue('alarm_contact', true);
      } else if (newState.doorsensorState == 2 && (this.getCapabilityValue('alarm_contact') == true || this.getCapabilityValue('alarm_contact') == null)) {
        this.setCapabilityValue('alarm_contact', false);
      }
    }

    // trigger batteryCritical
    if (newState.batteryCritical == true && (this.getCapabilityValue('alarm_battery') == false || this.getCapabilityValue('alarm_battery') == null)) {
      this.setCapabilityValue('alarm_battery', true);
    } else if (newState.batteryCritical == false && this.getCapabilityValue('alarm_battery') == true) {
      this.setCapabilityValue('alarm_battery', false);
    }
  }

  async setCallbackUrl() {
    try {
      let homeyaddress = await this.util.getHomeyIp();
      let callbackUrl = 'http://'+ homeyaddress +'/api/app/nuki.homey/callback/';
      let callbackListPath = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/callback/list?token='+ this.getSetting('token');
      let callbackList = await this.util.sendCommand(callbackListPath, 4000);
      let callbacks = JSON.stringify(callbackList.callbacks);
      if (!callbacks.includes(encodeURI(callbackUrl))) {
        let callbackAddPath = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') +'/callback/add?url='+ encodeURI(callbackUrl) +'&token='+ this.getSetting('token');
        let result = await this.util.sendCommand(callbackAddPath, 4000);
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
