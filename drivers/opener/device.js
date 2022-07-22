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
  _lastRingNukiDateTime = null;
  _lastRingHomeyDateTime = null;
  _openingTimer = null;


  get lastDoorbellRingDateTime() {
    return this._lastRingHomeyDateTime;
  }


  onInit() {
    super.onInit();
    // LISTENERS FOR UPDATING CAPABILITIES VALUE
    this.registerCapabilityListener('locked', async (value, options) => {
      try {
        this.log('Value: ' + (value ? 'Lock' : 'Unlock'));
        if (value) {
          // Lock action.
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if ((this.progressingAction == ACTION_DEACTIVATE_RTO && !this.getCapabilityValue('continuous_mode')) ||
              (this.progressingAction == ACTION_DEACTIVATE_CONTINUOUS_MODE && (this.getCapabilityValue('openerstate') === 1)) ||
              (this.progressingAction == QUICK_ACTION_LOCK)) {
              // An action that leads to Lock state is already in progress.
              this.log('An action that leads to Lock state is already in progress');
              await this.progressingActionDone();
              this.log('Lock action in progress completed');
              return Promise.resolve();
            }
            else {
              return Promise.reject(new Error('A different action is already in progress'));
            }
          }
          const currValue = this.getCapabilityValue('locked');
          if (currValue) {
            // Already locked. No action needed.
            this.log('Already locked. No action needed');
            return Promise.resolve();
          }
          
          this.progressingAction = QUICK_ACTION_LOCK;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendRequest() method is not evaluated.
           await this.bridge.sendRequest('lock', [
            ['nukiId', this.getData().id],
            ['deviceType', 2]
          ], 8000);
          this.log('Lock done');
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
              this.log('An action that leads to Unlock state is already in progress');
              await this.progressingActionDone();
              this.log('Unlock action in progress completed');
              return Promise.resolve();
            }
            else {
              return Promise.reject(new Error('A different action is already in progress'));
            }
          }
          const currValue = this.getCapabilityValue('locked');
          if (!currValue) {
            // Already unlocked. No action needed.
            this.log('Already unlocked. No action needed');
            return Promise.resolve();
          }
          const unlockAction = (unlock_continuous ? ACTION_ACTIVATE_CONTINUOUS_MODE : ACTION_ACTIVATE_RTO);
          this.progressingAction = unlockAction;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendRequest() method is not evaluated.
          await this.bridge.sendRequest('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 2],
            ['action', unlockAction]
          ], 8000);
          this.log('Unlock done');
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
        this.log('Manual open action');
        const currValue = this.getCapabilityValue('open_action');
        if (value === currValue) {
          return Promise.resolve();
        }
        if (value === 1) {
          if (this.progressingAction > 0) {
            // An action is already in progress.
            return Promise.reject(new Error('A different action is already in progress'));
          }
          else {
            this.progressingAction = ACTION_ELECTRIC_STRIKE_ACTUATION;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_ELECTRIC_STRIKE_ACTUATION],
              ['nowait', 1]], 12000);
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
            // Safety timer that can automatically restore the current status 
            //  after a while, if the event from Opener is missed.
            this._openingTimer = setTimeout(() => this._restoreStatusBeforeOpening(prevArg.previous_state), 16000);
            return Promise.resolve();
          }
        }
        else {
          return Promise.reject(new Error('The open action will terminate automaticallly'));
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
        this.log('Continuous mode: ' + (value ? 'Active' : 'Not active'));
        if (value) {
          // Activate Continuous mode.
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if (this.progressingAction == ACTION_ACTIVATE_CONTINUOUS_MODE) {
              // An action that activate Continuosus mode is already in progress.
              this.log('An action that activate Continuosus mode is already in progress');
              await this.progressingActionDone();
              this.log('Continuous mode activation completed');
              return Promise.resolve();
            }
            else {
              return Promise.reject(new Error('A different action is already in progress'));
            }
          }
          this.progressingAction = ACTION_ACTIVATE_CONTINUOUS_MODE;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendRequest() method is not evaluated.
          await this.bridge.sendRequest('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 2],
            ['action', ACTION_ACTIVATE_CONTINUOUS_MODE]
          ], 8000);
          this.log('Continuous mode activated');
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
              this.log('An action that deactivate Continuosus mode is already in progress');
              await this.progressingActionDone();
              this.log('Continuous mode deactivation completed');
              return Promise.resolve();
            }
            else {
              return Promise.reject(new Error('A different action is already in progress'));
            }
          }
          this.progressingAction = ACTION_DEACTIVATE_CONTINUOUS_MODE;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendRequest() method is not evaluated.
          await this.bridge.sendRequest('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 2],
            ['action', ACTION_DEACTIVATE_CONTINUOUS_MODE]
          ], 8000);
          this.log('Continuous mode deactivated');
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


  async openerActionFlowCard(action, what_if_action_in_progress) {
    try {
      this.log(action);
      this.log(what_if_action_in_progress);
      while (this.progressingAction > 0) {
        // An action is already in progress.
        if (action == this.progressingAction) {
          // Same action is already in progress. Just wait for its completion.
          this.log('Same action is already in progress. Just wait for its completion');
          await this.progressingActionDone();
          this.log('Same action completed');
          return Promise.resolve();
        }
        else {
          if (what_if_action_in_progress == 'defer') {
            // A different action is already in progress. Wait for its completion before executing this action.
            this.log('A different action is already in progress. Wait for its completion before excuting this action');
            await this.progressingActionDone();
            // Different action completed. Execute this action, if no other actions are in progress.
            this.log('Different action completed. Execute this action, if no other actions are in progress');


          }
          else {
            // A different action is already in progress. Reject this action.
            this.log('A different action is already in progress. Reject this action');
            return Promise.reject(new Error('A different action is already in progress'));
          }
        }
      }
      switch (action) {
        case ACTION_ACTIVATE_RTO:
          {
            const currValue = this.getCapabilityValue('openerstate');
            this.log(currValue);
            this.log(currValue);
            if (currValue == this.homey.__('device.rto_active')) {
              // Ring to Open already activated. Action does not need to be executed.
              this.log('Ring to Open already activated. Action does not need to be executed');
              return Promise.resolve();
            }
            this.progressingAction = ACTION_ACTIVATE_RTO;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_ACTIVATE_RTO]
            ], 8000);
            this.log('Ring to Open activated');
            await this.setCapabilityValue('openerstate', this.homey.__('device.rto_active'));
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_DEACTIVATE_RTO:
          {
            const currValue = this.getCapabilityValue('openerstate');
            if (currValue == this.homey.__('device.online')) {
              // Ring to Open already deactivated. Action does not need to be executed.
              this.log('Ring to Open already deactivated. Action does not need to be executed');
              return Promise.resolve();
            }
            this.progressingAction = ACTION_DEACTIVATE_RTO;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_DEACTIVATE_RTO]
            ], 8000);
            this.log('Ring to Open deactivated');
            await this.setCapabilityValue('openerstate', this.homey.__('device.online'));
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_ELECTRIC_STRIKE_ACTUATION:
          {
            this.log('Execute Open');
            this.progressingAction = ACTION_ELECTRIC_STRIKE_ACTUATION;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_ELECTRIC_STRIKE_ACTUATION],
              ['nowait', 1]
            ], 12000);
            this.log('Open performed');
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
            // Safety timer that can automatically restore the current status 
            //  after a while, if the event from Opener is missed.
            this._openingTimer = setTimeout(() => this._restoreStatusBeforeOpening(prevArg.previous_state), 16000);
            await this.progressingActionDone();
            return Promise.resolve();
          }
          break;
        case ACTION_ACTIVATE_CONTINUOUS_MODE:
          {
            const currValue = this.getCapabilityValue('continuous_mode');
            if (currValue) {
              // Continuos mode already active. Action does not need to be executed.
              this.log('Continuos mode already active. Action does not need to be executed');
              return Promise.resolve();
            }
            this.progressingAction = ACTION_ACTIVATE_CONTINUOUS_MODE;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_ACTIVATE_CONTINUOUS_MODE]
            ], 8000);
            this.log('Continuous mode activated');
            await this.setCapabilityValue('continuous_mode', true);
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_DEACTIVATE_CONTINUOUS_MODE:
          {
            const currValue = this.getCapabilityValue('continuous_mode');
            if (!currValue) {
              // Continuos mode already deactivated. Action does not need to be executed.
              this.log('Continuos mode already deactivated. Action does not need to be executed');
              return Promise.resolve();
            }
            this.progressingAction = ACTION_DEACTIVATE_CONTINUOUS_MODE;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 2],
              ['action', ACTION_DEACTIVATE_CONTINUOUS_MODE]
            ], 8000);
            this.log('Continuous mode deactivated');
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
    let openerstate;
    // This boolean var is true if the Opener Continuous mode is active; false otherwise.
    let continuousMode;
    // This var contains the Nuki state as meant by Nuki. It is calculated by composing
    // Opener state (var openerstate) and Continuous mode (var continuosMode).
    let nukiState;
    let locked;
    switch (newState.state) {
      case 0:
        openerstate = this.homey.__('device.untrained');
        break;
      case 1:
        openerstate = this.homey.__('device.online');
        break;
      case 3:
        openerstate = this.homey.__('device.rto_active');
        break;
      case 5:
        openerstate = this.homey.__('device.open');
        break;
      case 7:
        openerstate = this.homey.__('device.opening');
        break;
      case 253:
        openerstate = this.homey.__('device.boot_run');
        break;
      default:
        openerstate = this.homey.__('util.undefined');
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
    //  opener_nuki_state_changed and deprecated nuki_state_changed.
    const prevOpenerstate = this.getCapabilityValue('openerstate');
    const prevContinuousMode = this.getCapabilityValue('continuous_mode');

    if (openerstate != prevOpenerstate || continuousMode != prevContinuousMode) {
      let setCapabilityArr = [];
      // Update capability openerstate.
      if (openerstate != prevOpenerstate) {
        if (this._openingTimer) {
          clearTimeout(this._openingTimer);
          this._openingTimer = null;
        }
        if (openerstate == this.homey.__('device.opening')) {
          this.progressingAction = ACTION_ELECTRIC_STRIKE_ACTUATION;
          this.setCapabilityValue('open_action', 1);
        }
        else if (prevOpenerstate == this.homey.__('device.opening')) {
          this.progressingAction = 0;
          this.setCapabilityValue('open_action', 0);
        }
        setCapabilityArr.push(this.setCapabilityValue('openerstate', openerstate));
      }
      // Update capability continuous_mode.
      if (continuousMode != prevContinuousMode) {
        setCapabilityArr.push(this.setCapabilityValue('continuous_mode', continuousMode));
      }
      // Trigger flow cards when the async SetCapabilityValue() function have been completed.
      Promise.all(setCapabilityArr).then(async () => {
        // Trigger opener_nuki_state_changed.
        flow.getDeviceTriggerCard('opener_nuki_state_changed').trigger(this, { previous_state: prevOpenerstate, previous_continuous_mode: prevContinuousMode }, {})
        // Trigger deprecated nuki_state_changed.
        flow.getDeviceTriggerCard('nuki_state_changed').trigger(this, { previous_state: prevOpenerstate }, {})
      })
      // Update capability nuki_state.
      if (continuousMode) {
        nukiState = this.homey.__('device.continuous_mode');
      }
      else {
        nukiState = openerstate;
      }
      this.setCapabilityValue('nuki_state', nukiState);
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
      const newRingDate = new Date(newState.ringactionTimestamp);
      if (this._lastRingNukiDateTime != null) {
        if (this._lastRingNukiDateTime.getTime() !== newRingDate.getTime()) {
          flow.getDeviceTriggerCard('ring_action').trigger(this, {}, {});
          this._lastRingNukiDateTime = newRingDate;
          this._lastRingHomeyDateTime = new Date();
        }
      }
      else {
        flow.getDeviceTriggerCard('ring_action').trigger(this, {}, {});
        this._lastRingNukiDateTime = newRingDate;
        this._lastRingHomeyDateTime = new Date();
      }
    }
  }


  _restoreStatusBeforeOpening(baseState) {
    this.log('restoreStatusBeforeOpening');
    this._openingTimer = null;
    const continuousMode = this.getCapabilityValue('continuous_mode');
    const flow = this.homey.flow;
    // Update capability open_action.
    this.progressingAction = 0;
    this.setCapabilityValue('open_action', 0);
    // Update capability locked.
    const locked = (baseState == this.homey.__('device.online') ? !continuousMode : false);
    if (locked != this.getCapabilityValue('locked')) {
      this.setCapabilityValue('locked', locked);
    }
    // Update capability openerstate and trigger deprecated openerstateChanged flow card.
    this.setCapabilityValue('openerstate', baseState);
    flow.getDeviceTriggerCard('openerstateChanged').trigger(this, { openerstate: baseState }, {});
    // Update capability nuki_state and trigger nuki_state_changed flow card.
    const nukiState = (continuousMode ? this.homey.__('device.continuous_mode') : baseState);
    this.setCapabilityValue('nuki_state', nukiState);
    flow.getDeviceTriggerCard('nuki_state_changed').trigger(this, {
      previous_state: this.homey.__('device.opening'),
      previous_continuous_mode: continuousMode
    }, {});
  }

}

module.exports = OpenerDevice;
