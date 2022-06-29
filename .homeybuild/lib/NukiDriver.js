"use strict";

const Homey = require('homey');
const fetch = require('node-fetch');


class NukiDriver extends Homey.Driver {

  get nukiDeviceType() {
    // This is an "abstract" method that needs to be implemented by child classes.
    throw new Error('Abstract error');
  }

  onInit() {
    this.homey.flow.getDeviceTriggerCard('openerstateChanged');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_true');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_false');
    this.homey.flow.getDeviceTriggerCard('ring_action');
  }

  onPair(session) {
    let foundBridges = [];
    let manualPairingReason = '';
    let targetBridge;
    let foundDevices = [];

    session.setHandler('query_nuki_servers', async () => {
      let response;
      this.log('Pairing: connect to Nuki Servers');
      try {
        try {
          response = await fetch('https://api.nuki.io/discover/bridges', {
            method: 'GET',
            timeout: 8000
          });
        }
        catch (error) {
          manualPairingReason = 'Fetch error: ' + error.message;
          return foundBridges;
        };
        switch (response.status) {
          case 200:
            if (response.headers.get('content-type').startsWith('application/json')) {
              const bridgeList = await response.json();
              if (bridgeList.bridges) {
                foundBridges = bridgeList.bridges;
                if (foundBridges.length == 0) {
                  manualPairingReason = 'No Nuki Bridges have been connected to the Nuki Servers via the same IP address as the one that called the URL in the last 30 days';
                }
                else if (foundBridges.length == 1) {
                  targetBridge = foundBridges[0];
                }
                return foundBridges;
              }
              else {
                manualPairingReason = 'Received unexpected JSON body from Nuki Servers';
                return foundBridges;
              }
            }
            else {
              manualPairingReason = 'Received unexpected content type "' + response.headers.get('content-type') + '" from Nuki Servers';
              return foundBridges;
            }
            break;
          default:
            manualPairingReason = 'Request "' + response.url + '" received negative response "' + response.status + ' ' + response.statusText + '"';
            return foundBridges;
        }
      }
      catch (error) {
        manualPairingReason = error.message;
        return foundBridges;
      }
    });

    session.setHandler('query_bridge', async () => {
      // Send "auth" request.
      this.log('Pairing: connect to Nuki Bridge');
      try {
        let token;
        let authResponse;
        try {
          const authUrl = 'http://' + targetBridge.ip + ':' + targetBridge.port + '/auth';
          authResponse = await fetch(authUrl, {
            method: 'GET',
            timeout: 30000
          });
        }
        catch (error) {
          session.emit('query_bridge_done', error.type == 'request-timeout' ? 'timeout' : 'Fetch error: ' + error.message);
          return;
        };
        this.log(authResponse.status);
        switch (authResponse.status) {
          case 200:
            if (authResponse.headers.get('content-type').startsWith('application/json')) {
              const authObj = await authResponse.json();
              this.log(authObj);
              if (authObj.token && authObj.success) {
                token = authObj.token;
              }
              else {
                session.emit('query_bridge_done', 'timeout');
                return;
              }
            }
            else {
              session.emit('query_bridge_done', 'Received unexpected content type "' +
                authResponse.headers.get('content-type') + '" from Nuki Bridge');
              return;
            }
            break;
          case 403:
            session.emit('query_bridge_done', 'forbidden');
            return;
          default:
            session.emit('query_bridge_done', 'Request "' + authResponse.url +
              '" received negative response "' + authResponse.status + ' ' +
              authResponse.statusText + '"');
            return;
        }
        session.emit('query_bridge_auth_done');
        // Send "list" request.
        let listResponse;
        try {
          const listUrl = 'http://' + targetBridge.ip + ':' + targetBridge.port + '/list?token=' + token;
          listResponse = await fetch(listUrl, {
            method: 'GET',
            timeout: 4000
          });
        }
        catch (error) {
          session.emit('query_bridge_done', 'Fetch error: ' + error.message);
          return;
        };
        switch (listResponse.status) {
          case 200:
            if (listResponse.headers.get('content-type').startsWith('application/json')) {
              const listObj = await listResponse.json();
              if (listObj) {
                for (let i in listObj) {
                  if (listObj[i].deviceType == this.nukiDeviceType) {
                    foundDevices.push({
                      name: listObj[i].name,
                      data: {
                        id: listObj[i].nukiId
                      },
                      settings: {
                        address: targetBridge.ip,
                        port: targetBridge.port,
                        token: token
                      }
                    });
                  }
                }
              }
              session.emit('query_bridge_done', 'ok');
            }
            else {
              session.emit('query_bridge_done', 'Received unexpected content type "' +
                listResponse.headers.get('content-type') + '" from Nuki Bridge');
              return;
            }
            break;
          default:
            session.emit('query_bridge_done', 'Request "' + listResponse.url +
              '" received negative response "' + listResponse.status + ' ' +
              listResponse.statusText + '"');
            return;
        }
      }
      catch (error) {
        session.emit('query_bridge_done', error.message);
        return;
      }
    });

    session.setHandler('get_target_bridge', async () => {
      return targetBridge;
    });

    session.setHandler('set_target_bridge', async (val) => {
      targetBridge = val;
    });

    session.setHandler('get_manual_pairing_reason', async () => {
      return manualPairingReason;
    });

    session.setHandler('set_manual_pairing_reason', async (val) => {
      manualPairingReason = val;
    });

    session.setHandler('get_found_bridges', async () => {
      return foundBridges;
    });

    session.setHandler('list_devices', async (data) => {
      return Promise.resolve(foundDevices);
    });

    session.setHandler('manual_pairing', async (bridgeAddress) => {
      this.log('Manual pairing: get info from  Nuki Bridge');
      try {
        targetBridge = {
          address: bridgeAddress.address,
          port: bridgeAddress.port
        }
        let infoResponse;
        try {
          const infoUrl = 'http://' + bridgeAddress.address + ':' + bridgeAddress.port + '/info?token=' + bridgeAddress.token;
          infoResponse = await fetch(infoUrl, {
            method: 'GET',
            timeout: 4000
          });
        }
        catch (error) {
          return Promise.reject(new Error('Fetch error: ' + error.message));
        };
        switch (infoResponse.status) {
          case 200:
            if (infoResponse.headers.get('content-type').startsWith('application/json')) {
              const bridgeInfo = await infoResponse.json();
              console.log(bridgeInfo);
              for (let i in bridgeInfo.scanResults) {
                if (bridgeInfo.scanResults[i].deviceType == this.nukiDeviceType) {
                  foundDevices.push({
                    name: bridgeInfo.scanResults[i].name,
                    data: {
                      id: bridgeInfo.scanResults[i].nukiId
                    },
                    settings: {
                      address: bridgeAddress.address,
                      port: Number(bridgeAddress.port),
                      token: bridgeAddress.token
                    }
                  });
                }
              }
              return Promise.resolve(bridgeInfo);
            }
            else {
              return Promise.reject(new Error('Received unexpected content type "' +
                infoResponse.headers.get('content-type') + '" from Nuki Bridge'));
            }
            break;
          case 401:
            return Promise.reject(new Error('Token is not valid'));
          default:
            return Promise.reject(new Error('Request "' + infoResponse.url +
              '" received negative response "' + infoResponse.status + ' ' +
              infoResponse.statusText + '"'));
        }
      }
      catch (error) {
        return Promise.reject(error);
      }
    });

  }

}

module.exports = NukiDriver;
