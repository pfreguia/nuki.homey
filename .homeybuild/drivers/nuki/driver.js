'use strict';

const NukiDriver = require('../../lib/NukiDriver.js');


class SmartLockDriver extends NukiDriver {

  get nukiDeviceType() {
    return 4;
  }

  onInit() {
    this.homey.flow.getDeviceTriggerCard('lockstateChanged');
  }

}

module.exports = SmartLockDriver;
