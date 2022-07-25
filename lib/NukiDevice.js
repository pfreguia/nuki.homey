'use strict';

const Homey = require('homey');
const NukiBridge = require('../../lib/NukiBridge.js');
const EventEmitter = require('events');


class NukiDevice extends Homey.Device {
  _progressingAction = 0;
  _progressingActionEvent = new EventEmitter();

  onInit() {
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

    // Add the device to its Nuki Bridge (Nuki Bridges are dinamically managed)
    this.bridge = NukiBridge.addDevice(this);
  }


  onAdded() {
    if (this.bridge.devices.length > 1) {
      this.bridge.forceRefresh();
    }
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


  get progressingAction() {
    return this._progressingAction;
  }


  set progressingAction(action) {
    this._progressingAction = action;
    if (action == 0) {
      this._progressingActionEvent.emit('done');
    }
  }


  // Wait until action in progress
  async progressingActionDone() {
    if (this._progressingAction == 0) {
      return null;
    }
    else {
      return new Promise(resolve => this._progressingActionEvent.once('done', resolve));
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

}


module.exports = NukiDevice;
