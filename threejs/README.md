# ThreeJS representation of the covid data.

The source of the data is the same as the parent directory:
[covid-19 repository](https://github.com/CSSEGISandData/COVID-19]

## Data Processing

The script transform.py uses the data from the above repo. It doesn't download it, and the path is hardcoded.

The data from the repo is cummulative. The script uses this data to provide:
- Cummulative (uses the raw data)
- Daily (Substracts the current day cummulate from the previous day cummulative)
- Daily trend, the data from the current day (daily) is substracted from the previous day (daily) value.
  This allows to identify easily a trend.

## D3 
The type of data being drawn can be selected by clicking on the `present_to_all` icon. This is not intuitive.
Clicking the same icon toggles between the daily with icon `today` and lastly clicking again activated the trend
day with icon `change_history`.


## TODO
- Add screenshots
- Dropdown with icons for selection with labels.
- When clicking on the dropdowns, down/up arrow activates it, which collides with the zoom of the globe
- Add a country dropdown to jump manually and see stats
- Doesn't work on iPhone

## In Progress
- Include population per country

## Done
- Download the data from the git repo instead of needing git pull
- The data for Lithuania contains a drop in cumulative_global, this means that when drawing daily, we will have to use a minimum by default 0 but should find if something is below it
- The graphs for delay can also contain negative values and so the graph should include the x axis at 0 marker.
- The python created structs use "lon" instead of "lng" which is only going to lead to trouble. Rename.
- The globe constantly rotates, so the received latitude could be more than 180 degrees or less than 180 degrees
