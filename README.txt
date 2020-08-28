This is an alternative Homey app for the Nuki Smart Lock and Nuki Opener. The Nuki app created by Athom (https://apps.athom.com/app/io.nuki) uses the Nuki cloud service (Nuki Web) for controlling your devices.
Nuki Direct relies completely on your local network for communications between your Homey and your Nuki devices (internet access is optionally used for simplifying the initial pairing of a device). When a Nuki device changes its state, it will notify the new state directly to Homey.  
So, benefits of this approach over the cloud approach are:
* No internet connection needed for communication between Homey and Nuki.
* Improved reliability: it does work even if the internet is down or the Nuki cloud service is temporarily unavailable.
* Quick responsiveness thanks to the direct communication: the faster Homey knows about a state change, the better Homey can serve us.
* Simpler code, smaller memory footprint.

Nuki Direct can also manage the extra features provided by Nuki API in addition to the standard commands, settings, capabilities and flow cards supplied by Homey. With Nuki Direct you can fine-tune the settings and control the specific lock states and events of your Nuki devices.

Since Nuki Direct and Nuki app by Athom have been developed with distinct APIs, they can happily run side by side on the same Homey without interfering.