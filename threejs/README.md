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
- Download the data from the git repo instead of needing git pull
- Doesn't work on iPhone
