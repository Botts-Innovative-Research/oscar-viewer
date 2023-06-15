# OpenSensorViewer

OpenSensorViewer is Web App for OpenSensorHub enabling interaction and visualization with sensors and observations 
served by OpenSensorHub server instances. 

The following features are currently supported:

- Open Standards
  - OGC Standards
    - SensorML (https://www.opengeospatial.org/standards/sensorml)
    - Sensor Web API (https://opensensorhub.github.io/sensorweb-api/swagger-ui)
    - Sensor Web Enablement (https://www.ogc.org/standards/swes)
- Integration with OpenSensorHub
  - Server Management
    - Configure 1 or more OpenSensorHub servers from which to gather systems and observations
    - Local store of configured servers
    - Request SensorML Capabilities from any configured server
    - Request Description of Systems through Sensor Web API
  - System Management
    - List systems and the servers hosting them
    - Provide Sensor Web API interface to request and view system information such as spec sheet and associated data streams
  - Observables
    - Ability to turn on and off selected data streams for Observation
      - Position, Location, Identification – Map Markers with polyline trails of historical position
        up to a maximum number of reported points (default 200)
      - Video Streams – Presented within dialogs
      - Draping – terrain draped imagery, useful in visualizing geo-rectified video streams for
        example from a drone flying overhead
    - Other visualizations can be created but as a minimum the ones above are provided
  - Real Time and Archive/Playback of Data Streams
    - Time Synchronization in Playback Mode
    - Ability to select start time for playback
    - Easy to use graphical user interface for time management
- Integration with CesiumJS as Mapping Engine
- Minimalist user interface placing emphasis on visualization of observables

## Cesium Ion Token

You will need to sign up for a Cesium Ion account (https://cesium.com/platform/cesium-ion/) and 
modify <code>src/components/map/CesiumMap.tsx</code> to set the <code>Cesium.Ion.defaultAccessToken</code> with token retrieved
from Cesium Ion account in order to see the globe/map.

## Users' Manual

Users' Manual is available in this repository under docs/OSH Viewer.pdf

## Building:

### Development

    git clone https://github.com/opensensorhub/osh-viewer.git
    cd osh-viewer
    npm install
    npm start 

### Release

    git clone https://github.com/opensensorhub/osh-viewer.git
    cd osh-viewer
    npm install
    npm run build 

