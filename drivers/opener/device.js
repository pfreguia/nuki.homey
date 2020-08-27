'use strict';

const NukiDevice = require('../../lib/NukiDevice.js');
const Util = require('/lib/util.js');

class OpenerDevice extends NukiDevice {
  lastRingNukiDatetime = null;
  lastRingHomeyDatetime = null;

  onInit() {
    if (!this.util) this.util = new Util({ homey: this.homey });
    // Migration from version <= 3.0.2.
    if (!this.hasCapability('nuki_state')) {
      this.addCapability('nuki_state');
    }
    // Initially set device as available.
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES VALUE
    this.registerCapabilityListener('locked', async (value) => {
      try {
        let path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/';
        if (value) {
          path = path + 'lock?nukiId=' + this.getData().id + '&deviceType=2&token=' + this.getSetting('token');
        } else {
          if (this.getSetting('unlock_duration') == 'continuous_mode') {
            path = path + 'lockAction?nukiId=' + this.getData().id + '&deviceType=2&action=4&token=' + this.getSetting('token');
          }
          else {
            path = path + 'lockAction?nukiId=' + this.getData().id + '&deviceType=2&action=1&token=' + this.getSetting('token');
          }
        }
        this.log(path);
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

    this.registerCapabilityListener('continuous_mode', async (value) => {
      try {
        let path;
        if (value) {
          path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lockAction?nukiId=' + this.getData().id + '&deviceType=2&action=4&token=' + this.getSetting('token');
        } else {
          path = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/lockAction?nukiId=' + this.getData().id + '&deviceType=2&action=5&token=' + this.getSetting('token');
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

  async onSettings(settings) {
    if (settings.changedKeys.includes('battery')) {
      let energyObj;
      if (settings.newSettings.battery) {
        if (!this.hasCapability('alarm_battery'))
          this.addCapability('alarm_battery');
        energyObj = {
          batteries: ["AAA", "AAA", "AAA", "AAA"]
        }
      }
      else {
        if (this.hasCapability('alarm_battery'))
          this.removeCapability('alarm_battery');
        energyObj = {
          "approximation": {
            "usageConstant": 0.8
          }
        }
      }
      this.setEnergy(energyObj);
    }
  }

  // HELPER FUNCTIONS
  updateCapabilitiesValue(newState) {
    // This var contains the mere Opener state as defined in Nuki documentation
    //  (https://developer.nuki.io/page/nuki-bridge-http-api-1-11/4#heading--lock-states).
    let state;
    // This var contains the Nuki state as meant by Nuki. It is composed by mere Opener
    //  state an Continuous Mode state.
    let nukiState;
    let locked;
    let continuousMode;
    switch (newState.state) {
      case 0:
        state = this.homey.__('device.untrained');
        break;
      case 1:
        state = this.homey.__('device.online');
        break;
      case 3:
        state = this.homey.__('device.rto_active');
        break;
      case 5:
        state = this.homey.__('device.open');
        break;
      case 7:
        state = this.homey.__('device.opening');
        break;
      case 253:
        state = this.homey.__('device.boot_run');
        break;
      default:
        state = this.homey.__('util.undefined');
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
    continuousMode = newState.mode == 3;

    const flow = this.homey.flow;
    // Update capabilities openerstate, continuous_mode and nuki_state; trigger
    //  nuki_state_changed, deprecated openerstateChanged and deprecated
    //  continuos_mode_xxxx.
    const prevState = this.getCapabilityValue('openerstate');
    const prevContinuousMode = this.getCapabilityValue('continuous_mode');

    if (state != prevState || continuousMode != prevContinuousMode) {
      // Update capability openerstate; trigger deprecated openerStateChanged.
      if (state != prevState) {
        this.setCapabilityValue('openerstate', state);
        flow.getDeviceTriggerCard('openerstateChanged').trigger(this, { openerstate: state }, {});
      }
      // Update capability contiuous_mode; trigger deprecated continuos_mode_xxxx.
      if (continuousMode != this.getCapabilityValue('continuous_mode')) {
        this.setCapabilityValue('continuous_mode', continuousMode);
        if (continuousMode) {
          flow.getDeviceTriggerCard('continuous_mode_true').trigger(this, {}, {});
        } else {
          flow.getDeviceTriggerCard('continuous_mode_false').trigger(this, {}, {});
        }
      }
      // Update capability nuki_state.
      if (continuousMode) {
        nukiState = this.homey.__('device.continuous_mode');
      }
      else {
        nukiState = state;
      }
      this.setCapabilityValue('nuki_state', nukiState);
      // Trigger nuki_state_changed.
      flow.getDeviceTriggerCard('nuki_state_changed').trigger(this, { previous_state: prevState, previous_continuous_mode: prevContinuousMode }, {});
    }
    // Update capability locked
    if (locked != this.getCapabilityValue('locked')) {
      this.setCapabilityValue('locked', locked);
    }

    // Update capability alarm_battery.
    if (this.hasCapability('alarm_battery')) {
      const batteryCritical = newState.batteryCritical;
      if (batteryCritical == true && (this.getCapabilityValue('alarm_battery') == false || this.getCapabilityValue('alarm_battery') == null)) {
        this.setCapabilityValue('alarm_battery', true);
      } else if (batteryCritical == false && this.getCapabilityValue('alarm_battery') == true) {
        this.setCapabilityValue('alarm_battery', false);
      }
    }

    // Trigger ring_action.
    if (newState.ringactionState) {
      let newRingDate = new Date(newState.ringactionTimestamp);
      if (this.lastRingNukiDatetime != null) {
        if (this.lastRingNukiDatetime.getTime() !== newRingDate.getTime()) {
          flow.getDeviceTriggerCard('ring_action').trigger(this, {}, {});
          this.lastRingNukiDatetime = newRingDate;
          this.lastRingHomeyDatetime = new Date();
        }
      }
      else {
        flow.getDeviceTriggerCard('ring_action').trigger(this, {}, {});
        this.lastRingNukiDatetime = newRingDate;
        this.lastRingHomeyDatetime = new Date();
      }
    }
  }

}

module.exports = OpenerDevice;
