#!/usr/bin/env python
import unittest
import transform

class TestParsing(unittest.TestCase):

  def test_parse_header(self):
    """
    Tests a basic header, the dates are out of order intentionally, other methods sort them
    """
    header = "Province,Country,Lat,Long,1/22/20,1/1/20".split(",")
    header_dates = transform.parse_header(header)
    self.assertEqual(header_dates[0], "20-01-22")
    self.assertEqual(header_dates[1], "20-01-01")
    return header_dates

  def test_parse_data(self):
    header_dates = self.test_parse_header()
    # In this test record, the latitude is "0" and the longitude is "80"
    data_array = "Province,Country,0,80,1,5".split(",")
    gps_key, parsed_daily_data = transform.parse_data_line(data_array, header_dates)
    self.assertEqual(gps_key, "0,80")
    first_day_record = parsed_daily_data.get("20-01-22")
    self.assertIsNotNone(first_day_record)
    self.assertEqual(first_day_record, "1")
    second_day_record = parsed_daily_data.get("20-01-01")
    self.assertIsNotNone(second_day_record)
    self.assertEqual(second_day_record, "5")
    # Return a dict for future re-use
    test_data = dict()
    test_data[gps_key] = parsed_daily_data
    return test_data

  def test_find_max_value(self):
    test_data = self.test_parse_data()
    self.assertEqual(transform.find_max_value(test_data), 5)

  def test_find_max_value(self):
    test_data = self.test_parse_data()
    scaled_data = transform.scale_daily_values(test_data)
    gps_record = scaled_data.get("0,80")
    self.assertIsNotNone(gps_record)
    first_day_data = gps_record.get("20-01-22")
    self.assertEqual(first_day_data, 0.2)
    second_day_data = gps_record.get("20-01-01")
    self.assertEqual(second_day_data, 1)

  def test_generate_globe_json(self):
    test_data = self.test_parse_data()
    scaled_data = transform.scale_daily_values(test_data)
    globe_json = transform.generate_globe_json_string(scaled_data, pretty_print=False)
    self.assertEqual(globe_json, '[["20-01-22", [0.0, 80.0, 0.2]], ["20-01-01", [0.0, 80.0, 1.0]]]')

if __name__ == '__main__':
  unittest.main()
