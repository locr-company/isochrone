# ![Header][0]

This package can compute isochrone polygons based on driving time.  
This repository is originally forked from https://github.com/locr-company/isodist and is mixed with code from https://github.com/stepankuzmin/node-isochrone

## Getting Started
```sh
$ git clone git@github.com:locr-company/isochrone.git
$ cd isochrone
$ git submodule update --init --recursive
$ npm install
```

## setup and prepare osrm
```sh
sudo apt install cmake g++ libtbb2 libtbb-dev libexpat1 libexpat1-dev bzip2 libbz2-1.0 libbz2-dev lua5.3 libluabind-dev liblua5.3-0 liblua5.3-dev libluajit-5.1-dev luajit zlib1g zlib1g-dev libboost-all-dev

npm run setup-osrm
npm run prepare-osrm
```

## setup and prepare valhalla
```sh
sudo apt install libsqlite3-mod-spatialite autoconf automake libzmq5 libzmq3-dev libczmq4 libczmq-dev curl libcurl4 libcurl4-openssl-dev libprotobuf-dev libgeos-dev libgeos++-dev protobuf-compiler spatialite-bin libsqlite3-dev libspatialite-dev libsqlite3-mod-spatialite lcov unzip
```

In order to run `isochrone`, you will need to download an `*.osm` file corresponding to the region
where you want to do your computation. [Geofabrik][1] is a good source of these files.

You need to place your OSM files into the `isochrone/data` directory (create one if it does not exist).
Then run the following command to generate `.osrm` files:
```sh
$ npm run prepare
```

Finally, you are good to go! In order to generate the graph above, you will need `bremen.osrm` and
run the following:
```sh
$ bin/isochrone.js --lon=-86.893386 --lat=40.417202 -i 2 -i 5 -i 7 -m bremen
```

## Input file
You can specify all the parameters in an input file that is piped into standard input:
```json
/* input.json */
{
	"origin": {
		"type": "Point",
		"coordinates": [ 8.8071646, 53.0758196 ]
	},
	"map": "bremen",
	"deintersect": true,
	"provider": "osrm",
	"intervals": [{
		"interval": 1
	}, {
		"interval": 3
	}, {
		"interval": 5
	}]
}

```
```sh
$ bin/isochrone.js < input.json
```

Please note that CLI arguments always override values specified in the input file.
```sh
$ bin/isochrone.js --map il < input.json
# The above command will use `data/osrm/il.osrm`
```


## Command Line Arguments

### `--lat`
**Required**.

Latitude of the origin point.

### `--lon`
**Required**.

Longitude of the origin point.

### `-s, --step`
**Required**.

Distance at which to compute isodistance polygons.
For example, to compute isodistance polygons at 1, 2, 5 and 10 kilometers, use
`--step 1 --step 2 --step 5 --step 10`


### `-m, --map`
**Required**.

Name of the `.osrm` file you wish to use for routing.


[0]: media/isochrone.png
[1]: https://download.geofabrik.de
