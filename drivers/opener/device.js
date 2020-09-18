'use strict';

const NukiDevice = require('../../lib/NukiDevice.js');

// Actions allowed on an Opener device as defined in Nuki documentation.
const ACTION_ACTIVATE_RTO = 1
const ACTION_DEACTIVATE_RTO = 2
const ACTION_ELECTRIC_STRIKE_ACTUATION = 3
const ACTION_ACTIVATE_CONTINUOUS_MODE = 4
const ACTION_DEACTIVATE_CONTINUOUS_MODE = 5
const QUICK_ACTION_LOCK = 101


class OpenerDevice extends NukiDevice {
  lastRingNukiDatetime = null;
  lastRingHomeyDatetime = null;

  onInit() {
    super.onInit();

    // Initially set device as available.
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES VALUE
    this.registerCapabilityListener('locked', async (value, options) => {
      try {
        console.log('Value: ' + (value ? 'Lock' : 'Unlock'));
        console.log(options);
        if (value) {
          // Lock action.
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if ((this.progressingAction == ACTION_DEACTIVATE_RTO && !this.getCapabilityValue('continuous_mode')) ||
              (this.progressingAction == ACTION_DEACTIVATE_CONTINUOUS_MODE && (this.getCapabilityValue('openerstate') === 1)) ||
              (this.progressingAction == QUICK_ACTION_LOCK)) {
              // An action that leads to Lock state is already in progress.
              console.log('An action that leads to Lock state is already in progress');
              await this.progressingActionDone();
              console.log('Lock action in progress completed');
              return Promise.resolve();
            }
            else {
              return Promise.reject(new Error('Action in progress. Please wait'));
            }
          }
          const currValue = this.getCapabilityValue('locked');
          if (currValue) {
            // Already locked. No action needed.
            console.log('Already locked. No action needed');
            return Promise.resolve();
          }
          const url = this.buildURL('lock', [
            ['nukiId', this.getData().id],
            ['deviceType', 2]
          ]);
          this.progressingAction = QUICK_ACTION_LOCK;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendCommand() method is not evaluated.
          await this.util.sendCommand(url, 8000);
          console.log('Lock done');
          this.progressingAction = 0;
          return Promise.resolve();
        }
        else {
          // Unlock action.
          const unlock_continuous = this.getSetting('unlock_duration') == 'continuous_mode';
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if ((unlock_continuous && this.progressingAction == ACTION_ACTIVATE_CONTINUOUS_MODE) ||
              (!unlock_continuous && this.progressingAction == ACTION_ACTIVATE_RTO)) {
              // An action that leads to Unlock state is already in progress.
              console.log('An action that leads to Unlock state is already in progress');
              await this.progressingActionDone();
              console.log('Unlock action in progress completed');
              return Promise.resolve();
            }
            else {
              return Promise.reject(new Error('Action in progress. Please wait'));
            }
          }
          const currValue = this.getCapabilityValue('locked');
          if (!currValue) {
            // Already unlocked. No action needed.
            console.log('Already unlocked. No action needed');
            return Promise.resolve();
          }
          const unlockAction = (unlock_continuous ? ACTION_ACTIVATE_CONTINUOUS_MODE : ACTION_ACTIVATE_RTO);
          const url = this.buildURL('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 2],
            ['action', unlockAction]
          ]);
          this.progressingAction = unlockAction;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendCommand() method is not evaluated.
          await this.util.sendCommand(url, 8000);
          console.log('Unlock done');
          this.progressingAction = 0;
          return Promise.resolve();
        }
      } catch (error) {
        this.progressingAction = 0;
        return Promise.reject(error);
      }
    });

    this.registerCapabilityListener('open_action', async (value) => {
      try {
        console.log('manual');
        const currValue = this.getCapabilityValue('open_action');
        if (value === currValue) {
          return Promise.resolve();
        }
        if (value === 1) {
          if (this.progressingAction > 0) {
            // An action is already in progress.
            return Promise.reject(new Error('Action in progress. Please wait'));
          }
          else {
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_ELECTRIC_STRIKE_ACTUATION],
              ['nowait', 1]]);
            this.progressingAction = ACTION_ELECTRIC_STRIKE_ACTUATION;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 8000);
            // Update capabilties and trigger action flows.
            const flow = this.homey.flow;
            const openingStr = this.homey.__('device.opening');
            const prevArg = {
              previous_state: this.getCapabilityValue('openerstate'),
              previous_continuous_mode: this.getCapabilityValue('continuous_mode')
            };
            this.setCapabilityValue('nuki_state', openingStr);
            this.setCapabilityValue('openerstate', openingStr);
            this.setCapabilityValue('locked', false);
            flow.getDeviceTriggerCard('nuki_state_changed').trigger(this, prevArg, {});
            flow.getDeviceTriggerCard('openerstateChanged').trigger(this, { openerstate: openingStr }, {});
            return Promise.resolve();
          }
        }
        else {
          return Promise.reject(new Error('Action in progress. Please wait'));
        }
      }
      catch (error) {
        this.progressingAction = 0;
        return Promise.reject(error);
      }
    });

    this.registerCapabilityListener('continuous_mode', async (value) => {
      // Note: continuous_mode is no longer "setable" by UI thus this listener can be removed.
      try {
        const currValue = this.getCapabilityValue('continuous_mode');
        if (value === currValue) {
          return Promise.resolve();
        }
        console.log('Continuous mode: ' + (value ? 'Active' : 'Not active'));
        if (value) {
          // Activate Continuous mode.
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if (this.progressingAction == ACTION_ACTIVATE_CONTINUOUS_MODE) {
              // An action that activate Continuosus mode is already in progress.
              console.log('An action that activate Continuosus mode is already in progress');
              await this.progressingActionDone();
              console.log('Continuous mode activation completed');
              return Promise.resolve();
            }
            else {
              return Promise.reject(new Error('Action in progress. Please wait'));
            }
          }
          const url = this.buildURL('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 2],
            ['action', ACTION_ACTIVATE_CONTINUOUS_MODE]
          ]);
          this.progressingAction = ACTION_ACTIVATE_CONTINUOUS_MODE;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendCommand() method is not evaluated.
          await this.util.sendCommand(url, 8000);
          console.log('Continuous mode activated');
          this.progressingAction = 0;
          return Promise.resolve();
        }
        else {
          // Deactivate Continuous mode.
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if (this.progressingAction == ACTION_DEACTIVATE_CONTINUOUS_MODE ||
              this.progressingAction == QUICK_ACTION_LOCK) {
              // An action that deactivate Continuosus mode is already in progress.
              console.log('An action that deactivate Continuosus mode is already in progress');
              await this.progressingActionDone();
              console.log('Continuous mode deactivation completed');
              return Promise.resolve();
            }
            else {
              return Promise.reject(new Error('Action in progress. Please wait'));
            }
          }
          const url = this.buildURL('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 2],
            ['action', ACTION_DEACTIVATE_CONTINUOUS_MODE]
          ]);
          this.progressingAction = ACTION_DEACTIVATE_CONTINUOUS_MODE;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendCommand() method is not evaluated.
          await this.util.sendCommand(url, 8000);
          console.log('Continuous mode deactivated');
          this.progressingAction = 0;
          return Promise.resolve();
        }
      } catch (error) {
        this.progressingAction = 0;
        return Promise.reject(error);
      }
    });
  }

  async onSettings(settings) {
    super.onSettings(settings);
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


  async openerActionFlowCard(action, state) {
    try {
      console.log(action);
      switch (action) {
        case ACTION_ACTIVATE_RTO:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_ACTIVATE_RTO) {
                // Ring to Open activation action is already in progress.
                console.log('Ring to Open activation action is already in progress');
                await this.progressingActionDone();
                console.log('Ring to Open activation action completed');
                return Promise.resolve();
              }
              else {
                console.log('An action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Action completed. Resume');
              }
            }
            const currValue = this.getCapabilityValue('openerstate');
            if (currValue == this.homey.__('device.rto_acive')) {
              // Ring to Open already activated. No action needed.
              console.log('Ring to Open already activated. No action needed');
              return Promise.resolve();
            }
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_ACTIVATE_RTO]
            ]);
            this.progressingAction = ACTION_ACTIVATE_RTO;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 8000);
            console.log('Ring to Open activated');
            await this.setCapabilityValue('openerstate', this.homey.__('device.rto_active'));
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_DEACTIVATE_RTO:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_DEACTIVATE_RTO) {
                // Ring to Open deactivation action is already in progress.
                console.log('Ring to Open deactivation action is already in progress');
                await this.progressingActionDone();
                console.log('Ring to Open deactivation action completed');
                return Promise.resolve();
              }
              else {
                console.log('An action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Action completed. Resume');
              }
            }
            const currValue = this.getCapabilityValue('openerstate');
            if (currValue == this.homey.__('device.online')) {
              // Ring to Open already deactivated. No action needed.
              console.log('Ring to Open already deactivated. No action needed');
              return Promise.resolve();
            }
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_DEACTIVATE_RTO]
            ]);
            this.progressingAction = ACTION_DEACTIVATE_RTO;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 8000);
            console.log('Ring to Open deactivated');
            await this.setCapabilityValue('openerstate', this.homey.__('device.online'));
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_ELECTRIC_STRIKE_ACTUATION:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_ELECTRIC_STRIKE_ACTUATION) {
                // An Open action is already in progress.
                console.log('An Open action is already in progress');
                await this.progressingActionDone();
                console.log('Open action completed');
                return Promise.resolve();
              }
              else {
                console.log('An action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Action completed. Resume');
              }
            }
            console.log('Perform Open');
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_ELECTRIC_STRIKE_ACTUATION],
              ['nowait', 1]
            ]);
            this.progressingAction = ACTION_ELECTRIC_STRIKE_ACTUATION;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 32000);
            console.log('Open performed');
            // Update capabilties and trigger action flows.
            const flow = this.homey.flow;
            const openingStr = this.homey.__('device.opening');
            const prevArg = {
              previous_state: this.getCapabilityValue('openerstate'),
              previous_continuous_mode: this.getCapabilityValue('continuous_mode')
            };
            this.setCapabilityValue('open_action', 1);
            this.setCapabilityValue('nuki_state', openingStr);
            this.setCapabilityValue('openerstate', openingStr);
            this.setCapabilityValue('locked', false);
            flow.getDeviceTriggerCard('nuki_state_changed').trigger(this, prevArg, {});
            flow.getDeviceTriggerCard('openerstateChanged').trigger(this, { openerstate: openingStr }, {});
            await this.progressingActionDone();
            return Promise.resolve();
          }
          break;
        case ACTION_ACTIVATE_CONTINUOUS_MODE:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_ACTIVATE_CONTINUOUS_MODE) {
                // A Continuosus mode activation action is already in progress.
                console.log('A Continuosus mode activation action is already in progress');
                await this.progressingActionDone();
                console.log('Continuous mode activation completed');
                return Promise.resolve();
              }
              else {
                console.log('An action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Action completed. Resume');
              }
            }
            const currValue = this.getCapabilityValue('continuous_mode');
            if (currValue) {
              // Continuos mode already active. No action needed.
              console.log('Continuos mode already active. No action needed');
              return Promise.resolve();
            }
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_ACTIVATE_CONTINUOUS_MODE]
            ]);
            this.progressingAction = ACTION_ACTIVATE_CONTINUOUS_MODE;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 8000);
            console.log('Continuous mode activated');
            await this.setCapabilityValue('continuous_mode', true);
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_DEACTIVATE_CONTINUOUS_MODE:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_DEACTIVATE_CONTINUOUS_MODE) {
                // A Continuosus mode deactivation action is already in progress.
                console.log('A Continuosus mode deactivation action is already in progress');
                await this.progressingActionDone();
                console.log('Continuous mode deactivation completed');
                return Promise.resolve();
              }
              else {
                console.log('An action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Action completed. Resume');
              }
            }
            const currValue = this.getCapabilityValue('continuous_mode');
            if (!currValue) {
              // Continuos mode already deactivated. No action needed.
              console.log('Continuos mode already deactivated. No action needed');
              return Promise.resolve();
            }
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_DEACTIVATE_CONTINUOUS_MODE]
            ]);
            this.progressingAction = ACTION_DEACTIVATE_CONTINUOUS_MODE;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 8000);
            console.log('Continuous mode deactivated');
            await this.setCapabilityValue('continuous_mode', false);
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
      }
    } catch (error) {
        this.progressingAction = 0;
      return Promise.reject(error);
    }
  }

  // HELPER FUNCTIONS
  updateCapabilitiesValue(newState) {
    super.updateCapabilitiesValue(newState);
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
        if (state == this.homey.__('device.opening')) {
          this.progressingAction = ACTION_ELECTRIC_STRIKE_ACTUATION;
          this.setCapabilityValue('open_action', 1);
        }
        else if (prevState == this.homey.__('device.opening')) {
          this.progressingAction = 0;
          this.setCapabilityValue('open_action', 0);
        }
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
