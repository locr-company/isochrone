# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- date info for the data in /api/status request.

### Changed

- Updated npm dependencies
- Improved Dockerfile (changed base image from ubuntu:22.04 to node:20)
- Improved install_service.sh

### Fixed

- Usage of new turf library version

## [1.2.2] - 2023-10-16

### Fixed

- Handling properties in GeoJSON

## [1.2.1] - 2023-10-11

### Changed

- Refactorings (imporvements by SonarCloud hints)
- Updated npm dependencies

### Fixed

- Typo for radius parameter

## [1.2.0] - 2023-02-03

### Changed

- Refactorings
- Renamed Branch from 'master' to 'main'

### Removed

- Unnecessary options

## [1.1.0] - 2023-02-02

### Added

- first official release

[unreleased]: https://github.com/locr-company/isochrone/compare/1.2.2...HEAD
[1.2.2]: https://github.com/locr-company/isochrone/compare/1.2.1...1.2.2
[1.2.1]: https://github.com/locr-company/isochrone/compare/1.2.0...1.2.1
[1.2.0]: https://github.com/locr-company/isochrone/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/locr-company/isochrone/releases/tag/1.1.0