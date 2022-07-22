'use strict';

const Homey = require('homey');

class NukiApp extends Homey.App {

  onInit() {
    this.log('Initializing Nuki Direct app ...');

    // Nuki Smart Lock flow cards.
    this.homey.flow.getActionCard('lockAction')
      .registerRunListener(async (args, state) => {
        return args.device.smartLockActionFlowCard(Number(args.lockaction), args.what_if_action_in_progress).then(() => {
          return Promise.resolve();
        }).catch((err) => {
          return Promise.reject(err);
        })
      })
    this.homey.flow.getConditionCard('contact_alarm_condition')
      .registerRunListener(async (args, state) => {
        if (!args.elapsed_secs) {
          return false;
        }
        const lastContactAlarmChangeDateTime = args.device.lastContactAlarmChangeDateTime;
        if (!lastContactAlarmChangeDateTime) {
          return false;
        }
        const now = new Date();
        return (now - lastContactAlarmChangeDateTime) / 1000 < args.elapsed_secs;
      })
    // Nuki Opener Flow Cards.
    this.homey.flow.getActionCard('openerAction')
      .registerRunListener(async (args, state) => {
        return args.device.openerActionFlowCard(Number(args.openeraction), args.what_if_action_in_progress).then(() => {
          return Promise.resolve();
        }).catch((err) => {
          return Promise.reject(err);
        })
      })
    this.homey.flow.getConditionCard('continuous_mode')
      .registerRunListener(async (args, state) => {
        return args.device.getCapabilityValue('continuous_mode');
      })
    this.homey.flow.getConditionCard('ring_condition')
      .registerRunListener(async (args, state) => {
        if (!args.elapsed_secs) {
          return false;
        }
        const lastDoorbellRingDateTime = args.device.lastDoorbellRingDateTime;
        if (!lastDoorbellRingDateTime) {
          return false;
        }
        const now = new Date();
        return (now - lastDoorbellRingDateTime) / 1000 < args.elapsed_secs;
      })
    // Common Flow Cards
    let alarmBatteryKeypadCondition = this.homey.flow.getConditionCard('alarm_battery_keypad');
    alarmBatteryKeypadCondition.registerRunListener(async (args, state) => {
      return args.device.getCapabilityValue('alarm_battery_keypad');
    })
  }

}

module.exports = NukiApp;