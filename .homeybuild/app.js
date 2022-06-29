'use strict';

const Homey = require('homey');

class NukiApp extends Homey.App {

  onInit () {
    this.log('Initializing Nuki app ...');

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

  }

}

module.exports = NukiApp;