# ![Header][0]

This package can compute isochrone polygons based on driving time.  
This repository is originally forked from https://github.com/locr-company/isodist and is mixed with code from https://github.com/stepankuzmin/node-isochrone

## 1. IsoChrone Service Installation (Ubuntu 22.04)

### 1.1. Prerequisites

If something should differ from the defaults, set the environment variables for the install and update script and add them to `~/.bashrc`!

```bash
export ISOCHRONE_NAME=isochrone # optional (default: isochrone)
```

Download this repository

```bash
git clone https://github.com/locr-company/isochrone.git
cd isochrone
```

### 1.2. Build podman image, create and start container

#### 1.2.1. For producation systems

```bash
./script/install_service.sh
```

#### 1.2.1. For developments systems

```bash
podman build --tag=isochrone-dev --build-arg environment=dev .
podman run --rm -it -v ${PWD}:/app --network=host --name=isochrone-dev isochrone-dev /bin/bash
npm start
```

### 1.3. Add nginx config (optional)

```bash
sudo cp nginx/isochrone /etc/nginx/conf.d
```

ensure, that the following line(s) exists in /etc/nginx/sites-enabled/{server-config}

```nginx
server {
  ...
  include conf.d/isochrone;
  ...
}
```

## 2. Using the API

The default provider is "valhalla" on endpoint: "http://127.0.0.1:8002/isochrone".  
The interval unit is minutes.  

### 2.1. Use the REST-API

Go to http://localhost:3457/ to visit the demo website.  
You can view the API documentation at https://locr-company.github.io/isochrone/ or a local version at http://localhost:3457/api-doc/.

```bash
curl "http://localhost:3457/api/?latitude=52.276406&longitude=10.5346&intervals=1,3,5" | jq
```

### 2.2. Use the CLI-API

Via parameters

```bash
./bin/isochrone.mjs --lon=10.5346 --lat=52.276406 -i 1 -i 3 -i 5 | jq
```

Via input.json file

You can specify all the parameters in an input file that is piped into standard input:

```json
/* input.json */
{
	"origin": {
		"type": "Point",
		"coordinates": [ 10.5346, 52.276406 ]
	},
	"deintersect": true,
	"provider": "valhalla",
	"intervals": [{
		"interval": 1
	}, {
		"interval": 3
	}, {
		"interval": 5
	}]
}
```

```bash
$ ./bin/isochrone.mjs < input.json
```


## Command Line Arguments

### `--lat`
**Required**.

Latitude of the origin point.

### `--lon`
**Required**.

Longitude of the origin point.

### `-i, --interval`
**Required**.

Interval at which to compute isochrone polygons.
For example, to compute isochrone polygons at 2, 5 and 10 minutes, use
`--interval 2 --interval 5 --interval 10`


[0]: media/isochrone.png
[1]: https://download.geofabrik.de
