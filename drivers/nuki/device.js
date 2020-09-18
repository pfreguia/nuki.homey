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
  _unlockStateEvent = new EventEmitter();

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
    this.registerCapabilityListener('locked', async (value) => {
      try {
        const currValue = this.getCapabilityValue('locked');
        if (value === currValue) {
          return Promise.resolve();
        }
        console.log('Value: ' + (value ? 'Lock' : 'Unlock'));
        if (value) {
          // Lock action.
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if (this.progressingAction == ACTION_LOCK) {
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
          const url = this.buildURL('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 0],
            ['action', ACTION_LOCK]
          ]);
          this.progressingAction = ACTION_LOCK;
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
          if (this.progressingAction > 0) {
            // An action is already in progress.
            if (this.progressingAction == ACTION_UNLOCK) {
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
          const url = this.buildURL('lockAction', [
            ['nukiId', this.getData().id],
            ['deviceType', 0],
            ['action', ACTION_UNLOCK]
          ]);
          this.progressingAction = ACTION_UNLOCK;
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
              ['deviceType', 0],
              ['action', ACTION_UNLATCH],
              ['nowait', 1]
            ]);
            this.progressingAction = ACTION_UNLATCH;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 8000);
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
        }
        else {
          return Promise.reject(new Error('Action in progress. Please wait'));
        }
      }
      catch (error) {
        this._progressingAction = 0;
        return Promise.reject(error);
      }
    });

  }

  async smartLockActionFlowCard(action, state) {
    try {
      console.log(action);
      switch (action) {
        case ACTION_UNLOCK:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_UNLOCK) {
                // An Unlock action is already in progress.
                console.log('An Unlock action is already in progress');
                await this.progressingActionDone();
                console.log('Unlock action completed');
                return Promise.resolve();
              }
              else {
                console.log('An action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Action completed. Resume');
              }
            }
            const currValue = this.getCapabilityValue('locked');
            if (!currValue) {
              // Already unlocked. No action needed.
              console.log('Already unlocked. No action needed');
              return Promise.resolve();
            }
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_UNLOCK]
            ]);
            this.progressingAction = ACTION_UNLOCK;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 16000);
            console.log('Unlock done');
            await this.setCapabilityValue('locked', false);
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_LOCK:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_LOCK) {
                // A Lock action is already in progress.
                console.log('A Lock action is already in progress');
                await this.progressingActionDone();
                console.log('Lock action completed');
                return Promise.resolve();
              }
              else {
                console.log('An action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Action completed. Resume');
              }
            }
            const currValue = this.getCapabilityValue('locked');
            if (currValue) {
              // Already locked. No action needed.
              console.log('Already locked. No action needed');
              return Promise.resolve();
            }
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_LOCK]
            ]);
            this.progressingAction = ACTION_LOCK;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 16000);
            console.log('Lock done');
            await this.setCapabilityValue('locked', true);
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_UNLATCH:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_UNLATCH) {
                // An Unlatch action is already in progress.
                console.log('An Unlatch action is already in progress');
                await this.progressingActionDone();
                console.log('Unlatch action completed');
                return Promise.resolve();
              }
              else {
                console.log('An action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Action completed. Resume');
              }
            }
            console.log('Perform Unlatch');
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_UNLATCH],
              ['nowait', 1]
            ]);
            this.setCapabilityValue('open_action', 1);
            this.progressingAction = ACTION_UNLATCH;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 32000);
            console.log('Unlatch performed');
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
            await this.progressingActionDone();
            return Promise.resolve();
          }
          break;
        case ACTION_LOCK_N_GO:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_LOCK_N_GO_WITH_UNLATCH ||
                this.progressingAction == ACTION_LOCK_N_GO_WITH_UNLATCH) {
                // A Lock ’n’ Go action (with or without unlatch) is already in progress.
                console.log('A Lock ’n’ Go action (with or without unlatch) is already in progress');
                await this.progressingActionDone();
                console.log('Lock ’n’ Go action (with or without unlatch) completed');
                return Promise.resolve();
              }
              else {
                console.log('Another action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Other action completed. Resume');
              }
            }
            console.log('Perform Lock ’n’ Go');
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_LOCK_N_GO]
            ]);
            this.progressingAction = ACTION_LOCK_N_GO;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 60000);
            console.log('Lock ’n’ Go successfully issued');
            // Wait until the Smart Lock is not locked (final state of Lock ’n’ Go action).
            if (this.getCapabilityValue('lockstate') != this.homey.__('util.locked')) {
              await new Promise(resolve => this._unlockStateEvent.once('done', resolve));
            }
            console.log('Lock ’n’ Go completed');
            this.progressingAction = 0;
            return Promise.resolve();
          }
          break;
        case ACTION_LOCK_N_GO_WITH_UNLATCH:
          {
            while (this.progressingAction > 0) {
              // An action is already in progress.
              if (this.progressingAction == ACTION_LOCK_N_GO_WITH_UNLATCH || 
                this.progressingAction == ACTION_LOCK_N_GO_WITH_UNLATCH) {
                // A Lock ’n’ Go action (with or without unlatch) is already in progress.
                console.log('A Lock ’n’ Go action (with or without unlatch) is already in progress');
                await this.progressingActionDone();
                console.log('Lock ’n’ Go action (with or without unlatch) completed');
                return Promise.resolve();
              }
              else {
                console.log('Another action is already in progress. Wait');
                await this.progressingActionDone();
                console.log('Other action completed. Resume');
              }
            }
            console.log('Perform Lock ’n’ Go');
            const url = this.buildURL('lockAction', [
              ['nukiId', this.getData().id],
              ['deviceType', 0],
              ['action', ACTION_LOCK_N_GO_WITH_UNLATCH]
            ]);
            this.progressingAction = ACTION_LOCK_N_GO_WITH_UNLATCH;
            // It seems that, even if result.success is false, the action is
            //  performed correctly by Nuki. For that resons the "result" object
            //  of sendCommand() method is not evaluated.
            await this.util.sendCommand(url, 60000);
            console.log('Lock ’n’ Go with unlatch successfully issued');
            // Wait until the Smart Lock is not locked (final state of Lock ’n’ Go action).
            if (this.getCapabilityValue('lockstate') != this.homey.__('util.locked')) {
              await new Promise(resolve => this._unlockStateEvent.once('done', resolve));
            }
            console.log('Lock ’n’ Go with unlatch completed');
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
      if (state == this.homey.__('util.unlatching')) {
        this.progressingAction = ACTION_UNLATCH;
        this.setCapabilityValue('open_action', 1);
      }
      else if (prevState == this.homey.__('util.unlatching')) {
        this.progressingAction = 0;
        this.setCapabilityValue('open_action', 0);
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
