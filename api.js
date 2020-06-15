const Homey = require('homey');
const util = require('/lib/util.js');

module.exports = [
	{
		description: 'Nuki Callbacks',
		method   : 'POST',
		path     : '/callback/',
		public   : true,
		fn: function(args, callback) {
      try {
        switch (args.body.deviceType) {
          case 0:  // SmartLock
            let nuki = Homey.ManagerDrivers.getDriver("nuki").getDevice({"id": args.body.nukiId});
            nuki.updateCapabilitiesValue(args.body);
            break;
          case 2: // Opener
            let opener = Homey.ManagerDrivers.getDriver("opener").getDevice({ "id": args.body.nukiId });
            opener.updateCapabilitiesValue(args.body);
            break;
        }
      } catch (error) {
        callback(error, false);
      }
		}
	}
]
