'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class NukiDevice extends Homey.Device {
  inBridgeTransaction = false;

  onInit() {
    if (!this.util) { 
      this.util = new Util({ homey: this.homey });
    }
    // Migration from version <= 3.0.2.
    if (!this.hasCapability('nuki_state')) {
      this.addCapability('nuki_state');
    }
    // Migration from version <= 3.0.3.
    const open_action_visible_setting = this.getSettings('open_action_visible');
    if (open_action_visible_setting !== null) {
      if (open_action_visible_setting) {
        if (!this.hasCapability('open_action'))
          this.addCapability('open_action');
        this.setCapabilityValue('open_action', 0);
      }
      else {
        if (this.hasCapability('open_action')) {
          this.removeCapability('open_action');
        }
      }
    } 
    this.homey.flow.getConditionCard('alarm_battery_keypad')
      .registerRunListener(async (args, state) => {
        if (this.hasCapability('alarm_battery_keypad')) {
          return args.device.getCapabilityValue('alarm_battery_keypad');
        }
        else {
          return false;
        }
      })
  }


  onAdded() {
    this.setCallbackUrl.bind(this);
  }


  async onSettings(settings) {
    if (settings.changedKeys.includes('open_action_visible')) {
      if (settings.newSettings.open_action_visible) {
        if (!this.hasCapability('open_action'))
          this.addCapability('open_action');
          this.setCapabilityValue('open_action', 0);
      }
      else {
        if (this.hasCapability('open_action')) {
          this.removeCapability('open_action');
        }
      }
    }
  }


  updateCapabilitiesValue(newState) {
    // Dynamic handling of alarm_battery_keypad capability.
    if (newState.keypadBatteryCritical == undefined) {
      if (this.hasCapability('alarm_battery_keypad')) {
        this.removeCapability('alarm_battery_keypad');
      }
    }
    else {
      let capabilityValueChanged = false;
      if (!this.hasCapability('alarm_battery_keypad')) {
        this.addCapability('alarm_battery_keypad');
        capabilityValueChanged = true;
      }
      else {
        if (newState.keypadBatteryCritical != this.getCapabilityValue('alarm_battery_keypad')) {
          capabilityValueChanged = True;
        }
      }
      if (capabilityValueChanged) {
        this.setCapabilityValue('alarm_battery_keypad', newState.keypadBatteryCritical);
        flow.getDeviceTriggerCard('alarm_battery_keypad').trigger(this, {}, {});
      }
    }
  }

    async setCallbackUrl() {
    try {
      let homeyaddress = await this.util.getHomeyIp();
      let callbackUrl = 'http://' + homeyaddress + '/api/app/nuki.homey/callback/';
      let callbackListPath = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/callback/list?token=' + this.getSetting('token');
      let callbackList = await this.util.sendCommand(callbackListPath, 4000);
      let callbacks = JSON.stringify(callbackList.callbacks);
      if (!callbacks.includes(encodeURI(callbackUrl))) {
        let callbackAddPath = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/callback/add?url=' + encodeURI(callbackUrl) + '&token=' + this.getSetting('token');
        let result = await this.util.sendCommand(callbackAddPath, 4000);
      }
    } catch (error) {
      this.log(error);
    }
  }

  buildURL(path, searchParams) {
    const base = 'http://' + this.getSetting('address') + ':' + this.getSetting('port');
    const aURL = new URL(path, base);
    if (searchParams) {
      for (let pair of searchParams) {
        aURL.searchParams.append(pair[0], pair[1]);
      }
    }
    aURL.searchParams.append('token', this.getSetting('token'));
    return aURL.toString();
  }
}

module.exports = NukiDevice;
