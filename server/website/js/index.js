class IsoChroneDemo {
	constructor() {
		this._center = [ 53.0758196, 8.8071646 ];
		this._map = L.map('map').setView(this._center, 13);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this._map);

		L.control
			.isochrone({ position: 'topright' })
			.addTo(this._map);

		this._marker = L.marker(this._center, {
			draggable: true
		});
		this._marker.addTo(this._map);
		this._marker.on('moveend', (evt) => {
			this.refreshIsoChrone(evt.target.getLatLng());
		});
		this._polygons = [];
		this._circles = [];

		this.refreshIsoChrone(this._marker.getLatLng());
	}

	get Interval1() {
		let interval = 1;

		const intervalInput = document.getElementById('isochrone-interval-1');
		if (intervalInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(intervalInput.value);
			if (!isNaN(parsedInput)) {
				interval = parsedInput;
			}
		}

		return interval;
	}

	get Interval2() {
		let interval = 1;

		const intervalInput = document.getElementById('isochrone-interval-2');
		if (intervalInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(intervalInput.value);
			if (!isNaN(parsedInput)) {
				interval = parsedInput;
			}
		}

		return interval;
	}

	get Interval3() {
		let interval = 1;

		const intervalInput = document.getElementById('isochrone-interval-3');
		if (intervalInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(intervalInput.value);
			if (!isNaN(parsedInput)) {
				interval = parsedInput;
			}
		}

		return interval;
	}

	get CellSize() {
		let cellSize = 0.1;

		const cellSizeInput = document.getElementById('isochrone-cell-size');
		if (cellSizeInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(cellSizeInput.value);
			if (!isNaN(parsedInput)) {
				cellSize = parsedInput;
			}
		}

		return cellSize;
	}

	get Provider() {
		let provider = '';

		const providerSelect = document.getElementById('isochrone-provider');
		if (providerSelect instanceof HTMLSelectElement) {
			provider = providerSelect.value;
		}

		return provider;
	}

	getMarkerCenter() {
		return this._marker.getLatLng();
	}

	refreshIsoChrone(center) {
		const applyChangesButton = document.getElementById('isochrone-apply-settings');
		if (applyChangesButton instanceof HTMLButtonElement) {
			applyChangesButton.disabled = true;
		}

		const intervals = [{
			interval: this.Interval1
		}];
		if (this.Interval2 > 0) {
			intervals.push({
				interval: this.Interval2
			});
		}
		if (this.Interval3 > 0) {
			intervals.push({
				interval: this.Interval3
			});
		}
		const inputJson = {
			origin: {
				type: 'Point',
				coordinates: [ center.lng, center.lat ]
			},
			map: 'bremen',
			deintersect: true,
			provider: this.Provider,
			intervals: intervals
		};
	
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(inputJson)
		};
		fetch('api/', options)
			.then(res => res.json())
			.then(json => {
				if (applyChangesButton instanceof HTMLButtonElement) {
					applyChangesButton.disabled = false;
				}

				let oldPolygon = undefined;
				while(oldPolygon = this._polygons.pop()) {
					oldPolygon.remove();
				}
				let oldCircle = undefined;
				while(oldCircle = this._circles.pop()) {
					oldCircle.remove();
				}
	
				if (!json.type) {
					alert('no type found in geojson');
					return;
				}

				const reverseLatLongCoordinates = function(coordinates) {
					const leafletCoordinates = [];
					for(const subCoordinates of coordinates) {
						const leafletCoordinatesSub = [];
						for(const point of subCoordinates) {
							leafletCoordinatesSub.push([point[1], point[0]]);
						}
						leafletCoordinates.push(leafletCoordinatesSub)
					}

					return leafletCoordinates;
				};

				const colors = ['lime', 'yellow', 'red'];
				let polygonCounter = 0;

				switch(json.type) {
					case 'Feature':
						alert(`unhandled geojson-type: ${json.type}`);
						break;
					
					case 'FeatureCollection':
						if (!(json.features instanceof Array)) {
							alert('geojson-features is not an array');
							break;
						}

						const featuresCount = json.features.length;
						for(const feature of json.features) {
							if (feature.type !== 'Feature') {
								alert(`invalid geojson-feature-type: ${feature.type}`);
								continue;
							}
							if (!feature.geometry) {
								alert('no geojson-feature-geometry');
								continue;
							}
							const geometry = feature.geometry;
							if (!geometry.type) {
								alert('no type found in geojson-geometry');
							}
							if (!geometry.coordinates) {
								alert('no geometry-coordinates found.');
								break;
							}
							if (!(geometry.coordinates instanceof Array)) {
								alert('geometry-coordinates is not an array');
								break;
							}

							let color = colors[featuresCount - 1 - polygonCounter] || 'white';

							switch(geometry.type) {
								case 'Polygon':
									const leafletCoordinates = reverseLatLongCoordinates(geometry.coordinates);
									const polygon = L.polygon(leafletCoordinates, { color: color });
									polygon.addTo(this._map);
									this._polygons.push(polygon);

									polygonCounter++;
									break;
								
								case 'MultiPolygon':
									let multiCoordinates = geometry.coordinates;
									for(let i in multiCoordinates) {
										multiCoordinates[i] = reverseLatLongCoordinates(multiCoordinates[i]);
									}
									const multiPolygon = L.polygon(multiCoordinates, { color: color });
									multiPolygon.addTo(this._map);
									this._polygons.push(multiPolygon);

									polygonCounter++;
									break;
								
								default:
									alert(`unhandled geometry-type: ${geometry.type}`);
									break;
							}
						}
						break;
					
					default:
						alert(`invalid geojson-type: ${json.type}`);
						break;
				}
			})
			.catch(exc => {
				if (applyChangesButton instanceof HTMLButtonElement) {
					applyChangesButton.disabled = false;
				}
				let oldPolygon = undefined;
				while(oldPolygon = this._polygons.pop()) {
					oldPolygon.remove();
				}
				let oldCircle = undefined;
				while(oldCircle = this._circles.pop()) {
					oldCircle.remove();
				}
				alert(exc);
			});
	}
}

let isochroneDemo = null;

L.Control.IsoChrone = L.Control.extend({
	onAdd: function(_map) {
		const buildNumberInputRow = function(col1Content, inputId, defaults) {
			const tRowDistance = document.createElement('tr');
			const tColInterval1 = document.createElement('td');
			tColInterval1.appendChild(document.createTextNode(col1Content));
			tRowDistance.appendChild(tColInterval1);
			const tColInterval2 = document.createElement('td');
			tColInterval2.style.width = '75px';
			const input = document.createElement('input');
			input.id = inputId;
			input.type = 'number';
			if (defaults) {
				if (typeof defaults.value === 'number') {
					input.value = defaults.value;
				}
				if (typeof defaults.min === 'number') {
					input.min = defaults.min;
				}
				if (typeof defaults.step === 'number') {
					input.step = defaults.step;
				}
			}
			input.style.width = '100%';
			tColInterval2.appendChild(input);
			tRowDistance.appendChild(tColInterval2);

			return tRowDistance;
		};

		const container = document.createElement('div');
		container.classList.add('leaflet-bar');
		container.id = 'isochrone-control';
		container.addEventListener('dblclick', evt => {
			evt.stopPropagation();
		});

		const isochroneImg = document.createElement('img');
		isochroneImg.id = 'isochrone-control-symbol';
		isochroneImg.src = 'gfx/svg/favicon.svg';
		isochroneImg.width = 32;
		isochroneImg.height = 32;
		isochroneImg.style.position = 'absolute';
		isochroneImg.style.top = '-1px';
		isochroneImg.style.right = '-1px';
		container.appendChild(isochroneImg);

		const contentContainer = document.createElement('div');
		contentContainer.id = 'isochrone-control-content';

		const table = document.createElement('table');
		const tBody = document.createElement('tbody');
		const tFoot = document.createElement('tfoot');
		table.appendChild(tBody);
		table.appendChild(tFoot);

		const tRowProvider = document.createElement('tr');
		const tColProvider1 = document.createElement('td');
		tColProvider1.appendChild(document.createTextNode('provider'));
		const tColProvider2 = document.createElement('td');
		const providerSelect = document.createElement('select')
		providerSelect.id = 'isochrone-provider';
		providerSelect.style.width = '100%';
		const providers = ['osrm', 'valhalla'];
		for(const provider of providers) {
			const providerOption = document.createElement('option');
			providerOption.value = provider;
			providerOption.appendChild(document.createTextNode(provider));
			providerSelect.appendChild(providerOption);
		}
		tColProvider2.appendChild(providerSelect);
		tRowProvider.appendChild(tColProvider1);
		tRowProvider.appendChild(tColProvider2);
		tBody.appendChild(tRowProvider);

		const tRowInterval1 = buildNumberInputRow('interval 1 (min):', 'isochrone-interval-1', { value: 2, min: 0.1, step: 0.1 });
		tBody.appendChild(tRowInterval1);

		const tRowInterval2 = buildNumberInputRow('interval 2 (min):', 'isochrone-interval-2', { value: 0, min: 0, step: 0.1 });
		tBody.appendChild(tRowInterval2);

		const tRowInterval3 = buildNumberInputRow('interval 3 (min):', 'isochrone-interval-3', { value: 0, min: 0, step: 0.1 });
		tBody.appendChild(tRowInterval3);

		const tRowCellSize = document.createElement('tr');
		const tColCellSize1 = document.createElement('td');
		tColCellSize1.appendChild(document.createTextNode('cell-size:'));
		tRowCellSize.appendChild(tColCellSize1);
		const tColCellSize2 = document.createElement('td');
		tColCellSize2.style.width = '75px';
		const cellSizeInput = document.createElement('input');
		cellSizeInput.id = 'isochrone-cell-size';
		cellSizeInput.type = 'number';
		cellSizeInput.value = 0.1;
		cellSizeInput.min = 0.1;
		cellSizeInput.step = 0.1;
		cellSizeInput.style.width = '100%';
		tColCellSize2.appendChild(cellSizeInput);
		tRowCellSize.appendChild(tColCellSize2);
		tBody.appendChild(tRowCellSize);

		const tFootRow = document.createElement('tr');
		const tFootCol = document.createElement('td');
		tFootCol.colSpan = 2;
		tFootCol.style.textAlign = 'center';
		const applyChangesButton = document.createElement('button');
		applyChangesButton.id = 'isochrone-apply-settings';
		applyChangesButton.appendChild(document.createTextNode('apply'));
		applyChangesButton.addEventListener('click', () => {
			isochroneDemo.refreshIsoChrone(isochroneDemo.getMarkerCenter());
		});
		tFootCol.appendChild(applyChangesButton);
		tFootRow.appendChild(tFootCol);
		tFoot.appendChild(tFootRow);

		contentContainer.appendChild(table);

		container.appendChild(contentContainer);

		return container;
	},
	_mouseover: function() {
		console.log('_mouseover');
	},
	_mouseout: function() {
		console.log('_mouseout');
	}
});

L.control.isochrone = function(opts) {
	return new L.Control.IsoChrone(opts);
}

document.addEventListener('DOMContentLoaded', () => {
	isochroneDemo = new IsoChroneDemo();
});
