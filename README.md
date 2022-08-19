# Nuki Direct
This is an alternative Homey app for Nuki Smart Lock 1.0, 2.0, 3.0 (Pro) and Nuki Opener. Differently from The [Nuki app by Athom](https://apps.athom.com/app/io.nuki) that relies on the Nuki cloud service for controlling your devices, Nuki Direct uses nothing but your local network for communications between your Homey and your Nuki devices via Nuki Bridge (internet access is optionally used for simplifying the initial pairing of a device). When a Nuki device changes its state, it will notify the new state directly to Homey. When Homey issues a command to a Smart Lock or to an Opener, it will send the request directly to the device.  
So, benefits of this approach over the cloud approach are:
* No internet connection needed for communication between Homey and Nuki.
* Improved reliability: it does work even if the internet is down or the Nuki cloud service is temporarily unavailable.
* Quick responsiveness thanks to the direct communication: the faster Homey knows about a state change, the better Homey can serve us.
* Simpler code, smaller memory footprint.

Nuki Direct can also manage the extra features provided by Nuki API in addition to the standard commands, settings, capabilities and flow cards supplied by Homey. With Nuki Direct you can fine-tune the settings and control the specific lock states and events of your Nuki devices.

Since Nuki Direct and Nuki app by Athom have been developed with distinct frameworks, they can happily run side by side on the same Homey without interfering.

## Adding your devices
Follow these steps to add your Nuki devices to Homey.
* First, make sure the Bridge HTTP API (https://developer.nuki.io/page/nuki-bridge-http-api-1-11/4/) in your Nuki Bridge is enabled. You can do this within the Nuki smartphone app. Go to "Manage my devices" and select your Nuki Bridge. There you can enable the HTTP API.
* Once enabled, go to the Homey app and add a Nuki device by selecting the "Nuki Direct" icon and then "Nuki Smart Lock" or "Nuki Opener".
* Tap the "Connect" button and wait for the searching process to start.
* Press the button of your Nuki Bridge when requested.
* Select the Nuki device(s) you wish to add to Homey and confirm.

Your Nuki device(s) have now been added to Homey.

## Release notes for the latest version (release notes of previous versions are available [here](https://github.com/pfreguia/nuki.homey/releases))
### v3.1.1 - 2022-08-19
* Bug: unable to pair a new Smart Lock (either 1.0/2.0 or 3.0 (Pro)). This [issue](https://github.com/pfreguia/nuki.homey/issues/23) was introduced in v3.1.0. Resolved.