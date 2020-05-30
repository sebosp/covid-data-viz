# Covid Data Viz

## D3 visualizations
In the root of this repo, contains D3 charts related to the data available from [CSSEGISandData repo](https://github.com/CSSEGISandData/COVID-19)
The data is downloaded from github into the browser and parsed there.
[View online](https://sebosp.github.io/covid-data-viz/)

### Screenshots

#### From Day 1
Shows data from the start of the pandemic.
![FromDay1](https://user-images.githubusercontent.com/873436/83337473-f3239180-a2bb-11ea-8bf4-488d67a941ba.png)

#### From Patient zero
Shows how the spread compares between the countries since their first confirmed infection.
![FromPatient1](https://user-images.githubusercontent.com/873436/83337507-37af2d00-a2bc-11ea-8d3e-501536e2b141.png)

## threejs visualizations
The data for ThreeJS is parsed and files in `threejs/data/` are generated on each run, this is for now a daily operation.
The date can be changed on the browser so that we can see through time each dataset and how it changes.
When a new date is selected, the top field is centered (unless the "autofocus" toggle is set to false.

[View online](https://sebosp.github.io/covid-data-viz/threejs/)

### Screenshots

#### Confirmed dataset
The start state, showing the cumulative confirmed records, centered on the current day's top location and showing a D3 graph for the confirmed history

![threejs-start-confirmed](https://user-images.githubusercontent.com/873436/83337572-e9e6f480-a2bc-11ea-8870-868be3f611ed.png)

#### Focusing other countries
Moving the globe is done with the mouse, click and hold and rotate.
If there are known regions close to the centered view,
the closest region will appear and the D3 graph will be updated.
![threejs-focusing-other-countries](https://user-images.githubusercontent.com/873436/83337607-4f3ae580-a2bd-11ea-8c8d-26e46216a81b.png)

#### Available datasets
The available datasets are:
- Confirmed
- Deaths
- Recovered (There is no specific file dedicated to US recovered (only global dataset exists))

![threejs-available-datasets](https://user-images.githubusercontent.com/873436/83337675-d2f4d200-a2bd-11ea-8a6e-44662165ffcf.png)

#### Accesing the deaths dataset
![threejs-deaths](https://user-images.githubusercontent.com/873436/83337750-2b2bd400-a2be-11ea-96c6-d16b1c893eaf.png)

#### Cases vs country population percent dataset
Using the worldometers population for 2020, the percentage of affected cases is shown.
This is experimental, the data in worldometers is per country and the data in the CSSEGISandData is sometimes over a specific country's location.
This should be fixed soon.
![threejs-percent-population](https://user-images.githubusercontent.com/873436/83337719-0172ad00-a2be-11ea-8088-6a5aa98feaf6.png)


#### Available aggregations
Based on the time_series cumulative data, we can infer certain numbers:
- Cumulative: raw value acquired
- Daily: The increase/decrease of the value per day in the cumulative
- Daily delta: The previous day's value vs the current day's value
![threejs-available-aggregations](https://user-images.githubusercontent.com/873436/83337756-367eff80-a2be-11ea-8f03-b32f6711d7e7.png)

#### Accesing the daily aggregation
When the bars are green, it shows the daily values fora location is doing better (less infections, less deaths, more recovered)
When the bars are light-blue, it means the current day increment is zero
![threejs-daily](https://user-images.githubusercontent.com/873436/83337789-7645e700-a2be-11ea-83c3-e3d934b1f324.png)

#### Accesing the daily-delta aggregation
Same logic of colors of green/light-blue as daily-aggregation.
This is the daily from the day before to the current day.
![threejs-daily-delta](https://user-images.githubusercontent.com/873436/83338184-0df90480-a2c2-11ea-9cd8-cbb6f00ad90e.png)
