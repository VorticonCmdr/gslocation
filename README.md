# gs location changer

This is the code repository for the Chrome extension [gs location changer](https://chrome.google.com/webstore/detail/gs-location-changer/blpgcfdpnimjdojecbpagkllfnkajglp). With the help of this extension you can change your location within Google Search by setting the x-geo http header.

Once you set a location Google will write a cookie UULE which also contains the location which is set via the x-geo http header. Therefor to clear the location this extension also will delete the UULE cookie in order to reset all changes made.

You can contact me on [LinkedIn](https://www.linkedin.com/in/valentinpletzer/)

## v3.7 - 2025-11-15
There was a change in the Google Maps autocomplete endpoint used by previous versions of this extension. In order to hopefully gain some more stability (instead of relying on an unofficial endpoint) I changed to https://photon.komoot.io/ as a service which is based on a free and open source database which is based on OpenStreetMap.
