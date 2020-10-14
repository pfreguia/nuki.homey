'use strict';


module.exports = {
  async nukiCallbacks({homey, body}) {
    try {
      const NukiBridge = require('../../lib/NukiBridge.js');
      NukiBridge.onCallback(body);
      return { success: true };
    }
    catch (error) {
      console.log(error);
      return false;
    }
  }
}
