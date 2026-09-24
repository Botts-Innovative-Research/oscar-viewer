# OSCAR Viewer Change Log
All notable changes to this project will be documented in this file. 

## 4.0.0

### Upgrade notes

- This major release adds operator-facing navigation and URL-scoped operational views. Validate workstation URLs and train operators before production rollout.

### Added

- Added a localized Status of Health page for lane RPM and camera connectivity, radiation and tamper faults, and configurable extended-occupancy alerts.
- Added URL-scoped operational views that consistently limit lane discovery, dashboards, maps, reports, notifications, and health monitoring to assigned lanes.
- Added compact alarm QR export from the dashboard and Event Details, including adaptively downsampled gamma, neutron, and threshold series.
- Added an offline Alarm Transfer page that scans a camera or saved QR image, imports portable alarm files, verifies transfer integrity, redraws charts, and downloads or shares the alarm package.
- Added complete English, Spanish, French, and Greek interface translations for the transfer workflow.

### Changed

- Event filtering, counts, pagination, and bulk selection now query the complete matching server-side result set rather than only the currently loaded page.

### Security

- Alarm QR payloads are compressed Base45 documents with a SHA-256 corruption check and strict import limits. They are not encrypted or digitally signed, so the interface warns operators to confirm the source independently.

## 3.8.4

### Added

- Added nested AND/OR filtering across all event columns on the dashboard and Events page.
- Added cross-page alarm selection, selection of all filtered alarms, and bulk adjudication with progress and per-event failure isolation.

### Changed

- Event counts, pages, live updates, and bulk selection now use the same filter definition.
- Occupancy ID, Max Gamma, and Max Neutron filters now default to inclusive minimum/maximum comparisons.
- Server requests and adjudication commands use bounded concurrency to protect multi-lane deployments.


## 3.0.0 - 2025-11-11
### Added
- Added MQTT to DataSources to allow client to receive messages through a single persistent websocket instead of opening multiple websockets per lane.
- 


## [2.0.0] - 2025-10-14
### Removed
- Inserting DataStreams and Systems from client
### Changed
- Updated charts to handle Aspect Occupancy events
- 
- National View Page styling and handling of data from client to backend
- Video Playback changed to use html elements rather than osh-js
- Updated osh-js to 3.1.0
- 
### Added
- Implemented Report Generation Page
- Button to export as PDF to Event Details Page
- Added SiteMap diagram to Map components
