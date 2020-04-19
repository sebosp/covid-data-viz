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


def parse_header(header_array, USFileType=False, offset_dates=None):
    """
    The header line is composed of: Province/State,Country/Region,Lat,Long,Day1,Day2,Day3
    :param header_array list: The header line split already by commas
    :param USFileType bool: Wether we should include only US or exclude US
    :param offset_dates int: override the default calculation of offset_dates
    """
    # Province/State, Country/Region, Lat, Long
    logger = logging.getLogger("parse_header")
    date_keys = []
    if offset_dates is None:
        if USFileType:
            offset_dates = 11
        else:
            offset_dates = 4
    for date_item in header_array[offset_dates:]:
        # date_items look like 2/11/02
        (month, day, year) = date_item.split("/")
        # Zero-pad to 2 "digits" month and day
        day = day.rjust(2, '0')
        month = month.rjust(2, '0')
        new_date_key = "{}-{}-{}".format(year, month, day)
        logger.debug("New date %s makes key: %s", date_item, new_date_key)
        date_keys.append(new_date_key)
    logger.info("Found date_keys: %s", date_keys)
    return date_keys


def parse_data_line(data_array, date_keys, USFileType=False, offset_dates=None, forceProcessUS=False):
    """
    The data line is composed of: SomeProvince/SomeState,SomeCountry/SomeRegion,Lat0,Long0,Day1Value,Day2Value,Day3Value
    :param data_array list: A line split already by commas
    :param date_keys list: A list of dates to fill from the data array
    :param USFileType bool: Mark the records as being from either US filetype or not
    :param offset_dates int: override the default calculation of offset_dates
    :param forceProcessUS bool: Mark the records as needing to be forcefully processed or not
    :returns tuple: ("Lat,Long,Country - Region,True,True", [{"Year-Mothh-Day":{"absolute": DayValue}},{}])
    """
    res = dict()
    logger = logging.getLogger("parse_data_line")
    if USFileType:
        country_region = "{} - {}".format(data_array[7].replace(
            ",", ""), data_array[6].replace(",", ""))
        if data_array[5]:
            country_region = "{} - {}".format(country_region, data_array[5])
        lat = data_array[8]
        lon = data_array[9]
        if offset_dates is None:
            offset_dates = 11
    else:
        country_region = data_array[1].replace(",", "")
        if data_array[0]:
            country_region = "{} - {}".format(country_region,
                                              data_array[0].replace(",", ""))
        lat = data_array[2]
        lon = data_array[3]
        if offset_dates is None:
            offset_dates = 4
    gps_key = "{},{},{},{},{}".format(
        lat, lon, country_region, USFileType, forceProcessUS)
    for date_idx, date_item in enumerate(data_array[offset_dates:]):
        current_column_date = date_keys[date_idx]
        logger.debug("Found data %s for day: %s",
                     date_item, current_column_date)
        # Not really GPS, just lat,lon
        res[current_column_date] = {"absolute": int(float(date_item))}
    return (gps_key, res)


def parse_csv_file(fname, USFileType=False, offset_dates=None, forceProcessUS=False):
    """
    :param fname str: The filename to parse
    :param USFileType bool: Mark the records as being from either US filetype or not
    :param offset_dates int: override the default calculation of offset_dates
    :param forceProcessUS bool: Mark the records as needing to be forcefully processed or not
    :returns tuple like (["date1","date2"]{"lat,long":[{"2020-02-01":{"absolute": 100}}])
    """
    logger = logging.getLogger("parse_csv_file")
    logger.info("Starting to parse file %s", fname)
    res = dict()
    date_keys = []
    with open(fname) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',', quotechar='"')
        for lineno, csv_line in enumerate(csv_reader):
            # Remove the new line:
            # The first items in the CSV are:
            if lineno == 0:
                date_keys = parse_header(csv_line, USFileType, offset_dates)
            else:  # This is not the header
                gps_key, gps_daily_data = parse_data_line(
                    csv_line,
                    date_keys,
                    USFileType=USFileType,
                    offset_dates=offset_dates,
                    forceProcessUS=forceProcessUS)
                res[gps_key] = gps_daily_data
    logger.info("Finished parsing file")
    return (date_keys, res)


def find_max_value(gps_records):
    """
    Iterates over the values of the gps data and days and returns the max value
    """
    logger = logging.getLogger("find_max_value")
    max = 0
    for _, gps_data in gps_records.items():
        for _, day_data in gps_data.items():
            day_value_int = int(day_data["absolute"])
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
            day_value_int = int(day_data["absolute"])
            scaled_value = day_value_int / max_value
            res[gps_location][day_idx] = {
                "scaled": scaled_value,
                "absolute": day_value_int}
            #logger.debug("Scaled %s to %s", day_data, scaled_value)
    logger.info("Finished scaling values")
    return res


def get_stats_for_day(gps_scaled_records, series_key):
    """
    Returns a dict with collected stats for a given day.
    :param gps_scaled_records dict: The per-day gps records with their scaled values
    :param series_key: The 0 indexed day from the start of our dataset
    :returns: dict with {"top_cummulative": {"value": X, "location_idx": Y}, "total": Z}
    """
    res = dict()
    res["name"] = series_key
    res["top_cummulative"] = dict()
    res["top_cummulative"]["value"] = 0
    res["top_cummulative"]["location_idx"] = 0
    day_total = 0
    location_number = 0
    for _lat_lon_key, lat_lon_data in gps_scaled_records.items():
        for day_key, day_data in lat_lon_data.items():
            if day_key == series_key:
                day_total += day_data["absolute"]
                if day_data["absolute"] > res["top_cummulative"]["value"]:
                    res["top_cummulative"]["value"] = day_data["absolute"]
                    res["top_cummulative"]["location_idx"] = location_number
        location_number += 1
    return res


def generate_globe_json_string(gps_scaled_records, daily_series, pretty_print=False):
    """
    Returns a JSON object that can be loaded into the google webgl map
      file_handle.write(generate_globe_json_string(scaled_deaths_data, date_keys))
    :param gps_scaled_records dict: The per-day gps records with their scaled values
    :param daily_series list: The list of days that we are filling
    :param pretty_print bool: human readable json structures
    Data format: https://github.com/dataarts/webgl-globe#data-format
    """
    logger = logging.getLogger("generate_globe_json_string")
    logger.info("Starting creating array structs for the JSON")
    # First, let's scan day indexes, they will become series and be in the dropdown:
    locations = []
    series_stats = []
    # Let's push the locations and their daily values scaled
    for lat_lon_key, lat_lon_data in gps_scaled_records.items():
        lat, lon, location, USFileType, forceProcessUS = lat_lon_key.split(",")
        lat = float(lat)
        lon = float(lon)
        day_array = []
        for _day_key, day_data in lat_lon_data.items():
            day_value = day_data["scaled"]
            day_value_rounded = float(f"{day_value:.3f}")
            if USFileType == "False" and location == "US" and forceProcessUS == "False":
                # The data for US in this filetype is aggregated, let's skip it to avoid counting twice
                # Because we are using indexes, let's append 0.0 to keep consistency instead of a missing index
                day_array.append(0.0)
            else:
                day_array.append(day_value_rounded)
        location_struct = dict()
        location_struct["lat"] = lat
        location_struct["lon"] = lon
        location_struct["location"] = location
        location_struct["values"] = day_array
        locations.append(location_struct)
    # Now let's push stats for the day
    logger.debug("Daily series identified: %s", daily_series)
    for series in sorted(daily_series):
        day_stats = get_stats_for_day(gps_scaled_records, series)
        series_stats.append(day_stats)
    logger.info("Finished calculations for JSON structure")
    res = dict()
    res["locations"] = locations
    res["series_stats"] = series_stats
    if pretty_print:
        return json.dumps(res, sort_keys=True, indent=2)
    else:
        return json.dumps(res)


def merge_gps_records(lhs, rhs):
    """
    Merges two sets of records of type: {"Lat,Lon":{"2020-01-02":"0.5"}}
    :returns a new dict with the merged keys
    """
    return {**lhs, **rhs}


def print_current_info_div(gps_scaled_records, daily_series):
    """
    Iterates over the parsed and scaled records to find the unique series and print <spans> to populate the dropdown
    """
    js_day_array = []
    for _, lat_lon_data in gps_scaled_records.items():
        for day_idx, _ in lat_lon_data.items():
            daily_series.append(day_idx)
    # Let's make the series unique
    daily_series = set(daily_series)
    for series in sorted(daily_series):
        span_id = series
        date_components = series.split("-")
        span_value = "{}/{}/{}".format(
            date_components[1], date_components[2], date_components[0])
        print("    <span id=\"{}\" class=\"day\">{}</span>".format(span_id, span_value))
        js_day_array.append("'{}'".format(series))
    print("var days = [{}];".format(",".join(js_day_array)))


def process_confirmed():
    """
    Processes the global confirmed file
    """
    date_keys, global_confirmed_gps_data = parse_csv_file(
        "../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv", USFileType=False)
    _date_keys, us_confirmed_gps_data = parse_csv_file(
        "../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv", USFileType=True)
    confirmed_gps_data = merge_gps_records(
        global_confirmed_gps_data, us_confirmed_gps_data)
    scaled_confirmed_data = scale_daily_values(confirmed_gps_data)
    logging.info("Writing data/confirmed.json")
    with open("data/confirmed.json", "w") as file_handle:
        file_handle.write(generate_globe_json_string(
            scaled_confirmed_data, date_keys))
    logging.info("Finished writing data/confirmed.json")


def process_deaths():
    """
    Processes the global confirmed file
    """
    date_keys, global_deaths_gps_data = parse_csv_file(
        "../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv", USFileType=False)
    _date_keys, us_deaths_gps_data = parse_csv_file(
        "../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv", USFileType=True, offset_dates=12)
    deaths_gps_data = merge_gps_records(
        global_deaths_gps_data, us_deaths_gps_data)
    scaled_deaths_data = scale_daily_values(deaths_gps_data)
    logging.info("Writing data/deaths.json")
    with open("data/deaths.json", "w") as file_handle:
        file_handle.write(generate_globe_json_string(
            scaled_deaths_data, date_keys))
    logging.info("Finished writing data/deaths.json")


def process_recovered():
    date_keys, global_recovered_gps_data = parse_csv_file(
        "../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv", USFileType=False, forceProcessUS=True)
    #_date_keys, us_recovered_gps_data = parse_csv_file("../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_US.csv", USFileType=True)
    # There's no recovered dataset for US
    us_recovered_gps_data = dict()
    recovered_gps_data = merge_gps_records(
        global_recovered_gps_data, us_recovered_gps_data)
    scaled_recovered_data = scale_daily_values(recovered_gps_data)
    logging.info("Writing data/recovered.json")
    with open("data/recovered.json", "w") as file_handle:
        file_handle.write(generate_globe_json_string(
            scaled_recovered_data, date_keys))
    logging.info("Finished writing data/recovered.json")


def main():
    logging.basicConfig(level=logging.INFO)
    process_confirmed()
    process_deaths()
    process_recovered()


if __name__ == "__main__":
    main()
