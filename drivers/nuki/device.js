'use strict';

const NukiDevice = require('../../lib/NukiDevice.js');
const Util = require('/lib/util.js');

class SmartLockDevice extends NukiDevice {

  onInit() {
    super.onInit();

    // Migration from version <= 3.0.0.
    if (this.hasCapability('alarm_battery')) {
      this.removeCapability('alarm_battery');
    }
    if (!this.hasCapability('measure_battery')) {
      this.addCapability('measure_battery');
    }
    if (!this.hasCapability('alarm_contact')) {
      this.addCapability('alarm_contact');
    }
    // Initially set device as available.
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('lockaction', async (value) => {
      if (Number(value) != 0) {
        try {
          let path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lockAction?nukiId=' + this.getData().id +'&action='+ value +'&token='+ this.getSetting('token');
          let result = await this.util.sendCommand(path, 8000);
          if (result.success == true) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
    });

    this.registerCapabilityListener('locked', async (value) => {
      try {
        if (value) {
          var path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lockAction?nukiId=' + this.getData().id +'&action=2&token='+ this.getSetting('token');
        } else {
          var path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lockAction?nukiId=' + this.getData().id +'&action=1&token='+ this.getSetting('token');
        }
        let result = await this.util.sendCommand(path, 8000);
        if (result.success == true) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });

    this.registerCapabilityListener('open_action', async (value) => {
      try {
        const currValue = this.getCapabilityValue('open_action');
        if (value === currValue) {
          return Promise.resolve();
        }
        if (value === 1) {
          if (this.inBridgeTransaction) {
            return Promise.reject(new Error('Action in progress. Please wait'));
          }
          const url = this.buildURL('lockAction', [['nukiId', this.getData().id], ['deviceType', 0], ['action', 3], ['nowait', 1]]);
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendCommand() method is not evaluated.
          this.inBridgeTransaction = true;
          await this.util.sendCommand(url, 18000);
          this.inBridgeTransaction = false;
          // Update capabilties and trigger action flows.
          const flow = this.homey.flow;
          const unlatchingStr = this.homey.__('util.unlatching');
          const prevArg = {
            previous_state: this.getCapabilityValue('lockstate'),
          };
          this.setCapabilityValue('nuki_state', unlatchingStr);
          this.setCapabilityValue('lockstate', unlatchingStr);
          this.setCapabilityValue('locked', false);
          flow.getDeviceTriggerCard('nuki_state_changed').trigger(this, prevArg, {});
          flow.getDeviceTriggerCard('lockstateChanged').trigger(this, { lockstate: unlatchingStr }, {});
          return Promise.resolve();
        }
        else {
          return Promise.reject(new Error('Action in progress. Please wait'));
        }
      }
      catch (error) {
        this.inBridgeTransaction = false;
        return Promise.reject(error);
      }
    });

  }

  // HELPER FUNCTIONS
  updateCapabilitiesValue(newState) {
    super.updateCapabilitiesValue(newState);
    let state; 
    let nukiState;
    let locked;

    switch (newState.state) {
      case 0:
        state = this.homey.__('util.uncalibrated');
        break;
      case 1:
        state = this.homey.__('util.locked');
        break;
      case 2:
        state = this.homey.__('util.unlocking');
        break;
      case 3:
        state = this.homey.__('util.unlocked');
        break;
      case 4:
        state = this.homey.__('util.locking');
        break;
      case 5:
        state = this.homey.__('util.unlatched');
        break;
      case 6:
        state = this.homey.__('util.unlocked_go');
        break;
      case 7:
        state = this.homey.__('util.unlatching');
        break;
      case 254:
        state = this.homey.__('util.motor_blocked');
        break;
      default:
        state = this.homey.__('util.undefined');
        break;
    }
    switch (newState.state) {
      case 1:
        locked = true;
        break;
      default:
        locked = false;
        break;
    }

    const flow = this.homey.flow;
    const prevState = this.getCapabilityValue('lockstate');
    // update capability locked
    if (locked != this.getCapabilityValue('locked')) {
      this.setCapabilityValue('locked', locked);
    }

    // update capability lockstate & trigger deprecated lockstateChanged
    if (state != this.getCapabilityValue('lockstate')) {
      this.setCapabilityValue('open_action', state === this.homey.__('util.unlatching') ? 1 : 0);
      this.setCapabilityValue('lockstate', state);
      flow.getDeviceTriggerCard('lockstateChanged').trigger(this, {lockstate: state}, {});
    }
    // Update capability nuki_state. 
    nukiState = state;
    if (state != this.getCapabilityValue('nuki_state')) {
      this.setCapabilityValue('nuki_state', nukiState);
      // Trigger nuki_state_changed.
      flow.getDeviceTriggerCard('nuki_state_changed').trigger(this, { previous_state: prevState }, {});
    }

    // Update capability alarm_contact.
    if (newState.doorsensorState == 2 || newState.doorsensorState == 3) {
      if (newState.doorsensorState == 3 && !this.getCapabilityValue('alarm_contact')) {
        this.setCapabilityValue('alarm_contact', true);
      } else if (newState.doorsensorState == 2 && (this.getCapabilityValue('alarm_contact') || this.getCapabilityValue('alarm_contact') == null)) {
        this.setCapabilityValue('alarm_contact', false);
      }
    }

    // update capability measure_battery
    if (Number(newState.batteryChargeState) != this.getCapabilityValue('measure_battery')) {
      this.setCapabilityValue('measure_battery', Number(newState.batteryChargeState));
    }
  }
}

module.exports = SmartLockDevice;
