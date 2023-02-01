/* eslint-disable no-undef */

class IsoChroneDemo {
	constructor() {
		this._polygons = [];
		this._circles = [];
		this._marker = null;
		this._center = [53.0758196, 8.8071646];
		this._map = L.map('map').setView(this._center, 13);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this._map);

		fetch('api/providers/list')
			.then(res => res.json())
			.then(json => {
				const controlOptions = {
					position: 'topright'
				};
				if (json.providers) {
					controlOptions.providers = json.providers;
				}
				if (json.default) {
					controlOptions.defaultProvider = json.default;
				}
				L.control
					.isochrone(controlOptions)
					.addTo(this._map);

				this._marker = L.marker(this._center, {
					draggable: true
				});
				this._marker.addTo(this._map);
				this._marker.on('moveend', (evt) => {
					this.refreshIsoChrone(evt.target.getLatLng());
				});

				this.refreshIsoChrone(this._marker.getLatLng());
			});
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

	get Deintersect() {
		let deintersect = false;

		const deintersectInput = document.getElementById('isochrone-deintersect');
		if (deintersectInput instanceof HTMLInputElement) {
			deintersect = deintersectInput.checked;
		}

		return deintersect;
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

	get Provider() {
		let provider = '';

		const providerSelect = document.getElementById('isochrone-provider');
		if (providerSelect instanceof HTMLSelectElement) {
			provider = providerSelect.value;
		}

		return provider;
	}

	get Radius() {
		let radius = -1;

		const radiusInput = document.getElementById('isochrone-radius');
		if (radiusInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(radiusInput.value);
			if (!isNaN(parsedInput)) {
				radius = parsedInput;
			}
		}

		return radius;
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
				coordinates: [center.lng, center.lat]
			},
			deintersect: this.Deintersect,
			provider: this.Provider,
			intervals,
			radius: this.Radius
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

				let oldPolygon;
				while((oldPolygon = this._polygons.pop())) {
					oldPolygon.remove();
				}
				let oldCircle;
				while((oldCircle = this._circles.pop())) {
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
						leafletCoordinates.push(leafletCoordinatesSub);
					}

					return leafletCoordinates;
				};

				const colors = ['lime', 'yellow', 'red'];
				let polygonCounter = 0;
				let featuresCount = 0;

				switch(json.type) {
					case 'Feature':
						alert(`unhandled geojson-type: ${json.type}`);
						break;

					case 'FeatureCollection':
						if (!(json.features instanceof Array)) {
							alert('geojson-features is not an array');
							break;
						}

						featuresCount = json.features.length;
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

							const color = colors[featuresCount - 1 - polygonCounter] || 'white';

							let leafletCoordinates;
							let polygon;
							let multiPolygon;
							let multiCoordinates;
							switch(geometry.type) {
								case 'Polygon':
									leafletCoordinates = reverseLatLongCoordinates(geometry.coordinates);
									polygon = L.polygon(leafletCoordinates, { color });
									polygon.addTo(this._map);
									this._polygons.push(polygon);

									polygonCounter++;
									break;

								case 'MultiPolygon':
									multiCoordinates = geometry.coordinates;
									for(const i in multiCoordinates) {
										multiCoordinates[i] = reverseLatLongCoordinates(multiCoordinates[i]);
									}
									multiPolygon = L.polygon(multiCoordinates, { color });
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
				let oldPolygon;
				while((oldPolygon = this._polygons.pop())) {
					oldPolygon.remove();
				}
				let oldCircle;
				while((oldCircle = this._circles.pop())) {
					oldCircle.remove();
				}
				alert(exc);
			});
	}
}

let isochroneDemo = null;

L.Control.IsoChrone = L.Control.extend({
	onAdd: function(_map) {
		const buildCheckboxInputRow = function(col1Content, inputId, defaults) {
			const tRow = document.createElement('tr');
			const tCol1 = document.createElement('td');
			const label = document.createElement('label');
			label.setAttribute('for', inputId);
			label.appendChild(document.createTextNode(col1Content));
			tCol1.appendChild(label);
			tRow.appendChild(tCol1);
			const tCol2 = document.createElement('td');
			tCol2.style.width = '75px';
			const input = document.createElement('input');
			input.id = inputId;
			input.type = 'checkbox';
			if (defaults) {
				if (typeof defaults.checked === 'boolean') {
					input.checked = defaults.checked;
				}
			}
			input.style.width = '100%';
			tCol2.appendChild(input);
			tRow.appendChild(tCol2);

			return tRow;
		};

		const buildNumberInputRow = function(col1Content, inputId, defaults) {
			const tRow = document.createElement('tr');
			const tCol1 = document.createElement('td');
			const label = document.createElement('label');
			label.setAttribute('for', inputId);
			label.appendChild(document.createTextNode(col1Content));
			tCol1.appendChild(label);
			tRow.appendChild(tCol1);
			const tCol2 = document.createElement('td');
			tCol2.style.width = '75px';
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
			tCol2.appendChild(input);
			tRow.appendChild(tCol2);

			return tRow;
		};

		const buildSelectRow = function(col1Content, selectId, values, defaultValue) {
			const tRow = document.createElement('tr');
			const tCol1 = document.createElement('td');
			const label = document.createElement('label');
			label.setAttribute('for', selectId);
			label.appendChild(document.createTextNode(col1Content));
			tCol1.appendChild(label);
			const tCol2 = document.createElement('td');
			const select = document.createElement('select');
			select.id = selectId;
			select.style.width = '100%';
			for(const provider of values) {
				const providerOption = document.createElement('option');
				providerOption.value = provider;
				if (provider === defaultValue) {
					providerOption.selected = true;
				}
				providerOption.appendChild(document.createTextNode(provider));
				select.appendChild(providerOption);
			}
			tCol2.appendChild(select);
			tRow.appendChild(tCol1);
			tRow.appendChild(tCol2);

			return tRow;
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

		const providers = [];
		if (this.options.providers instanceof Array) {
			for(const provider of this.options.providers) {
				providers.push(provider);
			}
		}
		const defaultProvider = this.options.defaultProvider || '';
		const tRowProvider = buildSelectRow('provider:', 'isochrone-provider', providers, defaultProvider);
		tBody.appendChild(tRowProvider);

		const tRowInterval1 = buildNumberInputRow('interval 1 (min):', 'isochrone-interval-1', { value: 2, min: 0.1, step: 0.1 });
		tBody.appendChild(tRowInterval1);

		const tRowInterval2 = buildNumberInputRow('interval 2 (min):', 'isochrone-interval-2', { value: 0, min: 0, step: 0.1 });
		tBody.appendChild(tRowInterval2);

		const tRowInterval3 = buildNumberInputRow('interval 3 (min):', 'isochrone-interval-3', { value: 0, min: 0, step: 0.1 });
		tBody.appendChild(tRowInterval3);

		const tRowRadius = buildNumberInputRow('radius (km):', 'isochrone-radius', { value: -1, min: -1, step: 1 });
		tBody.appendChild(tRowRadius);

		const tRowCellSize = buildNumberInputRow('cell-size (km):', 'isochrone-cell-size', { value: 0.1, min: 0.1, step: 0.1 });
		tBody.appendChild(tRowCellSize);

		const tRowDeintersect = buildCheckboxInputRow('deintersect:', 'isochrone-deintersect', { checked: true });
		tBody.appendChild(tRowDeintersect);

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
	}
});

L.control.isochrone = function(opts) {
	return new L.Control.IsoChrone(opts);
};

document.addEventListener('DOMContentLoaded', () => {
	isochroneDemo = new IsoChroneDemo();
});
