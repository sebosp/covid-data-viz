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
        gps_key, parsed_daily_data = transform.parse_data_line(
            data_array, header_dates)
        self.assertEqual(gps_key, "0,80,Country - Province,False,False")
        first_day_record = parsed_daily_data.get("20-01-22")
        self.assertIsNotNone(first_day_record)
        self.assertEqual(first_day_record, {"abs": 1})
        second_day_record = parsed_daily_data.get("20-01-01")
        self.assertIsNotNone(second_day_record)
        self.assertEqual(second_day_record, {"abs": 5})
        # Return a dict for future re-use
        test_data = dict()
        test_data[gps_key] = parsed_daily_data
        return test_data

    def test_find_max_value(self):
        test_data = self.test_parse_data()
        self.assertEqual(transform.find_max_value(test_data), 5)

    def test_scale_daily_values(self):
        test_data = self.test_parse_data()
        scl_data = transform.scale_daily_values(test_data)
        gps_record = scl_data.get("0,80,Country - Province,False,False")
        self.assertIsNotNone(gps_record)
        first_day_data = gps_record.get("20-01-22")
        self.assertEqual(first_day_data, {"scl": 0.2, "abs": 1})
        second_day_data = gps_record.get("20-01-01")
        self.assertEqual(second_day_data, {"scl": 1, "abs": 5})

    def test_generate_globe_json(self):
        header_dates = self.test_parse_header()
        test_data = self.test_parse_data()
        scl_data = transform.scale_daily_values(test_data)
        globe_json = transform.generate_globe_json_string(
            scl_data, header_dates, pretty_print=False)
        self.assertEqual(globe_json, '{"locations": [{"lat": 0.0, "lon": 80.0, "location": "Country - Province", "values": [{"scl": 1.0, "abs": 5}, {"scl": 0.2, "abs": 1}]}], "series_stats": [{"name": "20-01-01", "top_cummulative": {"value": 5, "location_idx": 0}}, {"name": "20-01-22", "top_cummulative": {"value": 1, "location_idx": 0}}]}')

    def test_merge_gps_records(self):
        lhs_data = self.test_parse_data()
        header_dates = self.test_parse_header()
        second_data_array = "Province,Country,10,5,1,5".split(",")
        gps_key, parsed_daily_data = transform.parse_data_line(
            second_data_array, header_dates)
        rhs_data = dict()
        rhs_data[gps_key] = parsed_daily_data
        merged_records = transform.merge_gps_records(lhs_data, rhs_data)
        first_data = merged_records.get("0,80,Country - Province,False,False")
        self.assertIsNotNone(first_data)
        self.assertEqual(first_data, lhs_data.get("0,80,Country - Province,False,False"))
        second_data = merged_records.get("10,5,Country - Province,False,False")
        self.assertIsNotNone(second_data)
        self.assertEqual(second_data, rhs_data.get("10,5,Country - Province,False,False"))


if __name__ == '__main__':
    unittest.main()
