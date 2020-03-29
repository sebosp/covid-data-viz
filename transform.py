#!/usr/bin/env python
"""
This file transforms 
https://github.com/CSSEGISandData/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv
into the expected format for the webgl map:
https://github.com/dataarts/webgl-globe#data-format
"""

import logging
import calendar
import json
import csv
from pprint import pprint

def parse_header(header_array, offset_dates=4):
  """
  The header line is composed of: Province/State,Country/Region,Lat,Long,Day1,Day2,Day3
  """
  # Province/State, Country/Region, Lat, Long
  # Let's save the offsets:
  logger = logging.getLogger("parse_header")
  date_keys = []
  for date_item in header_array[offset_dates:]:
    # date_items look like 2/11/02
    (month, day, year) = date_item.split("/")
    # Zero-pad to 2 "digits" month and day
    day = day.rjust(2, '0')
    month = month.rjust(2, '0')
    new_date_key = "{}-{}-{}".format(year, month, day)
    # logger.debug("New date %s makes key: %s", date_item, new_date_key)
    date_keys.append(new_date_key)
  logger.info("Found date_keys: %s", date_keys)
  return date_keys

def parse_data_line(data_array, date_keys, offset_dates=4):
  """
  The data line is composed of: SomeProvince/SomeState,SomeCountry/SomeRegion,Lat0,Long0,Day1Value,Day2Value,Day3Value
  :returns tuple: ("Lat,Long", [{"Year-Mothh-Day",DayValue},{}])
  """
  res = dict()
  logger = logging.getLogger("parse_data_line")
  lat = data_array[2]
  lon = data_array[3]
  gps_key = "{},{}".format(lat,lon)
  for date_idx, date_item in enumerate(data_array[offset_dates:]):
    current_column_date = date_keys[date_idx]
    # logger.debug("Found data %s for day: %s", date_item, current_column_date)
    # Not really GPS, just lat,lon
    res[current_column_date] = date_item
  return (gps_key, res)

def parse_csv_file(fname):
  """
  :param fname str: The filename to parse
  :returns dict with {"lat,long":[{"2020-02-01":100,"Feb"}]
  """
  logger = logging.getLogger("parse_csv_file")
  logger.info("Starting to parse file %s", fname)
  res = dict()
  date_keys = []
  with open(fname) as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',',quotechar='"')
    for lineno, csv_line in enumerate(csv_reader):
      # Remove the new line:
      # The first items in the CSV are:
      if lineno == 0:
        date_keys = parse_header(csv_line)
      else: # This is not the header
        gps_key, gps_daily_data = parse_data_line(csv_line, date_keys)
        res[gps_key] = gps_daily_data
  logger.info("Finished parsing file")
  return res

def find_max_value(gps_records):
  """
  Iterates over the values of the gps data and days and returns the max value
  """
  logger = logging.getLogger("find_max_value")
  max = 0
  for gps_location, gps_data in gps_records.items():
    for day_dx, day_data in gps_data.items():
      day_value_int = int(day_data)
      if max < day_value_int:
        max = day_value_int
  logger.info("Found max value %s", max)
  return max

def scale_daily_values(gps_records):
  """
  Scales values from 1.0 to 0.0
  :returns new dict with scaled values
  """
  logger = logging.getLogger("scale_daily_values")
  logger.info("Starting to scale values")
  res = dict()
  max_value = find_max_value(gps_records)
  for gps_location, gps_data in gps_records.items():
    res[gps_location] = dict()
    for day_idx, day_data in gps_data.items():
      day_value_int = int(day_data)
      scaled_value = day_value_int / max_value
      res[gps_location][day_idx] = scaled_value
      #logger.debug("Scaled %s to %s", day_data, scaled_value)
  logger.info("Finished scaling values")
  return res

def generate_globe_json_string(gps_scaled_records, pretty_print=True):
  """
  Returns a JSON object that can be loaded into the google webgl map
  Data format: https://github.com/dataarts/webgl-globe#data-format
  """
  logger = logging.getLogger("generate_globe_json_string")
  logger.info("Starting creating array structs for the JSON")
  res = []
  daily_series = []
  # First, let's scan day indexes, they will become series and be in the dropdown:
  for lat_lon_idx, lat_lon_data in gps_scaled_records.items():
    for day_idx, day_data in lat_lon_data.items():
      daily_series.append(day_idx)
  # Let's make the series unique
  daily_series = set(daily_series)
  logger.debug("Daily series identified: %s", daily_series)
  # Now let's push the scaled data:
  for series in daily_series:
    logger.debug("Starting filling series %s", series)
    day_array = []
    for lat_lon_idx, lat_lon_data in gps_scaled_records.items():
      for day_idx, day_data in lat_lon_data.items():
        if day_idx == series:
          lat,lon = lat_lon_idx.split(",")
          lat = float(lat)
          lon = float(lon)
          day_array.append(lat)
          day_array.append(lon)
          day_array.append(float(f"{day_data:.3f}"))
    logger.debug("Finished filling series")
    daily_res = []
    daily_res.append(series)
    daily_res.append(day_array)
    res.append(daily_res)
  logger.info("Finished creating array structs for the JSON")
  if pretty_print:
    return json.dumps(res, sort_keys=True, indent=2)
  else:
    return json.dumps(res)


def print_current_info_div(gps_scaled_records):
  """
  Iterates over the parsed and scaled records to find the unique series and print <spans> to populate the dropdown
  """
  daily_series = []
  js_day_array = []
  for lat_lon_idx, lat_lon_data in gps_scaled_records.items():
    for day_idx, day_data in lat_lon_data.items():
      daily_series.append(day_idx)
  # Let's make the series unique
  daily_series = set(daily_series)
  for series in sorted(daily_series):
    span_id = series
    date_components = series.split("-")
    span_value = "{}/{}/{}".format(date_components[1],date_components[2],date_components[0])
    print("    <span id=\"{}\" class=\"day\">{}</span>".format(span_id,span_value))
    js_day_array.append("'{}'".format(series))
  print("var days = [{}];".format(",".join(js_day_array)))

def main():
  logging.basicConfig(level=logging.INFO)
  confirmed_gps_data = parse_csv_file("../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv")
  scaled_confirmed_data = scale_daily_values(confirmed_gps_data)
  logging.info("Writing data/confirmed.json")
  with open("data/confirmed.json", "w") as file_handle:
    file_handle.write(generate_globe_json_string(scaled_confirmed_data))
  logging.info("Finished writing data/confirmed.json")
  deaths_gps_data = parse_csv_file("../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv")
  scaled_deaths_data = scale_daily_values(deaths_gps_data)
  logging.info("Writing data/deaths.json")
  with open("data/deaths.json", "w") as file_handle:
    file_handle.write(generate_globe_json_string(scaled_deaths_data))
  logging.info("Finished writing data/deaths.json")
  print_current_info_div(scaled_confirmed_data)

if __name__ == "__main__":
  main()
