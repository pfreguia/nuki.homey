'use strict';

const fetch = require('node-fetch');

class Util {

  constructor(opts) {
    this.homey = opts.homey;
  }

  getHomeyIp() {
    return new Promise(async (resolve, reject) => {
      try {
        let localAddress = await this.homey.cloud.getLocalAddress();
        return resolve(localAddress);
      } catch (error) {
        return reject(error);
      }
    })
  }

  sendCommand(path, timeout) {
    return new Promise((resolve, reject) => {
      fetch(path, {
          method: 'GET',
          timeout: timeout
        })
        .then(this.checkStatus)
        .then(res => res.json())
        .then(json => {
          return resolve(json);
        })
        .catch(error => {
          console.log(error);
          return reject(error);
        });
    })
  }


  checkStatus = (res) => {
    if (res.ok) {
      return res;
    } else {
      if (res.status == 400) {
        throw new Error(this.homey.__('util.400'));
      } else if (res.status == 401) {
        throw new Error(this.homey.__('util.401'));
      } else if (res.status == 403) {
        throw new Error(this.homey.__('util.403'));
      } else if (res.status == 404) {
        throw new Error(this.homey.__('util.404'));
      } else if (res.status == 503) {
        throw new Error(this.homey.__('util.503'));
      } else {
        throw new Error('HTTP error ' + res.status);
      }
    }
  }

}

module.exports = Util;
