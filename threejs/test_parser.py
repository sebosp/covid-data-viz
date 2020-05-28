#!/usr/bin/env python
import unittest
import transform
from CSSEGISandData import CSSEGISandDataHelper
from CSSEGISandData import CSSEGISandData
import json
import logging
import utils

logger = logging.getLogger()
logger.level = logging.ERROR


class TestParsing(unittest.TestCase):

    def setUp(self):
        """
        Let's setup some variables to avoid hardcoding
        """
        # Our test world has a country named "Country" with a population of 100
        self.world_population = 100
        self.world_population_dataset = dict()
        self.world_population_dataset["Country"] = 100

    def test_parse_header(self):
        """
        Tests a basic header, the dates are out of order intentionally, other methods sort them
        returns the CSSEGISandData object for others to use
        """
        header = "Province,Country,Lat,Long,1/21/20,1/22/20".split(",")
        csse_handler = CSSEGISandData(logger)
        csse_handler.parse_header(header)
        header_dates = csse_handler.date_keys
        self.assertEqual(header_dates[0], "20-01-21")
        self.assertEqual(header_dates[1], "20-01-22")
        return csse_handler

    def test_parse_data(self):
        csse_handler = self.test_parse_header()
        # In this test record, the latitude is "0" and the longitude is "80"
        data_array = "Province,Country,0,80,5,6".split(",")
        gps_key, parsed_daily_data = csse_handler.parse_data_line(data_array)
        self.assertEqual(gps_key, "0,80,Country - Province")
        first_day_record = parsed_daily_data.get("20-01-21")
        self.assertIsNotNone(first_day_record)
        self.assertEqual(first_day_record, {
                         "cumulative": 5, "day": 5, "delta": 0})
        second_day_record = parsed_daily_data.get("20-01-22")
        self.assertIsNotNone(second_day_record)
        self.assertEqual(second_day_record, {
                         "cumulative": 6, "day": 1, "delta": -4})
        # Return a dict for future re-use
        test_data = dict()
        test_data[gps_key] = parsed_daily_data
        return test_data

    def test_find_top_cumulative(self):
        csse_handler = self.test_parse_header()
        test_data = self.test_parse_data()
        day_stats = csse_handler.get_stats_for_day(
            test_data, "20-01-22", self.world_population_dataset, self.world_population)
        self.assertEqual(day_stats["top_cumulative"], {
                         "value": 6, "location_idx": 0})

    def test_scale_daily_values(self):
        test_data = self.test_parse_data()
        gps_record = test_data.get("0,80,Country - Province")
        self.assertIsNotNone(gps_record)
        first_day_data = gps_record.get("20-01-21")
        self.assertEqual(first_day_data, {
                         "cumulative":  5, "day": 5, "delta": 0})
        second_day_data = gps_record.get("20-01-22")
        self.assertEqual(second_day_data, {
                         "cumulative": 6, "day": 1, "delta": -4})

    def test_generate_globe_json(self):
        csse_handler = self.test_parse_header()
        test_data = self.test_parse_data()
        self.maxDiff = 3000
        globe_json = csse_handler.generate_globe_json_string(
            test_data, self.world_population_dataset, self.world_population, pretty_print=False)
        expected_json_string = """
          {
            "locations": [
              {
                "lat": 0.0,
                "lng": 80.0,
                "location": "Country - Province",
                "values": [
                  [ 5, 5, 0 ],
                  [ 6, 1, -4 ]
                ],
                "population_2020": 0
              }
            ],
            "series_stats": [
              {
                "name": "20-01-21",
                "top_cumulative": {
                  "value": 5,
                  "location_idx": 0
                },
                "top_day": {
                  "value": 5,
                  "location_idx": 0
                },
                "top_delta": {
                  "value": 0,
                  "location_idx": 0
                },
                "top_cumulative_percent": {
                  "value": 0,
                  "location_idx": 0
                },
                "cumulative_global": 5,
                "cumulative_global_percent": 5.0,
                "day_global": 5,
                "delta_global": 0
              },
              {
                "name": "20-01-22",
                "top_cumulative": {
                  "value": 6,
                  "location_idx": 0
                },
                "top_day": {
                  "value": 1,
                  "location_idx": 0
                },
                "top_delta": {
                  "value": 4,
                  "location_idx": 0
                },
                "top_cumulative_percent": {
                  "value": 0,
                  "location_idx": 0
                },
                "cumulative_global": 6,
                "cumulative_global_percent": 6.0,
                "day_global": 1,
                "delta_global": -4
              }
            ]
          }
        """
        self.assertEqual(globe_json, json.dumps(
            json.loads(expected_json_string)))

    def test_merge_gps_records(self):
        csse_handler = self.test_parse_header()
        lhs_data = self.test_parse_data()
        second_data_array = "Province,Country,10,5,1,5".split(",")
        gps_key, parsed_daily_data = csse_handler.parse_data_line(
            second_data_array)
        rhs_data = dict()
        rhs_data[gps_key] = parsed_daily_data
        merged_records = utils.merge_dict(lhs_data, rhs_data)
        first_data = merged_records.get("0,80,Country - Province")
        self.assertIsNotNone(first_data)
        self.assertEqual(first_data, lhs_data.get(
            "0,80,Country - Province"))
        second_data = merged_records.get("10,5,Country - Province")
        self.assertIsNotNone(second_data)
        self.assertEqual(second_data, rhs_data.get(
            "10,5,Country - Province"))


if __name__ == '__main__':
    unittest.main()
