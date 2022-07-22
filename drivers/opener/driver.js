"use strict";

const NukiDriver = require('../../lib/NukiDriver.js');


class OpenerDriver extends NukiDriver {

  get nukiDeviceType() {
    return [2];
  }

  onInit() {
    this.homey.flow.getDeviceTriggerCard('openerstateChanged');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_true');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_false');
    this.homey.flow.getDeviceTriggerCard('ring_action');
  }

}

module.exports = OpenerDriver;
