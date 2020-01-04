"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class NukiApp extends Homey.App {

  onInit() {
    this.log('Initializing Nuki app ...');

    /* DEPRECATED - USING DEFAULT CONDITION CARD FOR LOCKED CAPABILITY INSTEAD */
    new Homey.FlowCardCondition('isLocked')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getCapabilityValue('locked')) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    new Homey.FlowCardAction('lockAction')
      .register()
      .registerRunListener(async (args, state) => {
        try {
          let path = 'http://'+ args.device.getSetting('address') +':'+ args.device.getSetting('port') +'/lockAction?nukiId='+ args.device.getSetting('nukiId') +'&action='+ args.lockaction +'&token='+ args.device.getSetting('token');
          let result = await util.sendCommand(path, 8000);
          if (result.success == true) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          if (error == '400') {
            return Promise.reject(Homey.__('400'));
          } else if (error == '401') {
            return Promise.reject(Homey.__('401'));
          } else if (error == '404') {
            return Promise.reject(Homey.__('404'));
          } else if (error == '503') {
            return Promise.reject(Homey.__('503'));
          } else {
            return Promise.reject(error);
          }
        }
      })
  }

}

module.exports = NukiApp;
