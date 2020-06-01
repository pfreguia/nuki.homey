"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class OpenerDriver extends Homey.Driver {

  onInit() {
    new Homey.FlowCardTriggerDevice('openerstateChanged').register();
    new Homey.FlowCardTriggerDevice('continuous_mode_true').register();
    new Homey.FlowCardTriggerDevice('continuous_mode_false').register();
    new Homey.FlowCardAction('openerAction').register()
      .register()
      .registerRunListener(async (args, state) => {
        try {
          let path = 'http://' + args.device.getSetting('address') + ':' + args.device.getSetting('port') + '/lockAction?nukiId=' + args.device.getSetting('nukiId') + '&deviceType=2&action=' + args.openeraction + '&token=' + args.device.getSetting('token');
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

  onPair(socket) {
    let devicesArray = [];

    socket.on('list_devices', async (data, callback) => {
      let devices = [];
      try {
        let bridgeList = await util.sendCommand('https://api.nuki.io/discover/bridges', 4000);
        if (JSON.stringify(bridgeList).includes('"ip":')) {
          for (let i in bridgeList.bridges) {
            var authpath = 'http://' + bridgeList.bridges[i].ip + ':' + bridgeList.bridges[i].port + '/auth';
            var auth = await util.sendCommand(authpath, 32000);
            if (auth.success == true) {
              var locklistpath = 'http://' + bridgeList.bridges[i].ip + ':' + bridgeList.bridges[i].port + '/list?token=' + auth.token;
              var deviceList = await util.sendCommand(locklistpath, 2000);
              if (deviceList) {
                for (let x in deviceList) {
                  if (deviceList[x].deviceType == 2) {
                    devices.push({
                      name: deviceList[x].name + ' (' + bridgeList.bridges[i].ip + ')',
                      data: {
                        id: deviceList[x].nukiId
                      },
                      settings: {
                        address: bridgeList.bridges[i].ip,
                        port: bridgeList.bridges[i].port,
                        nukiId: deviceList[x].nukiId,
                        token: auth.token
                      }
                    });
                  }
                }
              }
            } else {
              callback(Homey.__("Did not receive a token from the bridge, make sure you push the bridge button during pairing."), false);
            }
          }
          callback(null, devices);
        } else {
          socket.showView('select_pairing');
        }


      } catch (error) {
        callback(error, false);
      }
    });

    socket.on('manual_pairing', async (data, callback) => {
      try {
        let path = 'http://' + data.address + ':' + data.port + '/info?token=' + data.token;
        let result = await util.sendCommand(path, 8000);
        for (let i in result.scanResults) {
          if (result.scanResults[i].deviceType == 2) {
            devicesArray.push({
              name: result.scanResults[i].name + ' (' + data.address + ')',
              data: {
                id: result.scanResults[i].nukiId
              },
              settings: {
                address: data.address,
                port: data.port,
                nukiId: result.scanResults[i].nukiId,
                token: data.token
              }
            });
          }
        }
        callback(null, result);
      } catch (error) {
        callback(error, false);
      }
    });

    socket.on('add_device', (data, callback) => {
      callback(false, devicesArray);
    });

  }

}

module.exports = OpenerDriver;
