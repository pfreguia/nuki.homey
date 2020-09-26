'use strict';

module.exports = {
  async nukiCallbacks({homey, body}) {
    try {
      switch (body.deviceType) {
        case 0:  // SmartLock
          let nuki = homey.drivers.getDriver("nuki").getDevice({"id": body.nukiId});
          nuki.updateCapabilitiesValue(body);
          break;
        case 2: // Opener
          let opener = homey.drivers.getDriver("opener").getDevice({"id": body.nukiId});
          opener.updateCapabilitiesValue(body);
          break;
      }
      return { success: true };
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
