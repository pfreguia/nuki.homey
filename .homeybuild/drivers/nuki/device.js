'use strict';

const NukiDevice = require('../../lib/NukiDevice.js');
const EventEmitter = require('events');

// Actions allowed on an Opener device as defined in Nuki documentation.
const ACTION_UNLOCK = 1
const ACTION_LOCK = 2
const ACTION_UNLATCH = 3
const ACTION_LOCK_N_GO = 4
const ACTION_LOCK_N_GO_WITH_UNLATCH = 5

class SmartLockDevice extends NukiDevice {
  _lastContactAlarmChangeDateTime = null;
  _unlockStateEvent = new EventEmitter();
  _openingTimer = null;


  get lastContactAlarmChangeDateTime () {
    return this._lastContactAlarmChangeDateTime;
  }


  onInit () {
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

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('locked', async (value) => {
      try {
        const currValue = this.getCapabilityValue('locked');
        if (value === currValue) {
          return Promise.resolve();
        }
        this.log('Value: ' + (value ? 'Lock' : 'Unlock'));
        if (value) {
          // Lock action.
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if (this.progressingAction == ACTION_LOCK) {
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
          this.progressingAction = ACTION_LOCK;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendRequest() method is not evaluated.
          await this.bridge.sendRequest('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 0],
            ['action', ACTION_LOCK]
          ], 16000);
          this.log('Lock done');
          this.progressingAction = 0;
          return Promise.resolve();
        }
        else {
          let action = ACTION_UNLOCK;

          const open_action_visible_setting = this.getSettings('open_action_visible');
          if (open_action_visible_setting !== null) {
            if (open_action_visible_setting) {
              action = ACTION_UNLATCH;
            }
          }
          // Unlock action.
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if (this.progressingAction == action) {
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
          this.progressingAction = action;
          // It seems that, even if result.success is false, the action is
          //  performed correctly by Nuki. For that resons the "result" object
          //  of sendRequest() method is not evaluated.
          await this.bridge.sendRequest('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 0],
            ['action', action]
          ], 16000);
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
        const open_action_visible_setting = this.getSettings('open_action_visible');

        if (value === currValue) {
          return Promise.resolve();
        }
        if (value === true) {
          if (this.progressingAction > 0) {
            // An action is already in progress.
            return Promise.reject(new Error('A different action is already in progress'));
          }
          else {
            this.progressingAction = ACTION_UNLATCH;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendrequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_UNLATCH],
              ['nowait', 1]
            ], 16000);
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
            // Safety timer that can automatically restore the current status
            //  after a while, if the event from Opener is missed.
            this._openingTimer = setTimeout(() => this._restoreStatusBeforeOpening(prevArg.previous_state), 24000);
            return Promise.resolve();
          }
        }
        else {
          return Promise.reject(new Error('The open action will terminate automatically'));
        }
      }
      catch (error) {
        this._progressingAction = 0;
        return Promise.reject(error);
      }
    });

  }

  async smartLockActionFlowCard (action, what_if_action_in_progress) {
    try {
      this.log(action);
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
            // A different action is already in progress. Wait for its completion before execuiting this action.
            this.log('A different action is already in progress. Wait for its completion before executing this action');
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
        case ACTION_UNLOCK:
          {
            const currValue = this.getCapabilityValue('locked');
            if (!currValue) {
              // Already unlocked. Action does not need to be executed.
              this.log('Already unlocked. Action does not need to be executed');
              return Promise.resolve();
            }
            this.progressingAction = ACTION_UNLOCK;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_UNLOCK]
            ], 16000);
            this.log('Unlock done');
            await this.setCapabilityValue('locked', false);
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_LOCK:
          {
            const currValue = this.getCapabilityValue('locked');
            if (currValue) {
              // Already locked. Action does not need to be executed.
              this.log('Already locked. Action does not need to be executed');
              return Promise.resolve();
            }
            this.progressingAction = ACTION_LOCK;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_LOCK]
            ], 16000);
            this.log('Lock done');
            await this.setCapabilityValue('locked', true);
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_UNLATCH:
          {
            this.log('Perform Unlatch');
            this.setCapabilityValue('open_action', true);
            this.progressingAction = ACTION_UNLATCH;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_UNLATCH],
              ['nowait', 1]
            ], 16000);
            this.log('Unlatch performed');
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
            // Safety timer that can automatically restore the current status 
            //  after a while, if the event from Opener is missed.
            this._openingTimer = setTimeout(() => this._restoreStatusBeforeOpening(prevArg.previous_state), 24000);
            await this.progressingActionDone();
            return Promise.resolve();
          }
          break;
        case ACTION_LOCK_N_GO:
          {
            this.log('Perform Lock ’n’ Go');
            this.progressingAction = ACTION_LOCK_N_GO;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_LOCK_N_GO]
            ], 60000);
            this.log('Lock ’n’ Go successfully issued');
            // Wait until the Smart Lock is not locked (final state of Lock ’n’ Go action).
            if (this.getCapabilityValue('lockstate') != this.homey.__('util.locked')) {
              await new Promise(resolve => this._unlockStateEvent.once('done', resolve));
            }
            this.log('Lock ’n’ Go completed');
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_LOCK_N_GO_WITH_UNLATCH:
          {
            this.log('Perform Lock ’n’ Go with unlacth');
            this.progressingAction = ACTION_LOCK_N_GO_WITH_UNLATCH;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendRequest() method is not evaluated.
            await this.bridge.sendRequest('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_LOCK_N_GO_WITH_UNLATCH]
            ], 60000);
            this.log('Lock ’n’ Go with unlatch successfully issued');
            // Wait until the Smart Lock is not locked (final state of Lock ’n’ Go action).
            if (this.getCapabilityValue('lockstate') != this.homey.__('util.locked')) {
              await new Promise(resolve => this._unlockStateEvent.once('done', resolve));
            }
            this.log('Lock ’n’ Go with unlatch completed');
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
  updateCapabilitiesValue (newState) {
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
      if (this._openingTimer) {
        clearTimeout(this._openingTimer);
        this._openingTimer = null;
      }
      if (state == this.homey.__('util.unlatching')) {
        this.progressingAction = ACTION_UNLATCH;
        this.setCapabilityValue('open_action', true);
      }
      else if (prevState == this.homey.__('util.unlatching')) {
        this.progressingAction = 0;
        this.setCapabilityValue('open_action', false);
      }
      this.setCapabilityValue('lockstate', state);
      flow.getDeviceTriggerCard('lockstateChanged').trigger(this, { lockstate: state }, {});
      if (state == this.homey.__('util.locked')) {
        this._unlockStateEvent.emit('done');
      }
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
        this._lastContactAlarmChangeDateTime = new Date();
      } else if (newState.doorsensorState == 2 && (this.getCapabilityValue('alarm_contact') || this.getCapabilityValue('alarm_contact') == null)) {
        this._lastContactAlarmChangeDateTime = new Date();
        this.setCapabilityValue('alarm_contact', false);
      }
    }

    // update capability measure_battery
    if (Number(newState.batteryChargeState) != this.getCapabilityValue('measure_battery')) {
      this.setCapabilityValue('measure_battery', Number(newState.batteryChargeState));
    }
  }


  _restoreStatusBeforeOpening (baseState) {
    this.log('restoreStatusBeforeOpening');
    this._openingTimer = null;
    const flow = this.homey.flow;
    // Update capability open_action.
    this.progressingAction = 0;
    this.setCapabilityValue('open_action', false);
    // Update capability locked.
    const locked = (baseState == this.homey.__('util.locked') ? true : false);
    if (locked != this.getCapabilityValue('locked')) {
      this.setCapabilityValue('locked', locked);
    }
    // Update capability lockstate & trigger deprecated lockstateChanged flow card.
    this.setCapabilityValue('lockstate', baseState);
    flow.getDeviceTriggerCard('lockstateChanged').trigger(this, { lockstate: baseState }, {});
    // Update capability nuki_state and trigger nuki_state_changed flow card. 
    const nukiState = baseState;
    this.setCapabilityValue('nuki_state', nukiState);
    flow.getDeviceTriggerCard('nuki_state_changed').trigger(this, {
      previous_state: this.homey.__('util.unlatching')
    }, {});
  }

}

module.exports = SmartLockDevice;
