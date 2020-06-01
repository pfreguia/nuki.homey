'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class OpenerDevice extends Homey.Device {

  onInit() {

    // INITIALLY SET DEVICE AS AVAILABLE
    this.setAvailable();

    // ADD CALLBACK URL IN NUKI IF NOT SET ALREADY
    setTimeout(this.setCallbackUrl.bind(this), 10000);

    // LISTENERS FOR UPDATING CAPABILITIES VALUE
    this.registerCapabilityListener('locked', async (value) => {
      try {
        if (value) {
          var path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lock?nukiId=' + this.getSetting('nukiId') + '&deviceType=2&token=' + this.getSetting('token');
        } else {
          var path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lockAction?nukiId=' + this.getSetting('nukiId') + '&deviceType=2&action=1&token=' + this.getSetting('token');
        }
        this.log(path);
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

    this.registerCapabilityListener('continuous_mode', async (value) => {
      try {
        if (value) {
          var path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lockAction?nukiId=' + this.getSetting('nukiId') + '&deviceType=2&action=4&token=' + this.getSetting('token');
        } else {
          var path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lockAction?nukiId=' + this.getSetting('nukiId') + '&deviceType=2&action=5&token=' + this.getSetting('token');
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

  updateCapabilitiesValue(newState) {
    let state;
    let locked;
    let continuous_mode;
    let batteryCritical = newState.batteryCritical;
    switch (newState.state) {
      case 0:
        state = Homey.__('untrained');
        break;
      case 1:
        state = Homey.__('online');
        break;
      case 3:
        state = Homey.__('rto active');
        break;
      case 5:
        state = Homey.__('open');
        break;
      case 7:
        state = Homey.__('opening');
        break;
      case 253:
        state = Homey.__('boot run');
        break;
      default:
        state = Homey.__('undefined');
        break;
    }
    switch (newState.state) {
      case 1:
        locked = newState.mode == 2;
        break;
      default:
        locked = false;
        break;
    }
    //this.log(newState.mode);
    continuous_mode = newState.mode == 3;

    // update capability openerstate & trigger openerstateChanged
    if (state != this.getCapabilityValue('openerstate')) {
      this.setCapabilityValue('openerstate', state);
      Homey.ManagerFlow.getCard('trigger', 'openerstateChanged').trigger(this, { openerstate: state }, {});
    }

    // update capability locked
    if (locked != this.getCapabilityValue('locked')) {
      this.setCapabilityValue('locked', locked);
    }

    // update capability contiuous_mode
    if (continuous_mode != this.getCapabilityValue('continuous_mode')) {
      this.setCapabilityValue('continuous_mode', continuous_mode);
    }

    // update battery alarm capability
    if (this.hasCapability('alarm_battery')) {
      if (batteryCritical == true && (this.getCapabilityValue('alarm_battery') == false || this.getCapabilityValue('alarm_battery') == null)) {
        this.setCapabilityValue('alarm_battery', true);
      } else if (batteryCritical == false && this.getCapabilityValue('alarm_battery') == true) {
        this.setCapabilityValue('alarm_battery', false);
      }
    }
  }

  // HELPER FUNCTIONS
  async setCallbackUrl() {
    try {
      let homeyaddress = await util.getHomeyIp();
      let callbackUrl = 'http://'+ homeyaddress +'/api/app/nuki.homey/callback/';
      let callbackListPath = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/callback/list?token=' + this.getSetting('token');
       this.log(callbackListPath);
      let callbackList = await util.sendCommand(callbackListPath, 4000);
      let callbacks = JSON.stringify(callbackList.callbacks);
      this.log(callbacks);
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

module.exports = OpenerDevice;
