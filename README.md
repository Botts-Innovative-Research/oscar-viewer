# OSCAR Viewer

OSCAR Viewer is Web App for OpenSensorHub enabling interaction and visualization with sensors and observations 
served by OpenSensorHub server instances.

## Sharing occupancies

Use **Share occupancy** in an occupancy preview or on Event Details to copy a link.
Links use `/event-details/?id=<observation_id>&node=<encoded_api_endpoint>` and load
the stored observation directly, including when opened in a new browser or refreshed.
Both alarm and non-alarm occupancies can be shared. For live occupancies, Share
resolves the stored observation ID; if storage is still pending, retry shortly.

Recipients must sign in and have access to the source node. Remote nodes must be
configured on their Servers page. Links contain no credentials and do not grant
additional access. The node parameter identifies the configured API endpoint,
independently of user-chosen node names. An ID-only link is also accepted when it
unambiguously identifies an occupancy among configured nodes. Links stop working
if the observation is removed by retention or deletion.

The query-string route supports the Viewer's static export without new server
rewrite rules. Existing navigation without parameters remains supported.
