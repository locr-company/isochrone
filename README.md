# ![Header][0]

This package can compute isochrone polygons based on driving time.  
This repository is originally forked from https://github.com/locr-company/isodist and is mixed with code from https://github.com/stepankuzmin/node-isochrone

## Prerequisites for Ubuntu 20.04
```sh
sudo apt install build-essential curl file git libtbb2 libtbb-dev lua5.3 liblua5.3-0 liblua5.3-dev libluabind-dev
```

## Getting Started
```sh
$ git clone git@github.com:locr-company/isochrone.git
$ cd isochrone
$ git submodule update --init --recursive
$ npm install
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
$ bin/isodist.js --lon=-86.893386 --lat=40.417202 -i 2 -i 5 -i 7 -m bremen
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
$ bin/isodist.js < input.json
```

Please note that CLI arguments always override values specified in the input file.
```sh
$ bin/isodist.js --map il < input.json
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


### `-r, --resolution`
Optional, default: 0.2

Sampling resolution of the underlying point grid. Larger values will result in less precise
results but much faster processing. Smaller values will produce more precise results, but will
require exponentially more processing time and memory.

Having a very small resolution value may result in kinks (i.e. self-intersections) of isodistance
polygons, which cause hex-fitting to fail. You can choose to ignore them by disabling hex-fitting,
but note that presence of kinks usually indicates incorrect parameter choice.


### `-h, --hex-size`
Optional, default: 0.5

Size of hex grid cells that isodistances are fitted onto. Passing a 0 value will disable
hex grid fitting.


### `--no-deburr`
Optional, default: none

This flag instructs `isodist` not to remove isolated "islands" from isodistance geometries.


[0]: media/isochrone.png
[1]: https://download.geofabrik.de
